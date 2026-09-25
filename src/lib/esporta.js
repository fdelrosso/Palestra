// ---------------------------------------------------------------------------
// Far USCIRE una cosa dall'app: un file sul dispositivo di chi la sta
// guardando. Lo usano l'Excel della scheda, l'immagine di un allenamento
// ricevuto, la foto o il video di un amico.
//
//   · sul TELEFONO il foglio di condivisione — Salva immagine, Salva su File,
//     WhatsApp, Mail. ⚠️ Su iPhone, nell'app installata, uno scaricamento
//     "classico" apre il file a tutto schermo senza un tasto per tornare
//     indietro: il foglio di condivisione è l'unica strada che non chiude
//     l'app in un vicolo cieco;
//   · sul COMPUTER lo scaricamento, che è quello che ci si aspetta lì.
// ---------------------------------------------------------------------------

import { disegnaRecap } from './recapImmagine'
import { statisticheRecap } from './recap'

/**
 * @param {File} file
 * @param {{titolo?:string}} [opts]
 * @returns {Promise<{ok:boolean, esito:string}>} `esito` è la frase da mostrare
 *   ('' se non c'è niente da dire: chiudere il foglio di condivisione non è un
 *   errore).
 */
export async function faiUscire(file, { titolo = '' } = {}) {
  const telefono = window.matchMedia?.('(pointer: coarse)').matches
  if (telefono && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo || file.name })
      return { ok: true, esito: '' }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: true, esito: '' }
      return { ok: false, esito: 'Condivisione non riuscita.' }
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, esito: `Scaricato: ${file.name}` }
}

/** Un nome di file senza caratteri che i sistemi rifiutano. */
export function nomeFile(base, estensione) {
  const pulito = String(base || 'progettopalestra')
    .normalize('NFD')
    // Via gli accenti, staccati dalla lettera con NFD: "più" → "piu".
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60)
  return `${pulito || 'progettopalestra'}.${estensione}`
}

/**
 * Un allenamento (la voce di storico, o il payload di un recap) come immagine
 * PNG: la stessa card del recap di fine allenamento.
 * ⚠️ Le statistiche, se non arrivano col recap, si ricalcolano dalla sola voce:
 * i record personali mancano, perché per saperli servirebbe lo storico di chi
 * l'ha fatto, che qui non c'è.
 * @returns {Promise<File>}
 */
export async function fileImmagineAllenamento({ riep, stat = null, commento = '' }) {
  const canvas = disegnaRecap({
    riep,
    stat: stat || statisticheRecap(riep),
    commento: commento || riep?.nota || '',
  })
  const blob = await new Promise((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Immagine vuota'))), 'image/png'),
  )
  const giorno = riep?.data ? String(riep.data).slice(0, 10) : ''
  return new File([blob], nomeFile(`${riep?.nomeGiorno || 'allenamento'} ${giorno}`, 'png'), {
    type: 'image/png',
  })
}

/** Una foto o un video (un blob) come file, con l'estensione giusta. */
export function fileDaBlob(blob, base) {
  const tipo = blob?.type || ''
  const ext = tipo.includes('png')
    ? 'png'
    : tipo.includes('webp')
      ? 'webp'
      : tipo.includes('quicktime')
        ? 'mov'
        : tipo.includes('webm')
          ? 'webm'
          : tipo.startsWith('video')
            ? 'mp4'
            : 'jpg'
  return new File([blob], nomeFile(base, ext), { type: tipo || 'application/octet-stream' })
}
