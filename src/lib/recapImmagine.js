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
import { normalizzaLayout } from './recapLayout'
import { fasiDi, formatCarico, formatSerieRip, formattaRip, haFasi } from './schema'
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
  accent: '#5cc8f5',
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
    // Alone azzurro in alto a destra, per non avere un fondo piatto.
    const alone = ctx.createRadialGradient(LARGHEZZA * 0.85, 120, 0, LARGHEZZA * 0.85, 120, 620)
    alone.addColorStop(0, 'rgba(92,200,245,0.22)')
    alone.addColorStop(1, 'rgba(92,200,245,0)')
    ctx.fillStyle = alone
    ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA)
  }
}

// In cima solo la data. ⚠️ Il nome (e l'iniziale nel cerchio) non c'è più
// (2026-09-18): la card la manda chi l'ha fatta, e il nome sopra non serviva.
function intestazione(ctx, y, dataISO) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = C.muted
  ctx.font = font(26, 600)
  ctx.fillText(dataLunga(dataISO), P, y + 20)
  return y + 46
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
function pilloleGruppi(ctx, x, y, maxW, lista, maxRighe = 3, disegna = true) {
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

  const hTot = righe.length * h + (righe.length - 1) * gap
  if (!disegna) return hTot
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
  return hTot
}

// La banda "dove hai lavorato": le due sagome (davanti e dietro) coi gruppi di
// oggi accesi di rosso e, di fianco, le pillole con quante serie per gruppo.
// L'intensità del rosso è la quota di serie sul gruppo più lavorato.
// Con `sforzo` la barra facili/medie/dure sta sotto le pillole; senza, è un
// blocco a sé (o è spenta).
const H_CORPO = 200
const X_DX_CORPO = P + (H_CORPO / 2) * 2 + 14 + 30

function altezzaCorpo(ctx, lista, sforzo) {
  const hPillole = pilloleGruppi(ctx, X_DX_CORPO, 0, LARGHEZZA - P - X_DX_CORPO, lista, 3, false)
  const hSforzo = sforzo?.tot ? 66 : 0
  const hDestra = 44 + hPillole + (hSforzo ? 28 + hSforzo : 0)
  return Math.max(H_CORPO + 36, hDestra) + 18
}

function bandaCorpo(ctx, y, lista, sforzo) {
  const hCorpo = H_CORPO
  const wCorpo = hCorpo / 2 // la sagoma è 100 × 200
  const gapCorpi = 14

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
  // e non sotto perché la card ha più larghezza che altezza da spendere.
  const xDx = X_DX_CORPO
  const wDx = LARGHEZZA - P - xDx
  ctx.fillStyle = C.faint
  ctx.font = font(21, 700)
  ctx.fillText('MUSCOLI ALLENATI', xDx, y + 24)
  const hPillole = pilloleGruppi(ctx, xDx, y + 44, wDx, lista)
  if (sforzo) barraSforzo(ctx, xDx, y + 44 + hPillole + 28, wDx, sforzo)
}

