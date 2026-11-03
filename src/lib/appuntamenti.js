import { useEffect, useState } from 'react'
import { erroreDiRete, messaggioErrore, supabase } from './supabase'
import { chiaveOrario, ordinaOrari } from './orariAppuntamento'
import { leggiAgenda } from './agendaPt'

// ---------------------------------------------------------------------------
// Gli appuntamenti fra atleta e PT (2026-10-28, pages/AppuntamentiPage).
// L'atleta chiede con un motivo e una lista di orari; chi ha il turno ne
// accetta uno dell'altro (fissato, e va nell'agenda del PT) o manda altri
// orari, rifiutando quelli aperti. Un orario rifiutato non torna.
// Le regole stanno nel database: migrazione 20261028150000_appuntamenti_pt.
//
// Stati: 'trattativa' · 'fissato' · 'annullato'.
// ---------------------------------------------------------------------------

function errore(error) {
  const m = error?.message || ''
  if (/nessun pt/i.test(m)) return 'Serve un PT collegato per chiedere un appuntamento.'
  if (/non è un tuo atleta/i.test(m)) return 'Questa persona non è fra i tuoi atleti.'
  if (/non tocca a te/i.test(m)) return 'Adesso tocca all’altro rispondere: ricarica.'
  if (/già rifiutato/i.test(m)) return 'Uno di questi orari è già stato rifiutato: scegline un altro.'
  if (/già impegnato/i.test(m)) return 'A quell’ora uno di voi due è già impegnato: scegline un altro.'
  if (/orari non validi|orario non valido/i.test(m)) return 'Controlla gli orari: giorno e ora, da oggi in poi.'
  if (/non trovato/i.test(m)) return 'Questo appuntamento non c’è più: ricarica.'
  if (/appuntament|accetta_orario|controproponi/i.test(m)) return 'Il database non è ancora aggiornato per gli appuntamenti.'
  return erroreDiRete(error) ? 'Senza rete non parte: riprova.' : messaggioErrore(error)
}

const ok = (error) => (error ? { ok: false, errore: errore(error) } : { ok: true, errore: '' })

// Quello che viaggia di una fascia (migrazione 20261102130000).
const fascia = ({ giorno, ora, fine, durata }) => ({ giorno, ora, fine, durata })

const daOrario = (r) => ({
  id: r.id,
  daId: r.da_id,
  giorno: r.giorno,
  ora: r.ora,
  fine: r.ora_fine || null,
  durata: r.durata || null,
  stato: r.stato,
  nota: r.nota || '',
  creatoIl: r.creato_il,
})

/**
 * @typedef {Object} Appuntamento
 * @property {string} id
 * @property {string} atletaId
 * @property {string} ptId
 * @property {string} motivo
 * @property {'trattativa'|'fissato'|'annullato'} stato
 * @property {'pt'|'atleta'|null} turno
 * @property {string|null} giorno   quello fissato
 * @property {string|null} ora
 * @property {Array} orari          tutti, dal più vicino
 */
const daRiga = (r) => ({
  id: r.id,
  atletaId: r.atleta_id,
  ptId: r.pt_id,
  motivo: r.motivo || '',
  stato: r.stato,
  turno: r.turno,
  giorno: r.giorno,
  ora: r.ora,
  fine: r.ora_fine || null,
  creatoIl: r.creato_il,
  ultimoIl: r.ultimo_il,
  // Chi ha fatto l'ultima mossa (annullato: chi l'ha annullato).
  ultimoDa: r.ultimo_da,
  orari: ordinaOrari((r.appuntamenti_orari || []).map(daOrario)),
})

/** I miei appuntamenti, da atleta o da PT, dall'ultimo mosso. */
export async function leggiAppuntamenti(ioId) {
  if (!ioId) return []
  const { data, error } = await supabase
    .from('appuntamenti')
    .select('*, appuntamenti_orari(*)')
    .or(`atleta_id.eq.${ioId},pt_id.eq.${ioId}`)
    .order('ultimo_il', { ascending: false })
    .limit(100)
  if (error) {
    if (!/appuntament/i.test(error.message || '')) console.warn('Lettura degli appuntamenti non riuscita', error.message)
    return []
  }
  return (data || []).map(daRiga)
}

