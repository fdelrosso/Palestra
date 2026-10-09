// ---------------------------------------------------------------------------
// IL PROGRAMMA DELLA SCHEDA SUL CALENDARIO: che cosa tocca fare ogni giorno
// da qui in avanti (un allenamento o riposo), e che cosa è stato SALTATO.
//
// Due modi, a seconda di come è fatta la scheda:
//   - con i "Giorni di allenamento" (Scheda.giorniSettimana, i chip Lun..Dom)
//     gli allenamenti cadono in ordine su quei giorni, gli altri sono riposo;
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
// ---------------------------------------------------------------------------

import { giorniWorkout, statoScheda } from './progression'
import { indiceSettimana, schedaAttiva } from '../data/model'

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
 *     saltato: boolean, modificato?: object,
 *   },
 *   oggi: null | ReturnType<previsto>,
 *   daRecuperare: object|null,
 *   prossimo: null | { data: Date, giorno: object },
 * }}
 */
export function pianoScheda(scheda, oggi = new Date()) {
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

  const chip = new Set((scheda.giorniSettimana || []).filter((n) => n >= 0 && n <= 6))
  const sequenza = scheda.giorni || []
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
      const voce = modificaDi(scheda, chiaveData(dataDaNumero(fino)))
      let giornata
      if (voce) {
        // Un giorno cambiato a mano. Quello che c'era non va perso: un
        // allenamento scivola al prossimo giorno buono; un riposo invece è
        // stato preso, e se ne va.
        if (!chip.size && voceElenco(passo).tipo === 'rest') passo++
        giornata = giornataDaModifica(voce, workout)
        if (giornata.tipo === 'workout') giaMessi.push(giornata.giorno.id)
      } else if (chip.size) {
        giornata = chip.has(indiceSettimana(dataDaNumero(fino)))
          ? { tipo: 'workout', giorno: prossimoWorkout() }
          : { tipo: 'rest', giorno: null }
      } else {
        const g = voceElenco(passo++)
        giornata =
          g.tipo === 'rest' ? { tipo: 'rest', giorno: g.id ? g : null } : { tipo: 'workout', giorno: prossimoWorkout() }
      }
      if (fino < nOggi) {
        // Prima di oggi interessa solo quello che si è saltato.
        if (giornata.tipo === 'workout') {
          saltati++
          giornate.set(fino, { ...giornata, saltato: true })
        }
        continue
      }
      // Dopo l'ultimo allenamento che resta la scheda è finita: niente più
      // giorni, salvo quelli messi a mano.
      if (finito && !voce) {
        giornate.set(fino, null)
        continue
      }
      if (giornata.tipo === 'workout' && ++futuri >= restanti) finito = true
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
    if (g?.tipo === 'workout') prossimo = { data: dataDaNumero(nOggi + k), giorno: g.giorno }
  }

  return { previsto, oggi: oggiPrevisto, daRecuperare, prossimo }
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
  if (oggi?.tipo === 'rest') {
    if (recupero) return `Oggi sarebbe riposo, ma potresti recuperare ${recupero.nome} che hai saltato`
    if (piano.prossimo) {
      const quando = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(piano.prossimo.data)
      return `Oggi riposo · prossimo: ${piano.prossimo.giorno.nome} ${quando}`
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
  const giorno = oggi?.tipo === 'workout' ? oggi.giorno : corrente
  return giorno ? `${giorno.nome} · Sett ${stato.settimana} · ${scheda.nome}` : null
}
