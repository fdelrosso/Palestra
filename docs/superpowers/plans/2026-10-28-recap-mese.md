# Recap del mese (passo 1) — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** una storia a schermo intero "alla Wrapped" col riepilogo di un mese di allenamenti, che finisce su una card 1080×1920 da condividere.

**Architecture:** i numeri li calcola un modulo puro (`src/lib/recapMese.js`) sommando quello che `statisticheRecap` (lib/recap) dà per ogni allenamento del mese; la card si disegna su canvas (`src/lib/recapMeseImmagine.js`) coi pezzi di `lib/recapImmagine`; il visore è una pagina (`/recap-mese/AAAA-MM`) che mostra le slide e manda gli eventi a `avanzaStoria`. Si apre dal calendario e da una card sulla Home.

**Tech Stack:** React 19, Vite, canvas 2D, `node --test` con `node:assert/strict`, oxlint.

**Spec:** `docs/superpowers/specs/2026-10-28-recap-mese-design.md`

## Global Constraints

- Si lavora su `main` (l'utente l'ha chiesto). **Mai `git push`**: solo commit.
- **Nessuna modifica al database** e nessuna colonna nuova. L'unica scrittura: `preferenze.avvisi['recapMese:AAAA-MM'] = 'visto'` con `aggiornaPreferenze`.
- **Quello che non si sa non si mostra**: una cifra senza dato è `null` e la sua slide (o casella) sparisce.
- Le definizioni sono quelle di `statisticheRecap` (lib/recap): il mese **somma**, non ricalcola.
- Un allenamento è del mese della sua `data` **in ora locale**.
- Il mese in corso si apre solo con `import.meta.env.DEV`.
- Card: **1080×1920**, file `recap-<mese>-<anno>.png`, titolo "Il mio <mese>".
- Testi senza genere ("6 allenamenti fatti"), in italiano, minuscole per i mesi nel testo ("ottobre").
- Stile del codice: commenti in italiano, nomi in italiano, come il resto del repo. Prima di ogni commit `npm run lint` (nessun errore nuovo) e `npm run test` (tutto verde).
- Gli import dentro `src/lib` sono **senza estensione** (li risolve Vite); i test usano il loader di `tests/recap.test.js` (copiato in Task 1).
- `scratchpad/` è nel repo: il file di prova di Task 5 **non si committa**.

## File

| File | Responsabilità |
|---|---|
| `src/lib/recapMese.js` (nuovo) | dati del mese, slide, caselle, celle del calendario, `avanzaStoria` |
| `tests/recapMese.test.js` (nuovo) | prove di tutto `recapMese.js` |
| `src/lib/recapImmagine.js` | esporta i pezzi di disegno; `sfondo` con la misura; `condividiImmagine` |
| `src/components/RecapCondivisibile.jsx` | usa `condividiImmagine` |
| `src/lib/recapMeseImmagine.js` (nuovo) | la card 1080×1920 |
| `src/components/SlideRecapMese.jsx` (nuovo) | il contenuto di ogni slide |
| `src/pages/RecapMesePage.jsx` (nuovo) | il visore |
| `src/lib/router.js`, `src/App.jsx` | rotta `recap-mese`, senza barra in basso |
| `src/index.css` | stili `.rm-*` del visore, della card della Home e del tasto del calendario |
| `src/pages/CalendarPage.jsx` | tasto "Recap di …"; usa `celleDelMese` |
| `src/components/CardRecapMese.jsx` (nuovo) | la card della Home |
| `src/pages/InizioPage.jsx` | monta `CardRecapMese` |
| `context.md`, `docs/storico.md` | la tornata |

---

### Task 1: I dati del mese

**Files:**
- Create: `src/lib/recapMese.js`
- Test: `tests/recapMese.test.js`

**Interfaces:**
- Consumes: `statisticheRecap(riep, { schede })` → `{ durataSec, volume, pesoMax: {numero, testo, esercizio}|null, sforzo: {verde, giallo, rosso, tot}, intensita, minutiCardio, record: [{esercizio, carico, precedente}] }`; `gruppiAllenati(esercizi)` → `[{id, serie, label, colore, …}]`; `durataLunga(sec)`, `formattaMigliaia(n)` (tutti da `./recap`); `normalizzaNome` (`./eserciziLibreria`); `normalizzaMusica` (`./musica`).
- Produces:
  - `MESI: string[]` (minuscoli, `MESI[9] === 'ottobre'`)
  - `meseDaPercorso(testo: string) → {anno, mese}|null` (`mese` 0..11)
  - `percorsoMese({anno, mese}) → 'AAAA-MM'`
  - `meseFinito({anno, mese}, oggi = new Date()) → boolean`
  - `mesePrima({anno, mese}) → {anno, mese}`
  - `celleDelMese(anno, mese) → (number|null)[]` (settimana da lunedì)
  - `recapDelMese(voci, {anno, mese}, { schede = [] } = {}) → Recap|null`, con
    `Recap = { anno, mese, nomeMese, nomeMesePrima, allenamenti, giorni: number[], inPiu: number|null, durataSec: number|null, piuLungo: {nome, data, durataSec}|null, volume: number|null, pesoMax: {testo, esercizio}|null, gruppi: object[], sforzo: {verde, giallo, rosso, tot}|null, piuDuro: {nome, data}|null, record: {esercizio, carico, data}[], numRecord: number, abitudini: {esercizio: {nome, volte}|null, giorno: string, settimaneDiFila: number}|null, minutiCardio: number, musica: object|null }`
  - `voci` = le voci di `raccogliCompletamenti(schede)` (lib/oggi) messe in fila: `{ data, nomeGiorno, esercizi, musica, … }`.

- [ ] **Step 1: Scrivi le prove che falliscono**

Crea `tests/recapMese.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come tests/recap.test.js: lib importa senza estensione (Vite li risolve,
// Node no), il loader aggiunge `.js` agli import relativi che non ce l'hanno.
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
const {
  MESI,
  meseDaPercorso,
  percorsoMese,
  meseFinito,
  mesePrima,
  celleDelMese,
  recapDelMese,
} = await import('../src/lib/recapMese.js')

const OTTOBRE = { anno: 2026, mese: 9 }
// Un allenamento: `kg` per serie fatte (pallino verde), 8 ripetizioni.
const fatto = (data, { nome = 'Panca', kg = [60], durataSec = 3600, musica, colore = 'verde', gruppi = ['petto'] } = {}) => ({
  data,
  nomeGiorno: 'Giorno A',
  durataSec,
  musica,
  esercizi: [{ nome, gruppi, schema: { ripetizioni: '8', carico: `${kg[0]} kg` }, sets: kg.map((k) => ({ colore, kg: k, rip: 8 })) }],
})
const canzone = (id) => ({ id, titolo: `Brano ${id}`, artista: 'Qualcuno', copertina: '' })

test('mesi: dal percorso e ritorno, finiti e precedenti', () => {
  assert.equal(MESI[9], 'ottobre')
  assert.deepEqual(meseDaPercorso('2026-10'), OTTOBRE)
  for (const rotto of ['', '2026-13', '2026-00', '2026-1', 'ottobre', null]) assert.equal(meseDaPercorso(rotto), null)
  assert.equal(percorsoMese(OTTOBRE), '2026-10')
  assert.equal(percorsoMese({ anno: 2026, mese: 0 }), '2026-01')
  const oggi = new Date(2026, 9, 28)
  assert.equal(meseFinito(OTTOBRE, oggi), false)
  assert.equal(meseFinito({ anno: 2026, mese: 8 }, oggi), true)
  assert.equal(meseFinito({ anno: 2025, mese: 11 }, oggi), true)
  assert.deepEqual(mesePrima({ anno: 2026, mese: 0 }), { anno: 2025, mese: 11 })
})

test('le celle del mese partono da lunedì', () => {
  // Il 1° ottobre 2026 è un giovedì: tre vuoti prima.
  const c = celleDelMese(2026, 9)
  assert.deepEqual(c.slice(0, 4), [null, null, null, 1])
  assert.equal(c.length % 7, 0)
  assert.equal(c.filter(Boolean).length, 31)
})

test('un mese senza allenamenti non ha recap', () => {
  assert.equal(recapDelMese([], OTTOBRE), null)
  assert.equal(recapDelMese([fatto('2026-09-30T10:00:00')], OTTOBRE), null)
})

test('il mese è quello della data in ora locale', () => {
  // Le 23:30 del 31 ottobre, ora locale: è ottobre anche se in UTC fosse novembre.
  const r = recapDelMese([fatto(new Date(2026, 9, 31, 23, 30).toISOString())], OTTOBRE)
  assert.equal(r.allenamenti, 1)
  assert.deepEqual(r.giorni, [31])
})

test('i numeri del mese sono la somma di quelli di ogni allenamento', () => {
  const voci = [
    fatto('2026-10-02T18:00:00', { kg: [60, 60], durataSec: 3000 }),
    fatto('2026-10-02T20:00:00', { nome: 'Squat', kg: [100], durataSec: 1800, gruppi: ['gambe'] }),
    fatto('2026-10-09T18:00:00', { kg: [70], durataSec: 4000, colore: 'rosso' }),
  ]
  const r = recapDelMese(voci, OTTOBRE)
  assert.equal(r.nomeMese, 'ottobre')
  assert.equal(r.allenamenti, 3)
  assert.deepEqual(r.giorni, [2, 9])
  assert.equal(r.durataSec, 8800)
  assert.deepEqual(r.piuLungo, { nome: 'Giorno A', data: '2026-10-09T18:00:00', durataSec: 4000 })
  // (60+60+100+70) × 8
  assert.equal(r.volume, 2320)
  assert.deepEqual(r.pesoMax, { testo: '100kg', esercizio: 'Squat' })
  assert.deepEqual(r.sforzo, { verde: 3, giallo: 0, rosso: 1, tot: 4 })
  assert.equal(r.piuDuro.data, '2026-10-09T18:00:00')
  assert.deepEqual(r.gruppi.map((g) => g.id), ['petto', 'gambe'])
})

test('senza durate, pesi o pallini la cifra è null, non 0', () => {
  const v = fatto('2026-10-02T18:00:00', { durataSec: 0 })
  v.esercizi[0].sets = [{ colore: 'verde' }] // niente peso: niente volume
  v.esercizi[0].schema = { ripetizioni: 'max' }
  const r = recapDelMese([v], OTTOBRE)
  assert.equal(r.durataSec, null)
  assert.equal(r.piuLungo, null)
  assert.equal(r.volume, null)
  assert.equal(r.pesoMax, null)
})

test('il confronto col mese prima: solo se c’era e solo in più', () => {
  const sett = [fatto('2026-09-10T10:00:00')]
  const ott = [fatto('2026-10-01T10:00:00'), fatto('2026-10-05T10:00:00')]
  assert.equal(recapDelMese([...sett, ...ott], OTTOBRE).inPiu, 1)
  assert.equal(recapDelMese([...sett, ...ott], OTTOBRE).nomeMesePrima, 'settembre')
  assert.equal(recapDelMese(ott, OTTOBRE).inPiu, null)
  // Un calo non si mostra.
  assert.equal(recapDelMese([...sett, ...sett, ...sett, ott[0]], OTTOBRE).inPiu, null)
})

test('i record del mese: dalla storia intera, i più recenti per primi, al massimo 5', () => {
  const prima = fatto('2026-09-20T10:00:00', { kg: [50] })
  const ott = [60, 62, 64, 66, 68, 70].map((kg, i) => fatto(`2026-10-${String(i + 1).padStart(2, '0')}T10:00:00`, { kg: [kg] }))
  const voci = [prima, ...ott]
  const r = recapDelMese(voci, OTTOBRE, { schede: [{ completamenti: voci }] })
  assert.equal(r.numRecord, 6)
  assert.equal(r.record.length, 5)
  assert.equal(r.record[0].carico, '70kg')
  assert.equal(r.record[0].data, '2026-10-06T10:00:00')
  // Senza la storia (schede vuote) i record non si possono sapere.
  assert.equal(recapDelMese(voci, OTTOBRE).numRecord, 0)
})

test('le abitudini solo da 3 allenamenti in su', () => {
  const due = [fatto('2026-10-12T10:00:00'), fatto('2026-10-19T10:00:00')]
  assert.equal(recapDelMese(due, OTTOBRE).abitudini, null)
  // Giovedì 1 (settimana del 28 settembre), un buco (la settimana del 5), poi
  // lunedì 12, 19 e 26: tre settimane di fila.
  const voci = [fatto('2026-10-01T10:00:00'), ...due, fatto('2026-10-26T10:00:00', { nome: 'Squat' })]
  const a = recapDelMese(voci, OTTOBRE).abitudini
  assert.deepEqual(a.esercizio, { nome: 'Panca', volte: 3 })
  assert.equal(a.giorno, 'lunedì')
  assert.equal(a.settimaneDiFila, 3)
})

test('la canzone del mese: la più scelta, a pari merito la più recente', () => {
  const voci = [
    fatto('2026-10-01T10:00:00', { musica: canzone('1') }),
    fatto('2026-10-02T10:00:00', { musica: canzone('2') }),
    fatto('2026-10-03T10:00:00', { musica: canzone('1') }),
    fatto('2026-10-04T10:00:00', { musica: canzone('2') }),
    fatto('2026-10-05T10:00:00'),
  ]
  assert.equal(recapDelMese(voci, OTTOBRE).musica.id, '2')
  assert.equal(recapDelMese(voci.slice(0, 3), OTTOBRE).musica.id, '1')
  assert.equal(recapDelMese([fatto('2026-10-05T10:00:00')], OTTOBRE).musica, null)
})
```

