import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  commentoValido,
  eliminaCommento,
  leggiCommenti,
  scriviCommento,
  urlFotoCommento,
} from '../lib/interazioni'
import { quandoBreve } from '../lib/format'
import { IconClose, IconImage, IconTrash } from './icons'

// ---------------------------------------------------------------------------
// I commenti sotto un allenamento del Feed: si leggono come una chat, dal più
// vecchio, e si scrive in fondo. In un commento si può allegare una FOTO (non
// un video: pesano troppo per restare lì per sempre), che parte rimpicciolita
// (lib/interazioni).
//
// Chi può togliere un commento: chi l'ha scritto, e chi ha fatto
// l'allenamento (sotto le proprie cose si fa ordine). Lo decide il database;
// qui si mostra il cestino solo a loro, per non offrire un tasto che poi
// fallisce.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

function FotoCommento({ percorso }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)
  useEffect(() => {
    let vivo = true
    urlFotoCommento(percorso).then((u) => {
      if (!vivo) return
      if (u) setUrl(u)
      else setMancante(true)
    })
    return () => {
      vivo = false
    }
  }, [percorso])
  if (mancante) return <div className="commento-foto mancante">Foto non disponibile</div>
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="commento-foto">
      <img src={url} alt="Foto allegata al commento" />
    </a>
  ) : (
    <div className="commento-foto media-loading" />
  )
}

/**
 * @param {{
 *   chiave: string, ioId: string, ioNome: string, proprietarioId: string,
 *   titolo: string, onChiudi: () => void,
 *   onCambio?: (riassunto: {commenti:number, ultimo:object|null}) => void,
 * }} props
 */
export default function CommentiAllenamento({
  chiave,
  ioId,
  ioNome,
  proprietarioId,
  titolo,
  onChiudi,
  onCambio,
}) {
  const [righe, setRighe] = useState(null) // null = sta leggendo
  const [errore, setErrore] = useState('')
  const [testo, setTesto] = useState('')
  const [file, setFile] = useState(null)
  const [inCorso, setInCorso] = useState(false)
  const [daTogliere, setDaTogliere] = useState(null) // id del commento che chiede conferma
  const input = useRef(null)
  const fondo = useRef(null)

  useEffect(() => {
    let vivo = true
    leggiCommenti(chiave).then((esito) => {
      if (!vivo) return
      setRighe(esito.righe)
      if (!esito.ok) setErrore(esito.errore)
    })
    return () => {
      vivo = false
    }
  }, [chiave])

  // L'anteprima della foto scelta: un link al file in memoria, da liberare
  // quando cambia o si chiude.
  const anteprima = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => anteprima && URL.revokeObjectURL(anteprima), [anteprima])

  // Si resta in fondo, dove arrivano i commenti nuovi.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
  }, [righe?.length])

  const riassumi = (lista) =>
    onCambio?.({
      commenti: lista.length,
      ultimo: lista.length
        ? {
            nome: lista[lista.length - 1].nome,
            testo: lista[lista.length - 1].testo,
            foto: !!lista[lista.length - 1].foto,
          }
        : null,
    })

  const invia = async (e) => {
    e?.preventDefault()
    if (!commentoValido(testo, file) || inCorso) return
    setInCorso(true)
    setErrore('')
    const esito = await scriviCommento({ chiave, ioId, ioNome, testo, file })
    setInCorso(false)
    if (!esito.ok) return setErrore(esito.errore)
    const lista = [...(righe || []), esito.riga]
    setRighe(lista)
    riassumi(lista)
    setTesto('')
    setFile(null)
  }

  const togli = async (c) => {
    setDaTogliere(null)
    const esito = await eliminaCommento(c)
    if (!esito.ok) return setErrore(esito.errore)
    const lista = (righe || []).filter((x) => x.id !== c.id)
    setRighe(lista)
    riassumi(lista)
  }

  const scegliFoto = (e) => {
    const f = (e.target.files || [])[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErrore('Nei commenti si allegano solo foto.')
      return
    }
    setErrore('')
    setFile(f)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal commenti-modale"
        role="dialog"
        aria-label="Commenti"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 0 }}>Commenti</h3>
            {titolo && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                {titolo}
              </div>
            )}
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        <div className="commenti-lista">
          {righe === null ? (
            <p className="muted" style={{ fontSize: 13.5 }}>Un attimo…</p>
          ) : righe.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, textAlign: 'center', padding: '18px 0' }}>
              Ancora nessun commento. Scrivi il primo.
            </p>
          ) : (
            righe.map((c) => {
              const puoTogliere = c.userId === ioId || proprietarioId === ioId
              return (
                <div key={c.id} className="commento">
                  <span className="user-avatar sm" aria-hidden="true">
                    {iniziale(c.nome)}
                  </span>
                  <div className="commento-corpo">
                    <div className="commento-testa">
                      <strong>{c.nome || 'Qualcuno'}</strong>
                      <span className="faint">{quandoBreve(c.creatoIl)}</span>
                      {puoTogliere && daTogliere !== c.id && (
                        <button
                          type="button"
                          className="commento-togli"
                          aria-label="Togli il commento"
                          onClick={() => setDaTogliere(c.id)}
                        >
                          <IconTrash width={14} height={14} />
                        </button>
                      )}
                    </div>
                    {c.testo && <div className="commento-testo">{c.testo}</div>}
                    {c.foto && <FotoCommento percorso={c.foto} />}
                    {daTogliere === c.id && (
                      <div className="row" style={{ gap: 6, marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-pieno"
                          onClick={() => togli(c)}
                        >
                          Togli
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => setDaTogliere(null)}>
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={fondo} />
        </div>

        {errore && <p className="form-error" style={{ margin: '6px 2px' }}>{errore}</p>}

        {anteprima && (
          <div className="commento-allegato">
            <img src={anteprima} alt="Foto da allegare" />
            <button
              type="button"
              className="icon-btn"
              aria-label="Togli la foto"
              onClick={() => setFile(null)}
            >
              <IconClose width={16} height={16} />
            </button>
          </div>
        )}

        <form className="commenti-barra" onSubmit={invia}>
          <input ref={input} type="file" accept="image/*" hidden onChange={scegliFoto} />
          <button
            type="button"
            className="icon-btn"
            aria-label="Allega una foto"
            onClick={() => input.current?.click()}
          >
            <IconImage />
          </button>
          <input
            type="text"
            className="input"
            value={testo}
            placeholder="Aggiungi un commento…"
            maxLength={2000}
            onChange={(e) => setTesto(e.target.value)}
          />
          <button type="submit" className="btn" disabled={!commentoValido(testo, file) || inCorso}>
            {inCorso ? '…' : 'Invia'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
