import { navigate, routes } from '../lib/router'
import TestataSezione from '../components/TestataSezione'
import { IconChevron, IconClipboard, IconGrid, IconLibrary } from '../components/icons'

// ---------------------------------------------------------------------------
// "Altro": la quinta linguetta. Raccoglie quello che non ha una sezione sua,
// così nessuna funzione resta senza una porta dopo che il menu laterale è
// sparito. Oggi sono le LIBRERIE: gli esercizi e le raccolte di schede (che si
// raggiungono anche dal "+" di Allenamento, quando si vuole cominciare).
// Una funzione nuova senza casa si aggiunge in VOCI.
// ---------------------------------------------------------------------------

const VOCI = [
  {
    id: 'esercizi',
    nome: 'Esercizi',
    descrizione: 'Tutte le varianti di esercizio per gruppo muscolare, in 3D',
    Icona: IconGrid,
    vai: () => navigate(routes.esercizi()),
  },
  {
    id: 'schede-prefatte',
    nome: 'Schede prefatte',
    descrizione: 'Programmi già pronti per obiettivo, giorni e durata',
    Icona: IconClipboard,
    vai: () => navigate(routes.schedePrefatte()),
  },
  {
    id: 'schede-generali',
    nome: 'Schede generali',
    descrizione: 'Le schede di tutti gli utenti: cerca per esercizio e filtra',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
]

export default function AltroPage() {
  return (
    <div className="app">
      <TestataSezione titolo="Altro" />
      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        {VOCI.map((v) => (
          <button key={v.id} className="menu-voce" onClick={v.vai}>
            <span className="menu-voce-icona" aria-hidden="true">
              <v.Icona width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">{v.nome}</span>
              <span className="menu-voce-desc">{v.descrizione}</span>
            </span>
            <IconChevron className="faint" />
          </button>
        ))}
      </div>
    </div>
  )
}
