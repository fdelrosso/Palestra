import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { readFileSync } from 'node:fs'

// I moduli di src/ importano senza estensione (Vite li risolve, Node no).
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

const memoria = new Map()
globalThis.sessionStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
}

const { inOspite, entraOspite, esciOspite, prendiSchermataDopoOspite, rottaPerOspite, soloLettura } = await import(
  '../src/lib/ospite.js'
)

test('il flag ospite: entra, esce, e "crea" si prende una volta sola', () => {
  assert.equal(inOspite(), false)
  entraOspite()
  assert.equal(inOspite(), true)
  esciOspite('crea')
  assert.equal(inOspite(), false)
  assert.equal(prendiSchermataDopoOspite(), 'crea')
  assert.equal(prendiSchermataDopoOspite(), null)
})

test('rotte: si guarda, non si modifica né si socializza', () => {
  for (const r of ['inizio', 'home', 'scheda', 'calendario', 'recap-mese', 'dieta', 'esercizi', 'feed']) {
    assert.equal(rottaPerOspite(r), true, r)
  }
  for (const r of ['editor', 'importa', 'allenamento', 'chat', 'amici', 'profilo', 'lavoro', 'cerca', 'post']) {
    assert.equal(rottaPerOspite(r), false, r)
  }
})

test('soloLettura: i dati restano, ogni funzione chiede l’account e non fa niente', () => {
  const chiesti = []
  let toccato = false
  const v = soloLettura(
    { schede: [1], getScheda: (id) => id, salva: () => (toccato = true) },
    (cosa) => chiesti.push(cosa),
    ['getScheda'],
  )
  assert.deepEqual(v.schede, [1])
  assert.equal(v.getScheda(7), 7)
  assert.equal(v.salva(), undefined)
  assert.equal(toccato, false)
  assert.deepEqual(chiesti, ['salva'])
})

const { costruisciEsempio } = await import('../src/data/ospite.js')

test('l’esempio: due schede, una attiva, allenamenti nelle ultime settimane, una dieta', () => {
  const oggi = new Date('2026-11-25T10:00:00')
  const e = costruisciEsempio(oggi)
  assert.equal(e.utente.id, null)
  assert.equal(e.utente.ospite, true)
  assert.equal(e.schede.length, 2)
  assert.equal(e.schede.filter((s) => s.attiva).length, 1)
  const fatti = e.schede.flatMap((s) => s.completamenti)
  assert.ok(fatti.length >= 8, `solo ${fatti.length} allenamenti`)
  for (const c of fatti) {
    const giorni = (oggi - new Date(c.data)) / 86400000
    assert.ok(giorni > 0 && giorni < 36, c.data)
    assert.equal(c.daSalvare, undefined)
    assert.ok(c.esercizi.every((es) => es.sets.every((s) => s.colore)))
  }
  assert.equal(e.diete.length, 1)
  assert.ok(e.diete[0].attiva)
})

const { valoreStoreOspite } = await import('../src/lib/ospite.js')

// Le chiavi del valore di StoreProvider, lette dal sorgente (il .jsx in Node
// non si importa). Se qualcuno aggiunge una funzione allo store e non
// all'ospite, questa prova lo dice.
function chiaviStoreVero() {
  const src = readFileSync(new URL('../src/store/StoreContext.jsx', import.meta.url), 'utf8')
  const blocco = src.match(/const value = useMemo\(\n    \(\) => \(\{\n([\s\S]*?)\n    \}\),\n    \[/)[1]
  return [...blocco.matchAll(/^\s+([A-Za-z]+)(?::[^,]*)?,$/gm)].map((m) => m[1]).sort()
}

test('lo store ospite ha le stesse chiavi di quello vero', () => {
  const v = valoreStoreOspite(costruisciEsempio(), () => {})
  assert.deepEqual(Object.keys(v).sort(), chiaviStoreVero())
})

test('lo store ospite: legge l’esempio, ogni scrittura chiede l’account', () => {
  const chiesti = []
  const e = costruisciEsempio()
  const v = valoreStoreOspite(e, (cosa) => chiesti.push(cosa))
  assert.equal(v.getScheda(e.schede[0].id), e.schede[0])
  assert.equal(v.sessione, null)
  v.aggiungiScheda({})
  v.iniziaSessione()
  assert.deepEqual(chiesti, ['aggiungiScheda', 'iniziaSessione'])
  assert.equal(v.schede.length, 2)
})

const { postOspiteDaRiga } = await import('../src/lib/feedOspiteRighe.js')

test('feed ospite: una riga diventa voce, foto e conteggi', () => {
  const dati = costruisciEsempio().schede[0].completamenti[0]
  const p = postOspiteDaRiga({
    id: dati.id,
    user_id: 'u1',
    nome: 'Giulia',
    scheda_id: 's1',
    data: dati.data,
    dati,
    mi_piace: '3',
    commenti: 2,
    foto: [{ id: 'f1', percorso: 'u1/x.jpg', tipo: 'foto', posizione: 0 }],
  })
  assert.equal(p.voce.utenteNome, 'Giulia')
  assert.equal(p.voce.utenteId, 'u1')
  assert.equal(p.interazioni.miPiace, 3)
  assert.equal(p.interazioni.commenti, 2)
  assert.equal(p.foto.length, 1)
})

test('l’esempio ha sempre gli stessi id: un link /scheda/<id> ricaricato lo ritrova', () => {
  const oggi = new Date('2026-11-25T10:00:00')
  const a = costruisciEsempio(oggi)
  const b = costruisciEsempio(oggi)
  assert.deepEqual(a.schede.map((s) => s.id), b.schede.map((s) => s.id))
  assert.deepEqual(a.diete.map((d) => d.id), b.diete.map((d) => d.id))
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(JSON.stringify(a)), 'resta un uuid casuale')
})
