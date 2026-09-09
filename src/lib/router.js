import { useEffect, useState } from 'react'

// Router minimale basato su hash (#/...), senza dipendenze.
// Funziona su hosting statico e supporta il tasto "indietro" del telefono.

function parse(hash) {
  const path = (hash || '').replace(/^#/, '')
  const seg = path.split('/').filter(Boolean) // es. "/scheda/abc" -> ["scheda","abc"]
  // La pagina iniziale è il calendario; l'elenco delle schede sta su /schede.
  if (seg.length === 0) return { name: 'calendario' }
  if (seg[0] === 'schede') return { name: 'home' }
  if (seg[0] === 'nuova') return { name: 'nuova' }
  if (seg[0] === 'crea') return { name: 'editor', id: null }
  if (seg[0] === 'importa') return { name: 'importa' }
  if (seg[0] === 'allenamento') return { name: 'allenamento' }
  if (seg[0] === 'calendario') return { name: 'calendario' }
  if (seg[0] === 'storico') return { name: 'storico' }
  if (seg[0] === 'schede-generali') return { name: 'schede-generali' }
  if (seg[0] === 'consigliato') return { name: 'consigliato' }
  if (seg[0] === 'amici') return { name: 'amici' }
  if (seg[0] === 'schede-prefatte') return { name: 'schede-prefatte' }
  if (seg[0] === 'lavoro') {
    if (seg[1] === 'atleti') return { name: 'atleti' }
    return { name: 'lavoro' }
  }
  if (seg[0] === 'esercizi') {
    if (!seg[1]) return { name: 'esercizi' }
    return { name: 'esercizi-gruppo', gruppo: seg[1] }
  }
  if (seg[0] === 'condivisi') return { name: 'condivisi' }
  if (seg[0] === 'dati') return { name: 'dati' }
  if (seg[0] === 'dieta') {
    if (!seg[1]) return { name: 'dieta' }
    if (seg[1] === 'oggi') return { name: 'dieta-oggi' }
    if (seg[1] === 'nuova') return { name: 'dieta-editor', id: null }
    if (seg[1] === 'preferenze') return { name: 'dieta-preferenze' }
    if (seg[1] === 'importa') return { name: 'dieta-importa' }
    return { name: 'dieta-editor', id: seg[1] }
  }
  if (seg[0] === 'scheda' && seg[1]) {
    if (seg[2] === 'edit') return { name: 'editor', id: seg[1] }
    return { name: 'scheda', id: seg[1] }
  }
  return { name: 'calendario' }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(path) {
  const hash = '#' + (path.startsWith('/') ? path : '/' + path)
  if (window.location.hash === hash) return
  window.location.hash = hash
  // Riporta in cima quando si cambia schermata.
  window.scrollTo(0, 0)
}

export function goBack() {
  if (window.history.length > 1) window.history.back()
  else navigate('/')
}

export const routes = {
  home: () => '/schede', // "Le mie schede" (l'elenco); la landing '/' è il calendario
  scheda: (id) => `/scheda/${id}`,
  editor: (id) => (id ? `/scheda/${id}/edit` : '/crea'),
  nuova: () => '/nuova',
  importa: () => '/importa',
  allenamento: () => '/allenamento',
  calendario: () => '/calendario',
  storico: () => '/storico',
  schedeGenerali: () => '/schede-generali',
  consigliato: () => '/consigliato',
  amici: () => '/amici',
  schedePrefatte: () => '/schede-prefatte',
  lavoro: () => '/lavoro',
  atleti: () => '/lavoro/atleti',
  esercizi: () => '/esercizi',
  eserciziGruppo: (id) => `/esercizi/${id}`,
  condivisi: () => '/condivisi',
  datiFisici: () => '/dati',
  dieta: () => '/dieta',
  dietaOggi: () => '/dieta/oggi',
  dietaEditor: (id) => (id ? `/dieta/${id}` : '/dieta/nuova'),
  dietaPreferenze: () => '/dieta/preferenze',
  dietaImporta: () => '/dieta/importa',
}
