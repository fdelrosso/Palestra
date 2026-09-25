// ---------------------------------------------------------------------------
// Mi piace e commenti sugli allenamenti del Feed.
//
// Un allenamento si riconosce con la stessa chiave delle sue foto,
// '<schedaId>|<data ISO>' (chiaveAllenamento in lib/fotoAllenamento).
//
// ⚠️ CHI PUÒ lo decide il database (`posso_vedere_allenamento` in
// supabase/schema.sql): chi vede l'allenamento può mettere mi piace e
// commentare, gli altri no. Qui non si filtra niente — una chiave che non si
// può vedere semplicemente non torna.
//
// ⚠️ I NOMI di chi ha messo mi piace o commentato arrivano dal database
// insieme alle righe (mi_piace_di, commenti_di), non da `nomi_di`: uno
// sconosciuto che mette mi piace a un allenamento pubblico il suo nome in
// `nomi_di` non ce l'ha, e sotto il post comparirebbe "Qualcuno".
//
// ⚠️ LE FOTO DEI COMMENTI: prima il file, poi la riga (per caricare); prima il
// file, poi la riga (per cancellare). La regola che lascia leggere o
// cancellare il file va a cercare il commento: tolta la riga, il file non lo
// toglie più nessuno. E si rimpiccioliscono prima di partire: stanno sul
// progetto Supabase di tutti, e una foto del telefono pesa 5MB.
// ---------------------------------------------------------------------------

import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { caricaFile, rimpicciolisciImmagine } from './media'

const BUCKET = 'commenti'

function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'co-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/** Le interazioni vuote: quello che si mostra finché il database non risponde. */
export const NESSUNA = Object.freeze({ miPiace: 0, mio: false, commenti: 0, ultimo: null })

/** Dalla riga di `interazioni_allenamenti` a quello che usa il Feed. */
export function daRiga(r) {
  return {
    miPiace: Number(r.mi_piace) || 0,
    mio: !!r.mio,
    commenti: Number(r.commenti) || 0,
    ultimo:
      r.ultimo_nome != null
        ? { nome: r.ultimo_nome, testo: r.ultimo_testo || '', foto: !!r.ultimo_foto }
        : null,
  }
}

/**
 * Il mi piace appena premuto, prima che il server risponda: il cuore si deve
 * accendere al tocco, non mezzo secondo dopo. Se il server dice di no si torna
 * a com'era.
 */
export function conMiPiace(stato, metto) {
  const s = stato || NESSUNA
  if (s.mio === metto) return s
  return { ...s, mio: metto, miPiace: Math.max(0, s.miPiace + (metto ? 1 : -1)) }
}

/**
 * Per tanti allenamenti in un colpo solo (il Feed ne mostra una ventina).
 * @param {string[]} chiavi
 * @returns {Promise<Record<string, {miPiace:number, mio:boolean, commenti:number, ultimo:object|null}>>}
 */
export async function leggiInterazioni(chiavi) {
  const elenco = [...new Set((chiavi || []).filter((k) => k && !k.startsWith('|')))]
  if (elenco.length === 0) return {}
  const { data, error } = await supabase.rpc('interazioni_allenamenti', { chiavi: elenco })
  if (error) {
    console.warn('Lettura di mi piace e commenti non riuscita', error.message)
    return {}
  }
  const per = {}
  for (const r of data || []) per[r.allenamento_key] = daRiga(r)
  return per
}

/** Mette o toglie il proprio mi piace. */
export async function impostaMiPiace(chiave, ioId, metto) {
  const q = supabase.from('allenamento_mi_piace')
  const { error } = metto
    ? await q.upsert(
        { allenamento_key: chiave, user_id: ioId },
        { onConflict: 'allenamento_key,user_id', ignoreDuplicates: true },
      )
    : await q.delete().eq('allenamento_key', chiave).eq('user_id', ioId)
  if (error) {
    console.warn('Mi piace non salvato', error.message)
    return { ok: false, errore: messaggioErrore(error), diRete: erroreDiRete(error) }
  }
  return { ok: true, errore: '' }
}

