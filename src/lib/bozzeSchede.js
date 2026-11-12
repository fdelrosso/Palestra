// ---------------------------------------------------------------------------
// Le BOZZE delle proprie schede: quello che si sta scrivendo nell'editor
// (pages/EditorPage) e non è ancora salvato. Si scrivono a ogni modifica, così
// chiudere l'app (o il telefono che la chiude da solo) non butta via niente:
// riaprendo, la bozza è fra le schede (pages/HomePage) e l'editor riparte da lì.
//
// Una per scheda, con l'id della scheda: per una nuova è l'id che avrà una
// volta salvata, per una esistente le sue modifiche. Spariscono salvando o
// scartandole. In localStorage: per dispositivo, come la sessione in corso.
// Le schede del PT (per un atleta, di lavoro) non passano di qui.
// ---------------------------------------------------------------------------

const CHIAVE = 'palestra.bozzeSchede'

function tutte() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) || '{}') || {}
  } catch {
    return {}
  }
}

function scrivi(b) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(b))
  } catch {
    /* pieno o bloccato: la bozza non si tiene, il resto funziona */
  }
}

/** Le bozze di chi c'è adesso, la più recente prima: { scheda, nuova, il }. */
export function bozzeDi(utenteId) {
  return Object.values(tutte())
    .filter((b) => b.utente === (utenteId || null))
    .sort((a, b) => b.il - a.il)
}

/** La bozza di quella scheda, o null. */
export function bozzaDi(utenteId, schedaId) {
  const b = tutte()[schedaId]
  return b && b.utente === (utenteId || null) ? b : null
}

export function salvaBozza(utenteId, scheda, nuova) {
  scrivi({ ...tutte(), [scheda.id]: { utente: utenteId || null, scheda, nuova, il: Date.now() } })
}

export function togliBozza(schedaId) {
  const b = tutte()
  if (!(schedaId in b)) return
  delete b[schedaId]
  scrivi(b)
}
