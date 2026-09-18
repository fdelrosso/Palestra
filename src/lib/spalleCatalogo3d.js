// Catalogo leggero: si importa senza caricare Three.js (serve a EserciziPage
// per il badge "3D"). `principali` si accendono in rosso, `secondari` in rosa.
export const ESERCIZI_SPALLE_3D = [
  { nome: 'Lento avanti bilanciere (military)', tipo: 'lento', muscoli: 'Deltoidi anteriori e laterali', principali: ['deltoideAnteriore', 'deltoideLaterale'], secondari: ['trapezio'] },
  { nome: 'Lento avanti manubri', tipo: 'lento-manubri', muscoli: 'Deltoidi anteriori e laterali', principali: ['deltoideAnteriore', 'deltoideLaterale'], secondari: ['trapezio'] },
  { nome: 'Arnold press', tipo: 'arnold', muscoli: 'Deltoidi anteriori e laterali', principali: ['deltoideAnteriore', 'deltoideLaterale'], secondari: ['trapezio'] },
  { nome: 'Shoulder press macchina', tipo: 'macchina', muscoli: 'Deltoidi anteriori', principali: ['deltoideAnteriore'], secondari: ['deltoideLaterale', 'trapezio'] },
  { nome: 'Alzate laterali manubri', tipo: 'laterali', muscoli: 'Deltoidi laterali', principali: ['deltoideLaterale'], secondari: ['deltoideAnteriore', 'trapezio'] },
  { nome: 'Alzate laterali ai cavi', tipo: 'laterali-cavo', muscoli: 'Deltoide laterale', principali: ['deltoideLaterale'], secondari: ['deltoideAnteriore', 'trapezio'] },
  { nome: 'Alzate frontali manubri', tipo: 'frontali', muscoli: 'Deltoidi anteriori', principali: ['deltoideAnteriore'], secondari: ['deltoideLaterale'] },
  { nome: 'Alzate posteriori (rear delt)', tipo: 'posteriori', muscoli: 'Deltoidi posteriori', principali: ['deltoidePosteriore'], secondari: ['trapezio', 'deltoideLaterale'] },
  { nome: 'Reverse pec deck (rear delt machine)', tipo: 'reverse-pec-deck', muscoli: 'Deltoidi posteriori', principali: ['deltoidePosteriore'], secondari: ['trapezio'] },
  { nome: 'Tirate al mento (upright row)', tipo: 'tirate', muscoli: 'Deltoidi laterali e trapezio', principali: ['deltoideLaterale', 'trapezio'], secondari: ['deltoideAnteriore'] },
  { nome: 'Face pull', tipo: 'face-pull', muscoli: 'Deltoidi posteriori e trapezio', principali: ['deltoidePosteriore', 'trapezio'], secondari: ['deltoideLaterale'] },
  { nome: 'Scrollate bilanciere (shrug)', tipo: 'scrollate', attrezzo: 'bilanciere', muscoli: 'Trapezio', principali: ['trapezio'] },
  { nome: 'Scrollate manubri', tipo: 'scrollate', attrezzo: 'manubri', muscoli: 'Trapezio', principali: ['trapezio'] },
]

export function esercizioSpalle3D(nome) {
  return ESERCIZI_SPALLE_3D.find((e) => e.nome === nome) || null
}
