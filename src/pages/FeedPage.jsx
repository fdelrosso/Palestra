import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import { storicoGlobale } from '../lib/storico'
import { DURATE, filtraFeed, quantiFiltri } from '../lib/feed'
import { GRUPPI } from '../lib/muscoli'
import { dataOra } from '../lib/format'
import {
  chiaveAllenamento,
  fotoDiAllenamenti,
  riprovaFotoInSospeso,
} from '../lib/fotoAllenamento'
import { NESSUNA, conMiPiace, impostaMiPiace, leggiInterazioni } from '../lib/interazioni'
import { navigate, routes } from '../lib/router'
import useMessaggiNonLetti from '../hooks/useMessaggiNonLetti'
import PostSchermo from '../components/PostSchermo'
import { chiaveSegnalata, mieSegnalazioni } from '../lib/segnalazioni'
import { BloccoPubblicazione } from '../components/Moderazione'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import CommentiAllenamento from '../components/CommentiAllenamento'
import MiPiaceElenco from '../components/MiPiaceElenco'
import { IconAmici, IconBusta, IconClose, IconSearch } from '../components/icons'
import Avatar from '../components/Avatar'

// ---------------------------------------------------------------------------
// Social: la quarta linguetta della barra in basso.
//
// In cima due linguette — PER TE (tutti gli allenamenti pubblici, dal più
// recente) e AMICI (solo i loro) — e tre icone: cerca una persona, i propri
// amici (richieste, codice, ricevuti e inviati), i messaggi.
//
// Sotto, il feed A SCHERMO INTERO: un allenamento per schermata, si scorre in
// verticale (components/PostSchermo). Chi vede un allenamento ci può mettere
// mi piace e commentare, anche con una foto (lib/interazioni).
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
// ⚠️ "Per te" per ora è solo cronologico. Un ordine per interessi ha senso
// quando gli utenti e i dati bastano a calcolarlo.
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
  const { utenteCorrente, amici, richiesteAmicizia, condivisioni, effimeri } = useAccount()
  const { dati, caricando, errore } = useCollettivo()

  const [chi, setChi] = useState('tutti')
  const [gruppi, setGruppi] = useState([])
  const [durate, setDurate] = useState([])
  const [esercizio, setEsercizio] = useState('')
  const [pannello, setPannello] = useState(false)
  const [foto, setFoto] = useState({})
  // Il recap aperto per esteso: { voce, gruppi }. `gruppi` non vuoto = aperto
  // toccando un gruppo nella scheda, e si vedono solo i suoi esercizi.
  const [aperto, setAperto] = useState(null)
  const [avviso, setAvviso] = useState('')
  // Mi piace e commenti, per chiave di allenamento (lib/interazioni).
  const [interazioni, setInterazioni] = useState({})
  // L'allenamento di cui si guardano i commenti, o chi ha messo mi piace.
  const [commentiDi, setCommentiDi] = useState(null)
  const [miPiaceDi, setMiPiaceDi] = useState(null)
  // Quello che ho segnalato io (commenti e foto): per me non c'è più
  // (lib/segnalazioni). Si legge una volta; quello che segnalo dopo si
  // aggiunge qui senza rileggere.
  const [segnalati, setSegnalati] = useState(() => new Set())

  const ioId = utenteCorrente?.id || null
  const nonLetti = useMessaggiNonLetti(ioId, 'feed')
  // Il pallino sulle persone: le richieste e quello che gli amici hanno
  // mandato, che stanno nella pagina dei propri amici.
  const daVedereAmici =
    richiesteAmicizia.ricevute.length + condivisioni.daVedere + effimeri.ricevuti.length
  useEffect(() => {
    let vivo = true
    mieSegnalazioni(ioId).then((s) => vivo && setSegnalati(s))
    return () => {
      vivo = false
    }
  }, [ioId])
  const segnalato = useCallback(
    (tipo, oggetto) => setSegnalati((s) => new Set(s).add(chiaveSegnalata(tipo, oggetto))),
    [],
  )
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
    <div className="feed-schermo">
      <div className="feed-testa">
        <div className="feed-linguette" role="tablist" aria-label="Quali allenamenti">
          {[
            ['tutti', 'Per te'],
            ['amici', 'Amici'],
          ].map(([id, nome]) => (
            <button
              key={id}
              role="tab"
              aria-selected={chi === id}
              className={'feed-linguetta' + (chi === id ? ' on' : '')}
              onClick={() => setChi(id)}
            >
              {nome}
            </button>
          ))}
        </div>
        <div className="feed-icone">
          <button className="feed-icona" onClick={() => navigate(routes.cerca())} aria-label="Cerca persone">
            <IconSearch width={22} height={22} />
          </button>
          <button className="feed-icona" onClick={() => navigate(routes.amici())} aria-label="I miei amici">
            <IconAmici width={22} height={22} />
            {daVedereAmici > 0 && <span className="pallino-notifica barra" aria-hidden="true" />}
          </button>
          <button className="feed-icona" onClick={() => navigate(routes.messaggi())} aria-label="Messaggi">
            <IconBusta width={22} height={22} />
            {nonLetti > 0 && <span className="pallino-notifica barra" aria-hidden="true" />}
          </button>
        </div>
        <div className="feed-filtri">
          <button
            type="button"
            className={'chip chip-azione' + (accesi > 0 ? ' chip-on' : '')}
            onClick={() => setPannello(true)}
          >
            Filtri
            {accesi > 0 && <span className="pallino-notifica">{accesi}</span>}
          </button>
          {accesi > 0 && (
            <button type="button" className="chip chip-azione" onClick={azzera}>
              <IconClose width={13} height={13} />
              Azzera
            </button>
          )}
        </div>
      </div>

      {(errore || avviso) && <p className="feed-avviso">{avviso || errore}</p>}
      {/* Con la pubblicazione bloccata (moderazione) lo si dice qui, in cima,
          sopra i post. */}
      <div className="feed-blocco">
        <BloccoPubblicazione ioId={ioId} compatto />
      </div>

      {caricando && tutte.length === 0 ? (
        <div className="post-schermo post-vuoto">
          <p>Un attimo…</p>
        </div>
      ) : voci.length === 0 ? (
        <div className="post-schermo post-vuoto">
          <div className="big">🗒️</div>
          <p>
            {accesi > 0
              ? 'Nessun allenamento con questi filtri.'
              : chi === 'amici'
                ? 'I tuoi amici non hanno ancora allenamenti pubblici.'
                : 'Ancora nessun allenamento pubblico. Il primo può essere il tuo.'}
          </p>
        </div>
      ) : (
        voci.map((v) => {
          const chiave = chiaveAllenamento(v)
          return (
            <PostSchermo
              key={`${v.utenteId}-${chiave}`}
              voce={v}
              foto={(foto[chiave] || []).filter((f) => !segnalati.has(chiaveSegnalata('foto', f.id)))}
              interazioni={interazioni[chiave] || NESSUNA}
              ioId={ioId}
              onSegnalato={segnalato}
              onApri={(voce, gruppiScelti = []) => setAperto({ voce, gruppi: gruppiScelti })}
              onMiPiace={alternaMiPiace}
              onApriMiPiace={setMiPiaceDi}
              onApriCommenti={setCommentiDi}
            />
          )
        })
      )}

      {pannello && (
        <div className="foglio-backdrop" onClick={() => setPannello(false)}>
          <div className="foglio stack" role="dialog" aria-label="Filtri" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <div className="foglio-maniglia" aria-hidden="true" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>Filtri</h3>
              <button className="icon-btn" aria-label="Chiudi" onClick={() => setPannello(false)}>
                <IconClose />
              </button>
            </div>
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
            <button className="btn btn-accent btn-block" onClick={() => setPannello(false)}>
              {voci.length === 1 ? 'Mostra 1 allenamento' : `Mostra ${voci.length} allenamenti`}
            </button>
          </div>
        </div>
      )}

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
          segnalati={segnalati}
          onSegnalato={segnalato}
          onCambio={(r) => {
            const chiave = chiaveAllenamento(commentiDi)
            setInterazioni((p) => ({ ...p, [chiave]: { ...(p[chiave] || NESSUNA), ...r } }))
          }}
        />
      )}
      {miPiaceDi && (
        <MiPiaceElenco chiave={chiaveAllenamento(miPiaceDi)} onChiudi={() => setMiPiaceDi(null)} />
      )}

      {/* Il recap per esteso, per chi vuole vedere serie e pallini. Aperto da
          un gruppo della scheda, parte con quel gruppo scelto; dentro se ne
          possono scegliere altri (components/RiepilogoDettaglio). */}
      {/* ⚠️ Nel body e non qui: .feed-schermo è `fixed`, quindi un contesto
          di sovrapposizione suo, e la barra in basso finiva SOPRA al foglio
          qualunque z-index avesse. */}
      {aperto &&
        createPortal(
          <div className="foglio-backdrop" onClick={() => setAperto(null)}>
            <div
              className="foglio recap-foglio"
              role="dialog"
              aria-label={`Recap di ${aperto.voce.utenteNome}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="foglio-maniglia" aria-hidden="true" />
              <header className="recap-foglio-testa">
                <div className="recap-foglio-chi">
                  <Avatar id={aperto.voce.utenteId} nome={aperto.voce.utenteNome} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{aperto.voce.utenteNome}</strong>
                    <span className="muted">{dataOra(aperto.voce.data)}</span>
                  </span>
                  <button className="icon-btn recap-foglio-chiudi" aria-label="Chiudi" onClick={() => setAperto(null)}>
                    <IconClose />
                  </button>
                </div>
                <h2>{aperto.voce.nomeGiorno}</h2>
                {aperto.voce.nomeScheda && (
                  <p className="muted">
                    {aperto.voce.nomeScheda}
                    {aperto.voce.settimana != null ? ` · settimana ${aperto.voce.settimana}` : ''}
                  </p>
                )}
              </header>
              <RiepilogoDettaglio
                key={`${chiaveAllenamento(aperto.voce)}-${aperto.gruppi.join(',')}`}
                riep={aperto.voce}
                gruppiIniziali={aperto.gruppi}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
