import { normalizzaScheda } from '../data/model'
import { cancellatiDiRecente, voceStorico } from './storico'
import { chiaveAllenamento } from './fotoAllenamento'
import { visibileA } from './visibilita'
import { messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// Il feed e il profilo A PAGINE (spec 2026-11-04-feed-a-pagine-design.md).
//
// Prima feed e profilo partivano da `allenamenti_visibili`: TUTTI gli allenamenti che
// si possono vedere, di tutti, a ogni apertura. Cresceva con utenti × storia.
// Qui il server dà 20 allenamenti alla volta, dal più recente
// (`feed_allenamenti`, migrazione 20261104180000), e la pagina chiede la
// successiva quando il fondo arriva a schermo. Le voci sono quelle di sempre
// (`voceStorico`): le card non se ne accorgono.
//
// ⚠️ I filtri "chi" (amici, palestra, atleti) li fa il database; gruppi,
// durata ed esercizio restano nel browser (lib/feed) sulle voci lette, e se ne
// lasciano poche si legge da soli fino a MAX_PAGINE. Un filtro raro guarda
// quindi solo gli ultimi 100 allenamenti: scelta dell'utente (2026-11-04).
// ---------------------------------------------------------------------------

export const PAGINA = 20
export const SOGLIA = 10
export const MAX_PAGINE = 5

/** Righe del server + nomi → le voci dello storico, saltando le appena cancellate. */
export function vociDaRighe(righe, nomi, usernames) {
  return (righe || [])
    .filter((r) => r.dati?.data && !cancellatiDiRecente.has(r.dati.data))
    .map((r) =>
      voceStorico({
        utenteId: r.user_id,
        utenteNome: nomi.get(r.user_id) || '',
        utenteUsername: usernames.get(r.user_id) || '',
        schedaId: r.scheda_id,
        relazionePt: r.relazione_pt || 0,
        completamento: r.dati,
      }),
    )
}

/** Con i filtri del browser, servono altre voci? */
export function serveAltraPagina({ visibili, pagineLette, ancora }) {
  return ancora && visibili < SOGLIA && pagineLette < MAX_PAGINE
}

/** I propri allenamenti, dalle proprie schede (lo store): nascosti compresi. */
export function vociProprie(schede, io) {
  const voci = []
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (!c?.data || cancellatiDiRecente.has(c.data)) continue
      voci.push(
        voceStorico({
          utenteId: io.id,
          utenteNome: io.nome || '',
          utenteUsername: io.username || '',
          schedaId: s.id,
          completamento: { ...c, id: c.id || chiaveAllenamento({ ...c, schedaId: s.id }) },
        }),
      )
    }
  }
  return voci.sort((a, b) => new Date(b.data) - new Date(a.data))
}

// I nomi solo di chi c'è nella pagina (`nomi_di` e `username_di`): le regole sui profili restano quelle del database.
async function conNomi(righe) {
  const ids = [...new Set(righe.map((r) => r.user_id))]
  const nomi = new Map()
  const usernames = new Map()
  if (ids.length) {
    const [rn, ru] = await Promise.all([supabase.rpc('nomi_di', { ids }), supabase.rpc('username_di', { ids })])
    for (const r of rn.data || []) nomi.set(r.id, r.nome)
    for (const r of ru.data || []) if (r.username) usernames.set(r.id, r.username)
  }
  return vociDaRighe(righe, nomi, usernames)
}

async function pagina(rpc, argomenti) {
  const { data, error } = await supabase.rpc(rpc, { ...argomenti, p_quanti: PAGINA })
  if (error) {
    console.warn(`Lettura di ${rpc} fallita`, error.message)
    return { ok: false, errore: messaggioErrore(error), voci: [], ancora: false, dopo: null }
  }
  const righe = data || []
  const ultima = righe.at(-1)
  return {
    ok: true,
    errore: '',
    voci: await conNomi(righe),
    ancora: righe.length === PAGINA,
    dopo: ultima ? { data: ultima.data, id: ultima.id } : null,
  }
}

/** Una pagina del feed. `zona` = { modo, km } per la linguetta palestra. */
export function leggiPaginaFeed({ chi, dopo = null, zona = null }) {
  return pagina('feed_allenamenti', {
    p_chi: chi,
    p_prima_di: dopo?.data ?? null,
    p_prima_di_id: dopo?.id ?? null,
    p_modo: zona?.modo ?? null,
    p_km: zona?.km ?? 5,
  })
}

/** Una pagina degli allenamenti pubblici di un altro (il suo profilo). */
export function leggiPaginaUtente(utenteId, dopo = null) {
  return pagina('allenamenti_di', {
    p_utente: utenteId,
    p_prima_di: dopo?.data ?? null,
    p_prima_di_id: dopo?.id ?? null,
  })
}

/** Quanti allenamenti di un altro vedo: il numero in cima al profilo. */
export async function contaAllenamentiDi(utenteId) {
  const { data, error } = await supabase.rpc('conta_allenamenti_di', { p_utente: utenteId })
  if (error) {
    console.warn('Conto degli allenamenti non riuscito', error.message)
    return null
  }
  return Number(data) || 0
}

/** Le schede di un altro che si vedono sul profilo (come schedeDiUtente). */
export async function schedeDi(utenteId) {
  const { data, error } = await supabase.rpc('schede_di', { p_utente: utenteId })
  if (error) {
    console.warn('Lettura delle schede non riuscita', error.message)
    return []
  }
  return (data || [])
    .map((r) => normalizzaScheda(r.dati))
    .filter((s) => !s.libera && visibileA(s))
    .sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0))
}

/** Un allenamento solo, per chiave (link o notifica), o null. */
export async function allenamentoPerChiave(chiave) {
  const { data, error } = await supabase.rpc('allenamento_per_chiave', { p_chiave: chiave })
  if (error || !data?.length) return null
  return (await conNomi(data))[0] || null
}
