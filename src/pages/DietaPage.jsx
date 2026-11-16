import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { filtraAtleti, isSoloPt } from '../lib/pt'
import { proposteDietaMandate } from '../lib/proposteDieta'
import { mandateDi } from '../lib/dietaDalPt'
import { leggiExAtleti } from '../lib/exAtleti'
import Avatar from '../components/Avatar'
import CercaAtleta, { NessunAtleta } from '../components/CercaAtleta'
import DietaPerAtleta from '../components/DietaPerAtleta'
import DietaTestata from '../components/DietaTestata'
import DieteDalPt from '../components/DieteDalPt'
import { labelObiettivo, periodoTesto, dietaDaDatiFisici, dietaDiOggi, oggiISO } from '../lib/dieta'
import { datiMancanti, metabolismoBasale } from '../lib/datiFisici'
import { IconArchivio, IconBack, IconCheck, IconChevron, IconPlus, IconUtente } from '../components/icons'

// Elenco delle diete del profilo attivo, fatto come quello delle schede: la
// card si tocca e apre la dieta, l'ATTIVA sta in cima col ✓, le finite stanno
// chiuse in fondo. Ogni dieta ha un obiettivo, un periodo di validità e due
// piani (giorni di allenamento / giorni di riposo).
//
// Se ne possono tenere più d'una, anche per periodi diversi: quella che segue
// la dieta giornaliera (dietaDiOggi) si sceglie dalla sua pagina, con "Rendi
// attiva", come per le schede. Le nuove nascono dal "+" in testata.
//
// Chi non ne ha ancora nessuna non trova il vuoto: dai dati del profilo l'app
// calcola già il metabolismo basale e le calorie dell'obiettivo, e le mostra
// con un tasto per trasformarle in una dieta vera. Se i dati mancano c'è il
// "+" grande e lo si dice — non ci sono numeri di ripiego.
//
// `nuova`: si arriva da /dieta/crea (un indirizzo di prima): il foglio del
// "+" si apre da solo.

function DietaCard({ dieta, attiva, daMandare, mandataA = null }) {
  return (
    <button className="scheda-card" onClick={() => navigate(routes.dietaVista(dieta.id))}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="nome">{dieta.nome || 'Dieta'}</div>
          {attiva && (
            <span className="badge badge-good" style={{ marginTop: 6 }}>
              <IconCheck width={13} height={13} /> Attiva
            </span>
          )}
          <div className="meta">
            <span className="badge badge-accent">{labelObiettivo(dieta.obiettivo)}</span>
            {dieta.fonte === 'esterna' && <span className="badge">Del nutrizionista</span>}
            {dieta.giornate.length > 0 && <span className="badge">{dieta.giornate.length} giornate tipo</span>}
            {dieta.schema?.length > 0 && <span className="badge">Schema settimanale</span>}
          </div>
          {!daMandare && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              {periodoTesto(dieta)}
            </div>
          )}
          {mandataA !== null && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              {mandataA.length ? `Mandata a ${mandataA.join(', ')}` : 'Mai mandata'}
            </div>
          )}
        </div>
        <IconChevron className="faint" />
      </div>

      <div className="dieta-kcal-row">
        <div className="dieta-kcal">
          <span className="muted">Allenamento</span>
          <strong>{dieta.allenamento.kcal || '-'} kcal</strong>
        </div>
        <div className="dieta-kcal">
          <span className="muted">Riposo</span>
          <strong>{dieta.riposo.kcal || '-'} kcal</strong>
        </div>
      </div>
    </button>
  )
}

