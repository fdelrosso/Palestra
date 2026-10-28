import { messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// Le palestre: cercarle (Cerca → Palestre) e vederle sulla mappa. L'elenco sta nella tabella `palestre` (migrazione
// 20261027120000_palestre.sql) e lo scrivono solo gli script di import: da qui
// si legge e basta. Quale e' la TUA lo dice `profili.palestra_id`, che si
// scrive da AccountContext (`scegliPalestra`), come gli altri campi del profilo.
//
// ⚠️ Si cerca sul server, non scaricando l'elenco: sono migliaia di righe, e
// ogni apertura di Cerca costerebbe centinaia di KB di egress.
// ---------------------------------------------------------------------------

const daRiga = (r) => ({
  id: r.id,
  nome: r.nome,
  comune: r.comune || '',
  provincia: r.provincia || '',
  indirizzo: r.indirizzo || '',
  lat: r.lat,
  lon: r.lon,
})

async function chiama(funzione, argomenti) {
  const { data, error } = await supabase.rpc(funzione, argomenti)
  if (error) {
    console.warn(`${funzione} fallita`, error.message)
    return { ok: false, palestre: [], errore: messaggioErrore(error) }
  }
  return { ok: true, palestre: (data || []).map(daRiga), errore: '' }
}

/** Per nome, comune o sigla della provincia ("crossfit firenze", "fi"). */
export function cercaPalestre(chiave) {
  const q = String(chiave || '').trim()
  // Il database si ferma comunque sotto i 2.
  if (q.length < 2) return Promise.resolve({ ok: true, palestre: [], errore: '' })
  return chiama('cerca_palestre', { chiave: q })
}

/** Quelle nel pezzo di mappa che si guarda (al massimo 300). */
export function palestreNelRiquadro({ sud, ovest, nord, est }) {
  return chiama('palestre_nel_riquadro', { sud, ovest, nord, est })
}

/**
 * Da lontano: una bolla per zona (`livello`: 'regione' | 'provincia' |
 * 'comune'), per le zone con almeno una palestra nella vista, contate intere.
 * Ogni gruppo: { zona, quante, lat, lon, riquadro, palestra } — `palestra`
 * c'è solo quando nella zona ce n'è una sola.
 */
export async function palestrePerZona(livello, { sud, ovest, nord, est }) {
  const { data, error } = await supabase.rpc('palestre_per_zona', { livello, sud, ovest, nord, est })
  if (error) {
    console.warn('palestre_per_zona fallita', error.message)
    return { ok: false, gruppi: [], errore: messaggioErrore(error) }
  }
  const gruppi = (data || []).map((r) => ({
    zona: r.zona,
    quante: r.quante,
    lat: r.lat,
    lon: r.lon,
    riquadro: { sud: r.g_sud, ovest: r.g_ovest, nord: r.g_nord, est: r.g_est },
    palestra: r.quante === 1 ? daRiga(r) : null,
  }))
  return { ok: true, gruppi, errore: '' }
}

/**
 * Il feed "Palestra": gli id di chi si allena nella mia zona e ha qualcosa di
 * pubblico. `zona`: { modo: 'comune' } o { modo: 'km', km }. Senza la mia
 * palestra, nessuno.
 */
export async function personeDellaMiaZona({ modo, km }) {
  const { data, error } = await supabase.rpc('persone_della_mia_zona', { modo, km: km ?? null })
  if (error) {
    console.warn('persone_della_mia_zona fallita', error.message)
    return { ok: false, ids: [], errore: messaggioErrore(error) }
  }
  return { ok: true, ids: (data || []).map((r) => (typeof r === 'string' ? r : r.persone_della_mia_zona)), errore: '' }
}

/**
 * La palestra di una persona, per il suo profilo (pages/UtentePage), o null.
 * Il database la dà solo se è approvata, chi la ha non l'ha nascosta
 * (`mostra_palestra`) e non siete bloccati; la propria sempre.
 */
export async function palestraDi(utenteId) {
  if (!utenteId) return null
  const r = await chiama('palestra_di', { p_id: utenteId })
  return r.palestre[0] || null
}

/** Una sola, per id: la mia, quando c'è. */
export async function palestraDaId(id) {
  if (!id) return null
  const { data, error } = await supabase
    .from('palestre')
    .select('id, nome, comune, provincia, indirizzo, lat, lon')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.warn('Palestra non letta', error.message)
    return null
  }
  return data ? daRiga(data) : null
}

/**
 * La riga sotto il nome: "Via Volturno · Milano (MI)". Senza indirizzo solo il
 * luogo, senza niente ''.
 */
