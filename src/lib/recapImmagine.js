// ---------------------------------------------------------------------------
// Disegna il recap dell'allenamento su una <canvas> 1080×1350 (formato 4:5,
// quello dei post verticali) e lo restituisce come immagine da condividere.
//
// Perché a mano su canvas e non con una libreria tipo html2canvas: l'app non ha
// dipendenze, deve funzionare offline (PWA) e su Safari iOS — un <canvas>
// disegnato a mano è l'unica strada che regge tutte e tre le cose.
//
// ⚠️ È IDENTICA AL RECAP DEL FEED DI SOCIAL (dalla 57ª): stessi blocchi, presi
// dalla stessa regola (lib/recap, pezziRecap), con le misure del CSS di `.rp`
// (components/RecapPost) e in fondo la sezione di chi l'ha fatto: avatar,
// nome, la linea e il commento (`.post-chi`, components/PostSchermo). Lo
// sfondo è quello del post: la foto velata, o le macchie coi colori dei
// gruppi (lib/recap, macchieGruppi), ferme. Per questo si disegna in px "da
// schermo" su una pagina di 400×500, ingrandita di K: le misure si copiano dal
// CSS così come sono. Se cambia lì, va cambiato qui.
// Come nel feed niente si taglia: se non ci sta, il recap si RIMPICCIOLISCE
// tutto insieme (`disegnaRecap`). Restano fuori solo le cose da toccare (il
// cuore, i commenti, le pillole dei media).
//
// ⚠️ Sulla card non si scrive COME si calcola un numero, e un numero che non si
// può calcolare non diventa un trattino: non c'è proprio (vedi lib/recap).
// ---------------------------------------------------------------------------

import { dataLunga, durataLunga, macchieGruppi, orarioAllenamento, pezziRecap } from './recap'
import { fasiDi, formatCarico, formatSerieRip, formattaRip, haFasi } from './schema'
import { CUORE, coloreCalore, coloreMuscolo } from './corpoForme'
import { CUORE_IMG, PROPORZIONE, disegnaFigura } from './corpoImmagini'
import { fotoDi } from './fotoProfili'

export const LARGHEZZA = 1080
export const ALTEZZA = 1350
const PW = 400 // la pagina, in px da schermo
const PH = 500
const K = LARGHEZZA / PW
const LATI = 22 // i margini di .post-contenuto
const SU = 26
const GIU = 22
const LH = 1.2 // line-height "normal"

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const C = {
  testo: '#f3f5f9',
  bianco: '#f6f7fb',
  muted: '#9aa4b5',
  faint: '#6b7484',
  accent: '#5cc8f5',
  verde: '#34d399',
  giallo: '#f5c542',
  rosso: '#f26d6d',
}

// Il font, con la spaziatura delle lettere dove il canvas la conosce (Safari
// prima della 17 no: le etichette vengono appena più strette).
function font(ctx, px, peso = 400, spazio = 0) {
  ctx.font = `${peso} ${px}px ${FONT}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spazio}px`
}

// Una riga di testo nella sua riga alta `px * lh`, con `y` in cima.
function scritta(ctx, t, x, y, px, colore, lh = LH) {
  ctx.fillStyle = colore
  ctx.textBaseline = 'middle'
  ctx.fillText(t, x, y + (px * lh) / 2)
}

// Rettangolo arrotondato senza ctx.roundRect (assente su Safari < 16).
function percorsoTondo(ctx, x, y, w, h, r) {
  const raggio = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + raggio, y)
  ctx.arcTo(x + w, y, x + w, y + h, raggio)
  ctx.arcTo(x + w, y + h, x, y + h, raggio)
  ctx.arcTo(x, y + h, x, y, raggio)
  ctx.arcTo(x, y, x + w, y, raggio)
  ctx.closePath()
}

function riquadro(ctx, x, y, w, h, r, sfondo, bordo) {
  percorsoTondo(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r)
  ctx.fillStyle = sfondo
  ctx.fill()
  ctx.strokeStyle = bordo
  ctx.lineWidth = 1
  ctx.stroke()
}

