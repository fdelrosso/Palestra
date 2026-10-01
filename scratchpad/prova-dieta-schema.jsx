// ---------------------------------------------------------------------------
// La DIETA con lo SCHEMA SETTIMANALE, con le dita, in un browser vero.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-dieta-schema.html
//
// Monta le pagine VERE della dieta (elenco, nuova, import, editor, schema,
// dieta giornaliera col dettaglio del pasto) col router vero, sopra lo store
// finto (scratchpad/finto-store-vivo.js) con una dieta "del nutrizionista"
// già dentro: i cinque pasti con le loro alternative e uno schema che dice
// cosa fare a pranzo e a cena ogni giorno. Le prove da fare:
//   - in "Dieta giornaliera" pranzo e cena sono quelli dello schema di oggi;
//   - toccando "N alternative" si entra nel pasto: prima quelle dello schema,
//     in fondo "Fuori schema"; "Scegli questa" torna indietro con la scelta;
//   - "L'ho mangiata" finisce nel diario e il pasto risulta mangiato;
//   - dall'editor, "Modifica lo schema" apre la griglia della settimana.
//   - in "Calorie e macro", "Cambia" (cosa non mangi) e poi "Torna a calorie e
//     macro": i numeri scritti ci sono ancora, e i pasti proposti si rifanno.
//
// ⚠️ Il testo del piano è d'esempio (stessa forma del PDF di una dietista,
// nessun dato vero): il PDF vero si prova in Node, perché qui un file non lo
// si può scegliere per conto del browser.
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRoute } from '../src/lib/router.js'
import { FONTE, conPastiBase, normalizzaDieta, nuovaDieta } from '../src/lib/dieta.js'
import { parseDietaTesto } from '../src/lib/parserDieta.js'
import { impostaFinto } from './finto-store-vivo.js'
import DietaPage from '../src/pages/DietaPage.jsx'
import DietaNuovaPage from '../src/pages/DietaNuovaPage.jsx'
import DietaImportPage from '../src/pages/DietaImportPage.jsx'
import DietaDaMacroPage from '../src/pages/DietaDaMacroPage.jsx'
import DietaEditorPage from '../src/pages/DietaEditorPage.jsx'
import DietaSchemaPage from '../src/pages/DietaSchemaPage.jsx'
import DietaOggiPage from '../src/pages/DietaOggiPage.jsx'
import PreferenzeCiboPage from '../src/pages/PreferenzeCiboPage.jsx'
import '../src/index.css'

const PIANO = `Colazione
• Una tazza media di latte proteico (circa 200ml) e caffè
• 30g di cereali da colazione
In alternativa, cercando di variare, è possibile consumare:
• Una tazza di latte proteico e caffè + 2 fette biscottate con marmellata
• Un budino proteico + 1-2 biscotti frollini a scelta
• Porridge con 4 cucchiai di avena e un bicchiere di latte proteico con caffè
Spuntino
• Una porzione di frutta fresca (1 frutto medio-grande o 2 piccoli)
Pranzo
• 100g di pasta/riso/farro/cous cous
oppure 120g di pane
• Una porzione di secondo piatto
• Una porzione di verdura cotta o cruda
• 1 cucchiaio di olio
Esempi:
• Tagliata di pollo con peperoni + riso
• Riso basmati con uova strapazzate e broccoli
• Riso con piselli e funghi
• Bistecca di manzo con insalata e pomodori + pane
• Pasta con Philadelphia e crema di zucchine
Merenda
• 2 fette di pane in cassetta con:
3 fette di fesa di tacchino
oppure 100g di formaggio spalmabile proteico
• Una banana
In alternativa, è possibile consumare:
• Un vasetto di yogurt greco 0% + 30g di cereali + una banana
• Uno shaker con 20g di proteine in polvere + 50g di pane con marmellata
Cena
• 100g di pasta/riso oppure 120g di pane oppure 400g di patate
• Una porzione di secondo piatto
• Una porzione di verdura cotta o cruda
• 1 cucchiaio di olio
Esempi:
• Insalata mista con fagioli/ceci + pane
• Frittata con uova e albumi + verdure miste + pane
• Straccetti di pollo al limone con rucola + pane
• Hamburger di tacchino e verdure + pane
Sono previsti 20g di olio extravergine d’oliva al giorno, corrispondenti a 2 cucchiai da utilizzare preferibilmente a crudo.
N.B. Il peso degli alimenti è a crudo e al netto degli scarti.`

