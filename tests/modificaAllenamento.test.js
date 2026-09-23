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

const { DURATA_MAX_MIN, durataSospetta, patchDaValori, valoriIniziali } = await import(
  '../src/lib/modificaAllenamento.js'
)

// Tutto in orario LOCALE, come il calendario: le date si costruiscono con
// new Date(a, m, g, h, min) e non con stringhe ISO, se no la prova dipende dal
// fuso orario della macchina che la lancia.
const locale = (a, m, g, h, min) => new Date(a, m - 1, g, h, min, 0, 0)
const ADESSO = locale(2026, 9, 24, 12, 0)

// ------------------------------------------------------------ il caso vero
test('il caso da cui nasce: «Termina» premuto il giorno dopo', () => {
  // Allenamento di ieri sera, chiuso stamattina alle 11: risulta di 16 ore e
  // fatto oggi.
  const c = { data: locale(2026, 9, 24, 11, 0).toISOString(), durataSec: 16 * 3600 }
  assert.equal(durataSospetta(c), true, 'le 16 ore vanno segnalate da sole')

  const esito = patchDaValori(
    c,
    { giorno: '2026-09-23', ora: '19:30', ore: '1', minuti: '10', nota: '' },
    { adesso: ADESSO },
  )
  assert.equal(esito.ok, true)
  assert.equal(esito.cambiaData, true)
  assert.equal(esito.patch.durataSec, 70 * 60)
  const d = new Date(esito.patch.data)
  assert.equal(d.getDate(), 23, 'deve finire nel giorno giusto del calendario')
  assert.equal(d.getHours(), 19)
  assert.equal(d.getMinutes(), 30)
})

test('un allenamento normale non viene segnalato', () => {
  assert.equal(durataSospetta({ durataSec: 75 * 60 }), false)
  assert.equal(durataSospetta({}), false)
})

// ----------------------------------------------------- la trappola della data
test('se giorno e ora non cambiano, la data NON si riscrive', () => {
  // ⚠️ La data è l'identità dell'allenamento e la chiave delle sue foto. Il
  // modulo lavora al minuto: riscriverla perderebbe secondi e millesimi
  // dell'originale, e staccherebbe le foto da un allenamento mai spostato.
  const c = { data: locale(2026, 9, 23, 19, 30).toISOString(), durataSec: 3600 }
  const conSecondi = { ...c, data: new Date(new Date(c.data).getTime() + 27_431).toISOString() }
  const v = valoriIniziali(conSecondi)
  const esito = patchDaValori(conSecondi, { ...v, ore: '1', minuti: '5' }, { adesso: ADESSO })
  assert.equal(esito.ok, true)
  assert.equal(esito.cambiaData, false)
  assert.equal('data' in esito.patch, false)
  assert.equal(esito.patch.durataSec, 65 * 60)
})

test('i valori iniziali rispecchiano l’allenamento', () => {
  const c = { data: locale(2026, 3, 5, 8, 7).toISOString(), durataSec: 95 * 60, nota: 'gambe' }
  assert.deepEqual(valoriIniziali(c), {
    giorno: '2026-03-05',
    ora: '08:07',
    ore: '1',
    minuti: '35',
    nota: 'gambe',
  })
})

// ------------------------------------------------------------- i rifiuti
const BASE = { data: locale(2026, 9, 23, 19, 30).toISOString(), durataSec: 3600 }
const V = { giorno: '2026-09-23', ora: '19:30', ore: '1', minuti: '0', nota: '' }

test('non si finisce nel futuro', () => {
  const r = patchDaValori(BASE, { ...V, giorno: '2026-09-25' }, { adesso: ADESSO })
  assert.equal(r.ok, false)
})

test('un giorno che non esiste non scivola nel mese dopo', () => {
  // new Date(2026, 1, 31) sarebbe il 3 marzo, senza dire niente.
  const r = patchDaValori(BASE, { ...V, giorno: '2026-02-31' }, { adesso: ADESSO })
  assert.equal(r.ok, false)
})

test('durata: almeno un minuto, al massimo il limite', () => {
  assert.equal(patchDaValori(BASE, { ...V, ore: '0', minuti: '0' }, { adesso: ADESSO }).ok, false)
  const troppo = String(DURATA_MAX_MIN / 60 + 1)
  assert.equal(patchDaValori(BASE, { ...V, ore: troppo, minuti: '0' }, { adesso: ADESSO }).ok, false)
  assert.equal(patchDaValori(BASE, { ...V, ore: '0', minuti: '75' }, { adesso: ADESSO }).ok, false)
  assert.equal(patchDaValori(BASE, { ...V, ore: '1.5', minuti: '0' }, { adesso: ADESSO }).ok, false)
})

test('manca il giorno o l’ora', () => {
  assert.equal(patchDaValori(BASE, { ...V, giorno: '' }, { adesso: ADESSO }).ok, false)
  assert.equal(patchDaValori(BASE, { ...V, ora: '' }, { adesso: ADESSO }).ok, false)
})

// ----------------------------------------------------- segnati a mano
test('a un allenamento senza durata non se ne inventa una', () => {
  const aMano = { data: BASE.data }
  const r = patchDaValori(aMano, { ...V, ore: '', minuti: '' }, { adesso: ADESSO, haDurata: false })
  assert.equal(r.ok, true)
  assert.equal('durataSec' in r.patch, false)
})

test('ma se gliela si scrive, la prende', () => {
  const aMano = { data: BASE.data }
  const r = patchDaValori(aMano, { ...V, ore: '0', minuti: '45' }, { adesso: ADESSO, haDurata: false })
  assert.equal(r.patch.durataSec, 45 * 60)
})

test('la nota si ripulisce dagli spazi', () => {
  const r = patchDaValori(BASE, { ...V, nota: '  gambe pesanti  ' }, { adesso: ADESSO })
  assert.equal(r.patch.nota, 'gambe pesanti')
})
