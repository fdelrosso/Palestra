import { useState } from 'react'
import { goBack, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { isPt, isSoloPt } from '../lib/pt'
import { GRUPPI_GUIDE, GUIDE, chiaveGuida, guidaPerChi } from '../lib/guide'
import { apriTutorial } from '../components/Tutorial'
import { apriGuida } from '../components/GuidaBreve'
import { IconBack, IconCheck, IconChevron, IconPlay, IconaSezione } from '../components/icons'

// ---------------------------------------------------------------------------
// "Guida all'app" (Altro → Guida all'app): tutte le spiegazioni, da rileggere
// quando si vuole.
//
// In cima BENVENUTO: il giro delle cinque sezioni col video di presentazione
// (components/Tutorial). Sotto le MINI-GUIDE (lib/guide), raccolte per
// argomento — Allenamento, Dieta, Social… —: ogni argomento è una riga con
// quante se ne sono viste (x/y) e, toccato, si apre e mostra le sue. Una già
// vista ha la spunta. Toccata, la guida porta nella pagina che spiega e alla
// fine riporta qui (components/GuidaBreve).
// Ognuno vede (e conta) solo le guide di quello che ha (lib/guide,
// guidaPerChi): quelle del lavoro da PT solo un PT, e a un solo PT spariscono
// Allenamento, Dieta e le cose di chi si allena.
// ---------------------------------------------------------------------------

// L'icona di ogni argomento: quella della sua linguetta (il profilo sta in Home).
const ICONA_GRUPPO = { allenamento: 'allenamento', dieta: 'dieta', social: 'social', profilo: 'inizio', altro: 'altro' }

// L'argomento aperto resta aperto quando si torna da una guida (che porta in
// un'altra pagina, e al ritorno questa rinasce). Vale finché l'app è aperta.
let apertoPrima = null

export default function GuidaPage() {
  const { utenteCorrente } = useAccount()
  const { preferenze } = useStore()
  const avvisi = preferenze?.avvisi || {}
  const pt = isPt(utenteCorrente)
  // Un solo PT vede solo le guide di quello che ha (lib/guide, guidaPerChi).
  const soloPt = isSoloPt(utenteCorrente)
  const [aperto, setAperto] = useState(apertoPrima)
  const apri = (id) => {
    apertoPrima = aperto === id ? null : id
    setAperto(apertoPrima)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack(routes.altro())} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Guida all’app</h1>
      </div>

      <button className="menu-voce guida-benvenuto" onClick={apriTutorial}>
        <span className="menu-voce-icona" aria-hidden="true">
          <IconPlay width={20} height={20} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="menu-voce-nome">Benvenuto</span>
          <span className="menu-voce-desc">
            Il giro delle {soloPt ? 'quattro' : 'cinque'} sezioni e il video di presentazione
          </span>
        </span>
        <IconChevron className="faint" />
      </button>

      <h2 className="section-title">Come si usa</h2>
      <div className="stack" style={{ gap: 8 }}>
        {GRUPPI_GUIDE.map((gr) => {
          const guide = GUIDE.filter((g) => g.gruppo === gr.id && guidaPerChi(g, { pt, soloPt }))
          if (guide.length === 0) return null
          const viste = guide.filter((g) => avvisi[chiaveGuida(g.id)] === 'vista').length
          const qui = aperto === gr.id
          return (
            <section key={gr.id} className={'guida-gruppo' + (qui ? ' aperto' : '')}>
              <button
                className="menu-voce guida-gruppo-testa"
                onClick={() => apri(gr.id)}
                aria-expanded={qui}
              >
                <span className="menu-voce-icona" aria-hidden="true">
                  <IconaSezione sezione={ICONA_GRUPPO[gr.id]} width={20} height={20} />
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="menu-voce-nome">{gr.nome}</span>
                  <span className="menu-voce-desc">
                    {guide.length === 1 ? '1 guida' : `${guide.length} guide`}
                  </span>
                </span>
                <span
                  className={'guida-conta' + (viste === guide.length ? ' tutte' : '')}
                  aria-label={`${viste} viste su ${guide.length}`}
                >
                  {viste}/{guide.length}
                </span>
                <IconChevron className="faint guida-freccia" />
              </button>
              {qui && (
                <div className="guida-elenco">
                  {guide.map((g) => {
                    const vista = avvisi[chiaveGuida(g.id)] === 'vista'
                    return (
                      <button key={g.id} className="guida-voce" onClick={() => apriGuida(g.id)}>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="menu-voce-nome">{g.titolo}</span>
                          <span className="menu-voce-desc">{g.descrizione}</span>
                        </span>
                        {vista && <IconCheck className="guida-vista" width={18} height={18} aria-label="già vista" />}
                        <IconChevron className="faint" />
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
