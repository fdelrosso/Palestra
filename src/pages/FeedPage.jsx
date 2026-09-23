import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import useCollettivo from '../hooks/useCollettivo'
import { storicoGlobale } from '../lib/storico'
import { DURATE, filtraFeed, quantiFiltri } from '../lib/feed'
import { GRUPPI } from '../lib/muscoli'
import { VISIBILITA, visibilitaDi } from '../lib/visibilita'
import {
  VISIBILITA_FOTO_ALL,
  aggiornaVisibilitaFotoAllenamento,
  aggiungiFotoAllenamento,
  chiaveAllenamento,
  fotoDiAllenamenti,
  riprovaFotoInSospeso,
} from '../lib/fotoAllenamento'
import { DURATA_VIDEO_MAX, durataVideo, videoTroppoLungo } from '../lib/media'
import SchedaRecap from '../components/SchedaRecap'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import { IconClose, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------
// Feed: la seconda linguetta della barra in basso.
//
// Non è più una lista di righe da aprire una per una: è uno scorrimento di
// SCHEDE DI RECAP, quelle vere, col corpo e i muscoli accesi. Quello che prima
// stava dietro a un tocco adesso si vede scorrendo, che è il motivo per cui un
// feed si guarda.
//
// Ogni scheda si sfoglia anche di LATO: recap, poi le foto di quella giornata
// (components/SchedaRecap).
//
// ⚠️ IL FILTRO CHE CONTA NON È QUI. Le voci arrivano da `storicoGlobale`, che
// mostra i pubblici più i propri, e quel taglio lo fa il database. I filtri di
// questa pagina — gruppo, durata, esercizio, "Amici" — sono di comodo: se
// sparissero si vedrebbe più roba, ma niente che non si avesse già il diritto
// di vedere.
//
// ⚠️ Gli allenamenti AGGIUNTI A MANO ci sono, se resi pubblici. Non hanno serie
// né durata, e la loro scheda lo dice invece di sembrare rotta.
// ---------------------------------------------------------------------------

const LIMITE_BYTE = 200 * 1024 * 1024

function ChipFiltro({ acceso, onClick, children, colore }) {
  return (
    <button
      type="button"
      className={'chip chip-azione' + (acceso ? ' chip-on' : '')}
      onClick={onClick}
      aria-pressed={acceso}
    >
      {colore && <span className="gruppo-swatch" style={{ '--g': colore }} />}
      {children}
    </button>
  )
}

export default function FeedPage() {
  const { utenteCorrente, amici } = useAccount()
  const { dati, caricando, errore } = useCollettivo()
  const { aggiornaCompletamento } = useStore()

  const [chi, setChi] = useState('tutti')
  const [gruppi, setGruppi] = useState([])
  const [durate, setDurate] = useState([])
  const [esercizio, setEsercizio] = useState('')
  const [pannello, setPannello] = useState(false)
  const [foto, setFoto] = useState({})
  const [aperto, setAperto] = useState(null)
  const [avviso, setAvviso] = useState('')
  // L'allenamento a cui si e' appena attaccata una foto, ma che e' nascosto.
  const [daPubblicare, setDaPubblicare] = useState(null)

  const input = useRef(null)
  const bersaglio = useRef(null) // l'allenamento a cui stiamo attaccando la foto

  const ioId = utenteCorrente?.id || null
  const amiciIds = useMemo(() => (amici || []).map((a) => a.id), [amici])

  const tutte = useMemo(() => storicoGlobale({ collettivo: dati, ioId }), [dati, ioId])
  const voci = useMemo(
    () => filtraFeed(tutte, { chi, amiciIds, ioId, gruppi, durate, esercizio }),
    [tutte, chi, amiciIds, ioId, gruppi, durate, esercizio],
  )

  // Le foto di TUTTE le schede a schermo in una richiesta sola: una per scheda
  // sarebbe una richiesta per ogni riga del feed.
  const chiavi = useMemo(() => voci.map((v) => chiaveAllenamento(v)), [voci])
  const chiaviFirma = chiavi.join('~')

  const ricaricaFoto = useCallback(async () => {
    if (chiavi.length === 0) {
      setFoto({})
      return
    }
    setFoto(await fotoDiAllenamenti(chiavi))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaviFirma])

  useEffect(() => {
    ricaricaFoto()
    riprovaFotoInSospeso()
      .then((rimaste) => rimaste === 0 && ricaricaFoto())
      .catch(() => {})
  }, [ricaricaFoto])

  const accesi = quantiFiltri({ gruppi, durate, esercizio })
  const alterna = (elenco, set, id) =>
    set(elenco.includes(id) ? elenco.filter((x) => x !== id) : [...elenco, id])
  const azzera = () => {
    setGruppi([])
    setDurate([])
    setEsercizio('')
  }

  const chiediFoto = (voce) => {
    bersaglio.current = voce
    input.current?.click()
  }

  const onFile = async (e) => {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    const voce = bersaglio.current
    if (!file || !voce) return

    if (file.size > LIMITE_BYTE) {
      setAvviso(`"${file.name}" è troppo grande (oltre 200MB).`)
      return
    }
    const tipo = file.type.startsWith('video') ? 'video' : 'foto'
    if (tipo === 'video') {
      const secondi = await durataVideo(file)
      if (secondi == null) {
        setAvviso(`"${file.name}": non riesco a leggerne la durata, quindi non posso caricarlo.`)
        return
      }
      if (videoTroppoLungo(secondi)) {
        setAvviso(
          `"${file.name}" dura ${Math.round(secondi)} secondi: il massimo è ${DURATA_VIDEO_MAX}.`,
        )
        return
      }
    }

    const chiave = chiaveAllenamento(voce)
    // ⚠️ UNA FOTO DI RECAP NASCE PUBBLICA — è il senso della cosa, si aggiunge
    // per farla vedere. Ma "pubblica" qui vuol dire pubblica davvero: la riga e
    // il file li può chiedere chiunque usi l'app. Quindi la foto prende la
    // visibilità DELL'ALLENAMENTO a cui si attacca, e se quello è nascosto la
    // foto resta privata — pubblicare lo scatto di un allenamento che il suo
    // autore ha scelto di non mostrare sarebbe pubblicare al posto suo.
    //
    // Perché non è un "no" all'utente: quando l'allenamento è nascosto l'app
    // non si limita a dirlo, offre di pubblicarlo lì, con un tocco. La strada
    // verso il pubblico resta quella naturale, ma la sceglie chi ha fatto
    // l'allenamento.
    const pubblico = visibilitaDi(voce) === VISIBILITA.PUBBLICA
    const esito = await aggiungiFotoAllenamento({
      blob: file,
      userId: ioId,
      chiave,
      tipo,
      nome: file.name,
      posizione: (foto[chiave] || []).length,
      visibilita: pubblico ? VISIBILITA_FOTO_ALL.PUBBLICA : VISIBILITA_FOTO_ALL.PRIVATA,
    })

    setFoto((f) => ({ ...f, [chiave]: [...(f[chiave] || []), esito.riga] }))
    if (esito.errore) setAvviso(`"${file.name}": ${esito.errore}`)
    else if (esito.soloLocale) setAvviso('La foto è solo su questo telefono: riprovo con la rete.')
    else setAvviso('')

    // L'allenamento è nascosto: la foto c'è ma non la vedrà nessuno. Invece di
    // dirlo e basta, si offre di sistemarlo qui.
    if (!pubblico && !esito.errore) setDaPubblicare(voce)
  }

  /**
   * Pubblica l'allenamento e, con lui, le foto che gli sono attaccate.
   * ⚠️ Le due cose vanno insieme: l'allenamento pubblico con le foto rimaste
   * private mostrerebbe una scheda con il pallino di una foto che non si apre.
   */
  const pubblicaAllenamento = async (voce) => {
    if (!voce?.schedaId) {
      setAvviso('Questo allenamento non si può pubblicare da qui.')
      setDaPubblicare(null)
      return
    }
    aggiornaCompletamento(voce.schedaId, voce.data, { visibilita: VISIBILITA.PUBBLICA })
    const chiave = chiaveAllenamento(voce)
    const sue = foto[chiave] || []
    await Promise.all(
      sue
        .filter((f) => f.visibilita !== VISIBILITA_FOTO_ALL.PUBBLICA)
        .map((f) => aggiornaVisibilitaFotoAllenamento(f.id, VISIBILITA_FOTO_ALL.PUBBLICA)),
    )
    setFoto((f) => ({
      ...f,
      [chiave]: (f[chiave] || []).map((x) => ({
        ...x,
        visibilita: VISIBILITA_FOTO_ALL.PUBBLICA,
      })),
    }))
    setDaPubblicare(null)
    setAvviso('Allenamento pubblicato: adesso la foto si vede nel feed.')
  }

  return (
    <div className="app con-barra">
      <div className="topbar">
        <h1>Allenamenti</h1>
      </div>

      <div className="segmented">
        <button
          className={'seg-btn' + (chi === 'tutti' ? ' on' : '')}
          onClick={() => setChi('tutti')}
          aria-pressed={chi === 'tutti'}
        >
          Tutti
        </button>
        <button
          className={'seg-btn' + (chi === 'amici' ? ' on' : '')}
          onClick={() => setChi('amici')}
          aria-pressed={chi === 'amici'}
        >
          Amici
        </button>
      </div>

      <div className="row" style={{ gap: 8, margin: '12px 0 4px' }}>
        <button
          type="button"
          className={'chip chip-azione' + (accesi > 0 ? ' chip-on' : '')}
          onClick={() => setPannello((v) => !v)}
          aria-expanded={pannello}
        >
          <IconSearch width={14} height={14} />
          Filtri
          {accesi > 0 && <span className="pallino-notifica">{accesi}</span>}
        </button>
        {accesi > 0 && (
          <button type="button" className="chip chip-azione chip-nota" onClick={azzera}>
            <IconClose width={13} height={13} />
            Azzera
          </button>
        )}
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 12.5 }}>
          {voci.length === 1 ? '1 allenamento' : `${voci.length} allenamenti`}
        </span>
      </div>

      {pannello && (
        <div className="card stack" style={{ gap: 12, marginTop: 8 }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Gruppo muscolare</span>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {GRUPPI.map((g) => (
                <ChipFiltro
                  key={g.id}
                  acceso={gruppi.includes(g.id)}
                  colore={g.colore}
                  onClick={() => alterna(gruppi, setGruppi, g.id)}
                >
                  {g.label}
                </ChipFiltro>
              ))}
            </div>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Durata</span>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {DURATE.map((d) => (
                <ChipFiltro
                  key={d.id}
                  acceso={durate.includes(d.id)}
                  onClick={() => alterna(durate, setDurate, d.id)}
                >
                  {d.label}
                </ChipFiltro>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 11.5 }}>
              Gli allenamenti segnati a mano non hanno una durata: con questo filtro non compaiono.
            </span>
          </div>

          <label className="stack" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Esercizio</span>
            <input
              type="text"
              value={esercizio}
              placeholder="panca, stacco, squat…"
              onChange={(e) => setEsercizio(e.target.value)}
            />
          </label>
        </div>
      )}

      {(errore || avviso) && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          {avviso || errore}
        </p>
      )}

      {/* La foto è stata aggiunta a un allenamento nascosto: c'è, ma non la
          vede nessuno. Si dice, e si offre di rimediare con un tocco — invece
          di pubblicare al posto suo o di lasciarlo scoprire dal silenzio. */}
      {daPubblicare && (
        <div className="card row" style={{ gap: 10, alignItems: 'center', marginTop: 10 }}>
          <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 13.5 }}>Foto aggiunta, ma nessuno la vede</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              «{daPubblicare.nomeGiorno}» non è pubblico, quindi la sua scheda non compare nel
              feed degli altri.
            </span>
          </div>
          <button type="button" className="btn" onClick={() => pubblicaAllenamento(daPubblicare)}>
            Pubblica
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Lascia com'è"
            onClick={() => setDaPubblicare(null)}
          >
            <IconClose />
          </button>
        </div>
      )}

      <input ref={input} type="file" accept="image/*,video/*" hidden onChange={onFile} />

      <div className="feed" style={{ marginTop: 14 }}>
        {caricando && tutte.length === 0 ? (
          <p className="muted">Un attimo…</p>
        ) : voci.length === 0 ? (
          <div className="empty">
            <div className="big">🗒️</div>
            <p>
              {accesi > 0 || chi === 'amici'
                ? 'Nessun allenamento con questi filtri.'
                : 'Ancora nessun allenamento pubblico. Il primo può essere il tuo.'}
            </p>
          </div>
        ) : (
          voci.map((v) => {
            const chiave = chiaveAllenamento(v)
            return (
              <SchedaRecap
                key={`${v.utenteId}-${chiave}`}
                voce={v}
                foto={foto[chiave] || []}
                mio={v.utenteId === ioId}
                onApri={setAperto}
                onAggiungiFoto={chiediFoto}
              />
            )
          })
        )}
      </div>

      {/* Il recap per esteso, per chi vuole vedere serie e pallini. */}
      {aperto && (
        <div className="modal-backdrop" onClick={() => setAperto(null)}>
          <div
            className="modal"
            role="dialog"
            aria-label="Recap allenamento"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <strong>{aperto.utenteNome}</strong>
              <button className="icon-btn" aria-label="Chiudi" onClick={() => setAperto(null)}>
                <IconClose />
              </button>
            </div>
            <RiepilogoDettaglio riep={aperto} />
          </div>
        </div>
      )}
    </div>
  )
}
