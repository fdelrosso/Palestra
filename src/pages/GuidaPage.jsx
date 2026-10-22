import { goBack, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { isPt } from '../lib/pt'
import { GRUPPI_GUIDE, GUIDE, chiaveGuida } from '../lib/guide'
import { apriTutorial } from '../components/Tutorial'
import { apriGuida } from '../components/GuidaBreve'
import { IconBack, IconCheck, IconChevron, IconPlay, IconaSezione } from '../components/icons'

// ---------------------------------------------------------------------------
// "Guida all'app" (Altro → Guida all'app): tutte le spiegazioni, da rileggere
// quando si vuole.
//
// In cima BENVENUTO: il giro delle cinque sezioni col video di presentazione
// (components/Tutorial). Sotto le MINI-GUIDE (lib/guide), divise per sezione:
// sono quelle che si aprono da sole la prima volta che si entra in una
// funzione. Una già vista ha la spunta. Toccata, si apre qui sopra
// (components/GuidaBreve), senza portare nella pagina che spiega: alcune
// (l'allenamento in corso, il recap) da qui non si raggiungono.
// La guida del lavoro da PT la vede solo un PT.
// ---------------------------------------------------------------------------

// L'icona di ogni gruppo: quella della sua linguetta (il profilo sta in Home).
const ICONA_GRUPPO = { allenamento: 'allenamento', dieta: 'dieta', social: 'social', profilo: 'inizio', altro: 'altro' }

export default function GuidaPage() {
  const { utenteCorrente } = useAccount()
  const { preferenze } = useStore()
  const avvisi = preferenze?.avvisi || {}
  const pt = isPt(utenteCorrente)

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
          <span className="menu-voce-desc">Il giro delle cinque sezioni e il video di presentazione</span>
        </span>
        <IconChevron className="faint" />
      </button>

      {GRUPPI_GUIDE.map((gr) => {
        const guide = GUIDE.filter((g) => g.gruppo === gr.id && (pt || !g.soloPt))
        if (guide.length === 0) return null
        return (
          <section key={gr.id}>
            <h2 className="section-title">{gr.nome}</h2>
            <div className="stack" style={{ gap: 8 }}>
              {guide.map((g) => {
                const vista = avvisi[chiaveGuida(g.id)] === 'vista'
                return (
                  <button key={g.id} className="menu-voce" onClick={() => apriGuida(g.id)}>
                    <span className="menu-voce-icona" aria-hidden="true">
                      <IconaSezione sezione={ICONA_GRUPPO[gr.id]} width={20} height={20} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">{g.titolo}</span>
                      <span className="menu-voce-desc">{g.descrizione}</span>
                    </span>
                    {vista && <IconCheck className="faint" width={18} height={18} aria-label="già vista" />}
                    <IconChevron className="faint" />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
