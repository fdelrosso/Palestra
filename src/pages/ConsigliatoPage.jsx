import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, goBack, routes } from '../lib/router'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import { influenzaPt, popolaritaEsercizi } from '../lib/comunita'
import { isPt } from '../lib/pt'
import {
  analizzaStorico,
  gruppiConsigliati,
  generaAllenamento,
  candidatiGruppo,
  splitConsigliato,
} from '../lib/consiglio'
import { modoDi } from '../lib/programmazione'
import { livelloAmmette, livelloDi, regoleLivello } from '../lib/livello'
import EsercizioCard from '../components/EsercizioCard'
import { IconBack, IconChevron, IconCoach } from '../components/icons'

const DURATE = [30, 45, 60, 90]

// Pagina "Allenamento consigliato": propone i gruppi da allenare in base allo
// storico, poi lascia personalizzare gruppi / durata / esercizi e genera un
// allenamento da avviare subito (registrato come allenamento "libero").
export default function ConsigliatoPage() {
  const { schede, sessione, iniziaAllenamentoLibero } = useStore()
  const { utenteCorrente } = useAccount()
  const sonoPt = isPt(utenteCorrente)

  const analisi = useMemo(() => analizzaStorico(schede), [schede])
  // Cosa svolgono gli altri utenti: regge il consiglio finché lo storico
  // personale è vuoto, e resta un peso quando c'è (vedi lib/consiglio).
  const comunita = useMemo(
    () => popolaritaEsercizi({ escludiUtenteId: utenteCorrente?.id }),
    [utenteCorrente?.id],
  )
  // Il personal trainer: il TUO (se ne hai uno) pesa quasi come il tuo storico;
  // se sei autodidatta entrano i PT più seguiti dell'app, ma di poco.
  const pt = useMemo(() => influenzaPt({ utente: utenteCorrente }), [utenteCorrente])
  const consigliati = useMemo(() => gruppiConsigliati(analisi, 2), [analisi])
  // Il livello dichiarato sul profilo: decide quali esercizi il generatore puo'
  // proporre e quante serie hanno. Vuoto (profili vecchi, o un PT che non l'ha
  // dato) = nessun limite.
  const livelloId = utenteCorrente?.dati?.livello || ''
  const livello = livelloDi(livelloId)
  const regole = regoleLivello(livelloId)

  const [gruppiSel, setGruppiSel] = useState(consigliati)
  const [durata, setDurata] = useState(60)
  const [eserciziSel, setEserciziSel] = useState({}) // { gruppoId: [nomi] }
  const [espanso, setEspanso] = useState(null)

  const generato = useMemo(
    () =>
      generaAllenamento({
        gruppi: gruppiSel,
        durataMin: durata,
        eserciziPerGruppo: eserciziSel,
        analisi,
        comunita,
        pt,
        livello: livelloId,
      }),
    [gruppiSel, durata, eserciziSel, analisi, comunita, pt, livelloId],
  )

  const toggleGruppo = (id) =>
    setGruppiSel((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))

  const toggleEsercizio = (gruppo, nome) =>
    setEserciziSel((prev) => {
      const cur = prev[gruppo] || []
      const next = cur.includes(nome) ? cur.filter((n) => n !== nome) : [...cur, nome]
      return { ...prev, [gruppo]: next }
    })

  // Esercizi selezionabili per un gruppo, nello STESSO ordine che userebbe
  // l'automatico: i tuoi in cima, poi i più svolti dagli altri, poi il resto.
  const eserciziGruppo = (g) => candidatiGruppo(g, analisi, comunita, pt)

  const avvia = () => {
    if (generato.esercizi.length === 0) return
    iniziaAllenamentoLibero(generato)
    navigate(routes.allenamento())
  }

  // Etichette dei gruppi allenati nell'ultimo allenamento (per la spiegazione).
  const recentiLabel = [...analisi.gruppiRecenti].map((g) => gruppoDi(g)?.label || g)
  const consigliatiLabel = consigliati.map((g) => gruppoDi(g)?.label || g)
  const splitLabel = splitConsigliato(analisi).label
  // Quanto dura davvero: è calcolato da serie e recuperi, non a occhio, ed è il
  // motivo per cui a parità di minuti un allenamento di forza ha meno esercizi.
  const minutiStimati = Math.round((generato.tempoStimatoSec || 0) / 60)
  // Il tuo PT conta davvero solo se ha qualcosa da dire (schede/allenamenti suoi
  // o dei suoi atleti): se è appena arrivato non promettiamo niente.
  const ptTuo = pt.tuo && !pt.vuota
  // Gli atleti del tuo PT, tolto te: sono loro il "cosa dà agli altri".
  const altriAtleti = Math.max(0, pt.nAtleti - 1)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
        <h1 style={{ fontSize: 18 }}>Allenamento consigliato</h1>
      </div>

      {sessione && (
        <button
          className="hero"
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12 }}
          onClick={() => navigate(routes.allenamento())}
        >
          <div className="kicker">Allenamento in corso</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{sessione.nomeGiorno}</span>
            <span className="badge badge-accent">Riprendi ›</span>
          </div>
        </button>
      )}

      {/* Spiegazione del consiglio */}
      <div className="card consiglio-spiega">
        {analisi.haStorico ? (
          <>
            <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Il consiglio di oggi</div>
            {recentiLabel.length > 0 && (
              <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
                Ultimi allenati: <strong style={{ color: 'var(--text)' }}>{recentiLabel.join(', ')}</strong>.
              </p>
            )}
            <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>
              Per ruotare i muscoli, oggi ti consigliamo:{' '}
              <strong>{consigliatiLabel.join(' + ') || '—'}</strong>.
            </p>
          </>
        ) : (
          <>
            <div className="kicker" style={{ color: 'var(--accent-strong)' }}>Da dove si parte</div>
            <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
              Ancora nessun allenamento registrato: si parte dalla combinazione base{' '}
              <strong>{splitLabel}</strong> ({consigliatiLabel.join(' + ') || '—'}).
            </p>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
              {comunita.vuota
                ? 'Gli esercizi sono i fondamentali del gruppo, non una scelta a caso.'
                : 'Gli esercizi sono quelli più svolti dagli altri utenti dell’app.'}{' '}
              Più ti alleni, più i consigli si adattano a te (muscoli, stile ed esercizi che usi).
            </p>
          </>
        )}

        {/* Da chi sei allenato: il tuo PT pesa, gli altri PT solo un po'. */}
        {ptTuo ? (
          <p style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            <span className="badge badge-accent" style={{ marginRight: 6 }}>
              <IconCoach width={13} height={13} />
              PT
            </span>
            Gli esercizi tengono conto di quello che <strong>{pt.nome}</strong> fa fare più spesso
            {altriAtleti > 0
              ? ` agli altri ${altriAtleti} atlet${altriAtleti === 1 ? 'a' : 'i'} che segue`
              : ' nelle sue schede'}.
          </p>
        ) : (
          // Il messaggio ha senso solo per chi un PT potrebbe averlo: un PT
          // non deve leggere "collega il tuo PT".
          !pt.vuota &&
          !sonoPt && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
              Ti alleni da solo: i consigli sono leggermente influenzati dai PT più seguiti dell’app.
              Collega il tuo PT dal menu del profilo per pesarlo davvero.
            </p>
          )
        )}

        <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
          Impostazione: <strong style={{ color: 'var(--text)' }}>{modoDi(generato.modo).label.toLowerCase()}</strong>
          {' '}— {modoDi(generato.modo).descrizione} Serie, ripetizioni e recupero cambiano da
          esercizio a esercizio: i fondamentali pesanti vogliono recuperi lunghi, l'isolamento no.
        </p>

        {/* Il livello: cosa ha tolto o lasciato passare, e dove si cambia. */}
        {livello ? (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
            Livello: <strong style={{ color: 'var(--text)' }}>{livello.label.toLowerCase()}</strong>{' '}
            — {livello.effetto}.{' '}
            <button className="link-inline" onClick={() => navigate(routes.datiFisici())}>
              Cambia livello
            </button>
          </p>
        ) : (
          !sonoPt && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
              Non hai ancora detto da quanto ti alleni, quindi non escludiamo niente.{' '}
              <button className="link-inline" onClick={() => navigate(routes.datiFisici())}>
                Dichiara il tuo livello
              </button>{' '}
              e gli esercizi proposti si adegueranno.
            </p>
          )
        )}
      </div>

      {/* Gruppi muscolari */}
      <div className="section-title" style={{ marginTop: 18 }}>Gruppi muscolari</div>
      <div className="gruppo-chips">
        {GRUPPI.map((g) => {
          const on = gruppiSel.includes(g.id)
          const consigliato = consigliati.includes(g.id)
          return (
            <button
              key={g.id}
              className={'gruppo-chip' + (on ? ' on' : '')}
              style={{ '--g': g.colore }}
              onClick={() => toggleGruppo(g.id)}
              aria-pressed={on}
            >
              <span className="g-dot" style={{ '--g': g.colore }} />
              {g.label}
              {consigliato && <span className="gruppo-chip-star" title="Consigliato">★</span>}
            </button>
          )
        })}
      </div>

      {/* Durata */}
      <div className="section-title" style={{ marginTop: 18 }}>Durata</div>
      <div className="gruppo-chips">
        {DURATE.map((d) => (
          <button
            key={d}
            className={'giorno-chip' + (durata === d ? ' on' : '')}
            style={{ minWidth: 62, flex: '0 0 auto' }}
            onClick={() => setDurata(d)}
            aria-pressed={durata === d}
          >
            {d} min
          </button>
        ))}
      </div>

      {/* Scelta esercizi per gruppo (opzionale) */}
      {gruppiSel.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 18 }}>Esercizi da includere (facoltativo)</div>
          {regole && (
            <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
              Quelli con la freccia ↑ sono sopra il tuo livello: l'automatico non te li propone, ma
              se li scegli tu entrano lo stesso.
            </p>
          )}
          <div className="stack" style={{ gap: 10 }}>
            {gruppiSel.map((gId) => {
              const gr = gruppoDi(gId)
              const lista = eserciziGruppo(gId)
              const sel = eserciziSel[gId] || []
              const aperto = espanso === gId
              return (
                <div key={gId} className="card ex-pick" style={{ '--g': gr?.colore }}>
                  <button
                    className="ex-pick-head"
                    onClick={() => setEspanso(aperto ? null : gId)}
                    aria-expanded={aperto}
                  >
                    <span className="g-dot" style={{ '--g': gr?.colore }} />
                    <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                      <span className="ex-pick-nome">{gr?.label || gId}</span>
                      <span className="ex-pick-sub">
                        {sel.length > 0 ? `${sel.length} scelti` : 'Automatico (i più usati)'}
                      </span>
                    </span>
                    <IconChevron
                      className="faint"
                      style={{ transform: aperto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
                    />
                  </button>
                  {aperto && (
                    <div className="ex-pick-list">
                      {lista.map((e) => {
                        const on = sel.includes(e.nome)
                        // Sopra il livello dichiarato: l'automatico non lo
                        // propone, ma resta sceglibile a mano — è il suo
                        // allenamento, il livello è un consiglio non un divieto.
                        const oltre = !livelloAmmette(regole, e.nome)
                        return (
                          <button
                            key={e.nome}
                            className={'ex-pick-chip' + (on ? ' on' : '')}
                            onClick={() => toggleEsercizio(gId, e.nome)}
                            aria-pressed={on}
                          >
                            {e.nome}
                            {oltre && (
                              <span
                                className="ex-pick-oltre"
                                title={`Sopra il tuo livello (${livello?.label.toLowerCase()})`}
                              >
                                ↑
                              </span>
                            )}
                            {e.noto && <span className="ex-pick-noto" title="Lo usi già">•</span>}
                            {!e.noto && ptTuo && e.dalPt && (
                              <span className="ex-pick-pt" title={`Tra i più dati da ${pt.nome}`}>
                                <IconCoach width={12} height={12} />
                              </span>
                            )}
                            {!e.noto && !(ptTuo && e.dalPt) && e.popolare && (
                              <span className="ex-pick-pop" title="Tra i più svolti dagli altri">
                                ★
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Anteprima allenamento generato */}
      <div className="section-title" style={{ marginTop: 20 }}>
        Il tuo allenamento · {generato.esercizi.length} esercizi · ~{minutiStimati} min
      </div>
      {generato.esercizi.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
          Seleziona almeno un gruppo muscolare per generare l'allenamento.
        </p>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {generato.esercizi.map((e) => (
            <EsercizioCard key={e.id} esercizio={e} settimana={1} />
          ))}
        </div>
      )}

      {/* Barra azione */}
      <div className="action-bar">
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <button
            className="btn btn-accent btn-block btn-lg"
            disabled={generato.esercizi.length === 0}
            onClick={avvia}
          >
            Avvia allenamento
          </button>
        </div>
      </div>
      <div style={{ height: 92 }} />
    </div>
  )
}
