import { navigate, routes } from '../lib/router'

// ---------------------------------------------------------------------------
// La testata delle pagine-sezione (Allenamento, Dieta, Social, Altro): titolo
// grande, le azioni a destra e, sotto, le linguette fra le parti della
// sezione ("Programmi | Storico", "Oggi | Le mie diete").
//
// ⚠️ Il cambio di linguetta SOSTITUISCE la pagina in cronologia invece di
// aggiungersi: sono due facce della stessa sezione, e il tasto indietro del
// telefono deve uscire dalla sezione, non rimbalzare fra le due.
// ---------------------------------------------------------------------------

// Le due facce della sezione Dieta (vedi DietaTestata, in fondo).
const SCHEDE_DIETA = [
  { id: 'oggi', nome: 'Oggi', vai: routes.dietaOggi() },
  { id: 'diete', nome: 'Le mie diete', vai: routes.dieta() },
]

/**
 * @param {{
 *   titolo: string,
 *   schede?: {id:string, nome:string, vai:string}[],
 *   attiva?: string,
 *   children?: import('react').ReactNode,
 * }} props  `children` sono le azioni (icone) a destra del titolo
 */
export default function TestataSezione({ titolo, schede = [], attiva, children }) {
  return (
    <div className="topbar topbar-sezione">
      <div className="topbar-sezione-riga">
        <h1>{titolo}</h1>
        {children}
      </div>
      {schede.length > 0 && (
        <div className="segmented" role="tablist" aria-label={titolo}>
          {schede.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === attiva}
              className={'seg-btn' + (s.id === attiva ? ' on' : '')}
              onClick={() => s.id !== attiva && navigate(s.vai, { sostituisci: true })}
            >
              {s.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** La testata della sezione Dieta: "Oggi | Le mie diete". */
export function DietaTestata({ attiva }) {
  return <TestataSezione titolo="Dieta" schede={SCHEDE_DIETA} attiva={attiva} />
}
