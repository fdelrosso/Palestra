import VisoreEsercizio3D from './VisoreEsercizio3D'
import { creaScenaSchiena } from '../lib/schiena3d'
import { esercizioSchiena3D } from '../lib/schienaCatalogo3d'

export default function EsercizioSchiena3D({ nome }) {
  const esercizio = esercizioSchiena3D(nome)
  return <VisoreEsercizio3D nome={nome} gruppo="schiena" esercizio={esercizio} creaScena={creaScenaSchiena} muscoli={esercizio?.muscoli || 'Dorsali e dorso'} />
}