function linea(ctx, x1, y1, x2, y2, colore) {
  ctx.strokeStyle = colore
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

// Taglia il testo con "…" se non ci sta nella larghezza data.
function tronca(ctx, testo, maxW) {
  const t = String(testo || '')
  if (ctx.measureText(t).width <= maxW) return t
  let s = t
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

// Manda a capo il testo (col font già impostato), rispettando gli a capo
// scritti; oltre `maxRighe` l'ultima finisce con "…".
function aCapo(ctx, testo, maxW, maxRighe = Infinity) {
  const righe = []
  for (const paragrafo of String(testo || '').split('\n')) {
    let riga = ''
    for (const parola of paragrafo.split(/\s+/).filter(Boolean)) {
      const prova = riga ? `${riga} ${parola}` : parola
      if (!riga || ctx.measureText(prova).width <= maxW) riga = prova
      else {
        righe.push(riga)
        riga = parola
      }
    }
    righe.push(riga)
  }
  while (righe.length > 1 && !righe[righe.length - 1]) righe.pop()
  if (righe.length <= maxRighe) return righe
  const tenute = righe.slice(0, maxRighe)
  tenute[maxRighe - 1] = tronca(ctx, tenute[maxRighe - 1] + ' …', maxW)
  return tenute
}

// --- Lo sfondo ---------------------------------------------------------------
const rgb = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
// color-mix(in srgb, a p, b): `p` è la quota di `a`, da 0 a 1.
const mischia = (a, b, p) => a.map((c, i) => c * p + b[i] * (1 - p))
const rgba = ([r, g, b], a = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
const BIANCO = [255, 255, 255]

// linear-gradient(135deg) su un rettangolo, con le sue fermate [pos, colore].
function lineare135(ctx, x, y, w, h, fermate) {
  const meta = ((w + h) * Math.SQRT1_2) / 2
  const cx = x + w / 2
  const cy = y + h / 2
  const g = ctx.createLinearGradient(cx - meta * Math.SQRT1_2, cy - meta * Math.SQRT1_2, cx + meta * Math.SQRT1_2, cy + meta * Math.SQRT1_2)
  for (const [pos, c] of fermate) g.addColorStop(pos, c)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, PW, PH)
}

// radial-gradient(rx ry at cx cy, colore, transparent 70%).
function macchia(ctx, cx, cy, rx, ry, colore, alfa) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, rgba(colore, alfa))
  g.addColorStop(0.7, rgba(colore, 0))
  ctx.fillStyle = g
  ctx.fillRect(-cx / rx, -cy / ry, PW / rx, PH / ry)
  ctx.restore()
}

// Come lo sfondo del post: la foto scelta velata (`.post-cartolina::before`),
// o le macchie dei gruppi (`.post-fondo`, lo strato grande il 160% della
// pagina, qui fermo), o senza gruppi il celeste dell'app (`.post-cartolina`).
function sfondo(ctx, foto, gruppi) {
  if (foto) {
    const scala = Math.max(PW / foto.width, PH / foto.height)
    const w = foto.width * scala
    const h = foto.height * scala
    ctx.drawImage(foto, (PW - w) / 2, (PH - h) / 2, w, h)
    const velo = ctx.createLinearGradient(0, 0, 0, PH)
    velo.addColorStop(0, 'rgba(8,10,14,0.86)')
    velo.addColorStop(0.45, 'rgba(8,10,14,0.72)')
    velo.addColorStop(1, 'rgba(8,10,14,0.92)')
    ctx.fillStyle = velo
    ctx.fillRect(0, 0, PW, PH)
    return
  }
  const m = macchieGruppi(gruppi)
  if (!m) {
    const t = rgb(C.accent)
    lineare135(ctx, 0, 0, PW, PH, [
      [0, rgba(mischia(t, rgb('#0b0b0d'), 0.1))],
      [0.55, rgba(mischia(t, rgb('#111114'), 0.24))],
      [1, rgba(mischia(t, rgb('#0b0b0d'), 0.1))],
    ])
    macchia(ctx, 0.08 * PW, PH, 0.7 * PW, 0.45 * PH, t, 0.2)
    macchia(ctx, 0.85 * PW, 0.04 * PH, 0.8 * PW, 0.5 * PH, t, 0.4)
    return
  }
  const sw = PW * 1.6
  const sh = PH * 1.6
  const sx = (PW - sw) / 2
  const sy = (PH - sh) / 2
  const { primo, secondo, quotaPrimo } = m.misto
  const misto = secondo ? mischia(rgb(primo), rgb(secondo), quotaPrimo / 100) : rgb(primo)
  const c = mischia(misto, BIANCO, 0.78)
  lineare135(ctx, sx, sy, sw, sh, [
    [0, rgba(mischia(c, rgb('#0b0b0d'), 0.08))],
    [0.55, rgba(mischia(c, rgb('#111114'), 0.16))],
    [1, rgba(mischia(c, rgb('#0b0b0d'), 0.08))],
  ])
  // Nel CSS il primo strato sta sopra: si disegnano dall'ultimo.
  for (const k of [...m.macchie].reverse()) {
    const pastello = mischia(rgb(k.colore), BIANCO, 0.78)
    const ry = Math.round(k.raggio * 0.65)
    macchia(ctx, sx + (sw * k.x) / 100, sy + (sh * k.y) / 100, (sw * k.raggio) / 100, (sh * ry) / 100, pastello, k.forza / 100)
  }
}

