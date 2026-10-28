import { nuovoId, schemaPerSettimana } from '../data/model.js'
import { distanzaStimata, formatDurata, formatParametri, formattaCarico, numeroIt, numeroSerie, obiettivoSerie, ripNumero } from './schema.js'
import { tipoEsercizio } from './eserciziLibreria.js'
import { diRiscaldamento, riscaldamentoInTesta } from './preparazione.js'
import { conPesoUltimaVolta } from './carico.js'

// Numero di serie (set) di un esercizio: la somma delle sue fasi, almeno 1.
export const numeroSet = numeroSerie

/**
 * Una serie chiusa: il colore, e quello che si è FATTO — ripetizioni e kg;
 * per un esercizio a tempo i secondi (`sec`) e i parametri fatti
 * (`parametri`: distanza, velocità… vedi lib/schema PARAMETRI).
 * Se non si dice altro sono quelli del piano (lo schema di quella serie), così
 * chiudere una serie resta un tocco solo; `fatto` li sostituisce (le
 * ripetizioni scritte su una serie dura, un peso corretto dopo).
 * Si scrivono solo se si sanno: "max", il tempo e "12RM" non sono numeri.
 * ⚠️ `kg` è il peso scritto, come nella scheda: due manubri da 20 sono 20
 * (lo schema dice `coppia`, e il volume conta 40).
 * @returns {{ colore: string, rip?: number, kg?: number, sec?: number, parametri?: object }}
 */
export function serieChiusa(schema, j, colore, fatto = {}) {
  const { rip, carico } = obiettivoSerie(schema, j)
  const r = fatto.rip ?? ripNumero(rip)
  const kg = fatto.kg ?? (carico && !Array.isArray(carico) && carico.tipo === 'kg' ? carico.valore : null)
  const sec = fatto.sec ?? (rip && typeof rip === 'object' && 'sec' in rip ? rip.sec : null)
  // Con la velocità e senza la distanza scritta, la distanza è velocità × tempo.
  const stima = fatto.parametri?.distanza == null ? distanzaStimata(fatto.parametri?.velocita, sec) : null
  const parametri = stima != null ? { ...fatto.parametri, distanza: stima } : fatto.parametri
  return {
    colore,
    ...(r != null ? { rip: r } : {}),
    ...(kg != null ? { kg } : {}),
    ...(sec != null ? { sec } : {}),
    ...(parametri ? { parametri } : {}),
  }
}

/**
 * Una serie fatta corretta (`dopo`, il tempo o la velocità cambiati): se la
 * distanza era quella calcolata (serieChiusa) e non la si è toccata, si
 * ricalcola; se era scritta a mano resta.
 */
export function ricalcolaDistanza(prima, dopo) {
  const d = prima.parametri?.distanza
  if (d == null || d !== distanzaStimata(prima.parametri.velocita, prima.sec)) return dopo
  if (dopo.parametri?.distanza !== d) return dopo
  const { distanza: _, ...resto } = dopo.parametri || {}
  const stima = distanzaStimata(resto.velocita, dopo.sec)
  const parametri = stima != null ? { ...resto, distanza: stima } : resto
  const { parametri: __, ...senza } = dopo
  return Object.keys(parametri).length ? { ...senza, parametri } : senza
}

/**
 * Le serie fatte di un esercizio in una riga: "10×80kg · 10×80kg · 8×80kg".
 * Vuota se non c'è niente di registrato (gli allenamenti di prima).
 */
export function testoSerieFatte(esercizio) {
  const fatte = (esercizio?.sets || []).filter((s) => s?.colore)
  // A tempo: "10 min · 2 km", una serie per pezzo.
  if (fatte.some((s) => s.sec != null)) {
    return fatte
      .map((s) => [formatDurata(s.sec), formatParametri(s.parametri)].filter(Boolean).join(' · ') || '✓')
      .join(' · ')
  }
  if (!fatte.some((s) => s.rip != null || s.kg != null)) return ''
  const coppia = (j) => !!obiettivoSerie(esercizio.schema, j).carico?.coppia
  return (esercizio.sets || [])
    .map((s, j) => {
      if (!s?.colore) return null
      const kg = s.kg != null ? formattaCarico({ tipo: 'kg', valore: s.kg, coppia: coppia(j) }) : ''
      const rip = s.rip != null ? numeroIt(s.rip) : ''
      return rip && kg ? `${rip}×${kg}` : rip || kg || '✓'
    })
    .filter(Boolean)
    .join(' · ')
}

// Crea una sessione di allenamento "congelando" lo schema della settimana corrente,
// così il riepilogo/storico resta corretto anche se in futuro modifichi la scheda.
/**
 * @param {{recupera?: string}} [opts]  `recupera`: la chiave di un allenamento
 *   saltato che si sta recuperando (lib/saltati); finisce nel completamento.
 */