// Riga di contorno: esercizi · serie · battito (se inserito). I pezzi si
// disegnano uno a uno perché il battito va in rosso. `y` è la linea di base.
// ⚠️ Il "N° allenamento del mese" non c'è più (2026-09-18): l'utente non lo vuole.
function rigaContorno(ctx, y, parti) {
  ctx.font = font(25, 600)
  const sep = '  ·  '
  const wSep = ctx.measureText(sep).width
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

// Un record personale: la riga verde col trofeo.
function rigaRecord(ctx, y, r) {
  riquadro(ctx, P, y, LARGHEZZA - 2 * P, 58, 18, 'rgba(52,211,153,0.14)', 'rgba(52,211,153,0.4)')
  ctx.textBaseline = 'middle'
  ctx.font = font(27, 700)
  ctx.fillStyle = C.verde
  ctx.fillText('🏆', P + 22, y + 30)
  ctx.fillText(tronca(ctx, `Record · ${r.esercizio} ${r.carico}`, LARGHEZZA - 2 * P - 110), P + 66, y + 30)
  ctx.textBaseline = 'alphabetic'
}

// La lista degli esercizi, dentro lo spazio [y, fondo]: ne mostra quanti ci
// stanno, e "+ altri N" per gli altri.
function listaEsercizi(ctx, y, fondo, esercizi, { pallini, schema }) {
  const hTitoloLista = 40
  const hAltri = 30
  // Con pochi esercizi una colonna larga sta meglio; da 5 in su si passa a due
  // colonne, che è l'unico modo di farceli stare tutti senza rubare spazio ai
  // record e al commento (che sono il cuore della card).
  const colonne = esercizi.length > 4 ? 2 : 1
  const hRiga = colonne === 2 ? 40 : 46
  const wCol = (LARGHEZZA - 2 * P - (colonne - 1) * 24) / colonne
  const righeTutte = Math.ceil(esercizi.length / colonne)
  let righeDisponibili = Math.max(0, Math.floor((fondo - y - hTitoloLista) / hRiga))
  // Se non ci stanno tutti, una riga la prende "+ altri N".
  if (righeDisponibili < righeTutte) {
    righeDisponibili = Math.max(0, Math.floor((fondo - y - hTitoloLista - hAltri) / hRiga))
  }
  const mostrati = Math.min(esercizi.length, righeDisponibili * colonne)
  if (mostrati === 0) return

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.faint
  ctx.font = font(21, 700)
  ctx.fillText('ESERCIZI', P, y + 22)
  y += hTitoloLista

  const fNome = colonne === 2 ? 23 : 27
  const fSchema = colonne === 2 ? 21 : 25
  const righeUsate = Math.ceil(mostrati / colonne)

  esercizi.slice(0, mostrati).forEach((e, i) => {
    const col = i % colonne
    const riga = Math.floor(i / colonne)
    const x = P + col * (wCol + 24)
    const base = y + riga * hRiga + hRiga - 16

    // Con le fasi si scrive il piano, "3×5 + 2×2 · 80kg + 90kg"; senza, le
    // serie FATTE per le ripetizioni previste.
    const aFasi = haFasi(e.schema)
    const f0 = fasiDi(e.schema)[0]
    const destra = schema
      ? [
          aFasi ? formatSerieRip(e.schema) : e.serie ? `${e.serie}×${formattaRip(f0?.rip, f0?.perLato) || '—'}` : null,
          formatCarico(e.schema) || null,
        ]
          .filter(Boolean)
          .join('  ·  ')
      : ''

    ctx.textAlign = 'right'
    ctx.fillStyle = C.muted
    ctx.font = font(fSchema, 600)
    const wDestra = destra ? ctx.measureText(destra).width : 0
    if (destra) ctx.fillText(destra, x + wCol, base)

    ctx.textAlign = 'left'
    ctx.fillStyle = C.testo
    ctx.font = font(fNome, 600)
    const nome = tronca(ctx, e.nome, wCol - wDestra - 24)
    ctx.fillText(nome, x, base)

    // Su una colonna c'è spazio per i pallini di com'è andata ogni serie:
    // sono il cuore dell'app, e riempiono una riga altrimenti spoglia.
    if (pallini && colonne === 1) {
      const colori = e.colori?.colori || []
      const xPallini = x + ctx.measureText(nome).width + 18
      const d = 13
      const passo = d + 7
      if (xPallini + colori.length * passo < x + wCol - wDestra - 16) {
        colori.forEach((c, k) => {
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

  const restanti = esercizi.length - mostrati
  if (restanti > 0) {
    ctx.fillStyle = C.faint
    ctx.font = font(23, 600)
    ctx.fillText(`+ altri ${restanti}`, P, y + 22)
  }
}

// I pezzi della card, nell'ordine del layout, già scremati di quello che è
// spento o non ha un dato. Blocchi vicini dello stesso tipo si fondono: le
// tessere in una griglia, esercizi-serie-battito in una riga, e lo sforzo
// subito dopo i muscoli va sotto le loro pillole (è la card di sempre).
// `{ tipo: 'perno' }` segna dov'è la lista esercizi, anche se è spenta: quello
// che viene dopo si appoggia in fondo alla card.
function pezziCard(ctx, { riep, stat, commento, layout }) {
  const L = normalizzaLayout(layout)
  const on = (id) => !L.nascosti.includes(id)
  const pezzi = []
  const ultimo = () => pezzi[pezzi.length - 1]
  const tessera = (t) => {
    if (ultimo()?.tipo === 'griglia') ultimo().tessere.push(t)
    else pezzi.push({ tipo: 'griglia', tessere: [t] })
  }
  const contorno = (parte) => {
    if (ultimo()?.tipo === 'contorno') ultimo().parti.push(parte)
    else pezzi.push({ tipo: 'contorno', parti: [parte] })
  }

  for (const id of L.ordine) {
    if (id === 'esercizi') pezzi.push({ tipo: 'perno' })
    if (!on(id)) continue
    switch (id) {
      case 'data':
        if (riep?.data) pezzi.push({ tipo: 'data' })
        break
      case 'titolo':
        pezzi.push({ tipo: 'titolo' })
        break
      case 'sottotitolo': {
        const testo = [
          riep?.nomeScheda,
          riep?.settimana != null ? `Settimana ${riep.settimana}` : null,
          // Senza nemmeno una serie segnata l'intensità non è misurata, è un
          // default: meglio non dirla che dire "Impegnativo" a caso.
          stat.sforzo.tot > 0 ? etichettaIntensita(stat.intensita) : null,
        ]
          .filter(Boolean)
          .join('  ·  ')
        if (testo) pezzi.push({ tipo: 'sottotitolo', testo })
        break
      }
      // I numeri che raccontano l'allenamento. Ci finisce SOLO quello che si
      // sa: calorie solo se inserite, niente carichi scritti → niente volume
      // né peso massimo. Le caselle rimaste si richiudono da sole.
      case 'durata':
        if (stat.durataSec > 0) {
          tessera({
            etichetta: 'Durata',
            valore: durataLunga(stat.durataSec),
            nota: stat.secPerSerie ? `~${mmss(stat.secPerSerie)} a serie` : '',
          })
        }
        break
      case 'volume':
        if (haValore(stat.volumeTesto)) {
          tessera({ etichetta: 'Volume sollevato', valore: stat.volumeTesto, colore: C.accent })
        }
        break
      case 'pesoMax':
        if (haValore(stat.pesoMaxTesto)) {
          tessera({ etichetta: 'Peso massimo', valore: stat.pesoMaxTesto, nota: stat.pesoMax.esercizio })
        }
        break
      // Le calorie solo se l'utente le ha scritte. ⚠️ `calorieMisurate` e non
      // solo `calorie != null`: i recap mandati agli amici prima del
      // 2026-09-18 portano nel pacchetto anche la STIMA, e nemmeno quella deve
      // comparire.
      case 'calorie':
        if (stat.calorie != null && stat.calorieMisurate) {
          tessera({ etichetta: 'Calorie bruciate', valore: `${formattaMigliaia(stat.calorie)} kcal` })
        }
        break
      case 'conteggi':
        if (stat.numEsercizi > 0) contorno({ t: `${stat.numEsercizi} esercizi` })
        if (stat.serieFatte > 0) contorno({ t: `${stat.serieFatte} serie` })
        break
      // Il battito è in rosso, così si stacca dal resto.
      case 'battito':
        if (stat.fcMedia) {
          contorno({ t: `♥ ${stat.fcMedia} bpm${stat.fcMax ? ` · max ${stat.fcMax}` : ''}`, c: C.rosso })
        }
        break
      case 'corpo':
        if (stat.gruppi.length) pezzi.push({ tipo: 'corpo', sforzo: null })
        break
      case 'sforzo':
        if (!stat.sforzo.tot) break
        if (ultimo()?.tipo === 'corpo' && !ultimo().sforzo) ultimo().sforzo = stat.sforzo
        else pezzi.push({ tipo: 'sforzo' })
        break
      case 'record':
        if (stat.record.length) pezzi.push({ tipo: 'record', record: stat.record.slice(0, 2) })
        break
      case 'esercizi':
        if (stat.esercizi.length) ultimo().esercizi = true
        break
      case 'commento': {
        // Uno spazio o un a capo non sono un commento: senza testo vero, niente blocco.
        const testo = String(commento || '').trim()
        ctx.font = font(27, 500)
        const righe = testo ? aCapo(ctx, testo, LARGHEZZA - 2 * P - 40, 3) : []
        if (righe.length) pezzi.push({ tipo: 'commento', righe })
        break
      }
    }
  }

  // Le altezze, ora che i pezzi sono fusi. ⚠️ La riga di contorno scrive sulla
  // sua linea di base: subito dopo una griglia (che lascia già il suo spazio)
  // parte da lì, altrimenti scende di un po'.
  pezzi.forEach((p, i) => {
    const prima = pezzi[i - 1]
    if (p.tipo === 'data') p.h = 46
    else if (p.tipo === 'titolo') p.h = 80
    else if (p.tipo === 'sottotitolo') p.h = 54
    else if (p.tipo === 'griglia') p.h = Math.ceil(p.tessere.length / 2) * 168 + 6
    else if (p.tipo === 'contorno') {
      p.su = prima?.tipo === 'griglia' ? 0 : 26
      p.h = p.su + 34
    } else if (p.tipo === 'corpo') p.h = altezzaCorpo(ctx, stat.gruppi, p.sforzo)
    else if (p.tipo === 'sforzo') p.h = 44 + 66 + 12
    else if (p.tipo === 'record') p.h = p.record.length * 68
    else if (p.tipo === 'commento') p.h = p.righe.length * 38 + 44
    else p.h = 0
  })
  return pezzi
}

function disegnaPezzo(ctx, p, y, { riep, stat }) {
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  switch (p.tipo) {
    case 'data':
      intestazione(ctx, y, riep?.data)
      break
    case 'titolo':
      ctx.fillStyle = C.testo
      ctx.font = font(66, 800)
      ctx.fillText(tronca(ctx, riep?.nomeGiorno || 'Allenamento', LARGHEZZA - 2 * P), P, y + 60)
      break
    case 'sottotitolo':
      ctx.fillStyle = C.muted
      ctx.font = font(26, 500)
      ctx.fillText(tronca(ctx, p.testo, LARGHEZZA - 2 * P), P, y + 20)
      break
    case 'griglia':
      grigliaTessere(ctx, y, p.tessere)
      break
    case 'contorno':
      rigaContorno(ctx, y + p.su, p.parti)
      break
    case 'corpo':
      bandaCorpo(ctx, y, stat.gruppi, p.sforzo)
      break
    case 'sforzo':
      ctx.fillStyle = C.faint
      ctx.font = font(21, 700)
      ctx.fillText('SFORZO', P, y + 24)
      barraSforzo(ctx, P, y + 44, LARGHEZZA - 2 * P, stat.sforzo)
      break
    case 'record':
      p.record.forEach((r, i) => rigaRecord(ctx, y + i * 68, r))
      break
    case 'commento': {
      const yC = y + 10
      ctx.strokeStyle = C.accent
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(P, yC - 4)
      ctx.lineTo(P, yC + p.righe.length * 38 - 4)
      ctx.stroke()
      ctx.fillStyle = C.testo
      ctx.font = font(27, 500)
      p.righe.forEach((r, i) => ctx.fillText(r, P + 22, yC + 24 + i * 38))
      break
    }
  }
}

/**
 * Disegna il recap su una canvas nuova.
 * @param {{
 *   riep: object, stat: object, commento?: string, foto?: HTMLImageElement|null,
 *   layout?: object,
 * }} opts  `riep.nomeGiorno` è il titolo (che l'utente può cambiare nel riepilogo).
 *   `layout` (lib/recapLayout) dice quali blocchi e in che ordine; se manca vale
 *   quello salvato sull'allenamento (`riep.recap`), e se manca anche quello la
 *   card di sempre.
 *   ⚠️ Commento, calorie e battito sono FACOLTATIVI: se non ci sono, sulla card
 *   non compare niente al loro posto — nemmeno lo spazio.
 * @returns {HTMLCanvasElement}
 */
export function disegnaRecap({ riep, stat, commento = '', foto = null, layout = riep?.recap }) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA
  canvas.height = ALTEZZA
  const ctx = canvas.getContext('2d')

  sfondo(ctx, foto)

  const L = normalizzaLayout(layout)
  const firma = !L.nascosti.includes('firma')
  const pezzi = pezziCard(ctx, { riep, stat, commento, layout: L })

  // Lo spazio si divide così: quello che sta PRIMA della lista esercizi parte
  // dall'alto, quello che sta DOPO si appoggia in fondo (sopra la firma), e la
  // lista prende quello che resta in mezzo. Con l'ordine di sempre è la card
  // di sempre: il commento in basso, gli esercizi quanti ci stanno.
  // ⚠️ Il fondo si prenota PRIMA di disegnare il resto: senza questo conto, con
  // due record e un commento lungo il commento finiva sopra al secondo record.
  const k = pezzi.findIndex((p) => p.tipo === 'perno')
  const sopra = pezzi.slice(0, k)
  const sotto = pezzi.slice(k + 1)
  const esercizi = pezzi[k]?.esercizi
  const limite = ALTEZZA - P - (firma ? 46 : 0)

  // In fondo: se tutto insieme è troppo (più di metà card), si lasciano fuori
  // i primi, così resta almeno lo spazio per quello che sta in alto.
  let hSotto = sotto.reduce((a, p) => a + p.h, 0)
  while (sotto.length && hSotto > (ALTEZZA - 2 * P) / 2) hSotto -= sotto.shift().h
  const fondo = limite - hSotto

  let y = P
  for (const p of sopra) {
    // I record si accorciano (uno invece di due) prima di sparire.
    if (p.tipo === 'record' && y + p.h > fondo && p.record.length > 1 && y + 68 <= fondo) {
      p.record = p.record.slice(0, 1)
      p.h = 68
    }
    if (y + p.h > fondo) continue // non ci sta: meglio fuori che sopra a qualcos'altro
    disegnaPezzo(ctx, p, y, { riep, stat })
    y += p.h
  }

  if (esercizi) {
    listaEsercizi(ctx, y, fondo, stat.esercizi, {
      pallini: !L.nascosti.includes('pallini'),
      schema: !L.nascosti.includes('schemaEsercizi'),
    })
  }

  let yS = fondo
  for (const p of sotto) {
    disegnaPezzo(ctx, p, yS, { riep, stat })
    yS += p.h
  }

  // Firma discreta.
  if (firma) {
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = C.faint
    ctx.font = font(22, 600)
    ctx.fillText('ProgettoPalestra1.0', P, ALTEZZA - P + 8)
    ctx.textAlign = 'right'
    const destra = [
      stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null,
      stat.durataSec > 0 ? durataLunga(stat.durataSec) : null,
    ]
      .filter(Boolean)
      .join(' · ')
    if (destra) ctx.fillText(destra, LARGHEZZA - P, ALTEZZA - P + 8)
    ctx.textAlign = 'left'
  }

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
