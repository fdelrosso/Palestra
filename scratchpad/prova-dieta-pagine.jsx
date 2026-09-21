// L'ingresso dell'harness: monta le pagine vere e restituisce l'HTML.
// Lo carica scratchpad/prova-dieta.mjs, che gli sostituisce sotto i piedi gli
// store e il router con dei finti (virtual:finto-store). Vedi lì il perché.
import { renderToStaticMarkup } from 'react-dom/server'
import DietaOggiPage from '../src/pages/DietaOggiPage'
import DietaDaMacroPage from '../src/pages/DietaDaMacroPage'
import { impostaAccount, impostaStore } from 'virtual:finto-store'

export { nuovaDieta, oggiISO } from '../src/lib/dieta'
export { normalizzaGiornoDiario } from '../src/lib/diario'

const PAGINE = { oggi: DietaOggiPage, macro: DietaDaMacroPage }

export function disegna(quale, store, account) {
  impostaStore(store)
  impostaAccount(account)
  const Pagina = PAGINE[quale]
  if (!Pagina) throw new Error(`pagina sconosciuta: ${quale}`)
  return renderToStaticMarkup(<Pagina />)
}
