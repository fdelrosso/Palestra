// ---------------------------------------------------------------------------
// IL PROGRAMMA DELLA SCHEDA SUL CALENDARIO: che cosa tocca fare ogni giorno
// da qui in avanti (un allenamento o riposo), e che cosa è stato SALTATO.
//
// Due modi, a seconda di come è fatta la scheda:
//   - con i "Giorni di allenamento" (Scheda.giorniSettimana, i chip Lun..Dom)
//     gli allenamenti cadono in ordine su quei giorni, gli altri sono riposo;
//     un giorno in `Scheda.doppi` ne prende DUE di fila (`giorno` e `altri`);
//   - senza, vale l'elenco dei giorni della scheda così com'è, uno al giorno,
//     compresi i giorni "Rest" (se non ce ne sono, ogni giorno è allenamento).
//
// Il programma RIPARTE dall'ultimo allenamento fatto: il giorno dopo tocca
// `statoScheda().giornoCorrente` (il primo non ancora fatto, come nel resto
// dell'app) e si va avanti in ordine. Così chi si allena in un giorno diverso
// non si ritrova il calendario sfasato per sempre.
// SALTATO = fra l'ultimo allenamento fatto e oggi c'era un allenamento in
// programma e non è stato fatto: da recuperare c'è `giornoCorrente`.
// ⚠️ Senza nessun allenamento fatto il programma comincia OGGI: non si salta
// una cosa mai cominciata (e una scheda creata la sera non segna "saltato").
// Un giorno si può CAMBIARE a mano (Scheda.programma, in fondo): un altro
// allenamento della scheda, riposo, o uno fuori dalla scheda. L'allenamento
// che c'era scivola al prossimo giorno di allenamento, e uno della scheda
// messo a mano non si ripete quando toccherebbe.
// ⚠️ Il programma finisce con la scheda: oltre gli allenamenti che restano
// (settimane comprese) il calendario non mostra più niente.
// Una PAUSA (Scheda.pause, in fondo: vacanza, malattia) ferma il programma:
// i suoi giorni non sono saltati e non consumano allenamenti, al ritorno si
// riprende da dove si era.
// La STORIA (`storicoProgramma`, in fondo) non si salva: si ricostruisce
// rigiocando gli allenamenti fatti, così un saltato resta anche dopo che ci
// si è riallenati. ⚠️ Cambiando i chip o il programma cambia anche lei.
// ---------------------------------------------------------------------------

import { avanzaSeFinita, giorniWorkout, statoScheda } from './progression'
import { indiceSettimana, schedaAttiva, slotSettimana } from '../data/model'

// Il numero del giorno, senza ore: il conto dei giorni non sente l'ora legale.
export function numeroGiorno(data) {
  const d = new Date(data)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
}