const porzione = {
  legumi: '1 porzione di legumi (220-250g cotti o 70-80g secchi)',
  uova: '1 porzione di uova (3 uova o 2 uova e 150ml di albume)',
  'carne-bianca': '1 porzione di carne bianca (180-200g)',
  'carne-rossa': '1 porzione di carne rossa (120-150g)',
  formaggio: '1 porzione di formaggio (100-150g fresco)',
}
const casella = (giorno, pasto, categoria, esempi = []) => ({
  giorno,
  pasto,
  categoria,
  testo:
    categoria === 'libero'
      ? 'PASTO FUORI O PIÙ ELABORATO A SCELTA'
      : `${porzione[categoria]}\nPasta, riso, cous cous (circa 100g) oppure 120g di pane\nUna porzione di verdura`,
  esempi,
})
const SCHEMA = [
  casella(0, 'pranzo', 'legumi', ['Pasta con crema di piselli e zucchine', 'Riso/cous cous con ceci e broccoli']),
  casella(0, 'cena', 'carne-bianca', ['Riso bianco con pollo al curry, carote e zucchine']),
  casella(1, 'pranzo', 'uova', ['Pane con frittata con zucchine', 'Pasta con uova sode e peperoni']),
  casella(1, 'cena', 'legumi', ['Pasta e ceci/fagioli + verdure']),
  casella(2, 'pranzo', 'carne-bianca', ['Hamburger di tacchino e verdure + pane', 'Riso basmati con petto di pollo e zucchine']),
  casella(2, 'cena', 'uova', ['Uova al pomodoro e melanzane + pane']),
  casella(3, 'pranzo', 'formaggio', ['Pasta con mozzarella e pomodori']),
  casella(3, 'cena', 'carne-bianca', ['Petto di pollo al forno con verdure e patate']),
  casella(4, 'pranzo', 'legumi', ['Riso con ceci al pomodoro e melanzane']),
  casella(4, 'cena', 'carne-bianca', ['Polpette di tacchino con verdure e patate al forno']),
  casella(5, 'pranzo', 'uova', ['Uova strapazzate con verdure + pane']),
  casella(5, 'cena', 'libero'),
  casella(6, 'pranzo', 'carne-rossa', ['Riso con straccetti di manzo, porri e carote']),
  casella(6, 'cena', 'libero'),
]

const { giornate, note } = parseDietaTesto(PIANO)
const pasti = conPastiBase(giornate[0].pasti)
// Solo i macro: le calorie le conta normalizzaDieta (4/4/9), come nell'app.
const piano = { kcal: 0, proteine: 140, carbo: 260, grassi: 65, pasti }
impostaFinto({
  diete: [
    normalizzaDieta(
      nuovaDieta({
        id: 'd1',
        nome: 'Dieta della dietista',
        fonte: FONTE.ESTERNA,
        fonteNota: 'Importata da PDF o testo',
        allenamento: piano,
        riposo: piano,
        schema: SCHEMA,
        note,
      }),
    ),
  ],
})

function Pagina() {
  const route = useRoute()
  switch (route.name) {
    case 'dieta-crea':
      return <DietaNuovaPage />
    case 'dieta-importa':
      return <DietaImportPage />
    case 'dieta-preferenze':
      return <PreferenzeCiboPage />
    case 'dieta-macro':
      return <DietaDaMacroPage />
    case 'dieta-editor':
      return <DietaEditorPage id={route.id} />
    case 'dieta-schema':
      return <DietaSchemaPage id={route.id} />
    case 'dieta-oggi':
      return <DietaOggiPage pastoId={route.pasto} />
    default:
      return <DietaPage />
  }
}

export function Prova() {
  return (
    <StrictMode>
      <Pagina />
    </StrictMode>
  )
}

// Si parte dalla dieta giornaliera. ⚠️ Da qui in poi la barra dice /dieta/…:
// ricaricando si finirebbe nell'app vera, per ripartire si riapre il banco.
if (!window.location.pathname.startsWith('/dieta')) window.history.replaceState(window.history.state, '', '/dieta/oggi')
// ⚠️ La radice si crea UNA volta sola: Vite ri-esegue questo file a ogni
// salvataggio, e un createRoot() in più sullo stesso nodo riempie la console
// di errori di React che non c'entrano niente con quello che si sta provando.
const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(<Prova />)
