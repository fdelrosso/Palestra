import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, goBack, routes } from '../lib/router'
import { GRUPPI, SOTTOGRUPPI, gruppoDi } from '../lib/muscoli'
import { cercaEsercizi, eserciziDiGruppo, normalizzaNome, slugEsercizio, sottogruppiEsercizio } from '../lib/eserciziLibreria'
import { analizzaStorico } from '../lib/consiglio'
import { IconBack, IconChevron, IconClose, IconSearch } from '../components/icons'
import CorpoMuscoli from '../components/CorpoMuscoli'
import EsercizioAnimato from '../components/EsercizioAnimato'
import { movimentoDi } from '../lib/animazioniEsercizi'
import { descrizioneDi } from '../lib/descrizioniEsercizi'
import { esercizioPetto3D } from '../lib/pettoCatalogo3d'
import { esercizioSchiena3D } from '../lib/schienaCatalogo3d'
import { esercizioGambe3D } from '../lib/gambeCatalogo3d'
import { esercizioSpalle3D } from '../lib/spalleCatalogo3d'

// Le viste 3D per gruppo: il catalogo leggero dice se l'esercizio ne ha una
// (badge "3D" senza caricare niente), la vista vera arriva in `lazy` perche'
// Three.js pesa ~560KB e non deve entrare nel primo avvio.
const VISTE_3D = {
  petto: { ha: esercizioPetto3D, Vista: lazy(() => import('../components/EsercizioPetto3D')) },
  schiena: { ha: esercizioSchiena3D, Vista: lazy(() => import('../components/EsercizioSchiena3D')) },
  gambe: { ha: esercizioGambe3D, Vista: lazy(() => import('../components/EsercizioGambe3D')) },
  spalle: { ha: esercizioSpalle3D, Vista: lazy(() => import('../components/EsercizioSpalle3D')) },
}
// Glutei e polpacci (38a) erano gambe: le loro scene 3D (calf raise, abductor)
// stanno ancora nel catalogo delle gambe.
VISTE_3D.glutei = VISTE_3D.gambe
VISTE_3D.polpacci = VISTE_3D.gambe
// Le scrollate sono schiena (trapezio) dal 2026-10-19, ma la loro scena 3D sta
// nel catalogo delle spalle: per la schiena si guarda anche lì.
const ANCHE_3D = { schiena: [VISTE_3D.spalle] }
const vista3DDi = (gruppo, nome) =>
  [VISTE_3D[gruppo], ...(ANCHE_3D[gruppo] || [])].find((v) => v?.ha(nome)) || null

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
//
// Gambe, spalle e schiena hanno i SOTTOGRUPPI (lib/muscoli): sotto la sagoma
// un chip per ognuno filtra le varianti a quelle che lo lavorano, e la sagoma
// accende solo quel muscolo.
export default function EserciziPage({ gruppo }) {
  const { schede } = useStore()
  // Arrivando dalla ricerca (`?e=<slug>`) l'esercizio cercato e' gia' aperto.
  const [aperto, setAperto] = useState(() => (gruppo && new URLSearchParams(window.location.search).get('e')) || '')
  const [testo, setTesto] = useState('')
  // Il sottogruppo scelto dentro il gruppo ('' = tutti).
  const [sotto, setSotto] = useState('')
  const cercato = useRef(aperto)
  useEffect(() => {
    if (!cercato.current) return
    document.getElementById(`ex-${cercato.current}`)?.scrollIntoView({ block: 'start' })
    cercato.current = ''
  }, [])
  // Solo la libreria: un esercizio scritto a mano non ha una pagina dove andare.
  const risultati = useMemo(() => (testo.trim() ? cercaEsercizi(testo, [], 30) : []), [testo])

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
            <button className="icon-btn" onClick={() => goBack(routes.esercizi())}><IconBack /></button>
            <h1>Esercizi</h1>
          </div>
          <div className="empty">Gruppo non trovato.</div>
        </div>
      )
    }
    const sottogruppi = SOTTOGRUPPI.filter((s) => s.gruppo === gruppo)
    const scelto = sottogruppi.some((s) => s.id === sotto) ? sotto : ''
    const tutti = eserciziDiGruppo(gruppo)
    const lista = scelto ? tutti.filter((e) => sottogruppiEsercizio({ nome: e.nome }).includes(scelto)) : tutti
    const acceso = scelto || gruppo
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
              <CorpoMuscoli gruppo={acceso} vista={principale} altezza={104} />
              <span className="gruppo-hero-vista">{principale === 'fronte' ? 'Davanti' : 'Dietro'}</span>
            </div>
            {due && (
              <div className="gruppo-hero-corpo">
                <CorpoMuscoli gruppo={acceso} vista={altra} altezza={104} />
                <span className="gruppo-hero-vista">{altra === 'fronte' ? 'Davanti' : 'Dietro'}</span>
              </div>
            )}
          </div>
          <div className="gruppo-hero-testo" style={{ minWidth: 0 }}>
            <h2>{scelto ? SOTTOGRUPPI.find((s) => s.id === scelto).label : gr.label}</h2>
            <p>
              {lista.length} varianti. Tocca un esercizio per vedere il movimento e come si esegue.
              Quelli che usi gia' nelle tue schede sono segnati.
            </p>
          </div>
        </div>

        {sottogruppi.length > 0 && (
          <div className="gruppo-chips sottogruppi-chips" role="group" aria-label="Sottogruppo" style={{ '--g': gr.colore }}>
            {[{ id: '', label: 'Tutti' }, ...sottogruppi].map((s) => (
              <button
                key={s.id || 'tutti'}
                type="button"
                className={'gruppo-chip' + (scelto === s.id ? ' on' : '')}
                aria-pressed={scelto === s.id}
                onClick={() => setSotto(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="stack" style={{ gap: 8 }}>
          {lista.map((e) => {
            const usato = notiGruppo.has(normalizzaNome(e.nome))
            const apertaQuesta = aperto === e.id
            const mov = movimentoDi(e.nome, gruppo)
            const Vista3D = vista3DDi(gruppo, e.nome)?.Vista
            const vista3d = !!Vista3D
            return (
              <div key={e.id} id={`ex-${e.id}`} className={`ex-lib${apertaQuesta ? ' aperta' : ''}`} style={{ '--g': gr.colore }}>
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
                        <Vista3D nome={e.nome} />
                      </Suspense>
                    ) : (
                      <div className="ex-figura">
                        <EsercizioAnimato nome={e.nome} gruppo={gruppo} altezza={168} />
                      </div>
                    )}
                    {/* La descrizione dell'ESERCIZIO (lib/descrizioniEsercizi); se
                        manca, la tecnica del movimento che lo anima. */}
                    {(descrizioneDi(e.nome) || mov?.tecnica) && (
                      <p className="ex-tecnica">{descrizioneDi(e.nome) || mov.tecnica}</p>
                    )}
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
      <label className="search-box esercizi-cerca">
        <IconSearch className="faint" />
        <input
          className="search-input"
          type="search"
          enterKeyHint="search"
          placeholder="Cerca un esercizio"
          aria-label="Cerca un esercizio"
          value={testo}
          onChange={(ev) => setTesto(ev.target.value)}
        />
        {testo && (
          <button type="button" className="icon-btn" aria-label="Cancella la ricerca" onClick={() => setTesto('')}>
            <IconClose />
          </button>
        )}
      </label>
      {testo.trim() ? (
        risultati.length ? (
          <div className="esercizi-risultati">
            {risultati.map((r) => {
              const g = gruppoDi(r.gruppo)
              return (
                <button
                  key={r.nome}
                  className="ex-lib-row"
                  style={{ '--g': g?.colore }}
                  onClick={() => navigate(`${routes.eserciziGruppo(r.gruppo)}?e=${slugEsercizio(r.nome)}`)}
                >
                  <span className="ex-lib-mini">
                    <EsercizioAnimato nome={r.nome} gruppo={r.gruppo} altezza={54} mini />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    {r.nome}
                    <span className="esercizi-gruppo-nome"><span className="g-dot" /> {g?.label}</span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="empty">Nessun esercizio trovato.</div>
        )
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
