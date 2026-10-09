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

// Una cronologia finta ma fedele nei punti che contano: pushState e
// replaceState sincroni, go() asincrono con popstate, come nel browser. È qui
// che la freccia degli editor sbagliava.
const voci = [{ url: '/', state: null }]
let i = 0
const ascolti = {}
const suona = (tipo) => (ascolti[tipo] || []).forEach((f) => f({ type: tipo }))
globalThis.sessionStorage = { getItem: () => null, setItem() {} }
globalThis.window = {
  location: {
    get pathname() {
      return voci[i].url
    },
    get hash() {
      return ''
    },
  },
  history: {
    get state() {
      return voci[i].state
    },
    get length() {
      return voci.length
    },
    pushState(state, _, url) {
      voci.length = i + 1
      voci.push({ url, state })
      i += 1
    },
    replaceState(state, _, url) {
      voci[i] = { url: url ?? voci[i].url, state }
    },
    back() {
      this.go(-1)
    },
    go(d) {
      setTimeout(() => {
        i = Math.max(0, Math.min(voci.length - 1, i + d))
        suona('popstate')
      }, 0)
    },
  },
  addEventListener: (tipo, f) => (ascolti[tipo] ||= []).push(f),
  dispatchEvent: (e) => suona(e.type),
  scrollTo() {},
}

const { navigate, esci, goBack, esciDallAllenamento, vaiASezione } = await import('../src/lib/router.js')
const attesa = () => new Promise((r) => setTimeout(r, 5))
const adesso = () => window.location.pathname
const scheda = (r) => ['nuova', 'editor', 'importa'].includes(r.name)
const dieta = (r) =>
  ['dieta-crea', 'dieta-macro', 'dieta-importa', 'dieta-editor', 'dieta-schema'].includes(r.name)

test('salvare una scheda torna alla scheda, e da lì la freccia non riapre l editor', async () => {
  navigate('/schede')
  navigate('/scheda/x1')
  for (let giro = 0; giro < 3; giro++) {
    navigate('/scheda/x1/edit')
    esci({ salta: scheda, poi: '/scheda/x1' })
    await attesa()
    assert.equal(adesso(), '/scheda/x1')
  }
  window.history.back()
  await attesa()
  assert.equal(adesso(), '/schede', 'tre modifiche dopo, un passo indietro e si è fuori')
})

test('una scheda nuova: si esce da "nuova" e dall editor, e si apre la scheda', async () => {
  navigate('/schede')
  navigate('/nuova')
  navigate('/crea')
  esci({ salta: scheda, poi: '/scheda/y2' })
  await attesa()
  await attesa()
  assert.equal(adesso(), '/scheda/y2')
  window.history.back()
  await attesa()
  assert.equal(adesso(), '/schede')
})

test('dieta: dal modulo dei macro all editor AL SUO POSTO, e la freccia esce da tutto il flusso', async () => {
  navigate('/dieta')
  navigate('/dieta/crea')
  navigate('/dieta/macro')
  const quante = window.history.length
  navigate('/dieta/d9', { sostituisci: true })
  assert.equal(window.history.length, quante, 'sostituire non aggiunge voci')
  navigate('/dieta/d9/schema')
  esci({ salta: (r) => r.name === 'dieta-schema', poi: '/dieta/d9' })
  await attesa()
  assert.equal(adesso(), '/dieta/d9', 'dallo schema si torna all editor che c era')
  esci({ salta: dieta, riserva: '/dieta' })
  await attesa()
  assert.equal(adesso(), '/dieta')
})

test('finito l allenamento si va alla scheda, e indietro si torna da dove si era partiti, non dentro l allenamento', async () => {
  navigate('/')
  navigate('/allenamento')
  esciDallAllenamento('/scheda/s1')
  await attesa()
  await attesa()
  assert.equal(adesso(), '/scheda/s1')
  window.history.back()
  await attesa()
  assert.equal(adesso(), '/', 'la pagina vuota "Nessun allenamento in corso" non deve stare in mezzo')
})

test('la freccia senza niente dietro va alla riserva, non fuori dall app', async () => {
  navigate('/feed')
  window.history.go(-i)
  await attesa()
  assert.equal(i, 0)
  // Dietro non c'è niente dell'app, anche se la cronologia ha voci (in avanti).
  goBack('/schede')
  await attesa()
  assert.equal(adesso(), '/schede')
  assert.equal(i, 0, 'prende il posto della pagina, non se ne aggiunge una')
})

test('goBack come onClick: l evento non fa da riserva', async () => {
  navigate('/amici')
  navigate('/cerca')
  goBack({ type: 'click' })
  await attesa()
  assert.equal(adesso(), '/amici')
})

test('una linguetta della barra riparte da Home: indietro da ogni sezione si torna a Home', async () => {
  const fino = async () => {
    await attesa()
    await attesa()
  }
  vaiASezione('/schede')
  await fino()
  navigate('/scheda/q1')
  vaiASezione('/feed')
  await fino()
  vaiASezione('/dieta/oggi')
  await fino()
  assert.equal(adesso(), '/dieta/oggi')
  assert.equal(i, 1, 'dietro c è solo Home')
  window.history.back()
  await attesa()
  assert.equal(adesso(), '/', 'non Social, non la scheda di prima')

  // Dentro una sezione la freccia risale la sezione.
  vaiASezione('/schede')
  await fino()
  navigate('/scheda/q1')
  window.history.back()
  await attesa()
  assert.equal(adesso(), '/schede')

  // Home stessa: la cronologia resta solo lei.
  vaiASezione('/')
  await fino()
  assert.equal(adesso(), '/')
  assert.equal(i, 0)
})
