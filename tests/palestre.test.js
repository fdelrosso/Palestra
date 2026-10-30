import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come in interazioni.test.js: `src/lib/supabase.js` legge `import.meta.env`,
// che fuori da Vite non esiste, e al suo posto entra un finto client.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const STUB = 'data:text/javascript,' + encodeURIComponent(\`
        export const supabase = { rpc: async () => ({ data: null, error: null }) }
        export function messaggioErrore(e) { return String(e?.message || e || '') }
      \`)
      export async function resolve(spec, ctx, next) {
        const esito = await next(spec.startsWith('.') && !spec.endsWith('.js') ? spec + '.js' : spec, ctx)
        if (esito.url.endsWith('/lib/supabase.js')) return { url: STUB, format: 'module', shortCircuit: true }
        return esito
      }`),
)

const { luogoPalestra } = await import('../src/lib/palestre.js')

test('luogoPalestra: indirizzo e comune con la sigla, quello che c’è', () => {
  assert.equal(luogoPalestra({ indirizzo: 'Via Volturno', comune: 'Milano', provincia: 'MI' }), 'Via Volturno · Milano (MI)')
  assert.equal(luogoPalestra({ indirizzo: '', comune: 'Milano', provincia: 'MI' }), 'Milano (MI)')
  assert.equal(luogoPalestra({ indirizzo: 'Via Roma 3', comune: 'Pisa', provincia: '' }), 'Via Roma 3 · Pisa')
  assert.equal(luogoPalestra({ indirizzo: '', comune: '', provincia: '' }), '')
  assert.equal(luogoPalestra(null), '')
})

const { daPhoton } = await import('../src/lib/palestre.js')

// Risposte vere di Photon ("via roma 12 prato", 2026-10-28), accorciate.
const fermata = { properties: { osm_value: 'bus_stop', type: 'house', name: 'Roma 12', street: 'Via Roma', city: 'Prato', county: 'Prato' }, geometry: { coordinates: [11.084718, 43.8664121] } }
const civico = { properties: { type: 'house', housenumber: '12', street: 'Via Roma', city: 'Pasian di Prato', county: 'Udine' }, geometry: { coordinates: [13.1886908, 46.04985] } }
const citta = { properties: { type: 'city', name: 'Prato', county: 'Prato', state: 'Toscana' }, geometry: { coordinates: [11.09, 43.88] } }

test('daPhoton: la via (col civico) da salvare, e il luogo da leggere sotto', () => {
  assert.deepEqual(daPhoton(civico), { titolo: 'Via Roma 12', luogo: 'Pasian di Prato, Udine', indirizzo: 'Via Roma 12', lat: 46.04985, lon: 13.1886908 })
  // Una fermata col nome "Roma 12": vale la via, e "Prato, Prato" una volta sola.
  assert.deepEqual(daPhoton(fermata), { titolo: 'Via Roma', luogo: 'Prato', indirizzo: 'Via Roma', lat: 43.8664121, lon: 11.084718 })
  // Una città: la mappa ci va, ma non c'è un indirizzo da salvare.
  assert.deepEqual(daPhoton(citta), { titolo: 'Prato', luogo: '', indirizzo: '', lat: 43.88, lon: 11.09 })
  assert.equal(daPhoton({ properties: { name: 'x' }, geometry: {} }), null)
})
