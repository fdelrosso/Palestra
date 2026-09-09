// ---------------------------------------------------------------------------
// Disegna il recap dell'allenamento su una <canvas> 1080×1350 (formato 4:5,
// quello dei post verticali) e lo restituisce come immagine da condividere.
//
// Perché a mano su canvas e non con una libreria tipo html2canvas: l'app non ha
// dipendenze, deve funzionare offline (PWA) e su Safari iOS — un <canvas>
// disegnato a mano è l'unica strada che regge tutte e tre le cose. In cambio il
// layout va calcolato qui: si procede con un cursore verticale `y` e le sezioni
// che non ci stanno vengono accorciate (la lista esercizi si adatta allo spazio
// rimasto).
//
// La card è SEMPRE scura, anche se l'app è in tema chiaro: deve leggersi bene
// come immagine, fuori dall'app.
//
// ⚠️ Sulla card non si scrive COME si calcola un numero ("serie × ripetizioni ×
// peso", "stima su 75 kg"): è una figurina da mandare agli amici, non il
// referto di un laboratorio, e quelle righine spiegavano una formula a chi non
// l'aveva chiesta. E un numero che non si può calcolare NON diventa un
// trattino: la sua casella non viene proprio disegnata (vedi lib/recap).
// ---------------------------------------------------------------------------

import { durataLunga, dataLunga, etichettaIntensita, formattaMigliaia, mmss } from './recap'
import {
  CORPO_H,
  CUORE,
  CUORE_CENTRO,
  SAGOMA,
  TRATTI_VISTA,
  formeGruppo,
  gruppiDellaVista,
  rossoMuscolo,
} from './corpoForme'

export const LARGHEZZA = 1080
export const ALTEZZA = 1350
const P = 72 // margine

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const C = {
  bg1: '#0d0f14',
  bg2: '#1b2130',
  testo: '#f3f5f9',
  muted: '#9aa4b5',
  faint: '#6b7484',
  accent: '#ff6b35',
  verde: '#34d399',
  giallo: '#f5c542',
  rosso: '#f26d6d',
  riquadro: 'rgba(255,255,255,0.06)',
  bordo: 'rgba(255,255,255,0.10)',
}

const font = (px, peso = 400) => `${peso} ${px}px ${FONT}`

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

function riquadro(ctx, x, y, w, h, r = 24, sfondo = C.riquadro, bordo = C.bordo) {
  percorsoTondo(ctx, x, y, w, h, r)
  ctx.fillStyle = sfondo
  ctx.fill()
  if (bordo) {
    ctx.strokeStyle = bordo
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

// Taglia il testo con "…" se non ci sta nella larghezza data.
function tronca(ctx, testo, maxW) {
  const t = String(testo || '')
  if (ctx.measureText(t).width <= maxW) return t
  let s = t
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

// Manda a capo il testo, restituendo le righe (al massimo `maxRighe`).
function aCapo(ctx, testo, maxW, maxRighe) {
  const parole = String(testo || '').split(/\s+/).filter(Boolean)
  const righe = []
  let riga = ''
  for (const parola of parole) {
    const prova = riga ? `${riga} ${parola}` : parola
    if (ctx.measureText(prova).width <= maxW) {
      riga = prova
    } else {
      if (riga) righe.push(riga)
      riga = parola
      if (righe.length === maxRighe) break
    }
  }
  if (riga && righe.length < maxRighe) righe.push(riga)
  if (righe.length === maxRighe) {
    const ultima = righe[maxRighe - 1]
    const restava = parole.join(' ').length > righe.join(' ').length
    if (restava) righe[maxRighe - 1] = tronca(ctx, ultima + ' …', maxW)
  }
  return righe
}

// Sfondo: la foto scelta (ritagliata a coprire) con una velatura scura che
// tiene leggibile il testo, oppure il gradiente di default.
function sfondo(ctx, foto) {
  if (foto) {
    const scala = Math.max(LARGHEZZA / foto.width, ALTEZZA / foto.height)
    const w = foto.width * scala
    const h = foto.height * scala
    ctx.drawImage(foto, (LARGHEZZA - w) / 2, (ALTEZZA - h) / 2, w, h)
    // Velatura: più densa in alto e in basso, dove sta il testo.
    const velo = ctx.createLinearGradient(0, 0, 0, ALTEZZA)
    velo.addColorStop(0, 'rgba(8,10,14,0.86)')
    velo.addColorStop(0.45, 'rgba(8,10,14,0.72)')
    velo.addColorStop(1, 'rgba(8,10,14,0.92)')
    ctx.fillStyle = velo
    ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA)
  } else {
    const g = ctx.createLinearGradient(0, 0, LARGHEZZA, ALTEZZA)
    g.addColorStop(0, C.bg1)
    g.addColorStop(0.55, C.bg2)
    g.addColorStop(1, C.bg1)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA)
    // Alone caldo in alto a destra, per non avere un fondo piatto.
    const alone = ctx.createRadialGradient(LARGHEZZA * 0.85, 120, 0, LARGHEZZA * 0.85, 120, 620)
    alone.addColorStop(0, 'rgba(255,107,53,0.22)')
    alone.addColorStop(1, 'rgba(255,107,53,0)')
    ctx.fillStyle = alone
    ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA)
  }
}

