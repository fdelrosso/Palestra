// ---------------------------------------------------------------------------
// La scheda e i suoi risultati in PDF: gli STESSI fogli dell'Excel
// (lib/schedaExcel — foglioScheda, foglioRisultati) disegnati come tabelle da
// lib/pdf. Un PDF si apre ovunque e si manda su WhatsApp senza che dall'altra
// parte serva Excel; il foglio resta quello da rielaborare.
// ---------------------------------------------------------------------------

import { foglioRisultati, foglioScheda, nomeFileScheda } from './schedaExcel.js'
import { statoScheda } from './progression.js'
import { MIME_PDF, pdfDaFoglio } from './pdf.js'

/** La scheda da fare, in PDF. @returns {File} */
export function fileSchedaPdf(scheda, { atleta = '' } = {}) {
  const titolo = [atleta, scheda.nome || 'Scheda'].filter(Boolean).join(' - ')
  const byte = pdfDaFoglio(foglioScheda(scheda, { atleta }), { titolo })
  return new File([byte], nomeFileScheda(scheda, atleta, '', 'pdf'), { type: MIME_PDF })
}

/** Come è andata, in PDF: "progressi" finché è in corso, "recap" a scheda finita. @returns {File} */
export function fileRisultatiPdf(scheda, { atleta = '' } = {}) {
  const suffisso = statoScheda(scheda).schedaCompletata ? 'recap' : 'progressi'
  const titolo = [atleta, scheda.nome || 'Scheda', suffisso].filter(Boolean).join(' - ')
  const byte = pdfDaFoglio(foglioRisultati(scheda, { atleta }), { titolo })
  return new File([byte], nomeFileScheda(scheda, atleta, suffisso, 'pdf'), { type: MIME_PDF })
}
