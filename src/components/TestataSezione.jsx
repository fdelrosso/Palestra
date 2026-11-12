import { navigate } from '../lib/router'
import { IconBack } from './icons'

// ---------------------------------------------------------------------------
// La testata delle pagine-sezione (Allenamento, Dieta, Social, Altro): titolo
// grande, le azioni a destra e, sotto, le linguette fra le parti della
// sezione ("Programmi | Storico", "Oggi | Le mie diete").
//
// ⚠️ Il cambio di linguetta SOSTITUISCE la pagina in cronologia invece di
// aggiungersi: sono due facce della stessa sezione, e il tasto indietro del
// telefono deve uscire dalla sezione, non rimbalzare fra le due.
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   titolo: string,
 *   schede?: {id:string, nome:string, vai:string}[],
 *   attiva?: string,
 *   children?: import('react').ReactNode,
 *   indietro?: () => void,
 * }} props  `children` sono le azioni (icone) a destra del titolo; `indietro`, se c'è,
 *   mette la freccia a sinistra (una sezione aperta da un'altra pagina, non dalla barra)
 */
export default function TestataSezione({ titolo, schede = [], attiva, indietro, children }) {
  return (
    <div className={'topbar topbar-sezione' + (indietro ? ' con-indietro' : '')}>
      <div className="topbar-sezione-riga">
        {indietro && (
          <button className="icon-btn" onClick={indietro} aria-label="Indietro">
            <IconBack />
          </button>
        )}
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
