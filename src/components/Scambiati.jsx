import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { ETICHETTA_TIPO, TIPO_CONDIVISIONE, copiaSchedaRicevuta } from '../lib/condivisioni'
import { tempoRimasto } from '../lib/effimeri'
import { dataOra } from '../lib/format'
import { formatSerieRip } from '../lib/schema'
import { formatSec } from '../lib/parseRecupero'
import { testoSerieFatte } from '../lib/session'
import { disegnaRecap } from '../lib/recapImmagine'
import { useCorpoPronto } from '../lib/corpoImmagini'
import useCorpoAllenamento from '../hooks/useCorpoAllenamento'
import { faiUscire, fileImmagineAllenamento } from '../lib/esporta'
import { fileSchedaExcel } from '../lib/schedaExcel'
import RiepilogoDettaglio from './RiepilogoDettaglio'
import TastoConferma from './TastoConferma'
import {
  IconCheck,
  IconClipboard,
  IconClock,
  IconClose,
  IconDownload,
  IconDumbbell,
  IconImage,
} from './icons'

// ---------------------------------------------------------------------------
// Quello che ci si è mandati fra amici, DENTRO la chat (pages/ChatPage):
// la bolla e il modale che la apre. La fila con i messaggi la fa lib/scambi.
//
// Prima era "Ricevuti e inviati" nel profilo di Social e in quello dell'amico:
// adesso ogni cosa sta nella conversazione con chi l'ha mandata o ricevuta.
//
// Due tipi di cose, lette diversamente:
//   - foto e video (lib/effimeri): di base si guardano UNA volta e spariscono,
//     quindi la bolla dice quanto manca; se chi manda li ha resi permanenti
//     restano e si riaprono quando si vuole;
//   - schede, allenamenti e recap, che restano finché non li togli tu.
//
// Ogni cosa ricevuta si può anche far USCIRE dall'app (lib/esporta): la scheda
// come Excel, l'allenamento e il recap come immagine, la foto o il video dal
// visore mentre li si guarda.
//
// Una scheda ricevuta si può salvare tra le proprie: diventa una copia tutta
// tua, con lo storico azzerato (quello di chi te l'ha mandata non ti riguarda).
// ---------------------------------------------------------------------------

/**
 * Una cosa scambiata, come bolla della chat.
 * @param {{s: ReturnType<typeof import('../lib/scambi').scambiCon>[number], onApri: () => void}} props
 */
