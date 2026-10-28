// ---------------------------------------------------------------------------
// L'agenda del PT (lib/agendaPt) senza database, per scratchpad/prova-pt.
// ---------------------------------------------------------------------------
export { giorniDaLunedi, isoDi, lunediDi, ordinaAttivita } from '../src/lib/agendaPt.js'
import { isoDi, ordinaAttivita } from '../src/lib/agendaPt.js'

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
const oggi = isoDi(new Date())
const domani = isoDi(new Date(Date.now() + 86400000))

let righe = [
  { id: 'a1', data: oggi, ora: '18:00', titolo: 'Lezione', nota: 'Gambe', atletaId: 'mario' },
  { id: 'a2', data: oggi, ora: '', titolo: 'Preparare la scheda di Giulia', nota: '', atletaId: null },
  { id: 'a3', data: domani, ora: '07:30', titolo: 'Valutazione', nota: '', atletaId: 'giulia' },
]

export async function leggiAgenda(da, a) {
  await pausa(100)
  return { ok: true, righe: ordinaAttivita(righe.filter((r) => r.data >= da && r.data <= a)), errore: '' }
}
export async function aggiungiAttivita({ data, ora = '', titolo, nota = '', atletaId = null }) {
  await pausa(100)
  if (!String(titolo || '').trim()) return { ok: false, errore: 'Scrivi cosa c’è da fare.' }
  const riga = { id: 'a' + Date.now(), data, ora, titolo: titolo.trim(), nota, atletaId }
  righe = [...righe, riga]
  return { ok: true, riga }
}
export async function eliminaAttivita(id) {
  righe = righe.filter((r) => r.id !== id)
  return { ok: true }
}
