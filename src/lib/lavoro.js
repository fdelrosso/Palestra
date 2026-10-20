// ---------------------------------------------------------------------------
// A che punto è un atleta, visto dal suo PT (LavoroPage, AtletiPage): l'ultimo
// allenamento, quanti negli ultimi 7 giorni rispetto alla scheda, e se c'è
// qualcosa da guardare — fermo da una settimana, scheda all'ultima settimana,
// nessuna scheda.
//
// Conta solo quello che il PT può vedere (pubblico e "solo PT"): un atleta che
// nasconde tutto sembra fermo, e il PT lo sa leggere così.
// ---------------------------------------------------------------------------

const GIORNO_MS = 24 * 60 * 60 * 1000

/** Giorni di FERMO oltre i quali un atleta si segnala. */
export const FERMO_DOPO_GIORNI = 7

/**
 * La scheda su cui lavora adesso: quella attiva, se la vede; se no la più
 * recente fra quelle non archiviate.
 * @param {Array} schede dalla più recente (schedeDiUtente)
 */
export function schedaCorrente(schede = []) {
  const vive = schede.filter((s) => !s.libera && !s.archiviata)
  return vive.find((s) => s.attiva) || vive[0] || null
}

/** Quanti allenamenti a settimana chiede una scheda. */
export function obiettivoSettimanale(scheda) {
  if (!scheda) return 0
  if (scheda.giorniSettimana?.length) return scheda.giorniSettimana.length
  return (scheda.giorni || []).filter((g) => g.tipo === 'workout').length
}

/**
 * @param {{ schede?: Array, allenamenti?: Array, adesso?: Date }} p
 *   allenamenti: dal più recente, con `data` (allenamentiDiUtente)
 * @returns {{
 *   corrente: object|null, ultimo: string|null, giorniDallUltimo: number|null,
 *   ultimi7: number, obiettivo: number, settimaneRimaste: number|null,
 *   avvisi: Array<{ tipo: 'fermo'|'mai'|'scade'|'senza-scheda', testo: string }>
 * }}
 */
export function andamentoAtleta({ schede = [], allenamenti = [], adesso = new Date() } = {}) {
  const corrente = schedaCorrente(schede)
  const ultimo = allenamenti[0]?.data || null
  const giorniDallUltimo = ultimo
    ? Math.max(0, Math.floor((inizioGiorno(adesso) - inizioGiorno(new Date(ultimo))) / GIORNO_MS))
    : null
  const da = adesso.getTime() - 7 * GIORNO_MS
  const ultimi7 = allenamenti.filter((a) => new Date(a.data).getTime() > da).length
  const obiettivo = obiettivoSettimanale(corrente)
  const settimaneRimaste =
    corrente && !corrente.senzaFine
      ? Math.max(0, (corrente.numeroSettimane || 0) - (corrente.settimanaCorrente || 1))
      : null

  const avvisi = []
  if (!ultimo) avvisi.push({ tipo: 'mai', testo: 'Nessun allenamento' })
  else if (giorniDallUltimo >= FERMO_DOPO_GIORNI)
    avvisi.push({ tipo: 'fermo', testo: `Fermo da ${giorniDallUltimo} giorni` })
  if (!corrente) avvisi.push({ tipo: 'senza-scheda', testo: 'Senza scheda' })
  else if (settimaneRimaste === 0) avvisi.push({ tipo: 'scade', testo: 'Ultima settimana di scheda' })

  return { corrente, ultimo, giorniDallUltimo, ultimi7, obiettivo, settimaneRimaste, avvisi }
}

/** "oggi", "ieri", "3 giorni fa", null se mai. */
export function quandoUltimo(giorni) {
  if (giorni == null) return null
  if (giorni === 0) return 'oggi'
  if (giorni === 1) return 'ieri'
  return `${giorni} giorni fa`
}

function inizioGiorno(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