function intestazione(ctx, y, utente, dataISO) {
  const r = 28
  ctx.beginPath()
  ctx.arc(P + r, y + r, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,107,53,0.22)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,107,53,0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = C.accent
  ctx.font = font(28, 800)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((utente || '?').trim().charAt(0).toUpperCase(), P + r, y + r + 1)

  ctx.textAlign = 'left'
  ctx.fillStyle = C.testo
  ctx.font = font(30, 700)
  ctx.fillText(tronca(ctx, utente || '', 380), P + 2 * r + 20, y + r + 1)

  ctx.textAlign = 'right'
  ctx.fillStyle = C.muted
  ctx.font = font(24, 500)
  ctx.fillText(dataLunga(dataISO), LARGHEZZA - P, y + r + 1)
  ctx.textAlign = 'left'
  return y + 2 * r + 26
}

// Riquadro-statistica: etichetta piccola, numero grande, nota sotto.
function tessera(ctx, x, y, w, h, { etichetta, valore, nota, colore }) {
  riquadro(ctx, x, y, w, h)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.faint
  ctx.font = font(21, 700)
  ctx.fillText(etichetta.toUpperCase(), x + 26, y + 44)
  ctx.fillStyle = colore || C.testo
  ctx.font = font(50, 800)
  ctx.fillText(tronca(ctx, valore, w - 52), x + 26, y + 102)
  if (nota) {
    ctx.fillStyle = C.faint
    ctx.font = font(21, 500)
    ctx.fillText(tronca(ctx, nota, w - 52), x + 26, y + 134)
  }
}

// La griglia delle tessere: due per riga, e se sono in numero dispari l'ultima
// prende tutta la larghezza. Le tessere arrivano già scremate (chi non ha il
// dato non è nell'elenco), quindi il numero cambia da un allenamento all'altro
// e la griglia si deve richiudere da sola invece di lasciare un buco.
// Un valore c'è davvero? Il trattino lo scrivevano le versioni precedenti al
// posto del dato mancante, e nei recap che gli amici si sono già mandati è
// rimasto dentro: qui vale come "non c'è".
const haValore = (v) => !!v && v !== '—'

function grigliaTessere(ctx, y, tessere) {
  if (tessere.length === 0) return y
  const gap = 24
  const wMeta = (LARGHEZZA - 2 * P - gap) / 2
  const hT = 144
  tessere.forEach((t, i) => {
    const solaSullaRiga = i === tessere.length - 1 && i % 2 === 0
    const x = i % 2 === 0 ? P : P + wMeta + gap
    const w = solaSullaRiga ? LARGHEZZA - 2 * P : wMeta
    tessera(ctx, x, y + Math.floor(i / 2) * (hT + gap), w, hT, t)
  })
  return y + Math.ceil(tessere.length / 2) * (hT + gap) + 6
}

// --- Il corpo coi muscoli allenati -----------------------------------------
// Stesse forme del corpo che si vede nella sezione Esercizi (lib/corpoForme):
// lì sono <path> di un SVG, qui diventano Path2D su canvas. Un disegno solo,
// due modi di stamparlo.
const CORPO_SPENTO = 'rgba(255,255,255,0.15)'
const CORPO_OSSA = 'rgba(255,255,255,0.11)'

