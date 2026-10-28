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

// --- saltato e lasciato perdere (55ª): A B [salto C] D, poi si ricomincia da A
const D = { id: 'd', tipo: 'workout', nome: 'D' }

test('saltato C e fatto D: finché non si ricomincia, C resta da recuperare', () => {
  const s = scheda({
    giorni: [A, B, C, D],
    completamenti: [fatto('a', 1), fatto('b', 2), fatto('d', 4)],
  })
  assert.equal(statoScheda(s).giornoCorrente.id, 'c')
  // Rifare C è il recupero: il giro si chiude e la settimana è completa.
  const recuperato = { ...s, completamenti: [...s.completamenti, fatto('c', 5)] }
  assert.equal(statoScheda(recuperato).settimanaCompletata, true)
})

test('saltato C, fatto D e poi ricominciato da A: C è perso, si va avanti con B, C, D', () => {
  const s = scheda({
    giorni: [A, B, C, D],
    completamenti: [fatto('a', 1), fatto('b', 2), fatto('d', 4), fatto('a', 5)],
  })
  const st = statoScheda(s)
  assert.equal(st.giornoCorrente.id, 'b')
  assert.equal(st.fattiSettimana, 1)
  assert.equal(st.settimanaCompletata, false)
  // Il calendario riparte da A, senza più nessun recupero di C.
  const p = pianoScheda(s, il(6, 9))
  assert.equal(p.daRecuperare, null)
  assert.deepEqual([6, 7, 8].map((g) => cosa(p, g)), ['B', 'C', 'D'])
  assert.doesNotMatch(messaggioOggi(s, st, p) || '', /saltato/)

  // Il giro nuovo finisce solo con D, non appena "tutti i giorni" hanno un fatto.
  const conC = { ...s, completamenti: [...s.completamenti, fatto('b', 6), fatto('c', 7)] }
  assert.equal(statoScheda(conC).giornoCorrente.id, 'd')
  assert.equal(statoScheda(conC).settimanaCompletata, false)
})

test('rifare un giorno senza averne saltati non è un giro nuovo', () => {
  const s = scheda({ giorni: [A, B, C, D], completamenti: [fatto('a', 1), fatto('b', 2), fatto('a', 3)] })
  assert.equal(statoScheda(s).giornoCorrente.id, 'c')
  assert.equal(statoScheda(s).fattiSettimana, 2)
})

test('due giorni a settimana e quattro allenamenti: A B, poi C D la settimana dopo', () => {
  const D = { id: 'd', tipo: 'workout', nome: 'D' }
  // Lunedì e giovedì.
  const p = pianoScheda(scheda({ giorniSettimana: [0, 3], giorni: [A, B, C, D] }), il(5, 8))
  const nomi = [5, 8, 12, 15].map((g) => p.previsto(il(g)).giorno?.nome)
  assert.deepEqual(nomi, ['A', 'B', 'C', 'D'])
  assert.equal(p.previsto(il(6)).tipo, 'rest')
})

// -- due allenamenti lo stesso giorno (Scheda.doppi) --------------------------
const { nomeGiornata } = await import('../src/lib/pianoScheda.js')
const doppio = (p, g) => {
  const x = p.previsto(il(g, 9))
  return !x ? '-' : x.tipo === 'workout' ? nomeGiornata(x) : 'R'
}

test('un giorno ×2 prende due allenamenti di fila', () => {
  const s = scheda({ giorni: [A, B, C, D], giorniSettimana: [0, 2, 4], doppi: [0] })
  const p = pianoScheda(s, il(5, 9)) // lunedì, mai cominciata
  assert.deepEqual([5, 6, 7, 8, 9, 12].map((g) => doppio(p, g)), ['A + B', 'R', 'C', 'R', 'D', 'A + B'])
  assert.equal(messaggioOggi(s, statoScheda(s), p), 'A + B · Sett 1 · Forza')
})

test('fatto solo il primo del doppio: il secondo scivola, non è saltato', () => {
  const s = scheda({ giorni: [A, B, C, D], giorniSettimana: [0, 2, 4], doppi: [0], completamenti: [fatto('a', 5)] })
  const p = pianoScheda(s, il(6, 9))
  assert.equal(p.daRecuperare, null)
  assert.deepEqual([7, 9, 12].map((g) => doppio(p, g)), ['B', 'C', 'D + A'])
})

test('un doppio a fine scheda prende solo quello che resta', () => {
  const s = scheda({ numeroSettimane: 1, giorniSettimana: [0, 2, 4], doppi: [0] })
  const p = pianoScheda(s, il(7, 9)) // mercoledì: A, venerdì B, lunedì solo C
  assert.deepEqual([7, 9, 12, 14].map((g) => doppio(p, g)), ['A', 'B', 'C', '-'])
})

