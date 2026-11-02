// lib/exAtleti FINTA (scratchpad/prova-pt, 2026-11-02): un ex atleta in memoria.
import { normalizzaScheda } from '../src/data/model.js'

const fa = (g) => new Date(Date.now() - g * 86400000).toISOString()
let ex = [{ id: 'luca', nome: 'Luca', username: 'luca', dal: fa(90), al: fa(12) }]

export async function leggiExAtleti() {
  return ex.map((x) => ({ ...x }))
}
export async function leggiExAtleta(a) {
  return {
    schede: [normalizzaScheda({ id: 'ex1', nome: 'Forza inverno', creataIl: fa(60), giorni: [] })],
    allenamenti: [{ utenteId: a.id, utenteNome: a.nome, schedaId: 'ex1', data: fa(20), nomeGiorno: 'Giorno A', nomeScheda: 'Forza inverno', visibilita: 'solo-pt' }],
    diario: [{ data: fa(13).slice(0, 10), voci: [{ id: 'v1', nome: 'Pasta', testo: 'Pasta', kcal: 500, slot: 'pranzo' }], acqua: 0 }],
  }
}
export async function togliExAtleta(id) {
  ex = ex.filter((x) => x.id !== id)
  return { ok: true }
}