// --- I pezzi del recap -------------------------------------------------------
// Ogni pezzo si misura e si disegna con LA STESSA funzione (`disegna` falso =
// solo misura): così l'altezza che conta per farlo stare è quella vera.

// `.rp-etichetta`: 10.5px maiuscolo, 6px sotto (3px nelle celle).
function etichetta(ctx, t, x, y, disegna, sotto = 6) {
  font(ctx, 10.5, 700, 0.84)
  if (disegna) scritta(ctx, t.toUpperCase(), x, y, 10.5, C.faint)
  font(ctx, 10.5)
  return 10.5 * LH + sotto
}

// La figura del corpo coi gruppi accesi. ⚠️ Il canvas è sincrono e le
// immagini no: se non sono ancora arrivate il corpo non si disegna, e chi
// mostra la card la ridisegna quando arrivano (useCorpoPronto).
function disegnaCorpo(ctx, x, y, h, vista, quote, calore) {
  const colori = {}
  for (const [id, q] of Object.entries(quote)) colori[id] = coloreMuscolo(id, q, calore)
  if (!disegnaFigura(ctx, vista, x, y, h, colori)) return
  // Il cardio non è un muscolo: si accende il cuore.
  if (vista === 'fronte' && quote.cardio != null) {
    const w = h * PROPORZIONE
    const scala = (w * CUORE_IMG.lato) / 18.4 // il cuore e' largo 18.4
    ctx.save()
    ctx.translate(x + w * CUORE_IMG.x, y + h * CUORE_IMG.y)
    ctx.scale(scala, scala)
    ctx.fillStyle = coloreMuscolo('cardio', quote.cardio, calore)
    ctx.fill(new Path2D(CUORE))
    ctx.restore()
  }
}

// `.rp-sforzo`: la barra facili/medie/dure e sotto quante.
function barraSforzo(ctx, x, y, w, sforzo, disegna) {
  if (disegna) {
    percorsoTondo(ctx, x, y, w, 9, 4.5)
    ctx.save()
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(x, y, w, 9)
    let cx = x
    for (const c of ['verde', 'giallo', 'rosso']) {
      const larg = ((sforzo[c] || 0) / sforzo.tot) * w
      ctx.fillStyle = C[c]
      ctx.fillRect(cx, y, larg, 9)
      cx += larg
    }
    ctx.restore()
    const voci = [
      sforzo.verde && `${sforzo.verde} facili`,
      sforzo.giallo && `${sforzo.giallo} medie`,
      sforzo.rosso && `${sforzo.rosso} dure`,
    ].filter(Boolean)
    font(ctx, 11.5, 500)
    scritta(ctx, tronca(ctx, voci.join(' · '), w), x, y + 15, 11.5, C.faint)
  }
  return 9 + 6 + 11.5 * LH
}

