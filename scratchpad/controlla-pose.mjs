// Controllo delle pose degli esercizi (src/lib/animazioniEsercizi.js).
//
// Ogni posa puo' dire dove finisce la mano o la caviglia: se quel punto e' piu'
// lontano della lunghezza dell'arto, la cinematica inversa non ci arriva e
// l'arto resta teso a puntare nel vuoto. A volte e' voluto (braccia distese
// lungo i fianchi: il punto indica solo la direzione), a volte no — ed e' un
// bug che a occhio si nota poco: la mano NON e' sul bilanciere, sulla panca o
// sulla sbarra dove doveva stare.
//
// Si lancia dopo aver toccato le pose:
//     node scratchpad/controlla-pose.mjs
// Segnala solo gli sforamenti oltre 2 unita': sotto e' semplicemente un arto
// teso al massimo, che e' normale.
//
// Il gancio qui sotto serve perche' Node, a differenza di Vite, non risolve gli
// import senza estensione (`from './muscoli'`) usati in tutto il progetto.

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try { return await next(specifier, context) }
        catch (e) {
          if (specifier.startsWith('.') && !specifier.endsWith('.js')) {
            return next(specifier + '.js', context)
          }
          throw e
        }
      }
    `),
  pathToFileURL('./')
)

const { MOVIMENTI } = await import('../src/lib/animazioniEsercizi.js')
const { MISURE, estendi } = await import('../src/lib/figura.js')

const SFORAMENTO = 2
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])
let problemi = 0

for (const m of Object.values(MOVIMENTI)) {
  for (const [etichetta, posa] of [
    ['a', m.a],
    ['b', m.b],
  ]) {
    const spalla = estendi(posa.bacino, MISURE.tronco, posa.tronco)
    const dx = posa.specchio ? MISURE.mezzeSpalle : 0
    const dxA = posa.specchio ? MISURE.mezzeAnche : 0
    const braccio = MISURE.braccio + MISURE.avambraccio
    const gamba = MISURE.coscia + MISURE.tibia
    const prove = [
      ['mano', posa.mano, [spalla[0] + dx, spalla[1]], braccio],
      ['mano2', posa.mano2, [spalla[0] - dx, spalla[1]], braccio],
      ['caviglia', posa.caviglia, [posa.bacino[0] + dxA, posa.bacino[1]], gamba],
      ['caviglia2', posa.caviglia2, [posa.bacino[0] - dxA, posa.bacino[1]], gamba],
    ]
    for (const [nome, meta, base, max] of prove) {
      if (!meta) continue
      const d = dist(base, meta)
      if (d > max + SFORAMENTO) {
        problemi++
        console.log(`${m.id} [${etichetta}] ${nome}: servono ${d.toFixed(1)}, l arto e lungo ${max}`)
      }
    }
  }
}

console.log(
  problemi
    ? `\n${problemi} pose fuori portata: controlla che sia voluto (arto teso) e non un errore.`
    : `\nTutte le pose dei ${Object.keys(MOVIMENTI).length} movimenti sono raggiungibili.`
)