/** Chi ha messo mi piace, dal più recente. */
export async function chiHaMessoMiPiace(chiave) {
  const { data, error } = await supabase.rpc('mi_piace_di', { chiave })
  if (error) return { ok: false, righe: [], errore: messaggioErrore(error) }
  return {
    ok: true,
    righe: (data || []).map((r) => ({ userId: r.user_id, nome: r.nome, creatoIl: r.creato_il })),
    errore: '',
  }
}

/** I commenti di un allenamento, dal più vecchio. */
export async function leggiCommenti(chiave) {
  const { data, error } = await supabase.rpc('commenti_di', { chiave })
  if (error) return { ok: false, righe: [], errore: messaggioErrore(error) }
  return {
    ok: true,
    righe: (data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      nome: r.nome,
      testo: r.testo || '',
      foto: r.foto || null,
      creatoIl: r.creato_il,
    })),
    errore: '',
  }
}

/** Un commento si può mandare se ha del testo o una foto. */
export function commentoValido(testo, file) {
  const t = String(testo || '').trim()
  return t.length <= 2000 && (t.length > 0 || !!file)
}

/**
 * Scrive un commento, con la foto se c'è.
 * @returns {Promise<{ok:boolean, riga?:object, errore:string}>}
 */
export async function scriviCommento({ chiave, ioId, ioNome = '', testo = '', file = null }) {
  const t = String(testo || '').trim()
  if (!commentoValido(t, file)) return { ok: false, errore: 'Il commento è vuoto.' }
  const id = nuovoId()
  let foto = null
  if (file) {
    let blob
    try {
      blob = await rimpicciolisciImmagine(file)
    } catch {
      return { ok: false, errore: 'Questa foto non si riesce ad aprire.' }
    }
    foto = `${ioId}/${id}.jpg`
    const esito = await caricaFile(BUCKET, foto, blob)
    if (!esito.ok) {
      return {
        ok: false,
        errore: esito.diRete ? 'Senza rete la foto non parte: riprova.' : messaggioErrore(esito.errore),
      }
    }
  }
  const { error } = await supabase
    .from('allenamento_commenti')
    .insert({ id, allenamento_key: chiave, user_id: ioId, testo: t, foto })
  if (error) {
    // Il file è partito ma la riga no: si toglie, se no resta lì per sempre
    // senza un commento che lo lasci vedere o cancellare.
    if (foto) await supabase.storage.from(BUCKET).remove([foto]).catch(() => {})
    return { ok: false, errore: messaggioErrore(error) }
  }
  return {
    ok: true,
    riga: { id, userId: ioId, nome: ioNome, testo: t, foto, creatoIl: new Date().toISOString() },
    errore: '',
  }
}

/** Toglie un commento (il proprio, o uno sotto un proprio allenamento). */
export async function eliminaCommento(commento) {
  if (commento.foto) {
    const { error } = await supabase.storage.from(BUCKET).remove([commento.foto])
    if (error) console.warn('Foto del commento non rimossa', error.message)
  }
  const { error } = await supabase.from('allenamento_commenti').delete().eq('id', commento.id)
  if (error) return { ok: false, errore: messaggioErrore(error) }
  return { ok: true, errore: '' }
}

/** Il link per far vedere la foto di un commento (vale un'ora). */
export async function urlFotoCommento(percorso) {
  if (!percorso) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(percorso, 3600)
  if (error) return null
  return data?.signedUrl || null
}

/**
 * L'allenamento ha cambiato chiave (data corretta, o "Riprendi" e poi di nuovo
 * "Termina"): mi piace e commenti lo seguono, come le foto.
 */
export async function spostaInterazioni(vecchia, nuova) {
  if (!vecchia || !nuova || vecchia === nuova) return { ok: true }
  const { error } = await supabase.rpc('sposta_interazioni', { vecchia, nuova })
  if (error) {
    console.warn('Mi piace e commenti non spostati', error.message)
    return { ok: false, errore: error.message }
  }
  return { ok: true }
}
