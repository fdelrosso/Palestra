import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { statisticheRecap } from '../lib/recap'
import { TIPO_CONDIVISIONE } from '../lib/condivisioni'
import { eLayoutDefault, normalizzaLayout } from '../lib/recapLayout'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
import { VISIBILITA } from '../lib/visibilita'
import CondividiConAmici from './CondividiConAmici'
import RecapCondivisibile from './RecapCondivisibile'
import VisibilitaPicker from './VisibilitaPicker'
import FotoAllenamento from './FotoAllenamento'
import ModificaAllenamento from './ModificaAllenamento'
import TastoConferma from './TastoConferma'
import { IconShare } from './icons'

// ---------------------------------------------------------------------------
// Cosa si fa con un PROPRIO allenamento già svolto: aprire il recap da
// condividere, mandare a un amico l'allenamento o il recap, decidere chi lo
// vede, attaccarci foto e video, correggerlo e cancellarlo.
//
// Sta sotto al recap in due posti — il giorno aperto nel calendario
// (CalendarPage) e l'allenamento aperto dallo Storico, "I miei" (StoricoPage)
// — e deve fare le stesse cose in tutti e due: per questo sta qui una volta.
//
// `c` è il completamento come lo dà lib/oggi (raccogliCompletamenti), cioè la
// copia LOCALE, quella che si corregge. Il resto lo decide chi lo usa:
// `onSalvaModifica(patch, cambiaData)` (se cambia la data vanno spostate foto
// e interazioni, e la pagina sa dove riportare lo sguardo) e `onElimina`.
// ---------------------------------------------------------------------------

export default function AzioniAllenamento({ c, occupata, onSalvaModifica, onElimina }) {
  const { schede, diete, aggiornaCompletamento } = useStore()
  const { utenteCorrente } = useAccount()
  // Cosa si sta mandando a un amico: { tipo, titolo, sottotitolo, payload }.
  const [daCondividere, setDaCondividere] = useState(null)
  // La card del recap, da mandare su WhatsApp o altrove.
  const [recapAperto, setRecapAperto] = useState(false)

  // Un allenamento svolto, nella forma che usano le liste (lib/storico): è
  // quella che chi lo riceve sa già leggere.
  const voce = {
    utenteId: utenteCorrente?.id || '',
    utenteNome: utenteCorrente?.nome || '',
    data: c.data,
    nomeScheda: c.nomeScheda,
    nomeGiorno: c.nomeGiorno,
    settimana: c.settimana,
    durataSec: c.durataSec,
    esercizi: c.esercizi,
    nota: c.nota,
    calorieReali: c.calorieReali,
    fcMedia: c.fcMedia,
    fcMax: c.fcMax,
    dettagliato: c.dettagliato,
  }

  const mandaAllenamento = () =>
    setDaCondividere({
      tipo: TIPO_CONDIVISIONE.ALLENAMENTO,
      titolo: c.nomeGiorno,
      sottotitolo: c.nomeScheda,
      payload: voce,
    })

  // Del recap NON si manda l'immagine (1080×1350 in localStorage: no): si
  // mandano i numeri, e la card la ridisegna il telefono di chi guarda.
  const mandaRecap = () =>
    setDaCondividere({
      tipo: TIPO_CONDIVISIONE.RECAP,
      titolo: c.nomeGiorno,
      sottotitolo: c.nomeScheda,
      payload: {
        riep: voce,
        stat: statisticheRecap(voce, { schede, diete, dati: utenteCorrente?.dati }),
        utente: utenteCorrente?.nome || '',
        commento: c.nota || '',
        layout: c.recap || null,
      },
    })

  return (
    <>
      {/* La card del recap, da mandare fuori dall'app (WhatsApp,
          Instagram…) e da rifare coi pezzi che si vogliono. */}
      {c.dettagliato && (
        <button className="btn btn-accent btn-block" style={{ marginTop: 12 }} onClick={() => setRecapAperto(true)}>
          <IconShare width={15} height={15} /> Apri il recap da condividere
        </button>
      )}

      {/* Mandarlo a un amico: l'allenamento (le serie) o il recap
          (la card di fine allenamento). Sono due cose diverse e si
          guardano in modo diverso, quindi due tasti. */}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn btn-sm grow" onClick={mandaAllenamento}>
          <IconShare width={15} height={15} /> Manda l’allenamento
        </button>
        {c.dettagliato && (
          <button className="btn btn-sm grow" onClick={mandaRecap}>
            <IconShare width={15} height={15} /> Manda il recap
          </button>
        )}
      </div>

      {/* Ci si può ripensare: la scelta fatta a fine allenamento non
          è definitiva, e un allenamento pubblicato per sbaglio si
          deve poter togliere. */}
      <div className="card" style={{ marginTop: 12 }}>
        <VisibilitaPicker
          valore={c.visibilita}
          onChange={(v) => aggiornaCompletamento(c.schedaId, c.data, { visibilita: v })}
        />
      </div>

      {/* Le foto e i video dell'allenamento: dopo averlo finito si
          aggiungono da qui. Seguono la visibilità scelta qui sopra. */}
      <FotoAllenamento
        chiave={chiaveAllenamento(c)}
        userId={utenteCorrente?.id}
        pubblica={c.visibilita === VISIBILITA.PUBBLICA}
      />

      <ModificaAllenamento key={c.data} completamento={c} occupata={occupata} onSalva={onSalvaModifica} />

      {/* E ci si può pentire del tutto: un allenamento segnato per
          sbaglio, o una prova, si cancella da qui. */}
      <TastoConferma
        style={{ marginTop: 12 }}
        etichetta="Cancella questo allenamento"
        domanda="Cancellare questo allenamento? Sparisce dal calendario e dallo storico, e non si torna indietro."
        onConferma={onElimina}
      />

      {daCondividere && <CondividiConAmici {...daCondividere} onChiudi={() => setDaCondividere(null)} />}

      {/* La card del recap: la stessa di fine allenamento, con "Modifica" e
          WhatsApp. Nome, commento e orologio qui non si scrivono (si
          correggono da "Correggi l'allenamento"). ⚠️ In un portale: chi usa
          questo pezzo lo tiene spesso già dentro un foglio (lo Storico). */}
      {recapAperto &&
        c.dettagliato &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setRecapAperto(false)}>
            <div
              className="modal"
              role="dialog"
              aria-label="Recap da condividere"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ marginBottom: 0 }}>Recap</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setRecapAperto(false)}>
                  Chiudi
                </button>
              </div>
              <RecapCondivisibile
                riep={c}
                schede={schede}
                diete={diete}
                dati={utenteCorrente?.dati}
                utente={utenteCorrente?.nome || ''}
                nome={c.nomeGiorno}
                commento={c.nota || ''}
                layout={c.recap || null}
                onLayout={(l) =>
                  aggiornaCompletamento(c.schedaId, c.data, {
                    recap: l && !eLayoutDefault(l) ? normalizzaLayout(l) : null,
                  })
                }
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
