// ---------------------------------------------------------------------------
// "Allenamento di oggi": cosa c'è da fare adesso, deciso in un posto solo.
//
// ⚠️ Lo usano in DUE: il riquadro grande della home (pages/InizioPage) e il
// tocco sul giorno di oggi nel calendario (pages/CalendarPage). È la stessa
// domanda, e quando erano due funzioni separate sull'ultimo caso rispondevano
// diverso — il genere di differenza che nessuno nota scrivendola e tutti
// notano usandola.
//
// Quattro situazioni, in quest'ordine:
//   1. una sessione aperta → si riprende quella;
//   2. oggi hai già finito → il recap. ⚠️ Sta PRIMA della scheda, e ci deve
//      stare: con un programma attivo, se venisse dopo, si finirebbe sempre
//      sulla scheda e l'allenamento appena fatto non sarebbe raggiungibile, né
//      da guardare né da cancellare. Proporre il prossimo a chi esce dalla
//      doccia è un riquadro che mente;
//   3. c'è una scheda in corso → il suo giorno corrente, col nome vero;
//   4. non c'è nessuna scheda → l'allenamento su misura, coi gruppi che tocca
//      allenare secondo lo storico.
// ---------------------------------------------------------------------------

import { messaggioOggi, pianoScheda, schedaAttivaOra, schedaInCorso } from './pianoScheda'
import { analizzaStorico, gruppiConsigliati } from './consiglio'
import { gruppoDi } from './muscoli'

// Chiave "anno-mese-giorno" in orario locale (per raggruppare i completamenti).
export function chiaveGiorno(anno, mese, giorno) {
  return `${anno}-${mese}-${giorno}`
}
export function chiaveDaData(iso) {
  const d = new Date(iso)
  return chiaveGiorno(d.getFullYear(), d.getMonth(), d.getDate())
}
export function chiaveDiOggi(oggi = new Date()) {
  return chiaveGiorno(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
}

// Raccoglie TUTTI i completamenti di TUTTE le schede, arricchiti coi nomi e
// raggruppati per giorno. Un completamento "dettagliato" (creato da una
// sessione) ha durata + esercizi; quello manuale no.
export function raccogliCompletamenti(schede) {
  const perGiorno = new Map()
  for (const scheda of schede) {
    for (const c of scheda.completamenti || []) {
      if (!c.data) continue
      const giorno = scheda.giorni.find((g) => g.id === c.giornoId)
      const voce = {
        data: c.data,
        schedaId: c.schedaId || scheda.id,
        nomeScheda: c.nomeScheda || scheda.nome,
        nomeGiorno: c.nomeGiorno || giorno?.nome || 'Allenamento',
        settimana: c.settimana,
        durataSec: c.durataSec,
        esercizi: c.esercizi,
        nota: c.nota, // il commento scritto nel recap di fine allenamento
        // Numeri copiati dall'orologio a fine allenamento (se inseriti).
        calorieReali: c.calorieReali,
        fcMedia: c.fcMedia,
        fcMax: c.fcMax,
        // Chi lo vede: dal calendario si può ancora cambiare idea.
        visibilita: c.visibilita,
        // Cosa c'è sulla card del recap e in che ordine (lib/recapLayout).
        recap: c.recap,
        dettagliato: Array.isArray(c.esercizi) && c.esercizi.length > 0,
      }
      const k = chiaveDaData(c.data)
      if (!perGiorno.has(k)) perGiorno.set(k, [])
      perGiorno.get(k).push(voce)
    }
  }
  // Ordina i completamenti dello stesso giorno per orario.
  for (const arr of perGiorno.values()) {
    arr.sort((a, b) => new Date(a.data) - new Date(b.data))
  }
  return perGiorno
}

/**
 * Cosa c'è da fare oggi. Non naviga: dice COSA, e chi la chiama decide dove
 * portare (la home e il calendario aprono il recap in modi diversi).
 * Con una scheda in corso conta il suo PROGRAMMA (lib/pianoScheda, 41ª): la
 * scheda usata per ultima, cosa tocca oggi, e se se n'è saltato uno lo si
 * propone da recuperare (`messaggioOggi`). `giornoId` c'è quando si può andare
 * dritti a quell'allenamento; senza, c'è da scegliere (un riposo con uno da
 * recuperare, qualcosa fuori dalla scheda) e si apre la scheda. `riposo`: oggi
 * è riposo e non c'è niente da recuperare.
 * @returns {{tipo:'sessione'|'fatto'|'scheda'|'consigliato', titolo:string, sub:string, schedaId?:string, giornoId?:string|null, riposo?:boolean}}
 */
export function cosaOggi({ schede, sessione, perGiorno, chiaveOggi }) {
  if (sessione) {
    return { tipo: 'sessione', titolo: sessione.nomeGiorno || 'Allenamento', sub: 'Riprendi la sessione in corso' }
  }
  const fatti = perGiorno.get(chiaveOggi)
  if (fatti?.length) {
    return {
      tipo: 'fatto',
      titolo: fatti.map((c) => c.nomeGiorno).join(' + '),
      sub: `Fatto: ${fatti.map((c) => c.nomeGiorno).join(' + ')}`,
    }
  }
  const corrente = schedaInCorso(schede)
  if (corrente) {
    const { scheda, stato } = corrente
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    const piano = pianoScheda(scheda, new Date(a, m, g, 12))
    const oggiP = piano?.oggi
    const recupero = piano?.daRecuperare
    let giornoId = null
    if (oggiP?.tipo === 'workout' && (!recupero || recupero.id === oggiP.giorno.id)) giornoId = oggiP.giorno.id
    else if (!oggiP) giornoId = stato.giornoCorrente.id
    const riposo = oggiP?.tipo === 'rest' && !recupero
    return {
      tipo: 'scheda',
      // Da fare è il giorno corrente (anche quando è uno saltato da
      // recuperare); di diverso c'è solo il riposo, e qualcosa fuori scheda.
      titolo: riposo ? 'Riposo' : oggiP?.tipo === 'esterno' ? oggiP.nome : stato.giornoCorrente.nome,
      sub: messaggioOggi(scheda, stato, piano) || `${stato.giornoCorrente.nome} · Sett ${stato.settimana} · ${scheda.nome}`,
      schedaId: scheda.id,
      giornoId,
      riposo,
    }
  }
  // La scheda attiva c'è ma è finita: lo si dice, invece di proporre altro.
  const finita = schedaAttivaOra(schede)
  if (finita) {
    return { tipo: 'finita', titolo: finita.nome, sub: 'Hai finito la scheda: scegli la prossima', schedaId: finita.id }
  }
  const labels = gruppiConsigliati(analizzaStorico(schede), 2).map((g) => gruppoDi(g)?.label || g)
  return {
    tipo: 'consigliato',
    titolo: labels.length ? labels.join(' + ') : 'Su misura',
    sub: labels.length ? `Consiglio: ${labels.join(' + ')}` : 'Crea un allenamento su misura',
  }
}

/**
 * I sette giorni della settimana di `oggi` (da lunedì), con quanti
 * allenamenti in ciascuno. Per il riquadro "Settimana" della home.
 */
export function settimanaDi(perGiorno, oggi = new Date(), piano = null) {
  const lun = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - ((oggi.getDay() + 6) % 7))
  const kOggi = chiaveDiOggi(oggi)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + i)
    const k = chiaveGiorno(d.getFullYear(), d.getMonth(), d.getDate())
    const fatti = perGiorno.get(k)?.length || 0
    return {
      chiave: k,
      giorno: d.getDate(),
      fatti,
      oggi: k === kOggi,
      passato: k !== kOggi && d < oggi,
      previsto: !fatti && piano ? piano.previsto(d) : null,
      anello: anelloDi(perGiorno.get(k)),
    }
  })
}

