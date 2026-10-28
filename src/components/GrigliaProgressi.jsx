import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CATEGORIA,
  VISIBILITA_FOTO,
  aggiornaVisibilitaProgresso,
  aggiungiCommento,
  categoriaDi,
  commentiDi,
  eliminaCommento,
  eliminaProgresso,
  fonteProgresso,
  giornoLungo,
  oggiIso,
  perGiorno,
  salvaProgresso,
} from '../lib/progressi'
import { DURATA_VIDEO_MAX, durataVideo, fileTroppoPesante, messaggioTroppoPesante, videoTroppoLungo } from '../lib/media'
import { quandoBreve } from '../lib/format'
import { IconClose, IconCoach, IconComment, IconLock, IconInvia, IconPlay, IconTrash, IconUpload } from './icons'
import TastoFoto from './TastoFoto'

// ---------------------------------------------------------------------------
// I pezzi della sezione "Check e video", usati da tutte e due le parti: dall'atleta,
// nella sua sezione, e dal personal trainer dentro la cartella di un atleta.
//
// Sono gli stessi pezzi apposta. Un PT che guarda il check di marzo deve vedere
// esattamente quello che vede l'atleta — stessa griglia, stesse date, stesse
// note — se no i due parlano di due cose diverse mentre credono di parlare
// della stessa.
//
// Quello che CAMBIA fra i due è cosa si può toccare, e sono due permessi
// separati apposta:
//   · `puoiAprire`  — la levetta lucchetto/PT. Ce l'ha SOLO l'atleta: è la sua
//                     scelta, e il database non lascia cambiarla a nessun altro
//                     (policy "progressi: li governo io che ci sono dentro").
//   · `puoiEliminare` — l'atleta su tutto, il PT solo sugli scatti che ha
//                     caricato lui, per disfare uno sbaglio appena fatto.
// ⚠️ Nasconderli qui non è la sicurezza: la sicurezza è la regola sul database.
// Qui si evita solo di mostrare un pulsante che darebbe errore.
// ---------------------------------------------------------------------------


/** Aperta al PT solo se c'è scritto: qualunque altra cosa è privata. */
const apertaAlPt = (r) => r?.visibilita === VISIBILITA_FOTO.PT

/**
 * Apre o chiude lo scatto al PT. Torna la riga nuova, o null se il server ha
 * detto no. ⚠️ La schermata si aggiorna solo col sì: il contrario — il
 * lucchetto che si apre e il database che non lo sa — è esattamente il modo in
 * cui uno crede di aver mostrato una foto al PT e invece no.
 * Aprirla è anche "mandarla": al PT arriva la notifica (lib/notifiche).
 */
async function cambiaVisibilitaScatto(riga) {
  const nuova = apertaAlPt(riga) ? VISIBILITA_FOTO.PRIVATA : VISIBILITA_FOTO.PT
  const esito = await aggiornaVisibilitaProgresso(riga.id, nuova)
  return esito.ok ? { ...riga, visibilita: nuova } : null
}

/**
 * La fonte di uno scatto (copia locale o link firmato), revocata quando non
 * serve più. ⚠️ I campi, non l'oggetto: la riga viene da un array che si ricrea
 * a ogni ricarica, e con [riga] si rifarebbe una URL firmata a ogni giro.
 */
function useFonteProgresso({ id, percorso, atleta_id: atletaId }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)
  useEffect(() => {
    let vivo = true
    let revoca = () => {}
    fonteProgresso({ id, percorso, atleta_id: atletaId })
      .then((f) => {
        if (!vivo) {
          f.revoca()
          return
        }
        revoca = f.revoca
        if (!f.url) {
          setMancante(true)
          return
        }
        setUrl(f.url)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      revoca()
    }
  }, [id, percorso, atletaId])
  return { url, mancante }
}

