// ---------------------------------------------------------------------------
// Cosa c'è sulla card del recap, e in che ordine.
//
// La card (lib/recapImmagine) è fatta a BLOCCHI: data, titolo, le tessere dei
// numeri, i muscoli, gli esercizi, il commento… Chi la manda sceglie quali
// tenere e li sposta su e giù; il layout di partenza è la card di sempre.
//
// Il layout è { ordine: [id], nascosti: [id] }:
//   · `ordine` contiene solo i blocchi che si SPOSTANO;
//   · le OPZIONI (i pallini e lo schema nella lista esercizi, la firma in
//     fondo) non hanno un posto: si accendono e si spengono e basta.
// Si salva sull'allenamento (`Completamento.recap`) e viaggia col recap
// mandato agli amici, così chi lo riceve vede la stessa card.
//
// ⚠️ Un blocco acceso ma senza dato (le calorie mai scritte, i record che non
// ci sono) sulla card non compare lo stesso: acceso vuol dire "se c'è, mettilo".
//
// ⚠️ SPENTI DI BASE (`SPENTI_DI_BASE`): il TITOLO, dalla 54ª, si vede solo se
// lo si accende. Non basta toglierlo da `nascosti` nel layout di partenza:
// tutti i layout salvati prima lo hanno "acceso" senza averlo mai scelto. Per
// questo chi lo accende davvero finisce in `accesi`, e senza quella scelta un
// blocco spento di base resta spento — anche nei layout vecchi e in quelli
// mandati da un amico con l'app non aggiornata.
// ---------------------------------------------------------------------------

/**
 * I blocchi che si spostano, nell'ordine della card di sempre.
 * ⚠️ Dalla 54ª il COMMENTO sta in alto, subito dopo l'intestazione (sono le
 * parole di chi si è allenato, non una nota a piè di pagina), e la DATA in
 * fondo, in basso a sinistra. Vale per i layout mai toccati: chi ha già
 * salvato un suo ordine lo tiene.
 */
export const BLOCCHI_RECAP = [
  { id: 'titolo', label: 'Nome dell’allenamento' },
  { id: 'sottotitolo', label: 'Scheda, settimana e intensità' },
  { id: 'commento', label: 'Commento' },
  { id: 'durata', label: 'Durata' },
  { id: 'volume', label: 'Volume sollevato' },
  { id: 'pesoMax', label: 'Peso massimo' },
  { id: 'calorie', label: 'Calorie' },
  { id: 'conteggi', label: 'Numero di esercizi e serie' },
  { id: 'battito', label: 'Battito' },
  { id: 'corpo', label: 'Muscoli allenati' },
  { id: 'sforzo', label: 'Serie facili, medie e dure' },
  { id: 'record', label: 'Record' },
  { id: 'esercizi', label: 'Esercizi' },
  { id: 'data', label: 'Data' },
]

/** Le opzioni: si accendono e spengono, ma non hanno un posto sulla card. */
export const OPZIONI_RECAP = [
  // Accanto alla data: "9:23–10:33" (lib/recap, orarioAllenamento).
  { id: 'orario', label: 'Orario di inizio e fine', dentro: 'data' },
  { id: 'pallini', label: 'Pallini delle serie', dentro: 'esercizi' },
  {
    id: 'schemaEsercizi',
    label: 'Serie, ripetizioni e carico',
    dentro: 'esercizi',
  },
  { id: 'firma', label: 'Firma in fondo' },
]

/** I blocchi che di base non ci sono: si vedono solo se li si accende. */
export const SPENTI_DI_BASE = ['titolo']

const ID_BLOCCHI = BLOCCHI_RECAP.map((b) => b.id)
const ID_TUTTI = new Set([...ID_BLOCCHI, ...OPZIONI_RECAP.map((o) => o.id)])

/** La card di sempre: tutto acceso tranne gli spenti di base, nell'ordine di sempre. */
export function layoutDefault() {
  return { ordine: [...ID_BLOCCHI], nascosti: [...SPENTI_DI_BASE], accesi: [] }
}

/**
 * Un layout sempre valido, da qualunque cosa arrivi (salvato da una versione
 * vecchia, mandato da un amico, niente del tutto).
 * ⚠️ Un blocco nato dopo che il layout è stato salvato entra ACCESO, subito
 * dopo quello che nella card di sempre gli sta prima: chi non l'ha mai visto
 * non può averlo tolto.
 */
export function normalizzaLayout(l) {
  if (!l || typeof l !== 'object') return layoutDefault()
  const visti = new Set()
  const ordine = (Array.isArray(l.ordine) ? l.ordine : []).filter((id) => {
    if (!ID_BLOCCHI.includes(id) || visti.has(id)) return false
    visti.add(id)
    return true
  })
  ID_BLOCCHI.forEach((id, i) => {
    if (visti.has(id)) return
    const prima = ID_BLOCCHI.slice(0, i)
      .reverse()
      .find((p) => ordine.includes(p))
    ordine.splice(prima ? ordine.indexOf(prima) + 1 : 0, 0, id)
    visti.add(id)
  })
  // Accesi a mano: contano solo per gli spenti di base.
  const accesi = [
    ...new Set((Array.isArray(l.accesi) ? l.accesi : []).filter((id) => SPENTI_DI_BASE.includes(id))),
  ]
  const nascosti = [
    ...new Set([
      ...(Array.isArray(l.nascosti) ? l.nascosti : []).filter(
        (id) => ID_TUTTI.has(id) && !accesi.includes(id),
      ),
      ...SPENTI_DI_BASE.filter((id) => !accesi.includes(id)),
    ]),
  ]
  return { ordine, nascosti, accesi }
}

/** È la card di sempre? Allora non serve salvarla. */
export function eLayoutDefault(l) {
  const n = normalizzaLayout(l)
  return (
    n.accesi.length === 0 &&
    n.nascosti.length === SPENTI_DI_BASE.length &&
    n.ordine.every((id, i) => id === ID_BLOCCHI[i])
  )
}

/** Il blocco (o l'opzione) è acceso? */
export function acceso(l, id) {
  return !normalizzaLayout(l).nascosti.includes(id)
}

/** Accende o spegne un blocco o un'opzione. */
export function alterna(l, id) {
  const n = normalizzaLayout(l)
  if (!ID_TUTTI.has(id)) return n
  const accendo = n.nascosti.includes(id)
  const nascosti = accendo ? n.nascosti.filter((x) => x !== id) : [...n.nascosti, id]
  // Uno spento di base acceso a mano va ricordato, se no tornerebbe spento.
  if (!SPENTI_DI_BASE.includes(id)) return { ...n, nascosti }
  const accesi = accendo ? [...n.accesi, id] : n.accesi.filter((x) => x !== id)
  return { ...n, nascosti, accesi }
}

/** Sposta un blocco di un posto: -1 su, +1 giù. Ai bordi non fa niente. */
export function sposta(l, id, verso) {
  const n = normalizzaLayout(l)
  const i = n.ordine.indexOf(id)
  const j = i + verso
  if (i === -1 || j < 0 || j >= n.ordine.length) return n
  const ordine = [...n.ordine]
  ;[ordine[i], ordine[j]] = [ordine[j], ordine[i]]
  return { ...n, ordine }
}
