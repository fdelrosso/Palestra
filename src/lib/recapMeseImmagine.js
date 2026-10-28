// ---------------------------------------------------------------------------
// La CARD del recap del mese (lib/recapMese): 1080×1920, il formato della
// storia di Instagram. Come la card dell'allenamento (lib/recapImmagine)
// l'anteprima È l'immagine che si esporta, e i pezzi di disegno sono i suoi.
// Pagina logica 400 di larghezza, alta 400×16/9.
//
// Un POSTER, non un riassunto in riquadri: parla la lingua delle slide.
//   in alto   avatar e nome, "L'ottobre di Ciusbe in palestra" in condensato
//   il numero i kg sollevati enormi, e sotto il bilanciere coi dischi del mese
//   tabellone allenamenti · tempo · serie
//   due mezzi il calendario con gli anelli dei muscoli | il muscolo del mese
//   fascia oro il record più cresciuto, prima → dopo, con la barra
//   sfondo    le foto pubblicate come stampe accavallate, sotto un velo
//   in alto   accanto al titolo le polaroid delle canzoni del mese
// Quello che non c'è non lascia il buco: il pezzo salta e il resto sale.
// ⚠️ I font del condensato e dello scritto a mano devono essere già caricati
// (pages/RecapMesePage aspetta document.fonts): il canvas non li aspetta.
// ---------------------------------------------------------------------------

import { C, LH, aCapo, disegnaCorpo, font, percorsoTondo, polaroid, scritta, sfondo, tronca } from './recapImmagine'
import { quoteZone, PROPORZIONE } from './corpoImmagini'
import { celleDelMese, durataLunga, formattaMigliaia, recordPerCrescita } from './recapMese'
import { formattaNumero } from './carico'
import { gruppoDi } from './muscoli'

export const LARGHEZZA_MESE = 1080
export const ALTEZZA_MESE = 1920
const PW = 400
const PH = (PW * ALTEZZA_MESE) / LARGHEZZA_MESE
const K = LARGHEZZA_MESE / PW
const LATI = 24
const W = PW - 2 * LATI
const STACCO = 12 // fra un pezzo e l'altro

export const nomeFileMese = (r) => `recap-${r.nomeMese}-${r.anno}.png`

