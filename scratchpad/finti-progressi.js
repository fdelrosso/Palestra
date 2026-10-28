// ---------------------------------------------------------------------------
// Check e video (lib/progressi) senza database, per scratchpad/prova-pt.
// Righe e commenti in memoria: cambiando persona restano, ricaricando si
// perdono. Le immagini sono disegnate al volo; il "video" non ha un file.
// ---------------------------------------------------------------------------
export {
  CATEGORIA,
  VISIBILITA_FOTO,
  VISIBILITA_FOTO_DEFAULT,
  categoriaDi,
  giornoLungo,
  oggiIso,
  percorsoProgresso,
  perGiorno,
} from '../src/lib/progressi.js'

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
const io = () => window.__io

function disegno(testo, colore) {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 300
  const g = c.getContext('2d')
  g.fillStyle = colore
  g.fillRect(0, 0, 300, 300)
  g.fillStyle = '#fff'
  g.font = 'bold 28px sans-serif'
  g.fillText(testo, 20, 160)
  return c.toDataURL()
}

let righe = [
  { id: 'p1', atleta_id: 'mario', caricato_da: 'mario', tipo: 'foto', data: '2026-10-20', nota: '78,4 kg', visibilita: 'pt', categoria: 'check', esercizio: '', colore: '#355' },
  { id: 'p2', atleta_id: 'mario', caricato_da: 'mario', tipo: 'foto', data: '2026-10-20', nota: '', visibilita: 'privata', categoria: 'check', esercizio: '', colore: '#533' },
  { id: 'e1', atleta_id: 'mario', caricato_da: 'mario', tipo: 'foto', data: '2026-10-27', nota: '100 kg, guarda la discesa', visibilita: 'pt', categoria: 'esecuzione', esercizio: 'Squat bilanciere', colore: '#335' },
  { id: 'e2', atleta_id: 'mario', caricato_da: 'mario', tipo: 'video', data: '2026-10-26', nota: '', visibilita: 'privata', categoria: 'esecuzione', esercizio: 'Panca piana', colore: '#353' },
]
let commenti = [
  { id: 'c1', progresso_id: 'e1', autore_id: 'mario', testo: 'Mi sembra di cedere con le ginocchia in salita', creato_il: new Date(Date.now() - 3600e3 * 5).toISOString() },
  { id: 'c2', progresso_id: 'e1', autore_id: 'pt', testo: 'Sì: spingi le ginocchia in fuori e scendi più lento. Prova 80 kg.', creato_il: new Date(Date.now() - 3600e3 * 2).toISOString() },
]
const daRiga = (c) => ({ id: c.id, progressoId: c.progresso_id, autoreId: c.autore_id, testo: c.testo, creatoIl: c.creato_il })

// Come la policy: l'atleta vede tutto il suo, il PT solo ciò che è aperto.
const vedo = (r) => r.atleta_id === io() || (r.visibilita === 'pt' && io() === 'pt')

export function progressiSoloLocali() {
  return []
}
export async function progressiDi(atletaId) {
  await pausa(120)
  return { righe: righe.filter((r) => r.atleta_id === atletaId && vedo(r)), errore: '', diRete: false }
}
export async function conteggioProgressi(ids) {
  const conti = {}
  for (const r of righe) if (ids.includes(r.atleta_id) && vedo(r)) conti[r.atleta_id] = (conti[r.atleta_id] || 0) + 1
  return conti
}
export async function fonteProgresso(riga) {
  const r = righe.find((x) => x.id === riga.id)
  if (!r || r.tipo === 'video') return { url: null, revoca: () => {} }
  return { url: disegno(r.esercizio || r.nota || 'check', r.colore || '#444'), revoca: () => {} }
}
export async function salvaProgresso({ atletaId, caricatoDa, tipo = 'foto', data, nota = '', categoria = 'check', esercizio = '' }) {
  await pausa(150)
  const riga = {
    id: 'n' + Date.now(), atleta_id: atletaId, caricato_da: caricatoDa, tipo, data, nota, categoria, esercizio,
    visibilita: caricatoDa !== atletaId ? 'pt' : 'privata', colore: '#446',
  }
  righe = [riga, ...righe]
  return { ok: true, riga, soloLocale: false, errore: '' }
}
export async function aggiornaVisibilitaProgresso(id, visibilita) {
  await pausa(100)
  righe = righe.map((r) => (r.id === id ? { ...r, visibilita } : r))
  return { ok: true, errore: '' }
}
export async function eliminaProgresso(riga) {
  righe = righe.filter((r) => r.id !== riga.id)
  return { ok: true, errore: '' }
}
export async function riprovaProgressiInSospeso() {
  return 0
}
export async function commentiDi(id) {
  await pausa(100)
  return { ok: true, righe: commenti.filter((c) => c.progresso_id === id).map(daRiga), errore: '' }
}
export async function conteggioCommenti(ids) {
  const conti = {}
  for (const c of commenti) if (ids.includes(c.progresso_id)) conti[c.progresso_id] = (conti[c.progresso_id] || 0) + 1
  return conti
}
export async function aggiungiCommento(id, testo) {
  await pausa(100)
  const c = { id: 'c' + Date.now(), progresso_id: id, autore_id: io(), testo: testo.trim(), creato_il: new Date().toISOString() }
  commenti = [...commenti, c]
  return { ok: true, riga: daRiga(c) }
}
export async function eliminaCommento(id) {
  commenti = commenti.filter((c) => c.id !== id)
  return { ok: true }
}