export function creaSessione(scheda, giorno, settimana, { recupera, carichi } = {}) {
  return {
    ...(recupera ? { recupera } : {}),
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
    // Riscaldamento e stretching del giorno (lib/preparazione), congelati come
    // lo schema; `spunte` = gli indici delle voci già fatte, per campo.
    riscaldamento: giorno.riscaldamento || '',
    stretching: giorno.stretching || '',
    spunte: { riscaldamento: [], stretching: [] },
    // I cardio di riscaldamento in testa (lib/preparazione).
    esercizi: riscaldamentoInTesta(giorno.esercizi).map((e) => {
      // Il peso di base è quello dell'ultima volta (`carichi`, lib/carico), non
      // quello della scheda: se no ogni settimana si ripartiva dal previsto.
      const schema = conPesoUltimaVolta(e.nome, carichi, schemaPerSettimana(e, settimana))
      return {
        esercizioId: e.id,
        nome: e.nome,
        nota: e.nota,
        gruppo: e.gruppo || '',
        // ⚠️ Anche l'elenco completo: e' quello che il recap e il feed usano per
        // accendere i muscoli. Se non passasse di qui, un dip farebbe il petto e
        // basta, qualunque cosa ci fosse scritto nella scheda.
        gruppi: Array.isArray(e.gruppi) ? e.gruppi : [],
        // I sottogruppi scelti (lib/muscoli): solo se scritti, se no il recap
        // li ricava dal nome come per tutti.
        ...(Array.isArray(e.sottogruppi) ? { sottogruppi: e.sottogruppi } : {}),
        // In superserie col precedente: in allenamento i due diventano una
        // card sola, coi pallini di ciascuno (lib/superserie).
        insiemeAlPrecedente: !!e.insiemeAlPrecedente,
        // Il tipo (116ª): il recap conta i minuti di cardio.
        tipo: tipoEsercizio(e),
        ...(diRiscaldamento(e) ? { riscaldamento: true } : {}),
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
    // La chiave dell'allenamento (lib/fotoAllenamento). Un allenamento ripreso
    // dal riepilogo ("Riprendi") tiene la sua: foto, mi piace e commenti lo
    // ritrovano al nuovo "Termina".
    id: sessione.idAllenamento || nuovoId(),
    schedaId: sessione.schedaId,
    nomeScheda: sessione.nomeScheda,
    settimana: sessione.settimana,
    giornoId: sessione.giornoId,
    nomeGiorno: sessione.nomeGiorno,
    data: fineISO || new Date().toISOString(),
    durataSec,
    nota: sessione.nota || '',
    // C'era il riscaldamento scritto (lib/preparazione): il recap lo può dire.
    ...(String(sessione.riscaldamento || '').trim() ? { riscaldamento: true } : {}),
    // Finito ma non ancora salvato (components/Riepilogo): si toglie scegliendo
    // chi lo vede, dopo "Salva". Finché c'è, l'app lo ricorda (AvvisoDaSalvare).
    daSalvare: true,
    // Il recupero di un allenamento saltato (lib/saltati): non conta nel giro
    // in corso, e chiude il saltato.
    ...(sessione.recupera ? { recupera: sessione.recupera } : {}),
    esercizi: sessione.esercizi.map((e) => ({
      // L'esercizio della scheda da cui viene: i risultati in Excel
      // (lib/schedaExcel) lo ritrovano anche se poi lo si rinomina. Gli
      // allenamenti di prima non ce l'hanno e si ritrovano dal nome.
      ...(e.esercizioId ? { esercizioId: e.esercizioId } : {}),
      nome: e.nome,
      gruppo: e.gruppo || '', // conservato per lo "storico" del consiglio allenamento
      gruppi: Array.isArray(e.gruppi) ? e.gruppi : [],
      ...(Array.isArray(e.sottogruppi) ? { sottogruppi: e.sottogruppi } : {}),
      // Solo se c'è: nel riepilogo e nello storico la superserie si vede,
      // e un `false` su ogni esercizio sarebbe peso per niente.
      ...(e.insiemeAlPrecedente ? { insiemeAlPrecedente: true } : {}),
      ...(e.tipo ? { tipo: e.tipo } : {}),
      // Un cardio di riscaldamento: nel recap sta sotto "Riscaldamento".
      ...(e.riscaldamento ? { riscaldamento: true } : {}),
      schema: e.schema,
      // `rip`: le ripetizioni fatte in una serie chiusa "dura" (🔴), quando
      // le si è scritte (components/ModaleRipetizioni). Solo se ci sono.
      // Il colore, e ripetizioni e kg fatti quando ci sono (serieChiusa).
      sets: e.sets.map((s) => ({
        colore: s.colore,
        ...(s.rip != null ? { rip: s.rip } : {}),
        ...(s.kg != null ? { kg: s.kg } : {}),
        ...(s.sec != null ? { sec: s.sec } : {}),
        ...(s.parametri ? { parametri: s.parametri } : {}),
      })),
    })),
  }
}

export const COLORI = {
  verde: { label: 'Facile', var: 'var(--good)', ink: 'var(--good-ink)' },
  giallo: { label: 'Medio', var: '#f5c542', ink: '#241d00' },
  rosso: { label: 'Duro', var: '#f26d6d', ink: '#2a0808' },
}

/**
 * I secondi fatti di un esercizio a tempo dal suo timer (components/
 * TimerRecupero, TimerEsercizio): `fatti` quelli già messi da parte, `da`
 * l'istante da cui corre (null = fermo).
 */
export function secondiFatti(crono, adesso = Date.now()) {
  if (!crono) return 0
  // ⚠️ Mai meno di zero: il timer disegna con l'`adesso` del suo ultimo tick,
  // che appena premuto play è PRIMA di `da`. Un tempo negativo, nel conto alla
  // rovescia, mostrava per un istante qualche secondo in più della durata.
  return Math.floor((crono.fatti || 0) + (crono.da ? Math.max(0, adesso - crono.da) / 1000 : 0))
}
