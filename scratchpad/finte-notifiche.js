// ---------------------------------------------------------------------------
// Le notifiche (lib/notifiche) senza database, per i banchi di prova
// (scratchpad/prova-ui.html?p=notifiche, ?p=amici). Le parole sono quelle
// vere; cambiano solo le righe, che qui sono finte.
// ---------------------------------------------------------------------------
export { chiInParole, contaNuove, daRiga, daRigaCheck, daRigaAppuntamento, daRigaScheda, fraseNotifica, fraseNotificaAppuntamento, fraseNotificaCheck, fraseNotificaScheda } from '../src/lib/notifiche.js'
import { daRiga, daRigaCheck } from '../src/lib/notifiche.js'

const ora = Date.now()
const fa = (min) => new Date(ora - min * 60000).toISOString()

let righe = [
  { allenamento_key: 's1|x1', tipo: 'mi_piace', quanti: 5, persone: 5, nuovi: 3, nomi: ['Nico', 'Giulia', 'Ale'], ultimo_il: fa(4) },
  { allenamento_key: 's1|x1', tipo: 'commento', quanti: 3, persone: 2, nuovi: 1, nomi: ['Giulia', 'Nico'], ultimo_il: fa(12), ultimo_testo: 'Che carico sulla panca 🔥' },
  { allenamento_key: 's1|x2', tipo: 'mi_piace', quanti: 1, persone: 1, nuovi: 0, nomi: ['Ale'], ultimo_il: fa(60 * 26) },
].map(daRiga)
// Check e video (2026-10-28): al PT un video mandato da Mario, a Mario il commento del PT.
righe = [
  daRigaCheck({ progresso_id: 'e1', atleta_id: 'mario', atleta_nome: 'Mario', categoria: 'esecuzione', tipo: 'condiviso', chi_nome: 'Mario', quando: fa(2), testo: '100 kg, guarda la discesa', nuovo: true }),
  daRigaCheck({ progresso_id: 'e1', atleta_id: 'mario', atleta_nome: 'Mario', categoria: 'esecuzione', tipo: 'commento', chi_nome: 'Filippo', quando: fa(1), testo: 'Spingi le ginocchia in fuori', nuovo: true }),
  ...righe,
]

export async function leggiNotifiche() {
  return { ok: true, righe }
}
export async function segnaNotificheLette() {
  righe = righe.map((r) => ({ ...r, nuovi: 0 }))
}
