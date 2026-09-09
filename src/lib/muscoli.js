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
// entrambe (glutei e femorali dietro, quadricipiti davanti). Servono al disegno
// del corpo in components/CorpoMuscoli: se li' si aggiungono forme per l'altra
// vista, va aggiornato anche qui.
export const GRUPPI = [
  { id: 'petto', label: 'Petto', colore: '#e5533d', vista: 'fronte', dueViste: false },
  { id: 'schiena', label: 'Schiena', colore: '#3b82f6', vista: 'dietro', dueViste: false },
  { id: 'gambe', label: 'Gambe', colore: '#8b5cf6', vista: 'fronte', dueViste: true },
  { id: 'spalle', label: 'Spalle', colore: '#f59e0b', vista: 'fronte', dueViste: true },
  { id: 'bicipiti', label: 'Bicipiti', colore: '#22c55e', vista: 'fronte', dueViste: false },
  { id: 'tricipiti', label: 'Tricipiti', colore: '#14b8a6', vista: 'dietro', dueViste: false },
  { id: 'addome', label: 'Addome', colore: '#ec4899', vista: 'fronte', dueViste: false },
  { id: 'cardio', label: 'Cardio', colore: '#64748b', vista: 'fronte', dueViste: true },
]

const MAPPA = Object.fromEntries(GRUPPI.map((g) => [g.id, g]))

// Restituisce il gruppo (oggetto) di un id, o null se assente/sconosciuto.
export function gruppoDi(id) {
  return id ? MAPPA[id] || null : null
}
