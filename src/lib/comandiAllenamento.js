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
import { cannaDelCarico, coloreDelloSforzo } from './carico'
import { aTempo, faseDiSerie, fasiDi, formattaCarico, formattaRip, obiettivoSerie, ripNumero } from './schema'
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
 * `app`: quelle che dal blocco schermo non si chiudono (a tempo e circuiti: ci
 * vuole un orologio), e aprono l'app. `sforzo`: a RIR/RPE, si chiude con reps e
 * kg (si parte da `rip` e `kg`, vedi `partenza`); le altre coi tre colori, e
 * `rip` è da dove parte il contatore di "Duro".
 * `recupero`: i secondi del recupero che parte chiudendola, null se non parte.
 * `partenza(esercizio, j)`: da dove partono reps e kg di una serie a RIR/RPE,
 * come nella modale della pagina.
 */
export function codaSerie(esercizi, da = null, { auto = true, partenza = null } = {}) {
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
      const app = !!circuito || aTempo(e.schema)
      const obiettivo = obiettivoSerie(e.schema, p.j)
      const sforzo = !app && cannaDelCarico(obiettivo.carico) != null
      const inizio = sforzo ? partenza?.(e, p.j) : null
      coda.push({
        ...p,
        blocco: b,
        esercizioId: e.esercizioId,
        nome: e.nome,
        titolo: `${e.nome} · Serie ${p.j + 1}/${e.sets.length}`,
        dettaglio: cosaFare(e.schema, p.j),
        carico: formattaCarico(obiettivo.carico),
        pallini: e.sets.map((x) => x.colore || null),
        app,
        sforzo,
        // Senza un numero previsto ("a cedimento") il contatore parte da 10.
        rip: inizio?.rip ?? ripNumero(obiettivo.rip) ?? 10,
        kg: inizio?.kg ?? null,
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
 * un tocco letto due volte non cambia niente. Senza `colore` è una serie a
 * RIR/RPE: lo dicono le ripetizioni fatte, come nella modale della pagina.
 */
export function applicaTocchi(esercizi, tocchi) {
  return tocchi.reduce(
    (lista, t) =>
      lista.map((e) => {
        if (e.esercizioId !== t.esercizioId || !e.sets[t.j] || e.sets[t.j].colore) return e
        const obiettivo = obiettivoSerie(e.schema, t.j)
        const previste = ripNumero(obiettivo.rip)
        const colore =
          t.colore ||
          coloreDelloSforzo(cannaDelCarico(obiettivo.carico), t.rip ?? null, previste, obiettivo.rip?.max ?? previste)
        return {
          ...e,
          sets: e.sets.map((s, j) =>
            j !== t.j
              ? s
              : serieChiusa(e.schema, j, colore, {
                  ...(s.parametri ? { parametri: s.parametri } : {}),
                  ...(t.rip != null ? { rip: t.rip } : {}),
                  ...(t.kg != null ? { kg: t.kg } : {}),
                }),
          ),
        }
      }),
    esercizi,
  )
}
