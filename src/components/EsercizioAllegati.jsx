import { useEffect, useRef, useState } from 'react'
import { nuovoId } from '../data/model'
import { useAccount } from '../store/AccountContext'
import {
  salvaMedia,
  getMediaBlob,
  eliminaMedia,
  mediaDisponibile,
  durataVideo,
  videoTroppoLungo,
  DURATA_VIDEO_MAX,
} from '../lib/media'
import { IconTrash, IconImage, IconComment, IconLock, IconGlobe } from './icons'

// ---------------------------------------------------------------------------
// Commenti + foto/video di un esercizio (riutilizzabile).
//
// - Commenti: testo + autore, salvati nella scheda (localStorage).
// - Media: foto/video; il blob va in IndexedDB (lib/media), nell'esercizio
//   resta solo un riferimento leggero.
//
// Ogni media ha una VISIBILITÀ scelta al caricamento:
//   - 'privata'  → la vede solo chi l'ha caricata (l'autore);
//   - 'pubblica' → la vede chiunque guardi la scheda.
// Il filtro è applicato ovunque il componente sia usato (anteprime, sessione,
// Schede Generali): un media privato compare solo se l'utente attivo è l'autore.
//
// `onChange(esercizioAggiornato)` riceve l'esercizio con commenti/media nuovi
// (il genitore lo persiste come preferisce). `readOnly` mostra solo la vista.
// L'autore dei nuovi elementi è l'utente attivo.
// ---------------------------------------------------------------------------

const LIMITE_BYTE = 200 * 1024 * 1024 // 200MB: oltre, meglio evitare (memoria/quota)

// Visibilità effettiva di un media (default 'pubblica' per i vecchi media).
const visDi = (m) => m.visibilita || 'pubblica'

function MediaThumb({ m, onRemove, onToggleVis, readOnly, mine }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)

  useEffect(() => {
    let vivo = true
    let creato = null
    getMediaBlob(m.id)
      .then((blob) => {
        if (!vivo) return
        if (!blob) {
          setMancante(true)
          return
        }
        creato = URL.createObjectURL(blob)
        setUrl(creato)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      if (creato) URL.revokeObjectURL(creato)
    }
  }, [m.id])

  const privata = visDi(m) === 'privata'
  // Badge di visibilità: cliccabile (per cambiarla) se sono l'autore e sto
  // modificando; solo informativo (lucchetto) quando è privata in sola lettura.
  const mostraBadge = (!readOnly && mine) || (readOnly && privata)

  return (
    <div className="media-thumb">
      {mancante ? (
        <div className="media-mancante">Media non disponibile</div>
      ) : m.tipo === 'video' ? (
        url ? <video src={url} controls playsInline /> : <div className="media-loading" />
      ) : url ? (
        <img src={url} alt={m.nome || 'Foto esercizio'} />
      ) : (
        <div className="media-loading" />
      )}
      {mostraBadge &&
        (!readOnly && mine ? (
          <button
            className={`media-vis ${privata ? 'privata' : 'pubblica'}`}
            onClick={onToggleVis}
            type="button"
            aria-label={privata ? 'Media privato — rendi pubblico' : 'Media pubblico — rendi privato'}
            title={privata ? 'Visibile solo a te' : 'Visibile a chi guarda la scheda'}
          >
            {privata ? <IconLock width={13} height={13} /> : <IconGlobe width={13} height={13} />}
          </button>
        ) : (
          <span className="media-vis privata" title="Visibile solo a te" aria-label="Media privato">
            <IconLock width={13} height={13} />
          </span>
        ))}
      {!readOnly && (
        <button className="media-del" onClick={onRemove} aria-label="Rimuovi media" type="button">
          <IconTrash width={15} height={15} />
        </button>
      )}
    </div>
  )
}