/** L'atleta chiede. `orari`: [{ giorno, ora }]. → { ok, id?, errore } */
export async function chiediAppuntamento(motivo, orari) {
  const { data, error } = await supabase.rpc('chiedi_appuntamento', {
    p_motivo: motivo.trim(),
    p_orari: orari.map(fascia),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/**
 * Il PT propone a un suo atleta: tocca a lui accettare o mandare altri orari.
 * Migrazione 20261102120000. → { ok, id?, errore }
 */
export async function proponiAppuntamento(atletaId, motivo, orari) {
  const { data, error } = await supabase.rpc('proponi_appuntamento', {
    p_atleta: atletaId,
    p_motivo: motivo.trim(),
    p_orari: orari.map(fascia),
  })
  return error ? { ok: false, errore: errore(error) } : { ok: true, id: data, errore: '' }
}

/** Va bene questa fascia dell'altro, alle `ora` (vuota: al suo inizio): fissato. */
export async function accettaOrario(orarioId, ora = null) {
  const { error } = await supabase.rpc('accetta_orario_alle', { p_orario: orarioId, p_ora: ora })
  return ok(error)
}

/** Nessuno va bene: rifiuta quelli aperti dell'altro e manda questi. */
export async function controproponiOrari(appuntamentoId, orari, nota = '') {
  const { error } = await supabase.rpc('controproponi_orari', {
    p_app: appuntamentoId,
    p_orari: orari.map(fascia),
    p_nota: nota.trim(),
  })
  return ok(error)
}

export async function annullaAppuntamento(appuntamentoId) {
  const { error } = await supabase.rpc('annulla_appuntamento', { p_app: appuntamentoId })
  return ok(error)
}

// --- Conti su un appuntamento letto ---------------------------------------

/** Tocca a me rispondere? */
export function toccaAMe(app, ioId) {
  if (app.stato !== 'trattativa') return false
  return app.turno === 'pt' ? app.ptId === ioId : app.atletaId === ioId
}

/** Gli orari aperti dell'altro (quelli fra cui scegliere). */
export const orariDellAltro = (app, ioId) => app.orari.filter((o) => o.stato === 'aperto' && o.daId !== ioId)

/** I miei ancora aperti (in attesa che l'altro scelga). */
export const mieiAperti = (app, ioId) => app.orari.filter((o) => o.stato === 'aperto' && o.daId === ioId)

/** Le chiavi degli orari rifiutati: non si possono riproporre. */
export const rifiutati = (app) => new Set(app.orari.filter((o) => o.stato === 'rifiutato').map(chiaveOrario))

/** Il messaggio dell'ultimo giro dell'altro, se c'è. */
export function notaDellAltro(app, ioId) {
  const suoi = orariDellAltro(app, ioId)
  return suoi.find((o) => o.nota)?.nota || ''
}

/**
 * Quanti appuntamenti aspettano una mia risposta (il pallino su "Appuntamenti"
 * in Lavoro e nel Profilo). Si rilegge tornando sull'app.
 */
// `come` ('pt' | 'atleta', facoltativo): solo quelli dove si è PT, o atleta.
// Serve a chi è tutti e due, per non contare in Lavoro i suoi da atleta.
export function useAppuntamentiDaDecidere(ioId, come = null) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const mio = (a) => !come || (come === 'pt' ? a.ptId === ioId : a.ptId !== ioId)
    const leggi = () =>
      leggiAppuntamenti(ioId).then((t) => vivo && setN(t.filter((a) => mio(a) && toccaAMe(a, ioId)).length))
    leggi()
    const visibile = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [ioId, come])
  return n
}
/**
 * Gli appuntamenti FISSATI di chi si allena (`ioId` come atleta), dal più
 * vicino: vanno nel suo calendario (pages/CalendarPage) e nella settimana
 * della Home (pages/InizioPage). Quelli da PT stanno già nella sua agenda.
 */
export function useAppuntamentiFissati(ioId) {
  const [fissati, setFissati] = useState([])
  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const leggi = () =>
      leggiAppuntamenti(ioId).then(
        (t) =>
          vivo &&
          setFissati(
            t
              .filter((a) => a.stato === 'fissato' && a.atletaId === ioId)
              .sort((x, y) => `${x.giorno} ${x.ora}`.localeCompare(`${y.giorno} ${y.ora}`)),
          ),
      )
    leggi()
    const visibile = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', visibile)
    // Annullato dall'altro mentre si guarda il calendario: sparisce da solo.
    const ogniMinuto = setInterval(visibile, 60000)
    return () => {
      vivo = false
      clearInterval(ogniMinuto)
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [ioId])
  return fissati
}
/**
 * I miei impegni con l'orario, da oggi, in TUTTI i ruoli (2026-10-28): gli
 * appuntamenti fissati da PT e da atleta, e le voci della mia agenda di PT
 * (dove stanno anche i miei appuntamenti da PT). Occupano la fascia
 * (lib/orariAppuntamento → orarioImpegnato). Occupano anche le fasce ancora
 * aperte: `appId` dice di quale richiesta, che lei stessa non si blocca.
 * `versione`: cambiandola si rilegge. → [{ giorno, ora, fine?, titolo, appId? }]
 */
export function useOrariImpegnati(ioId, versione = 0) {
  const [impegni, setImpegni] = useState([])
  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const oggi = new Date()
    const fra = new Date(oggi)
    fra.setFullYear(fra.getFullYear() + 1)
    Promise.all([leggiAppuntamenti(ioId), leggiAgenda(iso(oggi), iso(fra))]).then(([app, agenda]) => {
      if (!vivo) return
      setImpegni([
        ...app
          .filter((a) => a.stato === 'fissato' && a.giorno && a.ora)
          .map((a) => ({ giorno: a.giorno, ora: a.ora, fine: a.fine, titolo: 'un appuntamento' })),
        ...app.flatMap((a) =>
          a.stato !== 'trattativa'
            ? []
            : a.orari
                .filter((o) => o.stato === 'aperto')
                .map((o) => ({ giorno: o.giorno, ora: o.ora, fine: o.fine, titolo: 'una richiesta in attesa', appId: a.id })),
        ),
        ...(agenda.righe || [])
          .filter((r) => r.ora)
          .map((r) => ({ giorno: r.data, ora: r.ora, fine: r.oraFine, titolo: r.titolo })),
      ])
    })
    return () => {
      vivo = false
    }
  }, [ioId, versione])
  return impegni
}