// `.rp-striscia`: i numeri su una riga, divisi da righe sottili.
function striscia(ctx, tessere, x, y, w, disegna) {
  const fitta = tessere.length >= 4
  const colW = w / tessere.length
  const pad = fitta ? 8 : 10
  const pxValore = Math.min(fitta ? 16 : 19, w * (fitta ? 0.051 : 0.064))
  const celle = tessere.map((t, i) => {
    const sx = i === 0 ? 0 : pad
    const cw = colW - sx - pad
    font(ctx, 11.5, 500)
    const nota = (fitta && t.notaCorta) || t.nota
    const righeNota = nota ? aCapo(ctx, nota, cw) : []
    const h = 10.5 * LH + 3 + pxValore * 1.15 + (righeNota.length ? 2 + righeNota.length * 11.5 * 1.3 : 0)
    return { t, x: x + i * colW + sx, cw, righeNota, h }
  })
  const hMax = Math.max(...celle.map((c) => c.h))
  if (disegna) {
    linea(ctx, x, y + 0.5, x + w, y + 0.5, 'rgba(255,255,255,0.1)')
    linea(ctx, x, y + 23.5 + hMax, x + w, y + 23.5 + hMax, 'rgba(255,255,255,0.1)')
    celle.forEach((c, i) => {
      if (i) linea(ctx, x + i * colW + 0.5, y + 12, x + i * colW + 0.5, y + 12 + hMax, 'rgba(255,255,255,0.1)')
      let cy = y + 12
      cy += etichetta(ctx, (fitta && c.t.corta) || c.t.etichetta, c.x, cy, true, 3)
      font(ctx, pxValore, 800)
      scritta(ctx, (fitta && c.t.valoreCorto) || c.t.valore, c.x, cy, pxValore, c.t.accento ? C.accent : C.testo, 1.15)
      cy += pxValore * 1.15 + 2
      font(ctx, 11.5, 500)
      c.righeNota.forEach((r, k) => scritta(ctx, r, c.x, cy + k * 11.5 * 1.3, 11.5, C.faint, 1.3))
    })
  }
  return 24 + hMax
}

// `.rp-contorno`: esercizi · serie · battito, che vanno a capo a pezzi interi.
function contorno(ctx, parti, x, y, w, disegna) {
  font(ctx, 13, 600)
  const wPunto = ctx.measureText('·').width
  const rh = 13 * LH
  let cx = 0
  let riga = 0
  parti.forEach((p, i) => {
    const wSep = i ? 16 + wPunto : 0
    const wp = wSep + ctx.measureText(p.t).width
    if (cx > 0 && cx + wp > w) {
      riga++
      cx = 0
    }
    if (disegna) {
      const cy = y + riga * (rh + 4)
      if (i) scritta(ctx, '·', x + cx + 8, cy, 13, C.faint)
      scritta(ctx, p.t, x + cx + wSep, cy, 13, p.rosso ? C.rosso : C.muted)
    }
    cx += wp
  })
  return (riga + 1) * rh + riga * 4
}

