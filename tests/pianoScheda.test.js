import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
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

// Il programma della scheda sul calendario (lib/pianoScheda): cosa tocca ogni
// giorno, e cosa si è saltato.
const { pianoScheda, messaggioOggi, schedaInCorso } = await import('../src/lib/pianoScheda.js')
const { statoScheda } = await import('../src/lib/progression.js')

const A = { id: 'a', tipo: 'workout', nome: 'A' }
const B = { id: 'b', tipo: 'workout', nome: 'B' }
const C = { id: 'c', tipo: 'workout', nome: 'C' }
const R = (id) => ({ id, tipo: 'rest', nome: 'Rest' })

// Ottobre 2026: lunedì 5, mercoledì 7, venerdì 9, lunedì 12.
const il = (g, ore = 18) => new Date(2026, 9, g, ore)

function scheda(over = {}) {
  return {
    id: 's1',
    nome: 'Forza',
    numeroSettimane: 4,
    settimanaCorrente: 1,
    giorniSettimana: [],
    giorni: [A, B, C],
    completamenti: [],
    creataIl: il(1).toISOString(),
    ...over,
  }
}
const fatto = (giornoId, g) => ({ settimana: 1, giornoId, data: il(g).toISOString() })
const cosa = (p, g) => {
  const x = p.previsto(il(g, 9))
  if (!x) return '-'
  return (x.tipo === 'rest' ? 'R' : x.tipo === 'esterno' ? x.nome : x.giorno.nome) + (x.saltato ? '!' : '')
}

test('con i giorni della settimana: allenamenti in ordine sui chip, il resto riposo', () => {
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(6, 9))
  assert.deepEqual([6, 7, 8, 9, 10, 11, 12].map((g) => cosa(p, g)), ['R', 'B', 'R', 'C', 'R', 'R', 'A'])
  assert.equal(p.daRecuperare, null)
  assert.match(messaggioOggi(s, statoScheda(s), p), /^Oggi riposo · prossimo: B mercoledì/)
})

test('saltato e oggi riposo: si propone di recuperarlo', () => {
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(8, 9)) // giovedì: mercoledì B non fatto
  assert.equal(cosa(p, 7), 'B!')
  assert.equal(p.daRecuperare.id, 'b')
  assert.equal(
    messaggioOggi(s, statoScheda(s), p),
    'Oggi sarebbe riposo, ma potresti recuperare B che hai saltato',
  )
})

test('saltato e oggi un altro allenamento: si propone di riprendere da quello', () => {
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(9, 9)) // venerdì: in programma C
  assert.equal(p.oggi.giorno.id, 'c')
  assert.equal(messaggioOggi(s, statoScheda(s), p), 'Oggi C, ma potresti riprendere da B che hai saltato')
})

test('fatto il saltato, il programma riparte da lì', () => {
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5), fatto('b', 9)] })
  const p = pianoScheda(s, il(10, 9))
  assert.equal(p.daRecuperare, null)
  assert.equal(cosa(p, 12), 'C')
})

test('senza chip vale la sequenza della scheda, con i suoi Rest', () => {
  const s = scheda({ giorni: [A, R('r1'), B, R('r2'), C, R('r3'), R('r4')], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(6, 9))
  assert.deepEqual([6, 7, 8, 9, 10, 11, 12].map((g) => cosa(p, g)), ['R', 'B', 'R', 'C', 'R', 'R', 'A'])
})

test('mai cominciata: il programma parte oggi e non c’è niente di saltato', () => {
  const s = scheda({ giorniSettimana: [0, 2, 4] })
  const p = pianoScheda(s, il(7, 9)) // creata giovedì 1, oggi mercoledì
  assert.equal(p.daRecuperare, null)
  assert.equal(p.oggi.giorno.id, 'a')
  assert.equal(cosa(p, 5), '-')
})

test('il programma finisce con la scheda', () => {
  const s = scheda({ numeroSettimane: 1, giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(6, 9))
  assert.equal(cosa(p, 9), 'C')
  assert.equal(cosa(p, 10), '-')
  assert.equal(cosa(p, 12), '-')
})

test('la scheda in corso è quella usata per ultima', () => {
  const vecchia = scheda({ id: 'v', completamenti: [fatto('a', 2)] })
  const nuova = scheda({ id: 'n', creataIl: il(4).toISOString() })
  assert.equal(schedaInCorso([vecchia, nuova]).scheda.id, 'n')
  assert.equal(schedaInCorso([{ ...nuova, libera: true }, vecchia]).scheda.id, 'v')
})

// -- le modifiche a mano (Scheda.programma) ----------------------------------
const { conModifica } = await import('../src/lib/pianoScheda.js')

test('un altro allenamento della scheda al posto di quello in programma', () => {
  // Mercoledì C invece di B: B scivola a venerdì, e il C di questo giro è fatto.
  const s = conModifica(scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] }), il(7), { tipo: 'giorno', giornoId: 'c' })
  const p = pianoScheda(s, il(6, 9))
  assert.deepEqual([7, 9, 12, 14].map((g) => cosa(p, g)), ['C', 'B', 'A', 'B'])
  assert.equal(p.previsto(il(7)).modificato.tipo, 'giorno')
})

