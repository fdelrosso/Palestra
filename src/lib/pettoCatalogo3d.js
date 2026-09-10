// Catalogo leggero: può essere importato senza caricare Three.js.
export const ESERCIZI_PETTO_3D = [
  { nome: 'Panca piana bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: 0 },
  { nome: 'Panca piana manubri', tipo: 'spinte', attrezzo: 'manubri', inclinazione: 0 },
  { nome: 'Panca inclinata bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: 30 },
  { nome: 'Panca inclinata manubri', tipo: 'spinte', attrezzo: 'manubri', inclinazione: 30 },
  { nome: 'Panca declinata bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: -15 },
  { nome: 'Chest press macchina', tipo: 'chest-press', attrezzo: 'macchina', inclinazione: 80 },
  { nome: 'Croci ai cavi', tipo: 'cavi', attrezzo: 'cavi', altezzaCavo: 1.65 },
  { nome: 'Croci ai cavi alti', tipo: 'cavi', attrezzo: 'cavi', altezzaCavo: 2.35 },
  { nome: 'Croci ai cavi bassi', tipo: 'cavi', attrezzo: 'cavi', altezzaCavo: 0.2 },
  { nome: 'Croci su panca piana manubri', tipo: 'croci', attrezzo: 'manubri', inclinazione: 0 },
  { nome: 'Croci su panca inclinata manubri', tipo: 'croci', attrezzo: 'manubri', inclinazione: 30 },
  { nome: 'Pectoral machine (pec deck)', tipo: 'pec-deck', attrezzo: 'macchina', inclinazione: 90 },
  { nome: 'Spinte al multipower (Smith)', tipo: 'spinte', attrezzo: 'smith', inclinazione: 0 },
  { nome: 'Dips alle parallele (petto)', tipo: 'dips', attrezzo: 'parallele' },
  { nome: 'Piegamenti (push-up)', tipo: 'push-up', attrezzo: 'nessuno' },
  { nome: 'Pullover con manubrio', tipo: 'pullover', attrezzo: 'manubrio', inclinazione: 0 },
]

export function esercizioPetto3D(nome) {
  return ESERCIZI_PETTO_3D.find((e) => e.nome === nome) || null
}
