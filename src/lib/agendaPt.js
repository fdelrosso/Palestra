// ---------------------------------------------------------------------------
// L'agenda del PT: il calendario della sua Home (components/AgendaPt).
//
// Serve a PIANIFICARE — una lezione alle 18 con Marco, una valutazione, una
// chiamata — non a registrare allenamenti: per quelli c'è lo Storico di chi si
// allena. Tabella `agenda_pt` (supabase/migrations/20261028120000_pt_check_video.sql),
// la vede solo il PT che l'ha scritta.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

/** @typedef {{id:string, data:string, ora:string, titolo:string, nota:string, atletaId:string|null}} Attivita */

function daRiga(r) {
  return {
    id: r.id,
    data: r.data,
    ora: r.ora || '',
    titolo: r.titolo || '',
    nota: r.nota || '',
    atletaId: r.atleta_id || null,
  }
}

/** `YYYY-MM-DD` di una Date, nel fuso di chi guarda. */
export function isoDi(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const gg = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${gg}`
}

/** Il lunedì della settimana di `d` (a mezzanotte). */
export function lunediDi(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** I sette giorni da quel lunedì. */
export function giorniDaLunedi(lunedi) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Prima quelle con l'ora, in ordine; poi quelle "tutto il giorno". */
export function ordinaAttivita(righe) {
  return [...righe].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data)
    if (!a.ora !== !b.ora) return a.ora ? -1 : 1
    return a.ora.localeCompare(b.ora)
  })
}

/** @returns {Promise<{ok:boolean, righe:Attivita[], errore:string}>} */
export async function leggiAgenda(daIso, aIso) {
  const { data, error } = await supabase
    .from('agenda_pt')
    .select('*')
    .gte('data', daIso)
    .lte('data', aIso)
  if (error) {
    const manca = /agenda_pt/i.test(error.message || '')
    return {
      ok: false,
      righe: [],
      errore: manca ? 'Il database non è ancora aggiornato per l’agenda.' : 'Agenda non caricata. Riprova.',
    }
  }
  return { ok: true, righe: ordinaAttivita((data || []).map(daRiga)), errore: '' }
}

/** @returns {Promise<{ok:boolean, riga?:Attivita, errore?:string}>} */
export async function aggiungiAttivita({ data, ora = '', titolo, nota = '', atletaId = null }) {
  const t = String(titolo || '').trim()
  if (!t) return { ok: false, errore: 'Scrivi cosa c’è da fare.' }
  const { data: riga, error } = await supabase
    .from('agenda_pt')
    .insert({ data, ora, titolo: t, nota: String(nota || '').trim(), atleta_id: atletaId || null })
    .select('*')
    .single()
  if (error) return { ok: false, errore: 'Non sono riuscito a salvarla. Riprova.' }
  return { ok: true, riga: daRiga(riga) }
}

export async function eliminaAttivita(id) {
  const { error } = await supabase.from('agenda_pt').delete().eq('id', id)
  return error ? { ok: false, errore: 'Non sono riuscito a toglierla. Riprova.' } : { ok: true }
}
