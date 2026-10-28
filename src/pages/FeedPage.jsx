import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import { allenamentiDiUtente, storicoGlobale } from '../lib/storico'
import { isPt, isSoloPt } from '../lib/pt'
import { contattabiliFra } from '../lib/contattiPt'
import { DURATE, filtraFeed, quantiFiltri } from '../lib/feed'
import { GRUPPI } from '../lib/muscoli'
import { dataOra } from '../lib/format'
import {
  chiaveAllenamento,
  completaCopieFeed,
  fotoDiAllenamenti,
  riprovaFotoInSospeso,
} from '../lib/fotoAllenamento'
import { NESSUNA, conMiPiace, impostaMiPiace, leggiInterazioni } from '../lib/interazioni'
import { goBack, navigate, routes } from '../lib/router'
import PostSchermo from '../components/PostSchermo'
import { chiaveSegnalata, mieSegnalazioni } from '../lib/segnalazioni'
import { BloccoPubblicazione } from '../components/Moderazione'
import { VistaRecap } from '../components/AllegatiRecap'
import CommentiAllenamento from '../components/CommentiAllenamento'
import MiPiaceElenco from '../components/MiPiaceElenco'
import CondividiPost from '../components/CondividiPost'
import { IconBack, IconClose, IconEdit } from '../components/icons'
import Avatar from '../components/Avatar'

// ---------------------------------------------------------------------------
// Social: la quarta linguetta della barra in basso.
//
// In cima due linguette — PER TE (tutti gli allenamenti pubblici, dal più
// recente) e AMICI (solo i loro) — e tre icone: cerca una persona, i propri
// amici (richieste, codice), i messaggi (con le cose ricevute e inviate).
// Un PT ne ha una terza, ATLETI: gli allenamenti di chi segue, anche quelli
// "solo al PT" (lib/visibilita) che negli altri feed non ci sono. Prima
// stavano in fondo alla pagina Lavoro, come elenco.
//
// Sotto, il feed A SCHERMO INTERO: un allenamento per schermata, si scorre in
// verticale (components/PostSchermo). Chi vede un allenamento ci può mettere
// mi piace e commentare, anche con una foto (lib/interazioni).
//
// ⚠️ Da qui le foto NON si aggiungono: si mettono dal riepilogo, a fine
// allenamento o riaprendolo dal calendario (components/FotoAllenamento). Il feed si guarda.
//
// ⚠️ IL FILTRO CHE CONTA NON È QUI. Le voci arrivano da `storicoGlobale`, che
// mostra i pubblici più i propri, e quel taglio lo fa il database. I filtri di
// questa pagina — gruppo, durata, esercizio, "Amici" — sono di comodo: se
// sparissero si vedrebbe più roba, ma niente che non si avesse già il diritto
// di vedere.
//
// `soloChiave` (/post/<chiave>): UN post, quello di un link condiviso fuori
// dall'app (components/CondividiPost). Stesso post, stessi mi piace e commenti;
// al posto di linguette e filtri, la freccia indietro. Se il post è MIO (dal
// proprio profilo, da una notifica) si scorrono tutti i miei, quelli che si
// vedono nel profilo, partendo da lui.
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