- [ ] **Step 2: Lancia le prove e guardale fallire**

Run: `node --test tests/recapMese.test.js`
Expected: FAIL, `Cannot find module '…/src/lib/recapMese.js'`.

- [ ] **Step 3: Scrivi `src/lib/recapMese.js`**

```js
// ---------------------------------------------------------------------------
// Il RECAP DEL MESE (docs/superpowers/specs/2026-10-28-recap-mese-design.md):
// una storia alla Spotify Wrapped, una slide per argomento, che finisce su una
// card da condividere (lib/recapMeseImmagine, pages/RecapMesePage).
//
// Qui solo conti, niente rete: il mese SOMMA quello che statisticheRecap
// (lib/recap) dà per ogni allenamento, cosi' volume, record e durata sono
// quelli dei recap di ogni giorno. Vale la regola del recap: quello che non
// si sa non si mostra (null, e la slide sparisce).
// ---------------------------------------------------------------------------

import { durataLunga, formattaMigliaia, gruppiAllenati, statisticheRecap } from './recap'
import { normalizzaNome } from './eserciziLibreria'
import { normalizzaMusica } from './musica'

export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** '2026-10' → { anno: 2026, mese: 9 }; null se non è un mese. */
export function meseDaPercorso(testo) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(testo ?? ''))
  if (!m) return null
  const mese = Number(m[2]) - 1
  return mese >= 0 && mese <= 11 ? { anno: Number(m[1]), mese } : null
}

export const percorsoMese = ({ anno, mese }) => `${anno}-${String(mese + 1).padStart(2, '0')}`

/** Il mese è già finito (oggi è dopo il suo ultimo giorno). */
export function meseFinito({ anno, mese }, oggi = new Date()) {
  return anno < oggi.getFullYear() || (anno === oggi.getFullYear() && mese < oggi.getMonth())
}

export function mesePrima({ anno, mese }) {
  const d = new Date(anno, mese - 1, 1)
  return { anno: d.getFullYear(), mese: d.getMonth() }
}

/** Le celle del mese, settimana da lunedì; null = cella vuota. */
export function celleDelMese(anno, mese) {
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate()
  const vuoti = (new Date(anno, mese, 1).getDay() + 6) % 7
  const celle = []
  for (let i = 0; i < vuoti; i++) celle.push(null)
  for (let g = 1; g <= giorniNelMese; g++) celle.push(g)
  while (celle.length % 7 !== 0) celle.push(null)
  return celle
}

// Il mese della data in ORA LOCALE, come il calendario.
function delMese(voci, { anno, mese }) {
  return (voci || []).filter((v) => {
    if (!v?.data) return false
    const d = new Date(v.data)
    return d.getFullYear() === anno && d.getMonth() === mese
  })
}

const fatto = (e) => (e?.sets || []).some((s) => s?.colore)

// Il lunedì della settimana, in giorni dal 1970 (arrotondati: l'ora legale
// sposta la mezzanotte di un'ora).
function lunedi(iso) {
  const d = new Date(iso)
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return Math.round(l.getTime() / 86400000)
}

function abitudini(lista) {
  const conta = new Map()
  for (const v of lista) {
    for (const e of v.esercizi || []) {
      const k = normalizzaNome(e.nome)
      if (!k || !fatto(e)) continue
      const c = conta.get(k) || { nome: e.nome, volte: 0 }
      c.volte += 1
      conta.set(k, c)
    }
  }
  // A pari merito il primo incontrato.
  let esercizio = null
  for (const c of conta.values()) if (!esercizio || c.volte > esercizio.volte) esercizio = c

  const perGiorno = Array(7).fill(0)
  for (const v of lista) perGiorno[new Date(v.data).getDay()] += 1
  // A pari merito il primo della settimana, da lunedì.
  const giorno = [1, 2, 3, 4, 5, 6, 0].reduce((a, g) => (perGiorno[g] > perGiorno[a] ? g : a), 1)

  const settimane = [...new Set(lista.map((v) => lunedi(v.data)))].sort((a, b) => a - b)
  let fila = 1
  let settimaneDiFila = 1
  for (let i = 1; i < settimane.length; i++) {
    fila = settimane[i] - settimane[i - 1] === 7 ? fila + 1 : 1
    settimaneDiFila = Math.max(settimaneDiFila, fila)
  }
  return { esercizio, giorno: GIORNI[giorno], settimaneDiFila }
}

// La canzone scelta più volte; a pari merito l'ultima usata (lista in ordine).
function canzoneDelMese(lista) {
  const conta = new Map()
  lista.forEach((v, i) => {
    const m = normalizzaMusica(v.musica)
    if (!m?.id) return
    const c = conta.get(m.id) || { musica: m, volte: 0, ultima: 0 }
    c.volte += 1
    c.ultima = i
    c.musica = m
    conta.set(m.id, c)
  })
  let meglio = null
  for (const c of conta.values()) {
    if (!meglio || c.volte > meglio.volte || (c.volte === meglio.volte && c.ultima > meglio.ultima)) meglio = c
  }
  return meglio ? meglio.musica : null
}

/**
 * Tutti i numeri del mese, o null se non c'è nessun allenamento.
 * @param {object[]} voci le voci di raccogliCompletamenti (lib/oggi), in fila
 * @param {{anno: number, mese: number}} periodo
 * @param {{ schede?: object[] }} [ctx] la storia, per i record
 */
export function recapDelMese(voci, periodo, { schede = [] } = {}) {
  const lista = delMese(voci, periodo).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  if (!lista.length) return null
  const stat = lista.map((v) => ({ v, s: statisticheRecap(v, { schede }) }))

  const conDurata = stat.filter((x) => x.s.durataSec > 0)
  const durataSec = conDurata.reduce((t, x) => t + x.s.durataSec, 0)
  const lungo = conDurata.reduce((a, x) => (!a || x.s.durataSec > a.s.durataSec ? x : a), null)
  const volume = stat.reduce((t, x) => t + (x.s.volume || 0), 0)
  const pesoMax = stat.reduce((a, x) => (x.s.pesoMax && (!a || x.s.pesoMax.numero > a.numero) ? x.s.pesoMax : a), null)
  const sforzo = { verde: 0, giallo: 0, rosso: 0, tot: 0 }
  for (const { s } of stat) for (const k of Object.keys(sforzo)) sforzo[k] += s.sforzo[k]
  const duro = stat.filter((x) => x.s.sforzo.tot > 0).reduce((a, x) => (!a || x.s.intensita > a.s.intensita ? x : a), null)
  const record = stat.flatMap((x) => x.s.record.map((r) => ({ esercizio: r.esercizio, carico: r.carico, data: x.v.data }))).reverse()
  const prima = delMese(voci, mesePrima(periodo)).length

  return {
    ...periodo,
    nomeMese: MESI[periodo.mese],
    nomeMesePrima: MESI[mesePrima(periodo).mese],
    allenamenti: lista.length,
    giorni: [...new Set(lista.map((v) => new Date(v.data).getDate()))].sort((a, b) => a - b),
    inPiu: prima > 0 && lista.length > prima ? lista.length - prima : null,
    durataSec: durataSec || null,
    piuLungo: lungo ? { nome: lungo.v.nomeGiorno, data: lungo.v.data, durataSec: lungo.s.durataSec } : null,
    volume: volume > 0 ? Math.round(volume) : null,
    pesoMax: pesoMax ? { testo: pesoMax.testo, esercizio: pesoMax.esercizio } : null,
    gruppi: gruppiAllenati(lista.flatMap((v) => v.esercizi || [])),
    sforzo: sforzo.tot > 0 ? sforzo : null,
    piuDuro: duro ? { nome: duro.v.nomeGiorno, data: duro.v.data } : null,
    record: record.slice(0, 5),
    numRecord: record.length,
    abitudini: lista.length >= 3 ? abitudini(lista) : null,
    minutiCardio: stat.reduce((t, x) => t + (x.s.minutiCardio || 0), 0),
    musica: canzoneDelMese(lista),
  }
}

// Usati dalle slide e dalla card (Task 2): qui perché sono testi del recap.
export { durataLunga, formattaMigliaia }
```

