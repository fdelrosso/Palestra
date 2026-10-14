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

const { conversazioniConScambi, filaChat, scambiCon } = await import('../src/lib/scambi.js')

const io = 'io'
const condivisioni = {
  ricevute: [{ id: 'c1', tipo: 'scheda', titolo: 'Push', daId: 'ale', daNome: 'Ale', aId: io, creataIl: '2026-10-10T10:00:00Z', vistaIl: null }],
  inviate: [{ id: 'c2', tipo: 'allenamento', titolo: 'Gambe', daId: io, aId: 'bea', creataIl: '2026-10-11T10:00:00Z', vistaIl: null }],
}
const effimeri = {
  ricevuti: [{ id: 'e1', tipo: 'foto', daId: 'ale', daNome: 'Ale', aId: io, inviatoIl: '2026-10-09T10:00:00Z' }],
  inviati: [],
}

test('scambiCon: solo quelli con quella persona, dal più vecchio', () => {
  const s = scambiCon(condivisioni, effimeri, 'ale')
  assert.deepEqual(s.map((x) => x.id), ['e1', 'c1'])
  assert.equal(s[1].mio, false)
  assert.deepEqual(scambiCon(condivisioni, effimeri, 'bea').map((x) => x.mio), [true])
})

test('filaChat: messaggi e scambi in ordine di tempo', () => {
  const msg = [{ id: 'm1', creato_il: '2026-10-09T12:00:00Z' }]
  const f = filaChat(msg, scambiCon(condivisioni, effimeri, 'ale'))
  assert.deepEqual(f.map((x) => x.id), ['e1', 'm1', 'c1'])
})

test('conversazioniConScambi: aggiunge chi ha solo mandato, conta i nuovi, aggiorna l’anteprima', () => {
  const conv = [{ altro_id: 'ale', altro_nome: 'Ale', creato_il: '2026-10-09T12:00:00Z', testo: 'ciao', da_me: false, non_letti: 1 }]
  const r = conversazioniConScambi(conv, condivisioni, effimeri, () => 'Bea')
  assert.deepEqual(r.map((x) => x.altro_id), ['bea', 'ale'])
  const ale = r.find((x) => x.altro_id === 'ale')
  assert.equal(ale.non_letti, 3) // 1 messaggio + scheda non vista + foto
  assert.equal(ale.testo, 'Scheda: Push')
  const bea = r.find((x) => x.altro_id === 'bea')
  assert.equal(bea.altro_nome, 'Bea')
  assert.equal(bea.da_me, true)
  assert.equal(conv[0].non_letti, 1) // non tocca l'originale
})

test('conversazioniConScambi: un permanente già aperto non accende il pallino', () => {
  const eff = {
    ricevuti: [
      { id: 'p1', tipo: 'foto', permanente: true, daId: 'ale', daNome: 'Ale', aId: io, inviatoIl: '2026-10-12T10:00:00Z', apertoIl: '2026-10-12T11:00:00Z' },
      { id: 'p2', tipo: 'video', permanente: true, daId: 'ale', daNome: 'Ale', aId: io, inviatoIl: '2026-10-13T10:00:00Z', apertoIl: null },
    ],
    inviati: [],
  }
  const [ale] = conversazioniConScambi([], { ricevute: [], inviate: [] }, eff)
  assert.equal(ale.non_letti, 1)
  assert.equal(ale.testo, '🎬 Video')
})