export function MiniaturaProgresso({
  riga,
  puoiAprire,
  puoiEliminare,
  onCambiata,
  onEliminata,
  commenti = 0,
  onApri,
}) {
  const { tipo } = riga
  const { url, mancante } = useFonteProgresso(riga)

  const aperta = apertaAlPt(riga)

  const cambiaVisibilita = async (e) => {
    e.stopPropagation()
    const esito = await cambiaVisibilitaScatto(riga)
    if (esito) onCambiata?.(esito)
  }

  const elimina = async (e) => {
    e.stopPropagation()
    if (!window.confirm(tipo === 'video' ? 'Eliminare questo video?' : 'Eliminare questa foto?')) return
    const esito = await eliminaProgresso(riga)
    if (esito.ok) onEliminata?.(riga)
  }

  const esecuzione = categoriaDi(riga) === CATEGORIA.ESECUZIONE

  return (
    // Toccare lo scatto lo apre grande, coi commenti (DettaglioProgresso).
    // Il video qui è fermo: si guarda aperto, dove ha i comandi.
    <div
      className={'media-thumb' + (onApri ? ' apribile' : '')}
      role={onApri ? 'button' : undefined}
      tabIndex={onApri ? 0 : undefined}
      aria-label={onApri ? (esecuzione && riga.esercizio ? `Apri ${riga.esercizio}` : 'Apri') : undefined}
      onClick={onApri ? () => onApri(riga) : undefined}
      onKeyDown={onApri ? (e) => e.key === 'Enter' && onApri(riga) : undefined}
    >
      {mancante ? (
        <div className="media-mancante">{tipo === 'video' ? 'Video non disponibile' : 'Foto non disponibile'}</div>
      ) : tipo === 'video' ? (
        url ? (
          <>
            <video src={url} muted playsInline preload="metadata" />
            <span className="media-play" aria-hidden="true">
              <IconPlay width={22} height={22} />
            </span>
          </>
        ) : (
          <div className="media-loading" />
        )
      ) : url ? (
        <img src={url} alt={riga.nota || riga.nome || 'Foto del check'} />
      ) : (
        <div className="media-loading" />
      )}

      {esecuzione && riga.esercizio && <span className="media-etichetta">{riga.esercizio}</span>}

      {commenti > 0 && (
        <span className="media-commenti" aria-label={`${commenti} commenti`}>
          <IconComment width={12} height={12} /> {commenti}
        </span>
      )}

      {puoiAprire ? (
        <button
          type="button"
          className={`media-vis ${aperta ? 'al-pt' : 'privata'}`}
          onClick={cambiaVisibilita}
          aria-label={aperta ? 'La vede il tuo PT: richiudila' : 'Privata: mostrala al tuo PT'}
          title={aperta ? 'La vede anche il tuo personal trainer' : 'La vedi solo tu'}
        >
          {aperta ? <IconCoach width={13} height={13} /> : <IconLock width={13} height={13} />}
        </button>
      ) : (
        aperta && (
          <span className="media-vis al-pt" title="L'atleta l'ha mostrata a te" aria-hidden="true">
            <IconCoach width={13} height={13} />
          </span>
        )
      )}

      {riga.soloLocale && (
        <span className="media-locale" title="Non è ancora partita: riprovo quando torna la rete">
          Solo su questo dispositivo
        </span>
      )}

      {puoiEliminare && (
        <button
          type="button"
          className="media-del"
          onClick={elimina}
          aria-label="Elimina questa foto"
        >
          <IconTrash width={15} height={15} />
        </button>
      )}
    </div>
  )
}

/**
 * Gli scatti raggruppati per giorno. È così che si guarda un check — "3 marzo",
 * non ventisei miniature in fila senza sapere quando sono state fatte.
 */
