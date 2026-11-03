import { nuovoId, schemaPerSettimana } from '../data/model.js'
import { distanzaStimata, formatDurata, formatParametri, formattaCarico, numeroIt, numeroSerie, obiettivoSerie, ripNumero } from './schema.js'
import { tipoEsercizio } from './eserciziLibreria.js'
import { diRiscaldamento, riscaldamentoInTesta } from './preparazione.js'
import { conPesoUltimaVolta } from './carico.js'
import { PRONTI_SEC, circuitoChiuso, esercizioDelMinuto, intervalli, statoOrologio } from './circuiti.js'
import { blocchi } from './superserie.js'

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
        // Il primo di un circuito (lib/circuiti): l'orologio parte da qui
        // (`inizio`) e qui si scrivono i risultati.
        ...(e.circuito ? { circuito: { ...e.circuito } } : {}),
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

// Il circuito coi risultati, senza l'istante di partenza (serve solo in allenamento).
function senzaInizio(circuito) {
  const { inizio: _, ...c } = circuito
  return c
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
  const esercizi = chiudiCircuitiAperti(sessione.esercizi, fine)
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
    esercizi: esercizi.map((e) => ({
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
      ...(e.circuito ? { circuito: senzaInizio(e.circuito) } : {}),
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


/**
 * EMOM e Tabata: a ogni intervallo nuovo l'esercizio di turno ha la sua serie
 * (da dare), se manca — a oltranza, o oltre le 30 della sessione. Fino
 * all'intervallo `intervallo` (da 0) compreso. Niente da aggiungere: la stessa lista.
 */
export function serieCircuitoFinoA(esercizi, blocco, intervallo) {
  const n = blocco.indici.length
  let cambiato = false
  const out = esercizi.map((e, i) => {
    const k = blocco.indici.indexOf(i)
    if (k === -1) return e
    const servono = intervallo >= k ? Math.floor((intervallo - k) / n) + 1 : 0
    if (e.sets.length >= servono) return e
    cambiato = true
    return { ...e, sets: [...e.sets, ...Array.from({ length: servono - e.sets.length }, () => ({ colore: null }))] }
  })
  return cambiato ? out : esercizi
}

/**
 * Fine di un EMOM o di un Tabata (finito, "Ferma", "Non ce la faccio più",
 * "Termina"): valgono i primi `fatti` intervalli, più quello in corso se la
 * sua serie è già valutata. Le serie oltre si tolgono; quelle non date
 * valgono fatte come da piano, senza sforzo (`'fatto'`).
 */
export function chiudiCircuito(esercizi, blocco, fatti) {
  const n = blocco.indici.length
  const { k: kc, j: jc } = esercizioDelMinuto(n, fatti)
  if (esercizi[blocco.indici[kc]]?.sets[jc]?.colore) fatti += 1
  const tutte = fatti > 0 ? serieCircuitoFinoA(esercizi, blocco, fatti - 1) : esercizi
  return tutte.map((e, i) => {
    const k = blocco.indici.indexOf(i)
    if (k === -1) return e
    const quante = fatti > k ? Math.ceil((fatti - k) / n) : 0
    return {
      ...e,
      ...(k === 0 ? { circuito: { ...e.circuito, intervalliFatti: fatti } } : {}),
      sets: e.sets.slice(0, quante).map((s, j) => (s.colore ? s : serieChiusa(e.schema, j, 'fatto'))),
    }
  })
}

/** AMRAP e For time: i giri fatti sono le serie date del primo esercizio. */
export function giriFattiDi(esercizi, blocco) {
  return esercizi[blocco.inizio].sets.filter((s) => s.colore).length
}

/**
 * Giro fatto: a ogni esercizio del blocco la sua serie in più, come da piano,
 * col colore toccato per quel giro.
 */
export function giroFatto(esercizi, blocco, colore = 'fatto') {
  const j = giriFattiDi(esercizi, blocco)
  return esercizi.map((e, i) => {
    if (!blocco.indici.includes(i)) return e
    const sets = [...e.sets]
    while (sets.length <= j) sets.push({ colore: null })
    sets[j] = serieChiusa(e.schema, j, colore)
    return { ...e, sets }
  })
}

/** "Annulla l'ultima" in AMRAP e For time: via l'ultimo giro, da tutti gli esercizi. */
export function annullaGiro(esercizi, blocco) {
  const j = giriFattiDi(esercizi, blocco) - 1
  if (j < 0) return esercizi
  return esercizi.map((e, i) =>
    blocco.indici.includes(i) ? { ...e, sets: e.sets.map((s, x) => (x === j ? { colore: null } : s)) } : e,
  )
}

/**
 * Fine di un AMRAP o di un For time: restano le serie dei giri fatti (quella
 * del giro non finito si toglie), e sul circuito i risultati.
 */
export function chiudiAGiri(esercizi, blocco, { giriFatti, tempoSec = null }) {
  return esercizi.map((e, i) => {
    const k = blocco.indici.indexOf(i)
    if (k === -1) return e
    return {
      ...e,
      ...(k === 0
        ? { circuito: { ...e.circuito, giriFatti, ...(tempoSec != null ? { tempoSec } : {}) } }
        : {}),
      sets: e.sets.slice(0, giriFatti).map((s, j) => (s.colore ? s : serieChiusa(e.schema, j, 'fatto'))),
    }
  })
}

/** Fine AMRAP: le reps del giro non finito sul circuito. */
export function esitoCircuito(esercizi, blocco, ripExtra) {
  if (!ripExtra) return esercizi
  return esercizi.map((e, i) => (i === blocco.inizio ? { ...e, circuito: { ...e.circuito, ripExtra } } : e))
}

/**
 * "Termina" con un circuito ancora in corso: lo si chiude dov'è. EMOM e
 * Tabata: valgono gli intervalli finiti (nel riposo del Tabata quello appena
 * fatto sì). AMRAP e For time: i giri segnati, e il For time il tempo.
 */
export function chiudiCircuitiAperti(esercizi, adesso) {
  let out = esercizi
  for (const b of blocchi(esercizi)) {
    const c = esercizi[b.inizio].circuito
    if (!c || c.tipo === 'giri' || c.inizio == null || circuitoChiuso(c)) continue
    const s = statoOrologio(c, c.inizio, adesso)
    // Ancora ai "Pronti": come mai partito.
    if (s.fase === 'pronti') continue
    if (c.tipo === 'emom' || c.tipo === 'tabata') {
      const fatti = s.finito ? intervalli(c) : s.intervallo + (s.fase === 'riposo' ? 1 : 0)
      out = chiudiCircuito(out, b, fatti ?? s.intervallo)
    } else {
      const tempoSec = Math.max(0, Math.floor((adesso - c.inizio) / 1000) - PRONTI_SEC)
      out = chiudiAGiri(out, b, { giriFatti: giriFattiDi(out, b), ...(c.tipo === 'fortime' ? { tempoSec } : {}) })
    }
  }
  return out
}
