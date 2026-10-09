import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import { bloccaPersona, profiloPubblico } from '../lib/social'
import { contattaPt } from '../lib/contattiPt'
import { TIPO, statoAmicizia, trovaRelazione } from '../lib/relazioni'
import { isPt } from '../lib/pt'
import { dataLunga } from '../lib/format'
import useCollettivo from '../hooks/useCollettivo'
import Avatar from '../components/Avatar'
import ListaAllenamenti from '../components/ListaAllenamenti'
import MandaAdAmico from '../components/MandaAdAmico'
import Scambiati from '../components/Scambiati'
import TastoConferma from '../components/TastoConferma'
import SegnalaContenuto from '../components/SegnalaContenuto'
import {
  IconAmici,
  IconBack,
  IconBandiera,
  IconCheck,
  IconClose,
  IconCoach,
  IconComment,
  IconDots,
  IconEdit,
  IconLock,
  IconShare,
} from '../components/icons'

// ---------------------------------------------------------------------------
// La pagina di una persona (/utente/:id): si apre toccando un avatar o un nome
// nel feed, nei commenti, nei mi piace, in Cerca, negli amici e nella chat.
//
// Si apre per CHIUNQUE, ma di uno sconosciuto si vede solo quello che ha reso
// pubblico: la testata (`profilo_pubblico`, il cognome solo ad amici e tra PT
// e atleta) e i suoi allenamenti e schede pubbliche. Quello che ha tenuto per
// sé qui non c'è e non si vede che c'è.
//
// La PROPRIA pagina è la stessa che vedono gli altri, con "Modifica profilo"
// al posto delle azioni: serve a vedersi da fuori.
// ---------------------------------------------------------------------------