- [ ] **Step 4: Lancia le prove e guardale passare**

Run: `node --test tests/recapMese.test.js`
Expected: PASS, 10 prove. Se `pesoMax.testo` esce diverso da `'100kg'` (es. `'100 kg'`), è `formattaCarico` di lib/schema a decidere: correggi l'atteso della prova, non il codice.

- [ ] **Step 5: Lint, prove intere, commit**

```bash
npm run lint && npm run test
git branch --show-current   # deve dire main
git add src/lib/recapMese.js tests/recapMese.test.js
git commit -m "Recap del mese: i numeri del mese (lib/recapMese)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Slide e caselle della card

**Files:**
- Modify: `src/lib/recapMese.js` (in fondo)
- Test: `tests/recapMese.test.js` (in fondo, e l'import)

**Interfaces:**
- Consumes: `Recap` di Task 1.
- Produces:
  - `SLIDE: string[]` = `['intro', 'allenamenti', 'tempo', 'volume', 'muscoli', 'sforzo', 'record', 'abitudini', 'cardio', 'canzone', 'riepilogo']`
  - `slideDelMese(r: Recap|null) → string[]` (sottoinsieme ordinato di `SLIDE`; `[]` se `r` è null)
  - `caselleCard(r: Recap|null) → {id: 'allenamenti'|'tempo'|'volume'|'record', valore: string, etichetta: string}[]`

- [ ] **Step 1: Scrivi le prove che falliscono**

In `tests/recapMese.test.js` aggiungi `slideDelMese, caselleCard` all'import di `recapMese.js`, poi in fondo:

```js
test('le slide: solo quelle col loro dato, nell’ordine', () => {
  assert.deepEqual(slideDelMese(null), [])
  const scarso = fatto('2026-10-02T18:00:00', { durataSec: 0 })
  scarso.esercizi[0].sets = [{}] // niente fatto: niente muscoli, sforzo, volume
  assert.deepEqual(slideDelMese(recapDelMese([scarso], OTTOBRE)), ['intro', 'allenamenti', 'riepilogo'])

  const pieno = [1, 2, 3].map((g) => fatto(`2026-10-0${g}T18:00:00`, { musica: canzone('1') }))
  assert.deepEqual(slideDelMese(recapDelMese(pieno, OTTOBRE)), [
    'intro', 'allenamenti', 'tempo', 'volume', 'muscoli', 'sforzo', 'abitudini', 'canzone', 'riepilogo',
  ])
})

test('le caselle della card: solo quelle con un numero', () => {
  assert.deepEqual(caselleCard(null), [])
  const uno = recapDelMese([fatto('2026-10-02T18:00:00', { kg: [100], durataSec: 3720 })], OTTOBRE)
  assert.deepEqual(caselleCard(uno), [
    { id: 'allenamenti', valore: '1', etichetta: 'allenamento' },
    { id: 'tempo', valore: '1 h 02 min', etichetta: 'di allenamento' },
    { id: 'volume', valore: '800 kg', etichetta: 'sollevati' },
  ])
  const senzaDurata = recapDelMese([fatto('2026-10-02T18:00:00', { durataSec: 0 }), fatto('2026-10-03T18:00:00', { durataSec: 0 })], OTTOBRE)
  assert.deepEqual(caselleCard(senzaDurata).map((c) => c.id), ['allenamenti', 'volume'])
  assert.equal(caselleCard(senzaDurata)[0].etichetta, 'allenamenti')
})
```

- [ ] **Step 2: Lancia le prove e guardale fallire**

Run: `node --test tests/recapMese.test.js`
Expected: FAIL, `slideDelMese is not a function`.

- [ ] **Step 3: Aggiungi in fondo a `src/lib/recapMese.js`**

```js
// L'ordine delle slide (pages/RecapMesePage, components/SlideRecapMese).
export const SLIDE = ['intro', 'allenamenti', 'tempo', 'volume', 'muscoli', 'sforzo', 'record', 'abitudini', 'cardio', 'canzone', 'riepilogo']

/** Le slide di questo mese: ognuna solo se ha il suo dato. */
export function slideDelMese(r) {
  if (!r) return []
  const ce = {
    tempo: !!r.durataSec,
    volume: !!r.volume,
    muscoli: r.gruppi.length > 0,
    sforzo: !!r.sforzo,
    record: r.numRecord > 0,
    abitudini: !!r.abitudini,
    cardio: r.minutiCardio > 0,
    canzone: !!r.musica,
  }
  return SLIDE.filter((id) => ce[id] ?? true)
}

/** Le caselle coi numeri della card finale, solo quelle con un dato. */
export function caselleCard(r) {
  if (!r) return []
  return [
    { id: 'allenamenti', valore: String(r.allenamenti), etichetta: r.allenamenti === 1 ? 'allenamento' : 'allenamenti' },
    r.durataSec && { id: 'tempo', valore: durataLunga(r.durataSec), etichetta: 'di allenamento' },
    r.volume && { id: 'volume', valore: `${formattaMigliaia(r.volume)} kg`, etichetta: 'sollevati' },
    r.numRecord > 0 && { id: 'record', valore: String(r.numRecord), etichetta: 'record' },
  ].filter(Boolean)
}
```

- [ ] **Step 4: Lancia le prove e guardale passare**

Run: `node --test tests/recapMese.test.js`
Expected: PASS, 12 prove. `durataLunga(3720)` deve dare `'1 h 02 min'` (lib/recap); se il formato è diverso, correggi l'atteso.

- [ ] **Step 5: Lint, prove intere, commit**

```bash
npm run lint && npm run test
git branch --show-current   # main
git add src/lib/recapMese.js tests/recapMese.test.js
git commit -m "Recap del mese: quali slide e quali caselle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: La logica della storia

**Files:**
- Modify: `src/lib/recapMese.js` (in fondo)
- Test: `tests/recapMese.test.js`

**Interfaces:**
- Produces:
  - `DURATA_SLIDE = 6000` (ms)
  - `storiaIniziale(totale: number) → Storia`, `Storia = { indice, trascorso, inPausa, totale }`
  - `avanzaStoria(s: Storia, e: {tipo: 'tempo', ms: number} | {tipo: 'avanti'|'indietro'|'pausa'|'riprendi'|'rivedi'}) → Storia` (va bene come reducer di `useReducer`)

- [ ] **Step 1: Scrivi le prove che falliscono**

Aggiungi `DURATA_SLIDE, storiaIniziale, avanzaStoria` all'import, poi in fondo:

```js
test('la storia: il tempo porta avanti, l’ultima slide si ferma', () => {
  let s = storiaIniziale(3)
  assert.deepEqual(s, { indice: 0, trascorso: 0, inPausa: false, totale: 3 })
  s = avanzaStoria(s, { tipo: 'tempo', ms: DURATA_SLIDE - 1 })
  assert.equal(s.indice, 0)
  s = avanzaStoria(s, { tipo: 'tempo', ms: 1 })
  assert.deepEqual([s.indice, s.trascorso], [1, 0])
  s = avanzaStoria(avanzaStoria(s, { tipo: 'avanti' }), { tipo: 'tempo', ms: DURATA_SLIDE * 3 })
  assert.deepEqual([s.indice, s.trascorso], [2, DURATA_SLIDE])
  assert.deepEqual([avanzaStoria(s, { tipo: 'avanti' }).indice], [2])
})

test('la storia: indietro, pausa e rivedi', () => {
  let s = avanzaStoria(storiaIniziale(3), { tipo: 'tempo', ms: 2000 })
  // Indietro sulla prima: la ricomincia.
  assert.deepEqual([avanzaStoria(s, { tipo: 'indietro' }).indice, avanzaStoria(s, { tipo: 'indietro' }).trascorso], [0, 0])
  s = avanzaStoria(s, { tipo: 'pausa' })
  assert.equal(avanzaStoria(s, { tipo: 'tempo', ms: 99999 }), s)
  s = avanzaStoria(s, { tipo: 'riprendi' })
  assert.equal(s.inPausa, false)
  s = avanzaStoria(avanzaStoria(s, { tipo: 'avanti' }), { tipo: 'avanti' })
  assert.deepEqual(avanzaStoria(s, { tipo: 'rivedi' }), storiaIniziale(3))
  assert.equal(avanzaStoria(s, { tipo: 'boh' }), s)
})
```

- [ ] **Step 2: Lancia le prove e guardale fallire**

Run: `node --test tests/recapMese.test.js`
Expected: FAIL, `storiaIniziale is not a function`.

- [ ] **Step 3: Aggiungi in fondo a `src/lib/recapMese.js`**

