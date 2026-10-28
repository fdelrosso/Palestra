// ---------------------------------------------------------------------------
// La CARD del recap del mese (lib/recapMese): 1080×1920, il formato della
// storia di Instagram. Come la card dell'allenamento (lib/recapImmagine)
// l'anteprima È l'immagine che si esporta, e i pezzi di disegno sono i suoi.
// Pagina logica 400 di larghezza, alta 400×16/9.
// ---------------------------------------------------------------------------

import { C, LH, chi, disegnaCorpo, font, polaroid, riquadro, scritta, sfondo } from './recapImmagine'
import { quoteZone, PROPORZIONE } from './corpoImmagini'
import { caselleCard, celleDelMese } from './recapMese'

export const LARGHEZZA_MESE = 1080
export const ALTEZZA_MESE = 1920
const PW = 400
const PH = (PW * ALTEZZA_MESE) / LARGHEZZA_MESE
const K = LARGHEZZA_MESE / PW
const LATI = 24

export const nomeFileMese = (r) => `recap-${r.nomeMese}-${r.anno}.png`

const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1)

// Le caselle coi numeri: due per riga, larghe uguali; una dispari prende la riga.
function caselle(ctx, lista, x, y, w) {
  const gap = 10
  const h = 64
  lista.forEach((c, i) => {
    const sola = lista.length % 2 === 1 && i === lista.length - 1
    const cw = sola ? w : (w - gap) / 2
    const cx = sola ? x : x + (i % 2) * (cw + gap)
    const cy = y + Math.floor(i / 2) * (h + gap)
    riquadro(ctx, cx, cy, cw, h, 14, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)')
    font(ctx, 26, 800)
    scritta(ctx, c.valore, cx + 14, cy + 8, 26, C.bianco)
    font(ctx, 12, 600)
    scritta(ctx, c.etichetta, cx + 14, cy + 8 + 26 * LH + 2, 12, C.muted)
  })
  return Math.ceil(lista.length / 2) * (h + gap) - gap
}

// Il mese in griglia, settimana da lunedì: i giorni allenati sono pieni.
function calendario(ctx, r, x, y, w) {
  const celle = celleDelMese(r.anno, r.mese)
  const fatti = new Set(r.giorni)
  const lato = Math.min(w / 7, 38) // più stretto, se no il mese da 6 righe sfora
  x += (w - lato * 7) / 2
  const raggio = Math.min(13, lato / 2 - 2)
  font(ctx, 11, 700)
  ctx.textAlign = 'center'
  celle.forEach((g, i) => {
    if (!g) return
    const cx = x + (i % 7) * lato + lato / 2
    const cy = y + Math.floor(i / 7) * lato + lato / 2
    ctx.beginPath()
    ctx.arc(cx, cy, raggio, 0, Math.PI * 2)
    ctx.fillStyle = fatti.has(g) ? C.accent : 'rgba(255,255,255,0.06)'
    ctx.fill()
    scritta(ctx, String(g), cx, cy - (11 * LH) / 2, 11, fatti.has(g) ? '#08121a' : C.faint)
  })
  ctx.textAlign = 'left'
  return (celle.length / 7) * lato
}

/**
 * La card del mese. ⚠️ Il canvas è sincrono: corpo e copertina devono essere
 * già caricati (useCorpoPronto, caricaImmagineDaUrl), se no mancano e chi la
 * mostra la ridisegna quando arrivano — come la card dell'allenamento.
 */
export function disegnaRecapMese(r, { nome = '', avatar = null, copertina = null, corpo } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA_MESE
  canvas.height = ALTEZZA_MESE
  const ctx = canvas.getContext('2d')
  ctx.scale(K, K)
  sfondo(ctx, null, r.gruppi, null, false, PW, PH)

  const W = PW - 2 * LATI
  let y = 34
  font(ctx, 13, 800, 1.2)
  scritta(ctx, 'IL MIO MESE', LATI, y, 13, C.accent)
  y += 13 * LH + 4
  font(ctx, 40, 800)
  scritta(ctx, `${maiuscola(r.nomeMese)} ${r.anno}`, LATI, y, 40, C.bianco)
  y += 40 * LH + 22

  y += caselle(ctx, caselleCard(r), LATI, y, W) + 22
  y += calendario(ctx, r, LATI, y, W) + 22

  // Il corpo coi muscoli del mese, e accanto la canzone se c'è.
  if (r.gruppi.length) {
    const fh = 140
    const quote = quoteZone(r.gruppi)
    disegnaCorpo(ctx, LATI, y, fh, 'fronte', quote, true, corpo)
    disegnaCorpo(ctx, LATI + fh * PROPORZIONE + 8, y, fh, 'dietro', quote, true, corpo)
    if (r.musica) polaroid(ctx, r.musica, copertina, PW - LATI - 86, y, true)
    y += fh + 22
  } else if (r.musica) {
    y += polaroid(ctx, r.musica, copertina, LATI, y, true) + 22
  }

  // In fondo chi l'ha fatto e il nome dell'app, come la card dell'allenamento.
  const persona = { nome: String(nome || '').trim(), avatar, commento: '' }
  const hChi = chi(ctx, persona, LATI, 0, W, false)
  if (hChi) chi(ctx, persona, LATI, PH - 34 - hChi, W, true)
  font(ctx, 11, 700, 0.8)
  ctx.textAlign = 'right'
  scritta(ctx, 'PROGETTOPALESTRA.IT', PW - LATI, PH - 34 - 11 * LH, 11, C.faint)
  ctx.textAlign = 'left'
  return canvas
}
