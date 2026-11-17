import { test } from 'node:test'
import assert from 'node:assert/strict'
import { oltreIlLimite, TROPPE } from '../api/_limiteGiornaliero.js'

// `fetch` finto per la rpc usa_limite: risponde `esito` (true/false), o un errore.
function conFetch(esito) {
  const chiamate = []
  globalThis.fetch = async (url, op) => {
    chiamate.push([url.split('/rpc/')[1], JSON.parse(op.body)])
    if (esito instanceof Error) return { ok: false, status: 500, text: async () => 'giù' }
    return { ok: true, json: async () => esito }
  }
  return chiamate
}

test('sotto il limite: si va avanti, e si chiede per il tipo giusto', async () => {
  const chiamate = conFetch(true)
  assert.equal(await oltreIlLimite('tok', 'dieta'), null)
  assert.deepEqual(chiamate, [['usa_limite', { p_tipo: 'dieta', p_massimo: 5 }]])
})

test('finite per oggi: 429 col messaggio del tipo', async () => {
  conFetch(false)
  assert.deepEqual(await oltreIlLimite('tok', 'segnalazione'), [429, { errore: TROPPE.segnalazione }])
  assert.deepEqual(await oltreIlLimite('tok', 'scheda'), [429, { errore: TROPPE.scheda }])
})

test('database giù: 503, niente Mistral né SMTP aperti a tutti', async () => {
  conFetch(new Error())
  const [status] = await oltreIlLimite('tok', 'scheda')
  assert.equal(status, 503)
})