export default function EsercizioAllegati({ esercizio, onChange, readOnly = false }) {
  const { utenteCorrente } = useAccount()
  const autore = utenteCorrente?.nome || ''
  const [testo, setTesto] = useState('')
  const [caricando, setCaricando] = useState(false)
  // File rifiutati dall'ultima selezione (troppo lunghi, troppo grandi, illeggibili).
  const [scartati, setScartati] = useState([])
  const [visibilita, setVisibilita] = useState('privata') // per i nuovi media
  const fileRef = useRef(null)

  const commenti = esercizio.commenti || []
  const media = esercizio.media || []

  // Un media è visibile se è pubblico, oppure se l'utente attivo ne è l'autore.
  const mine = (m) => !!autore && m.autore === autore
  const mediaVisibili = media.filter((m) => visDi(m) === 'pubblica' || mine(m))

  // In sola lettura senza contenuti (visibili) non mostrare nulla.
  if (readOnly && commenti.length === 0 && mediaVisibili.length === 0) return null

  const aggiungiCommento = () => {
    const t = testo.trim()
    if (!t) return
    const c = { id: nuovoId(), testo: t, autore, creatoIl: new Date().toISOString() }
    onChange({ ...esercizio, commenti: [...commenti, c] })
    setTesto('')
  }

  const rimuoviCommento = (id) =>
    onChange({ ...esercizio, commenti: commenti.filter((c) => c.id !== id) })

  const onFile = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // consenti di riselezionare lo stesso file
    if (files.length === 0) return
    setCaricando(true)
    setScartati([])
    const nuovi = []
    const rifiutati = []
    for (const f of files) {
      if (f.size > LIMITE_BYTE) {
        rifiutati.push(`"${f.name}" è troppo grande (oltre 200MB).`)
        continue
      }
      const tipo = f.type.startsWith('video') ? 'video' : 'foto'
      // I video li accettiamo solo brevi: è il modo di tenere l'archivio
      // leggero. Il taglio si fa dove il video è già (Foto sull'iPhone), non
      // qui: ritagliarlo nel browser vorrebbe dire ricodificarlo, perdendo
      // qualità e tempo.
      if (tipo === 'video') {
        const secondi = await durataVideo(f)
        if (secondi == null) {
          rifiutati.push(
            `"${f.name}": non riesco a leggerne la durata, quindi non posso allegarlo (l'app non riuscirebbe nemmeno a riprodurlo).`,
          )
          continue
        }
        if (videoTroppoLungo(secondi)) {
          rifiutati.push(
            `"${f.name}" dura ${Math.round(secondi)} secondi: il massimo è ${DURATA_VIDEO_MAX}. Ritaglialo e riprova (su iPhone: Foto → Modifica → trascina le estremità).`,
          )
          continue
        }
      }
      const id = nuovoId()
      try {
        await salvaMedia(id, f, { tipo, nome: f.name })
        nuovi.push({ id, tipo, nome: f.name, autore, visibilita, creatoIl: new Date().toISOString() })
      } catch (err) {
        console.warn('Salvataggio media fallito', err)
        rifiutati.push(`"${f.name}": salvataggio non riuscito.`)
      }
    }
    setCaricando(false)
    setScartati(rifiutati)
    if (nuovi.length > 0) onChange({ ...esercizio, media: [...media, ...nuovi] })
  }

  const rimuoviMedia = (id) => {
    onChange({ ...esercizio, media: media.filter((m) => m.id !== id) })
    eliminaMedia(id).catch(() => {})
  }

  // Cambia la visibilità di un media già caricato (privata ⇄ pubblica).
  const cambiaVisibilita = (id) =>
    onChange({
      ...esercizio,
      media: media.map((m) =>
        m.id === id ? { ...m, visibilita: visDi(m) === 'privata' ? 'pubblica' : 'privata' } : m,
      ),
    })

  return (
    <div className="allegati">
      {commenti.length > 0 && (
        <div className="allegati-commenti">
          {commenti.map((c) => (
            <div key={c.id} className="allegato-commento">
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="allegato-testo">{c.testo}</div>
                {c.autore && <div className="allegato-autore">— {c.autore}</div>}
              </div>
              {!readOnly && (
                <button
                  className="icon-btn"
                  onClick={() => rimuoviCommento(c.id)}
                  aria-label="Elimina commento"
                  type="button"
                >
                  <IconTrash width={16} height={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {mediaVisibili.length > 0 && (
        <div className="allegati-media">
          {mediaVisibili.map((m) => (
            <MediaThumb
              key={m.id}
              m={m}
              readOnly={readOnly}
              mine={mine(m)}
              onRemove={() => rimuoviMedia(m.id)}
              onToggleVis={() => cambiaVisibilita(m.id)}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="allegati-add">
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              value={testo}
              placeholder="Aggiungi un commento…"
              onChange={(e) => setTesto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aggiungiCommento()
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-sm"
              type="button"
              onClick={aggiungiCommento}
              disabled={!testo.trim()}
              aria-label="Aggiungi commento"
            >
              <IconComment width={16} height={16} />
            </button>
          </div>
          {mediaDisponibile() && (
            <div className="allegato-upload" style={{ marginTop: 8 }}>
              <div className="vis-seg" role="group" aria-label="Visibilità dei nuovi media">
                <button
                  type="button"
                  className={`vis-opt ${visibilita === 'privata' ? 'on' : ''}`}
                  onClick={() => setVisibilita('privata')}
                  aria-pressed={visibilita === 'privata'}
                >
                  <IconLock width={14} height={14} /> Privata
                </button>
                <button
                  type="button"
                  className={`vis-opt ${visibilita === 'pubblica' ? 'on' : ''}`}
                  onClick={() => setVisibilita('pubblica')}
                  aria-pressed={visibilita === 'pubblica'}
                >
                  <IconGlobe width={14} height={14} /> Pubblica
                </button>
              </div>
              <div className="vis-hint">
                {visibilita === 'privata'
                  ? 'Visibile solo a te.'
                  : 'Visibile a chi guarda la scheda.'}
              </div>
              <label className="btn btn-sm btn-block allegato-file" style={{ marginTop: 8 }}>
                <IconImage width={16} height={16} />
                {caricando ? 'Caricamento…' : 'Aggiungi foto o video'}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onFile}
                  disabled={caricando}
                  hidden
                />
              </label>
              <div className="vis-hint" style={{ marginTop: 6 }}>
                Video: al massimo {DURATA_VIDEO_MAX} secondi.
              </div>
              {scartati.length > 0 && (
                <div className="form-error" style={{ marginTop: 8, lineHeight: 1.45 }}>
                  {scartati.map((m, i) => (
                    <div key={i} style={i > 0 ? { marginTop: 6 } : undefined}>
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
