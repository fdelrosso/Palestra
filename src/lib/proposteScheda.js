import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { normalizzaScheda } from '../data/model'
import { cambiScheda } from './cambiScheda'
import { allegatoNuovo, conAllegatiDelPt, conAllungamento, conParteNuova, divisibileAParti, parteDopoAllungamento, taglioScheda } from './schedaAParti'

// ---------------------------------------------------------------------------
// La scheda dal PT: il PT la scrive nell'app e la manda a un suo atleta come
// PROPOSTA; l'atleta la salva fra le sue schede (non attiva) o la rifiuta.
// Le regole stanno nel database (`schede_proposte`, `proponi_scheda`,
// `rispondi_proposta`, `ritira_proposta` in schema.sql): qui le porte, con gli
// errori in italiano, e la copia della scheda per l'atleta.
//
// Stati: 'attesa' · 'accettata' · 'rifiutata' · 'ritirata' (dal PT).
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/non è un tuo atleta/i.test(m)) return 'Non lo segui più: la scheda non parte.'
  if (/troppo grande/i.test(m)) return 'La scheda è troppo grande per essere mandata.'
  if (/nessuna proposta|nessuna richiesta/i.test(m)) return 'È già stata decisa: ricarica.'
  if (/scadenza non valida/i.test(m)) return 'La scadenza va messa da domani in poi.'
  if (/non è ancora scaduta/i.test(m)) return 'La scheda non è ancora scaduta.'
  if (/nessuna proposta da aggiornare/i.test(m)) return 'Questa scheda non si può più aggiornare: ricarica.'
  if (/allungamento già chiesto/i.test(m)) return 'L’hai già chiesto: aspetta la risposta.'
  if (/senza fine non si allunga/i.test(m)) return 'Una scheda senza fine non si allunga.'
  if (/nessuna scheda da allungare|non è più fra le sue/i.test(m)) return 'Questa scheda non si può allungare.'
  if (/settimane non valide/i.test(m)) return 'Le settimane devono essere più di prima.'
  if (/già chiesto/i.test(m)) return 'Il rinnovo l’hai già chiesto: aspetta la risposta.'
  if (/non è più il tuo pt/i.test(m)) return 'Non è più il tuo PT: la richiesta non parte.'
  if (/nessuna scheda da rinnovare/i.test(m)) return 'Questa scheda non si può rinnovare.'
  if (/parti non valide|nessuna proposta a parti/i.test(m)) return 'Queste settimane non si possono sbloccare: ricarica.'
  if (/schede_proposte|proponi_scheda|rispondi_proposta|ritira_proposta|rinnov|allungament|allegati_proposta/i.test(m))
    return 'Il database non è ancora aggiornato per le schede dal PT.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

// Quello che viaggia: la scheda come la scriverebbe l'atleta, ma pulita da
// tutto ciò che è del PT (completamenti, settimana, attiva, archivio).
function perIlViaggio(scheda) {
  const {
    completamenti: _c,
    attiva: _a,
    archiviata: _ar,
    archiviataIl: _ai,
    visibilita: _v,
    ...resto
  } = scheda
  return { ...resto, nome: (scheda.nome || '').trim() || 'Scheda senza nome', settimanaCorrente: 1, libera: false }
}

/**
 * Il PT manda la scheda all'atleta. → { ok, id?, errore }
 * `scadeIl` ('AAAA-MM-GG', lib/scadenza): da quel giorno l'atleta può
 * chiedere il rinnovo (vedi più giù).
 */
