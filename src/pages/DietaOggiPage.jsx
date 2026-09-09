import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  dietaAttiva,
  dietaDaDatiFisici,
  giornataDelGiorno,
  giornatePerTipo,
  labelObiettivo,
  macroGiornata,
  periodoTesto,
  pianoDelGiorno,
} from '../lib/dieta'
import { datiMancanti, metabolismoBasale } from '../lib/datiFisici'
import { adattaPiano } from '../lib/alimenti'
import { preferenzeAttive } from '../lib/preferenzeCibo'
import { oggiEAllenamento } from '../lib/consiglio'
import { IconBack, IconApple, IconLeaf, IconUtente } from '../components/icons'

// "Cosa mangiare oggi": vista in sola lettura del piano alimentare del giorno.
//
// Sceglie da solo il tipo di giornata (allenamento / riposo) dai giorni di
// allenamento impostati nelle schede, e da lì:
//   - se la dieta ha GIORNATE TIPO buone per oggi, ne propone una (ruotano per
//     data, così due giorni di fila non danno lo stesso menu) e si può passare
//     alle altre con un tocco;
//   - altrimenti mostra il piano base di quel tipo di giornata.
//
// Poi passa tutto dal filtro delle PREFERENZE (allergie, intolleranze, gusti):
// qui l'adattamento è solo una lente, la dieta salvata non viene toccata. Le
// sostituzioni fatte si vedono in fondo, altrimenti uno legge "Skyr" dove il
// nutrizionista aveva scritto "yogurt greco" e non capisce perché.
//
// SE NON C'È NESSUNA DIETA la pagina non si arrende: dai dati del profilo
// (peso, altezza, età, sesso, movimento) calcola il metabolismo basale, ci
// applica l'obiettivo dichiarato e propone quelle calorie con i piatti per
// arrivarci — la stessa dieta che uscirebbe dall'editor, solo non ancora
// salvata. Si riconosce da una fascia in cima, e un tocco la salva davvero.
// Se mancano i dati del profilo non si inventa niente: si dice cosa manca e
// si manda a "I miei dati".
function dataOggiLunga() {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Macro({ label, valore }) {
  return (
    <div className="macro-cell">
      <span className="macro-val">{valore || 0}<small>g</small></span>
      <span className="macro-lab">{label}</span>
    </div>
  )
}

export default function DietaOggiPage() {
  const { diete, schede, preferenze, aggiungiDieta } = useStore()
  const { utenteCorrente } = useAccount()
  const salvata = useMemo(() => diete.find((d) => dietaAttiva(d)) || null, [diete])
  // Nessuna dieta scritta: la si calcola dai dati del profilo. Non viene
  // salvata finché non lo chiede l'utente.
  const proposta = useMemo(
    () => (salvata ? null : dietaDaDatiFisici(utenteCorrente?.dati, preferenze)),
    [salvata, utenteCorrente, preferenze],
  )
  const attiva = salvata || proposta
  const mancanti = datiMancanti(utenteCorrente?.dati)
  const info = useMemo(() => oggiEAllenamento(schede), [schede])
  const [tipo, setTipo] = useState(info.allenamento ? 'allenamento' : 'riposo')
  // Giornata tipo scelta a mano (null = quella proposta per oggi).
  const [giornataId, setGiornataId] = useState(null)

  const allenamento = tipo === 'allenamento'

  const giornate = useMemo(
    () => (attiva ? giornatePerTipo(attiva, allenamento) : []),
    [attiva, allenamento],
  )

  // Quale menu si sta guardando: quello scelto, quello proposto per oggi, o il
  // piano base se la dieta non ha giornate tipo.
  const giornata = useMemo(() => {
    if (!attiva || giornate.length === 0) return null
    if (giornataId) return giornate.find((g) => g.id === giornataId) || null
    return giornataDelGiorno(attiva, allenamento)
  }, [attiva, giornate, giornataId, allenamento])

  const pianoBase = useMemo(
    () => (attiva ? (giornata ? macroGiornata(giornata, attiva, allenamento) : pianoDelGiorno(attiva, allenamento)) : null),
    [attiva, giornata, allenamento],
  )

  // L'adattamento alle preferenze: non tocca la dieta salvata.
  const adattato = useMemo(
    () => (pianoBase && preferenzeAttive(preferenze) ? adattaPiano(pianoBase, preferenze) : null),
    [pianoBase, preferenze],
  )
  const piano = adattato ? adattato.piano : pianoBase

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Cosa mangiare oggi</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>{dataOggiLunga()}</div>
        </div>
      </div>

      {!attiva ? (
        <div className="empty">
          <div className="big">🍎</div>
          <p>
            Nessuna dieta attiva per oggi, e non posso calcolarne una: manca{' '}
            <strong>{mancanti.join(', ')}</strong> nei tuoi dati.
          </p>
          <button
            className="btn btn-accent"
            style={{ marginTop: 14 }}
            onClick={() => navigate(routes.datiFisici())}
          >
            <IconUtente width={17} height={17} /> Completa i miei dati
          </button>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => navigate(routes.dieta())}>
            Vai alla sezione Dieta
          </button>
        </div>
      ) : (
        <>
          {/* La dieta calcolata al volo: si dice che è una proposta, da dove
              vengono i numeri e come renderla definitiva. */}
          {!salvata && (
            <div className="card proposta-dieta">
              <div className="card-titolo">Dieta consigliata dai tuoi dati</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                Non hai ancora una dieta scritta. Questa è calcolata dal tuo metabolismo basale
                ({metabolismoBasale(utenteCorrente?.dati)} kcal) e dall'obiettivo «
                {labelObiettivo(utenteCorrente?.dati?.obiettivo)}». Non è salvata: cambia da sola
                se cambi i tuoi dati.
              </p>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-accent btn-sm grow"
                  onClick={() => {
                    const d = aggiungiDieta(proposta)
                    navigate(routes.dietaEditor(d.id))
                  }}
                >
                  Salva come mia dieta
                </button>
                <button
                  className="btn btn-sm grow"
                  onClick={() => navigate(routes.datiFisici())}
                >
                  I miei dati
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 4 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{attiva.nome || 'Dieta'}</div>
                <div className="meta" style={{ marginTop: 4 }}>
                  <span className="badge badge-accent">{labelObiettivo(attiva.obiettivo)}</span>
                  {attiva.fonte === 'esterna' && (
                    <span className="badge" title={attiva.fonteNota || 'Data da un esperto'}>
                      Del nutrizionista
                    </span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  {salvata ? periodoTesto(attiva) : 'Proposta, non salvata'}
                </div>
              </div>
              <span className="dieta-oggi-ico" aria-hidden="true"><IconApple /></span>
            </div>
          </div>

          {/* Oggi allenamento o riposo? */}
          <div className="muted" style={{ fontSize: 13, margin: '14px 2px 8px', lineHeight: 1.4 }}>
            {info.noto
              ? info.allenamento
                ? 'Oggi è un giorno di allenamento: ecco il piano più ricco.'
                : 'Oggi è un giorno di riposo: piano con meno carboidrati.'
              : 'Imposta i giorni di allenamento nelle tue schede per scegliere il piano in automatico.'}
          </div>

          {/* Toggle allenamento / riposo */}
          <div className="segmented" role="tablist" aria-label="Tipo di giornata">
            <button
              role="tab"
              aria-selected={tipo === 'allenamento'}
              className={'seg-btn' + (tipo === 'allenamento' ? ' on' : '')}
              onClick={() => {
                setTipo('allenamento')
                setGiornataId(null)
              }}
            >
              Allenamento
            </button>
            <button
              role="tab"
              aria-selected={tipo === 'riposo'}
              className={'seg-btn' + (tipo === 'riposo' ? ' on' : '')}
              onClick={() => {
                setTipo('riposo')
                setGiornataId(null)
              }}
            >
              Riposo
            </button>
          </div>

          {/* Le giornate tipo disponibili per oggi */}
          {giornate.length > 0 && (
            <>
              <div className="muted" style={{ fontSize: 12.5, margin: '12px 2px 6px', lineHeight: 1.4 }}>
                {giornate.length === 1
                  ? 'Giornata tipo per oggi:'
                  : `${giornate.length} giornate tipo per questo tipo di giorno — oggi tocca a «${giornata?.nome}».`}
              </div>
              {giornate.length > 1 && (
                <div className="gruppo-chips">
                  {giornate.map((g) => (
                    <button
                      key={g.id}
                      className={'chip' + (g.id === giornata?.id ? ' chip-match' : '')}
                      onClick={() => setGiornataId(g.id)}
                      aria-pressed={g.id === giornata?.id}
                    >
                      {g.nome}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <PianoOggi piano={piano} titolo={giornata?.nome} />

          {/* Cosa è stato cambiato per le tue preferenze */}
          {adattato && adattato.sostituzioni.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-titolo">
                <IconLeaf width={15} height={15} /> Adattato a quello che non mangi
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {adattato.sostituzioni.map((s, i) => (
                  <li key={i} className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {s.da} → <strong>{s.a}</strong>
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                I grammi sono ricalcolati per lasciare invariati i macro. La dieta salvata non è
                stata modificata.
              </p>
            </div>
          )}
          {adattato?.avvisi.map((a, i) => (
            <p key={i} className="form-error" style={{ marginTop: 10 }}>{a}</p>
          ))}

          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-ghost btn-sm grow"
              onClick={() => navigate(routes.dietaPreferenze())}
            >
              Cosa non mangio
            </button>
            {salvata && (
              <button
                className="btn btn-ghost btn-sm grow"
                onClick={() => navigate(routes.dietaEditor(attiva.id))}
              >
                Modifica dieta
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PianoOggi({ piano, titolo }) {
  if (!piano) return null
  return (
    <>
      <div className="card dieta-oggi-macros" style={{ marginTop: 12 }}>
        <div className="kcal-big">
          {piano.kcal || '—'} <small>kcal</small>
        </div>
        <div className="macro-row">
          <Macro label="Proteine" valore={piano.proteine} />
          <Macro label="Carbo" valore={piano.carbo} />
          <Macro label="Grassi" valore={piano.grassi} />
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 16 }}>
        {titolo ? `Pasti · ${titolo}` : 'Pasti'}
      </div>
      {piano.pasti.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
          Nessun pasto impostato per questo piano.
        </p>
      ) : (
        <div className="stack">
          {piano.pasti.map((p) => (
            <div key={p.id} className="card pasto-card">
              <div className="pasto-nome">{p.nome || 'Pasto'}</div>
              {p.testo && <div className="pasto-testo">{p.testo}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
