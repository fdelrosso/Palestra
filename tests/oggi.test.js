import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione.
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
const { chiaveDiOggi, cosaOggi, raccogliCompletamenti, settimanaDi } = await import('../src/lib/oggi.js')
const { nuovaScheda, nuovoGiorno } = await import('../src/data/model.js')

// Mercoledì 7 ottobre 2026, a mezzogiorno.
const MER = new Date(2026, 9, 7, 12)
const giorno = (id, nome) => nuovoGiorno({ id, nome, esercizi: [] })
const scheda = (completamenti = []) =>
  nuovaScheda({ id: 's1', nome: 'Massa', giorni: [giorno('a', 'Petto'), giorno('b', 'Gambe')], completamenti })
const chiedi = (schede, sessione = null, ora = MER) =>
  cosaOggi({ schede, sessione, perGiorno: raccogliCompletamenti(schede), chiaveOggi: chiaveDiOggi(ora) })

test('una sessione aperta vince su tutto', () => {
  const o = chiedi([scheda()], { nomeGiorno: 'Petto' })
  assert.equal(o.tipo, 'sessione')
  assert.equal(o.titolo, 'Petto')
})

test('fatto oggi viene PRIMA della scheda in corso', () => {
  const s = scheda([{ data: MER.toISOString(), giornoId: 'a', settimana: 1 }])
  const o = chiedi([s])
  assert.equal(o.tipo, 'fatto')
  assert.equal(o.titolo, 'Petto')
})

test('con una scheda in corso: il suo prossimo giorno', () => {
  const s = scheda([{ data: new Date(2026, 9, 5, 18).toISOString(), giornoId: 'a', settimana: 1 }])
  const o = chiedi([s])
  assert.deepEqual([o.tipo, o.titolo, o.schedaId], ['scheda', 'Gambe', 's1'])
})

test('senza schede: il consigliato', () => {
  assert.equal(chiedi([]).tipo, 'consigliato')
})

test('la settimana parte da lunedì e conta gli allenamenti per giorno', () => {
  const s = scheda([
    { data: new Date(2026, 9, 5, 18).toISOString(), giornoId: 'a', settimana: 1 }, // lunedì
    { data: new Date(2026, 9, 4, 18).toISOString(), giornoId: 'b', settimana: 1 }, // domenica prima: fuori
  ])
  const sett = settimanaDi(raccogliCompletamenti([s]), MER)
  assert.equal(sett.length, 7)
  assert.deepEqual(sett.map((g) => g.fatti), [1, 0, 0, 0, 0, 0, 0])
  assert.equal(sett.findIndex((g) => g.oggi), 2)
})

test('scheda mai cominciata: parte oggi, e si va dritti al primo giorno', () => {
  const o = chiedi([scheda()])
  assert.deepEqual([o.tipo, o.titolo, o.giornoId, o.riposo], ['scheda', 'Petto', 'a', false])
})