export function BollaScambio({ s, onApri }) {
  const { mio } = s
  if (s.genere === 'effimero') {
    const { r } = s
    const cosa = r.tipo === 'video' ? 'Video' : 'Foto'
    if (r.permanente) {
      return (
        <div className={'chat-bolla chat-scambio chat-media' + (mio ? ' mia' : '')}>
          <MediaPermanente r={r} mio={mio} onApri={onApri} />
          <div className="chat-ora">
            {dataOra(r.inviatoIl)}
            {mio && <span>· {r.apertoIl ? 'vista' : 'non ancora vista'}</span>}
          </div>
        </div>
      )
    }
    return (
      <div className={'chat-bolla chat-scambio' + (mio ? ' mia' : '')}>
        {mio ? (
          <div className="chat-scambio-corpo">
            <IconImage width={18} height={18} />
            <span className="chat-scambio-testo">
              <span className="chat-scambio-nome">
                <span className="una-volta" aria-hidden="true">1</span> {cosa} · una volta
              </span>
              <span className="chat-scambio-sub">
                {r.consumato ? (
                  <>
                    <IconCheck width={11} height={11} /> Guardata e cancellata
                  </>
                ) : (
                  `Non ancora aperta · ${tempoRimasto(r)}`
                )}
              </span>
            </span>
          </div>
        ) : (
          <button className="chat-scambio-corpo" onClick={onApri}>
            <IconImage width={18} height={18} />
            <span className="chat-scambio-testo">
              <span className="chat-scambio-nome">
                <span className="una-volta" aria-hidden="true">1</span> {cosa}
              </span>
              <span className="chat-scambio-sub">
                <IconClock width={11} height={11} /> {tempoRimasto(r)}
              </span>
            </span>
            <span className="badge badge-accent nowrap">Guarda</span>
          </button>
        )}
        <div className="chat-ora">{dataOra(r.inviatoIl)}</div>
      </div>
    )
  }

  // Schede, allenamenti e recap si vedono INTERI nella bolla, come una foto:
  // niente "Giorno A" da toccare per sapere cosa c'è. Il tasto in fondo apre
  // il resto (salvarla tra le proprie, scaricarla, toglierla).
  const { c } = s
  const Icona = c.tipo === TIPO_CONDIVISIONE.SCHEDA ? IconClipboard : IconDumbbell
  const ricevutaScheda = !mio && c.tipo === TIPO_CONDIVISIONE.SCHEDA
  return (
    <div className={'chat-bolla chat-scambio chat-aperto' + (mio ? ' mia' : '')}>
      <div className="chat-scambio-testa">
        <Icona width={16} height={16} />
        <span className="chat-scambio-nome">{c.titolo || ETICHETTA_TIPO[c.tipo]}</span>
        <span className="chat-scambio-sub">{ETICHETTA_TIPO[c.tipo]}</span>
      </div>
      <div className="chat-scambio-contenuto">
        {c.tipo === TIPO_CONDIVISIONE.SCHEDA ? (
          <SchedaRicevuta scheda={c.payload} />
        ) : c.tipo === TIPO_CONDIVISIONE.RECAP ? (
          <RecapRicevuto payload={c.payload} daNome={c.daNome} />
        ) : (
          <AllenamentoCompatto voce={c.payload} />
        )}
      </div>
      <button className="btn btn-sm btn-block chat-scambio-azioni" onClick={onApri}>
        {ricevutaScheda ? (c.salvataIl ? 'Salvata · altre opzioni' : 'Salva nelle mie schede…') : 'Scarica o togli…'}
      </button>
      <div className="chat-ora">
        {dataOra(c.creataIl)}
        {mio && <span>· {c.vistaIl ? 'aperto' : 'non ancora aperto'}</span>}
      </div>
    </div>
  )
}

// I file dei permanenti, scaricati una volta per sessione: la chat si
// ridisegna spesso, e riscaricare un video a ogni messaggio nuovo sarebbe
// spreco di rete.
const urlPermanenti = new Map()

/** La foto / il video permanente, visibile direttamente nella bolla. */
function MediaPermanente({ r, mio, onApri }) {
  const { apriEffimero, apertoEffimero } = useAccount()
  const [url, setUrl] = useState(() => urlPermanenti.get(r.id) || null)
  const [errore, setErrore] = useState(false)

  useEffect(() => {
    if (url) return undefined
    let vivo = true
    apriEffimero(r)
      .then((blob) => {
        if (!blob) {
          if (vivo) setErrore(true)
          return
        }
        const u = URL.createObjectURL(blob)
        urlPermanenti.set(r.id, u)
        if (vivo) setUrl(u)
      })
      .catch(() => vivo && setErrore(true))
    return () => {
      vivo = false
    }
  }, [r, url, apriEffimero])

  // Vista in chat = vista: si spegne il pallino, come per i messaggi.
  useEffect(() => {
    if (url && !mio && !r.apertoIl) apertoEffimero(r)
  }, [url, mio, r, apertoEffimero])

  if (errore) return <div className="chat-media-vuoto">Non più disponibile</div>
  if (!url) return <div className="chat-media-vuoto media-loading" />
  return r.tipo === 'video' ? (
    <video src={url} controls playsInline preload="metadata" />
  ) : (
    <button className="chat-media-foto" onClick={onApri} aria-label="Apri la foto a schermo pieno">
      <img src={url} alt={mio ? 'Foto che hai mandato' : `Foto di ${r.daNome}`} />
    </button>
  )
}

/** Il modale di una scheda / allenamento / recap toccato in chat. */
export function ModaleScambio({ c, onChiudi }) {
  const { utenteCorrente, segnaCondivisioneSalvata, eliminaCondivisione } = useAccount()
  const { aggiungiScheda } = useStore()

  const salvaScheda = () => {
    const scheda = copiaSchedaRicevuta(c.payload, c.daNome)
    aggiungiScheda(scheda, { attiva: false })
    segnaCondivisioneSalvata(c.id)
    onChiudi()
    navigate(routes.scheda(scheda.id))
  }

  const butta = () => {
    eliminaCondivisione(c.id)
    onChiudi()
  }

  return (
    <ModaleCondivisione
      c={c}
      ricevuta={c.aId === utenteCorrente?.id}
      onChiudi={onChiudi}
      onSalva={salvaScheda}
      onButta={butta}
    />
  )
}

