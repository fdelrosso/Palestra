// ---------------------------------------------------------------------------
// I filtri del Feed: la seconda linguetta della barra in basso.
//
// Sta qui e non dentro FeedPage perché è la parte che si può sbagliare in
// silenzio — un filtro che scarta una voce di troppo non si vede guardando lo
// schermo, si vede solo contando — e perché così si prova senza React.
//
// ⚠️ QUI NON SI DECIDE CHI VEDE COSA. Le voci arrivano già filtrate da
// `storicoGlobale` (lib/storico), che mostra solo i pubblici più i propri, e
// quel filtro a monte lo fa il database. Questi sono filtri di COMODO, quelli
// che uno mette per cercare "petto, sotto l'ora": se sparissero, si vedrebbe
// più roba ma niente che non si avesse già il diritto di vedere.
// ---------------------------------------------------------------------------

import { gruppiEsercizio, normalizzaNome } from './eserciziLibreria'

/** Le fasce di durata offerte. `null` = nessun limite da quella parte. */
export const DURATE = [
  { id: 'corto', label: 'Fino a 45 min', min: null, max: 45 * 60 },
  { id: 'medio', label: '45-75 min', min: 45 * 60, max: 75 * 60 },
  { id: 'lungo', label: 'Oltre 75 min', min: 75 * 60, max: null },
]

/**
 * I gruppi muscolari toccati da un allenamento.
 * ⚠️ TUTTI i gruppi di ogni esercizio (`gruppiEsercizio`, la stessa funzione
 * del corpo nel recap): cercando "tricipiti" deve uscire l'allenamento coi dip,
 * anche se il loro gruppo principale è il petto. Se i gruppi non sono scritti
 * — succede con le schede importate prima che l'import li chiedesse — si
 * indovina il principale dal nome.
 * @returns {Set<string>} id di gruppo, eventualmente vuoto
 */
export function gruppiDi(voce) {
  const trovati = new Set()
  for (const e of voce?.esercizi || []) {
    for (const g of gruppiEsercizio(e)) trovati.add(g)
  }
  return trovati
}

/** L'allenamento tocca almeno uno dei gruppi chiesti? Nessun gruppo = passa. */
export function toccaGruppi(voce, gruppi) {
  if (!gruppi || gruppi.length === 0) return true
  const suoi = gruppiDi(voce)
  return gruppi.some((g) => suoi.has(g))
}

/**
 * L'allenamento sta in una delle fasce di durata chieste?
 * ⚠️ Un allenamento SENZA durata (quelli aggiunti a mano, che non passano dalla
 * sessione guidata) non entra in nessuna fascia: se passasse comparirebbe sotto
 * ogni filtro, e il filtro non vorrebbe più dire niente.
 */
export function staNellaDurata(voce, durate) {
  if (!durate || durate.length === 0) return true
  const sec = voce?.durataSec
  if (!Number.isFinite(sec) || sec <= 0) return false
  return durate.some((id) => {
    const f = DURATE.find((d) => d.id === id)
    if (!f) return false
    if (f.min != null && sec < f.min) return false
    if (f.max != null && sec > f.max) return false
    return true
  })
}

/**
 * L'allenamento contiene un esercizio che si chiama così?
 * Confronto sul nome NORMALIZZATO (lo stesso che usa la libreria esercizi), e
 * per pezzi: chi cerca "panca" deve trovare "panca piana con bilanciere".
 */
export function contieneEsercizio(voce, testo) {
  const cerca = normalizzaNome(testo || '').trim()
  if (!cerca) return true
  return (voce?.esercizi || []).some((e) => normalizzaNome(e.nome || '').includes(cerca))
}

/**
 * Applica tutti i filtri del feed.
 *
 * @param {object[]} voci        da `storicoGlobale`
 * @param {object}   f
 * @param {'tutti'|'amici'} [f.chi]  'amici' = solo le persone in `amiciIds` (più me)
 * @param {string[]} [f.amiciIds]
 * @param {string}   [f.ioId]
 * @param {string[]} [f.gruppi]
 * @param {string[]} [f.durate]
 * @param {string}   [f.esercizio]
 * @returns {object[]} le voci che passano, nell'ordine in cui sono arrivate
 */
export function filtraFeed(voci, f = {}) {
  const { chi = 'tutti', amiciIds = [], ioId = null, gruppi = [], durate = [], esercizio = '' } = f
  // ⚠️ I PROPRI allenamenti restano anche sotto "amici": il feed di chi non ha
  // ancora nessun amico, se no, è una schermata vuota che sembra un guasto.
  const cerchia = new Set([...(amiciIds || []), ...(ioId ? [ioId] : [])])
  return (voci || []).filter((v) => {
    if (chi === 'amici' && !cerchia.has(v.utenteId)) return false
    if (!toccaGruppi(v, gruppi)) return false
    if (!staNellaDurata(v, durate)) return false
    if (!contieneEsercizio(v, esercizio)) return false
    return true
  })
}

/** Quanti filtri sono accesi: serve al pallino sul pulsante "Filtri". */
export function quantiFiltri({ gruppi = [], durate = [], esercizio = '' } = {}) {
  return gruppi.length + durate.length + (esercizio.trim() ? 1 : 0)
}
