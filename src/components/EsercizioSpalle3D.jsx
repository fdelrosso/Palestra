import VisoreEsercizio3D from './VisoreEsercizio3D'
import { creaScenaSpalle } from '../lib/spalle3d'
import { esercizioSpalle3D } from '../lib/spalleCatalogo3d'

export default function EsercizioSpalle3D({ nome }) {
  const esercizio = esercizioSpalle3D(nome)
  return <VisoreEsercizio3D nome={nome} gruppo="spalle" esercizio={esercizio} creaScena={creaScenaSpalle} muscoli={esercizio?.muscoli || 'Deltoidi'} />
}
