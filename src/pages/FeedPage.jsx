import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import { storicoGlobale } from '../lib/storico'
import { DURATE, filtraFeed, quantiFiltri } from '../lib/feed'
import { GRUPPI } from '../lib/muscoli'
import {
  chiaveAllenamento,
  fotoDiAllenamenti,
  riprovaFotoInSospeso,
} from '../lib/fotoAllenamento'
import { NESSUNA, conMiPiace, impostaMiPiace, leggiInterazioni } from '../lib/interazioni'
import SchedaRecap from '../components/SchedaRecap'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import CommentiAllenamento from '../components/CommentiAllenamento'
import MiPiaceElenco from '../components/MiPiaceElenco'
import { IconClose, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------
// Feed: la seconda linguetta della barra in basso.
//
// Non è più una lista di righe da aprire una per una: è uno scorrimento di
// SCHEDE DI RECAP, quelle vere, col corpo e i muscoli accesi. Quello che prima
// stava dietro a un tocco adesso si vede scorrendo, che è il motivo per cui un
// feed si guarda.
//
// Ogni scheda è un POST (components/SchedaRecap): si sfoglia di LATO — recap,
// poi le foto di quella giornata — e sotto ha il cuore, i commenti e quanti
// sono (lib/interazioni). Chi vede un allenamento ci può mettere mi piace e
// commentare, anche con una foto.
//
// ⚠️ Da qui le foto NON si aggiungono: si mettono a fine allenamento o dal
// recap del calendario (components/FotoAllenamento). Il feed si guarda.
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

  const [chi, setChi] = useState('tutti')
  const [gruppi, setGruppi] = useState([])
  const [durate, setDurate] = useState([])
  const [esercizio, setEsercizio] = useState('')
  const [pannello, setPannello] = useState(false)
  const [foto, setFoto] = useState({})
  const [aperto, setAperto] = useState(null)
  const [avviso, setAvviso] = useState('')
  // Mi piace e commenti, per chiave di allenamento (lib/interazioni).
  const [interazioni, setInterazioni] = useState({})
  // L'allenamento di cui si guardano i commenti, o chi ha messo mi piace.
  const [commentiDi, setCommentiDi] = useState(null)
  const [miPiaceDi, setMiPiaceDi] = useState(null)

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

  // Mi piace e commenti: anche loro in un colpo solo, per tutte le schede.
  useEffect(() => {
    let vivo = true
    leggiInterazioni(chiavi).then((per) => vivo && setInterazioni(per))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaviFirma])

  const accesi = quantiFiltri({ gruppi, durate, esercizio })
  const alterna = (elenco, set, id) =>
    set(elenco.includes(id) ? elenco.filter((x) => x !== id) : [...elenco, id])
  const azzera = () => {
    setGruppi([])
    setDurate([])
    setEsercizio('')
  }

  // Il cuore: si accende SUBITO, poi si chiede al server; se dice di no torna
  // com'era e si dice perché.
  const alternaMiPiace = async (voce) => {
    const chiave = chiaveAllenamento(voce)
    if (!chiave || !ioId) return
    const prima = interazioni[chiave] || NESSUNA
    const metto = !prima.mio
    setInterazioni((p) => ({ ...p, [chiave]: conMiPiace(p[chiave], metto) }))
    const esito = await impostaMiPiace(chiave, ioId, metto)
    if (!esito.ok) {
      setInterazioni((p) => ({ ...p, [chiave]: prima }))
      setAvviso(esito.diRete ? 'Senza rete il mi piace non parte.' : esito.errore)
    }
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
              className="input"
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
                interazioni={interazioni[chiave] || NESSUNA}
                onApri={setAperto}
                onMiPiace={alternaMiPiace}
                onApriMiPiace={setMiPiaceDi}
                onApriCommenti={setCommentiDi}
              />
            )
          })
        )}
      </div>

      {/* I commenti: il riassunto sotto il post si aggiorna con quello che si
          scrive o si toglie, senza rileggere tutto il feed. */}
      {commentiDi && (
        <CommentiAllenamento
          chiave={chiaveAllenamento(commentiDi)}
          ioId={ioId}
          ioNome={utenteCorrente?.nome || ''}
          proprietarioId={commentiDi.utenteId}
          titolo={`${commentiDi.nomeGiorno} · ${commentiDi.utenteNome}`}
          onChiudi={() => setCommentiDi(null)}
          onCambio={(r) => {
            const chiave = chiaveAllenamento(commentiDi)
            setInterazioni((p) => ({ ...p, [chiave]: { ...(p[chiave] || NESSUNA), ...r } }))
          }}
        />
      )}
      {miPiaceDi && (
        <MiPiaceElenco chiave={chiaveAllenamento(miPiaceDi)} onChiudi={() => setMiPiaceDi(null)} />
      )}

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
