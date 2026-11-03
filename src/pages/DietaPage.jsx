import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { isSoloPt } from '../lib/pt'
import DietaTestata from '../components/DietaTestata'
import DieteDalPt from '../components/DieteDalPt'
import { labelObiettivo, periodoTesto, dietaDaDatiFisici, dietaDiOggi, oggiISO } from '../lib/dieta'
import { datiMancanti, metabolismoBasale } from '../lib/datiFisici'
import { IconArchivio, IconCheck, IconChevron, IconPlus, IconUtente } from '../components/icons'

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

function DietaCard({ dieta, attiva }) {
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
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            {periodoTesto(dieta)}
          </div>
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
  const { diete, preferenze, aggiungiDieta } = useStore()
  const { utenteCorrente } = useAccount()
  const [menu, setMenu] = useState(nuova)
  const [vediFinite, setVediFinite] = useState(false)
  // Un solo PT qui tiene le diete da mandare: niente dieta calcolata dai suoi dati.
  const soloPt = isSoloPt(utenteCorrente)
  const proposta = useMemo(
    () => (diete.length === 0 && !soloPt ? dietaDaDatiFisici(utenteCorrente?.dati, preferenze) : null),
    [diete, utenteCorrente, preferenze, soloPt],
  )
  const mancanti = datiMancanti(utenteCorrente?.dati)

  // L'attiva in cima, poi le altre; quelle col periodo già finito a parte.
  const { attivaId, mie, finite } = useMemo(() => {
    const oggi = oggiISO()
    const attivaId = dietaDiOggi(diete)?.id
    const finita = (d) => d.id !== attivaId && d.dataFine && d.dataFine < oggi
    return {
      attivaId,
      mie: diete.filter((d) => !finita(d)).sort((a, b) => (b.id === attivaId) - (a.id === attivaId)),
      finite: diete.filter(finita),
    }
  }, [diete])

  const creaDaProposta = () => {
    const d = aggiungiDieta(proposta)
    navigate(routes.dietaVista(d.id))
  }

  return (
    <div className="app">
      <DietaTestata attiva="diete" aperto={menu} setAperto={setMenu} />
      <DieteDalPt />

      {diete.length === 0 && soloPt ? (
        <div className="empty">
          <button className="icon-btn icon-btn-pieno plus-grande" onClick={() => setMenu(true)} aria-label="Nuova dieta">
            <IconPlus width={40} height={40} />
          </button>
          <p>
            Ancora nessuna dieta da mandare.
            <br />
            Tocca il <strong>+</strong>: dal PDF o dai macro. Poi la mandi dalla pagina dell’atleta.
          </p>
        </div>
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
                  <DietaCard key={d.id} dieta={d} attiva={d.id === attivaId} />
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
                    <DietaCard key={d.id} dieta={d} />
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
