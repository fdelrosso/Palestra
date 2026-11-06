// ---------------------------------------------------------------------------
// I comandi dell'allenamento sul blocco schermo (Android, lib/allenamentoNativo):
// la parte che non sa niente del telefono.
//
// A schermo bloccato il WebView può essere fermo o morto, quindi il nativo deve
// saper andare avanti da solo: la pagina gli passa in anticipo le serie che
// restano (`codaSerie`), lui avanza e si segna i tocchi, e la pagina al ritorno
// li applica (`applicaTocchi`).
//
// ⚠️ `codaSerie` deve dire quello che farebbe WorkoutSession (completaSet) dopo
// un tocco: l'ordine del giro, il blocco dopo, e quando parte il recupero.
// ---------------------------------------------------------------------------

import { circuitoChiuso } from './circuiti'
import { cannaDelCarico } from './carico'
import { aTempo, faseDiSerie, fasiDi, formattaCarico, formattaRip, obiettivoSerie } from './schema'
import { serieChiusa } from './session'
import { blocchi, giro, recuperoBlocco } from './superserie'

/** Quello da fare, in una riga: "10 reps · 60kg". */
function cosaFare(schema, j) {
  const { rip, carico } = obiettivoSerie(schema, j)
  const fase = fasiDi(schema)[faseDiSerie(schema, j)]
  const r = formattaRip(rip, fase?.perLato)
  return [r && `${r} reps`, formattaCarico(carico)].filter(Boolean).join(' · ')
}

/**
 * Le serie che restano, dalla prossima in poi.
 * `da`: dove si è ({ i, j }, j anche null = la prima da fare di quel blocco);
 * da lì si va avanti e in fondo si riprendono i blocchi lasciati indietro.
 * `app`: quelle che dal blocco schermo non si chiudono (a tempo, RIR/RPE,
 * circuiti: servono numeri o un orologio), e aprono l'app.
 * `recupero`: i secondi del recupero che parte chiudendola, null se non parte.
 */
export function codaSerie(esercizi, da = null, { auto = true } = {}) {
  const bs = blocchi(esercizi)
  if (!bs.length) return []
  const primo = da ? Math.max(0, bs.findIndex((b) => b.indici.includes(da.i))) : 0
  const coda = []
  for (let n = 0; n < bs.length; n++) {
    const b = bs[(primo + n) % bs.length]
    const circuito = esercizi[b.inizio].circuito
    if (circuito && circuitoChiuso(circuito)) continue
    let g = giro(esercizi, b).filter((p) => !esercizi[p.i].sets[p.j].colore)
    const k = n === 0 && da ? g.findIndex((p) => p.i === da.i && p.j === da.j) : -1
    if (k > 0) g = [...g.slice(k), ...g.slice(0, k)]
    for (const p of g) {
      const e = esercizi[p.i]
      coda.push({
        ...p,
        blocco: b,
        esercizioId: e.esercizioId,
        titolo: `${e.nome} · Serie ${p.j + 1}/${e.sets.length}`,
        dettaglio: cosaFare(e.schema, p.j),
        app: !!circuito || aTempo(e.schema) || cannaDelCarico(obiettivoSerie(e.schema, p.j).carico) != null,
      })
    }
  }
  return coda.map(({ blocco, ...s }, n) => {
    const dopo = coda[n + 1]
    // Dentro un giro di superserie non si recupera: si passa all'esercizio dopo.
    const parte = auto && dopo && (dopo.blocco !== blocco || dopo.j !== s.j)
    return { ...s, recupero: parte ? recuperoBlocco(esercizi, blocco) || 90 : null }
  })
}

/**
 * I tocchi arrivati dal nativo, sulle serie della sessione. Si cerca per
 * esercizio e serie, non per indice; una serie già chiusa resta com'è, così
 * un tocco letto due volte non cambia niente.
 */
export function applicaTocchi(esercizi, tocchi) {
  return tocchi
    .filter((t) => !t.chiedi)
    .reduce(
      (lista, t) =>
        lista.map((e) =>
          e.esercizioId !== t.esercizioId || !e.sets[t.j] || e.sets[t.j].colore
            ? e
            : {
                ...e,
                sets: e.sets.map((s, j) =>
                  j !== t.j ? s : serieChiusa(e.schema, j, t.colore, s.parametri ? { parametri: s.parametri } : {}),
                ),
              },
        ),
      esercizi,
    )
}
