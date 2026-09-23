// Il pezzo React dell'harness di "Correggi l'allenamento".
import { renderToStaticMarkup } from 'react-dom/server'
import ModificaAllenamento from '../src/components/ModificaAllenamento'

export function disegna(props) {
  return renderToStaticMarkup(<ModificaAllenamento onSalva={() => {}} {...props} />)
}