export function luogoPalestra(p) {
  const luogo = p?.comune ? (p.provincia ? `${p.comune} (${p.provincia})` : p.comune) : ''
  return [p?.indirizzo, luogo].filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------------------
// Aggiungere la propria palestra, quando non c'è (components/AggiungiPalestra;
// migrazione 20261028120000_palestre_aggiunte.sql). Due strade:
//   - fra le CANDIDATE, i luoghi di Overture che sulla mappa non ci sono:
//     scelta una, diventa una palestra per tutti;
//   - col PIN, dopo aver cercato l'indirizzo (Photon, qui sotto): resta da
//     confermare, la vede solo chi l'ha messa finché un altro non la sceglie.
// In tutte e due la palestra torna indietro, e la si mette sul profilo con
// scegliPalestra, come una trovata sulla mappa.
// ---------------------------------------------------------------------------

/** Fra le candidate, per nome, comune o sigla della provincia. */
export function cercaCandidate(chiave) {
  const q = String(chiave || '').trim()
  if (q.length < 2) return Promise.resolve({ ok: true, palestre: [], errore: '' })
  return chiama('cerca_candidate', { chiave: q })
}

/** La candidata diventa una palestra: { ok, palestra, errore }. */
export async function aggiungiDaCandidata(id) {
  const r = await chiama('aggiungi_da_candidata', { p_id: id })
  return { ok: r.ok && !!r.palestre[0], palestra: r.palestre[0] || null, errore: r.errore || (r.ok ? 'Palestra non trovata.' : '') }
}

/**
 * Col pin. Se lì vicino (~50 m) ce n'è già qualcuna torna `esistenti` e non
 * aggiunge niente: si chiede "È una di queste?", e con `ancheSeVicine` si
 * aggiunge lo stesso. → { ok, palestra, esistenti, errore }
 */
export async function aggiungiPalestra({ nome, lat, lon, indirizzo, ancheSeVicine = false }) {
  const { data, error } = await supabase.rpc('aggiungi_palestra', {
    p_nome: nome,
    p_lat: lat,
    p_lon: lon,
    p_indirizzo: indirizzo || null,
    anche_se_vicine: ancheSeVicine,
  })
  if (error) {
    console.warn('aggiungi_palestra fallita', error.message)
    return { ok: false, palestra: null, esistenti: [], errore: messaggioErrore(error) }
  }
  const righe = data || []
  const esistenti = righe.filter((r) => r.esistente).map(daRiga)
  return { ok: true, palestra: esistenti.length ? null : righe[0] ? daRiga(righe[0]) : null, esistenti, errore: '' }
}

// Photon (komoot): la ricerca degli indirizzi di OpenStreetMap, gratis e
// senza chiave. Il server pubblico è per poco traffico: si chiede solo
// scrivendo l'indirizzo di una palestra da aggiungere, mai altro.
const PHOTON = 'https://photon.komoot.io/api/'
// [ovest, sud, est, nord]: l'Italia.
const ITALIA = '6.6,35.4,18.6,47.1'
export const CREDITI_INDIRIZZI = 'Indirizzi: Photon di komoot, © OpenStreetMap'
// Lo zoom da cui il pin è abbastanza preciso (si vedono i palazzi): prima
// "Aggiungi" non lo salva. Qui e non in MappaPalestre, che si carica lazy.
export const ZOOM_PIN = 16

/**
 * Un risultato di Photon come lo usa "Aggiungi": `indirizzo` è quello che si
 * salva ("Via Roma 12"), `luogo` quello che si legge sotto ("Prato (PO)" o la
 * provincia per esteso, che Photon dà così).
 */
export function daPhoton(f) {
  const p = f?.properties || {}
  const [lon, lat] = f?.geometry?.coordinates || []
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const via = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : p.type === 'street' ? p.name : ''
  const citta = p.city || p.town || p.village || (p.type === 'city' ? p.name : '') || ''
  const titolo = via || p.name || citta
  if (!titolo) return null
  // "Prato, Prato" no: il comune che ha il nome della provincia una volta sola.
  const area = p.county || p.state || ''
  const luogo = [...new Set([citta !== titolo ? citta : '', area !== citta ? area : ''])].filter(Boolean).join(', ')
  return { titolo, luogo, indirizzo: via, lat, lon }
}

/** Gli indirizzi in Italia che cominciano così: { ok, indirizzi, errore }. */
export async function cercaIndirizzi(testo) {
  const q = String(testo || '').trim()
  if (q.length < 3) return { ok: true, indirizzi: [], errore: '' }
  try {
    const r = await fetch(`${PHOTON}?${new URLSearchParams({ q, limit: '6', bbox: ITALIA })}`)
    if (!r.ok) throw new Error(`photon ${r.status}`)
    const j = await r.json()
    return { ok: true, indirizzi: (j.features || []).map(daPhoton).filter(Boolean), errore: '' }
  } catch (e) {
    console.warn('Photon fallito', e)
    return { ok: false, indirizzi: [], errore: 'Indirizzi non trovati: controlla la rete e riprova.' }
  }
}

// ---------------------------------------------------------------------------
// La moderazione delle palestre aggiunte (pages/ModerazionePage): tutte
// restano da approvare finché un moderatore non decide. Il database avvisa chi
// ce l'aveva sul profilo, in tutti e due i casi (`decidi_palestra`).
// ---------------------------------------------------------------------------

/** { ok, palestre, errore }: ogni palestra con `fonte`, `aggiuntaDa`, `sceltaDa`. */
export async function palestreDaApprovare() {
  const { data, error } = await supabase.rpc('palestre_da_approvare')
  if (error) {
    console.warn('palestre_da_approvare fallita', error.message)
    return { ok: false, palestre: [], errore: messaggioErrore(error) }
  }
  const palestre = (data || []).map((r) => ({
    ...daRiga(r),
    fonte: r.fonte === 'utente' ? 'pin' : 'overture',
    categoria: r.categoria || '',
    aggiuntaDa: r.aggiunta_da || '',
    creataIl: r.creata_il,
    sceltaDa: Number(r.scelta_da) || 0,
  }))
  return { ok: true, palestre, errore: '' }
}

/** Approvata (la vedono tutti) o no (si cancella): { ok, errore }. */
export async function decidiPalestra(id, approvata) {
  const { error } = await supabase.rpc('decidi_palestra', { p_id: id, approvata })
  if (error) {
    console.warn('decidi_palestra fallita', error.message)
    return { ok: false, errore: messaggioErrore(error) }
  }
  return { ok: true, errore: '' }
}

/** Il punto su OpenStreetMap, per guardarlo da vicino prima di decidere. */
export const linkMappa = (p) => `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=19/${p.lat}/${p.lon}`