function disegnaCorpo(ctx, x, y, h, vista, quote) {
  const scala = h / CORPO_H
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scala, scala)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // La sagoma: il corpo "trasparente" sotto ai muscoli.
  ctx.fillStyle = CORPO_OSSA
  ctx.strokeStyle = CORPO_OSSA
  for (const t of SAGOMA.tratti) {
    ctx.lineWidth = t.w
    ctx.stroke(new Path2D(t.d))
  }
  for (const d of SAGOMA.pieni) ctx.fill(new Path2D(d))

  // Da che parte stiamo guardando (viso o colonna).
  ctx.strokeStyle = 'rgba(255,255,255,0.24)'
  for (const t of TRATTI_VISTA[vista] || []) {
    ctx.lineWidth = t.w
    ctx.stroke(new Path2D(t.d))
  }

  // Tutta la muscolatura: rossa dove si è lavorato, spenta dove no.
  for (const id of gruppiDellaVista(vista)) {
    const forme = formeGruppo(id, vista)
    const quota = quote[id]
    const acceso = quota != null
    ctx.fillStyle = acceso ? rossoMuscolo(quota) : CORPO_SPENTO
    ctx.strokeStyle = acceso ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.09)'
    ctx.lineWidth = 0.7
    for (const d of forme.pieni) {
      const path = new Path2D(d)
      ctx.fill(path)
      ctx.stroke(path)
    }
    // I solchi della tartaruga: nel colore del fondo, come nell'app.
    if (forme.solchi) {
      ctx.strokeStyle = 'rgba(10,12,17,0.5)'
      for (const t of forme.solchi) {
        ctx.lineWidth = t.w
        ctx.stroke(new Path2D(t.d))
      }
    }
  }

  // Il cardio non è un muscolo: si accende il cuore.
  if (quote.cardio != null) {
    ctx.translate(CUORE_CENTRO.x, CUORE_CENTRO.y)
    ctx.fillStyle = rossoMuscolo(quote.cardio)
    ctx.fill(new Path2D(CUORE))
  }
  ctx.restore()
}

// Pillole colorate dei gruppi allenati, mandate a capo dentro una larghezza
// data. Restituisce l'altezza occupata.
function pilloleGruppi(ctx, x, y, maxW, lista, maxRighe = 3) {
  const h = 50
  const gap = 12
  ctx.font = font(25, 700)
  const righe = [[]]
  let usato = 0
  for (const g of lista) {
    const etichetta = `${g.label} · ${g.serie}`
    const w = Math.min(ctx.measureText(etichetta).width + 40, maxW)
    if (usato > 0 && usato + gap + w > maxW) {
      if (righe.length === maxRighe) break
      righe.push([])
      usato = 0
    }
    righe[righe.length - 1].push({ etichetta, w, colore: g.colore })
    usato += (usato ? gap : 0) + w
  }

  ctx.textBaseline = 'middle'
  righe.forEach((riga, r) => {
    let cx = x
    const cy = y + r * (h + gap)
    for (const p of riga) {
      riquadro(ctx, cx, cy, p.w, h, 25, p.colore + '2e', p.colore + '77')
      ctx.fillStyle = p.colore
      ctx.fillText(tronca(ctx, p.etichetta, p.w - 40), cx + 20, cy + h / 2 + 1)
      cx += p.w + gap
    }
  })
  ctx.textBaseline = 'alphabetic'
  return righe.length * h + (righe.length - 1) * gap
}

// La banda "dove hai lavorato": le due sagome (davanti e dietro) coi gruppi di
// oggi accesi di rosso e, di fianco, le pillole con quante serie per gruppo.
// L'intensità del rosso è la quota di serie sul gruppo più lavorato.
function bandaCorpo(ctx, y, lista, sforzo) {
  if (lista.length === 0) return y
  const hCorpo = 200
  const wCorpo = hCorpo / 2 // la sagoma è 100 × 200
  const gapCorpi = 14
  const larghezzaCorpi = wCorpo * 2 + gapCorpi

  const max = Math.max(...lista.map((g) => g.serie || 0))
  const quote = {}
  for (const g of lista) quote[g.id] = max > 0 ? (g.serie || 0) / max : 1

  disegnaCorpo(ctx, P, y, hCorpo, 'fronte', quote)
  disegnaCorpo(ctx, P + wCorpo + gapCorpi, y, hCorpo, 'dietro', quote)

  ctx.font = font(20, 600)
  ctx.fillStyle = C.faint
  ctx.textAlign = 'center'
  ctx.fillText('DAVANTI', P + wCorpo / 2, y + hCorpo + 26)
  ctx.fillText('DIETRO', P + wCorpo + gapCorpi + wCorpo / 2, y + hCorpo + 26)
  ctx.textAlign = 'left'

  // A destra: chi hai allenato e con che sforzo. Stanno di fianco alle sagome
  // e non sotto perché la card ha più larghezza che altezza da spendere, e in
  // fondo devono restarci i record, il commento e la lista degli esercizi.
  const xDx = P + larghezzaCorpi + 30
  const wDx = LARGHEZZA - P - xDx
  ctx.fillStyle = C.faint
  ctx.font = font(21, 700)
  ctx.fillText('MUSCOLI ALLENATI', xDx, y + 24)
  const hPillole = pilloleGruppi(ctx, xDx, y + 44, wDx, lista)
  const hSforzo = barraSforzo(ctx, xDx, y + 44 + hPillole + 28, wDx, sforzo)

  const hDestra = 44 + hPillole + (hSforzo ? 28 + hSforzo : 0)
  return y + Math.max(hCorpo + 36, hDestra) + 18
}