// `.rp-corpo`: le due sagome e a destra le pastiglie dei gruppi, la legenda
// del calore e, se c'è, lo sforzo.
function corpo(ctx, p, x, y, w, stat, calore, disegna) {
  const gruppi = stat.gruppi
  const max = Math.max(...gruppi.map((g) => g.serie || 0))
  const quota = (g) => (max > 0 ? (g.serie || 0) / max : 1)
  const fh = 104
  const fw = fh * PROPORZIONE
  font(ctx, 11, 700, 0.88)
  const viste = [
    { vista: 'fronte', t: 'DAVANTI' },
    { vista: 'dietro', t: 'DIETRO' },
  ].map((v) => ({ ...v, w: Math.max(fw, ctx.measureText(v.t).width) }))
  const figW = viste[0].w + 8 + viste[1].w
  if (disegna) {
    const quote = {}
    for (const g of gruppi) quote[g.id] = quota(g)
    let vx = x
    for (const v of viste) {
      disegnaCorpo(ctx, vx + (v.w - fw) / 2, y, fh, v.vista, quote, calore)
      font(ctx, 11, 700, 0.88)
      ctx.textAlign = 'center'
      scritta(ctx, v.t, vx + v.w / 2, y + fh + 6, 11, 'rgba(255,255,255,0.5)')
      ctx.textAlign = 'left'
      vx += v.w + 8
    }
  }

  const rx = x + figW + 14
  const rw = w - figW - 14
  let ry = y + etichetta(ctx, 'Muscoli allenati', rx, y, disegna)
  // Le pastiglie (`.gruppo-chip`): 12px, 4px su e giù e 10 di lato, 6 fra l'una e l'altra.
  const hChip = 12 * LH + 10
  font(ctx, 12, 700)
  let cx = 0
  let righe = 0
  for (const g of gruppi) {
    const t = `${g.label} · ${g.serie}`
    const cw = Math.min(rw, ctx.measureText(t).width + 22 + (calore ? 16 : 0))
    if (cx > 0 && cx + cw > rw) {
      righe++
      cx = 0
    }
    if (disegna) {
      const px = rx + cx
      const py = ry + righe * (hChip + 6)
      const [r, gg, b] = rgb(g.colore)
      if (calore) riquadro(ctx, px, py, cw, hChip, hChip / 2, 'rgba(0,0,0,0)', 'rgba(255,255,255,0.16)')
      else riquadro(ctx, px, py, cw, hChip, hChip / 2, `rgba(${r},${gg},${b},0.2)`, `rgba(${r},${gg},${b},0.55)`)
      let tx = px + 11
      if (calore) {
        ctx.beginPath()
        ctx.arc(tx + 4.5, py + hChip / 2, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = coloreCalore(quota(g))
        ctx.fill()
        tx += 16
      }
      font(ctx, 12, 700)
      scritta(ctx, tronca(ctx, t, cw - (tx - px) - 11), tx, py + 5, 12, C.bianco)
    }
    cx += cw + 6
  }
  ry += (righe + 1) * hChip + righe * 6 + 10
  if (calore) {
    ry -= 2
    if (disegna) {
      font(ctx, 10.5)
      const lw = Math.min(180, rw)
      const wPoco = ctx.measureText('poco').width
      const wTanto = ctx.measureText('tanto').width
      scritta(ctx, 'poco', rx, ry, 10.5, C.testo)
      ctx.textAlign = 'right'
      scritta(ctx, 'tanto', rx + lw, ry, 10.5, C.testo)
      ctx.textAlign = 'left'
      const bx = rx + wPoco + 8
      const bw = lw - wPoco - wTanto - 16
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.5, '#5cc8f5')
      g.addColorStop(1, '#1d5fd6')
      percorsoTondo(ctx, bx, ry + 4.3, bw, 4, 2)
      ctx.fillStyle = g
      ctx.fill()
    }
    ry += 10.5 * LH + 14
  }
  if (p.sforzo) ry += barraSforzo(ctx, rx, ry, rw, stat.sforzo, disegna)
  return Math.max(fh + 6 + 11 * LH, ry - y)
}

