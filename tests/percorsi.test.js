import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// I percorsi dell'app stanno in tre liste che devono dire la stessa cosa:
// `routes` in lib/router (dove l'app va), i `rewrites` di vercel.json (cosa il
// server manda all'app invece che al 404; il service worker legge la stessa
// lista) e i suoi `headers` (le stesse pagine, con noindex per i motori di
// ricerca). Nella sitemap ci sono solo l'ingresso e le pagine statiche
// (privacy, termini).

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

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const dellApp = percorsiDellApp(vercel)
const vaAllApp = (p) => dellApp.some((re) => re.test(p))
// Le righe che vanno all'app, e quelle che vanno a una pagina statica di
// public/ (privacy, termini): queste ultime sono fuori dall'app apposta.
const rewritesApp = vercel.rewrites.filter((r) => r.destination === '/index.html')
const rewritesStatiche = vercel.rewrites.filter((r) => r.destination !== '/index.html')

// Ogni rotta, con un id finto dove ne vuole uno.
const tutte = Object.values(routes).flatMap((f) => [f(), f('x1')])

test('un vecchio indirizzo col # diventa un percorso, e il token della mail resta', () => {
  assert.equal(indirizzo, '/dieta/oggi?token_hash=abc&type=recovery')
  assert.equal(parse(window.location.pathname).name, 'dieta-oggi')
})

test('ogni pagina dell app il server la manda all app', () => {
  for (const p of tutte) assert.ok(vaAllApp(p), `${p} manca in vercel.json`)
})

test('ogni riga di vercel.json è una pagina che l app conosce', () => {
  for (const { source } of rewritesApp) {
    const re = espressioneDelPercorso(source)
    assert.ok(tutte.some((p) => re.test(p)), `${source} non corrisponde a nessuna rotta di lib/router`)
  }
})

test('le pagine statiche di vercel.json esistono in public', () => {
  assert.ok(rewritesStatiche.length > 0)
  for (const { source, destination } of rewritesStatiche) {
    assert.ok(existsSync(new URL(`../public${destination}`, import.meta.url)), `${source} porta a ${destination}, che non c'è`)
    assert.ok(!tutte.some((p) => espressioneDelPercorso(source).test(p)), `${source} è anche una rotta dell app`)
  }
})

test('un indirizzo che non è dell app non apre l app', () => {
  for (const p of ['/ciaociao', '/schede/ciaociao', '/scheda/x1/edit/altro', '/dieta/a/b/c', '/sitemap.xml', '/robots.txt', '/404.html', '/privacy', '/termini']) {
    assert.ok(!vaAllApp(p), `${p} aprirebbe l app`)
  }
  for (const p of ['/', '/?code=abc', '/schede/', '/dieta/oggi/colazione', '/scheda/x1/edit']) {
    assert.ok(vaAllApp(p), `${p} dovrebbe aprire l app`)
  }
})

// Google non fa l'accesso: per lui ogni pagina dell'app è la schermata
// "Benvenuto". Si indicizza l'ingresso (e le pagine statiche), il resto no.
test('ogni pagina dell app tranne l ingresso ha noindex', () => {
  const conNoindex = (vercel.headers || [])
    .filter((h) => h.headers.some((x) => x.key === 'X-Robots-Tag' && x.value === 'noindex'))
    .map((h) => h.source)
  assert.deepEqual([...conNoindex].sort(), rewritesApp.map((r) => r.source).sort())
  for (const s of conNoindex) assert.ok(!espressioneDelPercorso(s).test('/'), `${s} toglierebbe l'ingresso da Google`)
})

test('la sitemap ha l ingresso e le pagine statiche, e solo quelle', () => {
  const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  const inSitemap = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  const attese = ['/', ...rewritesStatiche.map((r) => r.source)].map((p) => `https://progettopalestra.it${p}`)
  assert.deepEqual([...inSitemap].sort(), attese.sort())
})

test('una forma di vercel.json che lib/percorsi non sa leggere ferma la build', () => {
  assert.throws(() => espressioneDelPercorso('/dieta/:path*'))
  assert.throws(() => espressioneDelPercorso('/(schede|dieta)'))
})
