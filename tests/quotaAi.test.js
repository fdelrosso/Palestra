import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conLaQuota, TROPPE_LETTURE } from '../api/_quotaAi.js'

// Un `res` di Vercel finto: tiene status e corpo.
function finto() {
  const res = { status(s) { res.s = s; return res }, json(c) { res.c = c; return res } }
  return res
}

// `fetch` finto per le due rpc: prenota_ai torna `posto`, chiudi_ai si annota.
function conFetch(posto, chiamate) {
  globalThis.fetch = async (url, op) => {
    const nome = url.split('/rpc/')[1]
    chiamate.push([nome, JSON.parse(op.body)])
    if (posto instanceof Error) return { ok: false, status: 500, text: async () => 'giù' }
    return { ok: true, text: async () => (nome === 'prenota_ai' ? JSON.stringify(posto) : '') }
  }
}

test('lettura riuscita: si legge e il posto si chiude come fatto', async () => {
  const chiamate = []
  conFetch('id-1', chiamate)
  const res = await conLaQuota(finto(), 'tok', 'scheda', async () => [200, { ok: true }])
  assert.equal(res.s, 200)
  assert.deepEqual(chiamate[1], ['chiudi_ai', { p_id: 'id-1', p_fatta: true }])
})

test('lettura fallita: il posto si chiude come annullato', async () => {
  const chiamate = []
  conFetch('id-2', chiamate)
  const res = await conLaQuota(finto(), 'tok', 'dieta', async () => [502, { errore: 'x' }])
  assert.equal(res.s, 502)
  assert.deepEqual(chiamate[1], ['chiudi_ai', { p_id: 'id-2', p_fatta: false }])
})

test('finite per oggi: 429 e Mistral non si chiama', async () => {
  const chiamate = []
  conFetch(null, chiamate)
  let letto = false
  const res = await conLaQuota(finto(), 'tok', 'scheda', async () => ((letto = true), [200, {}]))
  assert.equal(res.s, 429)
  assert.equal(res.c.errore, TROPPE_LETTURE)
  assert.equal(letto, false)
})

test('database giù: niente lettura (meglio un riprova che Mistral aperto a tutti)', async () => {
  const chiamate = []
  conFetch(new Error(), chiamate)
  let letto = false
  const res = await conLaQuota(finto(), 'tok', 'scheda', async () => ((letto = true), [200, {}]))
  assert.equal(res.s, 503)
  assert.equal(letto, false)
})
