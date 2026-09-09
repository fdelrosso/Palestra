import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { analizzaStorico } from '../lib/consiglio'
import { influenzaPt, popolaritaEsercizi } from '../lib/comunita'
import {
  DURATE_POSSIBILI,
  GIORNI_POSSIBILI,
  OBIETTIVI,
  generaSchedaPrefatta,
  obiettivoDi,
  riassuntoScheda,
  splitPerGiorni,
} from '../lib/schedePrefatte'
import {
  FOCUS,
  FOCUS_DEFAULT,
  MAX_GRUPPI_SU_MISURA,
  etichettaFocus,
  focusAttivo,
  focusDi,
  gruppiSelezionabili,
  risolviFocus,
} from '../lib/focus'
import { giorniPerLivello, livelloDi, regoleLivello } from '../lib/livello'
import { formatSerieRip } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import { IconBack, IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// "Schede prefatte": si dice che obiettivo si ha, su cosa si vuole insistere,
// quante volte a settimana ci si allena e quanto dura una seduta, e si sceglie
// tra le strutture che hanno senso per quel numero di giorni (full body,
// push/pull/legs, upper/lower…).
//
// La struttura è prefatta; gli esercizi dentro li sceglie lo stesso motore
// dell'allenamento consigliato, quindi tengono conto di quello che già fai e
// del tuo PT — e ognuno prende serie/ripetizioni/recupero dal suo tipo.
//
// Obiettivo e focus non sono la stessa cosa: l'obiettivo decide COME allenarsi
// (serie, ripetizioni, recuperi), il focus DOVE va il lavoro in più (quali
// muscoli prendono un esercizio in più e la precedenza sul tempo).
// ---------------------------------------------------------------------------

export default function SchedePrefattePage() {
  const { schede, aggiungiScheda } = useStore()
  const { utenteCorrente } = useAccount()

  const [obiettivoId, setObiettivoId] = useState('massa')
  const [focusId, setFocusId] = useState(FOCUS_DEFAULT)
  const [gruppiSuMisura, setGruppiSuMisura] = useState([])
  const [giorni, setGiorni] = useState(3)
  const [durata, setDurata] = useState(60)
  const [aperta, setAperta] = useState(null) // scheda generata in anteprima

  const analisi = useMemo(() => analizzaStorico(schede), [schede])
  const comunita = useMemo(
    () => popolaritaEsercizi({ escludiUtenteId: utenteCorrente?.id }),
    [utenteCorrente?.id],
  )
  const pt = useMemo(() => influenzaPt({ utente: utenteCorrente }), [utenteCorrente])

  // Il livello dichiarato sul profilo (lib/livello). Non si sceglie qui: non è
  // una scelta di questa scheda ma di chi la fa, e si cambia da "I miei dati".
  const livelloId = utenteCorrente?.dati?.livello || ''
  const livello = livelloDi(livelloId)
  const regole = regoleLivello(livelloId)
  // Quanti allenamenti a settimana ha senso proporgli: sei sedute non sono
  // "più impegno", sono un problema di recupero.
  const giorniDisponibili = useMemo(
    () => giorniPerLivello(regoleLivello(livelloId), GIORNI_POSSIBILI),
    [livelloId],
  )
  // Se il livello dichiarato non arriva ai giorni selezionati (si cambia da
  // un'altra pagina, e questa può restare aperta) si ripiega sul massimo che
  // gli spetta, invece di generare una scheda che non gli si propone più.
  const giorniScelti = giorniDisponibili.includes(giorni)
    ? giorni
    : giorniDisponibili[giorniDisponibili.length - 1]

  // Il focus vero: la voce scelta, oppure quello costruito dai muscoli che
  // l'utente ha selezionato a mano ("Su misura").
  const focus = useMemo(() => risolviFocus(focusId, gruppiSuMisura), [focusId, gruppiSuMisura])
  const conFocus = focusAttivo(focus)

  const proposte = useMemo(() => {
    return splitPerGiorni(giorniScelti, obiettivoId, livelloId).map((split) => ({
      split,
      scheda: generaSchedaPrefatta({
        split,
        obiettivoId,
        focus,
        livello: livelloId,
        durataMin: durata,
        analisi,
        comunita,
        pt,
      }),
    }))
  }, [giorniScelti, obiettivoId, focus, livelloId, durata, analisi, comunita, pt])

  const obiettivo = obiettivoDi(obiettivoId)
  const voceFocus = focusDi(focusId)
  const muscoliFocus = etichettaFocus(focus)

  const toggleGruppoFocus = (id) =>
    setGruppiSuMisura((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : prev.length >= MAX_GRUPPI_SU_MISURA
          ? prev
          : [...prev, id],
    )

  if (aperta) {
    return (
      <AnteprimaScheda
        voce={aperta}
        onIndietro={() => setAperta(null)}
        onAdotta={() => {
          const s = aggiungiScheda(aperta.scheda)
          navigate(routes.scheda(s.id))
        }}
      />
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Schede prefatte</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 14px', lineHeight: 1.4 }}>
        Dicci cosa cerchi, su cosa vuoi insistere, quante volte ti alleni e quanto tempo hai: ti
        proponiamo le strutture che hanno senso per quel numero di giorni, già riempite di esercizi.
      </p>

      {/* Obiettivo: decide serie, ripetizioni e recuperi di tutta la scheda */}
      <div className="section-title">Obiettivo principale</div>
      <div className="stack" style={{ gap: 8 }}>
        {OBIETTIVI.map((o) => (
          <button
            key={o.id}
            className={'menu-voce' + (obiettivoId === o.id ? ' scelta' : '')}
            onClick={() => setObiettivoId(o.id)}
            aria-pressed={obiettivoId === o.id}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="menu-voce-nome">{o.label}</span>
              <span className="menu-voce-desc">{o.descrizione}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Focus: decide dove va il lavoro in più */}
      <div className="section-title" style={{ marginTop: 18 }}>
        Su cosa vuoi insistere
      </div>
      <div className="gruppo-chips">
        {FOCUS.map((f) => (
          <button
            key={f.id}
            className={'gruppo-chip' + (focusId === f.id ? ' on' : '')}
            onClick={() => setFocusId(f.id)}
            aria-pressed={focusId === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Focus su misura: fino a tre muscoli scelti da chi si allena. L'etichetta
          serve a non confonderli con le voci qui sopra, che si chiamano uguale. */}
      {voceFocus.personalizzato && (
        <>
          <div className="muted" style={{ fontSize: 12.5, margin: '12px 2px 8px', fontWeight: 700 }}>
            Scegli i muscoli (max {MAX_GRUPPI_SU_MISURA}):
          </div>
          <div className="gruppo-chips">
            {gruppiSelezionabili().map((g) => {
              const on = gruppiSuMisura.includes(g.id)
              // Raggiunto il tetto, gli altri muscoli si spengono: meglio che
              // vederli non rispondere al tocco senza capire perché.
              const pieno = !on && gruppiSuMisura.length >= MAX_GRUPPI_SU_MISURA
              return (
                <button
                  key={g.id}
                  className={'gruppo-chip' + (on ? ' on' : '')}
                  style={{ '--g': g.colore, opacity: pieno ? 0.4 : 1 }}
                  onClick={() => toggleGruppoFocus(g.id)}
                  disabled={pieno}
                  aria-pressed={on}
                >
                  <span className="g-dot" style={{ '--g': g.colore }} />
                  {g.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: 12.5, margin: '10px 2px 0', lineHeight: 1.45 }}>
        {voceFocus.personalizzato && conFocus
          ? `Lavoro in più su ${muscoliFocus}.`
          : voceFocus.descrizione}
      </p>

      {/* Giorni */}
      <div className="section-title" style={{ marginTop: 18 }}>Allenamenti a settimana</div>
      <div className="gruppo-chips">
        {giorniDisponibili.map((n) => (
          <button
            key={n}
            className={'giorno-chip' + (giorniScelti === n ? ' on' : '')}
            style={{ minWidth: 52, flex: '0 0 auto' }}
            onClick={() => setGiorni(n)}
            aria-pressed={giorniScelti === n}
          >
            {n}
          </button>
        ))}
      </div>
      {/* Perché mancano le sedute in più: non è una limitazione dell'app, è una
          conseguenza di quello che ha dichiarato — e si cambia da lì. */}
      {regole && giorniDisponibili.length < GIORNI_POSSIBILI.length && (
        <p className="muted" style={{ fontSize: 12.5, margin: '8px 2px 0', lineHeight: 1.45 }}>
          Da {livello.label.toLowerCase()} ci fermiamo a {regole.giorniMax} allenamenti: quello che
          manca a chi ne fa di più non è il volume, è il recupero.{' '}
          <button className="link-inline" onClick={() => navigate(routes.datiFisici())}>
            Cambia livello
          </button>
        </p>
      )}

      {/* Durata */}
      <div className="section-title" style={{ marginTop: 18 }}>Durata di una seduta</div>
      <div className="gruppo-chips">
        {DURATE_POSSIBILI.map((d) => (
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

      {/* Proposte */}
      <div className="section-title" style={{ marginTop: 22 }}>
        {proposte.length === 1 ? 'La scheda per te' : `Scegli tra ${proposte.length} strutture`}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {proposte.map(({ split, scheda }) => {
          const r = riassuntoScheda(scheda, focus)
          return (
            <button key={split.id} className="storico-card" onClick={() => setAperta({ split, scheda, focus })}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{split.nome}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {split.sottotitolo}
                  </div>
                </div>
                <IconChevron className="faint" />
              </div>

              <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.45 }}>
                {split.perche}
              </p>

              <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <span className="badge badge-accent">{split.giorni} allenamenti/sett.</span>
                <span className="badge">{r.esercizi} esercizi</span>
                <span className="badge">{r.serie} serie in totale</span>
                {/* Quante serie finiscono davvero sul muscolo che interessa:
                    è la prova che il focus ha cambiato qualcosa. */}
                {r.serieFocus > 0 && (
                  <span className="badge badge-good">
                    {r.serieFocus} serie su {muscoliFocus}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <p className="muted" style={{ fontSize: 12.5, margin: '16px 2px 0', lineHeight: 1.45 }}>
        Gli esercizi sono scelti tenendo conto di quelli che usi già
        {pt.tuo && !pt.vuota ? `, di quello che ${pt.nome} dà ai suoi atleti` : ''} e di quelli più
        svolti nell'app. Serie, ripetizioni e recuperi cambiano da esercizio a esercizio: i
        fondamentali pesanti vogliono recuperi lunghi, l'isolamento no. Obiettivo scelto:{' '}
        <strong>{obiettivo.label.toLowerCase()}</strong>
        {conFocus && muscoliFocus ? (
          <>
            , con lavoro in più su <strong>{muscoliFocus}</strong>: un esercizio in più per seduta,
            più varianti dello stesso movimento e la precedenza quando il tempo non basta per tutto.
          </>
        ) : (
          '.'
        )}
      </p>

      {/* Il livello non è una scelta di questa pagina, ma ha deciso metà di
          quello che si vede sopra: dirlo qui evita la domanda "perché non mi
          propone gli stacchi?". */}
      {livello ? (
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 2px 0', lineHeight: 1.45 }}>
          Livello dichiarato: <strong style={{ color: 'var(--text)' }}>{livello.label.toLowerCase()}</strong>{' '}
          — {livello.effetto}.{' '}
          <button className="link-inline" onClick={() => navigate(routes.datiFisici())}>
            Cambialo da “I miei dati”
          </button>
        </p>
      ) : (
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 2px 0', lineHeight: 1.45 }}>
          Non hai ancora dichiarato da quanto ti alleni, quindi non escludiamo nessun esercizio.{' '}
          <button className="link-inline" onClick={() => navigate(routes.datiFisici())}>
            Dillo da “I miei dati”
          </button>{' '}
          e le schede si adegueranno.
        </p>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}

// --------------------------------------------------------------------------
// Anteprima completa: tutti i giorni con i loro esercizi, e il tasto per farla
// diventare una scheda propria.
// --------------------------------------------------------------------------
function AnteprimaScheda({ voce, onIndietro, onAdotta }) {
  const { split, scheda, focus } = voce
  const muscoliFocus = etichettaFocus(focus)
  const daEvidenziare = new Set(Object.keys(focus?.boost || {}))

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{split.nome}</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>{split.sottotitolo}</div>
        </div>
      </div>

      <div className="card consiglio-spiega">
        <p style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
          {scheda.nota}
        </p>
      </div>

      <div className="stack" style={{ gap: 14, marginTop: 14 }}>
        {scheda.giorni.map((g) => {
          // Quanti esercizi di questa giornata sono sul muscolo del focus.
          const nFocus = g.esercizi.filter((e) => daEvidenziare.has(e.gruppo)).length
          return (
            <div className="card" key={g.id}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{g.nome}</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {g.esercizi.length} esercizi
                {nFocus > 0 && muscoliFocus ? ` · ${nFocus} su ${muscoliFocus}` : ''}
              </div>

              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {g.esercizi.map((e) => {
                  const gr = gruppoDi(e.gruppo)
                  return (
                    <div key={e.id} className="ex-card" style={gr ? { '--g': gr.colore } : undefined}>
                      <div className="ex-head">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{e.nome}</div>
                          {gr && <div className="ex-nota">{gr.label}</div>}
                        </div>
                        <div className="serie-rip">{formatSerieRip(e.schemaBase)}</div>
                      </div>
                      <div className="ex-scheme">
                        {e.schemaBase.recupero && (
                          <span className="chip">rec {e.schemaBase.recupero}</span>
                        )}
                        {e.schemaBase.carico && <span className="chip">{e.schemaBase.carico}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="action-bar">
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <button className="btn btn-accent btn-block btn-lg" onClick={onAdotta}>
            Usa questa scheda
          </button>
        </div>
      </div>
      <div style={{ height: 92 }} />
    </div>
  )
}
