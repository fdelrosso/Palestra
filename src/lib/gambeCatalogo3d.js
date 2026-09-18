// Catalogo leggero: si importa senza caricare Three.js (serve a EserciziPage
// per il badge "3D"). `principali` si accendono in rosso, `secondari` in rosa.
export const ESERCIZI_GAMBE_3D = [
  { nome: 'Squat bilanciere', tipo: 'squat', muscoli: 'Quadricipiti e glutei', carico: 'dietro', principali: ['quadricipiti', 'glutei'], secondari: ['adduttori', 'femorali'] },
  { nome: 'Squat frontale', tipo: 'squat', muscoli: 'Quadricipiti', carico: 'davanti', principali: ['quadricipiti'], secondari: ['glutei', 'adduttori'] },
  { nome: 'Hack squat', tipo: 'hack', muscoli: 'Quadricipiti', principali: ['quadricipiti'], secondari: ['glutei', 'adduttori'] },
  { nome: 'Leg press', tipo: 'leg-press', muscoli: 'Quadricipiti e glutei', principali: ['quadricipiti', 'glutei'], secondari: ['adduttori'] },
  { nome: 'Pressa 45°', tipo: 'pressa-45', muscoli: 'Quadricipiti e glutei', principali: ['quadricipiti', 'glutei'], secondari: ['adduttori', 'femorali'] },
  { nome: 'Affondi con manubri', tipo: 'affondi', muscoli: 'Quadricipiti e glutei', principali: ['quadricipiti', 'glutei'], secondari: ['adduttori', 'femorali'] },
  { nome: 'Affondi bulgari (split squat)', tipo: 'bulgari', muscoli: 'Glutei e quadricipiti', principali: ['glutei', 'quadricipiti'], secondari: ['adduttori'] },
  { nome: 'Goblet squat', tipo: 'squat', muscoli: 'Quadricipiti e glutei', carico: 'goblet', principali: ['quadricipiti', 'glutei'], secondari: ['adduttori'] },
  { nome: 'Leg extension', tipo: 'leg-extension', muscoli: 'Quadricipiti', principali: ['quadricipiti'] },
  { nome: 'Leg curl sdraiato', tipo: 'leg-curl-sdraiato', muscoli: 'Femorali', principali: ['femorali'], secondari: ['polpacci'] },
  { nome: 'Leg curl seduto', tipo: 'leg-curl-seduto', muscoli: 'Femorali', principali: ['femorali'], secondari: ['polpacci'] },
  { nome: 'Stacco gambe tese', tipo: 'gambe-tese', muscoli: 'Femorali e glutei', principali: ['femorali', 'glutei'], secondari: ['adduttori'] },
  { nome: 'Calf raise in piedi', tipo: 'calf-piedi', muscoli: 'Polpacci', principali: ['polpacci'] },
  { nome: 'Calf raise seduto', tipo: 'calf-seduto', muscoli: 'Polpacci', principali: ['polpacci'] },
  { nome: 'Adductor machine', tipo: 'adduttori', muscoli: 'Adduttori', principali: ['adduttori'] },
  { nome: 'Abductor machine', tipo: 'abduttori', muscoli: 'Abduttori (medio gluteo)', principali: ['abduttori'], secondari: ['glutei'] },
  { nome: 'Step up', tipo: 'step-up', muscoli: 'Quadricipiti e glutei', principali: ['quadricipiti', 'glutei'], secondari: ['femorali'] },
  { nome: 'Stacco sumo', tipo: 'sumo', muscoli: 'Glutei, quadricipiti e adduttori', principali: ['glutei', 'quadricipiti', 'adduttori'], secondari: ['femorali'] },
]

export function esercizioGambe3D(nome) {
  return ESERCIZI_GAMBE_3D.find((e) => e.nome === nome) || null
}
