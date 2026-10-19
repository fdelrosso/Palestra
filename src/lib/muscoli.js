// ---------------------------------------------------------------------------
// Gruppi muscolari (opzionali) associabili a un esercizio.
//
// Ogni esercizio ha un campo `gruppo` = id di uno di questi gruppi, oppure ''
// (nessun gruppo → pallino vuoto). Il colore serve per:
//   - i pallini in basso a destra nei riquadri "Giorno A/B…" (uno per esercizio);
//   - la tinta dell'intero riquadro di un esercizio quando si apre/segue un
//     allenamento.
// Il colore viene passato alla UI via la CSS custom property `--g` (inline),
// così lo stile vive nel CSS (index.css) e i dati qui.
// ---------------------------------------------------------------------------

// `vista` = da che parte si vede quel muscolo, `dueViste` = si vede da
// entrambe (le gambe: quadricipiti davanti, femorali dietro). Servono al disegno
// del corpo in components/CorpoMuscoli: se li' si aggiungono forme per l'altra
// vista, va aggiornato anche qui.
//
// GLUTEI e POLPACCI sono gruppi loro (dalla 38a): prima stavano dentro "Gambe",
// e un hip thrust o un calf raise contavano come uno squat. ⚠️ "Gambe" adesso
// vuol dire cosce (quadricipiti, femorali, adduttori). Gli esercizi gia' scritti
// come "gambe" che dal nome sono glutei o polpacci si spostano da soli quando la
// scheda si carica (vedi `gruppiAggiornati` in lib/eserciziLibreria).
// ⚠️ Nessun colore BLU (55ª): il fondo del post nel feed prende il colore del
// gruppo più allenato, e un blu si confonderebbe col blu scuro dell'app. La
// schiena era #3b82f6 (ora giallo), il cardio un grigio-blu (ora grigio).
export const GRUPPI = [
  { id: 'petto', label: 'Petto', colore: '#e5533d', vista: 'fronte', dueViste: false },
  { id: 'schiena', label: 'Schiena', colore: '#facc15', vista: 'dietro', dueViste: false },
  { id: 'gambe', label: 'Gambe', colore: '#8b5cf6', vista: 'fronte', dueViste: true },
  { id: 'glutei', label: 'Glutei', colore: '#c026d3', vista: 'dietro', dueViste: false },
  { id: 'polpacci', label: 'Polpacci', colore: '#a3e635', vista: 'dietro', dueViste: false },
  { id: 'spalle', label: 'Spalle', colore: '#f59e0b', vista: 'fronte', dueViste: true },
  { id: 'bicipiti', label: 'Bicipiti', colore: '#22c55e', vista: 'fronte', dueViste: false },
  { id: 'tricipiti', label: 'Tricipiti', colore: '#14b8a6', vista: 'dietro', dueViste: false },
  { id: 'addome', label: 'Addome', colore: '#ec4899', vista: 'fronte', dueViste: false },
  { id: 'cardio', label: 'Cardio', colore: '#a1a1aa', vista: 'fronte', dueViste: true },
]

// I SOTTOGRUPPI (dal 2026-10-19): i muscoli dentro gambe, spalle e schiena.
// Non sono gruppi a sé: i conteggi (le pastiglie del recap, i consigli)
// restano per gruppo. Servono al corpo che si accende (components/
// CorpoAllenato), che per un leg curl accende i femorali e non tutta la gamba.
// Hanno il colore del loro gruppo e una maschera per vista (lib/corpoImmagini,
// scratchpad/maschere-sottogruppi.py). Quali ne lavora un esercizio lo dice la
// libreria (SOTTOGRUPPI_ESERCIZI in lib/eserciziLibreria).
export const SOTTOGRUPPI = [
  { id: 'quadricipiti', label: 'Quadricipiti', gruppo: 'gambe' },
  { id: 'femorali', label: 'Femorali', gruppo: 'gambe' },
  { id: 'adduttori', label: 'Adduttori', gruppo: 'gambe' },
  { id: 'deltoideAnteriore', label: 'Deltoide anteriore', gruppo: 'spalle' },
  { id: 'deltoideLaterale', label: 'Deltoide laterale', gruppo: 'spalle' },
  { id: 'deltoidePosteriore', label: 'Deltoide posteriore', gruppo: 'spalle' },
  { id: 'dorsali', label: 'Dorsali', gruppo: 'schiena' },
  { id: 'trapezio', label: 'Trapezio', gruppo: 'schiena' },
  { id: 'romboidi', label: 'Romboidi', gruppo: 'schiena' },
  { id: 'lombari', label: 'Lombari', gruppo: 'schiena' },
]

const MAPPA = Object.fromEntries(GRUPPI.map((g) => [g.id, g]))
const MAPPA_SOTTO = Object.fromEntries(SOTTOGRUPPI.map((s) => [s.id, s]))

// Restituisce il gruppo (oggetto) di un id, o null se assente/sconosciuto.
// L'id di un sottogruppo dà il suo gruppo: il colore è quello.
export function gruppoDi(id) {
  return id ? MAPPA[id] || MAPPA[MAPPA_SOTTO[id]?.gruppo] || null : null
}

// Il sottogruppo (oggetto) di un id, o null.
export function sottogruppoDi(id) {
  return id ? MAPPA_SOTTO[id] || null : null
}
