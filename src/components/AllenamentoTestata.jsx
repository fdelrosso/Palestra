import { useState } from 'react'
import { navigate, routes } from '../lib/router'
import TestataSezione from './TestataSezione'
import FoglioScelte from './FoglioScelte'
import {
  IconBolt,
  IconEdit,
  IconLibrary,
  IconPlus,
  IconUpload,
} from './icons'

// ---------------------------------------------------------------------------
// La testata della sezione Allenamento: "Programmi | Storico" e il "+".
//
// Il "+" è la porta per TUTTO quello che fa nascere un allenamento o una
// scheda. Prima queste strade erano sparse in tre posti (il "+" del
// calendario, "Nuova scheda" in fondo alle schede, tre voci del menu
// laterale): chi voleva cominciare doveva sapere da dove.
// ---------------------------------------------------------------------------

const SCELTE = [
  {
    id: 'libero',
    nome: 'Nuovo allenamento',
    desc: 'Scegli gli esercizi, poi avvialo o salvalo per rifarlo. Non è una scheda.',
    Icona: IconEdit,
    vai: () => navigate(routes.nuovoAllenamento()),
  },
  {
    id: 'consigliato',
    nome: 'Allenamento consigliato',
    desc: 'Su misura, in base a cosa hai allenato di recente.',
    Icona: IconBolt,
    vai: () => navigate(routes.consigliato()),
  },
  {
    id: 'nuova',
    nome: 'Nuova scheda',
    desc: 'Un programma a settimane: a mano o importato da foto, PDF, Excel o testo.',
    Icona: IconUpload,
    vai: () => navigate(routes.nuova()),
  },
  {
    id: 'generali',
    nome: 'Schede della community',
    desc: 'Le schede dei tuoi amici e di tutti: cerca e copia.',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
]

const SCHEDE_ALLENAMENTO = [
  { id: 'programmi', nome: 'Programmi', vai: routes.home() },
  { id: 'storico', nome: 'Storico', vai: routes.calendario() },
]

// `aperto`/`setAperto` facoltativi: li passa chi ha un altro "+" che apre lo
// stesso foglio (HomePage vuota, il "+" grande al centro).
export default function AllenamentoTestata({ attiva, aperto: apertoFuori, setAperto: setApertoFuori }) {
  const [apertoDentro, setApertoDentro] = useState(false)
  const aperto = apertoFuori ?? apertoDentro
  const setAperto = setApertoFuori ?? setApertoDentro

  return (
    <>
      <TestataSezione titolo="Allenamento" schede={SCHEDE_ALLENAMENTO} attiva={attiva}>
        <button
          className="icon-btn icon-btn-pieno"
          onClick={() => setAperto(true)}
          aria-label="Nuovo allenamento o scheda"
          aria-expanded={aperto}
        >
          <IconPlus />
        </button>
      </TestataSezione>

      {aperto && <FoglioScelte titolo="Cosa vuoi fare?" scelte={SCELTE} onChiudi={() => setAperto(false)} />}
    </>
  )
}