export function GrigliaProgressi({
  righe,
  puoiAprire,
  puoEliminareRiga,
  onCambiata,
  onEliminata,
  commenti = {},
  onApri,
}) {
  const giorni = perGiorno(righe)
  if (giorni.length === 0) return null

  return (
    <div className="stack" style={{ gap: 18 }}>
      {giorni.map((g) => (
        <div key={g.data || 'senza-data'}>
          <div className="section-title">
            {giornoLungo(g.data)}
            {g.righe.some((r) => r.nota) && (
              <span className="muted" style={{ fontWeight: 400 }}>
                {' · '}
                {g.righe.find((r) => r.nota)?.nota}
              </span>
            )}
          </div>
          <div className="allegati-media">
            {g.righe.map((r) => (
              <MiniaturaProgresso
                key={r.id}
                riga={r}
                puoiAprire={puoiAprire}
                puoiEliminare={puoEliminareRiga ? puoEliminareRiga(r) : false}
                onCambiata={onCambiata}
                onEliminata={onEliminata}
                commenti={commenti[r.id] || 0}
                onApri={onApri}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Uno scatto aperto grande, coi commenti fra l'atleta e il suo PT.
 *
 * I commenti ci sono solo se lo scatto è APERTO al PT: su uno privato non c'è
 * nessuno con cui parlare (e il database rifiuterebbe). All'atleta, su uno
 * privato, si offre di mandarlo al PT — è la stessa levetta del lucchetto.
 *
 * @param {string}   ioId
 * @param {boolean}  puoiAprire   è l'atleta (la levetta è sua)
 * @param {string}   nomeAltro    con chi si parla: il PT per l'atleta, l'atleta per il PT
 * @param {(id:string)=>string} nomeDi  il nome di chi ha scritto un commento
 */
export function DettaglioProgresso({ riga, ioId, puoiAprire, nomeAltro, nomeDi, onChiudi, onCambiata, onCommenti }) {
  const { url, mancante } = useFonteProgresso(riga)
  const [commenti, setCommenti] = useState(null)
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')
  const fondo = useRef(null)
  const aperta = apertaAlPt(riga)
  const esecuzione = categoriaDi(riga) === CATEGORIA.ESECUZIONE
  // ⚠️ In un ref: la funzione arriva nuova a ogni render del padre, e fra le
  // dipendenze dell'effetto qui sotto lo farebbe girare all'infinito.
  const avvisaCommenti = useRef(onCommenti)
  useEffect(() => {
    avvisaCommenti.current = onCommenti
  })

  useEffect(() => {
    let vivo = true
    commentiDi(riga.id).then((esito) => {
      if (!vivo) return
      setCommenti(esito.righe)
      if (!esito.ok) setErrore(esito.errore)
    })
    return () => {
      vivo = false
    }
  }, [riga.id])

  useEffect(() => {
    if (commenti) avvisaCommenti.current?.(riga.id, commenti.length)
    fondo.current?.scrollIntoView({ block: 'nearest' })
  }, [commenti, riga.id])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])

  const manda = async (e) => {
    e.preventDefault()
    if (invio || !testo.trim()) return
    setInvio(true)
    setErrore('')
    const esito = await aggiungiCommento(riga.id, testo)
    setInvio(false)
    if (!esito.ok) return setErrore(esito.errore)
    setTesto('')
    setCommenti((c) => [...(c || []), esito.riga])
  }

  const togli = async (c) => {
    const esito = await eliminaCommento(c.id)
    if (esito.ok) setCommenti((tutti) => tutti.filter((x) => x.id !== c.id))
  }

  const cambia = async () => {
    const nuova = await cambiaVisibilitaScatto(riga)
    if (nuova) onCambiata?.(nuova)
    else setErrore('Non sono riuscito a cambiarlo. Riprova.')
  }

  const titolo = esecuzione ? riga.esercizio || 'Esecuzione' : 'Check del fisico'

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal scatto-dettaglio" role="dialog" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div className="grow" style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>{titolo}</h3>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {giornoLungo(riga.data)}
              {riga.nota ? ` · ${riga.nota}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>

        <div className="scatto-media">
          {mancante ? (
            <div className="media-mancante">Non disponibile</div>
          ) : !url ? (
            <div className="media-loading" />
          ) : riga.tipo === 'video' ? (
            <video src={url} controls playsInline autoPlay muted />
          ) : (
            <img src={url} alt={titolo} />
          )}
        </div>

        {puoiAprire && (
          <button
            type="button"
            className={'btn btn-sm btn-block' + (aperta ? ' btn-ghost' : ' btn-accent')}
            onClick={cambia}
          >
            {aperta ? <IconLock width={15} height={15} /> : <IconCoach width={15} height={15} />}
            {aperta
              ? `La vede ${nomeAltro || 'il tuo PT'}: rendila privata`
              : nomeAltro
                ? `Manda a ${nomeAltro} per un parere`
                : 'Rendila visibile al tuo PT'}
          </button>
        )}

        <div className="section-title" style={{ marginTop: 6 }}>
          Commenti
        </div>
        {!aperta ? (
          <p className="muted" style={{ fontSize: 12.5 }}>
            {puoiAprire
              ? 'È privata: quando la mandi al tuo PT potete commentarla qui.'
              : 'Non è più visibile a te.'}
          </p>
        ) : commenti == null ? (
          <p className="muted">Un attimo…</p>
        ) : (
          <div className="scatto-commenti">
            {commenti.length === 0 && (
              <p className="muted" style={{ fontSize: 12.5 }}>
                {puoiAprire ? `Ancora niente: ${nomeAltro || 'il tuo PT'} riceve una notifica.` : 'Scrivi cosa correggere: gli arriva una notifica.'}
              </p>
            )}
            {commenti.map((c) => {
              const mio = c.autoreId === ioId
              return (
                <div key={c.id} className={'scatto-commento' + (mio ? ' mio' : '')}>
                  <div className="scatto-commento-testa">
                    <strong>{mio ? 'Tu' : nomeDi?.(c.autoreId) || nomeAltro || ''}</strong>
                    <span className="faint">{quandoBreve(c.creatoIl)}</span>
                    {mio && (
                      <button className="scatto-commento-togli" onClick={() => togli(c)} aria-label="Elimina commento">
                        <IconTrash width={13} height={13} />
                      </button>
                    )}
                  </div>
                  <div className="scatto-commento-testo">{c.testo}</div>
                </div>
              )
            })}
            <div ref={fondo} />
          </div>
        )}

        {aperta && (
          <form className="scatto-scrivi" onSubmit={manda}>
            <input
              className="input"
              value={testo}
              maxLength={2000}
              placeholder={puoiAprire ? 'Scrivi al tuo PT…' : 'Scrivi una correzione…'}
              onChange={(e) => setTesto(e.target.value)}
            />
            <button className="icon-btn" type="submit" disabled={invio || !testo.trim()} aria-label="Invia">
              <IconInvia width={18} height={18} />
            </button>
          </form>
        )}
        {errore && <p className="form-error">{errore}</p>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Il pulsante per aggiungere scatti a un check.
 *
 * La DATA si sceglie prima di scegliere i file, e parte da oggi: una foto di
 * marzo caricata a maggio va messa a marzo, se no la sequenza non racconta
 * niente. La nota è facoltativa ed è il posto dove finisce il peso del giorno.
 *
 * @param {string} atletaId   di chi è il corpo nella foto (= la cartella)
 * @param {string} caricatoDa chi sta premendo il pulsante
 */
export function CaricaProgressi({ atletaId, caricatoDa, onCaricati, categoria = CATEGORIA.CHECK }) {
  const esecuzione = categoria === CATEGORIA.ESECUZIONE
  const [data, setData] = useState(oggiIso())
  const [nota, setNota] = useState('')
  const [esercizio, setEsercizio] = useState('')
  const [caricando, setCaricando] = useState(false)
  const [scartati, setScartati] = useState([])
  const [inSospeso, setInSospeso] = useState(0)

  const scegli = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // così si può riscegliere lo stesso file
    if (files.length === 0) return

    setCaricando(true)
    setScartati([])
    setInSospeso(0)
    const rifiutati = []
    const nuove = []
    let sospesi = 0

    for (const f of files) {
      if (fileTroppoPesante(f)) {
        rifiutati.push(messaggioTroppoPesante(f))
        continue
      }
      const tipo = f.type.startsWith('video') ? 'video' : 'foto'
      // Stessa regola degli allegati: i video solo brevi, e il taglio si fa
      // dove il video è già (Foto sull'iPhone), non qui.
      if (tipo === 'video') {
        const secondi = await durataVideo(f)
        if (secondi == null) {
          rifiutati.push(`"${f.name}": non riesco a leggerne la durata, quindi non posso caricarlo.`)
          continue
        }
        if (videoTroppoLungo(secondi)) {
          rifiutati.push(
            `"${f.name}" dura ${Math.round(secondi)} secondi: il massimo è ${DURATA_VIDEO_MAX}. Ritaglialo e riprova (su iPhone: Foto → Modifica → trascina le estremità).`,
          )
          continue
        }
      }
      try {
        const esito = await salvaProgresso({
          blob: f,
          atletaId,
          caricatoDa,
          tipo,
          nome: f.name,
          data,
          nota: nota.trim(),
          categoria,
          esercizio: esecuzione ? esercizio : '',
        })
        if (esito.soloLocale) sospesi += 1
        // ⚠️ Se il server ha detto NO (non "non ti ho sentito") si dice quale
        // file e perché: è l'unica cosa con cui l'utente può rimediare.
        if (esito.errore) rifiutati.push(`"${f.name}": ${esito.errore}`)
        nuove.push(esito.riga)
      } catch (err) {
        console.warn('Salvataggio della foto fallito', err)
        rifiutati.push(`"${f.name}": salvataggio non riuscito.`)
      }
    }

    setCaricando(false)
    setScartati(rifiutati)
    setInSospeso(sospesi)
    setNota('')
    setEsercizio('')
    if (nuove.length > 0) onCaricati?.(nuove)
  }

  return (
    <div className="card stack" style={{ gap: 10 }}>
      {esecuzione && (
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Esercizio</span>
          <input
            className="input"
            type="text"
            maxLength={80}
            value={esercizio}
            placeholder="Squat, panca piana…"
            onChange={(e) => setEsercizio(e.target.value)}
          />
        </label>
      )}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {/* I campi `.input` dell'app, come in Correggi (components/ModificaAllenamento). */}
        <label className="stack" style={{ gap: 4, flex: '1 1 140px' }}>
          <span className="muted" style={{ fontSize: 12 }}>{esecuzione ? 'Giorno' : 'Giorno del check'}</span>
          <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 4, flex: '1 1 160px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Nota (facoltativa)</span>
          <input
            className="input"
            type="text"
            value={nota}
            placeholder={esecuzione ? '100 kg · guarda la discesa' : '78,4 kg · fine massa'}
            onChange={(e) => setNota(e.target.value)}
          />
        </label>
      </div>

      <TastoFoto
        accept={esecuzione ? 'video/*,image/*' : 'image/*,video/*'}
        multiple
        disabled={caricando}
        onChange={scegli}
      >
        <IconUpload width={16} height={16} />
        {caricando ? 'Carico…' : esecuzione ? 'Aggiungi un video' : 'Aggiungi foto o video'}
      </TastoFoto>

      {inSospeso > 0 && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          {inSospeso === 1 ? 'Uno scatto è' : `${inSospeso} scatti sono`} solo su questo
          dispositivo: riprovo a mandarli quando torna la rete.
        </p>
      )}
      {scartati.length > 0 && (
        <ul className="stack" style={{ gap: 4, fontSize: 12.5, paddingLeft: 18 }}>
          {scartati.map((m, i) => (
            <li key={i} className="muted">{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