export default function DietaPage({ nuova = false }) {
  const { diete: seguite, dieteDaMandare, preferenze, aggiungiDieta } = useStore()
  const { utenteCorrente } = useAccount()
  const [menu, setMenu] = useState(nuova)
  const [vediFinite, setVediFinite] = useState(false)
  // Da PT qui ci sono solo le diete da mandare (store/StoreContext): niente
  // attiva, niente periodo, niente dieta calcolata dai suoi dati.
  const soloPt = isSoloPt(utenteCorrente)
  const diete = soloPt ? dieteDaMandare : seguite
  const proposta = useMemo(
    () => (diete.length === 0 && !soloPt ? dietaDaDatiFisici(utenteCorrente?.dati, preferenze) : null),
    [diete, utenteCorrente, preferenze, soloPt],
  )
  const mancanti = datiMancanti(utenteCorrente?.dati)

  // L'attiva in cima, poi le altre; quelle col periodo già finito a parte.
  const { attivaId, mie, finite } = useMemo(() => {
    const oggi = oggiISO()
    const attivaId = soloPt ? null : dietaDiOggi(diete)?.id
    const finita = (d) => d.id !== attivaId && d.dataFine && d.dataFine < oggi
    return {
      attivaId,
      mie: diete.filter((d) => !finita(d)).sort((a, b) => (b.id === attivaId) - (a.id === attivaId)),
      finite: diete.filter(finita),
    }
  }, [diete, soloPt])

  const creaDaProposta = () => {
    const d = aggiungiDieta(proposta)
    navigate(routes.dietaVista(d.id))
  }

  return (
    <div className="app">
      <DietaTestata attiva="diete" aperto={menu} setAperto={setMenu} />
      {!soloPt && <DieteDalPt />}
      {soloPt ? (
        <DieteDelPt diete={diete} onNuova={() => setMenu(true)} />
      ) : diete.length === 0 ? (
        proposta ? (
          <div className="card proposta-dieta">
            <div className="card-titolo">La tua dieta consigliata</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 0 }}>
              Non hai ancora una dieta scritta, ma dai tuoi dati so già cosa proporti: metabolismo
              basale <strong>{metabolismoBasale(utenteCorrente.dati)} kcal</strong>, obiettivo «
              {labelObiettivo(utenteCorrente.dati.obiettivo)}».
            </p>
            <div className="dieta-kcal-row">
              <div className="dieta-kcal">
                <span className="muted">Allenamento</span>
                <strong>{proposta.allenamento.kcal} kcal</strong>
              </div>
              <div className="dieta-kcal">
                <span className="muted">Riposo</span>
                <strong>{proposta.riposo.kcal} kcal</strong>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn btn-accent grow" onClick={creaDaProposta}>
                Salva questa dieta
              </button>
              <button className="btn grow" onClick={() => setMenu(true)}>
                Ho la mia
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
              Stima indicativa (Mifflin-St Jeor), un punto di partenza da personalizzare, non un
              consiglio medico. Cambia coi tuoi dati finché non la salvi.
            </p>
          </div>
        ) : (
          <div className="empty">
            <button
              className="icon-btn icon-btn-pieno plus-grande"
              onClick={() => setMenu(true)}
              aria-label="Nuova dieta"
            >
              <IconPlus width={40} height={40} />
            </button>
            <p>
              Ancora nessuna dieta.
              <br />
              Tocca il <strong>+</strong>: dal PDF del nutrizionista o dai tuoi numeri.
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              Per fartela calcolare dall'app mi manca <strong>{mancanti.join(', ')}</strong>.
            </p>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => navigate(routes.datiFisici())}>
              <IconUtente width={17} height={17} /> Completa i miei dati
            </button>
          </div>
        )
      ) : (
        <>
          {mie.length > 0 && (
            <>
              <div className="section-title">Diete</div>
              <div className="stack">
                {mie.map((d) => (
                  <DietaCard key={d.id} dieta={d} attiva={d.id === attivaId} daMandare={soloPt} />
                ))}
              </div>
            </>
          )}

          {finite.length > 0 && (
            <>
              <button
                type="button"
                className="section-title sezione-apribile"
                onClick={() => setVediFinite((v) => !v)}
                aria-expanded={vediFinite}
              >
                <IconArchivio width={17} height={17} className="faint" />
                <span className="grow">Finite</span>
                <span className="badge">{finite.length}</span>
                <IconChevron
                  width={18}
                  height={18}
                  className="faint"
                  style={{ transform: `rotate(${vediFinite ? -90 : 90}deg)` }}
                />
              </button>
              {vediFinite && (
                <div className="stack">
                  {finite.map((d) => (
                    <DietaCard key={d.id} dieta={d} daMandare={soloPt} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Da PT (solo PT, o "Tutti e due" in modalità PT): le sue diete e quelle
// mandate. Come le schede di lavoro, ma una dieta mandata RESTA fra le sue:
// "Definizione 2000 kcal" si riusa per più atleti. Ogni card dice a chi è
// partita; "Mandate" divide le proposte per atleta (con lo stato: in attesa,
// salvata, rifiutata, ritirata). Se l'atleta la segue adesso non si sa: le
// diete degli altri non si leggono, si sa solo se l'ha salvata.
// ---------------------------------------------------------------------------

function DieteDelPt({ diete, onNuova }) {
  const { utenteCorrente, mieiAtleti = [] } = useAccount()
  const io = utenteCorrente?.id
  const [tab, setTab] = useState('da-mandare')
  const [proposte, setProposte] = useState(null)
  const [ex, setEx] = useState([])
  const [cartella, setCartella] = useState(null)
  const [cerca, setCerca] = useState('')
  const [manda, setManda] = useState(false)

  useEffect(() => {
    let vivo = true
    proposteDietaMandate(io).then((r) => vivo && setProposte(r))
    leggiExAtleti().then((r) => vivo && setEx(r || []))
    return () => {
      vivo = false
    }
  }, [io, manda])

  const nomeDi = (id) =>
    (mieiAtleti || []).find((a) => a.id === id)?.nome ||
    (ex.find((a) => a.id === id)?.nome ? `${ex.find((a) => a.id === id).nome}, ex atleta` : 'un ex atleta')

  const tutte = proposte || []
  const reclamate = new Set(diete.flatMap((d) => d.mandate || []))
  const aChi = (d) => [...new Set(mandateDi(d, tutte, reclamate).map((p) => nomeDi(p.atletaId)))]

  // Le mandate per atleta, dall'ultimo a cui si è mandato qualcosa.
  const perAtleta = []
  for (const p of tutte) {
    let g = perAtleta.find((x) => x.atletaId === p.atletaId)
    if (!g) perAtleta.push((g = { atletaId: p.atletaId, nome: nomeDi(p.atletaId), proposte: [] }))
    g.proposte.push(p)
  }
  const aperta = perAtleta.find((g) => g.atletaId === cartella) || null
  const trovati = filtraAtleti(perAtleta, cerca, (g) => g.nome)

  return (
    <>
      <div className="segmented" style={{ margin: '4px 0 14px' }}>
        <button className={'seg-btn' + (tab === 'da-mandare' ? ' on' : '')} onClick={() => setTab('da-mandare')} aria-pressed={tab === 'da-mandare'}>
          Le mie · {diete.length}
        </button>
        <button className={'seg-btn' + (tab === 'mandate' ? ' on' : '')} onClick={() => setTab('mandate')} aria-pressed={tab === 'mandate'}>
          Mandate{proposte ? ` · ${proposte.length}` : ''}
        </button>
      </div>

      {tab === 'da-mandare' ? (
        diete.length === 0 ? (
          <div className="empty">
            <button className="icon-btn icon-btn-pieno plus-grande" onClick={onNuova} aria-label="Nuova dieta">
              <IconPlus width={40} height={40} />
            </button>
            <p>
              Ancora nessuna dieta di lavoro.
              <br />
              Tocca il <strong>+</strong>: dal PDF o dai macro. Poi la mandi a un atleta dalla sua pagina o da quella della dieta.
            </p>
          </div>
        ) : (
          <div className="stack">
            {diete.map((d) => (
              <DietaCard key={d.id} dieta={d} daMandare mandataA={proposte ? aChi(d) : null} />
            ))}
          </div>
        )
      ) : proposte === null ? (
        <div className="empty"><p>Un attimo…</p></div>
      ) : tutte.length === 0 ? (
        <div className="empty">
          <div className="big">📨</div>
          <p>Non hai ancora mandato diete ai tuoi atleti.</p>
        </div>
      ) : aperta ? (
        <>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 4 }} onClick={() => setCartella(null)}>
            <IconBack width={16} height={16} /> Tutti gli atleti
          </button>
          {/* Lo stesso elenco della pagina dell'atleta, col "Ritira". */}
          <DietaPerAtleta atleta={{ id: aperta.atletaId, nome: aperta.nome }} aperto={manda} setAperto={setManda} />
          {(mieiAtleti || []).some((a) => a.id === aperta.atletaId) && (
            <button type="button" className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => setManda(true)}>
              Manda una dieta a {aperta.nome}
            </button>
          )}
        </>
      ) : (
        <>
          {perAtleta.length > 1 && <CercaAtleta valore={cerca} onCambia={setCerca} />}
          {trovati.length === 0 && <NessunAtleta testo={cerca} />}
          <div className="stack" style={{ gap: 8 }}>
            {trovati.map((g) => {
              const n = g.proposte.length
              const inAttesa = g.proposte.filter((p) => p.stato === 'attesa').length
              const salvate = g.proposte.filter((p) => p.stato === 'accettata').length
              return (
                <button key={g.atletaId} type="button" className="menu-voce" onClick={() => setCartella(g.atletaId)}>
                  <Avatar id={g.atletaId} nome={g.nome} taglia="" />
                  <span style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <span className="menu-voce-nome">{g.nome}</span>
                    <span className="menu-voce-desc">
                      {n === 1 ? '1 dieta' : `${n} diete`}
                      {inAttesa > 0 ? ` · ${inAttesa} in attesa` : ''}
                      {salvate > 0 ? ` · ${salvate} salvat${salvate === 1 ? 'a' : 'e'}` : ''}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
