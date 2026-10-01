import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// I percorsi dell'app stanno in tre liste che devono dire la stessa cosa:
// `routes` in lib/router (dove l'app va), vercel.json (cosa il server manda
// all'app invece che al 404; il service worker legge la stessa lista) e
// public/sitemap.xml (cosa si dice ai motori di ricerca).

// Un indirizzo di prima, con le pagine nell'hash, aperto da un link della mail
// che porta il suo token nella query: il router appena caricato lo riscrive.
let indirizzo = '/?token_hash=abc&type=recovery#/dieta/oggi'
let stato = null
const qui = () => new URL(indirizzo, 'https://progettopalestra.it')
globalThis.sessionStorage = { getItem: () => null, setItem() {} }
globalThis.window = {
  location: {
    get pathname() {
      return qui().pathname
    },
    get search() {
      return qui().search
    },
    get hash() {
      return qui().hash
    },
  },
  history: {
    get state() {
      return stato
    },
    replaceState(s, _, url) {
      stato = s
      if (url !== undefined) indirizzo = url
    },
  },
  addEventListener() {},
}

const { routes, parse } = await import('../src/lib/router.js')
const { espressioneDelPercorso, percorsiDellApp } = await import('../src/lib/percorsi.js')
const { GRUPPI } = await import('../src/lib/muscoli.js')

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const dellApp = percorsiDellApp(vercel)
const vaAllApp = (p) => dellApp.some((re) => re.test(p))

// Ogni rotta, con un id finto dove ne vuole uno.
const tutte = Object.values(routes).flatMap((f) => [f(), f('x1')])
const fisse = [...new Set(Object.values(routes).map((f) => f()))].filter((p) => !p.includes('undefined'))

test('un vecchio indirizzo col # diventa un percorso, e il token della mail resta', () => {
  assert.equal(indirizzo, '/dieta/oggi?token_hash=abc&type=recovery')
  assert.equal(parse(window.location.pathname).name, 'dieta-oggi')
})

test('ogni pagina dell app il server la manda all app', () => {
  for (const p of tutte) assert.ok(vaAllApp(p), `${p} manca in vercel.json`)
})

test('ogni riga di vercel.json è una pagina che l app conosce', () => {
  for (const { source } of vercel.rewrites) {
    const re = espressioneDelPercorso(source)
    assert.ok(tutte.some((p) => re.test(p)), `${source} non corrisponde a nessuna rotta di lib/router`)
  }
})

test('un indirizzo che non è dell app non apre l app', () => {
  for (const p of ['/ciaociao', '/schede/ciaociao', '/scheda/x1/edit/altro', '/dieta/a/b/c', '/sitemap.xml', '/robots.txt', '/404.html']) {
    assert.ok(!vaAllApp(p), `${p} aprirebbe l app`)
  }
  for (const p of ['/', '/?code=abc', '/schede/', '/dieta/oggi/colazione', '/scheda/x1/edit']) {
    assert.ok(vaAllApp(p), `${p} dovrebbe aprire l app`)
  }
})

test('la sitemap ha tutte le pagine a indirizzo fisso, e solo quelle', () => {
  const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  const inSitemap = [...xml.matchAll(/<loc>https:\/\/progettopalestra\.it([^<]*)<\/loc>/g)].map((m) => m[1])
  const attese = ['/', ...fisse, ...GRUPPI.map((g) => routes.eserciziGruppo(g.id))]
  assert.deepEqual([...inSitemap].sort(), [...attese].sort())
  for (const p of inSitemap) assert.ok(vaAllApp(p), `${p} è in sitemap ma il server darebbe 404`)
})

test('una forma di vercel.json che lib/percorsi non sa leggere ferma la build', () => {
  assert.throws(() => espressioneDelPercorso('/dieta/:path*'))
  assert.throws(() => espressioneDelPercorso('/(schede|dieta)'))
})
