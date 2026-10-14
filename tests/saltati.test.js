import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// I moduli di src/ importano senza estensione: il loader minimo aggiunge `.js`.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) return next(spec + '.js', ctx)
          throw e
        }
      }`),
)

const { saltatiPersi, conScelta } = await import('../src/lib/saltati.js')
const { statoScheda } = await import('../src/lib/progression.js')

const ORA = new Date('2026-10-14T12:00:00Z').getTime()
const giorno = (n) => new Date(ORA - n * 86400000).toISOString()
const g = (id) => ({ id, nome: `Giorno ${id}`, tipo: 'workout', esercizi: [] })
const scheda = (completamenti, extra = {}) => ({
  id: 's',
  giorni: [g('A'), g('B'), g('C'), g('D')],
  settimanaCorrente: 1,
  numeroSettimane: 4,
  completamenti,
  ...extra,
})
const fatto = (giornoId, n, settimana = 1, x = {}) => ({ giornoId, settimana, data: giorno(n), ...x })

test('salto C, faccio D, ricomincio da A: C è perso e si chiede', () => {
  const s = scheda([fatto('A', 6), fatto('B', 5), fatto('D', 3), fatto('A', 1)])
  const p = saltatiPersi(s, ORA)
  assert.deepEqual(p.map((x) => [x.giorno.id, x.settimana, x.stato]), [['C', 1, null]])
})

test('ripetere un giorno senza buchi non perde niente', () => {
  const s = scheda([fatto('A', 3), fatto('B', 2), fatto('A', 1)])
  assert.deepEqual(saltatiPersi(s, ORA), [])
})

test('un buco nel giro in corso non è perso: è ancora il da fare', () => {
  const s = scheda([fatto('A', 3), fatto('B', 2), fatto('D', 1)])
  assert.deepEqual(saltatiPersi(s, ORA), [])
  assert.equal(statoScheda(s).giornoCorrente.id, 'C')
})

test('settimana passata con C saltato: perso; settimana senza niente: nessuno', () => {
  const s = scheda([fatto('A', 9), fatto('B', 8), fatto('D', 6)], { settimanaCorrente: 2 })
  assert.deepEqual(saltatiPersi(s, ORA).map((x) => x.giorno.id), ['C'])
  assert.deepEqual(saltatiPersi(scheda([], { settimanaCorrente: 2 }), ORA), [])
})

test('posticipato resta, tolto sparisce, recuperato sparisce', () => {
  const s = scheda([fatto('A', 6), fatto('B', 5), fatto('D', 3), fatto('A', 1)])
  const [x] = saltatiPersi(s, ORA)
  assert.equal(saltatiPersi(conScelta(s, x.chiave, 'posticipato'), ORA)[0].stato, 'posticipato')
  assert.deepEqual(saltatiPersi(conScelta(s, x.chiave, 'tolto'), ORA), [])
  const recuperato = { ...s, completamenti: [...s.completamenti, fatto('C', 0, 1, { recupera: x.chiave })] }
  assert.deepEqual(saltatiPersi(recuperato, ORA), [])
  // ⚠️ Il recupero non tocca il giro in corso: tocca sempre B.
  assert.equal(statoScheda(recuperato).giornoCorrente.id, 'B')
})

test('un saltato di troppo tempo fa non si ricorda più', () => {
  const s = scheda([fatto('A', 40), fatto('B', 39), fatto('D', 38), fatto('A', 1)])
  assert.deepEqual(saltatiPersi(s, ORA), [])
})