// `.rp-esercizi`: nome a sinistra (va a capo), i pallini delle serie accanto
// e lo schema in fondo a destra.
function esercizi(ctx, lista, x, y, w, { pallini, schema }, disegna) {
  let cy = y + etichetta(ctx, 'Esercizi', x, y, disegna)
  for (const e of lista) {
    const f0 = fasiDi(e.schema)[0]
    const destra = schema
      ? [
          haFasi(e.schema)
            ? formatSerieRip(e.schema)
            : e.serie
              ? `${e.serie}×${formattaRip(f0?.rip, f0?.perLato) || '-'}`
              : null,
          formatCarico(e.schema) || null,
        ]
          .filter(Boolean)
          .join(' · ')
      : ''
    const colori = pallini ? e.colori?.colori || [] : []
    const wPallini = colori.length ? colori.length * 11 - 4 : 0
    font(ctx, 12.5, 600)
    const wDestra = destra ? ctx.measureText(destra).width : 0
    const libero = w - (pallini ? wPallini + 10 : 0) - (destra ? wDestra + 10 : 0)
    font(ctx, 14, 600)
    const righe = aCapo(ctx, e.nome, libero)
    const wNome = Math.min(libero, Math.max(...righe.map((r) => ctx.measureText(r).width)))
    const hNome = righe.length * 14 * LH
    const hc = Math.max(hNome, destra ? 12.5 * LH : 0, colori.length ? 7 : 0)
    if (disegna) {
      const mezzo = cy + 8 + hc / 2
      righe.forEach((r, k) => scritta(ctx, r, x, mezzo - hNome / 2 + k * 14 * LH, 14, C.testo))
      colori.forEach((c, k) => {
        ctx.beginPath()
        ctx.arc(x + wNome + 10 + k * 11 + 3.5, mezzo, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = C[c] || 'rgba(255,255,255,0.14)'
        ctx.fill()
      })
      if (destra) {
        font(ctx, 12.5, 600)
        ctx.textAlign = 'right'
        scritta(ctx, destra, x + w, mezzo - (12.5 * LH) / 2, 12.5, C.muted)
        ctx.textAlign = 'left'
      }
      linea(ctx, x, cy + hc + 16.5, x + w, cy + hc + 16.5, 'rgba(255,255,255,0.06)')
    }
    cy += hc + 17
  }
  return cy - y
}

/** Un pezzo del recap (lib/recap, pezziRecap): disegnato, o solo misurato. */
function pezzo(ctx, p, x, y, w, d, disegna) {
  ctx.textAlign = 'left'
  switch (p.tipo) {
    case 'data':
      font(ctx, 13, 600)
      if (disegna) scritta(ctx, d.testoData, x, y, 13, C.muted)
      return 13 * LH
    case 'titolo': {
      font(ctx, 36, 800, -0.72)
      const righe = aCapo(ctx, d.titolo, w)
      if (disegna) righe.forEach((r, i) => scritta(ctx, r, x, y + i * 36 * 1.05, 36, C.testo, 1.05))
      return righe.length * 36 * 1.05
    }
    case 'sottotitolo': {
      font(ctx, 13.5, 500)
      const righe = aCapo(ctx, p.testo, w)
      if (disegna) righe.forEach((r, i) => scritta(ctx, r, x, y + i * 13.5 * LH, 13.5, C.muted))
      return righe.length * 13.5 * LH
    }
    case 'griglia':
      return striscia(ctx, p.tessere, x, y, w, disegna)
    case 'contorno':
      return contorno(ctx, p.parti, x, y, w, disegna)
    case 'corpo':
      return corpo(ctx, p, x, y, w, d.stat, d.on('calore'), disegna)
    case 'sforzo': {
      const h = etichetta(ctx, 'Sforzo', x, y, disegna)
      return h + barraSforzo(ctx, x, y + h, w, d.stat.sforzo, disegna)
    }
    case 'record': {
      let cy = y
      p.record.forEach((r, i) => {
        if (i) cy += 8
        font(ctx, 13.5, 700)
        const righe = aCapo(ctx, `🏆 Record · ${r.esercizio} ${r.carico}`, w - 26)
        const h = righe.length * 13.5 * LH + 18
        if (disegna) {
          riquadro(ctx, x, cy, w, h, 10, 'rgba(52,211,153,0.14)', 'rgba(52,211,153,0.4)')
          righe.forEach((t, k) => scritta(ctx, t, x + 13, cy + 9 + k * 13.5 * LH, 13.5, C.verde))
        }
        cy += h
      })
      return cy - y
    }
    case 'perno':
      return p.esercizi
        ? esercizi(ctx, d.stat.esercizi, x, y, w, { pallini: d.on('pallini'), schema: d.on('schemaEsercizi') }, disegna)
        : 0
    case 'firma':
      // `.rp-firma`: la data a sinistra, serie e durata a destra.
      if (disegna) {
        ctx.textBaseline = 'alphabetic'
        font(ctx, 12.5, 600)
        ctx.fillStyle = C.muted
        ctx.fillText(d.dataInFondo ? d.testoData : '', x, y + 12)
        font(ctx, 11, 600)
        ctx.fillStyle = C.faint
        ctx.textAlign = 'right'
        ctx.fillText(d.numeriFirma, x + w, y + 12)
        ctx.textAlign = 'left'
      }
      return 12.5 * LH
    default:
      return 0
  }
}

// Lo spazio fra due pezzi: il `gap` di .rp-dentro, con data, titolo e
// sottotitolo stretti fra loro come un'intestazione.
function spazioFra(a, b) {
  if (a.tipo === 'data' && (b.tipo === 'titolo' || b.tipo === 'sottotitolo')) return 4
  if (a.tipo === 'titolo' && b.tipo === 'sottotitolo') return 6
  return 12
}

// `.post-chi`: avatar e nome sulla linea che li stacca dal recap, sotto il
// commento. ⚠️ Nel feed il commento è a due righe e si apre col tocco: su
// un'immagine non si tocca, e ne tiene fino a quattro.
function chi(ctx, { nome, avatar, commento }, x, y, w, disegna) {
  let h = 0
  if (nome) {
    font(ctx, 14, 800)
    const wNome = ctx.measureText(nome).width
    if (disegna) {
      const cy = y + 17
      const prima = ctx.createLinearGradient(x - LATI, 0, x, 0)
      prima.addColorStop(0, 'rgba(255,255,255,0)')
      prima.addColorStop(1, 'rgba(255,255,255,0.22)')
      ctx.fillStyle = prima
      ctx.fillRect(x - LATI, cy - 0.5, LATI, 1)
      const da = x + 44 + wNome + 4
      if (da < x + w) {
        const dopo = ctx.createLinearGradient(da, 0, x + w, 0)
        dopo.addColorStop(0, 'rgba(255,255,255,0.22)')
        dopo.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = dopo
        ctx.fillRect(da, cy - 0.5, x + w - da, 1)
      }
      // L'avatar: la foto, o l'iniziale su fondo pieno.
      ctx.beginPath()
      ctx.arc(x + 17, cy, 17, 0, Math.PI * 2)
      ctx.fillStyle = '#262b36'
      ctx.fill()
      if (avatar) {
        ctx.save()
        ctx.clip()
        const s = Math.max(34 / avatar.width, 34 / avatar.height)
        ctx.drawImage(avatar, x + 17 - (avatar.width * s) / 2, cy - (avatar.height * s) / 2, avatar.width * s, avatar.height * s)
        ctx.restore()
      } else {
        font(ctx, 15, 800)
        ctx.textAlign = 'center'
        scritta(ctx, nome.trim().charAt(0).toUpperCase() || '?', x + 17, cy - 9, 15, '#fff')
        ctx.textAlign = 'left'
      }
      ctx.beginPath()
      ctx.arc(x + 17, cy, 16.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      font(ctx, 14, 800)
      scritta(ctx, tronca(ctx, nome, w - 44), x + 44, cy - 8.4, 14, C.bianco)
    }
    h = 34
  }
  if (commento) {
    if (h) h += 6
    font(ctx, 15, 500)
    const righe = aCapo(ctx, commento, w, 4)
    if (disegna) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 8 * K
      ctx.shadowOffsetY = 1 * K
      righe.forEach((r, i) => scritta(ctx, r, x, y + h + i * 21, 15, '#fff', 1.4))
      ctx.restore()
    }
    h += righe.length * 21
  }
  return h
}

/**
 * Disegna il recap su una canvas nuova.
 * @param {{
 *   riep: object, stat: object, commento?: string, foto?: HTMLImageElement|null,
 *   layout?: object, nome?: string, avatar?: HTMLImageElement|null,
 * }} opts  `riep.nomeGiorno` è il titolo (che l'utente può cambiare nel riepilogo).
 *   `layout` (lib/recapLayout) dice quali blocchi; se manca vale quello salvato
 *   sull'allenamento (`riep.recap`). `nome` e `avatar` sono di chi l'ha fatto,
 *   in fondo come nel feed; senza nome quella riga non c'è.
 *   ⚠️ Commento, calorie e battito sono FACOLTATIVI: se non ci sono, sulla card
 *   non compare niente al loro posto — nemmeno lo spazio.
 * @returns {HTMLCanvasElement}
 */
export function disegnaRecap({
  riep,
  stat,
  commento = '',
  foto = null,
  layout = riep?.recap,
  nome = riep?.utenteNome || '',
  avatar = null,
}) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA
  canvas.height = ALTEZZA
  const ctx = canvas.getContext('2d')
  ctx.scale(K, K)
  sfondo(ctx, foto, stat.gruppi)

  // Come RecapPost: i pezzi senza il commento (che va in fondo, sotto il nome),
  // e la data, se è l'ultima, nella riga della firma.
  const { pezzi: lista, L } = pezziRecap({ ...riep, recap: layout }, stat, true)
  const on = (id) => !L.nascosti.includes(id)
  const dataInFondo = lista[lista.length - 1]?.tipo === 'data'
  const orario = on('orario') ? orarioAllenamento(riep?.data, riep?.durataSec) : ''
  const numeriFirma = on('firma')
    ? [stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null, stat.durataSec > 0 ? durataLunga(stat.durataSec) : null]
        .filter(Boolean)
        .join(' · ')
    : ''
  const d = {
    stat,
    on,
    dataInFondo,
    numeriFirma,
    testoData: [dataLunga(riep?.data), orario].filter(Boolean).join(' · '),
    titolo: riep?.nomeGiorno || 'Allenamento',
  }
  const pezzi = dataInFondo ? lista.slice(0, -1) : lista
  if (dataInFondo || numeriFirma) pezzi.push({ tipo: 'firma' })

  const W = PW - 2 * LATI
  const persona = { nome: String(nome || '').trim(), avatar, commento: on('commento') ? String(commento || '').trim() : '' }
  const hChi = chi(ctx, persona, LATI, 0, W, false)
  const H = PH - SU - GIU - (hChi ? hChi + 10 : 0)

  const alto = (w) =>
    pezzi.reduce((t, p, i) => t + (i ? spazioFra(pezzi[i - 1], p) : 0) + pezzo(ctx, p, 0, 0, w, d, false), 0)
  // Se non ci sta, si rimpicciolisce tutto (come `adatta` in RecapPost): più
  // stretto vuol dire più largo da riempire, quindi meno a capo: si rifà il
  // conto finché non si ferma.
  let s = 1
  for (let i = 0; i < 5; i++) {
    const nuovo = Math.min(1, H / alto(W / s))
    const fermo = Math.abs(nuovo - s) < 0.002
    s = nuovo
    if (fermo) break
  }
  const w = W / s
  const naturale = alto(w)
  s = Math.min(s, H / naturale)
  // Lo spazio che avanza va agli esercizi (il perno): quello dopo va in fondo.
  const avanza = Math.max(0, H / s - naturale)

  ctx.save()
  ctx.translate(LATI, SU)
  ctx.scale(s, s)
  let y = 0
  pezzi.forEach((p, i) => {
    if (i) y += spazioFra(pezzi[i - 1], p)
    y += pezzo(ctx, p, 0, y, w, d, true) + (p.tipo === 'perno' ? avanza : 0)
  })
  ctx.restore()

  if (hChi) chi(ctx, persona, LATI, PH - GIU - hChi, W, true)
  return canvas
}

