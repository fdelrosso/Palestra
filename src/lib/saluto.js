// La testa della Home: la data di oggi e il saluto secondo l'ora. La usano la
// Home di chi si allena (pages/InizioPage) e quella del PT (pages/LavoroPage).

/** "Martedì 28 ottobre" */
export function dataDiOggi() {
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function saluto() {
  const h = new Date().getHours()
  return h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}
