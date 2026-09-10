import { lazy, Suspense, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, goBack, routes } from '../lib/router'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import { eserciziDiGruppo, normalizzaNome } from '../lib/eserciziLibreria'
import { analizzaStorico } from '../lib/consiglio'
import { IconBack, IconChevron } from '../components/icons'
import CorpoMuscoli from '../components/CorpoMuscoli'
import EsercizioAnimato from '../components/EsercizioAnimato'
import { movimentoDi } from '../lib/animazioniEsercizi'
import { esercizioPetto3D } from '../lib/pettoCatalogo3d'

import { esercizioSchiena3D } from '../lib/schienaCatalogo3d'

const EsercizioSchiena3D = lazy(() => import('../components/EsercizioSchiena3D'))
const EsercizioPetto3D = lazy(() => import('../components/EsercizioPetto3D'))

// Sezione "Esercizi": per ogni gruppo muscolare (il "macro-esercizio") si entra
// e si vedono tutte le varianti possibili dal catalogo (lib/eserciziLibreria).
// Gli esercizi che l'utente gia' usa nelle proprie schede sono evidenziati.
//
// Due aiuti visivi, perche' i nomi da soli dicono poco a chi comincia:
//   - ogni gruppo si presenta con la SAGOMA DEL CORPO che accende il muscolo di
//     cui si parla (components/CorpoMuscoli): "dorsali" non dice niente, la
//     schiena colorata si', e senza doverla tradurre in parole;
//   - ogni esercizio ha un MANICHINO CHE SI MUOVE (components/EsercizioAnimato)
//     che ripete il gesto in loop, in miniatura nella riga e in grande quando
//     la riga si apre, insieme alla riga di tecnica.
export default function EserciziPage({ gruppo }) {
  const { schede } = useStore()
  const [aperto, setAperto] = useState('')

  // Nomi (normalizzati) degli esercizi che l'utente conosce, per gruppo.
  const noti = useMemo(() => {
    const analisi = analizzaStorico(schede)
    const map = {}
    for (const [g, lista] of Object.entries(analisi.eserciziNoti || {})) {
      map[g] = new Set(lista.map((e) => normalizzaNome(e.nome)))
    }
    return map
  }, [schede])

  // ---- Dettaglio di un gruppo -------------------------------------------
  if (gruppo) {
    const gr = gruppoDi(gruppo)
    if (!gr) {
      return (
        <div className="app">
          <div className="topbar">
            <button className="icon-btn" onClick={() => navigate(routes.esercizi())}><IconBack /></button>
            <h1>Esercizi</h1>
          </div>
          <div className="empty">Gruppo non trovato.</div>
        </div>
      )
    }
    const lista = eserciziDiGruppo(gruppo)
    const notiGruppo = noti[gruppo] || new Set()
    const due = gr.dueViste
    const principale = gr.vista
    const altra = principale === 'fronte' ? 'dietro' : 'fronte'
    return (
      <div className="app">
        <div className="topbar" style={{ '--g': gr.colore }}>
          <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="g-dot" style={{ '--g': gr.colore, width: 14, height: 14 }} />
            <h1 style={{ fontSize: 18 }}>{gr.label}</h1>
          </div>
        </div>

        <div className="gruppo-hero" style={{ '--g': gr.colore }}>
          <div className="gruppo-hero-corpi">
            <div className="gruppo-hero-corpo">
              <CorpoMuscoli gruppo={gruppo} vista={principale} altezza={104} />
              <span className="gruppo-hero-vista">{principale === 'fronte' ? 'Davanti' : 'Dietro'}</span>
            </div>
            {due && (
              <div className="gruppo-hero-corpo">
                <CorpoMuscoli gruppo={gruppo} vista={altra} altezza={104} />
                <span className="gruppo-hero-vista">{altra === 'fronte' ? 'Davanti' : 'Dietro'}</span>
              </div>
            )}
          </div>
          <div className="gruppo-hero-testo" style={{ minWidth: 0 }}>
            <h2>{gr.label}</h2>
            <p>
              {lista.length} varianti. Tocca un esercizio per vedere il movimento e come si esegue.
              Quelli che usi gia' nelle tue schede sono segnati.
            </p>
          </div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {lista.map((e) => {
            const usato = notiGruppo.has(normalizzaNome(e.nome))
            const apertaQuesta = aperto === e.id
            const mov = movimentoDi(e.nome, gruppo)
            const vista3d = (gruppo === 'petto' && !!esercizioPetto3D(e.nome)) || (gruppo === 'schiena' && !!esercizioSchiena3D(e.nome))
            return (
              <div key={e.id} className={`ex-lib${apertaQuesta ? ' aperta' : ''}`} style={{ '--g': gr.colore }}>
                <button
                  className="ex-lib-row"
                  onClick={() => setAperto(apertaQuesta ? '' : e.id)}
                  aria-expanded={apertaQuesta}
                >
                  <span className="ex-lib-mini">
                    <EsercizioAnimato nome={e.nome} gruppo={gruppo} altezza={54} mini />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>{e.nome}</span>
                  {vista3d && <span className="panca-3d-badge">3D</span>}
                  {usato && <span className="badge badge-good">Nella tua scheda</span>}
                  <IconChevron className="faint ex-chevron" />
                </button>
                {apertaQuesta && (
                  <div className="ex-dettaglio">
                    {vista3d ? (
                      <Suspense fallback={<p className="muted" role="status">Caricamento vista 3D…</p>}>
                        {gruppo === 'schiena' ? <EsercizioSchiena3D nome={e.nome} /> : <EsercizioPetto3D nome={e.nome} />}
                      </Suspense>
                    ) : (
                      <div className="ex-figura">
                        <EsercizioAnimato nome={e.nome} gruppo={gruppo} altezza={168} />
                      </div>
                    )}
                    {mov && <p className="ex-tecnica">{mov.tecnica}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- Elenco dei gruppi ------------------------------------------------
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro"><IconBack /></button>
        <h1>Esercizi</h1>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        Scegli un gruppo muscolare per vedere tutte le varianti di esercizio.
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {GRUPPI.map((g) => {
          const n = eserciziDiGruppo(g.id).length
          return (
            <button
              key={g.id}
              className="gruppo-card"
              style={{ '--g': g.colore }}
              onClick={() => navigate(routes.eserciziGruppo(g.id))}
            >
              <span className="gruppo-card-corpo">
                <CorpoMuscoli gruppo={g.id} vista={g.vista} altezza={56} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="gruppo-card-nome">{g.label}</span>
                <span className="gruppo-card-sub">{n} esercizi</span>
              </span>
              <IconChevron className="faint" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
