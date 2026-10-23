import { useState } from 'react'
import { navigate, routes } from '../lib/router'
import TestataSezione from './TestataSezione'
import FoglioScelte from './FoglioScelte'
import { IconLeaf, IconPlus, IconTabella, IconUpload, IconUtente } from './icons'

// ---------------------------------------------------------------------------
// La testata della sezione Dieta: "Oggi | Storico | Le mie diete", "Cosa non mangi" e
// il "+". Come in Allenamento, il "+" è la porta per tutto quello che fa
// nascere una dieta: un foglio con le tre strade.
//
// Lo schema settimanale non è una strada: si aggiunge DOPO, a una dieta che
// c'è già, perché dice quale pasto fare quale giorno e presuppone i pasti.
// ---------------------------------------------------------------------------

const STRADE = [
  {
    id: 'pdf',
    nome: 'Dal PDF del nutrizionista',
    desc: 'Carica il piano: pasti e alternative li leggo io, tu controlli',
    Icona: IconUpload,
    vai: () => navigate(routes.dietaImporta()),
  },
  {
    id: 'macro',
    nome: 'Da calorie e macro',
    desc: 'Scrivi il tuo limite (bastano i macro): i piatti li chiedi pasto per pasto',
    Icona: IconTabella,
    vai: () => navigate(routes.dietaMacro()),
  },
  {
    id: 'calcolo',
    nome: 'Non ho i numeri: calcolali tu',
    desc: 'Dai tuoi dati (peso, altezza, età, movimento) stimo calorie e macro',
    Icona: IconUtente,
    vai: () => navigate(routes.dietaEditor(null)),
  },
]

const SCHEDE_DIETA = [
  { id: 'oggi', nome: 'Oggi', vai: routes.dietaOggi() },
  { id: 'storico', nome: 'Storico', vai: routes.dietaStorico() },
  { id: 'diete', nome: 'Le mie diete', vai: routes.dieta() },
]

// `aperto`/`setAperto` facoltativi: li passa chi ha un altro "+" che apre lo
// stesso foglio (Le mie diete vuota, il "+" grande al centro).
export default function DietaTestata({ attiva, aperto: apertoFuori, setAperto: setApertoFuori }) {
  const [apertoDentro, setApertoDentro] = useState(false)
  const aperto = apertoFuori ?? apertoDentro
  const setAperto = setApertoFuori ?? setApertoDentro

  return (
    <>
      <TestataSezione titolo="Dieta" schede={SCHEDE_DIETA} attiva={attiva}>
        <button
          className="icon-btn"
          onClick={() => navigate(routes.dietaPreferenze())}
          aria-label="Cosa non mangi"
          title="Cosa non mangi"
        >
          <IconLeaf />
        </button>
        <button
          className="icon-btn icon-btn-pieno"
          onClick={() => setAperto(true)}
          aria-label="Nuova dieta"
          aria-expanded={aperto}
        >
          <IconPlus />
        </button>
      </TestataSezione>

      {aperto && (
        <FoglioScelte titolo="Nuova dieta" scelte={STRADE} onChiudi={() => setAperto(false)}>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '12px 2px 0' }}>
            Lo schema della settimana (lunedì legumi, martedì uova…) si aggiunge dopo, dalla dieta:
            «Schema settimanale».
          </p>
        </FoglioScelte>
      )}
    </>
  )
}
