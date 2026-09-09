import { useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import { ETICHETTA_TIPO, TIPO_CONDIVISIONE, copiaSchedaRicevuta } from '../lib/condivisioni'
import { tempoRimasto } from '../lib/effimeri'
import { dataOra } from '../lib/format'
import { disegnaRecap } from '../lib/recapImmagine'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import VisoreEffimero from '../components/VisoreEffimero'
import InviaMediaEffimero from '../components/InviaMediaEffimero'
import {
  IconBack,
  IconCheck,
  IconChevron,
  IconClock,
  IconClose,
  IconDumbbell,
  IconImage,
  IconTrash,
} from '../components/icons'

// ---------------------------------------------------------------------------
// Condivisi: tutto quello che gli amici ti hanno mandato, e quello che hai
// mandato tu.
//
// Due sezioni, perché sono due cose diverse e vanno lette diversamente:
//   - foto e video MOMENTANEI, in cima, con il tempo che resta: si guardano
//     una volta e spariscono (lib/effimeri), quindi sono le cose "urgenti";
//   - schede, allenamenti e recap, che restano finché non li butti tu.
//
// Una scheda ricevuta si può salvare tra le proprie: diventa una copia tutta
// tua, con lo storico azzerato (quello di chi te l'ha mandata non ti riguarda).
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function CondivisiPage() {
  const {
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
  const [invioAperto, setInvioAperto] = useState(false)

  const ricevute = condivisioni.ricevute
  const inviate = condivisioni.inviate

  const apri = (c) => {
    setAperta(c)
    if (!c.vistaIl) segnaCondivisioneVista(c.id)
  }

  const salvaScheda = (c) => {
    const scheda = copiaSchedaRicevuta(c.payload, c.daNome)
    aggiungiScheda(scheda)
    segnaCondivisioneSalvata(c.id)
    setAperta(null)
    navigate(routes.scheda(scheda.id))
  }

  const butta = (c) => {
    if (!window.confirm('Togliere questo dalla lista?')) return
    eliminaCondivisione(c.id)
    setAperta(null)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Condivisi</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        Quello che gli amici ti mandano: schede, allenamenti e recap restano qui finché non li
        togli; foto e video si cancellano appena li guardi.
      </p>

      <button className="btn btn-accent btn-block" onClick={() => setInvioAperto(true)}>
        <IconImage width={17} height={17} /> Manda una foto o un video
      </button>

      <div className="segmented" style={{ margin: '14px 0' }}>
        <button
          className={'seg-btn' + (tab === 'ricevuti' ? ' on' : '')}
          onClick={() => setTab('ricevuti')}
          aria-pressed={tab === 'ricevuti'}
        >
          Ricevuti{condivisioni.daVedere > 0 ? ` · ${condivisioni.daVedere}` : ''}
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
        <>
          {effimeri.ricevuti.length > 0 && (
            <>
              <div className="section-title">Da guardare · {effimeri.ricevuti.length}</div>
              <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
                {effimeri.ricevuti.map((r) => (
                  <button
                    key={r.id}
                    className="effimero-card"
                    onClick={() => setEffimeroAperto(r)}
                  >
                    <span className="user-avatar sm" aria-hidden="true">{iniziale(r.daNome)}</span>
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
              </div>
            </>
          )}

          <div className="section-title">
            {ricevute.length === 0 ? 'Schede, allenamenti e recap' : `Schede, allenamenti e recap · ${ricevute.length}`}
          </div>
          {ricevute.length === 0 && effimeri.ricevuti.length === 0 ? (
            <div className="empty">
              <div className="big">📬</div>
              <p>
                Non ti ha ancora mandato niente nessuno.
                <br />
                Dalle schede, dal calendario e dal recap di fine allenamento trovi «Manda a un amico».
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {ricevute.map((c) => (
                <CardCondivisione key={c.id} c={c} onApri={() => apri(c)} onButta={() => butta(c)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {effimeri.inviati.length > 0 && (
            <>
              <div className="section-title">Foto e video mandati</div>
              <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
                {effimeri.inviati.map((r) => (
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
                          {r.consumato ? 'Guardato e cancellato' : `Non ancora aperto · ${tempoRimasto(r)}`}
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
              </div>
            </>
          )}

          <div className="section-title">Schede, allenamenti e recap</div>
          {inviate.length === 0 && effimeri.inviati.length === 0 ? (
            <div className="empty">
              <div className="big">📤</div>
              <p>Non hai ancora mandato niente.</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {inviate.map((c) => (
                <CardCondivisione key={c.id} c={c} inviata onApri={() => apri(c)} onButta={() => butta(c)} />
              ))}
            </div>
          )}
        </>
      )}

      {aperta && (
        <ModaleCondivisione
          c={aperta}
          onChiudi={() => setAperta(null)}
          onSalva={() => salvaScheda(aperta)}
        />
      )}
      {effimeroAperto && (
        <VisoreEffimero riga={effimeroAperto} onChiuso={() => setEffimeroAperto(null)} />
      )}
      {invioAperto && <InviaMediaEffimero onChiudi={() => setInvioAperto(false)} />}
    </div>
  )
}

// --------------------------------------------------------------------------

function CardCondivisione({ c, inviata = false, onApri, onButta }) {
  const nuova = !inviata && !c.vistaIl
  return (
    <div className={'user-card' + (nuova ? ' nuovo' : '')}>
      <button className="user-card-main" onClick={onApri}>
        <span className="menu-voce-icona" aria-hidden="true">
          <IconDumbbell width={18} height={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="menu-voce-nome">{c.titolo || ETICHETTA_TIPO[c.tipo]}</span>
          <span className="menu-voce-desc">
            {ETICHETTA_TIPO[c.tipo]} · {inviata ? 'mandato' : 'da'} {inviata ? '' : c.daNome}
            {inviata ? ` · ${c.vistaIl ? 'aperto' : 'non ancora aperto'}` : ''} · {dataOra(c.creataIl)}
          </span>
        </span>
        {nuova && <span className="pallino-notifica">1</span>}
        <IconChevron className="faint" />
      </button>
      <button className="icon-btn" aria-label="Togli dalla lista" onClick={onButta}>
        <IconTrash width={16} height={16} />
      </button>
    </div>
  )
}

function ModaleCondivisione({ c, onChiudi, onSalva }) {
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Contenuto condiviso" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 2 }}>{c.titolo || ETICHETTA_TIPO[c.tipo]}</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              {ETICHETTA_TIPO[c.tipo]} da {c.daNome} · {dataOra(c.creataIl)}
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

        {c.tipo === TIPO_CONDIVISIONE.SCHEDA && (
          <>
            <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} onClick={onSalva}>
              {c.salvataIl ? 'Salva un’altra copia' : 'Salva nelle mie schede'}
            </button>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
              Ne fai una copia tua, senza gli allenamenti già svolti da {c.daNome} e visibile solo a
              te. La visibilità la cambi quando vuoi dall’editor della scheda.
            </p>
          </>
        )}
      </div>
    </div>
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
        <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.4 }}>{scheda.nota}</p>
      )}
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {workout.map((g) => (
          <div className="card" key={g.id}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{g.nome || 'Allenamento'}</div>
            <div className="stack" style={{ gap: 4, marginTop: 8 }}>
              {(g.esercizi || []).map((e) => (
                <div key={e.id} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
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
      return disegnaRecap({
        riep: payload.riep,
        stat: payload.stat,
        utente: payload.utente || daNome,
        commento: payload.commento || '',
      }).toDataURL('image/png')
    } catch {
      return null
    }
  }, [payload, daNome])

  // Se la card non si disegna (dati vecchi o incompleti) si ripiega sul
  // dettaglio delle serie: meglio l'allenamento nudo che un buco.
  if (!url) return <AllenamentoRicevuto voce={payload?.riep} />
  return (
    <div className="recap-share">
      <img className="recap-img" src={url} alt={`Recap dell'allenamento di ${daNome}`} />
    </div>
  )
}