// La storia (storicoProgramma): un saltato resta anche dopo essersi riallenati.
const { storicoProgramma, conPausa, numeroGiorno } = await import('../src/lib/pianoScheda.js')
const stati = (s, oggi) =>
  Object.fromEntries([...storicoProgramma(s, il(oggi, 9))].map(([n, x]) => [new Date(n * 86400000).getUTCDate(), x.stato]))

test('storia: saltato resta, fatto più tardi nella settimana è in ritardo', () => {
  // Lun/Mer/Ven. A lun 5; B mercoledì 7 saltato e fatto giovedì 8; C ven 9 saltato, A lun 12 (settimana 2).
  const s = scheda({
    giorniSettimana: [0, 2, 4],
    completamenti: [fatto('a', 5), fatto('b', 8), { settimana: 2, giornoId: 'a', data: il(12).toISOString() }],
    settimanaCorrente: 2,
  })
  assert.deepEqual(stati(s, 13), { 7: 'ritardo', 9: 'saltato' })
  assert.equal(storicoProgramma(s, il(13, 9)).get(numeroGiorno(il(7))).fattoIl, numeroGiorno(il(8)))
})

test('storia: una pausa non fa saltati e il programma riprende da dove era', () => {
  const s = conPausa(scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] }), il(6), il(10))
  assert.deepEqual(stati(s, 12), { 6: 'pausa', 7: 'pausa', 8: 'pausa', 9: 'pausa', 10: 'pausa' })
  // Lunedì 12 tocca B, quello dopo A.
  assert.equal(cosa(pianoScheda(s, il(12, 9)), 12), 'B')
  assert.equal(numeroGiorno(il(12)) - numeroGiorno(il(5)), 7)
})

test('storia: saltato e mai rifatto nello stesso giro resta saltato, anche se la settimana non si chiude', () => {
  // Lun/Mer/Ven. A lun 5, B mer 7 saltato, C ven 9; poi si ricomincia: A lun 12, B mer 14 (stessa settimana 1).
  const s = scheda({
    giorniSettimana: [0, 2, 4],
    completamenti: [fatto('a', 5), fatto('c', 9), fatto('a', 12), fatto('b', 14)],
  })
  assert.equal(stati(s, 15)[7], 'saltato')
})

test('anticipato: fatto in un giorno di riposo, il giorno in programma resta libero', () => {
  // Lun/Mer/Ven. A lun 5, B anticipato a martedì 6: mercoledì 7 libero, C venerdì 9.
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5), fatto('b', 6)] })
  const p = pianoScheda(s, il(8, 9))
  assert.equal(cosa(p, 9), 'C')
  assert.deepEqual(stati(s, 8), { 7: 'anticipato' })
  // La freccia: da mercoledì 7 (in programma) a martedì 6 (fatto).
  assert.equal(storicoProgramma(s, il(8, 9)).get(numeroGiorno(il(7))).fattoIl, numeroGiorno(il(6)))
  // Recuperare un saltato in un giorno di riposo NON è anticipare.
  const r = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 2), fatto('b', 6)] })
  assert.equal(cosa(pianoScheda(r, il(6, 20)), 7), 'C')
})

test('storia: rifatto la settimana dopo non è in ritardo, è saltato', () => {
  // Lun/Mer/Ven. A lun 5, B mer 7, C ven 9 saltato e fatto lunedì 12 (stesso giro, settimana dopo).
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5), fatto('b', 7), fatto('c', 12)] })
  assert.equal(stati(s, 13)[9], 'saltato')
  // Fatto sabato 10, invece, è in ritardo.
  const t = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5), fatto('b', 7), fatto('c', 10)] })
  assert.equal(stati(t, 13)[9], 'ritardo')
})

test('storia: non ancora fatto ma di questa settimana è recuperabile, poi saltato', () => {
  // Lun/Mer/Ven. A lun 5, B mer 7 non fatto: venerdì 9 si fa ancora in tempo, lunedì 12 no.
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5)] })
  assert.equal(stati(s, 9)[7], 'recuperabile')
  assert.equal(stati(s, 12)[7], 'saltato')
})

test('storia: saltato e poi fatto altro, ma la settimana non è finita: ancora recuperabile', () => {
  // Lun/Mer/Ven. A lun 5, B mer 7 non fatto, C ven 9: sabato B si fa ancora in tempo, lunedì no.
  const s = scheda({ giorniSettimana: [0, 2, 4], completamenti: [fatto('a', 5), fatto('c', 9)] })
  assert.equal(stati(s, 10)[7], 'recuperabile')
  assert.equal(stati(s, 12)[7], 'saltato')
})