// --------------------------------------------------------------------------

function ModaleCondivisione({ c, ricevuta, onChiudi, onSalva, onButta }) {
  const [esito, setEsito] = useState('')
  const [inCorso, setInCorso] = useState(false)

  // Fuori dall'app: la scheda come Excel (la stessa di "Esporta in Excel"),
  // l'allenamento e il recap come l'immagine del recap.
  const salvaSulDispositivo = async () => {
    setInCorso(true)
    setEsito('')
    try {
      let file
      if (c.tipo === TIPO_CONDIVISIONE.SCHEDA) {
        file = fileSchedaExcel(c.payload)
      } else if (c.tipo === TIPO_CONDIVISIONE.RECAP) {
        file = await fileImmagineAllenamento(c.payload || {})
      } else {
        file = await fileImmagineAllenamento({ riep: c.payload })
      }
      const r = await faiUscire(file, { titolo: c.titolo || ETICHETTA_TIPO[c.tipo] })
      setEsito(r.esito)
    } catch (e) {
      console.warn('Salvataggio sul dispositivo non riuscito', e)
      setEsito('Non sono riuscito a preparare il file.')
    }
    setInCorso(false)
  }

  const formato = c.tipo === TIPO_CONDIVISIONE.SCHEDA ? 'come Excel' : 'come immagine'

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal"
        role="dialog"
        aria-label="Contenuto condiviso"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 2 }}>{c.titolo || ETICHETTA_TIPO[c.tipo]}</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              {ETICHETTA_TIPO[c.tipo]} {ricevuta ? `da ${c.daNome}` : 'mandato da te'} ·{' '}
              {dataOra(c.creataIl)}
            </div>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {c.tipo === TIPO_CONDIVISIONE.SCHEDA ? (
            <SchedaRicevuta scheda={c.payload} />
          ) : c.tipo === TIPO_CONDIVISIONE.RECAP ? (
            <RecapRicevuto payload={c.payload} daNome={c.daNome} />
          ) : (
            <AllenamentoRicevuto voce={c.payload} />
          )}
        </div>

        <div className="stack" style={{ gap: 8, marginTop: 16 }}>
          {ricevuta && c.tipo === TIPO_CONDIVISIONE.SCHEDA && (
            <>
              <button className="btn btn-accent btn-block" onClick={onSalva}>
                {c.salvataIl ? 'Salva un’altra copia' : 'Salva nelle mie schede'}
              </button>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.4, margin: '0 2px' }}>
                Ne fai una copia tua, senza gli allenamenti già svolti da {c.daNome} e visibile solo
                a te. La visibilità la cambi quando vuoi dall’editor della scheda.
              </p>
            </>
          )}
          <button className="btn btn-block" onClick={salvaSulDispositivo} disabled={inCorso}>
            <IconDownload width={17} height={17} /> Salva sul dispositivo {formato}
          </button>
          {esito && (
            <p className="muted" role="status" style={{ fontSize: 13, textAlign: 'center' }}>
              {esito}
            </p>
          )}
          <TastoConferma
            etichetta="Togli dalla lista"
            domanda={`Toglierlo dalla lista? Sparisce anche a ${
              ricevuta ? c.daNome || 'chi te l’ha mandato' : 'chi l’hai mandato'
            }.`}
            si="Sì, togli"
            onConferma={onButta}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SchedaRicevuta({ scheda }) {
  const workout = (scheda?.giorni || []).filter((g) => g.tipo === 'workout')
  return (
    <>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span className="badge badge-accent">{workout.length} allenamenti/sett.</span>
        <span className="badge">{scheda?.numeroSettimane || 1} settimane</span>
      </div>
      {scheda?.nota && (
        <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.4 }}>
          {scheda.nota}
        </p>
      )}
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {workout.map((g) => (
          <div className="card" key={g.id}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{g.nome || 'Allenamento'}</div>
            <div className="stack" style={{ gap: 4, marginTop: 8 }}>
              {(g.esercizi || []).map((e) => (
                <div
                  key={e.id}
                  className="row"
                  style={{ justifyContent: 'space-between', gap: 10 }}
                >
                  <span style={{ fontSize: 13.5, minWidth: 0 }}>{e.nome}</span>
                  <span className="muted nowrap" style={{ fontSize: 12.5 }}>
                    {formatSerieRip(e.schemaBase)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// L'allenamento in chat, in poco spazio: una riga per esercizio coi pallini
// delle serie, e sotto cosa si è fatto. Il riepilogo intero (corpo, muscoli,
// durata in grande) resta nel modale, dietro il tasto della bolla.
function AllenamentoCompatto({ voce }) {
  if (!voce) return <p className="muted">Contenuto non disponibile.</p>
  const esercizi = Array.isArray(voce.esercizi) ? voce.esercizi : []
  const sopra = [
    voce.nomeScheda,
    voce.durataSec ? formatSec(voce.durataSec) : '',
    esercizi.length ? `${esercizi.length} esercizi` : '',
  ].filter(Boolean)
  return (
    <div className="all-compatto">
      {sopra.length > 0 && <div className="all-compatto-sopra">{sopra.join(' · ')}</div>}
      {esercizi.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Segnato come completato, senza il dettaglio delle serie.
        </p>
      ) : (
        esercizi.map((e, i) => {
          const sets = e.sets || []
          const testo = testoSerieFatte(e) || formatSerieRip(e.schema)
          return (
            <div key={i} className="all-compatto-riga">
              <div className="all-compatto-su">
                <span className="all-compatto-nome">{e.nome}</span>
                <span className="all-compatto-dots" aria-label={`${sets.filter((x) => x.colore).length} di ${sets.length} serie`}>
                  {sets.map((x, j) => (
                    <span key={j} className={'dot-mini' + (x.colore ? ' ' + x.colore : '')} />
                  ))}
                </span>
              </div>
              {testo && <div className="all-compatto-giu">{testo}</div>}
            </div>
          )
        })
      )}
    </div>
  )
}

function AllenamentoRicevuto({ voce }) {
  if (!voce) return <p className="muted">Contenuto non disponibile.</p>
  const dettagliato = Array.isArray(voce.esercizi) && voce.esercizi.length > 0
  if (!dettagliato) {
    return (
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>{voce.nomeGiorno}</div>
        <p className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
          Segnato come completato, senza il dettaglio delle serie.
        </p>
      </div>
    )
  }
  return (
    <>
      <div className="cal-recap-scheda">{voce.nomeScheda}</div>
      <RiepilogoDettaglio riep={voce} />
    </>
  )
}

// Il recap non viaggia come immagine (peserebbe): viaggiano i numeri, e la
// card la ridisegna qui il dispositivo di chi guarda.
function RecapRicevuto({ payload, daNome }) {
  // Le immagini del corpo arrivano dopo: quando ci sono, la card si ridisegna.
  const corpo = useCorpoAllenamento(payload?.riep)
  const corpoPronto = useCorpoPronto(corpo)
  const url = useMemo(() => {
    if (!payload?.riep || !payload?.stat) return null
    try {
      // Come nel feed: in fondo il nome di chi l'ha fatto.
      return disegnaRecap({
        riep: payload.riep,
        stat: payload.stat,
        commento: payload.commento || '',
        layout: payload.layout ?? payload.riep?.recap,
        nome: payload.utente || daNome,
        corpo,
      }).toDataURL('image/png')
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corpoPronto: ridisegna quando arrivano le immagini
  }, [payload, daNome, corpo, corpoPronto])

  // Se la card non si disegna (dati vecchi o incompleti) si ripiega sul
  // dettaglio delle serie: meglio l'allenamento nudo che un buco.
  if (!url) return <AllenamentoRicevuto voce={payload?.riep} />
  return (
    <div className="recap-share">
      <img className="recap-img" src={url} alt={`Recap dell'allenamento di ${daNome}`} />
    </div>
  )
}