const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const CONDENSATO = "'Recap Condensato', Manrope, system-ui, sans-serif"
const condensato = (ctx, px, peso = 800) => {
  ctx.font = `${peso} ${px}px ${CONDENSATO}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
}
const ORO = '#f5c542'
const DISCO = { rosso: '#d93025', blu: '#1e5bd8', giallo: '#f2c230', verde: '#2e9e4f', bianco: '#e9e6df' }

// "L'ottobre di Ciusbe" + "in palestra", come la prima slide: due pezzi, così
// l'a capo cade sempre prima di "in palestra".
function titoloMese(r, nome) {
  const chi = maiuscola(String(nome || '').replace(/^@/, '').trim())
  if (!chi) return [`Il mio ${r.nomeMese}`, 'in palestra']
  return [`${/^[aeiou]/.test(r.nomeMese) ? `L’${r.nomeMese}` : `Il ${r.nomeMese}`} di ${chi}`, 'in palestra']
}

// Un numero con l'unità piccola accanto, sulla stessa linea di base. Restituisce la larghezza.
function numeroConUnita(ctx, n, unita, x, y, px, colore, disegna = true) {
  condensato(ctx, px)
  const wn = ctx.measureText(n).width
  if (disegna) scritta(ctx, n, x, y, px, colore, 1)
  if (!unita) return wn
  condensato(ctx, px * 0.42, 700)
  const wu = ctx.measureText(unita).width
  if (disegna) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(unita, x + wn + px * 0.06, y + px * 0.86)
  }
  return wn + px * 0.06 + wu
}

// --- I pezzi: ognuno si misura e si disegna con la stessa funzione ----------

// Il numero protagonista (i kg, o senza kg il tempo) e sotto il bilanciere.
function protagonista(ctx, r, x, y, disegna) {
  const px = 72
  let h = 0
  const [n, unita, cosa] = r.volume
    ? [formattaMigliaia(r.volume), 'kg', 'sollevati']
    : [durataLunga(r.durataSec).replace(/ min$/, ''), r.durataSec >= 3600 ? '' : 'min', 'in palestra']
  numeroConUnita(ctx, n, unita, x, y, px, C.bianco, disegna)
  h += px * 0.92
  font(ctx, 15, 700)
  if (disegna) scritta(ctx, r.volumeInPiu ? `${cosa}, +${formattaMigliaia(r.volumeInPiu)} kg su ${r.nomeMesePrima}` : cosa, x, y + h, 15, 'rgba(255,255,255,0.78)')
  h += 15 * LH
  if (r.volume && r.dischi.length) {
    h += 8
    h += bilanciere(ctx, r.dischi, x, y + h, W, disegna)
  }
  return h
}

// Il bilanciere: la sbarra, e sui due lati gli stessi dischi (uno per
// allenamento), dal più pesante dentro, alti secondo il peso.
function bilanciere(ctx, dischi, x, y, w, disegna) {
  const H = 50
  if (!disegna) return H
  const visti = dischi.slice(0, 12)
  const cy = y + H / 2
  const metallo = (yy, hh) => {
    const g = ctx.createLinearGradient(0, yy, 0, yy + hh)
    g.addColorStop(0, '#e3e7ee')
    g.addColorStop(0.6, '#8a94a2')
    g.addColorStop(1, '#5d6673')
    return g
  }
  ctx.fillStyle = metallo(cy - 3, 6)
  ctx.fillRect(x, cy - 3, w, 6)
  const larg = Math.min(9, 110 / visti.length - 1.5)
  const fermo = (fx) => {
    ctx.fillStyle = '#b9c1cc'
    percorsoTondo(ctx, fx, cy - 11, 4, 22, 1.5)
    ctx.fill()
  }
  const lato = (dir) => {
    // Dalla sbarra verso fuori: dentro c'è il primo (il più pesante).
    const dentro = dir > 0 ? x + w * 0.62 : x + w * 0.38
    visti.forEach((d, i) => {
      const hd = H * (0.32 + d.quota * 0.68)
      const dx = dir > 0 ? dentro + i * (larg + 1.5) : dentro - (i + 1) * (larg + 1.5) + 1.5
      const g = ctx.createLinearGradient(dx, 0, dx + larg, 0)
      g.addColorStop(0, 'rgba(255,255,255,0.28)')
      g.addColorStop(0.45, 'rgba(255,255,255,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.28)')
      percorsoTondo(ctx, dx, cy - hd / 2, larg, hd, 2.5)
      ctx.fillStyle = DISCO[d.colore]
      ctx.fill()
      ctx.fillStyle = g
      ctx.fill()
    })
    const fuori = dir > 0 ? dentro + visti.length * (larg + 1.5) + 1 : dentro - visti.length * (larg + 1.5) - 5
    fermo(fuori)
  }
  lato(1)
  lato(-1)
  // La zigrinatura dell'impugnatura, al centro.
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  for (let zx = x + w * 0.42; zx < x + w * 0.58; zx += 3) ctx.fillRect(zx, cy - 3, 1, 6)
  return H
}

// Il tabellone: tre numeri in fila con cosa sono, separati da un filo.
function tabellone(ctx, r, x, y, disegna) {
  const voci = [
    [String(r.allenamenti), '', r.allenamenti === 1 ? 'allenamento' : 'allenamenti'],
    r.volume && r.durataSec && [...dividiDurata(r.durataSec), 'in palestra'],
    r.sforzo && [String(r.sforzo.tot), '', 'serie'],
    !r.sforzo && r.minutiCardio > 0 && [String(r.minutiCardio), 'min', 'di cardio'],
  ].filter(Boolean)
  const H = 54
  if (!disegna) return H
  const wc = W / voci.length
  voci.forEach(([n, u, cosa], i) => {
    const cx = x + i * wc + (i ? 14 : 0)
    if (i) {
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.fillRect(x + i * wc, y + 4, 1, H - 8)
    }
    numeroConUnita(ctx, n, u, cx, y, 34, C.bianco)
    font(ctx, 11.5, 700)
    scritta(ctx, cosa, cx, y + 36, 11.5, 'rgba(255,255,255,0.65)')
  })
  return H
}
// "8 h 02 min" → ['8h02', ''] per stare nel tabellone; sotto l'ora ['45', 'min'].
function dividiDurata(sec) {
  const m = Math.round(sec / 60)
  return m < 60 ? [String(m), 'min'] : [`${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`, '']
}

// Il calendario come quello dell'app: i giorni allenati con l'anello coi
// colori dei muscoli di quel giorno, gli altri tenui. Le iniziali sopra.
function calendario(ctx, r, x, y, w, disegna) {
  const celle = celleDelMese(r.anno, r.mese)
  const lato = w / 7
  const H = 16 + (celle.length / 7) * lato
  if (!disegna) return H
  font(ctx, 9.5, 800)
  ctx.textAlign = 'center'
  ;['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach((g, i) => scritta(ctx, g, x + i * lato + lato / 2, y, 9.5, 'rgba(255,255,255,0.5)'))
  const colori = new Map()
  for (const v of r.voci) {
    const g = new Date(v.data).getDate()
    const lista = colori.get(g) || []
    for (const e of v.esercizi || []) {
      const c = gruppoDi(e.gruppo)?.colore
      if (c && !lista.includes(c)) lista.push(c)
    }
    colori.set(g, lista)
  }
  const raggio = lato / 2 - 2
  celle.forEach((g, i) => {
    if (!g) return
    const cx = x + (i % 7) * lato + lato / 2
    const cy = y + 16 + Math.floor(i / 7) * lato + lato / 2
    const fatto = colori.get(g)
    if (fatto) {
      const lista = fatto.length ? fatto : [C.accent]
      const passo = (Math.PI * 2) / lista.length
      ctx.lineWidth = 2.6
      lista.forEach((c, k) => {
        ctx.beginPath()
        ctx.arc(cx, cy, raggio - 1.3, -Math.PI / 2 + k * passo, -Math.PI / 2 + (k + 1) * passo)
        ctx.strokeStyle = c
        ctx.stroke()
      })
    }
    font(ctx, 10, fatto ? 800 : 600)
    scritta(ctx, String(g), cx, cy - 6, 10, fatto ? C.bianco : 'rgba(255,255,255,0.4)', 1.2)
  })
  ctx.textAlign = 'left'
  return H
}

// Il muscolo del mese: il nome del suo colore, quante serie, e la figura.
function muscolo(ctx, r, x, y, w, h, corpo, disegna) {
  const g = r.gruppi[0]
  if (!disegna) return h
  font(ctx, 11, 700)
  scritta(ctx, 'il muscolo del mese', x, y, 11, 'rgba(255,255,255,0.65)')
  condensato(ctx, 30)
  scritta(ctx, tronca(ctx, g.label, w), x, y + 14, 30, schiarito(g.colore), 1)
  font(ctx, 11, 600)
  scritta(ctx, `${g.serie} serie`, x, y + 46, 11, 'rgba(255,255,255,0.7)')
  const fh = Math.min(h - 66, (w - 6) / (2 * PROPORZIONE))
  const quote = quoteZone(r.gruppi)
  const fx = x + (w - (fh * PROPORZIONE * 2 + 6)) / 2
  disegnaCorpo(ctx, fx, y + 64, fh, 'fronte', quote, true, corpo)
  disegnaCorpo(ctx, fx + fh * PROPORZIONE + 6, y + 64, fh, 'dietro', quote, true, corpo)
  return h
}
// Il colore del gruppo un po' più chiaro, come il nome nella slide.
function schiarito(hex) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * 0.7 + 255 * 0.3))
  return `rgb(${c.join(',')})`
}

// La fascia del record più cresciuto: nome, prima → dopo, "+N kg" e la barra.
function fasciaRecord(ctx, r, x, y, disegna) {
  const [top] = recordPerCrescita(r.record)
  const H = 76
  if (!disegna) return H
  const fondo = ctx.createLinearGradient(x, y, x + W, y + H)
  fondo.addColorStop(0, 'rgba(245,197,66,0.2)')
  fondo.addColorStop(1, 'rgba(180,83,9,0.14)')
  percorsoTondo(ctx, x, y, W, H, 16)
  ctx.fillStyle = fondo
  ctx.fill()
  ctx.strokeStyle = 'rgba(245,197,66,0.4)'
  ctx.lineWidth = 1
  ctx.stroke()
  const px = x + 16
  font(ctx, 11, 700)
  scritta(ctx, r.numRecord === 1 ? 'il record del mese' : `il più grande di ${r.numRecord} record`, px, y + 12, 11, 'rgba(255,255,255,0.7)')
  font(ctx, 15, 800)
  scritta(ctx, tronca(ctx, top.esercizio, W - 150), px, y + 28, 15, C.bianco)
  // A destra: prima → dopo, il dopo grande.
  ctx.textAlign = 'right'
  condensato(ctx, 34)
  const dopo = `${formattaNumero(top.dopoKg)}`
  scritta(ctx, dopo, x + W - 30, y + 10, 34, C.bianco, 1)
  const wDopo = ctx.measureText(dopo).width
  condensato(ctx, 14, 700)
  scritta(ctx, 'kg', x + W - 14, y + 26, 14, 'rgba(255,255,255,0.72)', 1)
  font(ctx, 12, 700)
  scritta(ctx, `${top.prima} →`, x + W - 36 - wDopo, y + 22, 12, 'rgba(255,255,255,0.6)')
  ctx.textAlign = 'left'
  // La barra: il bianco è il prima, l'oro arriva fino al dopo.
  const by = y + 52
  const bw = W - 32 - 70
  const quota = Math.max(0.08, Math.min(1, top.primaKg / top.dopoKg))
  percorsoTondo(ctx, px, by, bw, 8, 4)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fill()
  const oro = ctx.createLinearGradient(px, 0, px + bw, 0)
  oro.addColorStop(0, '#b45309')
  oro.addColorStop(1, ORO)
  percorsoTondo(ctx, px, by, bw, 8, 4)
  ctx.fillStyle = oro
  ctx.fill()
  percorsoTondo(ctx, px, by, bw * quota, 8, 4)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fill()
  ctx.textAlign = 'right'
  font(ctx, 14, 800)
  scritta(ctx, `+${formattaNumero(top.dopoKg - top.primaKg)} kg`, x + W - 16, by - 5, 14, ORO)
  ctx.textAlign = 'left'
  return H
}

// LO SFONDO DI FOTO: le foto pubblicate del mese (fino a sei) come stampe col
// bordino bianco, storte e accavallate su tutta la card; sopra un velo scuro
// che tiene leggibili i numeri. Ogni foto UNA volta: per ogni numero di foto
// la sua disposizione, con stampe più grandi se sono poche. Una sola: a tutta
// pagina.
// [centro x, centro y (frazioni della pagina), lato (frazione della larghezza), gradi]
const TESSERE = {
  2: [[0.4, 0.27, 1.08, -5], [0.6, 0.75, 1.08, 4]],
  3: [[0.3, 0.17, 0.9, -6], [0.74, 0.5, 0.9, 5], [0.3, 0.84, 0.9, -3]],
  4: [[0.28, 0.14, 0.78, -7], [0.78, 0.36, 0.76, 6], [0.24, 0.62, 0.78, 4], [0.76, 0.87, 0.78, -5]],
  5: [[0.28, 0.12, 0.72, -7], [0.8, 0.28, 0.68, 6], [0.24, 0.5, 0.72, 4], [0.78, 0.7, 0.7, -5], [0.3, 0.9, 0.7, -3]],
  6: [[0.28, 0.1, 0.68, -7], [0.8, 0.24, 0.64, 6], [0.22, 0.42, 0.68, 4], [0.78, 0.58, 0.66, -5], [0.3, 0.76, 0.68, -3], [0.8, 0.94, 0.64, 7]],
}
function stampa(ctx, img, cx, cy, lato, gradi) {
  const bordo = lato * 0.035
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((gradi * Math.PI) / 180)
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 16 * K
  ctx.shadowOffsetY = 5 * K
  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(-lato / 2 - bordo, -lato / 2 - bordo, lato + 2 * bordo, lato + 2 * bordo)
  ctx.shadowColor = 'transparent'
  const s = Math.max(lato / img.width, lato / img.height)
  ctx.drawImage(img, (img.width - lato / s) / 2, (img.height - lato / s) / 2, lato / s, lato / s, -lato / 2, -lato / 2, lato, lato)
  ctx.restore()
}
function sfondoDiFoto(ctx, foto) {
  if (foto.length === 1) {
    const img = foto[0]
    const s = Math.max(PW / img.width, PH / img.height)
    ctx.drawImage(img, (PW - img.width * s) / 2, (PH - img.height * s) / 2, img.width * s, img.height * s)
  } else {
    const viste = foto.slice(0, 6)
    TESSERE[viste.length].forEach(([fx, fy, fl, gradi], i) => stampa(ctx, viste[i], fx * PW, fy * PH, fl * PW, gradi))
  }
  const velo = ctx.createLinearGradient(0, 0, 0, PH)
  velo.addColorStop(0, 'rgba(8,10,14,0.8)')
  velo.addColorStop(0.35, 'rgba(8,10,14,0.76)')
  velo.addColorStop(0.7, 'rgba(8,10,14,0.8)')
  velo.addColorStop(1, 'rgba(8,10,14,0.86)')
  ctx.fillStyle = velo
  ctx.fillRect(0, 0, PW, PH)
}

// LA PILA: le polaroid delle canzoni del mese (fino a tre, la più ascoltata
// davanti), appoggiate a ventaglio in alto a destra, accanto al titolo.
// Restituisce quanto è larga e alta (0 se non c'è musica).
const PILA_W = 160
const PILA_H = 140
const POL_SCALA = 0.56
// Dove si posano: angolo in alto a sinistra e rotazione in più. Quasi
// affiancate, al più un angolo sopra l'altra: i titoli dietro si leggono.
// L'ultima disegnata (la più ascoltata, al centro e più in alto) sta sopra.
const POSATE = {
  1: [[54, 12, 0]],
  2: [[20, 26, -6], [86, 14, 5]],
  3: [[0, 40, -8], [106, 36, 7], [53, 8, -1]],
}
function pila(ctx, r, copertine, x0, y0, disegna) {
  const canzoni = r.canzoni.slice(0, 3)
  if (!canzoni.length) return { w: 0, h: 0 }
  if (!disegna) return { w: PILA_W, h: PILA_H }
  // Dalla meno ascoltata alla più ascoltata, che resta sopra.
  const posate = POSATE[canzoni.length]
  canzoni
    .map((c, i) => [c, copertine[i], posate[canzoni.length - 1 - i]])
    .reverse()
    .forEach(([c, cop, [px, py, gradi]]) => {
      ctx.save()
      ctx.translate(x0 + px, y0 + py)
      ctx.rotate((gradi * Math.PI) / 180)
      ctx.scale(POL_SCALA, POL_SCALA)
      polaroid(ctx, c.musica, cop || null, 0, 0, true)
      ctx.restore()
    })
  return { w: PILA_W, h: PILA_H }
}

/**
 * La card del mese. ⚠️ Il canvas è sincrono: corpo, copertina, foto e font
 * devono essere già caricati (useCorpoPronto, caricaImmagineDaUrl,
 * document.fonts), se no mancano e chi la mostra la ridisegna quando arrivano.
 */
export function disegnaRecapMese(r, { nome = '', avatar = null, copertine = [], corpo, foto = [] } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA_MESE
  canvas.height = ALTEZZA_MESE
  const ctx = canvas.getContext('2d')
  ctx.scale(K, K)
  sfondo(ctx, null, r.gruppi, null, false, PW, PH)
  if (foto.length) sfondoDiFoto(ctx, foto)

  // In alto: chi, piccolo, il titolo grande e accanto la pila di foto e canzone.
  const yTesta = 30
  const { w: wPila, h: hPila } = pila(ctx, r, copertine, PW - LATI - PILA_W + 6, yTesta - 8, true)
  let y = yTesta
  if (nome) {
    ctx.beginPath()
    ctx.arc(LATI + 13, y + 13, 13, 0, Math.PI * 2)
    ctx.fillStyle = '#262b36'
    ctx.fill()
    if (avatar) {
      ctx.save()
      ctx.clip()
      const s = Math.max(26 / avatar.width, 26 / avatar.height)
      ctx.drawImage(avatar, LATI + 13 - (avatar.width * s) / 2, y + 13 - (avatar.height * s) / 2, avatar.width * s, avatar.height * s)
      ctx.restore()
    } else {
      // Senza foto, l'iniziale (come l'avatar dell'app).
      font(ctx, 13, 800)
      ctx.textAlign = 'center'
      scritta(ctx, nome.replace(/^@/, '').charAt(0).toUpperCase() || '?', LATI + 13, y + 5, 13, '#fff')
      ctx.textAlign = 'left'
    }
    font(ctx, 13, 700)
    scritta(ctx, nome, LATI + 34, y + 5, 13, 'rgba(255,255,255,0.8)')
    y += 26 + 12
  }
  // Il titolo nello spazio accanto alla pila: una parola per riga se serve,
  // e se una parola sola non ci sta, il carattere scende (fino a 32).
  const [chiMese, dove] = titoloMese(r, nome)
  const wTitolo = W - (wPila ? wPila - 2 : 0)
  let px = 44
  condensato(ctx, px)
  while (px > 32 && Math.max(...`${chiMese} ${dove}`.split(' ').map((p) => ctx.measureText(p).width)) > wTitolo) {
    px -= 2
    condensato(ctx, px)
  }
  const righe = [...aCapo(ctx, chiMese, wTitolo, 3), dove]
  const lh = px * 0.95
  righe.forEach((t, i) => scritta(ctx, t, LATI, y + i * lh, px, C.bianco, 1))
  y = Math.max(y + righe.length * lh, yTesta - 8 + hPila) + STACCO

  // I pezzi, misurati prima: se non stanno fra qui e il piede, si stringe tutto.
  const FONDO = PH - 48 // sotto, la pillola di Instagram
  const mezzo = (W - 14) / 2
  const pezzi = [
    (r.volume || r.durataSec) && ((d, yy) => protagonista(ctx, r, LATI, yy, d)),
    (d, yy) => tabellone(ctx, r, LATI, yy, d),
    (d, yy) => {
      const hc = calendario(ctx, r, LATI, yy, r.gruppi.length ? mezzo : W, d)
      if (r.gruppi.length) muscolo(ctx, r, LATI + mezzo + 14, yy, mezzo, hc, corpo, d)
      return hc
    },
    r.numRecord > 0 && ((d, yy) => fasciaRecord(ctx, r, LATI, yy, d)),
  ].filter(Boolean)
  const alti = pezzi.map((p) => p(false, 0))
  const hTutto = alti.reduce((a, b) => a + b, 0) + STACCO * (pezzi.length - 1)
  const s = Math.min(1, (FONDO - y) / hTutto)
    // Stretto attorno al centro, come la card dell'allenamento: niente vuoto a destra.
  ctx.save()
  ctx.translate(PW / 2, y)
  ctx.scale(s, s)
  ctx.translate(-PW / 2, 0)
  let yy = 0
  pezzi.forEach((p, i) => {
    p(true, yy)
    yy += alti[i] + STACCO
  })
  ctx.restore()

  pillolaInstagram(ctx, PW / 2, PH - 26)
  return canvas
}

// Il piede: la pillola della nostra pagina Instagram, centrata, coi colori di
// Instagram e il suo simbolo (la fotocamera) disegnato in bianco.
const INSTAGRAM = '@progetto.palestra'
function pillolaInstagram(ctx, cx, cy) {
  font(ctx, 12.5, 800)
  const wTesto = ctx.measureText(INSTAGRAM).width
  const h = 28
  const w = 12 + 16 + 8 + wTesto + 14
  const x = cx - w / 2
  const y = cy - h / 2
  const g = ctx.createLinearGradient(x, y + h, x + w, y)
  g.addColorStop(0, '#feda75')
  g.addColorStop(0.25, '#fa7e1e')
  g.addColorStop(0.5, '#d62976')
  g.addColorStop(0.75, '#962fbf')
  g.addColorStop(1, '#4f5bd5')
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 10 * K
  ctx.shadowOffsetY = 2 * K
  percorsoTondo(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  // Il simbolo: quadrato arrotondato, l'obiettivo e il puntino del flash.
  const lx = x + 12
  const ly = cy - 8
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.7
  percorsoTondo(ctx, lx, ly, 16, 16, 4.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(lx + 8, ly + 8, 3.8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(lx + 12.3, ly + 3.7, 1.1, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  scritta(ctx, INSTAGRAM, lx + 16 + 8, cy - (12.5 * LH) / 2, 12.5, '#fff')
}