function meseAnno(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

export default function UtentePage({ id }) {
  const {
    utenteCorrente,
    relazioni,
    inviaRichiestaAmicizia,
    rispondiRichiesta,
    annullaRichiesta,
    rimuoviAmico,
    ricaricaSociale,
    mioPt,
    mieiAtleti,
  } = useAccount()
  const ioId = utenteCorrente?.id
  const io = id === ioId

  // { per, profilo, errore }: la risposta tenuta insieme all'id a cui si
  // riferisce, così passando da una persona all'altra non si vede la vecchia.
  const [risposta, setRisposta] = useState({ per: null, profilo: null, errore: '' })
  useEffect(() => {
    let vivo = true
    profiloPubblico(id).then((esito) => {
      if (vivo) setRisposta({ per: id, profilo: esito.profilo, errore: esito.errore })
    })
    return () => {
      vivo = false
    }
  }, [id, relazioni])
  const caricato = risposta.per === id
  const persona = caricato ? risposta.profilo : null

  const { dati } = useCollettivo()
  const allenamenti = useMemo(() => allenamentiDiUtente({ id }, { collettivo: dati }), [id, dati])
  const schede = useMemo(() => schedeDiUtente({ id }, { collettivo: dati }), [id, dati])

  const [tab, setTab] = useState('allenamenti')
  const [manda, setManda] = useState(false)
  const [errore, setErrore] = useState('')
  // Il menu "⋯": '' chiuso · 'menu' · 'blocca' (la conferma) · 'segnala'.
  const [menu, setMenu] = useState('')
  const [erroreBlocco, setErroreBlocco] = useState('')

  const stato = io ? 'io' : statoAmicizia(relazioni, ioId, id)
  const rel = trovaRelazione(relazioni, TIPO.AMICIZIA, ioId, id)
  const fai = async (azione) => {
    const esito = await azione()
    setErrore(esito?.ok === false ? esito.errore : '')
  }

  // Bloccare: sparite a vicenda (vedi `blocca` in schema.sql). Dopo, questa
  // pagina non si apre più: si torna indietro, e la pagina da cui si veniva
  // (feed, commenti) si rilegge senza di lui.
  const blocca = async () => {
    setErroreBlocco('')
    const esito = await bloccaPersona(id)
    if (!esito.ok) return setErroreBlocco(esito.errore)
    setMenu('')
    await ricaricaSociale()
    goBack()
  }
  // Il proprio PT o un proprio atleta non si bloccano: prima ci si scollega.
  // Lo dice anche il database; qui si evita di proporlo.
  const collegati = mioPt?.id === id || (mieiAtleti || []).some((a) => a.id === id)

  // "Contatta il PT": solo da atleta a un PT che non è già il proprio. Apre la
  // chat anche senza amicizia (`contatta_pt` in schema.sql); lì il PT sceglie
  // se prendere l'incarico, e l'atleta conferma.
  const puoContattare = !!persona && !io && isPt(persona) && !isPt(utenteCorrente) && mioPt?.id !== id
  const contatta = async () => {
    const esito = await contattaPt(id)
    if (!esito.ok) return setErrore(esito.errore)
    navigate(routes.chat(id))
  }

  const nome = persona?.nome || ''
  const nomeIntero = [persona?.nome, persona?.cognome].filter(Boolean).join(' ')

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack()} aria-label="Indietro">
          <IconBack />
        </button>
        <h1 style={{ fontSize: 18, flex: 1 }}>{persona?.username ? `@${persona.username}` : 'Profilo'}</h1>
        {persona && !io && (
          <button className="icon-btn" onClick={() => setMenu('menu')} aria-label="Altro: segnala o blocca">
            <IconDots />
          </button>
        )}
      </div>

      {(menu === 'menu' || menu === 'blocca') &&
        createPortal(
          <div className="foglio-backdrop" onClick={() => setMenu('')}>
            <div className="foglio" role="dialog" aria-label={`Opzioni su ${nome}`} onClick={(e) => e.stopPropagation()}>
              <div className="foglio-maniglia" aria-hidden="true" />
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <h3>{menu === 'blocca' ? `Bloccare ${nome}?` : nome}</h3>
                <button className="icon-btn" aria-label="Chiudi" onClick={() => setMenu('')}>
                  <IconClose />
                </button>
              </div>
              {menu === 'blocca' ? (
                <>
                  <p className="muted" style={{ fontSize: 14, lineHeight: 1.45, marginTop: 0 }}>
                    Sparite a vicenda: non vedrete più post, commenti e mi piace dell’altro, non vi
                    troverete in Cerca e la chat si chiude.
                    {stato === 'amici' ? ' Smetterete anche di essere amici.' : ''} {nome} non riceve
                    nessun avviso. Puoi sbloccarlo dal Profilo, in “Persone bloccate”.
                  </p>
                  {erroreBlocco && <p className="form-error">{erroreBlocco}</p>}
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-danger-pieno grow" onClick={blocca}>
                      Sì, blocca
                    </button>
                    <button className="btn grow" onClick={() => setMenu('menu')}>
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  <button className="menu-voce" onClick={() => setMenu('segnala')}>
                    <span className="menu-voce-icona" aria-hidden="true">
                      <IconBandiera width={20} height={20} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">Segnala</span>
                      <span className="menu-voce-desc">Il profilo va contro le regole: lo guarda un moderatore.</span>
                    </span>
                  </button>
                  {collegati ? (
                    <p className="muted" style={{ fontSize: 13, margin: '4px 2px' }}>
                      Siete collegati come PT e atleta: per bloccarlo, prima scollegatevi dal Profilo.
                    </p>
                  ) : (
                    <button className="menu-voce pericolo" onClick={() => setMenu('blocca')}>
                      <span className="menu-voce-icona" aria-hidden="true">
                        <IconLock width={20} height={20} />
                      </span>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="menu-voce-nome">Blocca</span>
                        <span className="menu-voce-desc">Sparite a vicenda, senza avvisi.</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
      {menu === 'segnala' && (
        <SegnalaContenuto
          tipo="utente"
          oggetto={id}
          ioId={ioId}
          cosa={`il profilo di ${nome}`}
          onChiudi={() => setMenu('')}
          onFatto={() => setMenu('')}
        />
      )}

      {!caricato ? (
        <p className="muted">Carico…</p>
      ) : !persona ? (
        <div className="empty">
          <p>{risposta.errore || 'Questa persona non c’è più.'}</p>
        </div>
      ) : (
        <>
          <div className="utente-testa">
            <Avatar id={persona.id} nome={nome} foto={io ? utenteCorrente.foto || '' : undefined} taglia="lg" />
            <div style={{ minWidth: 0 }}>
              <div className="profilo-nome">{nomeIntero}</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {persona.username && <span className="muted">@{persona.username}</span>}
                {isPt(persona) && (
                  <span className="badge badge-accent">
                    <IconCoach width={12} height={12} /> PT
                  </span>
                )}
                {stato === 'amici' && (
                  <span className="badge badge-good">
                    <IconCheck width={12} height={12} /> Amici
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="utente-numeri">
            <div>
              <strong>{allenamenti.length}</strong>
              <span>allenamenti</span>
            </div>
            <div>
              <strong>{schede.length}</strong>
              <span>schede</span>
            </div>
            <div>
              <strong>{persona.amici}</strong>
              <span>{persona.amici === 1 ? 'amico' : 'amici'}</span>
            </div>
          </div>
          {persona.creatoIl && (
            <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 12px' }}>
              Su ProgettoPalestra da {meseAnno(persona.creatoIl)}
            </p>
          )}

          {/* Le azioni dipendono da chi sei per lui. ⚠️ Scrivere e mandare sono
              due porte diverse apposta: il messaggio RESTA, la foto scade dopo
              24 ore (lib/effimeri). */}
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            {stato === 'io' ? (
              <button className="btn grow" onClick={() => navigate(routes.profilo())}>
                <IconEdit width={16} height={16} /> Modifica profilo
              </button>
            ) : stato === 'amici' ? (
              <>
                <button className="btn grow" onClick={() => navigate(routes.chat(id))}>
                  <IconComment width={16} height={16} /> Scrivi
                </button>
                <button className="btn btn-accent grow" onClick={() => setManda(true)}>
                  <IconShare width={16} height={16} /> Manda
                </button>
              </>
            ) : stato === 'inviata' ? (
              <>
                <span className="badge grow" style={{ justifyContent: 'center' }}>Richiesta inviata</span>
                <button className="btn btn-ghost btn-sm" onClick={() => fai(() => annullaRichiesta(rel.id))}>
                  Annulla
                </button>
              </>
            ) : stato === 'ricevuta' ? (
              <>
                <button className="btn btn-ghost grow" onClick={() => fai(() => rispondiRichiesta(rel.id, false))}>
                  Rifiuta
                </button>
                <button className="btn btn-accent grow" onClick={() => fai(() => rispondiRichiesta(rel.id, true))}>
                  Accetta amicizia
                </button>
              </>
            ) : (
              <button className="btn btn-accent grow" onClick={() => fai(() => inviaRichiestaAmicizia(id))}>
                <IconAmici width={16} height={16} /> Aggiungi agli amici
              </button>
            )}
          </div>
          {puoContattare && (
            <button className="btn btn-accent btn-block" style={{ marginBottom: 12 }} onClick={contatta}>
              <IconCoach width={16} height={16} /> Contatta il PT
            </button>
          )}
          {errore && <p className="form-error">{errore}</p>}
          {manda && <MandaAdAmico amico={persona} onChiudi={() => setManda(false)} />}

          {stato === 'amici' && (
            <>
              <Scambiati amicoId={id} nomeAmico={nome} />
              <div style={{ height: 14 }} />
            </>
          )}

          <div className="segmented" style={{ margin: '4px 0 14px' }}>
            <button
              className={'seg-btn' + (tab === 'allenamenti' ? ' on' : '')}
              onClick={() => setTab('allenamenti')}
              aria-pressed={tab === 'allenamenti'}
            >
              Allenamenti · {allenamenti.length}
            </button>
            <button
              className={'seg-btn' + (tab === 'schede' ? ' on' : '')}
              onClick={() => setTab('schede')}
              aria-pressed={tab === 'schede'}
            >
              Schede · {schede.length}
            </button>
          </div>

          {tab === 'allenamenti' ? (
            <ListaAllenamenti
              voci={allenamenti}
              mostraUtente={false}
              vuoto={io ? 'Non hai ancora reso pubblico nessun allenamento.' : `${nome} non ha ancora reso pubblico nessun allenamento.`}
            />
          ) : schede.length === 0 ? (
            <div className="empty">
              <div className="big">📚</div>
              <p>{io ? 'Non hai ancora reso pubblica nessuna scheda.' : `${nome} non ha ancora reso pubblica nessuna scheda.`}</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {schede.map((s) => (
                <div className="card" key={s.id}>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.nome}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    Creata il {dataLunga(s.creataIl)}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="badge badge-accent">
                      {s.giorni.filter((g) => g.tipo === 'workout').length} allenamenti/sett.
                    </span>
                    <span className="badge">{s.senzaFine ? 'senza fine' : `${s.numeroSettimane} settimane`}</span>
                  </div>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 12.5, margin: '2px 2px', lineHeight: 1.4 }}>
                <IconAmici width={13} height={13} /> Per vedere gli esercizi di una scheda apri Schede
                Generali: lì ci sono tutte quelle pubbliche, con la ricerca.
              </p>
            </div>
          )}

          {/* Toglierlo dagli amici: con la conferma dentro la pagina (non
              `confirm()`, che dove non compare risponde "no" da solo). */}
          {stato === 'amici' && (
            <TastoConferma
              etichetta="Togli dagli amici"
              domanda={`Togliere ${nome} dagli amici? Non potrete più scrivervi né mandarvi niente.`}
              si="Sì, togli"
              onConferma={() => fai(() => rimuoviAmico(id))}
              style={{ marginTop: 24 }}
            />
          )}
        </>
      )}
    </div>
  )
}