function dataDaNumero(n) {
  const d = new Date(n * 86400000)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// L'ultima volta che ci si è allenati con questa scheda (il completamento più recente).
function ultimoFatto(scheda) {
  let ultimo = null
  for (const c of scheda.completamenti || []) {
    if (!c.data) continue
    if (!ultimo || new Date(c.data) > new Date(ultimo.data)) ultimo = c
  }
  return ultimo
}

/** Quanti allenamenti restano alla scheda, settimane che verranno comprese. */
function allenamentiRestanti(scheda, stato) {
  if (scheda.senzaFine) return Infinity
  const n = stato.totaliSettimana
  return Math.max(0, (scheda.numeroSettimane - stato.settimana) * n + (n - stato.fattiSettimana))
}

// Fra le schede con un allenamento ancora da fare, quella usata per ultima (o,
// mai usata, inserita per ultima).
function usataPerUltima(schede) {
  let migliore = null
  let quando = -Infinity
  for (const scheda of schede || []) {
    if (!schedaAttiva(scheda)) continue
    if (!statoScheda(scheda).giornoCorrente) continue
    const ultimo = ultimoFatto(scheda)
    const t = new Date(ultimo?.data || scheda.creataIl || 0).getTime() || 0
    if (!migliore || t > quando) {
      migliore = scheda
      quando = t
    }
  }
  return migliore
}

/**
 * La scheda ATTIVA: quella scelta con "Rendi attiva" (`attiva: true`), che è
 * l'unica che la Home propone. Scelta e poi archiviata, non ce n'è nessuna
 * finché non se ne sceglie un'altra: proporre di nascosto un'altra scheda
 * sarebbe decidere al posto di chi si allena. Mai scelta (gli account di
 * prima), vale quella usata per ultima, così la Home non resta vuota.
 * ⚠️ Può essere una scheda finita: lo dice la Home (lib/oggi).
 */
export function schedaAttivaOra(schede) {
  const scelta = (schede || []).find((s) => s.attiva && !s.libera)
  if (scelta) return scelta.archiviata ? null : scelta
  return usataPerUltima(schede)
}

/** La scheda attiva, se ha ancora un allenamento da fare, col suo stato. */
export function schedaInCorso(schede) {
  const scheda = schedaAttivaOra(schede)
  if (!scheda) return null
  const stato = statoScheda(scheda)
  return stato.giornoCorrente ? { scheda, stato } : null
}

/**
 * Il programma di una scheda a partire da `oggi`.
 * @returns {null | {
 *   previsto: (data: Date|string) => null | {
 *     tipo: 'workout'|'rest'|'esterno', giorno: object|null, nome?: string,
 *     altri?: object[], saltato: boolean, modificato?: object,
 *   },
 *   oggi: null | ReturnType<previsto>,
 *   daRecuperare: object|null,
 *   prossimo: null | { data: Date, giorno: object, altri?: object[] },
 * }}
 */
export function pianoScheda(scheda, oggi = new Date(), { interno = false } = {}) {
  if (!scheda || scheda.libera) return null
  const workout = giorniWorkout(scheda)
  const stato = statoScheda(scheda)
  if (!workout.length || stato.schedaCompletata) return null
  const restanti = allenamentiRestanti(scheda, stato)
  if (!restanti) return null

  const nOggi = numeroGiorno(oggi)
  const ultimo = ultimoFatto(scheda)
  // Il giorno da cui si riparte: quello dell'ultimo allenamento, o ieri se non
  // ce n'è mai stato uno (e si comincia oggi).
  const base = ultimo ? Math.min(numeroGiorno(ultimo.data), nOggi) : nOggi - 1
  // Da qui in poi tocca il primo non fatto; a settimana finita si riparte dal primo.
  const primo = Math.max(0, workout.findIndex((g) => g.id === stato.giornoCorrente?.id))

  // Giorno della settimana → quanti allenamenti (2 nei doppi).
  const chip = new Map()
  for (const n of slotSettimana(scheda)) if (n >= 0 && n <= 6) chip.set(n, (chip.get(n) || 0) + 1)
  const sequenza = scheda.giorni || []
  // ANTICIPATO: coi chip, un allenamento fatto in un giorno di riposo senza
  // niente da recuperare prende il posto del prossimo giorno coi chip, che
  // resta libero (se no lì cadrebbe quello dopo, e risulterebbe saltato).
  let anticipo = false
  if (chip.size && ultimo && !ultimo.recupera && !interno) {
    const giorno = chiaveData(ultimo.data)
    if (!chip.has(indiceSettimana(new Date(ultimo.data))) && !modificaDi(scheda, giorno) && !inPausa(scheda, giorno)) {
      const prima = {
        ...scheda,
        settimanaCorrente: ultimo.settimana || scheda.settimanaCorrente,
        completamenti: (scheda.completamenti || []).filter((c) => c !== ultimo),
      }
      const p = pianoScheda(prima, new Date(ultimo.data), { interno: true })
      anticipo = !!p && !p.daRecuperare
    }
  }
  // Senza chip: i riposi subito dopo l'ultimo allenamento fatto si rispettano,
  // poi l'elenco riparte dal giorno da fare.
  let riposiIniziali = 0
  let partenza = 0
  if (!chip.size) {
    partenza = Math.max(0, sequenza.findIndex((g) => g.id === workout[primo].id))
    const fatto = ultimo ? sequenza.findIndex((g) => g.id === ultimo.giornoId) : -1
    if (fatto >= 0) {
      for (let i = 1; i < sequenza.length && sequenza[(fatto + i) % sequenza.length].tipo === 'rest'; i++) {
        riposiIniziali++
      }
    }
  }

  // Giorno per giorno da `base`, una volta sola: { n → giornata }.
  const giornate = new Map()
  let fino = base
  let slot = 0 // allenamenti presi dalla scheda dopo `base`
  let passo = 0 // posti dell'elenco consumati (modo senza chip)
  let saltati = 0
  let futuri = 0 // allenamenti in programma da oggi in poi
  let finito = false
  // Allenamenti della scheda già messi a mano su un giorno: la prossima volta
  // che toccherebbero si passa oltre (non si fanno due volte).
  const giaMessi = []

  const prossimoWorkout = () => {
    for (let i = 0; i < workout.length; i++) {
      const g = workout[(primo + slot++) % workout.length]
      const k = giaMessi.indexOf(g.id)
      if (k < 0) return g
      giaMessi.splice(k, 1)
    }
    return workout[(primo + slot++) % workout.length]
  }
  // Il posto `p` dell'elenco senza chip: prima i riposi rimasti, poi la scheda in giro.
  const voceElenco = (p) =>
    p < riposiIniziali ? { tipo: 'rest' } : sequenza[(partenza + p - riposiIniziali) % sequenza.length]

  function avanza(limite) {
    while (fino < limite) {
      fino++
      const chiave = chiaveData(dataDaNumero(fino))
      if (inPausa(scheda, chiave)) {
        // Fermo: niente saltati, niente allenamenti consumati.
        if (fino >= nOggi) giornate.set(fino, { tipo: 'pausa', giorno: null, saltato: false })
        continue
      }
      const voce = modificaDi(scheda, chiave)
      let giornata
      if (voce) {
        // Un giorno cambiato a mano. Quello che c'era non va perso: un
        // allenamento scivola al prossimo giorno buono; un riposo invece è
        // stato preso, e se ne va.
        if (!chip.size && voceElenco(passo).tipo === 'rest') passo++
        giornata = giornataDaModifica(voce, workout)
        if (giornata.tipo === 'workout') giaMessi.push(giornata.giorno.id)
      } else if (chip.size) {
        let quanti = chip.get(indiceSettimana(dataDaNumero(fino))) || 0
        const anticipato = anticipo && quanti > 0
        if (anticipato) {
          anticipo = false
          quanti--
        }
        giornata = anticipato && !quanti
          ? { tipo: 'rest', giorno: null, anticipato: true, fattoIl: numeroGiorno(ultimo.data) }
          : quanti
          ? { tipo: 'workout', giorno: prossimoWorkout(), altri: Array.from({ length: quanti - 1 }, () => prossimoWorkout()) }
          : { tipo: 'rest', giorno: null }
      } else {
        const g = voceElenco(passo++)
        giornata =
          g.tipo === 'rest' ? { tipo: 'rest', giorno: g.id ? g : null } : { tipo: 'workout', giorno: prossimoWorkout() }
      }
      if (fino < nOggi) {
        // Prima di oggi interessa solo quello che si è saltato (e anticipato).
        if (giornata.tipo === 'workout') {
          saltati++
          giornate.set(fino, { ...giornata, saltato: true })
        } else if (giornata.anticipato) giornate.set(fino, { ...giornata, saltato: false })
        continue
      }
      // Dopo l'ultimo allenamento che resta la scheda è finita: niente più
      // giorni, salvo quelli messi a mano.
      if (finito && !voce) {
        giornate.set(fino, null)
        continue
      }
      if (giornata.tipo === 'workout') {
        // Un doppio a fine scheda prende solo quelli che restano.
        if (giornata.altri?.length) giornata.altri = giornata.altri.slice(0, Math.max(0, restanti - futuri - 1))
        futuri += 1 + (giornata.altri?.length || 0)
        if (futuri >= restanti) finito = true
      }
      giornate.set(fino, { ...giornata, saltato: false })
    }
  }

  avanza(nOggi - 1)
  const daRecuperare = saltati > 0 ? stato.giornoCorrente : null

  const previsto = (data) => {
    const n = numeroGiorno(data)
    if (n <= base) return null
    if (n - nOggi > 400) return null
    avanza(n)
    return giornate.get(n) || null
  }

  const oggiPrevisto = previsto(oggi)
  let prossimo = null
  for (let k = 1; k <= 14 && !prossimo; k++) {
    const g = previsto(dataDaNumero(nOggi + k))
    if (g?.tipo === 'workout') prossimo = { data: dataDaNumero(nOggi + k), giorno: g.giorno, altri: g.altri }
  }

  return { previsto, oggi: oggiPrevisto, daRecuperare, prossimo }
}

/** Il nome di una giornata d'allenamento: "Petto", o "Petto + Gambe" in un doppio. */
export function nomeGiornata(x) {
  return [x.giorno, ...(x.altri || [])].map((g) => g.nome).join(' + ')
}

// -- le modifiche a mano ------------------------------------------------------
//
// Scheda.programma = { 'AAAA-MM-GG': Modifica }, una per giorno:
//   { tipo:'giorno', giornoId }        un altro allenamento di questa scheda
//   { tipo:'riposo' }
//   { tipo:'allenamento', schedaId, giornoId, nome }   uno fuori dalla scheda:
//                                      di un'altra scheda o salvato (`libera`)
//   { tipo:'altro', nome }             qualcosa fuori dall'app ("Calcetto")
// ⚠️ Sta dentro la scheda (`dati`): niente colonne nuove nel database.

/** La chiave del giorno, in orario locale: '2026-10-07'. */
export function chiaveData(data) {
  const d = new Date(data)
  const due = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`
}

function modificaDi(scheda, chiave) {
  const voce = scheda.programma?.[chiave]
  if (!voce || typeof voce !== 'object') return null
  if (voce.tipo === 'giorno') {
    return scheda.giorni?.some((g) => g.id === voce.giornoId && g.tipo === 'workout') ? voce : null
  }
  if (voce.tipo === 'riposo') return voce
  if ((voce.tipo === 'allenamento' || voce.tipo === 'altro') && String(voce.nome || '').trim()) return voce
  return null
}

function giornataDaModifica(voce, workout) {
  if (voce.tipo === 'giorno') {
    return { tipo: 'workout', giorno: workout.find((g) => g.id === voce.giornoId), modificato: voce }
  }
  if (voce.tipo === 'riposo') return { tipo: 'rest', giorno: null, modificato: voce }
  return { tipo: 'esterno', giorno: null, nome: String(voce.nome).trim(), modificato: voce }
}

/**
 * La scheda con il giorno `data` cambiato (`voce` null = torna al programma).
 * Le modifiche di più di due mesi fa si buttano: non servono più.
 */
export function conModifica(scheda, data, voce) {
  const chiave = chiaveData(data)
  const limite = chiaveData(new Date(Date.now() - 60 * 86400000))
  const programma = {}
  for (const [k, v] of Object.entries(scheda.programma || {})) {
    if (k !== chiave && k >= limite) programma[k] = v
  }
  if (voce) programma[chiave] = voce
  return { ...scheda, programma }
}

/**
 * La riga della card "Allenamento di oggi" per una scheda in corso.
 * @returns {string|null} null = oggi il programma non dice niente
 */
export function messaggioOggi(scheda, stato, piano) {
  const corrente = stato.giornoCorrente
  const oggi = piano?.oggi
  const recupero = piano?.daRecuperare
  if (oggi?.tipo === 'pausa') return 'Oggi sei in pausa'
  if (oggi?.tipo === 'rest') {
    if (recupero) return `Oggi sarebbe riposo, ma potresti recuperare ${recupero.nome} che hai saltato`
    if (piano.prossimo) {
      const quando = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(piano.prossimo.data)
      return `Oggi riposo · prossimo: ${nomeGiornata(piano.prossimo)} ${quando}`
    }
    return 'Oggi riposo'
  }
  if (oggi?.tipo === 'esterno') {
    return recupero
      ? `Oggi ${oggi.nome}, ma potresti recuperare ${recupero.nome} che hai saltato`
      : `Oggi: ${oggi.nome}`
  }
  if (oggi?.tipo === 'workout' && recupero && recupero.id !== oggi.giorno.id) {
    return `Oggi ${oggi.giorno.nome}, ma potresti riprendere da ${recupero.nome} che hai saltato`
  }
  const nome = oggi?.tipo === 'workout' ? nomeGiornata(oggi) : corrente?.nome
  return nome ? `${nome} · Sett ${stato.settimana} · ${scheda.nome}` : null
}

// -- le pause ------------------------------------------------------------------
//
// Scheda.pause = [{ dal:'AAAA-MM-GG', al:'AAAA-MM-GG' }], estremi compresi,
// anche nel futuro (una vacanza già decisa). ⚠️ Nei `dati`, come `programma`.

/** Il giorno `chiave` ('AAAA-MM-GG') cade in una pausa. */
export function inPausa(scheda, chiave) {
  return (scheda.pause || []).some((p) => p.dal <= chiave && chiave <= p.al)
}

/** La scheda con una pausa in più (date in qualunque ordine). */
export function conPausa(scheda, dal, al) {
  const [da, a] = [chiaveData(dal), chiaveData(al)].sort()
  return { ...scheda, pause: [...(scheda.pause || []), { dal: da, al: a }] }
}

/** La scheda senza la pausa numero `i`. */
export function senzaPausa(scheda, i) {
  return { ...scheda, pause: (scheda.pause || []).filter((_, k) => k !== i) }
}

// -- la storia -----------------------------------------------------------------

/**
 * Cosa mostra un giorno nel calendario, nella forma che vuole `classeGiorno`
 * (lib/oggi): da oggi in poi il programma, prima la storia. Lo usano il
 * calendario e la settimana della Home, così dicono la stessa cosa.
 * Un saltato di questa settimana è `recuperabile`.
 */
export function giornataDelCalendario(data, piano, storico, oggi = new Date()) {
  const n = numeroGiorno(data)
  const nOggi = numeroGiorno(oggi)
  const x = piano?.previsto(data) || null
  if (x) return x.saltato && n >= nOggi - indiceSettimana(new Date(oggi)) ? { ...x, recuperabile: true } : x
  const m = n < nOggi ? storico?.get(n) : null
  if (!m) return null
  if (m.stato === 'pausa') return { tipo: 'pausa', giorno: null, saltato: false }
  return {
    ...m.giornata,
    saltato: m.stato === 'saltato',
    recuperabile: m.stato === 'recuperabile',
    ritardo: m.stato === 'ritardo',
  }
}

/**
 * Che cosa è successo ai giorni passati della scheda, fino a ieri: per ogni
 * buco fra due allenamenti si rifà il programma com'era allora (la scheda coi
 * soli allenamenti di prima, nella loro settimana) e si guarda cosa toccava.
 *   - 'saltato': c'era un allenamento e non lo si è fatto;
 *   - 'ritardo': lo si è fatto più tardi nella stessa settimana (lun-dom), nello
 *     stesso giro o come recupero;
 *   - 'recuperabile': non ancora fatto, ma è di questa settimana (lun-dom);
 *   - 'anticipato': era in programma, ma lo si è fatto prima (è libero);
 *   - 'pausa':   il giorno sta in una pausa.
 * `fattoIl` (ritardo, anticipato): il `numeroGiorno` in cui lo si è fatto davvero.
 * @returns {Map<number, {stato:'saltato'|'recuperabile'|'ritardo'|'anticipato'|'pausa', giornata:object|null, fattoIl?:number|null}>}
 *   per `numeroGiorno`
 */
export function storicoProgramma(scheda, oggi = new Date()) {
  const out = new Map()
  if (!scheda || scheda.libera) return out
  const nOggi = numeroGiorno(oggi)
  const lunediOggi = nOggi - indiceSettimana(new Date(oggi))
  const fatti = (scheda.completamenti || [])
    .filter((c) => c.data)
    .sort((a, b) => new Date(a.data) - new Date(b.data))
  // Fatto più tardi = recuperato, o rifatto nello STESSO giro (giroInCorso):
  // ⚠️ non basta la stessa `settimana`, che con un buco non si chiude mai e
  // abbraccerebbe anche i giri dopo.
  const fattoDopo = (g, k, prima) => {
    const workout = giorniWorkout(prima)
    const posto = new Map(workout.map((x, i) => [x.id, i]))
    const giro = new Set(statoScheda(prima).giro)
    for (const f of fatti.slice(k)) {
      if (String(f.recupera || '').endsWith(`:${g.id}`)) return f
      if (f.recupera || !posto.has(f.giornoId)) continue
      if (f.settimana !== prima.settimanaCorrente) return null
      if (f.giornoId === g.id) return f
      if (giro.has(f.giornoId)) {
        const ultimo = Math.max(...[...giro].map((id) => posto.get(id)))
        if (workout.some((x, i) => i < ultimo && !giro.has(x.id))) return null
      }
      giro.add(f.giornoId)
    }
    return null
  }

  // I buchi: fra un allenamento e il successivo, e dall'ultimo a ieri.
  const buchi = fatti.slice(1).map((c, i) => ({ k: i + 1, da: fatti[i], a: c }))
  if (fatti.length) buchi.push({ k: fatti.length, da: fatti[fatti.length - 1], a: null })
  for (const { k, da, a } of buchi) {
    const fine = a ? numeroGiorno(a.data) : nOggi
    const inizio = numeroGiorno(da.data)
    if (fine - inizio < 2) continue
    // La scheda com'era dopo `da`: la sua settimana, o quella dopo se l'ha chiusa.
    const prima = a
      ? avanzaSeFinita({ ...scheda, settimanaCorrente: da.settimana || 1, completamenti: fatti.slice(0, k) })
      : scheda
    const piano = pianoScheda(prima, dataDaNumero(fine))
    if (!piano) continue
    for (let n = inizio + 1; n < fine; n++) {
      const x = piano.previsto(dataDaNumero(n))
      if (x?.anticipato) out.set(n, { stato: 'anticipato', giornata: x, fattoIl: x.fattoIl })
      if (!x?.saltato) continue
      // In ritardo solo dentro la STESSA settimana del calendario (lun-dom):
      // rifatto dopo, anche come recupero, resta saltato.
      const domenica = n - indiceSettimana(dataDaNumero(n)) + 6
      const dopo = a ? [x.giorno, ...(x.altri || [])].filter(Boolean).map((g) => fattoDopo(g, k, prima)) : []
      const ritardo = dopo.length > 0 && dopo.every((f) => f && numeroGiorno(f.data) <= domenica)
      out.set(n, {
        // Non ancora fatto, ma la settimana non è finita: si fa ancora in tempo,
        // anche se nel frattempo si è fatto altro (come il "Recuperalo dopo"
        // della Home, lib/saltati).
        stato: ritardo ? 'ritardo' : n >= lunediOggi ? 'recuperabile' : 'saltato',
        giornata: x,
        fattoIl: ritardo ? Math.max(...dopo.map((f) => numeroGiorno(f.data))) : null,
      })
    }
  }
  // Le pause passate, anche fuori dai buchi (prima di cominciare, per dire).
  for (const p of scheda.pause || []) {
    const fine = Math.min(numeroGiorno(p.al), nOggi - 1)
    for (let n = Math.max(numeroGiorno(p.dal), fine - 400); n <= fine; n++) {
      out.set(n, { stato: 'pausa', giornata: null })
    }
  }
  return out
}
