// Il pezzo React dell'harness del Feed: monta una scheda di recap e torna
// l'HTML. Sta separato dal .mjs perche' il JSX lo deve compilare Vite.
import { renderToStaticMarkup } from 'react-dom/server'
import SchedaRecap from '../src/components/SchedaRecap'

export function disegna(props) {
  return renderToStaticMarkup(<SchedaRecap {...props} />)
}
