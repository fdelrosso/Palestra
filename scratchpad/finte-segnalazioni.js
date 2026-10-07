// ---------------------------------------------------------------------------
// lib/segnalazioni FINTA, per i banchi di prova (scratchpad/vite.prova.config.js
// la mette al posto di quella vera): segnalazioni, sanzioni, avvisi e
// richieste di sblocco stanno in memoria, e chi prova è moderatore. Le
// funzioni pure sono quelle vere. Le regole (gradini, avvisi) sono copiate da
// decidi_segnalazione in supabase/schema.sql, in piccolo.
// ---------------------------------------------------------------------------
export {
  MOTIVI,
  DETTAGLIO_MAX,
  STATO_LIBERO,
  motivoDi,
  erroreSegnalazione,
  chiaveSegnalata,
  riassuntoMotivi,
  motivoPrincipale,
  conseguenza,
} from '../src/lib/segnalazioni.js'
import { STATO_LIBERO, chiaveSegnalata, erroreSegnalazione, motivoDi } from '../src/lib/segnalazioni.js'

const righe = [] // { tipo, oggetto, motivo, dettaglio, stato, creata, da }
const sanzioni = {} // nome → { tolti, pubblicazioneBloccata, accountBloccato }
const richieste = [] // { id, chi, tipo, messaggio, stato, il }
let avvisi = [] // per chi prova
let mio = { ...STATO_LIBERO }
const attesa = () => new Promise((r) => setTimeout(r, 120))

/** Per i banchi: lo stato di chi prova e gli avvisi da fargli trovare. */
export function impostaFintaModerazione({ stato, avvisiDaMostrare } = {}) {
  if (stato) mio = { ...STATO_LIBERO, ...stato }
  if (avvisiDaMostrare) avvisi = avvisiDaMostrare.map((a, i) => ({ id: 'av' + i, creataIl: new Date().toISOString(), ...a }))
}

export async function segnala({ tipo, oggetto, motivo, dettaglio = '', da = 'io' }) {
  const sbagliato = erroreSegnalazione(motivo, dettaglio)
  if (sbagliato) return { ok: false, errore: sbagliato }
  await attesa()
  righe.push({ tipo, oggetto, motivo, dettaglio: dettaglio.trim(), stato: 'aperta', creata: new Date().toISOString(), da })
  return { ok: true, errore: '' }
}

export async function mieSegnalazioni() {
  return new Set(righe.filter((r) => r.da === 'io').map((r) => chiaveSegnalata(r.tipo, r.oggetto)))
}

export const sonoModeratore = async () => true

export async function segnalazioniAperte() {
  const per = new Map()
  for (const r of righe.filter((x) => x.stato === 'aperta')) {
    const k = chiaveSegnalata(r.tipo, r.oggetto)
    if (!per.has(k)) {
      per.set(k, {
        tipo: r.tipo, oggetto: r.oggetto, autoreNome: 'Nico',
        testo: r.tipo === 'commento' ? 'Sei un ***** con quelle gambe da pollo' : '',
        percorso: null, media: r.tipo === 'foto' ? 'foto' : null, esiste: true, quante: 0, motivi: [],
        dettagli: [], prima: r.creata, persone: 0, nascosto: false, toltiPrima: sanzioni.Nico?.tolti || 0,
        _da: new Set(),
      })
    }
    const v = per.get(k)
    v.quante += 1
    v._da.add(r.da)
    v.persone = v._da.size
    v.nascosto = v.persone >= 3
    v.motivi.push(r.motivo)
    if (r.dettaglio) v.dettagli.push(r.dettaglio)
  }
  return { ok: true, voci: [...per.values()], errore: '' }
}

export async function decidi(voce, esito, motivo = null) {
  await attesa()
  for (const r of righe) if (r.tipo === voce.tipo && r.oggetto === voce.oggetto) r.stato = esito
  if (esito === 'rimossa') {
    const s = (sanzioni.Nico ||= { tolti: 0, pubblicazioneBloccata: false, accountBloccato: false })
    s.tolti += 1
    if (s.tolti >= 3) s.pubblicazioneBloccata = true
    if (s.tolti >= 4) s.accountBloccato = true
    console.info('Avviso a Nico:', motivoDi(motivo)?.label, s)
  }
  return { ok: true, errore: '' }
}

export async function personeSanzionate() {
  return {
    ok: true,
    persone: Object.entries(sanzioni)
      .filter(([nome, s]) => s.pubblicazioneBloccata || s.accountBloccato || richieste.some((r) => r.chi === nome && r.stato === 'aperta'))
      .map(([nome, s]) => ({
        userId: nome,
        nome,
        ...s,
        richiesta: richieste.find((r) => r.chi === nome && r.stato === 'aperta') || null,
      })),
    errore: '',
  }
}

/** Per i banchi: Nico ha chiesto lo sblocco. */
export function seminaRichiesta(tipo, messaggio) {
  richieste.push({ id: 'r' + richieste.length, chi: 'Nico', tipo, messaggio, stato: 'aperta', il: new Date().toISOString() })
}

export async function sblocca(userId, cosa) {
  await attesa()
  const s = sanzioni[userId]
  if (s && (cosa === 'account' || cosa === 'tutto')) s.accountBloccato = false
  if (s && (cosa === 'pubblicazione' || cosa === 'tutto')) s.pubblicazioneBloccata = false
  for (const r of richieste) if (r.chi === userId && (cosa === 'tutto' || r.tipo === cosa)) r.stato = 'accolta'
  return { ok: true, errore: '' }
}

export async function respingiSblocco(id) {
  await attesa()
  const r = richieste.find((x) => x.id === id)
  if (r) r.stato = 'respinta'
  return { ok: true, errore: '' }
}

export async function statoModerazione() {
  return { ...mio }
}

export async function chiediSblocco(tipo) {
  await attesa()
  if (tipo === 'account') mio.richiestaAccount = true
  else mio.richiestaPubblicazione = true
  return { ok: true, errore: '' }
}

export async function avvisiDaLeggere() {
  return [...avvisi]
}

export async function segnaAvvisiLetti(ids) {
  avvisi = avvisi.filter((a) => !ids.includes(a.id))
}
