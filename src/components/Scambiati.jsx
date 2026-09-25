import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { ETICHETTA_TIPO, TIPO_CONDIVISIONE, copiaSchedaRicevuta } from '../lib/condivisioni'
import { tempoRimasto } from '../lib/effimeri'
import { dataOra } from '../lib/format'
import { disegnaRecap } from '../lib/recapImmagine'
import { faiUscire, fileImmagineAllenamento } from '../lib/esporta'
import { fileSchedaExcel } from '../lib/schedaExcel'
import RiepilogoDettaglio from './RiepilogoDettaglio'
import VisoreEffimero from './VisoreEffimero'
import TastoConferma from './TastoConferma'
import {
  IconCheck,
  IconChevron,
  IconClipboard,
  IconClock,
  IconClose,
  IconDownload,
  IconDumbbell,
  IconImage,
} from './icons'

// ---------------------------------------------------------------------------
// Quello che ci si è mandati fra amici: ricevuti e inviati.
//
// Prima era una pagina a sé, "Condivisi", in fondo al menu del profilo: una
// porta in più da sapere che c'era, per cose che vengono dagli AMICI. Adesso
// sta dentro la pagina Amici (tutto) e nel profilo di un amico (solo quello
// scambiato con lui: `amicoId`).
//
// Due tipi di cose, lette diversamente:
//   - foto e video MOMENTANEI, in cima, con il tempo che resta: si guardano
//     una volta e spariscono (lib/effimeri), quindi sono le cose "urgenti";
//   - schede, allenamenti e recap, che restano finché non li togli tu.
//
// Ogni cosa ricevuta si può anche far USCIRE dall'app (lib/esporta): la scheda
// come Excel, l'allenamento e il recap come immagine, la foto o il video dal
// visore mentre li si guarda.
//
// Una scheda ricevuta si può salvare tra le proprie: diventa una copia tutta
// tua, con lo storico azzerato (quello di chi te l'ha mandata non ti riguarda).
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

/**
 * @param {{amicoId?:string|null, nomeAmico?:string}} props
 *   `amicoId`: solo quello scambiato con questa persona.
 */