// Carica un file immagine scelto dall'utente come <img> pronta da disegnare.
export function caricaImmagine(file) {
  return new Promise((risolvi, rifiuta) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      risolvi(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rifiuta(new Error('Immagine non leggibile'))
    }
    img.src = url
  })
}

// La foto di sfondo già salvata (lib/fotoAllenamento): dalla copia locale o
// dal link firmato dello Storage. ⚠️ `crossOrigin` PRIMA di `src`: senza, una
// foto presa dallo Storage "sporca" la canvas e la card non si esporta più.
export function caricaImmagineDaUrl(url) {
  return new Promise((risolvi, rifiuta) => {
    const img = new Image()
    if (!url.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.onload = () => risolvi(img)
    img.onerror = () => rifiuta(new Error('Immagine non leggibile'))
    img.src = url
  })
}

// La foto di sfondo da salvare: un JPEG col lato lungo di 1600px al massimo.
// La card è 1080×1350 e il feed è uno schermo di telefono: i 12 MB di una
// foto della fotocamera non servono a nessuno dei due.
export function fotoPerSfondo(img, lato = 1600) {
  const scala = Math.min(1, lato / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scala)
  c.height = Math.round(img.height * scala)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return new Promise((risolvi) => c.toBlob((b) => risolvi(b), 'image/jpeg', 0.85))
}

// La canvas come Blob PNG (per condivisione/salvataggio).
export function canvasInBlob(canvas) {
  return new Promise((risolvi) => canvas.toBlob((b) => risolvi(b), 'image/png'))
}

// La foto profilo di chi ha fatto l'allenamento, pronta per la card (in fondo,
// come nel feed). null se non ce l'ha o non si carica: resta l'iniziale.
export async function caricaAvatar(id) {
  const url = id ? await fotoDi(id) : ''
  return url ? caricaImmagineDaUrl(url).catch(() => null) : null
}
