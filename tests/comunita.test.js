import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come feedServer.test.js: un loader aggiunge `.js` e sostituisce
// `src/lib/supabase.js` (legge `import.meta.env`) con un finto client.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = {}
        export function erroreDiRete() { return false }
        export function messaggioErrore(e) { return String(e?.message || e) }
      \`)
      export async function resolve(spec, ctx, next) {
        let esito
        try { esito = await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) esito = await next(spec + '.js', ctx)
          else throw e
        }
        if (esito.url.endsWith('/lib/supabase.js')) {
          return { url: STUB, format: 'module', shortCircuit: true }
        }
        return esito
      }`),
)

const { popolaritaEsercizi, influenzaPt } = await import('../src/lib/comunita.js')

const riga = (r) => ({
  fonte: 'comunita', gruppo: '', gruppi: null, da_scheda: false,
  pianificati: 0, svolti: 0, utenti: 0, pianificati_senza: 0, svolti_senza: 0, utenti_tutti: 0, ...r,
})

test('popolaritaEsercizi: unisce i nomi scritti diversi e conta i senza gruppo solo se si ricava', () => {
  const conteggi = {
    righe: [
      riga({ nome: 'Panca piana', gruppo: 'petto', svolti: 2, utenti: 1, svolti_senza: 1, utenti_tutti: 2 }),
      riga({ nome: 'Pànca piana', gruppo: 'petto', pianificati: 1, utenti: 1, utenti_tutti: 1 }),
      riga({ nome: 'Boh qualcosa', svolti_senza: 5, utenti_tutti: 3 }),
      riga({ fonte: 'pt', nome: 'Squat', gruppo: 'gambe', svolti: 9, utenti: 1, utenti_tutti: 1 }),
    ],
  }
  const { perGruppo, vuota } = popolaritaEsercizi({ conteggi })
  assert.equal(vuota, false)
  const panca = perGruppo.petto[0]
  // "Panca piana" si ricava dal nome: anche la riga senza gruppo conta.
  assert.deepEqual([panca.svolti, panca.pianificati, panca.utenti], [3, 1, 3])
  assert.equal(Object.values(perGruppo).flat().some((x) => x.nome === 'Boh qualcosa'), false)
  assert.equal(perGruppo.gambe, undefined) // il segnale 'pt' non entra qui
})

test('influenzaPt: col mio PT conta le sue righe e il suo stile, senza PT i PT pesati', () => {
  const schema = { fasi: [{ serie: 4, rip: 8 }], recuperoSec: 90 }
  const conteggi = {
    righe: [
      riga({ fonte: 'mio_pt', nome: 'Squat', gruppo: 'gambe', pianificati: 2, utenti: 2, utenti_tutti: 2 }),
      riga({ fonte: 'pt', nome: 'Stacco', gruppo: 'gambe', svolti: 0.5, utenti: 1, utenti_tutti: 1 }),
    ],
    stile: [{ schema, n: 3 }],
    famaMioPt: 4,
  }
  const mio = influenzaPt({ conteggi, mioPt: { id: 'pt1', nome: 'Gio' } })
  assert.equal(mio.tuo, true)
  assert.equal(mio.nAtleti, 4)
  assert.deepEqual(mio.perGruppo.gambe.map((x) => x.nome), ['Squat'])
  assert.equal(mio.campioniStile.serie.length, 3)
  const altri = influenzaPt({ conteggi })
  assert.deepEqual(altri.perGruppo.gambe.map((x) => [x.nome, x.punteggio]), [['Stacco', 1.5]])
  assert.equal(influenzaPt({ conteggi: { righe: [] } }).vuota, true)
})
