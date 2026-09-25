// ---------------------------------------------------------------------------
// lib/interazioni FINTA, per i banchi di prova (scratchpad/vite.prova.config.js
// la mette al posto di quella vera): mi piace e commenti in memoria, senza
// database. Le funzioni pure sono quelle vere.
// ---------------------------------------------------------------------------
export { NESSUNA, commentoValido, conMiPiace, daRiga } from '../src/lib/interazioni.js'

const nomi = { io: 'Prova', nico: 'Nico', giulia: 'Giulia', marco: 'Marco' }
const miPiace = {} // chiave -> [{ userId, creatoIl }]
const commenti = {} // chiave -> [riga]
const urlFoto = {} // percorso -> url

const attesa = () => new Promise((r) => setTimeout(r, 150))

/** Riempie il banco: chi ha messo mi piace e chi ha commentato, per chiave. */
export function seminaInterazioni(chiave, { like = [], righe = [] } = {}) {
  miPiace[chiave] = like.map((userId, i) => ({
    userId,
    creatoIl: new Date(Date.now() - i * 3600e3).toISOString(),
  }))
  commenti[chiave] = righe.map((r, i) => {
    const id = 'c' + i + Math.random().toString(36).slice(2, 6)
    if (r.fotoUrl) urlFoto['seme/' + id] = r.fotoUrl
    return {
      id,
      userId: r.userId,
      nome: nomi[r.userId] || r.userId,
      testo: r.testo || '',
      foto: r.fotoUrl ? 'seme/' + id : null,
      creatoIl: new Date(Date.now() - (righe.length - i) * 1800e3).toISOString(),
    }
  })
}

function riassunto(chiave, ioId) {
  const l = miPiace[chiave] || []
  const c = commenti[chiave] || []
  const u = c[c.length - 1]
  return {
    miPiace: l.length,
    mio: l.some((x) => x.userId === ioId),
    commenti: c.length,
    ultimo: u ? { nome: u.nome, testo: u.testo, foto: !!u.foto } : null,
  }
}

export async function leggiInterazioni(chiavi) {
  await attesa()
  const per = {}
  for (const k of chiavi || []) per[k] = riassunto(k, 'io')
  return per
}

export async function impostaMiPiace(chiave, ioId, metto) {
  await attesa()
  const l = (miPiace[chiave] ||= [])
  const i = l.findIndex((x) => x.userId === ioId)
  if (metto && i === -1) l.unshift({ userId: ioId, creatoIl: new Date().toISOString() })
  if (!metto && i !== -1) l.splice(i, 1)
  return { ok: true, errore: '' }
}

export async function chiHaMessoMiPiace(chiave) {
  await attesa()
  return {
    ok: true,
    righe: (miPiace[chiave] || []).map((x) => ({ ...x, nome: nomi[x.userId] || x.userId })),
    errore: '',
  }
}

export async function leggiCommenti(chiave) {
  await attesa()
  return { ok: true, righe: [...(commenti[chiave] || [])], errore: '' }
}

export async function scriviCommento({ chiave, ioId, ioNome, testo = '', file = null }) {
  await attesa()
  const id = 'n' + Date.now().toString(36)
  let foto = null
  if (file) {
    foto = `${ioId}/${id}.jpg`
    urlFoto[foto] = URL.createObjectURL(file)
  }
  const riga = { id, userId: ioId, nome: ioNome, testo: testo.trim(), foto, creatoIl: new Date().toISOString() }
  ;(commenti[chiave] ||= []).push(riga)
  return { ok: true, riga, errore: '' }
}

export async function eliminaCommento(c) {
  await attesa()
  for (const k of Object.keys(commenti)) commenti[k] = commenti[k].filter((x) => x.id !== c.id)
  return { ok: true, errore: '' }
}

export async function urlFotoCommento(percorso) {
  await attesa()
  return urlFoto[percorso] || null
}

export async function spostaInterazioni() {
  return { ok: true }
}