test('un allenamento fuori dalla scheda: quello in programma scivola', () => {
  const s = conModifica(scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] }), il(7), { tipo: 'altro', nome: 'Calcetto' })
  const p = pianoScheda(s, il(7, 9))
  assert.equal(p.oggi.tipo, 'esterno')
  assert.equal(messaggioOggi(s, statoScheda(s), p), 'Oggi: Calcetto')
  assert.equal(cosa(p, 9), 'B')
})

test('senza chip: un riposo cambiato si consuma, un allenamento scivola', () => {
  const base = scheda({ giorni: [A, R('r1'), B, R('r2'), C], completamenti: [fatto('a', 5)] })
  // martedì 6 era riposo: messo Calcetto, mercoledì resta B
  const p1 = pianoScheda(conModifica(base, il(6), { tipo: 'altro', nome: 'Calcetto' }), il(6, 9))
  assert.deepEqual([6, 7, 8].map((g) => cosa(p1, g)), ['Calcetto', 'B', 'R'])
  // mercoledì 7 era B: messo riposo, B passa a giovedì
  const p2 = pianoScheda(conModifica(base, il(7), { tipo: 'riposo' }), il(6, 9))
  assert.deepEqual([6, 7, 8, 9].map((g) => cosa(p2, g)), ['R', 'R', 'B', 'R'])
})

test('tornare al programma toglie la modifica', () => {
  const s = conModifica(scheda(), il(7), { tipo: 'riposo' })
  assert.deepEqual(Object.keys(conModifica(s, il(7), null).programma), [])
})

test('una scheda archiviata non è più quella in corso né dà i giorni di allenamento', async () => {
  const { giorniAllenamentoSettimanali } = await import('../src/lib/consiglio.js')
  const giorni = [{ id: 'a', tipo: 'workout', esercizi: [] }]
  const base = { giorni, completamenti: [], numeroSettimane: 4, settimanaCorrente: 1, giorniSettimana: [0, 2] }
  const attiva = { ...base, id: 'x', nome: 'X', creataIl: '2026-01-01T00:00:00Z' }
  const archiviata = { ...base, id: 'y', nome: 'Y', creataIl: '2026-02-01T00:00:00Z', archiviata: true, giorniSettimana: [4] }
  assert.equal(schedaInCorso([attiva, archiviata]).scheda.id, 'x')
  assert.equal(schedaInCorso([archiviata]), null)
  assert.deepEqual([...giorniAllenamentoSettimanali([attiva, archiviata])].sort(), [0, 2])
})

test('la scheda attiva: quella scelta, anche se un\'altra è stata usata dopo', async () => {
  const { schedaAttivaOra } = await import('../src/lib/pianoScheda.js')
  const { cosaOggi } = await import('../src/lib/oggi.js')
  const giorni = [{ id: 'a', nome: 'A', tipo: 'workout', esercizi: [] }, { id: 'b', nome: 'B', tipo: 'workout', esercizi: [] }]
  const base = { giorni, numeroSettimane: 4, settimanaCorrente: 1, giorniSettimana: [] }
  const scelta = { ...base, id: 'x', nome: 'X', attiva: true, completamenti: [] }
  const usata = { ...base, id: 'y', nome: 'Y', completamenti: [{ settimana: 1, giornoId: 'a', data: '2026-10-01T10:00:00Z' }] }

  assert.equal(schedaInCorso([scelta, usata]).scheda.id, 'x')
  // L'obiettivo della settimana viene dalla stessa scheda.
  assert.equal(schedaInCorso([scelta, usata]).stato.totaliSettimana, 2)
  // Mai scelta nessuna: vale quella usata per ultima.
  assert.equal(schedaInCorso([{ ...scelta, attiva: false }, usata]).scheda.id, 'y')
  // Scelta e poi archiviata: nessuna, finché non se ne sceglie un'altra.
  assert.equal(schedaAttivaOra([{ ...scelta, archiviata: true }, usata]), null)

  // Attiva ma finita: la Home lo dice invece di proporre altro.
  const finita = {
    ...scelta,
    numeroSettimane: 1,
    completamenti: [{ settimana: 1, giornoId: 'a', data: '2026-10-02T10:00:00Z' }, { settimana: 1, giornoId: 'b', data: '2026-10-03T10:00:00Z' }],
  }
  const o = cosaOggi({ schede: [finita, usata], sessione: null, perGiorno: new Map(), chiaveOggi: '2026-9-9' })
  assert.equal(o.tipo, 'finita')
  assert.equal(o.schedaId, 'x')
})