```js
// ---- La storia (pages/RecapMesePage) ---------------------------------------
// Il visore mostra lo stato e manda gli eventi; le regole stanno qui, provate.
// L'ultima slide (il riepilogo) non va avanti da sola: si ferma piena.
export const DURATA_SLIDE = 6000

export const storiaIniziale = (totale) => ({ indice: 0, trascorso: 0, inPausa: false, totale })

export function avanzaStoria(s, e) {
  const ultima = s.indice >= s.totale - 1
  const avanti = () => (ultima ? { ...s, trascorso: DURATA_SLIDE } : { ...s, indice: s.indice + 1, trascorso: 0 })
  switch (e?.tipo) {
    case 'tempo': {
      if (s.inPausa) return s
      const trascorso = s.trascorso + e.ms
      return trascorso < DURATA_SLIDE ? { ...s, trascorso } : avanti()
    }
    case 'avanti':
      return avanti()
    case 'indietro':
      return { ...s, indice: Math.max(0, s.indice - 1), trascorso: 0 }
    case 'pausa':
      return { ...s, inPausa: true }
    case 'riprendi':
      return { ...s, inPausa: false }
    case 'rivedi':
      return storiaIniziale(s.totale)
    default:
      return s
  }
}
```

- [ ] **Step 4: Lancia le prove e guardale passare**

Run: `node --test tests/recapMese.test.js`
Expected: PASS, 14 prove.

- [ ] **Step 5: Lint, prove intere, commit**

