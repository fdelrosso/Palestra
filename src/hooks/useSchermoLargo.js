import { useSyncExternalStore } from 'react'

// Vero su uno schermo largo (un portatile): la stessa soglia di desktop.css.
// Per quello che il CSS da solo non puo' cambiare, come quanti giorni leggere.
const QUERY = '(min-width: 1024px)'

const iscriviti = (avvisa) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', avvisa)
  return () => mq.removeEventListener('change', avvisa)
}

export default function useSchermoLargo() {
  return useSyncExternalStore(iscriviti, () => window.matchMedia(QUERY).matches)
}
