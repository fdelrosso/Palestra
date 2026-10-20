import { erroreDiRete, messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// La vetrina di un PT: presentazione, specializzazioni, dove lavora, tariffe.
// Tabella `vetrine_pt` (schema.sql, "LA VETRINA DEL PT"): la leggono tutti
// tranne i bloccati, la scrive solo il PT. Si vede su UtentePage, si scrive
// da VetrinaPtPage (Lavoro → "Il tuo profilo da PT").
// ---------------------------------------------------------------------------

export const LIMITI = { bio: 600, dove: 120, tariffe: 300, specializzazioni: 12, specializzazione: 40 }

/** Le proposte da toccare; se ne scrivono anche altre. */
export const SPECIALIZZAZIONI = [
  'Ipertrofia',
  'Forza',
  'Powerlifting',
  'Dimagrimento',
  'Ricomposizione corporea',
  'Funzionale',
  'Calisthenics',
  'Mobilità',
  'Postura',
  'Riatletizzazione',
  'Preparazione atletica',
  'Over 60',
  'Gravidanza e post parto',
  'Principianti',
  'Online',
]

export const VETRINA_VUOTA = { bio: '', specializzazioni: [], dove: '', tariffe: '' }

const daRiga = (r) =>
  r
    ? {
        bio: r.bio || '',
        specializzazioni: r.specializzazioni || [],
        dove: r.dove || '',
        tariffe: r.tariffe || '',
        aggiornataIl: r.aggiornata_il,
      }
    : null

/** Vuota = niente da mostrare. */
export function vetrinaVuota(v) {
  return !v || (!v.bio.trim() && !v.specializzazioni.length && !v.dove.trim() && !v.tariffe.trim())
}

/** La vetrina di un PT, o null (non l'ha scritta, o non si legge). */
export async function leggiVetrina(id) {
  if (!id) return null
  const { data, error } = await supabase
    .from('vetrine_pt')
    .select('bio, specializzazioni, dove, tariffe, aggiornata_il')
    .eq('user_id', id)
    .maybeSingle()
  if (error) {
    console.warn('Lettura della vetrina PT non riuscita', error.message)
    return null
  }
  return daRiga(data)
}

/** Scrive la propria vetrina. → { ok, errore } */
export async function salvaVetrina(id, v) {
  const riga = {
    user_id: id,
    bio: v.bio.trim().slice(0, LIMITI.bio),
    specializzazioni: [...new Set(v.specializzazioni.map((s) => s.trim()).filter(Boolean))]
      .map((s) => s.slice(0, LIMITI.specializzazione))
      .slice(0, LIMITI.specializzazioni),
    dove: v.dove.trim().slice(0, LIMITI.dove),
    tariffe: v.tariffe.trim().slice(0, LIMITI.tariffe),
    aggiornata_il: new Date().toISOString(),
  }
  const { error } = await supabase.from('vetrine_pt').upsert(riga, { onConflict: 'user_id' })
  if (!error) return { ok: true, errore: '' }
  if (/vetrine_pt/i.test(error.message || '')) return { ok: false, errore: 'Il database non è ancora aggiornato per il profilo da PT.' }
  if (/row-level security/i.test(error.message || '')) return { ok: false, errore: 'Solo un account PT ha il profilo da PT.' }
  return { ok: false, errore: erroreDiRete(error) ? 'Senza rete non si salva: riprova.' : messaggioErrore(error) }
}