export default function Scambiati({ amicoId = null, nomeAmico = '' }) {
  const {
    utenteCorrente,
    condivisioni,
    effimeri,
    segnaCondivisioneVista,
    segnaCondivisioneSalvata,
    eliminaCondivisione,
  } = useAccount()
  const { aggiungiScheda } = useStore()

  const [tab, setTab] = useState('ricevuti')
  const [aperta, setAperta] = useState(null) // condivisione aperta nel modale
  const [effimeroAperto, setEffimeroAperto] = useState(null)

  const conLui = (idAltro) => !amicoId || idAltro === amicoId
  const ricevute = condivisioni.ricevute.filter((c) => conLui(c.daId))
  const inviate = condivisioni.inviate.filter((c) => conLui(c.aId))
  const effRicevuti = effimeri.ricevuti.filter((r) => conLui(r.daId))
  const effInviati = effimeri.inviati.filter((r) => conLui(r.aId))
  const nuove = ricevute.filter((c) => !c.vistaIl).length + effRicevuti.length

  // Niente di niente: si tace. Una sezione vuota col suo titolo sopra occupa
  // spazio per dire che non c'è niente. ⚠️ Il visore e il modale restano
  // montati lo stesso: la foto appena aperta esce subito dall'elenco (è
  // consumata), e se era l'unica, tacendo si chiuderebbe il visore sotto gli
  // occhi di chi la sta guardando.
  const vuoto = ricevute.length + inviate.length + effRicevuti.length + effInviati.length === 0

  const apri = (c) => {
    setAperta(c)
    if (!c.vistaIl && c.aId === utenteCorrente?.id) segnaCondivisioneVista(c.id)
  }

  const salvaScheda = (c) => {
    const scheda = copiaSchedaRicevuta(c.payload, c.daNome)
    aggiungiScheda(scheda)
    segnaCondivisioneSalvata(c.id)
    setAperta(null)
    navigate(routes.scheda(scheda.id))
  }

  const butta = (c) => {
    eliminaCondivisione(c.id)
    setAperta(null)
  }

  return (
    <>
      {!vuoto && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>
            {amicoId ? `Scambiati con ${nomeAmico || 'questa persona'}` : 'Ricevuti e inviati'}
          </div>
          <div className="segmented" style={{ margin: '0 0 12px' }}>
            <button
              className={'seg-btn' + (tab === 'ricevuti' ? ' on' : '')}
              onClick={() => setTab('ricevuti')}
              aria-pressed={tab === 'ricevuti'}
            >
              Ricevuti{nuove > 0 ? ` · ${nuove}` : ''}
            </button>
            <button
              className={'seg-btn' + (tab === 'inviati' ? ' on' : '')}
              onClick={() => setTab('inviati')}
              aria-pressed={tab === 'inviati'}
            >
              Inviati
            </button>
          </div>

          {tab === 'ricevuti' ? (
            ricevute.length === 0 && effRicevuti.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, margin: '2px 2px 8px' }}>
                Non ti è ancora arrivato niente.
              </p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {effRicevuti.map((r) => (
                  <button key={r.id} className="effimero-card" onClick={() => setEffimeroAperto(r)}>
                    <span className="user-avatar sm" aria-hidden="true">
                      {iniziale(r.daNome)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="effimero-nome">
                        {r.daNome} ti ha mandato {r.tipo === 'video' ? 'un video' : 'una foto'}
                      </span>
                      <span className="effimero-sub">
                        <IconClock width={12} height={12} /> {tempoRimasto(r)} · si cancella dopo
                      </span>
                    </span>
                    <span className="badge badge-accent nowrap">Guarda</span>
                  </button>
                ))}
                {ricevute.map((c) => (
                  <CardCondivisione key={c.id} c={c} onApri={() => apri(c)} />
                ))}
              </div>
            )
          ) : inviate.length === 0 && effInviati.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: '2px 2px 8px' }}>
              Non hai ancora mandato niente.
            </p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {effInviati.map((r) => (
                <div key={r.id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="menu-voce-icona" aria-hidden="true">
                      <IconImage width={18} height={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                        {r.tipo === 'video' ? 'Video' : 'Foto'} · {dataOra(r.inviatoIl)}
                      </div>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {r.consumato
                          ? 'Guardato e cancellato'
                          : `Non ancora aperto · ${tempoRimasto(r)}`}
                      </div>
                    </div>
                    {r.consumato && (
                      <span className="badge badge-good">
                        <IconCheck width={12} height={12} /> Visto
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {inviate.map((c) => (
                <CardCondivisione key={c.id} c={c} inviata onApri={() => apri(c)} />
              ))}
            </div>
          )}
        </>
      )}

      {aperta && (
        <ModaleCondivisione
          c={aperta}
          ricevuta={aperta.aId === utenteCorrente?.id}
          onChiudi={() => setAperta(null)}
          onSalva={() => salvaScheda(aperta)}
          onButta={() => butta(aperta)}
        />
      )}
      {effimeroAperto && (
        <VisoreEffimero riga={effimeroAperto} onChiuso={() => setEffimeroAperto(null)} />
      )}
    </>
  )
}

// --------------------------------------------------------------------------

function CardCondivisione({ c, inviata = false, onApri }) {
  const nuova = !inviata && !c.vistaIl
  const Icona = c.tipo === TIPO_CONDIVISIONE.SCHEDA ? IconClipboard : IconDumbbell
  return (
    <div className={'user-card' + (nuova ? ' nuovo' : '')}>
      <button className="user-card-main" onClick={onApri}>
        <span className="menu-voce-icona" aria-hidden="true">
          <Icona width={18} height={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="menu-voce-nome">{c.titolo || ETICHETTA_TIPO[c.tipo]}</span>
          <span className="menu-voce-desc">
            {ETICHETTA_TIPO[c.tipo]}
            {inviata
              ? ` · ${c.vistaIl ? 'aperto' : 'non ancora aperto'}`
              : ` · da ${c.daNome}`} · {dataOra(c.creataIl)}
          </span>
        </span>
        {nuova && <span className="pallino-notifica">1</span>}
        <IconChevron className="faint" />
      </button>
    </div>
  )
}

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
                    {e.schemaBase?.serie}
                    {e.schemaBase?.ripetizioni ? `x${e.schemaBase.ripetizioni}` : ''}
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
  const url = useMemo(() => {
    if (!payload?.riep || !payload?.stat) return null
    try {
      // Il nome di chi l'ha mandato sta già sopra, nell'elenco: sulla card no.
      return disegnaRecap({
        riep: payload.riep,
        stat: payload.stat,
        commento: payload.commento || '',
      }).toDataURL('image/png')
    } catch {
      return null
    }
  }, [payload])

  // Se la card non si disegna (dati vecchi o incompleti) si ripiega sul
  // dettaglio delle serie: meglio l'allenamento nudo che un buco.
  if (!url) return <AllenamentoRicevuto voce={payload?.riep} />
  return (
    <div className="recap-share">
      <img className="recap-img" src={url} alt={`Recap dell'allenamento di ${daNome}`} />
    </div>
  )
}
