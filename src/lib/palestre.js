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