export default function FeedPage({ soloChiave = null }) {
  const { utenteCorrente, amici, mieiAtleti } = useAccount()
  const sonoPt = isPt(utenteCorrente)
  const { dati, caricando, errore, ricarica } = useCollettivo()
  const schermo = useRef(null)
  // Toccare una linguetta (anche quella già scelta) rilegge il feed e torna in
  // cima: i post nuovi arrivano lì, il feed è dal più recente.
  // ⚠️ Quando arriva la lettura nuova la lista cambia sotto uno scroll magari
  // ancora in corso, e lo scroll si fermava un po' sopra il punto di aggancio
  // (il post salito sotto la testata): appena i post nuovi sono a schermo si
  // torna in cima ancora, secco.
  const daRiportareSu = useRef(false)
  const vaiA = (id) => {
    setChi(id)
    schermo.current?.scrollTo({ top: 0, behavior: 'smooth' })
    daRiportareSu.current = true
    ricarica()
  }
  useEffect(() => {
    if (!daRiportareSu.current) return
    daRiportareSu.current = false
    schermo.current?.scrollTo({ top: 0 })
  }, [dati])

  // Un solo PT (lib/pt) non ha amici da allenamento: le sue linguette sono
  // Atleti (quelli che segue) e Per te, e si parte dai suoi atleti.
  const soloPt = isSoloPt(utenteCorrente)
  const [scelta, setChi] = useState(() => (soloPt ? 'atleti' : 'tutti'))
  // "Atleti" solo per un PT: se smette di esserlo si torna a "Per te". E
  // "Amici" non per il solo PT.
  const chi = (scelta === 'atleti' && !sonoPt) || (scelta === 'amici' && soloPt) ? 'tutti' : scelta
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
  // Il post che si sta condividendo, dentro o fuori dall'app (CondividiPost).
  const [daCondividere, setDaCondividere] = useState(null)
  // Quello che ho segnalato io (commenti e foto): per me non c'è più
  // (lib/segnalazioni). Si legge una volta; quello che segnalo dopo si
  // aggiunge qui senza rileggere.
  const [segnalati, setSegnalati] = useState(() => new Set())

  const ioId = utenteCorrente?.id || null
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

  // Gli allenamenti degli atleti vengono da un'altra parte: `storicoGlobale`
  // ha solo i pubblici, e un PT deve vedere anche i "solo al PT".
  const tutte = useMemo(
    () =>
      chi === 'atleti'
        ? (mieiAtleti || [])
            .flatMap((a) => allenamentiDiUtente(a, { collettivo: dati, comePt: true }))
            .sort((x, y) => new Date(y.data) - new Date(x.data))
        : storicoGlobale({ collettivo: dati, ioId }),
    [chi, mieiAtleti, dati, ioId],
  )
  const eQuello = useCallback(
    (v) => chiaveAllenamento(v) === soloChiave || v.chiaveVecchia === soloChiave,
    [soloChiave],
  )
  const mieiPost = useMemo(
    () => (soloChiave && ioId ? allenamentiDiUtente({ id: ioId }, { collettivo: dati }) : []),
    [soloChiave, ioId, dati],
  )
  const voci = useMemo(
    () =>
      soloChiave
        ? mieiPost.some(eQuello)
          ? mieiPost
          : tutte.filter(eQuello)
        : filtraFeed(tutte, {
        chi: chi === 'atleti' ? 'tutti' : chi,
        amiciIds,
        ioId,
        gruppi,
        durate,
        esercizio,
      }),
    [soloChiave, mieiPost, eQuello, tutte, chi, amiciIds, ioId, gruppi, durate, esercizio],
  )

  // Fra i miei post: si parte da quello aperto (una volta sola, non a ogni
  // rilettura), e la matita corregge quello sullo schermo.
  const iniziale = soloChiave ? voci.findIndex(eQuello) : -1
  const [inVista, setInVista] = useState(0)
  const portato = useRef(false)
  useEffect(() => {
    if (portato.current || iniziale < 0) return
    portato.current = true
    setInVista(iniziale)
    schermo.current?.querySelectorAll('.post-schermo')[iniziale]?.scrollIntoView({ block: 'start' })
  }, [iniziale])
  const seguiScorrimento = () => {
    const el = schermo.current
    if (!el) return
    const i = [...el.querySelectorAll('.post-schermo')].findIndex((a) => a.offsetTop + a.offsetHeight / 2 > el.scrollTop)
    setInVista(Math.max(0, i))
  }
  const inSchermo = voci[inVista] || voci[0]

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

  // Le copie da feed che mancano alle MIE foto pubbliche (lib/fotoAllenamento):
  // le foto di prima, e quelle la cui copia non era riuscita.
  useEffect(() => {
    completaCopieFeed(ioId).catch(() => {})
  }, [ioId])

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

  // Per un PT: chi, fra gli autori a schermo, non ha un PT e si è messo in
  // mostra (lib/contattiPt). Una richiesta per tutti, come foto e mi piace.
  const [inMostra, setInMostra] = useState(() => new Set())
  const autoriFirma = sonoPt ? [...new Set(voci.map((v) => v.utenteId))].sort().join('~') : ''
  useEffect(() => {
    let vivo = true
    if (!autoriFirma) return undefined
    contattabiliFra(autoriFirma.split('~')).then((s) => vivo && setInMostra(s))
    return () => {
      vivo = false
    }
  }, [autoriFirma])

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
    <div className="feed-schermo" ref={schermo} onScroll={soloChiave ? seguiScorrimento : undefined}>
      {soloChiave ? (
        <div className="feed-testa">
          <button className="icon-btn feed-indietro" onClick={() => goBack()} aria-label="Indietro">
            <IconBack />
          </button>
          {/* Un proprio post: la matita porta a correggerlo (AllenamentoSvoltoPage). */}
          {ioId && inSchermo?.utenteId === ioId && (
            <button
              className="icon-btn feed-modifica"
              onClick={() => navigate(routes.svolto(chiaveAllenamento(inSchermo)))}
              aria-label="Modifica allenamento"
            >
              <IconEdit />
            </button>
          )}
        </div>
      ) : (
      <div className="feed-testa">
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
        {/* "Per te | Amici" al centro della testata, fra i Filtri e le icone. */}
        <div className="feed-linguette" role="tablist" aria-label="Quali allenamenti">
          {(soloPt
            ? [
                ['atleti', 'Atleti'],
                ['tutti', 'Per te'],
              ]
            : [['tutti', 'Per te'], ['amici', 'Amici'], ...(sonoPt ? [['atleti', 'Atleti']] : [])]
          ).map(([id, nome]) => (
            <button
              key={id}
              role="tab"
              aria-selected={chi === id}
              className={'feed-linguetta' + (chi === id ? ' on' : '')}
              onClick={() => vaiA(id)}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>
      )}

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
            {soloChiave
              ? 'Questo allenamento non c’è più, o non è pubblico.'
              : accesi > 0
              ? 'Nessun allenamento con questi filtri.'
              : chi === 'atleti'
                ? (mieiAtleti || []).length === 0
                  ? 'Nessun atleta, per ora. Dai il tuo codice PT a chi segui.'
                  : 'I tuoi atleti non hanno ancora registrato allenamenti.'
                : chi === 'amici'
                ? 'I tuoi amici non hanno ancora allenamenti pubblici.'
                : 'Nessuno ha ancora pubblicato un allenamento.'}
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
              cercaPt={sonoPt && inMostra.has(v.utenteId)}
              onSegnalato={segnalato}
              sfondoNascosto={!!v.sfondo && segnalati.has(chiaveSegnalata('foto', v.sfondo))}
              onApri={(voce, gruppiScelti = []) => setAperto({ voce, gruppi: gruppiScelti })}
              onMiPiace={alternaMiPiace}
              onApriMiPiace={setMiPiaceDi}
              onApriCommenti={setCommentiDi}
              onCondividi={setDaCondividere}
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

      {daCondividere && <CondividiPost voce={daCondividere} onChiudi={() => setDaCondividere(null)} />}

      {/* I commenti: il riassunto sotto il post si aggiorna con quello che si
          scrive o si toglie, senza rileggere tutto il feed. */}
      {commentiDi && (
        <CommentiAllenamento
          chiave={chiaveAllenamento(commentiDi)}
          ioId={ioId}
          ioNome={utenteCorrente?.nome || ''}
          proprietarioId={commentiDi.utenteId}
          titolo={`${commentiDi.nomeGiorno} · ${commentiDi.utenteUsername || commentiDi.utenteNome}`}
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
              className="foglio recap-foglio su-fondo"
              role="dialog"
              aria-label={`Recap di ${aperto.voce.utenteUsername || aperto.voce.utenteNome}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ⚠️ Niente più lo sfondo del post qui dietro: con le palette
                  piene (lib/recap) il dettaglio non si leggeva, e la card lo
                  sfondo ce l'ha già (2026-10-21). */}
              <div className="su-fondo-scorre">
                <div className="foglio-maniglia" aria-hidden="true" />
                <header className="recap-foglio-testa">
                  <div className="recap-foglio-chi">
                    <button
                      className="apri-utente grow"
                      onClick={() => navigate(routes.utente(aperto.voce.utenteId))}
                    >
                      <Avatar id={aperto.voce.utenteId} nome={aperto.voce.utenteNome} />
                      <span style={{ minWidth: 0 }}>
                        <strong>{aperto.voce.utenteUsername || aperto.voce.utenteNome}</strong>
                        <span className="muted">{dataOra(aperto.voce.data)}</span>
                      </span>
                    </button>
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
                {/* Come nei profili (components/AllegatiRecap): Card o
                    Dettaglio, la card per prima; da un gruppo, il dettaglio. */}
                <VistaRecap
                  key={`${chiaveAllenamento(aperto.voce)}-${aperto.gruppi.join(',')}`}
                  voce={aperto.voce}
                  foto={foto[chiaveAllenamento(aperto.voce)] || []}
                  gruppiIniziali={aperto.gruppi}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
