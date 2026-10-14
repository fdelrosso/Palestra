// ---------------------------------------------------------------------------
// Gli allenamenti SALTATI E PERSI, e cosa se ne vuole fare.
//
// Il caso (chiesto dall'utente, 2026-10-14): si salta C, si fa D, e poi si
// ricomincia — da A nello stesso giro (giroInCorso, 55ª) o dalla settimana
// dopo. Prima C spariva in silenzio: il consiglio tornava ad A come se niente
// fosse. Adesso lo si dice, e si sceglie:
//   - "Recuperalo dopo" (`posticipato`): resta in Home a ricordarlo finché non
//     lo si fa; farlo da lì è un RECUPERO (il completamento porta `recupera`
//     = la chiave del saltato) e non tocca il giro in corso;
//   - "Lascialo perdere" (`tolto`): non lo si nomina più.
// Finché non si sceglie, la Home lo chiede.
//
// ⚠️ Perso vuol dire che il giro in cui stava è CHIUSO: o se n'è aperto un
// altro (si è rifatto un giorno con un buco prima), o la settimana è passata.
// Un buco nel giro in corso non è perso: lì il "da fare" è ancora lui
// (`statoScheda().giornoCorrente`, "potresti riprendere da C").
//
// ⚠️ Si guarda solo la settimana in corso e quella prima, e solo giri finiti
// da poco (GIORNI_MEMORIA): uno storico di mesi, letto la prima volta con
// questa regola, tirerebbe fuori decine di "saltati" che nessuno ricorda.
// Una settimana in cui non si è fatto niente non conta: è una pausa, non un
// allenamento saltato.
//
// Le scelte stanno nella scheda (`Scheda.saltati`, nei `dati`, come
// `programma`): niente colonne nuove nel database.
//   Scheda.saltati = { [chiave]: { stato: 'posticipato'|'tolto', il: ISO } }
// ---------------------------------------------------------------------------

import { giorniWorkout } from './progression'

/** Per quanti giorni dopo la fine del suo giro un saltato si ricorda ancora. */
export const GIORNI_MEMORIA = 21

/** I giri di una settimana, in ordine (vedi `giroInCorso`): [{ fatti:Set, ultimaData:number }]. */
export function giriDellaSettimana(scheda, settimana, workout = giorniWorkout(scheda)) {
  const posto = new Map(workout.map((g, i) => [g.id, i]))
  const fatti = (scheda.completamenti || [])
    // ⚠️ I recuperi non fanno giro: sono un allenamento di un giro passato.
    .filter((c) => c.settimana === settimana && posto.has(c.giornoId) && !c.recupera)
    .map((c, k) => ({ c, k, t: new Date(c.data || 0).getTime() || 0 }))
    .sort((a, b) => a.t - b.t || a.k - b.k)
  const giri = []
  let giro = null
  for (const { c, t } of fatti) {
    if (giro && giro.fatti.has(c.giornoId)) {
      const ultimo = Math.max(...[...giro.fatti].map((id) => posto.get(id)))
      const buco = workout.some((g, i) => i < ultimo && !giro.fatti.has(g.id))
      if (buco) giro = null
    }
    if (!giro) {
      giro = { fatti: new Set(), ultimaData: 0 }
      giri.push(giro)
    }
    giro.fatti.add(c.giornoId)
    giro.ultimaData = Math.max(giro.ultimaData, t)
  }
  return giri
}

/** La chiave di un saltato: settimana, giro, giorno. */
export function chiaveSaltato(settimana, giro, giornoId) {
  return `${settimana}:${giro}:${giornoId}`
}

/**
 * Gli allenamenti saltati e persi di una scheda, dal più vecchio, con la
 * scelta fatta (`stato`: null = ancora da decidere). Esclusi quelli già
 * recuperati e quelli lasciati perdere.
 * @returns {{chiave:string, settimana:number, giorno:object, stato:null|'posticipato'}[]}
 */
export function saltatiPersi(scheda, ora = Date.now()) {
  if (!scheda || scheda.libera) return []
  const workout = giorniWorkout(scheda)
  if (!workout.length) return []
  const corrente = scheda.settimanaCorrente || 1
  const recuperati = new Set((scheda.completamenti || []).map((c) => c.recupera).filter(Boolean))
  const scelte = scheda.saltati || {}
  const limite = ora - GIORNI_MEMORIA * 86400000
  const out = []
  for (const settimana of [corrente - 1, corrente]) {
    if (settimana < 1) continue
    const giri = giriDellaSettimana(scheda, settimana, workout)
    giri.forEach((giro, i) => {
      const inCorso = settimana === corrente && i === giri.length - 1
      if (inCorso || giro.ultimaData < limite) return
      // Il giro che ha chiuso la settimana: manca tutto quello che non si è
      // fatto. Uno chiuso da un giro nuovo: solo i buchi prima dell'ultimo
      // fatto (quelli dopo non si erano ancora raggiunti).
      const ultimoGiroDellaSettimana = i === giri.length - 1
      const ultimo = Math.max(...workout.map((g, j) => (giro.fatti.has(g.id) ? j : -1)))
      workout.forEach((g, j) => {
        if (giro.fatti.has(g.id)) return
        if (!ultimoGiroDellaSettimana && j > ultimo) return
        const chiave = chiaveSaltato(settimana, i, g.id)
        if (recuperati.has(chiave)) return
        const scelta = scelte[chiave]?.stato || null
        if (scelta === 'tolto') return
        out.push({ chiave, settimana, giorno: g, stato: scelta })
      })
    })
  }
  return out
}

/** La scheda con la scelta fatta su un saltato (`stato` null = da decidere). */
export function conScelta(scheda, chiave, stato) {
  const saltati = { ...(scheda.saltati || {}) }
  if (stato) saltati[chiave] = { stato, il: new Date().toISOString() }
  else delete saltati[chiave]
  return { ...scheda, saltati }
}
