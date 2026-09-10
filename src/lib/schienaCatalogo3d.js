// Configurazioni leggere, separate dal motore 3D caricato su richiesta.
export const ESERCIZI_SCHIENA_3D = [
  { nome: 'Trazioni presa prona', tipo: 'trazioni', presa: 'prona', larghezza: 0.46 },
  { nome: 'Trazioni presa supina (chin-up)', tipo: 'trazioni', presa: 'supina', larghezza: 0.27 },
  { nome: 'Trazioni presa neutra', tipo: 'trazioni', presa: 'neutra', larghezza: 0.22 },
  { nome: 'Lat machine avanti', tipo: 'lat', presa: 'prona', larghezza: 0.5 },
  { nome: 'Lat machine presa inversa', tipo: 'lat', presa: 'supina', larghezza: 0.3 },
  { nome: 'Lat machine presa stretta', tipo: 'lat', presa: 'neutra', larghezza: 0.16 },
  { nome: 'Pulley basso (rematore al cavo)', tipo: 'pulley' },
  { nome: 'Rematore bilanciere', tipo: 'rematore', attrezzo: 'bilanciere' },
  { nome: 'Rematore manubrio singolo', tipo: 'rematore-singolo', attrezzo: 'manubrio' },
  { nome: 'Rematore Pendlay', tipo: 'pendlay', attrezzo: 'bilanciere' },
  { nome: 'Rematore T-bar', tipo: 't-bar', attrezzo: 't-bar' },
  { nome: 'Rematore alla macchina', tipo: 'rematore-macchina' },
  { nome: 'Pullover ai cavi', tipo: 'pullover-cavi' },
  { nome: 'Stacco da terra', tipo: 'stacco', attrezzo: 'bilanciere', muscoli: 'Dorsali e lombari' },
  { nome: 'Stacco rumeno', tipo: 'rumeno', attrezzo: 'bilanciere', muscoli: 'Dorsali e lombari' },
  { nome: 'Hyperextension (lombari)', tipo: 'hyperextension', muscoli: 'Lombari' },
  { nome: 'Face pull', tipo: 'face-pull', muscoli: 'Dorso alto' },
]
export function esercizioSchiena3D(nome) {
  return ESERCIZI_SCHIENA_3D.find((e) => e.nome === nome) || null
}