/**
 * Le fasce ancora aperte, per il calendario. Al PT (`come` 'pt') quelle che ha
 * proposto; all'atleta tutte le sue, mandate da lui o da decidere (`daId` dice
 * da chi). → [{ appId, atletaId, ptId, daId, giorno, ora, fine, durata, motivo }]
 */
export function useFasceInAttesa(ioId, come = 'pt') {
  const [fasce, setFasce] = useState([])
  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    const leggi = () =>
      leggiAppuntamenti(ioId).then((t) => {
        if (!vivo) return
        setFasce(
          t
            .filter((a) => a.stato === 'trattativa' && (come === 'pt' ? a.ptId : a.atletaId) === ioId)
            .flatMap((a) =>
              (come === 'pt' ? mieiAperti(a, ioId) : a.orari.filter((o) => o.stato === 'aperto')).map((o) => ({
                ...o,
                appId: a.id,
                atletaId: a.atletaId,
                ptId: a.ptId,
                motivo: a.motivo,
              })),
            ),
        )
      })
    leggi()
    const visibile = () => document.visibilityState === 'visible' && leggi()
    document.addEventListener('visibilitychange', visibile)
    const ogniMinuto = setInterval(visibile, 60000)
    return () => {
      vivo = false
      clearInterval(ogniMinuto)
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [ioId, come])
  return fasce
}
