import VisoreEsercizio3D from './VisoreEsercizio3D'
import { creaScenaPetto } from '../lib/petto3d'
import { esercizioPetto3D } from '../lib/pettoCatalogo3d'

export default function EsercizioPetto3D({ nome }) {
  return <VisoreEsercizio3D nome={nome} gruppo="petto" esercizio={esercizioPetto3D(nome)} creaScena={creaScenaPetto} muscoli="Pettorali" />
}
