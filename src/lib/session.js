import { nuovoId, schemaPerSettimana } from '../data/model'

// Numero di serie (set) di un esercizio, ricavato dal campo "serie".
// "8" -> 8, "4 giri" -> 4, "" -> 1.
export function numeroSet(schema) {
  const m = String(schema?.serie || '').match(/\d+/)
  if (!m) return 1
  return Math.max(1, Math.min(30, parseInt(m[0], 10)))
}

// Crea una sessione di allenamento "congelando" lo schema della settimana corrente,
// così il riepilogo/storico resta corretto anche se in futuro modifichi la scheda.
export function creaSessione(scheda, giorno, settimana) {
  return {
    id: nuovoId(),
    schedaId: scheda.id,
    giornoId: giorno.id,
    settimana,
    nomeScheda: scheda.nome,
    nomeGiorno: giorno.nome,
    inizio: new Date().toISOString(),
    // Il commento sull'allenamento INTERO, scritto in fondo alla sessione
    // mentre ci si allena. Finisce nel completamento come `nota`, dove lo
    // ritrova (e lo può ancora correggere) la schermata di riepilogo.
    nota: '',
    esercizi: giorno.esercizi.map((e) => {
      const schema = schemaPerSettimana(e, settimana)
      return {
        esercizioId: e.id,
        nome: e.nome,
        nota: e.nota,
        gruppo: e.gruppo || '',
        schema,
        sets: Array.from({ length: numeroSet(schema) }, () => ({ colore: null })),
      }
    }),
  }
}

// Indici del prossimo set da fare (primo set senza colore).
export function prossimoSet(sessione) {
  for (let ei = 0; ei < sessione.esercizi.length; ei++) {
    const es = sessione.esercizi[ei]
    for (let si = 0; si < es.sets.length; si++) {
      if (!es.sets[si].colore) return { ei, si }
    }
  }
  return null // tutto fatto
}

export function totaliSessione(sessione) {
  let tot = 0
  let fatti = 0
  for (const es of sessione.esercizi) {
    tot += es.sets.length
    fatti += es.sets.filter((s) => s.colore).length
  }
  return { tot, fatti }
}

// Riepilogo finale (usato dalla schermata di fine e salvato nello storico).
//
// Al completamento salvato possono aggiungersi, DOPO, campi facoltativi scritti
// nella schermata di riepilogo (via `aggiornaCompletamento`): `nota` (il
// commento della card) e i numeri copiati dall'orologio — `calorieReali`,
// `fcMedia`, `fcMax`. Qui non nascono perché durante l'allenamento non
// esistono ancora.
export function riepilogoSessione(sessione, fineISO) {
  const inizio = new Date(sessione.inizio).getTime()
  const fine = new Date(fineISO || new Date().toISOString()).getTime()
  const durataSec = Math.max(0, Math.round((fine - inizio) / 1000))
  return {
    schedaId: sessione.schedaId,
    nomeScheda: sessione.nomeScheda,
    settimana: sessione.settimana,
    giornoId: sessione.giornoId,
    nomeGiorno: sessione.nomeGiorno,
    data: fineISO || new Date().toISOString(),
    durataSec,
    nota: sessione.nota || '',
    esercizi: sessione.esercizi.map((e) => ({
      nome: e.nome,
      gruppo: e.gruppo || '', // conservato per lo "storico" del consiglio allenamento
      schema: e.schema,
      sets: e.sets.map((s) => ({ colore: s.colore })),
    })),
  }
}

export const COLORI = {
  verde: { label: 'Facile', var: 'var(--good)', ink: 'var(--good-ink)' },
  giallo: { label: 'Medio', var: '#f5c542', ink: '#241d00' },
  rosso: { label: 'Duro', var: '#f26d6d', ink: '#2a0808' },
}
