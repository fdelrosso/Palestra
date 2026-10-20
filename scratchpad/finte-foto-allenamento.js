// ---------------------------------------------------------------------------
// lib/fotoAllenamento FINTA, per i banchi di prova: le foto degli allenamenti
// in memoria, coi link ai file nel browser. Niente Storage, niente IndexedDB.
// ---------------------------------------------------------------------------
export { VISIBILITA_FOTO_ALL, chiaveAllenamento, dividiFoto, percorsoFotoAllenamento } from '../src/lib/fotoAllenamento.js'

const righe = [] // { id, allenamento_key, tipo, nome, visibilita, posizione, url }

/** Riempie il banco con una foto (un blob) attaccata a un allenamento. */
// `user_id`: di chi è (le foto degli altri hanno la bandierina "Segnala").
export function seminaFoto(chiave, blob, { tipo = 'foto', nome = 'foto.jpg', user_id = 'nico' } = {}) {
  righe.push({
    id: 'f' + righe.length,
    user_id,
    allenamento_key: chiave,
    percorso: 'finto/' + righe.length,
    tipo,
    nome,
    visibilita: 'pubblica',
    posizione: righe.length,
    url: URL.createObjectURL(blob),
  })
}

export async function fotoDiAllenamenti(chiavi) {
  const per = {}
  for (const r of righe) {
    if (!(chiavi || []).includes(r.allenamento_key)) continue
    ;(per[r.allenamento_key] ||= []).push(r)
  }
  return per
}

export async function fonteFotoAllenamento(riga) {
  const r = righe.find((x) => x.id === riga.id)
  return { url: r?.url || null, revoca: () => {} }
}

export async function aggiungiFotoAllenamento({ blob, chiave, tipo, nome, posizione, visibilita }) {
  const riga = {
    id: 'f' + Date.now().toString(36) + righe.length,
    allenamento_key: chiave,
    percorso: 'finto/n' + righe.length,
    tipo,
    nome,
    visibilita,
    posizione,
    url: URL.createObjectURL(blob),
  }
  righe.push(riga)
  return { ok: true, riga, soloLocale: false, errore: '' }
}

export async function aggiornaVisibilitaFotoAllenamento(id, visibilita) {
  const r = righe.find((x) => x.id === id)
  if (r) r.visibilita = visibilita
  return { ok: true, errore: '' }
}

export async function eliminaFotoAllenamento(riga) {
  const i = righe.findIndex((x) => x.id === riga.id)
  if (i !== -1) righe.splice(i, 1)
  return { ok: true, errore: '' }
}

export async function eliminaFotoDiAllenamento() {
  return { ok: true }
}
export async function spostaFotoAllenamento() {
  return { ok: true, errore: '' }
}
export async function riprovaFotoInSospeso() {
  return 0
}

/** Per i controlli dal banco: tutte le righe, com'erano ora. */
export function tutteLeFoto() {
  return righe.map((r) => ({ ...r }))
}

// Lo sfondo del recap (lib/fotoAllenamento): qui una foto in memoria come le altre.
export async function cambiaSfondoAllenamento({ blob, chiave }) {
  if (!blob || !chiave) return { id: null }
  const esito = await aggiungiFotoAllenamento({ blob, chiave, tipo: 'foto', nome: 'sfondo.jpg' })
  return { id: esito.riga.id, soloLocale: esito.soloLocale }
}

// La copia leggera (lib/fotoAllenamento fonteFotoLeggera), qui con la stessa
// riduzione vera: il banco serve anche a vedere che la foto arriva piccola.
export async function fonteFotoLeggera(riga, { lato = 1280 } = {}) {
  const { rimpicciolisciImmagine } = await import('../src/lib/media.js')
  const intera = await fonteFotoAllenamento(riga)
  if (!intera.url) return intera
  const blob = await (await fetch(intera.url)).blob()
  const piccola = await rimpicciolisciImmagine(blob, { lato, qualita: 0.85 }).catch(() => blob)
  const url = URL.createObjectURL(piccola)
  return { url, revoca: () => URL.revokeObjectURL(url) }
}

// L'ultimo passo del riepilogo: qui ricorda solo l'ultima richiesta.
export const allineamentiFoto = []
export async function allineaVisibilitaFotoAllenamento(chiave, visibilita) {
  allineamentiFoto.push({ chiave, visibilita })
}
