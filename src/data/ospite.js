import { parseSchedaTesto } from '../lib/parser'
import { creaSessione, riepilogoSessione, serieChiusa } from '../lib/session'
import { dietaDaDatiFisici } from '../lib/dieta'
import { preferenzeVuote } from '../lib/preferenzeCibo'
import { normalizzaUtente } from '../lib/utenti'

// ---------------------------------------------------------------------------
// L'atleta d'esempio della modalità ospite (lib/ospite). Fatto con le stesse
// funzioni dell'app — il parser per le schede, la sessione per gli
// allenamenti, la dieta dai dati fisici — così ha sempre la forma giusta.
// Le date partono da oggi: l'esempio non invecchia.
// ---------------------------------------------------------------------------

const SCHEDA_ATTIVA = `Giorno A - Petto e tricipiti
Panca piana 4x8 70kg rec 2min
Spinte manubri inclinata 3x10 26kg rec 90s
Croci ai cavi 3x12 15kg rec 60s
Push down 3x12 25kg rec 60s

Giorno B - Schiena e bicipiti
Trazioni 4x6 rec 2min
Rematore bilanciere 4x8 60kg rec 2min
Lat machine 3x10 55kg rec 90s
Curl manubri 3x12 14kg rec 60s

Giorno C - Gambe e spalle
Squat 4x6 90kg rec 3min
Stacco rumeno 3x8 80kg rec 2min
Leg press 3x12 160kg rec 90s
Military press 4x8 40kg rec 2min
Alzate laterali 3x15 8kg rec 60s`

const SCHEDA_VECCHIA = `Full body
Squat 3x10 70kg rec 2min
Panca piana 3x10 60kg rec 2min
Rematore manubrio 3x10 24kg rec 90s
Plank 3x45s rec 60s`

const COLORI = ['verde', 'verde', 'giallo', 'verde', 'rosso']

// Un allenamento fatto: tutte le serie chiuse, un'ora e dieci.
function fatto(scheda, giorno, settimana, data) {
  const s = creaSessione(scheda, giorno, settimana)
  s.inizio = new Date(data.getTime() - 70 * 60000).toISOString()
  s.esercizi = s.esercizi.map((e, i) => ({
    ...e,
    sets: e.sets.map((_, j) => serieChiusa(e.schema, j, COLORI[(i + j) % COLORI.length])),
  }))
  const { daSalvare: _, ...c } = riepilogoSessione(s, data.toISOString())
  return { ...c, visibilita: 'privata' }
}

function giorniFa(oggi, n, ora = 18) {
  const d = new Date(oggi)
  d.setDate(d.getDate() - n)
  d.setHours(ora, 30, 0, 0)
  return d
}

export function costruisciEsempio(oggi = new Date()) {
  const attiva = { ...parseSchedaTesto(SCHEDA_ATTIVA, 'Push Pull Legs'), attiva: true, giorniSettimana: [0, 2, 4] }
  const vecchia = { ...parseSchedaTesto(SCHEDA_VECCHIA, 'Full body inverno'), archiviata: true }

  // Tre allenamenti a settimana nelle ultime 4 settimane (lun, mer, ven circa).
  const giorni = attiva.giorni.filter((g) => g.tipo === 'workout')
  attiva.completamenti = [33, 31, 29, 26, 24, 22, 19, 17, 15, 12, 10, 8, 5, 3, 1].map((n, i) =>
    fatto(attiva, giorni[i % giorni.length], 1 + Math.floor(i / 3), giorniFa(oggi, n)),
  )
  attiva.settimanaCorrente = 5
  vecchia.completamenti = []

  const utente = {
    ...normalizzaUtente({
      id: null,
      nome: 'Marco',
      cognome: 'Esempio',
      username: 'marco.esempio',
      dati: { sesso: 'm', eta: 28, peso: 78, altezza: 180, movimento: 'leggero', obiettivo: 'ricomposizione' },
    }),
    ospite: true,
  }
  const preferenze = preferenzeVuote()
  const dieta = dietaDaDatiFisici(utente.dati, preferenze, { nome: 'Ricomposizione', attiva: true })

  return { utente, schede: [attiva, vecchia], diete: dieta ? [dieta] : [], preferenze, diario: [] }
}
