import VisoreEsercizio3D from './VisoreEsercizio3D'
import { creaScenaGambe } from '../lib/gambe3d'
import { esercizioGambe3D } from '../lib/gambeCatalogo3d'

export default function EsercizioGambe3D({ nome }) {
  const esercizio = esercizioGambe3D(nome)
  return <VisoreEsercizio3D nome={nome} gruppo="gambe" esercizio={esercizio} creaScena={creaScenaGambe} muscoli={esercizio?.muscoli || 'Gambe'} />
}