// L'anello di un giorno allenato: i colori dei gruppi muscolari di quel
// giorno (lib/muscoli), uno spicchio ciascuno — lo stesso codice della
// figura del corpo e della legenda della scheda. Un allenamento segnato a mano
// non ha esercizi: allora niente spicchi e l'anello e' del colore dell'app.
export function anelloDi(completamenti) {
  const colori = []
  for (const c of completamenti || [])
    for (const e of c.esercizi || []) {
      const gr = gruppoDi(e.gruppo)
      if (gr && !colori.includes(gr.colore)) colori.push(gr.colore)
    }
  if (colori.length === 0) return undefined
  const passo = 100 / colori.length
  return `conic-gradient(${colori.map((c, n) => `${c} ${n * passo}% ${(n + 1) * passo}%`).join(', ')})`
}

// Le classi di un giorno (index.css, .cal-day): le stesse nel calendario e
// nella settimana della home, che devono leggersi allo stesso modo.
export function classeGiorno({ fatto, oggi, previsto, passato }) {
  return (
    'cal-day' +
    (fatto ? ' done' : '') +
    (oggi ? ' today' : '') +
    (previsto?.saltato
      ? ' saltato'
      : previsto?.tipo === 'workout' || previsto?.tipo === 'esterno'
        ? ' previsto'
        : previsto
          ? ' riposo'
          : '') +
    (!fatto && !oggi && !previsto ? (passato ? ' passato' : ' futuro') : '')
  )
}