```bash
npm run lint && npm run test
git branch --show-current   # main
git add src/lib/recapMese.js tests/recapMese.test.js
git commit -m "Recap del mese: le regole della storia (avanzaStoria)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: I pezzi di disegno e la condivisione in comune

La card dell'allenamento **deve restare identica**: qui si esporta e si sposta, non si cambia.

**Files:**
- Modify: `src/lib/recapImmagine.js` (`font`, `scritta`, `riquadro`, `sfondo`, `disegnaCorpo`, `polaroid`, `chi`, costanti `C`, `FONT`, `LH`; nuova `condividiImmagine`)
- Modify: `src/components/RecapCondivisibile.jsx:342-381` (`nomeFile`, `condividi`, `scarica`)

**Interfaces:**
- Produces (da `lib/recapImmagine`):
  - `export function font(ctx, px, peso = 400, spazio = 0)`
  - `export function scritta(ctx, t, x, y, px, colore, lh = LH)`
  - `export function riquadro(ctx, x, y, w, h, r, sfondo, bordo)`
  - `export function sfondo(ctx, foto, gruppi, scelta, soloVelo = false, pw = PW, ph = PH)`
  - `export function disegnaCorpo(ctx, x, y, h, vista, quote, calore, corpo)`
  - `export function polaroid(ctx, musica, copertina, x, y, disegna) → altezza`
  - `export function chi(ctx, { nome, avatar, commento }, x, y, w, disegna) → altezza`
  - `export const C`, `export const LH`
  - `export async function condividiImmagine(canvas, { nomeFile, titolo }) → 'condiviso'|'salvato'|'annullato'|'errore'|null`

- [ ] **Step 1: Esporta i pezzi**

In `src/lib/recapImmagine.js` metti `export` davanti a: `const C = {`, `const LH = 1.2`, `function font(`, `function scritta(`, `function riquadro(`, `function disegnaCorpo(`, `function polaroid(`, `function chi(`. Nient'altro cambia in queste funzioni.

- [ ] **Step 2: `sfondo` con la misura della pagina**

Sostituisci la funzione `sfondo` (inizia con `function sfondo(ctx, foto, gruppi, scelta, soloVelo = false) {`) con questa, che è la stessa con `pw`/`ph` al posto di `PW`/`PH`:

```js
// `pw`/`ph`: la pagina logica. Di base quella della card dell'allenamento
// (400×500); il recap del mese (lib/recapMeseImmagine) la vuole 9:16.
export function sfondo(ctx, foto, gruppi, scelta, soloVelo = false, pw = PW, ph = PH) {
  // `soloVelo`: lo sfondo VIDEO nell'anteprima (78ª, RecapCondivisibile). Il
  // video gira sotto, nella pagina; qui solo il velo, il resto trasparente.
  if (foto || soloVelo) {
    if (foto) {
      const scala = Math.max(pw / foto.width, ph / foto.height)
      const w = foto.width * scala
      const h = foto.height * scala
      ctx.drawImage(foto, (pw - w) / 2, (ph - h) / 2, w, h)
    }
    const velo = ctx.createLinearGradient(0, 0, 0, ph)
    velo.addColorStop(0, 'rgba(8,10,14,0.86)')
    velo.addColorStop(0.45, 'rgba(8,10,14,0.72)')
    velo.addColorStop(1, 'rgba(8,10,14,0.92)')
    ctx.fillStyle = velo
    ctx.fillRect(0, 0, pw, ph)
    return
  }
  const p = paletteFondo(gruppi, scelta)
  if (!p) {
    const t = rgb(C.accent)
    lineare(ctx, 0, 0, pw, ph, [
      [0, rgba(mischia(t, rgb('#0b0b0d'), 0.1))],
      [0.55, rgba(mischia(t, rgb('#111114'), 0.24))],
      [1, rgba(mischia(t, rgb('#0b0b0d'), 0.1))],
    ])
    macchia(ctx, 0.08 * pw, ph, 0.7 * pw, 0.45 * ph, t, 0.2)
    macchia(ctx, 0.85 * pw, 0.04 * ph, 0.8 * pw, 0.5 * ph, t, 0.4)
    return
  }
  const sw = pw * 1.6
  const sh = ph * 1.6
  const sx = (pw - sw) / 2
  const sy = (ph - sh) / 2
  lineare(ctx, sx, sy, sw, sh, [
    [nelloStrato(0) / 100, p.da],
    [nelloStrato(100) / 100, p.a],
  ], GRADI_FONDO)
  // Nel CSS il primo strato sta sopra: si disegnano dall'ultimo.
  for (const [c, x, y] of [...p.luci].reverse()) {
    macchia(ctx, sx + (sw * nelloStrato(x)) / 100, sy + (sh * nelloStrato(y)) / 100, (sw * LUCE.rx) / 100, (sh * LUCE.ry) / 100, rgb(c), 1)
  }
  const velo = ctx.createLinearGradient(0, 0, 0, ph)
  for (const [pos, a] of VELO_FONDO) velo.addColorStop(pos, `rgba(8,10,14,${a})`)
  ctx.fillStyle = velo
  ctx.fillRect(0, 0, pw, ph)
}
```

Prima di sostituire, confronta col testo attuale: se la funzione nel file è diversa da questa (a parte `pw`/`ph`), tieni il testo del file e cambia solo `PW`→`pw`, `PH`→`ph` dentro `sfondo`.

- [ ] **Step 3: `condividiImmagine` in fondo a `lib/recapImmagine.js`**

```js
/**
 * L'immagine fuori dall'app, come la card dell'allenamento (RecapCondivisibile):
 * il foglio di condivisione dove c'è (canShare con un file: l'unico modo
 * sicuro di saperlo), se no si scarica. Tenere premuta l'anteprima resta.
 * @returns {Promise<'condiviso'|'salvato'|'annullato'|'errore'|null>} null se il canvas non dà il file
 */
export async function condividiImmagine(canvas, { nomeFile, titolo }) {
  const blob = await canvasInBlob(canvas)
  if (!blob) return null
  const file = new File([blob], nomeFile, { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo })
      return 'condiviso'
    } catch (err) {
      // Chi chiude il foglio di condivisione non ha sbagliato niente.
      return err?.name === 'AbortError' ? 'annullato' : 'errore'
    }
  }
  scaricaImmagine(blob, nomeFile)
  return 'salvato'
}

/** Scarica il file (desktop, dove navigator.share non c'è). */
export function scaricaImmagine(blob, nomeFile) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 4: `RecapCondivisibile` la usa**

In `src/components/RecapCondivisibile.jsx` aggiungi `condividiImmagine, scaricaImmagine` all'import da `'../lib/recapImmagine'` e sostituisci `condividi` e `scarica` (oggi alle righe ~349-381) con:

```js
  const condividi = async () => {
    setErrore('')
    const esito = await condividiImmagine(canvas, { nomeFile: nomeFile(), titolo: riepCompleto.nomeGiorno })
    if (esito === 'condiviso') setFatto('Condiviso!')
    else if (esito === 'salvato') setFatto('Immagine salvata')
    else if (esito === 'errore') setErrore('Condivisione non riuscita.')
  }

  const scarica = async () => {
    const blob = await canvasInBlob(canvas)
    if (!blob) return
    scaricaImmagine(blob, nomeFile())
    setFatto('Immagine salvata')
  }
```

Cerca nel file altri usi di `scarica(` con un argomento: oggi solo `condividi` la chiamava con il blob, e ora non serve più. `canvasInBlob` resta importato (lo usa `scarica`).

- [ ] **Step 5: Verifica che la card dell'allenamento non sia cambiata**

```bash
npm run lint && npm run test
```
Expected: nessun errore nuovo, tutte le prove verdi. Poi `npm run dev`, apri un allenamento dal calendario → recap da condividere: la card deve essere quella di prima, e "Condividi" (su desktop "Scarica") deve salvare `allenamento-AAAA-MM-GG.png`. Se l'utente preferisce provarla lui (memoria: niente prove nel browser per le piccole cose), chiediglielo.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # main
git add src/lib/recapImmagine.js src/components/RecapCondivisibile.jsx
git commit -m "recapImmagine: pezzi di disegno esportati, sfondo di ogni misura, condividiImmagine

La card dell'allenamento resta uguale: serve al recap del mese.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: La card del mese su canvas

**Files:**
- Create: `src/lib/recapMeseImmagine.js`
- Create (NON si committa): `scratchpad/prova-recap-mese.html`

**Interfaces:**
- Consumes: `Recap`, `caselleCard`, `celleDelMese` (Task 1-2); `font`, `scritta`, `riquadro`, `sfondo`, `disegnaCorpo`, `polaroid`, `chi`, `C`, `LH` (Task 4); `quoteZone` (`./corpoImmagini`).
- Produces:
  - `LARGHEZZA_MESE = 1080`, `ALTEZZA_MESE = 1920`
  - `disegnaRecapMese(r: Recap, { nome = '', avatar = null, copertina = null, corpo } = {}) → HTMLCanvasElement`
  - `nomeFileMese(r) → 'recap-ottobre-2026.png'`

- [ ] **Step 1: Scrivi `src/lib/recapMeseImmagine.js`**

```js
// ---------------------------------------------------------------------------
// La CARD del recap del mese (lib/recapMese): 1080×1920, il formato della
// storia di Instagram. Come la card dell'allenamento (lib/recapImmagine)
// l'anteprima È l'immagine che si esporta, e i pezzi di disegno sono i suoi.
// Pagina logica 400 di larghezza, alta 400×16/9.
// ---------------------------------------------------------------------------

import { C, LH, chi, disegnaCorpo, font, polaroid, riquadro, scritta, sfondo } from './recapImmagine'
import { quoteZone, PROPORZIONE } from './corpoImmagini'
import { caselleCard, celleDelMese } from './recapMese'

export const LARGHEZZA_MESE = 1080
export const ALTEZZA_MESE = 1920
const PW = 400
const PH = (PW * ALTEZZA_MESE) / LARGHEZZA_MESE
const K = LARGHEZZA_MESE / PW
const LATI = 24

export const nomeFileMese = (r) => `recap-${r.nomeMese}-${r.anno}.png`

const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1)

// Le caselle coi numeri: due per riga, larghe uguali; una dispari prende la riga.
function caselle(ctx, lista, x, y, w) {
  const gap = 10
  const h = 74
  lista.forEach((c, i) => {
    const sola = lista.length % 2 === 1 && i === lista.length - 1
    const cw = sola ? w : (w - gap) / 2
    const cx = sola ? x : x + (i % 2) * (cw + gap)
    const cy = y + Math.floor(i / 2) * (h + gap)
    riquadro(ctx, cx, cy, cw, h, 14, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)')
    font(ctx, 26, 800)
    scritta(ctx, c.valore, cx + 14, cy + 12, 26, C.bianco)
    font(ctx, 12, 600)
    scritta(ctx, c.etichetta, cx + 14, cy + 12 + 26 * LH + 2, 12, C.muted)
  })
  return Math.ceil(lista.length / 2) * (h + gap) - gap
}

// Il mese in griglia, settimana da lunedì: i giorni allenati sono pieni.
function calendario(ctx, r, x, y, w) {
  const celle = celleDelMese(r.anno, r.mese)
  const fatti = new Set(r.giorni)
  const lato = w / 7
  const raggio = Math.min(13, lato / 2 - 2)
  font(ctx, 11, 700)
  ctx.textAlign = 'center'
  celle.forEach((g, i) => {
    if (!g) return
    const cx = x + (i % 7) * lato + lato / 2
    const cy = y + Math.floor(i / 7) * lato + lato / 2
    ctx.beginPath()
    ctx.arc(cx, cy, raggio, 0, Math.PI * 2)
    ctx.fillStyle = fatti.has(g) ? C.accent : 'rgba(255,255,255,0.06)'
    ctx.fill()
    scritta(ctx, String(g), cx, cy - (11 * LH) / 2, 11, fatti.has(g) ? '#08121a' : C.faint)
  })
  ctx.textAlign = 'left'
  return (celle.length / 7) * lato
}

/**
 * La card del mese. ⚠️ Il canvas è sincrono: corpo e copertina devono essere
 * già caricati (useCorpoPronto, caricaImmagineDaUrl), se no mancano e chi la
 * mostra la ridisegna quando arrivano — come la card dell'allenamento.
 */
export function disegnaRecapMese(r, { nome = '', avatar = null, copertina = null, corpo } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = LARGHEZZA_MESE
  canvas.height = ALTEZZA_MESE
  const ctx = canvas.getContext('2d')
  ctx.scale(K, K)
  sfondo(ctx, null, r.gruppi, null, false, PW, PH)

  const W = PW - 2 * LATI
  let y = 34
  font(ctx, 13, 800, 1.2)
  scritta(ctx, 'IL MIO MESE', LATI, y, 13, C.accent)
  y += 13 * LH + 4
  font(ctx, 40, 800)
  scritta(ctx, `${maiuscola(r.nomeMese)} ${r.anno}`, LATI, y, 40, C.bianco)
  y += 40 * LH + 22

  y += caselle(ctx, caselleCard(r), LATI, y, W) + 22
  y += calendario(ctx, r, LATI, y, W) + 22

  // Il corpo coi muscoli del mese, e accanto la canzone se c'è.
  if (r.gruppi.length) {
    const fh = 150
    const quote = quoteZone(r.gruppi)
    disegnaCorpo(ctx, LATI, y, fh, 'fronte', quote, true, corpo)
    disegnaCorpo(ctx, LATI + fh * PROPORZIONE + 8, y, fh, 'dietro', quote, true, corpo)
    if (r.musica) polaroid(ctx, r.musica, copertina, PW - LATI - 86, y, true)
    y += fh + 22
  } else if (r.musica) {
    y += polaroid(ctx, r.musica, copertina, LATI, y, true) + 22
  }

  // In fondo chi l'ha fatto e il nome dell'app, come la card dell'allenamento.
  const persona = { nome: String(nome || '').trim(), avatar, commento: '' }
  const hChi = chi(ctx, persona, LATI, 0, W, false)
  if (hChi) chi(ctx, persona, LATI, PH - 34 - hChi, W, true)
  font(ctx, 11, 700, 0.8)
  ctx.textAlign = 'right'
  scritta(ctx, 'PROGETTOPALESTRA.IT', PW - LATI, PH - 34 - 11 * LH, 11, C.faint)
  ctx.textAlign = 'left'
  return canvas
}
```

⚠️ Verifica prima: `PROPORZIONE` è esportato da `lib/corpoImmagini` (lo importa già `recapImmagine`); `C.bianco`, `C.accent`, `C.muted`, `C.faint` esistono in `C`. Se il contenuto sfora in altezza (mese con tutto), riduci `fh` o i `+ 22`: la prova di Step 2 lo mostra.

- [ ] **Step 2: Guarda i PNG con Chrome headless (file di prova, non si committa)**

Crea `scratchpad/prova-recap-mese.html`:

```html
<!doctype html>
<meta charset="utf-8" />
<body style="margin:0;background:#111;display:flex;gap:12px;flex-wrap:wrap">
<script type="module">
  import { recapDelMese } from '/src/lib/recapMese.js'
  import { disegnaRecapMese } from '/src/lib/recapMeseImmagine.js'
  const v = (g, kg, gruppi = ['petto']) => ({
    data: `2026-10-${String(g).padStart(2, '0')}T18:00:00`, nomeGiorno: 'Giorno A', durataSec: 3500,
    musica: g % 2 ? { id: '1769285312', titolo: 'SOUTH OF FRANCE', artista: 'Future', copertina: '' } : undefined,
    esercizi: [{ nome: 'Panca', gruppi, schema: { ripetizioni: '8', carico: `${kg} kg` }, sets: [{ colore: 'rosso', kg, rip: 8 }] }],
  })
  const pieno = [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29].map((g, i) => v(g, 60 + i, i % 2 ? ['gambe'] : ['petto', 'tricipiti']))
  const casi = { pieno, uno: [v(14, 80)], senzaNumeri: [{ data: '2026-10-05T10:00:00', esercizi: [] }] }
  for (const [nome, voci] of Object.entries(casi)) {
    const r = recapDelMese(voci, { anno: 2026, mese: 9 }, { schede: [{ completamenti: voci }] })
    const img = new Image()
    img.src = disegnaRecapMese(r, { nome: 'baggianis' }).toDataURL()
    img.style.width = '360px'
    img.title = nome
    document.body.append(img)
  }
  document.title = 'pronto'
</script>
```

Poi, con `npm run dev` acceso (porta 5173):

```bash
timeout 60 google-chrome --headless=new --no-sandbox --disable-gpu --window-size=1150,700 \
  --virtual-time-budget=10000 --screenshot=<scratchpad della sessione>/recap-mese.png \
  http://localhost:5173/scratchpad/prova-recap-mese.html
```

Guarda il PNG (Read sul file). Controlla: niente sfora in basso, le caselle si ricompongono (pieno 4, uno 3, senzaNumeri 1 sola a tutta riga), il calendario ha i giorni giusti, il corpo c'è (se no: le immagini del corpo non sono ancora caricate nella pagina di prova, ed è normale — nell'app le aspetta `useCorpoPronto`). Mostra il PNG all'utente prima di andare avanti.

- [ ] **Step 3: Lint, prove, commit (senza il file di prova)**

```bash
npm run lint && npm run test
git branch --show-current   # main
git add src/lib/recapMeseImmagine.js
git status --short          # scratchpad/prova-recap-mese.html deve restare fuori
git commit -m "Recap del mese: la card 1080x1920 (lib/recapMeseImmagine)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Il visore

**Files:**
- Create: `src/components/SlideRecapMese.jsx`
- Create: `src/pages/RecapMesePage.jsx`
- Modify: `src/lib/router.js` (parse: dopo la riga `if (seg[0] === 'calendario') …`; `routes`: dopo `calendario: …`)
- Modify: `src/App.jsx` (import, `case 'recap-mese'` vicino a `case 'calendario'`, `senzaBarra` alla riga ~250)
- Modify: `src/index.css` (in fondo)

**Interfaces:**
- Consumes: tutto `lib/recapMese` (Task 1-3), `disegnaRecapMese`, `nomeFileMese` (Task 5), `condividiImmagine`, `caricaAvatar`, `caricaImmagineDaUrl` (`lib/recapImmagine`), `useCorpoPronto` (`lib/corpoImmagini`), `raccogliCompletamenti` (`lib/oggi`), `stileFondo`, `durataLunga`, `formattaMigliaia`, `dataLunga` (`lib/recap`), `CorpoAllenato` (default di `components/CorpoAllenato`), `PolaroidMusica` (`components/ChipMusica`), `IconClose` (`components/icons`), `useStore().schede`, `useAccount().utenteCorrente` (`{ id, username, nome }`).
- Produces: `routes.recapMese({anno, mese}) → '/recap-mese/AAAA-MM'`; rotta `{ name: 'recap-mese', periodo: 'AAAA-MM' }`.

- [ ] **Step 1: La rotta**

In `src/lib/router.js`, nel parse, subito dopo `if (seg[0] === 'calendario') return { name: 'calendario' }`:

```js
  // Il recap del mese (pages/RecapMesePage): '/recap-mese/2026-10'.
  if (seg[0] === 'recap-mese' && seg[1]) return { name: 'recap-mese', periodo: seg[1] }
```

In `routes`, dopo `calendario: () => '/calendario',`:

```js
  recapMese: ({ anno, mese }) => `/recap-mese/${anno}-${String(mese + 1).padStart(2, '0')}`,
```

In `src/App.jsx`: `import RecapMesePage from './pages/RecapMesePage'` con gli altri import di pagine; nello switch, dopo il `case 'calendario'`:

```jsx
    case 'recap-mese':
      return <RecapMesePage key={route.periodo} periodo={route.periodo} />
```

e `const senzaBarra = ['allenamento', 'chat', 'recap-mese']`.

- [ ] **Step 2: Il contenuto delle slide**

Crea `src/components/SlideRecapMese.jsx`:

```jsx
import CorpoAllenato from './CorpoAllenato'
import { PolaroidMusica } from './ChipMusica'
import { celleDelMese, durataLunga, formattaMigliaia } from '../lib/recapMese'
import { dataLunga } from '../lib/recap'

// ---------------------------------------------------------------------------
// Il contenuto di UNA slide del recap del mese (pages/RecapMesePage). Testo
// vero, con un titolo: lo legge anche uno screen reader. Le animazioni
// (.rm-entra) partono solo sulla slide attuale, e non con "riduci movimento".
// ---------------------------------------------------------------------------

export default function SlideRecapMese({ id, r, nome, riepilogo = null }) {
  switch (id) {
    case 'intro':
      return (
        <Slide titolo={`Il tuo ${r.nomeMese}`} sopra={nome ? `@${nome}` : ''}>
          <p className="rm-sotto">Com’è andato il mese, in qualche numero.</p>
        </Slide>
      )
    case 'allenamenti':
      return (
        <Slide sopra={`A ${r.nomeMese}`} grande={r.allenamenti} titolo={r.allenamenti === 1 ? 'allenamento fatto' : 'allenamenti fatti'}>
          <Calendario r={r} />
          {r.inPiu && <p className="rm-sotto">{`+${r.inPiu} rispetto a ${r.nomeMesePrima}`}</p>}
        </Slide>
      )
    case 'tempo':
      return (
        <Slide sopra="In palestra" grande={durataLunga(r.durataSec)} titolo="di allenamento">
          {r.piuLungo && (
            <p className="rm-sotto">{`Il più lungo: ${r.piuLungo.nome}, ${dataLunga(r.piuLungo.data)} (${durataLunga(r.piuLungo.durataSec)})`}</p>
          )}
        </Slide>
      )
    case 'volume':
      return (
        <Slide sopra="Sollevati" grande={`${formattaMigliaia(r.volume)} kg`} titolo="in tutto il mese">
          {r.pesoMax && <p className="rm-sotto">{`Il peso più alto: ${r.pesoMax.testo} a ${r.pesoMax.esercizio}`}</p>}
        </Slide>
      )
    case 'muscoli':
      return (
        <Slide sopra="I muscoli del mese" titolo={r.gruppi.slice(0, 3).map((g) => g.label).join(', ')}>
          <CorpoAllenato gruppi={r.gruppi} calore altezza={220} />
        </Slide>
      )
    case 'sforzo': {
      const { verde, giallo, rosso, tot } = r.sforzo
      return (
        <Slide sopra="Lo sforzo" grande={tot} titolo="serie">
          <div className="rm-barra" role="img" aria-label={`${verde} facili, ${giallo} medie, ${rosso} dure`}>
            <span className="rm-verde" style={{ flex: verde }} />
            <span className="rm-giallo" style={{ flex: giallo }} />
            <span className="rm-rosso" style={{ flex: rosso }} />
          </div>
          <p className="rm-sotto">{`${verde} facili · ${giallo} medie · ${rosso} dure`}</p>
          {r.piuDuro && <p className="rm-sotto">{`Il più duro: ${r.piuDuro.nome}, ${dataLunga(r.piuDuro.data)}`}</p>}
        </Slide>
      )
    }
    case 'record':
      return (
        <Slide sopra="Record" grande={r.numRecord} titolo={r.numRecord === 1 ? 'record battuto' : 'record battuti'}>
          <ul className="rm-elenco">
            {r.record.map((x) => (
              <li key={x.esercizio + x.data}>
                <strong>{x.esercizio}</strong> {x.carico}
              </li>
            ))}
          </ul>
        </Slide>
      )
    case 'abitudini': {
      const a = r.abitudini
      return (
        <Slide sopra="Le abitudini" titolo={a.esercizio ? a.esercizio.nome : `Il ${a.giorno}`}>
          {a.esercizio && <p className="rm-sotto">{`L’esercizio più fatto: ${a.esercizio.volte} volte`}</p>}
          <p className="rm-sotto">{`Il giorno preferito: il ${a.giorno}`}</p>
          {a.settimaneDiFila > 1 && <p className="rm-sotto">{`${a.settimaneDiFila} settimane di fila`}</p>}
        </Slide>
      )
    }
    case 'cardio':
      return <Slide sopra="Cardio" grande={r.minutiCardio} titolo="minuti di cardio" />
    case 'canzone':
      return (
        <Slide sopra="La canzone del mese" titolo={r.musica.titolo}>
          <PolaroidMusica musica={r.musica} />
        </Slide>
      )
    case 'riepilogo':
      return (
        <Slide sopra={`Il tuo ${r.nomeMese}`} titolo="Tutto in una card">
          {riepilogo}
        </Slide>
      )
    default:
      return null
  }
}

function Slide({ sopra = '', grande = null, titolo, children }) {
  return (
    <div className="rm-slide-dentro">
      {sopra && <p className="rm-sopra rm-entra">{sopra}</p>}
      {grande != null && <p className="rm-grande rm-entra">{grande}</p>}
      <h2 className="rm-titolo rm-entra">{titolo}</h2>
      <div className="rm-corpo rm-entra">{children}</div>
    </div>
  )
}

function Calendario({ r }) {
  const fatti = new Set(r.giorni)
  return (
    <div className="rm-cal" aria-hidden="true">
      {celleDelMese(r.anno, r.mese).map((g, i) => (
        <span key={i} className={'rm-cal-g' + (g && fatti.has(g) ? ' fatto' : '')} style={{ '--i': i }}>
          {g || ''}
        </span>
      ))}
    </div>
  )
}
```

`durataLunga` e `formattaMigliaia` arrivano da `lib/recapMese`, che li riesporta (Task 1).

- [ ] **Step 3: La pagina**

Crea `src/pages/RecapMesePage.jsx`:

```jsx
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { stileFondo } from '../lib/recap'
import { DURATA_SLIDE, avanzaStoria, meseDaPercorso, meseFinito, recapDelMese, slideDelMese, storiaIniziale } from '../lib/recapMese'
import { disegnaRecapMese, nomeFileMese } from '../lib/recapMeseImmagine'
import { caricaAvatar, caricaImmagineDaUrl, condividiImmagine } from '../lib/recapImmagine'
import { useCorpoPronto } from '../lib/corpoImmagini'
import SlideRecapMese from '../components/SlideRecapMese'
import { IconClose } from '../components/icons'

// ---------------------------------------------------------------------------
// Il RECAP DEL MESE come una storia (spec 2026-10-28): barrette in alto, ~6"
// a slide, tocco a destra avanti e a sinistra indietro, tenere premuto mette
// in pausa. È una PAGINA (/recap-mese/AAAA-MM) e non una finestra: indietro,
// anche quello di Android (lib/nativo), la chiude da solo.
// Si apre un mese finito con almeno un allenamento; quello in corso solo in
// locale, per provarlo. Le regole della storia stanno in lib/recapMese.
// ---------------------------------------------------------------------------

const fermo = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RecapMesePage({ periodo: testo }) {
  const { schede } = useStore()
  const { utenteCorrente } = useAccount()
  const r = useMemo(() => {
    const periodo = meseDaPercorso(testo)
    if (!periodo || !(meseFinito(periodo) || import.meta.env.DEV)) return null
    const voci = [...raccogliCompletamenti(schede).values()].flat()
    return recapDelMese(voci, periodo, { schede })
  }, [schede, testo])

  useEffect(() => {
    if (!r) navigate(routes.calendario(), { sostituisci: true })
  }, [r])
  if (!r) return null

  const slide = slideDelMese(r)
  const nome = utenteCorrente?.username || utenteCorrente?.nome || ''
  // `key`: se cambiano le slide (dati riletti) la storia riparte giusta.
  return <Storia key={slide.join()} r={r} slide={slide} nome={nome} ioId={utenteCorrente?.id || null} />
}

function Storia({ r, slide, nome, ioId }) {
  const [s, manda] = useReducer(avanzaStoria, slide.length, storiaIniziale)
  const id = slide[s.indice]

  // Il tempo passato davvero: barretta e slide non si sfasano. In secondo
  // piano (altra app, altra scheda) si ferma.
  useEffect(() => {
    if (fermo()) return
    let ultimo = performance.now()
    let giro = requestAnimationFrame(function passo(t) {
      manda({ tipo: 'tempo', ms: t - ultimo })
      ultimo = t
      giro = requestAnimationFrame(passo)
    })
    const vista = () => {
      ultimo = performance.now()
      manda({ tipo: document.hidden ? 'pausa' : 'riprendi' })
    }
    document.addEventListener('visibilitychange', vista)
    return () => {
      cancelAnimationFrame(giro)
      document.removeEventListener('visibilitychange', vista)
    }
  }, [])

  const chiudi = () => (window.history.length > 1 ? window.history.back() : navigate(routes.calendario()))

  useEffect(() => {
    const tasto = (e) => {
      if (e.key === 'ArrowRight') manda({ tipo: 'avanti' })
      else if (e.key === 'ArrowLeft') manda({ tipo: 'indietro' })
      else if (e.key === ' ') {
        e.preventDefault()
        manda({ tipo: s.inPausa ? 'riprendi' : 'pausa' })
      } else if (e.key === 'Escape') chiudi()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  })

  // Tenere premuto = pausa; un tocco breve = avanti (terzo destro) o
  // indietro (terzo sinistro).
  const premuto = useRef(null)
  const giu = () => {
    const p = { tenuto: false }
    p.timer = setTimeout(() => {
      p.tenuto = true
      manda({ tipo: 'pausa' })
    }, 200)
    premuto.current = p
  }
  const su = (e) => {
    const p = premuto.current
    premuto.current = null
    if (!p) return
    clearTimeout(p.timer)
    if (p.tenuto) return manda({ tipo: 'riprendi' })
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - left) / width
    if (x < 1 / 3) manda({ tipo: 'indietro' })
    else if (x > 2 / 3) manda({ tipo: 'avanti' })
  }
  const via = () => {
    const p = premuto.current
    premuto.current = null
    if (p) clearTimeout(p.timer)
    if (p?.tenuto) manda({ tipo: 'riprendi' })
  }

  return (
    <div className="rm-pagina" style={stileFondo(r.gruppi) || undefined}>
      <div className="rm-storia">
        <div className="rm-barrette" aria-label={`Slide ${s.indice + 1} di ${slide.length}`}>
          {slide.map((x, i) => (
            <span key={x} className="rm-barretta">
              <span style={{ width: `${i < s.indice ? 100 : i > s.indice ? 0 : (s.trascorso / DURATA_SLIDE) * 100}%` }} />
            </span>
          ))}
        </div>
        <button type="button" className="rm-chiudi" aria-label="Chiudi il recap" onClick={chiudi}>
          <IconClose width={20} height={20} />
        </button>
        <section
          key={id}
          className={'rm-slide' + (fermo() ? ' rm-ferma' : '')}
          aria-live="polite"
          onPointerDown={giu}
          onPointerUp={su}
          onPointerCancel={via}
          onPointerLeave={via}
        >
          <SlideRecapMese
            id={id}
            r={r}
            nome={nome}
            riepilogo={id === 'riepilogo' ? <Riepilogo r={r} nome={nome} ioId={ioId} onRivedi={() => manda({ tipo: 'rivedi' })} /> : null}
          />
        </section>
      </div>
    </div>
  )
}

// L'ultima slide: la card (lo stesso PNG che si condivide) e i tasti. I tocchi
// qui non devono muovere la storia: si fermano prima di arrivare alla slide.
function Riepilogo({ r, nome, ioId, onRivedi }) {
  const [avatar, setAvatar] = useState(null)
  const [copertina, setCopertina] = useState(null)
  const [esito, setEsito] = useState('')
  const corpoPronto = useCorpoPronto(undefined)
  useEffect(() => {
    let vivo = true
    caricaAvatar(ioId).then((img) => vivo && setAvatar(img))
    if (r.musica?.copertina) caricaImmagineDaUrl(r.musica.copertina).then((img) => vivo && setCopertina(img)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [ioId, r.musica?.copertina])
  // corpoPronto fra le dipendenze: arrivate le immagini del corpo si ridisegna.
  const canvas = useMemo(() => disegnaRecapMese(r, { nome, avatar, copertina }), [r, nome, avatar, copertina, corpoPronto])
  const url = useMemo(() => canvas.toDataURL('image/png'), [canvas])
  const puoCondividere = typeof navigator !== 'undefined' && !!navigator.canShare

  const condividi = async () => {
    const e = await condividiImmagine(canvas, { nomeFile: nomeFileMese(r), titolo: `Il mio ${r.nomeMese}` })
    setEsito(e === 'condiviso' ? 'Condiviso!' : e === 'salvato' ? 'Immagine salvata' : e === 'errore' ? 'Condivisione non riuscita.' : '')
  }
  const ferma = (e) => e.stopPropagation()

  return (
    <div className="rm-riepilogo" onPointerDown={ferma} onPointerUp={ferma}>
      <img className="rm-card" src={url} alt={`Il recap di ${r.nomeMese} ${r.anno}`} />
      <div className="rm-tasti">
        <button type="button" className="btn btn-primary" onClick={condividi}>
          {puoCondividere ? 'Condividi' : 'Scarica'}
        </button>
        <button type="button" className="btn" onClick={onRivedi}>
          Rivedi
        </button>
      </div>
      {esito && <p className="rm-sotto">{esito}</p>}
    </div>
  )
}
```

⚠️ Controlla prima il nome della classe del tasto principale nel repo (`grep -n "btn-primary\|btn btn-" src/index.css | head`) e usa quella.

- [ ] **Step 4: Gli stili**

In fondo a `src/index.css`:

```css
/* ---- Recap del mese (pages/RecapMesePage) ------------------------------
   Una storia a schermo intero: barrette in alto, la slide 9:16 al centro.
   Lo sfondo è quello della card (lib/recap stileFondo); qui sopra un velo. */
.rm-pagina {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b0b0d;
  color: #f3f5f9;
}
.rm-storia {
  position: relative;
  width: min(100vw, calc(100dvh * 9 / 16));
  height: min(100dvh, calc(100vw * 16 / 9));
  background: rgba(8, 10, 14, 0.55);
  overflow: hidden;
}
.rm-barrette {
  position: absolute;
  top: calc(var(--safe-top) + 10px);
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 2;
}
.rm-barretta {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}
.rm-barretta > span {
  display: block;
  height: 100%;
  background: #fff;
}
.rm-chiudi {
  position: absolute;
  top: calc(var(--safe-top) + 22px);
  right: 10px;
  z-index: 2;
  background: none;
  border: 0;
  color: #fff;
  padding: 8px;
}
.rm-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 72px 24px 32px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.rm-slide-dentro {
  width: 100%;
}
.rm-sopra {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5cc8f5;
}
.rm-grande {
  margin: 0;
  font-size: clamp(56px, 18vw, 96px);
  font-weight: 800;
  line-height: 1;
}
.rm-titolo {
  margin: 6px 0 18px;
  font-size: 26px;
  font-weight: 800;
}
.rm-sotto {
  margin: 8px 0 0;
  font-size: 16px;
  color: #c9d1dd;
}
.rm-elenco {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 17px;
  line-height: 1.8;
}
.rm-barra {
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}
.rm-verde { background: var(--good); }
.rm-giallo { background: var(--sforzo-giallo); }
.rm-rosso { background: var(--sforzo-rosso); }
.rm-cal {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.rm-cal-g {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.06);
}
.rm-cal-g:empty { background: none; }
.rm-cal-g.fatto {
  background: #5cc8f5;
  color: #08121a;
  font-weight: 800;
  animation: rm-accendi 0.4s both;
  animation-delay: calc(var(--i) * 25ms);
}
.rm-entra {
  animation: rm-entra 0.5s both;
}
.rm-entra:nth-child(2) { animation-delay: 0.08s; }
.rm-entra:nth-child(3) { animation-delay: 0.16s; }
.rm-entra:nth-child(4) { animation-delay: 0.24s; }
.rm-riepilogo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.rm-card {
  width: 100%;
  max-height: 60dvh;
  object-fit: contain;
  border-radius: 14px;
}
.rm-tasti {
  display: flex;
  gap: 10px;
}
@keyframes rm-entra {
  from { opacity: 0; transform: translateY(14px); }
}
@keyframes rm-accendi {
  from { opacity: 0; transform: scale(0.6); }
}
@media (prefers-reduced-motion: reduce) {
  .rm-entra,
  .rm-cal-g.fatto {
    animation: none;
  }
}
```

- [ ] **Step 5: Prova in locale**

```bash
npm run lint && npm run test
npm run dev
```

Apri `http://localhost:5173/recap-mese/2026-10` col proprio account (`.env` su produzione: il recap non scrive niente). Controlla: le slide vanno avanti da sole (~6"), tocco a destra/sinistra, tenere premuto ferma, ← → spazio Esc su desktop, l'ultima slide si ferma con la card, "Scarica"/"Condividi" salva `recap-ottobre-2026.png`, "Rivedi" riparte, ✕ e indietro tornano da dove si veniva, `/recap-mese/2026-13` e `/recap-mese/2026-08` (vuoto) tornano al calendario. Con "riduci movimento" del sistema acceso, niente avanzamento automatico.

- [ ] **Step 6: Commit**

```bash
git branch --show-current   # main
git add src/components/SlideRecapMese.jsx src/pages/RecapMesePage.jsx src/lib/router.js src/App.jsx src/index.css
git commit -m "Recap del mese: la storia a schermo intero (/recap-mese/AAAA-MM)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Il tasto del calendario

**Files:**
- Modify: `src/pages/CalendarPage.jsx` (import; via `celleMese` alle righe ~46-56; il tasto dopo `.cal-nav`, riga ~170)
- Modify: `src/index.css` (in fondo)

**Interfaces:**
- Consumes: `celleDelMese`, `meseFinito`, `MESI` (lib/recapMese), `routes.recapMese` (Task 6). Nel componente: `vista = { anno, mese }`, `nelMese` (numero di allenamenti del mese guardato).

- [ ] **Step 1: Una sola funzione per le celle**

In `src/pages/CalendarPage.jsx` togli la funzione locale `celleMese` (commento compreso) e importa `celleDelMese` da `'../lib/recapMese'`; cambia l'uso in `const celle = useMemo(() => celleDelMese(vista.anno, vista.mese), [vista])`. Le due funzioni sono identiche (stessa regola: da lunedì, null = vuota).

- [ ] **Step 2: Il tasto**

Aggiungi all'import: `import { MESI as MESI_MINUSCOLI, celleDelMese, meseFinito } from '../lib/recapMese'` (il file ha già un suo `MESI`, maiuscolo). Subito dopo la chiusura di `<div className="cal-nav">…</div>`:

```jsx
        {/* Il recap del mese (pages/RecapMesePage): per un mese finito con
            almeno un allenamento; in locale anche per quello in corso. */}
        {nelMese > 0 && (meseFinito(vista) || import.meta.env.DEV) && (
          <button className="cal-recap" onClick={() => navigate(routes.recapMese(vista))}>
            {`Recap di ${MESI_MINUSCOLI[vista.mese]}`}
            <IconChevron width={16} height={16} />
          </button>
        )}
```

- [ ] **Step 3: Lo stile, in fondo a `src/index.css`**

```css
/* Il tasto "Recap di ottobre" sotto la testata del calendario. */
.cal-recap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 4px 0 10px;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 800;
  position: relative;
}
```

- [ ] **Step 4: Prova e commit**

```bash
npm run lint && npm run test
```
In locale: sul calendario di ottobre 2026 c'è "Recap di ottobre" e apre la storia; su un mese senza allenamenti non c'è. Il calendario disegna i giorni come prima.

```bash
git branch --show-current   # main
git add src/pages/CalendarPage.jsx src/index.css
git commit -m "Calendario: il tasto \"Recap di …\" per i mesi finiti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: La card della Home

**Files:**
- Create: `src/components/CardRecapMese.jsx`
- Modify: `src/pages/InizioPage.jsx` (import; `<CardRecapMese />` dopo `<CardAppIphone />`, riga ~286)
- Modify: `src/index.css` (in fondo)
- Test: `tests/recapMese.test.js`

**Interfaces:**
- Consumes: `recapDelMese`, `mesePrima`, `percorsoMese`, `durataLunga`, `MESI` (lib/recapMese); `useStore()` → `{ schede, preferenze, aggiornaPreferenze }` (`aggiornaPreferenze` accetta una funzione `(prev) => patch`); `raccogliCompletamenti` (lib/oggi); `routes.recapMese`.
- Produces: `chiaveAvvisoMese({anno, mese}) → 'recapMese:AAAA-MM'` e `meseDaAnnunciare(oggi = new Date()) → {anno, mese}|null` (null dopo il 7) in `lib/recapMese`.

- [ ] **Step 1: Le prove che falliscono**

Aggiungi `chiaveAvvisoMese, meseDaAnnunciare` all'import, poi in fondo:

```js
test('la card della Home: il mese prima, dal 1° al 7', () => {
  assert.deepEqual(meseDaAnnunciare(new Date(2026, 10, 1)), OTTOBRE)
  assert.deepEqual(meseDaAnnunciare(new Date(2026, 10, 7, 23)), OTTOBRE)
  assert.equal(meseDaAnnunciare(new Date(2026, 10, 8)), null)
  assert.deepEqual(meseDaAnnunciare(new Date(2027, 0, 3)), { anno: 2026, mese: 11 })
  assert.equal(chiaveAvvisoMese(OTTOBRE), 'recapMese:2026-10')
})
```

Run: `node --test tests/recapMese.test.js` → FAIL (`meseDaAnnunciare is not a function`).

- [ ] **Step 2: Aggiungi in fondo a `src/lib/recapMese.js`**

```js
// ---- La card della Home (components/CardRecapMese) -------------------------
// Dal 1° al 7 del mese si annuncia il recap del mese prima. "Visto" sta nelle
// preferenze del profilo (avvisi), una chiave per mese: vale su tutti i telefoni.
export const chiaveAvvisoMese = (periodo) => `recapMese:${percorsoMese(periodo)}`

export function meseDaAnnunciare(oggi = new Date()) {
  if (oggi.getDate() > 7) return null
  return mesePrima({ anno: oggi.getFullYear(), mese: oggi.getMonth() })
}
```

Run: `node --test tests/recapMese.test.js` → PASS.

- [ ] **Step 3: Il componente**

Crea `src/components/CardRecapMese.jsx`:

```jsx
import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { chiaveAvvisoMese, durataLunga, meseDaAnnunciare, recapDelMese } from '../lib/recapMese'
import { IconChevron, IconClose } from './icons'

// ---------------------------------------------------------------------------
// Sulla Home, dal 1° al 7 del mese: "Il tuo ottobre è pronto" (pages/
// RecapMesePage). Una card e non una finestra: quelle all'apertura sono già
// una catena (AvvisoMuscoli → AvvisoCanzone). Apri e ✕ la tolgono per sempre,
// su tutti i telefoni (preferenze.avvisi, una chiave per mese).
// ---------------------------------------------------------------------------

// `oggi` serve solo a provarla in un altro giorno (Task 8, Step 5): di base adesso.
export default function CardRecapMese({ oggi }) {
  const { schede, preferenze, aggiornaPreferenze } = useStore()
  const periodo = meseDaAnnunciare(oggi)
  const chiave = periodo ? chiaveAvvisoMese(periodo) : ''
  const visto = !periodo || !!preferenze?.avvisi?.[chiave]
  const r = useMemo(
    () => (visto ? null : recapDelMese([...raccogliCompletamenti(schede).values()].flat(), meseDaAnnunciare(oggi))),
    [schede, visto, oggi],
  )
  if (!r) return null

  const segna = () => aggiornaPreferenze((p) => ({ avvisi: { ...p.avvisi, [chiave]: 'visto' } }))
  const apri = () => {
    segna()
    navigate(routes.recapMese(periodo))
  }
  const anteprima = [`${r.allenamenti} ${r.allenamenti === 1 ? 'allenamento' : 'allenamenti'}`, r.durataSec && durataLunga(r.durataSec)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="riquadro card-recap-mese">
      <button type="button" className="card-recap-mese-apri" onClick={apri}>
        <span className="grow">
          <strong>{`Il tuo ${r.nomeMese} è pronto`}</strong>
          <span className="card-recap-mese-sotto">{anteprima}</span>
        </span>
        <IconChevron />
      </button>
      <button type="button" className="btn btn-sm" aria-label="Non mostrarlo più" onClick={segna}>
        <IconClose width={15} height={15} />
      </button>
    </div>
  )
}
```

Qui i record non servono (solo allenamenti e durata): `recapDelMese` senza `schede` va bene e costa meno.

- [ ] **Step 4: Montala e dalle lo stile**

In `src/pages/InizioPage.jsx`: `import CardRecapMese from '../components/CardRecapMese'` e `<CardRecapMese />` subito dopo `<CardAppIphone />`.

In fondo a `src/index.css`:

```css
/* "Il tuo ottobre è pronto" sulla Home (components/CardRecapMese). */
.card-recap-mese {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-recap-mese-apri {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  padding: 0;
  color: inherit;
  text-align: left;
}
.card-recap-mese-sotto {
  display: block;
  font-size: 13px;
  color: var(--muted);
}
```

- [ ] **Step 5: Prova e commit**

```bash
npm run lint && npm run test
```

La card si vede solo dal 1° al 7: per provarla oggi, in locale, scrivi per un momento `<CardRecapMese oggi={new Date(2026, 10, 1)} />` in InizioPage, guarda la Home, tocca Apri (si apre ottobre) e torna: la card non c'è più. **Rimetti `<CardRecapMese />` prima del commit.** ⚠️ Con `.env` su produzione "visto" si scrive nelle preferenze vere del proprio profilo: va bene (è il proprio), ma la card di ottobre non tornerà più nemmeno il 1° novembre. Per riaverla, togliere la chiave `recapMese:2026-10` da `preferenze.avvisi` (chiedere all'utente prima di scrivere nel database).

```bash
git branch --show-current   # main
grep -n "CardRecapMese oggi" src/pages/InizioPage.jsx && echo "RIMETTI <CardRecapMese />"
git add src/components/CardRecapMese.jsx src/pages/InizioPage.jsx src/lib/recapMese.js tests/recapMese.test.js src/index.css
git commit -m "Home: \"Il tuo … è pronto\" dal 1° al 7 del mese

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: La tornata nei documenti

**Files:**
- Modify: `context.md` (blocco "Ultimo aggiornamento" in cima; "Le ultime tornate" in §2; mappa dei file §4; rotte §5)
- Modify: `docs/storico.md` (in cima alle tornate)

- [ ] **Step 1: Trova il numero della tornata**

Run: `grep -m1 -o "Ultimo aggiornamento: [^(]*([0-9]*ª" context.md` → la prossima è quella dopo. (Alla stesura del piano l'ultima era la 129ª.)

- [ ] **Step 2: Scrivi le righe**

- In cima, `Ultimo aggiornamento: <data> (<N>ª tornata, \`main\`: **il recap del mese** — una storia alla Spotify Wrapped (barrette, ~6" a slide, tocco avanti/indietro, tenere premuto per la pausa) che finisce su una card 1080×1920 da condividere; si apre dal calendario ("Recap di …", mesi finiti) e dalla Home dal 1° al 7 del mese. Niente database, niente APK.` e la riga di prima diventa `Prima, …`.
- In §2 "Le ultime tornate": `- **<N>ª** (<data>, \`main\`): lib/recapMese (recapDelMese, slideDelMese, caselleCard, avanzaStoria, celleDelMese, meseDaAnnunciare), lib/recapMeseImmagine (disegnaRecapMese 1080×1920), pages/RecapMesePage (/recap-mese/AAAA-MM, senza barra), components/SlideRecapMese, components/CardRecapMese (avvisi \`recapMese:AAAA-MM\`); recapImmagine esporta i pezzi di disegno, \`sfondo\` con la misura, \`condividiImmagine\`. Prove: tests/recapMese.test.js.`
- In §4 (mappa dei file) una voce per `lib/recapMese.js` + `lib/recapMeseImmagine.js` + `pages/RecapMesePage.jsx`, con la spec `docs/superpowers/specs/2026-10-28-recap-mese-design.md`.
- In §5 (rotte) `/recap-mese/AAAA-MM`.
- In `docs/storico.md`, prima della tornata più recente: `**Tornata <N>ª** (<data>, \`main\` su richiesta dell'utente — test e lint verdi, <provata in locale sì/no>).` con 2-4 punti: cosa, perché (chiesto dall'utente: "un recap del mese simile a quello dell'allenamento", "tipo Spotify Wrapped"), le scelte (pagina e non finestra, card e non finestra sulla Home, calorie fuori, il calo col mese prima non si mostra) e il passo 2 che resta (post nel feed).

- [ ] **Step 3: Commit**

```bash
git branch --show-current   # main
git add context.md docs/storico.md
git commit -m "context.md e storico: la <N>a tornata (recap del mese)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Non pushare: lo fa l'utente, o lo chiede lui.
