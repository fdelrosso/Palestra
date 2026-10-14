// Catalogo leggero: può essere importato senza caricare Three.js (serve a
// EserciziPage per il badge "3D"). Tutti gli esercizi del petto della libreria.
// `principali` si accendono in rosso sul corpo, `secondari` in rosa
// (nomi in lib/umano3d); `muscoli` è la riga sotto la vista.
const SPINTA = { principali: ['petto'], secondari: ['tricipiti', 'deltoideAnteriore'] }
const ALTO = { principali: ['petto', 'deltoideAnteriore'], secondari: ['tricipiti'] }
const APERTURA = { principali: ['petto'], secondari: ['deltoideAnteriore'] }

export const ESERCIZI_PETTO_3D = [
  { nome: 'Panca piana bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: 0, muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Panca piana manubri', tipo: 'spinte', attrezzo: 'manubri', inclinazione: 0, muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Panca inclinata bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: 30, muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', ...ALTO },
  { nome: 'Panca inclinata manubri', tipo: 'spinte', attrezzo: 'manubri', inclinazione: 30, muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', ...ALTO },
  { nome: 'Panca declinata bilanciere', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: -15, muscoli: 'Pettorale basso · tricipiti', ...SPINTA },
  { nome: 'Chest press macchina', tipo: 'chest-press', attrezzo: 'macchina', leva: 'piana', muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Croci ai cavi', tipo: 'cavi', attrezzo: 'cavi', cavi: 'medi', muscoli: 'Pettorali · deltoidi anteriori', ...APERTURA },
  { nome: 'Croci ai cavi alti', tipo: 'cavi', attrezzo: 'cavi', cavi: 'alti', muscoli: 'Pettorale basso · deltoidi anteriori', ...APERTURA },
  { nome: 'Croci ai cavi bassi', tipo: 'cavi', attrezzo: 'cavi', cavi: 'bassi', muscoli: 'Pettorale alto · deltoidi anteriori', ...APERTURA },
  { nome: 'Croci su panca piana manubri', tipo: 'croci', attrezzo: 'manubri', inclinazione: 0, muscoli: 'Pettorali · deltoidi anteriori', ...APERTURA },
  { nome: 'Croci su panca inclinata manubri', tipo: 'croci', attrezzo: 'manubri', inclinazione: 30, muscoli: 'Pettorale alto · deltoidi anteriori', ...APERTURA },
  { nome: 'Pectoral machine (pec deck)', tipo: 'pec-deck', attrezzo: 'macchina', muscoli: 'Pettorali · deltoidi anteriori', ...APERTURA },
  { nome: 'Spinte al multipower (Smith)', tipo: 'spinte', attrezzo: 'smith', inclinazione: 0, muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Dips alle parallele (petto)', tipo: 'dips', attrezzo: 'parallele', muscoli: 'Pettorale basso e tricipiti · deltoidi anteriori', principali: ['petto', 'tricipiti'], secondari: ['deltoideAnteriore'] },
  { nome: 'Piegamenti (push-up)', tipo: 'push-up', attrezzo: 'nessuno', muscoli: 'Pettorali · tricipiti, deltoidi anteriori e addome', principali: ['petto'], secondari: ['tricipiti', 'deltoideAnteriore', 'addome'] },
  { nome: 'Pullover con manubrio', tipo: 'pullover', attrezzo: 'manubrio', inclinazione: 0, muscoli: 'Pettorali e dorsali · tricipiti', principali: ['petto', 'dorsali'], secondari: ['tricipiti'] },
  { nome: 'Panca declinata manubri', tipo: 'spinte', attrezzo: 'manubri', inclinazione: -15, muscoli: 'Pettorale basso · tricipiti', ...SPINTA },
  { nome: 'Panca inclinata al multipower', tipo: 'spinte', attrezzo: 'smith', inclinazione: 30, muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', ...ALTO },
  { nome: 'Panca piana con fermo (paused)', tipo: 'spinte', attrezzo: 'bilanciere', inclinazione: 0, fermo: true, muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Floor press bilanciere', tipo: 'floor-press', attrezzo: 'bilanciere', muscoli: 'Pettorali e tricipiti', principali: ['petto', 'tricipiti'], secondari: ['deltoideAnteriore'] },
  { nome: 'Chest press inclinata macchina', tipo: 'chest-press', attrezzo: 'macchina', leva: 'inclinata', muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', ...ALTO },
  { nome: 'Hammer strength chest press', tipo: 'chest-press', attrezzo: 'hammer', leva: 'hammer', muscoli: 'Pettorali · tricipiti e deltoidi anteriori', ...SPINTA },
  { nome: 'Croci ai cavi su panca inclinata', tipo: 'croci', attrezzo: 'cavi', inclinazione: 30, muscoli: 'Pettorale alto · deltoidi anteriori', ...APERTURA },
  { nome: 'Piegamenti piedi rialzati (decline push-up)', tipo: 'push-up', attrezzo: 'panca', piedi: 'rialzati', muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', principali: ['petto', 'deltoideAnteriore'], secondari: ['tricipiti', 'addome'] },
  { nome: 'Piegamenti mani rialzate (incline push-up)', tipo: 'push-up', attrezzo: 'panca', mani: 'rialzate', muscoli: 'Pettorale basso · tricipiti', principali: ['petto'], secondari: ['tricipiti', 'deltoideAnteriore'] },
  { nome: 'Piegamenti presa larga', tipo: 'push-up', attrezzo: 'nessuno', presa: 'larga', muscoli: 'Pettorali · deltoidi anteriori', principali: ['petto'], secondari: ['deltoideAnteriore', 'tricipiti', 'addome'] },
  { nome: 'Svend press (con disco)', tipo: 'svend', attrezzo: 'disco', muscoli: 'Pettorali (parte interna) · deltoidi anteriori', principali: ['petto'], secondari: ['deltoideAnteriore', 'tricipiti'] },
  { nome: 'Landmine press', tipo: 'landmine', attrezzo: 'landmine', muscoli: 'Pettorale alto e deltoidi anteriori · tricipiti', ...ALTO },
]

export function esercizioPetto3D(nome) {
  return ESERCIZI_PETTO_3D.find((e) => e.nome === nome) || null
}