// `passo` (settimane): la scheda va A PARTI (lib/schedaAParti), all'atleta
// arrivano le prime `passo` e le altre le sblocca il PT (sbloccaSettimane).
export async function proponiScheda(atletaId, scheda, nota = '', scadeIl = null, passo = null) {
  const intera = perIlViaggio(scheda)
  const parametri = { p_atleta: atletaId, p_dati: intera, p_nota: nota.trim() }
  let esito
  if (scadeIl && passo && divisibileAParti(intera, passo)) {
    esito = await supabase.rpc('proponi_scheda_a_parti', {
      ...parametri,
      p_dati: taglioScheda(intera, passo),
      p_intera: intera,
      p_scade: scadeIl,
      p_visibili: passo,
      p_totali: intera.numeroSettimane,
    })
  } else if (scadeIl) {
    esito = await supabase.rpc('proponi_scheda_scadenza', { ...parametri, p_scade: scadeIl })
  } else {
    esito = await supabase.rpc('proponi_scheda', parametri)
  }
  const { data, error } = esito
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/** La scheda intera di una proposta a parti (la legge solo il PT), o null. */
async function schedaIntera(propostaId) {
  const { data, error } = await supabase.from('schede_proposte_intere').select('dati').eq('proposta_id', propostaId).maybeSingle()
  return error ? null : data?.dati || null
}

/**
 * Il PT sblocca le settimane fino alla `fino`, e se vuole sposta la
 * scadenza (`scadeIl`, il mese pagato). All'atleta arriva la scheda tagliata
 * lì: la sua copia si allunga da sola (aggiornaPartiSbloccate).
 */
export async function sbloccaSettimane(propostaId, fino, scadeIl = null) {
  const intera = await schedaIntera(propostaId)
  if (!intera) return { ok: false, errore: 'La scheda intera non si trova: ricarica.' }
  const { error } = await supabase.rpc('sblocca_settimane', {
    p_id: propostaId,
    p_dati: taglioScheda(intera, fino),
    p_visibili: fino,
    p_scade: scadeIl || null,
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/**
 * Per l'atleta: le schede arrivate a parti che il PT ha allungato da quando
 * le ha sul telefono. → [{ scheda (la mia, già allungata) }] da salvare.
 */
export async function partiSbloccate(mieSchede) {
  const aParti = (mieSchede || []).filter((s) => s.daPt?.propostaId && s.daPt?.settimaneTotali)
  if (!aParti.length) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('id, settimane_visibili')
    .in('id', aParti.map((s) => s.daPt.propostaId))
  if (error) return []
  const nuove = (data || []).filter((r) => {
    const s = aParti.find((x) => x.daPt.propostaId === r.id)
    return r.settimane_visibili > (s.daPt.settimaneVisibili || 0)
  })
  if (!nuove.length) return []
  const piene = await supabase.from('schede_proposte').select('id, dati, settimane_visibili').in('id', nuove.map((r) => r.id))
  if (piene.error) return []
  return (piene.data || []).map((r) => {
    const mia = aParti.find((x) => x.daPt.propostaId === r.id)
    return normalizzaScheda(conParteNuova(mia, r.dati, r.settimane_visibili))
  })
}

/** Il PT ritira una proposta ancora in attesa. */
export async function ritiraProposta(id) {
  const { error } = await supabase.rpc('ritira_proposta', { p_id: id })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** L'atleta risponde. Con `accetto` la copia fra le schede la fa chi chiama (schedaDaProposta). */
export async function rispondiProposta(id, accetto) {
  const { error } = await supabase.rpc('rispondi_proposta', { p_id: id, p_accetto: accetto })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

const daRiga = (r) => ({
  id: r.id,
  ptId: r.pt_id,
  atletaId: r.atleta_id,
  nome: r.nome,
  nota: r.nota || '',
  dati: r.dati || null,
  stato: r.stato,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
  scadeIl: r.scade_il || null,
  // Il nome dell'atleta all'invio: resta anche quando non lo si segue più
  // (migrazione 20261028170000).
  atletaNome: r.atleta_nome || '',
  // A parti (lib/schedaAParti): quante se ne vedono, su quante. Null = intera.
  settimaneVisibili: r.settimane_visibili ?? null,
  settimaneTotali: r.settimane_totali ?? null,
  settimanePasso: r.settimane_passo ?? null,
})

/** Le proposte in attesa per me, atleta (con la scheda dentro). */
export async function proposteInArrivo(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('*')
    .eq('atleta_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: false })
  if (error) {
    console.warn('Lettura delle schede dal PT non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/** Le proposte che ho mandato io, PT (senza la scheda: per gli elenchi). */
export async function proposteMandate(ioId) {
  if (!ioId) return []
  const leggi = (colonne) =>
    supabase.from('schede_proposte').select(colonne).eq('pt_id', ioId).order('creata_il', { ascending: false }).limit(200)
  const COLONNE = 'id, pt_id, atleta_id, nome, nota, stato, creata_il, risposta_il'
  let { data, error } = await leggi(COLONNE + ', scade_il, settimane_visibili, settimane_totali, settimane_passo, atleta_nome')
  // Database senza la scadenza (migrazione 20261028130000 non lanciata).
  if (error) ({ data, error } = await leggi(COLONNE))
  if (error) {
    console.warn('Lettura delle schede mandate non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/**
 * La scheda da salvare fra quelle dell'atleta. L'id è quello della proposta
 * (prefisso `pt-`): accettarla due volte, da due telefoni, non la duplica.
 * Nasce "solo al PT": chi l'ha scritta deve poter vedere come va.
 */
export function schedaDaProposta(proposta, nomePt = '') {
  return normalizzaScheda({
    ...proposta.dati,
    id: 'pt-' + proposta.id,
    completamenti: [],
    settimanaCorrente: 1,
    libera: false,
    attiva: false,
    visibilita: 'solo-pt',
    creataIl: new Date().toISOString(),
    daPt: {
      id: proposta.ptId,
      nome: nomePt,
      propostaId: proposta.id,
      // A parti: quante settimane si vedono, su quante (partiSbloccate).
      ...(proposta.settimaneTotali
        ? { settimaneVisibili: proposta.settimaneVisibili, settimaneTotali: proposta.settimaneTotali }
        : {}),
    },
  })
}

// La bozza di una scheda per un atleta fra una pagina e l'altra (Incolla
// testo, o "parti da una tua scheda" → editor). In sessionStorage: regge un
// ricaricamento, non sopravvive alla chiusura.
const CHIAVE_BOZZA = 'palestra:bozza-per-atleta'
// Al posto dell'atleta: la bozza va fra le schede di lavoro (SchedaLavoroPage).
export const BOZZA_LAVORO = '__lavoro'
// Al posto dell'atleta: una scheda nuova di chi la scrive (EditorPage senza id).
export const BOZZA_MIA = '__mia'

// `daLavoroId`: la scheda di lavoro da cui parte (lib/schedeLavoro). Mandata
// la proposta, quella si toglie: da lì in poi è fra le inviate.
// `controllo`: una bozza letta da un testo (ImportPage) porta con sé quello da
// guardare nell'editor — { problemi, daControllare: id[], testo, nome }.
// `allunga`: la bozza è una scheda già mandata da allungare, su richiesta
// dell'atleta — { richiestaId, propostaId, settimanePrima, visibili, totali }
// (vedi più giù, L'ALLUNGAMENTO). Con `modo: 'modifica'` e `prima` (la
// scheda com'era) è invece il PT che la cambia di sua iniziativa (LA MODIFICA).
export function salvaBozzaPerAtleta(atletaId, scheda, daLavoroId = null, controllo = null, allunga = null) {
  try {
    sessionStorage.setItem(CHIAVE_BOZZA, JSON.stringify({ atletaId, scheda, daLavoroId, controllo, allunga }))
  } catch {
    /* senza sessionStorage si riparte da zero */
  }
}

export function prendiBozzaPerAtleta(atletaId) {
  try {
    // Non si cancella leggendo: in sviluppo React chiama due volte chi
    // prepara lo stato iniziale. La sovrascrive chi porta all'editor
    // (anche con null, per "da zero").
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.scheda : null
  } catch {
    return null
  }
}

/** Il `controllo` di una bozza letta da un testo, o null. */
export function controlloDellaBozza(atletaId) {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.controllo || null : null
  } catch {
    return null
  }
}

/** L'allungamento a cui risponde la bozza di questo atleta, o null. */
export function allungamentoDellaBozza(atletaId) {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.allunga || null : null
  } catch {
    return null
  }
}

/** La scheda di lavoro da cui parte la bozza di questo atleta, o null. */
export function lavoroDellaBozza(atletaId) {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHIAVE_BOZZA) || 'null')
    return v && v.atletaId === atletaId ? v.daLavoroId || null : null
  } catch {
    return null
  }
}

/** Una proposta mandata da me, con la scheda dentro (per riguardarla o rimandarla). */
export async function propostaCompleta(id) {
  const { data, error } = await supabase.from('schede_proposte').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  // A parti: al PT serve quella intera, non il pezzo che vede l'atleta.
  const intera = data.settimane_totali ? await schedaIntera(id) : null
  return daRiga(intera ? { ...data, dati: intera } : data)
}

// ---------------------------------------------------------------------------
// LA SCADENZA E IL RINNOVO (2026-10-28). La scadenza sta sulla proposta
// (`schede_proposte.scade_il`); la scheda dell'atleta la ritrova da
// `daPt.propostaId`. Scaduta, l'atleta chiede il rinnovo (`chiedi_rinnovo`),
// il PT accetta con una data nuova o rifiuta (`rispondi_rinnovo`): tabella
// `rinnovi_scheda`, migrazione 20261028130000.
// ---------------------------------------------------------------------------

const daRigaRinnovo = (r) => ({
  id: r.id,
  propostaId: r.proposta_id,
  ptId: r.pt_id,
  atletaId: r.atleta_id,
  nota: r.nota || '',
  stato: r.stato,
  risposta: r.risposta || '',
  nuovaScadenza: r.nuova_scadenza || null,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
})

/**
 * La scadenza di una scheda arrivata dal PT, e l'ultima richiesta di
 * rinnovo. → { scadeIl, ptId, rinnovo } o null (senza scadenza, o database
 * non aggiornato).
 */
export async function scadenzaDellaScheda(propostaId) {
  if (!propostaId) return null
  const [p, r] = await Promise.all([
    supabase.from('schede_proposte').select('id, pt_id, scade_il').eq('id', propostaId).maybeSingle(),
    supabase
      .from('rinnovi_scheda')
      .select('*')
      .eq('proposta_id', propostaId)
      .order('creata_il', { ascending: false })
      .limit(1),
  ])
  if (p.error || !p.data?.scade_il) return null
  return { scadeIl: p.data.scade_il, ptId: p.data.pt_id, rinnovo: r.data?.[0] ? daRigaRinnovo(r.data[0]) : null }
}

/** L'atleta chiede il rinnovo di una scheda scaduta. → { ok, rinnovo?, errore } */
export async function chiediRinnovo(propostaId, nota = '') {
  const { data, error } = await supabase.rpc('chiedi_rinnovo', { p_proposta: propostaId, p_nota: nota.trim() })
  if (error) return { ok: false, errore: errore(error) }
  return {
    ok: true,
    errore: '',
    rinnovo: { id: data, propostaId, nota: nota.trim(), stato: 'attesa', risposta: '', creataIl: new Date().toISOString() },
  }
}

/** Il PT risponde: sì con la data nuova ('AAAA-MM-GG'), o no. */
export async function rispondiRinnovo(id, accetto, scadenza = null, risposta = '') {
  const { error } = await supabase.rpc('rispondi_rinnovo', {
    p_id: id,
    p_accetto: accetto,
    p_scadenza: accetto ? scadenza : null,
    p_risposta: risposta.trim(),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/** Le richieste di rinnovo che aspettano me, PT, col nome della scheda. */
export async function rinnoviDaDecidere(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('rinnovi_scheda')
    .select('*, schede_proposte(nome, scade_il)')
    .eq('pt_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: true })
  if (error) {
    if (!/rinnovi_scheda/i.test(error.message || '')) console.warn('Lettura dei rinnovi non riuscita', error.message)
    return []
  }
  return (data || []).map((r) => ({
    ...daRigaRinnovo(r),
    nome: r.schede_proposte?.nome || 'Scheda',
    scadeIl: r.schede_proposte?.scade_il || null,
  }))
}

// ---------------------------------------------------------------------------
// L'ALLUNGAMENTO (2026-10-28). L'atleta chiede al PT di allungare la scheda
// (`chiedi_allungamento`); il PT dice no, o la riapre nell'editor, aggiunge
// le settimane e scrive gli esercizi, e la rimanda (`rispondi_allungamento`).
// Sul telefono dell'atleta la copia si aggiorna da sola
// (allungamentiArrivati). Tabella `allungamenti_scheda`, migrazione
// 20261028180000.
// ---------------------------------------------------------------------------

const daRigaAllungamento = (r) => ({
  id: r.id,
  propostaId: r.proposta_id,
  ptId: r.pt_id,
  atletaId: r.atleta_id,
  nota: r.nota || '',
  stato: r.stato,
  risposta: r.risposta || '',
  settimaneAggiunte: r.settimane_aggiunte ?? null,
  creataIl: r.creata_il,
  rispostaIl: r.risposta_il,
})

/** L'ultima richiesta di allungamento di una scheda, o null. */
export async function ultimoAllungamento(propostaId) {
  if (!propostaId) return null
  const { data, error } = await supabase
    .from('allungamenti_scheda')
    .select('*')
    .eq('proposta_id', propostaId)
    .order('creata_il', { ascending: false })
    .limit(1)
  return error || !data?.[0] ? null : daRigaAllungamento(data[0])
}

/** L'atleta chiede di allungare la scheda. → { ok, allungamento?, errore } */
export async function chiediAllungamento(propostaId, nota = '') {
  const { data, error } = await supabase.rpc('chiedi_allungamento', { p_proposta: propostaId, p_nota: nota.trim() })
  if (error) return { ok: false, errore: errore(error) }
  return {
    ok: true,
    errore: '',
    allungamento: { id: data, propostaId, nota: nota.trim(), stato: 'attesa', risposta: '', creataIl: new Date().toISOString() },
  }
}

/** Le richieste di allungamento che aspettano me, PT, col nome della scheda. */
export async function allungamentiDaDecidere(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('allungamenti_scheda')
    .select('*, schede_proposte(nome)')
    .eq('pt_id', ioId)
    .eq('stato', 'attesa')
    .order('creata_il', { ascending: true })
  if (error) {
    if (!/allungamenti_scheda/i.test(error.message || '')) console.warn('Lettura degli allungamenti non riuscita', error.message)
    return []
  }
  return (data || []).map((r) => ({ ...daRigaAllungamento(r), nome: r.schede_proposte?.nome || 'Scheda' }))
}

/** Il PT dice no, con un messaggio se vuole. */
export async function rifiutaAllungamento(id, risposta = '') {
  const { error } = await supabase.rpc('rispondi_allungamento', { p_id: id, p_accetto: false, p_risposta: risposta.trim() })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/**
 * Il PT accetta: `scheda` è quella allungata (dall'editor), `allunga` quello
 * salvato con la bozza. All'atleta arriva tagliata se c'erano settimane
 * ancora da sbloccare (lib/schedaAParti → parteDopoAllungamento).
 */
export async function accettaAllungamento(allunga, scheda, scadeIl = null, risposta = '') {
  const intera = perIlViaggio(scheda)
  const { visibili, dati } = parteDopoAllungamento(intera, allunga.visibili, allunga.totali)
  const { error } = await supabase.rpc('rispondi_allungamento', {
    p_id: allunga.richiestaId,
    p_accetto: true,
    p_intera: intera,
    p_dati: dati,
    p_totali: intera.numeroSettimane,
    p_visibili: visibili,
    p_scade: scadeIl || null,
    p_risposta: risposta.trim(),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' }
}

/**
 * Per l'atleta: le schede del PT allungate da quando le ha sul telefono.
 * → le sue schede già aggiornate, da salvare.
 */
export async function allungamentiArrivati(mieSchede) {
  const dalPt = (mieSchede || []).filter((s) => s.daPt?.propostaId)
  if (!dalPt.length) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('id, allungata_il')
    .in('id', dalPt.map((s) => s.daPt.propostaId))
    .not('allungata_il', 'is', null)
  if (error || !data?.length) return []
  const nuove = data.filter((r) => {
    const s = dalPt.find((x) => x.daPt.propostaId === r.id)
    return !s.daPt.allungataIl || new Date(r.allungata_il) > new Date(s.daPt.allungataIl)
  })
  if (!nuove.length) return []
  const piene = await supabase
    .from('schede_proposte')
    .select('id, dati, settimane_visibili, settimane_totali, allungata_il')
    .in('id', nuove.map((r) => r.id))
  if (piene.error) return []
  return (piene.data || []).map((r) => {
    const mia = dalPt.find((x) => x.daPt.propostaId === r.id)
    return normalizzaScheda(
      conAllungamento(mia, r.dati, { visibili: r.settimane_visibili, totali: r.settimane_totali, allungataIl: r.allungata_il }),
    )
  })
}

// ---------------------------------------------------------------------------
// GLI ALLEGATI DEL PT SUGLI ESERCIZI (2026-10-28): video, foto e consigli
// scritti (`esercizio.media` / `esercizio.commenti`, components/
// EsercizioAllegati). Messi nell'editor viaggiano con la scheda; aggiunti
// dopo l'invio passano da `aggiorna_allegati_proposta`, che all'atleta che
// l'ha già salvata lascia la notifica (quale esercizio, in quale giorno).
// Migrazione 20261028190000.
// ---------------------------------------------------------------------------

/**
 * Il PT cambia gli allegati di un esercizio di una scheda mandata
 * (`esercizio` con i suoi `media` e `commenti` nuovi). → { ok, errore }
 */
export async function aggiornaAllegatiProposta(propostaId, giornoId, esercizio, ptId) {
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('dati, settimane_totali')
    .eq('id', propostaId)
    .maybeSingle()
  if (error || !data?.dati) return { ok: false, errore: error ? errore(error) : 'La scheda non si trova: ricarica.' }
  const intera = data.settimane_totali ? await schedaIntera(propostaId) : null
  const metti = (scheda) =>
    scheda && {
      ...scheda,
      giorni: (scheda.giorni || []).map((g) =>
        g.id !== giornoId
          ? g
          : {
              ...g,
              esercizi: (g.esercizi || []).map((e) =>
                e.id === esercizio.id ? { ...e, media: esercizio.media || [], commenti: esercizio.commenti || [] } : e,
              ),
            },
      ),
    }
  const dati = metti(data.dati)
  const nuovo = allegatoNuovo(data.dati, dati, ptId)
  const { error: e2 } = await supabase.rpc('aggiorna_allegati_proposta', {
    p_id: propostaId,
    p_dati: dati,
    p_intera: metti(intera),
    p_giorno: nuovo?.giorno || '',
    p_esercizio: nuovo?.esercizio || '',
    p_cosa: nuovo?.cosa || '',
  })
  return e2 ? { ok: false, errore: errore(e2) } : { ok: true, errore: '' }
}

/**
 * Per l'atleta: le schede del PT con allegati cambiati da quando le ha sul
 * telefono. → le sue schede già aggiornate, da salvare.
 */
export async function allegatiArrivati(mieSchede) {
  const dalPt = (mieSchede || []).filter((s) => s.daPt?.propostaId)
  if (!dalPt.length) return []
  const { data, error } = await supabase
    .from('schede_proposte')
    .select('id, allegati_il')
    .in('id', dalPt.map((s) => s.daPt.propostaId))
    .not('allegati_il', 'is', null)
  if (error || !data?.length) return []
  const nuove = data.filter((r) => {
    const s = dalPt.find((x) => x.daPt.propostaId === r.id)
    return !s.daPt.allegatiIl || new Date(r.allegati_il) > new Date(s.daPt.allegatiIl)
  })
  if (!nuove.length) return []
  const piene = await supabase.from('schede_proposte').select('id, dati, allegati_il').in('id', nuove.map((r) => r.id))
  if (piene.error) return []
  return (piene.data || []).map((r) => {
    const mia = dalPt.find((x) => x.daPt.propostaId === r.id)
    const s = conAllegatiDelPt(mia, r.dati || {}, mia.daPt.id)
    return normalizzaScheda({ ...s, daPt: { ...mia.daPt, allegatiIl: r.allegati_il } })
  })
}

// ---------------------------------------------------------------------------
// LA MODIFICA (2026-10-28). Il PT cambia quando vuole una scheda mandata: la
// riapre nell'editor (bozza con `allunga.modo = 'modifica'`), la rimanda
// (`modifica_proposta`), e all'atleta che l'ha già salvata arriva la notifica
// con cosa è cambiato (lib/cambiScheda). Sul suo telefono la scheda si
// aggiorna come dopo un allungamento (allungamentiArrivati). Migrazione
// 20261028210000.
// ---------------------------------------------------------------------------

/**
 * Prepara l'editor sulla scheda mandata, com'è adesso (intera, se a parti).
 * → { ok, errore } ; con ok si va a routes.schedaPerAtleta(atletaId).
 */
export async function preparaModifica(proposta) {
  const p = await propostaCompleta(proposta.id)
  if (!p?.dati) return { ok: false, errore: 'La scheda non si trova: ricarica.' }
  const scheda = { ...p.dati, nome: p.dati.nome || p.nome }
  salvaBozzaPerAtleta(p.atletaId, scheda, null, null, {
    modo: 'modifica',
    propostaId: p.id,
    prima: scheda,
    visibili: p.settimaneVisibili || null,
    totali: p.settimaneTotali || null,
    nome: p.nome,
  })
  return { ok: true, errore: '' }
}

/** Il PT rimanda la scheda cambiata. → { ok, cambi, errore } */
export async function modificaProposta(modifica, scheda, nota = '') {
  const intera = perIlViaggio(scheda)
  const cambi = cambiScheda(modifica.prima, intera)
  if (!cambi.length && !nota.trim()) return { ok: false, cambi, errore: 'Non hai cambiato niente.' }
  let dati = intera
  let totali = null
  let visibili = null
  if (modifica.totali) {
    totali = intera.senzaFine ? modifica.totali : intera.numeroSettimane
    visibili = Math.min(modifica.visibili || totali, totali)
    if (visibili < totali) dati = taglioScheda(intera, visibili)
  }
  const { error } = await supabase.rpc('modifica_proposta', {
    p_id: modifica.propostaId,
    p_intera: intera,
    p_dati: dati,
    p_totali: totali,
    p_visibili: visibili,
    p_cambi: cambi.join('\n'),
    p_nota: nota.trim(),
  })
  return error ? { ok: false, cambi, errore: errore(error) } : { ok: true, cambi, errore: '' }
}
