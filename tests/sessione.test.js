import test from 'node:test'
import assert from 'node:assert/strict'
import { sessioneDaTesto } from '../src/lib/sessione.js'

test('la sessione salvata vale solo se e completa', () => {
  const buona = { access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u' } }
  // Scaduta va bene lo stesso: all'avvio serve a sapere chi sei, non ad autorizzare.
  assert.deepEqual(sessioneDaTesto(JSON.stringify(buona)), buona)
  assert.equal(sessioneDaTesto(null), null)
  assert.equal(sessioneDaTesto('non json'), null)
  assert.equal(sessioneDaTesto(JSON.stringify({ ...buona, refresh_token: '' })), null)
  assert.equal(sessioneDaTesto(JSON.stringify({ ...buona, user: {} })), null)
})