// Riga di contorno sotto le tessere: esercizi · serie · battito · n° del mese.
// I pezzi si disegnano uno a uno perché il battito va in rosso; se la riga non
// ci sta si accorcia l'ultima voce (quella meno importante).
function rigaContorno(ctx, y, stat) {
  const bpm = stat.fcMedia ? `♥ ${stat.fcMedia} bpm${stat.fcMax ? ` · max ${stat.fcMax}` : ''}` : null
  const componi = (meseLungo) =>
    [
      stat.numEsercizi > 0 ? { t: `${stat.numEsercizi} esercizi` } : null,
      stat.serieFatte > 0 ? { t: `${stat.serieFatte} serie` } : null,
      bpm ? { t: bpm, c: C.rosso } : null,
      stat.nelMese
        ? { t: meseLungo ? `${stat.nelMese}° allenamento del mese` : `${stat.nelMese}° del mese` }
        : null,
    ].filter(Boolean)

  ctx.font = font(25, 600)
  const sep = '  ·  '
  const wSep = ctx.measureText(sep).width
  const larghezza = (parti) =>
    parti.reduce((tot, p, i) => tot + ctx.measureText(p.t).width + (i ? wSep : 0), 0)

  let parti = componi(true)
  if (parti.length === 0) return y
  if (larghezza(parti) > LARGHEZZA - 2 * P) parti = componi(false)

  let x = P
  parti.forEach((p, i) => {
    if (i) {
      ctx.fillStyle = C.faint
      ctx.fillText(sep, x, y)
      x += wSep
    }
    ctx.fillStyle = p.c || C.muted
    ctx.fillText(p.t, x, y)
    x += ctx.measureText(p.t).width
  })
  return y + 34
}

// Barra dello sforzo: quante serie facili / medie / dure. Restituisce
// l'altezza occupata (0 se non c'è niente da dire).
function barraSforzo(ctx, x, y, w, sforzo) {
  if (!sforzo.tot) return 0
  const h = 18
  const parti = [
    { n: sforzo.verde, c: C.verde },
    { n: sforzo.giallo, c: C.giallo },
    { n: sforzo.rosso, c: C.rosso },
  ]
  percorsoTondo(ctx, x, y, w, h, h / 2)
  ctx.save()
  ctx.clip()
  let cx = x
  for (const p of parti) {
    const larg = (p.n / sforzo.tot) * w
    ctx.fillStyle = p.c
    ctx.fillRect(cx, y, larg, h)
    cx += larg
  }
  ctx.restore()

  ctx.font = font(23, 600)
  ctx.fillStyle = C.muted
  const voci = []
  if (sforzo.verde) voci.push(`${sforzo.verde} facili`)
  if (sforzo.giallo) voci.push(`${sforzo.giallo} medie`)
  if (sforzo.rosso) voci.push(`${sforzo.rosso} dure`)
  ctx.fillText(tronca(ctx, voci.join('  ·  '), w), x, y + h + 30)
  return h + 48
}

/**
 * Disegna il recap su una canvas nuova.
 * @param {{
 *   riep: object, stat: object, utente?: string, commento?: string,
 *   foto?: HTMLImageElement|null,
 * }} opts
 * @returns {HTMLCanvasElement}
 */
