// L'ingresso dell'harness: monta le pagine vere e restituisce l'HTML.
// Lo carica scratchpad/prova-dieta.mjs, che gli sostituisce sotto i piedi gli
// store e il router con dei finti (virtual:finto-store). Vedi lì il perché.
import { renderToStaticMarkup } from 'react-dom/server'
import CalendarPage from '../src/pages/CalendarPage'
import DietaOggiPage from '../src/pages/DietaOggiPage'
import DietaDaMacroPage from '../src/pages/DietaDaMacroPage'
import AggiungiMangiato from '../src/components/AggiungiMangiato'
import { impostaAccount, impostaStore } from 'virtual:finto-store'

export { nuovaDieta, oggiISO } from '../src/lib/dieta'
export { normalizzaGiornoDiario } from '../src/lib/diario'

// Il pannello "cosa hai mangiato" non e una pagina, ma e la superficie nuova
// piu grande: si disegna anche lui, con dei cibi miei finti.
// La home c'e perche' "Allenamento di oggi" e il riquadro della dieta stanno
// li, e sono la prima cosa che si vede aprendo l'app: se una di quelle due si
// rompe non si rompe una pagina in fondo a un menu.
const PAGINE = {
  home: CalendarPage,
  oggi: DietaOggiPage,
  macro: DietaDaMacroPage,
  aggiungi: AggiungiMangiato,
}

export function disegna(quale, store, account, props = {}) {
  impostaStore(store)
  impostaAccount(account)
  const Pagina = PAGINE[quale]
  if (!Pagina) throw new Error(`pagina sconosciuta: ${quale}`)
  return renderToStaticMarkup(<Pagina {...props} />)
}
