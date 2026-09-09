import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { labelObiettivo, periodoTesto, dietaAttiva, dietaDaDatiFisici } from '../lib/dieta'
import { datiMancanti, metabolismoBasale } from '../lib/datiFisici'
import { riassuntoPreferenze } from '../lib/preferenzeCibo'
import { IconBack, IconPlus, IconChevron, IconLeaf, IconUpload, IconUtente } from '../components/icons'

// Elenco delle diete del profilo attivo. Ogni dieta ha un obiettivo, un periodo
// di validità e due piani (giorni di allenamento / giorni di riposo). Tap su una
// dieta → editor; "Nuova dieta" → calcolo consigliato.
//
// Chi non ne ha ancora nessuna non trova il vuoto: dai dati del profilo l'app
// calcola già il metabolismo basale e le calorie dell'obiettivo, e le mostra
// con un tasto per trasformarle in una dieta vera. Se i dati mancano lo dice e
// manda a "I miei dati" — non ci sono numeri di ripiego.
export default function DietaPage() {
  const { diete, preferenze, aggiungiDieta } = useStore()
  const { utenteCorrente } = useAccount()
  const proposta = useMemo(
    () => (diete.length === 0 ? dietaDaDatiFisici(utenteCorrente?.dati, preferenze) : null),
    [diete, utenteCorrente, preferenze],
  )
  const mancanti = datiMancanti(utenteCorrente?.dati)

  const creaDaProposta = () => {
    const d = aggiungiDieta(proposta)
    navigate(routes.dietaEditor(d.id))
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Dieta</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        La tua dieta settimanale: cosa mangiare nei giorni di allenamento e in quelli di riposo.
        Puoi farla calcolare dall'app, scrivere i numeri che ti ha dato il nutrizionista o
        importare il suo PDF.
      </p>

      {/* Le due cose che valgono per tutte le diete: da dove arriva il piano e
          cosa non puoi mangiare. */}
      <div className="stack" style={{ gap: 10, marginBottom: 16 }}>
        <button className="menu-voce" onClick={() => navigate(routes.dietaImporta())}>
          <span className="menu-voce-icona" aria-hidden="true">
            <IconUpload width={20} height={20} />
          </span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="menu-voce-nome">Importa da PDF o testo</span>
            <span className="menu-voce-desc">Le giornate tipo del nutrizionista, senza riscriverle</span>
          </span>
          <IconChevron className="faint" />
        </button>
        <button className="menu-voce" onClick={() => navigate(routes.dietaPreferenze())}>
          <span className="menu-voce-icona" aria-hidden="true">
            <IconLeaf width={20} height={20} />
          </span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="menu-voce-nome">Cosa non mangi</span>
            <span className="menu-voce-desc">{riassuntoPreferenze(preferenze)}</span>
          </span>
          <IconChevron className="faint" />
        </button>
      </div>

      {diete.length === 0 ? (
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
              <button className="btn grow" onClick={() => navigate(routes.dietaOggi())}>
                Cosa mangio oggi
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
              Stima indicativa (Mifflin-St Jeor), un punto di partenza da personalizzare — non un
              consiglio medico. Cambia coi tuoi dati finché non la salvi.
            </p>
          </div>
        ) : (
          <div className="empty">
            <div className="big">🍎</div>
            <p>
              Ancora nessuna dieta, e per calcolartela mi manca{' '}
              <strong>{mancanti.join(', ')}</strong>.
            </p>
            <button
              className="btn btn-accent"
              style={{ marginTop: 14 }}
              onClick={() => navigate(routes.datiFisici())}
            >
              <IconUtente width={17} height={17} /> Completa i miei dati
            </button>
          </div>
        )
      ) : (
        <div className="stack" style={{ marginTop: 2 }}>
          {diete.map((d) => {
            const attiva = dietaAttiva(d)
            return (
              <button
                key={d.id}
                className="scheda-card"
                onClick={() => navigate(routes.dietaEditor(d.id))}
              >
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div className="grow" style={{ flex: 1, minWidth: 0 }}>
                    <div className="nome">{d.nome || 'Dieta'}</div>
                    <div className="meta">
                      <span className="badge badge-accent">{labelObiettivo(d.obiettivo)}</span>
                      {attiva && <span className="badge badge-good">Attiva ora</span>}
                      {d.fonte === 'esterna' && <span className="badge">Del nutrizionista</span>}
                      {d.giornate.length > 0 && (
                        <span className="badge">{d.giornate.length} giornate tipo</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                      {periodoTesto(d)}
                    </div>
                  </div>
                  <IconChevron className="faint" />
                </div>

                <div className="dieta-kcal-row">
                  <div className="dieta-kcal">
                    <span className="muted">Allenamento</span>
                    <strong>{d.allenamento.kcal || '—'} kcal</strong>
                  </div>
                  <div className="dieta-kcal">
                    <span className="muted">Riposo</span>
                    <strong>{d.riposo.kcal || '—'} kcal</strong>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button className="fab" onClick={() => navigate(routes.dietaEditor(null))}>
        <IconPlus width={22} height={22} />
        Nuova dieta
      </button>
    </div>
  )
}