export function disegnaRecap({ riep, stat, utente = '', commento = '', foto = null }) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA
  canvas.height = ALTEZZA
  const ctx = canvas.getContext('2d')

  sfondo(ctx, foto)

  let y = P
  y = intestazione(ctx, y, utente, riep?.data)

  // Titolo dell'allenamento.
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.testo
  ctx.font = font(66, 800)
  y += 60
  ctx.fillText(tronca(ctx, riep?.nomeGiorno || 'Allenamento', LARGHEZZA - 2 * P), P, y)

  ctx.fillStyle = C.muted
  ctx.font = font(26, 500)
  const sottotitolo = [
    riep?.nomeScheda,
    riep?.settimana != null ? `Settimana ${riep.settimana}` : null,
    // Senza nemmeno una serie segnata l'intensità non è misurata, è un default:
    // meglio non dirla che dire "Impegnativo" a caso.
    stat.sforzo.tot > 0 ? etichettaIntensita(stat.intensita) : null,
  ]
    .filter(Boolean)
    .join('  ·  ')
  y += 40
  ctx.fillText(tronca(ctx, sottotitolo, LARGHEZZA - 2 * P), P, y)
  y += 34

  // I numeri che raccontano l'allenamento. Ci finisce SOLO quello che si sa:
  // niente peso corporeo → niente calorie, niente carichi scritti → niente
  // volume né peso massimo. Le caselle rimaste si richiudono da sole.
  const tessere = []
  if (stat.durataSec > 0) {
    tessere.push({
      etichetta: 'Durata',
      valore: durataLunga(stat.durataSec),
      nota: stat.secPerSerie ? `~${mmss(stat.secPerSerie)} a serie` : '',
    })
  }
  if (haValore(stat.volumeTesto)) {
    tessere.push({ etichetta: 'Volume sollevato', valore: stat.volumeTesto, colore: C.accent })
  }
  if (haValore(stat.pesoMaxTesto)) {
    tessere.push({
      etichetta: 'Peso massimo',
      valore: stat.pesoMaxTesto,
      nota: stat.pesoMax.esercizio,
    })
  }
  // Se l'utente ha copiato le calorie dall'orologio, quelle sono un dato vero:
  // la tessera cambia etichetta e non parla più di stima.
  if (stat.calorie != null) {
    tessere.push({
      etichetta: stat.calorieMisurate ? 'Calorie bruciate' : 'Calorie stimate',
      valore: `${formattaMigliaia(stat.calorie)} kcal`,
    })
  }
  y = grigliaTessere(ctx, y, tessere)

  // Riga di contorno: quanto hai fatto, il battito (se l'hai inserito) e a che
  // punto del mese sei. Il battito è in rosso, così si stacca dal resto.
  y = rigaContorno(ctx, y, stat)

  y = bandaCorpo(ctx, y, stat.gruppi, stat.sforzo)

  // --- Da qui in giù lo spazio è quello che resta. Commento e firma sono
  // ancorati in basso e si prenotano il loro posto PRIMA che si disegni
  // qualcos'altro: `fondo` è la riga oltre la quale non si scrive più.
  // Senza questo conto, con due record e un commento lungo il commento
  // finiva stampato sopra al secondo record.
  ctx.font = font(27, 500)
  const righeCommento = commento ? aCapo(ctx, commento, LARGHEZZA - 2 * P - 40, 3) : []
  const hCommento = righeCommento.length ? righeCommento.length * 38 + 44 : 0
  const hFirma = 46
  const fondo = ALTEZZA - P - hFirma - hCommento

  // Record personali: il pezzo forte, se c'è (e se ci sta).
  for (const r of stat.record.slice(0, 2)) {
    if (y + 58 > fondo) break
    riquadro(ctx, P, y, LARGHEZZA - 2 * P, 58, 18, 'rgba(52,211,153,0.14)', 'rgba(52,211,153,0.4)')
    ctx.textBaseline = 'middle'
    ctx.font = font(27, 700)
    ctx.fillStyle = C.verde
    ctx.fillText('🏆', P + 22, y + 30)
    ctx.fillText(
      tronca(ctx, `Record · ${r.esercizio} ${r.carico}`, LARGHEZZA - 2 * P - 110),
      P + 66,
      y + 30,
    )
    ctx.textBaseline = 'alphabetic'
    y += 68
  }

  const disponibile = fondo - y

  const hTitoloLista = 40
  const spazioLista = disponibile - hTitoloLista
  // Con pochi esercizi una colonna larga sta meglio; da 5 in su si passa a due
  // colonne, che è l'unico modo di farceli stare tutti senza rubare spazio ai
  // record e al commento (che sono il cuore della card).
  const colonne = stat.esercizi.length > 4 ? 2 : 1
  const hRiga = colonne === 2 ? 40 : 46
  const wCol = (LARGHEZZA - 2 * P - (colonne - 1) * 24) / colonne
  const righeDisponibili = Math.max(0, Math.floor(spazioLista / hRiga))
  const mostrati = Math.min(stat.esercizi.length, righeDisponibili * colonne)

  if (mostrati > 0) {
    ctx.fillStyle = C.faint
    ctx.font = font(21, 700)
    ctx.fillText('ESERCIZI', P, y + 22)
    y += hTitoloLista

    const fNome = colonne === 2 ? 23 : 27
    const fSchema = colonne === 2 ? 21 : 25
    const righeUsate = Math.ceil(mostrati / colonne)

    stat.esercizi.slice(0, mostrati).forEach((e, i) => {
      const col = i % colonne
      const riga = Math.floor(i / colonne)
      const x = P + col * (wCol + 24)
      const base = y + riga * hRiga + hRiga - 16

      const destra = [
        e.serie ? `${e.serie}×${e.schema?.ripetizioni || '—'}` : null,
        e.schema?.carico || null,
      ]
        .filter(Boolean)
        .join('  ·  ')

      ctx.textAlign = 'right'
      ctx.fillStyle = C.muted
      ctx.font = font(fSchema, 600)
      const wDestra = ctx.measureText(destra).width
      ctx.fillText(destra, x + wCol, base)

      ctx.textAlign = 'left'
      ctx.fillStyle = C.testo
      ctx.font = font(fNome, 600)
      const nome = tronca(ctx, e.nome, wCol - wDestra - 24)
      ctx.fillText(nome, x, base)

      // Su una colonna c'è spazio per i pallini di com'è andata ogni serie:
      // sono il cuore dell'app, e riempiono una riga altrimenti spoglia.
      if (colonne === 1) {
        const xPallini = x + ctx.measureText(nome).width + 18
        const d = 13
        const passo = d + 7
        if (xPallini + (e.colori.colori || []).length * passo < x + wCol - wDestra - 16) {
          ;(e.colori.colori || []).forEach((c, k) => {
            ctx.beginPath()
            ctx.arc(xPallini + k * passo + d / 2, base - 7, d / 2, 0, Math.PI * 2)
            ctx.fillStyle = c ? C[c] || C.faint : 'rgba(255,255,255,0.14)'
            ctx.fill()
          })
        }
      }
    })

    // Righine di separazione, una per riga della griglia: tengono la lista
    // ordinata senza appesantirla.
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 2
    for (let r = 0; r < righeUsate; r++) {
      const yr = y + r * hRiga + hRiga - 4
      ctx.beginPath()
      ctx.moveTo(P, yr)
      ctx.lineTo(LARGHEZZA - P, yr)
      ctx.stroke()
    }
    y += righeUsate * hRiga

    const restanti = stat.esercizi.length - mostrati
    if (restanti > 0) {
      ctx.fillStyle = C.faint
      ctx.font = font(23, 600)
      ctx.fillText(`+ altri ${restanti}`, P, y + 22)
    }
  }

  // Commento dell'utente, ancorato in basso.
  if (righeCommento.length) {
    const yC = ALTEZZA - P - hFirma - hCommento + 10
    ctx.strokeStyle = C.accent
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(P, yC - 4)
    ctx.lineTo(P, yC + righeCommento.length * 38 - 4)
    ctx.stroke()
    ctx.fillStyle = C.testo
    ctx.font = font(27, 500)
    righeCommento.forEach((r, i) => ctx.fillText(r, P + 22, yC + 24 + i * 38))
  }

  // Firma discreta.
  ctx.fillStyle = C.faint
  ctx.font = font(22, 600)
  ctx.fillText('Palestra', P, ALTEZZA - P + 8)
  ctx.textAlign = 'right'
  const firma = [
    stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null,
    stat.durataSec > 0 ? durataLunga(stat.durataSec) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  if (firma) ctx.fillText(firma, LARGHEZZA - P, ALTEZZA - P + 8)
  ctx.textAlign = 'left'

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

// La canvas come Blob PNG (per condivisione/salvataggio).
export function canvasInBlob(canvas) {
  return new Promise((risolvi) => canvas.toBlob((b) => risolvi(b), 'image/png'))
}
