import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

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

const { parseSchedaTesto, leggiScheda } = await import('../src/lib/parser.js')
const { formatSerieRip, formatCarico, formattaRecupero, schemaInTesto } = await import('../src/lib/schema.js')

// Come lo legge l'app: una riga per esercizio, settimana per settimana.
const riassunto = (scheda) =>
  scheda.giorni.map((g) =>
    g.tipo === 'rest'
      ? `Rest${g.nota ? ` (${g.nota})` : ''}`
      : [
          g.nome,
          ...g.esercizi.map((e) => {
            const schemi = e.variaPerSettimana ? e.settimane : [e.schemaBase]
            const testo = schemi.map((s) => schemaInTesto(s)).join(' | ')
            return `${e.insiemeAlPrecedente ? '+ ' : ''}${e.nome}: ${testo}${e.nota ? ` [${e.nota}]` : ''}`
          }),
        ],
  )

// ---------------------------------------------------------------------------
// Il dialetto del PT di sempre (quello per cui era nato il parser): blocchi
// separati da righe vuote, il nome sulla prima riga, "SettN" per settimana,
// "rec." per il recupero, l'RM e le note dopo il nome. Non deve peggiorare.
// ---------------------------------------------------------------------------

const MESSAGGIO_PT = `Giorno A

Slanci al macchinario (solo destra) 3x15/12. Pre panca

Panca piana. Solite regole ma stai bene attento ad extrarotatore di sx e a gluteo dx!!
Sett1 8x3 90kg rec 1min
Sett2 6x4 90kg rec 1,15min
Sett3-4 5x5 90kg rec 1,45min
Sett5 4x3 90kg rec 1min

Military 4x3 50kg rec 1min

Pectoral machine 12rm
Sett1-4 4x8 rec 1,15min
Sett5 3x8 rec 1,15min

Military press 3x5 80kg poi 2x2 90kg rec 3min

Rest

Giorno B

Curl a 45 manubri 4x7/6 10rm rec 1,5min

Affondo o pressa 45 mono 3x12/10 15rm
rec 30" tra gli arti

Leg extension 3x15/12 rec 1min cedimento

Rest (bici)`

test('il dialetto del PT: giorni, riposi e settimane', () => {
  const s = parseSchedaTesto(MESSAGGIO_PT)
  assert.equal(s.numeroSettimane, 5)
  assert.deepEqual(
    s.giorni.map((g) => (g.tipo === 'rest' ? `rest:${g.nota}` : g.nome)),
    ['Giorno A', 'rest:', 'Giorno B', 'rest:bici'],
  )
  assert.deepEqual(
    s.giorni[0].esercizi.map((e) => e.nome),
    ['Slanci al macchinario (solo destra)', 'Panca piana', 'Military', 'Pectoral machine', 'Military press'],
  )
})

test('il dialetto del PT: lo schema di ogni esercizio', () => {
  const [a, , b] = parseSchedaTesto(MESSAGGIO_PT).giorni
  const [slanci, panca, military, pectoral, press] = a.esercizi

  assert.equal(formatSerieRip(slanci.schemaBase), '3×15/12')
  assert.equal(slanci.nota, 'Pre panca')

  assert.equal(panca.variaPerSettimana, true)
  assert.deepEqual(panca.settimane.map(formatSerieRip), ['8×3', '6×4', '5×5', '5×5', '4×3'])
  assert.deepEqual(panca.settimane.map(formattaRecupero), ["1'", "1'15\"", "1'45\"", "1'45\"", "1'"])
  assert.equal(formatCarico(panca.settimane[0]), '90kg')
  assert.match(panca.nota, /extrarotatore/)

  assert.equal(formatSerieRip(military.schemaBase), '4×3')
  assert.equal(formatCarico(military.schemaBase), '50kg')
  assert.equal(military.schemaBase.recuperoSec, 60)

  // "12rm" sul nome vale per tutte le settimane: è il carico.
  assert.deepEqual(pectoral.settimane.map(formatSerieRip), ['4×8', '4×8', '4×8', '4×8', '3×8'])
  assert.equal(formatCarico(pectoral.settimane[4]), '12RM')

  assert.equal(formatSerieRip(press.schemaBase), '3×5 + 2×2')
  assert.equal(formatCarico(press.schemaBase), '80kg + 90kg')

  const [curl, affondo, legExt] = b.esercizi
  assert.equal(formatSerieRip(curl.schemaBase), '4×7/6')
  assert.equal(formatCarico(curl.schemaBase), '10RM')
  assert.equal(curl.schemaBase.recuperoSec, 90)
  assert.equal(affondo.schemaBase.recuperoSec, 30)
  assert.match(affondo.nota, /tra gli arti/)
  assert.equal(legExt.schemaBase.recuperoSec, 60)
  assert.match(legExt.nota, /cedimento/i)
})

// ---------------------------------------------------------------------------
// Il formato documentato (la guida in ImportPage): una riga per esercizio.
// ---------------------------------------------------------------------------

const FORMATO = `Giorno A - Petto e tricipiti
Panca piana bilanciere 4x8-10 80kg rec 90s
Croci ai cavi 3x12 rec 60s
+ Push down 3x12 rec 60s
Dips 3xMAX nota: lenti in discesa
  S1-2: 4x10 70kg
  S3-5: 5x6 85kg

Rest (bici)

Giorno B - Gambe
Squat 5x5 100kg rec 3min
Affondi bulgari 3x10 per lato 2x16kg rec 90"
Plank 3x45s rec 30s
Leg press 4x12 RPE 8
Stacco rumeno 3x8 70% rec 2'30"`

test('il formato documentato', () => {
  assert.deepEqual(riassunto(parseSchedaTesto(FORMATO)), [
    [
      'Giorno A - Petto e tricipiti',
      "Panca piana bilanciere: 4x8-10 80kg rec 1'30\"",
      "Croci ai cavi: 3x12 rec 1'",
      "+ Push down: 3x12 rec 1'",
      'Dips: 4x10 70kg | 4x10 70kg | 5x6 85kg | 5x6 85kg | 5x6 85kg [lenti in discesa]',
    ],
    'Rest (bici)',
    [
      'Giorno B - Gambe',
      "Squat: 5x5 100kg rec 3'",
      "Affondi bulgari: 3x10 per lato 2×16kg rec 1'30\"",
      'Plank: 3x45" rec 30"',
      'Leg press: 4x12 RPE 8',
      "Stacco rumeno: 3x8 70% rec 2'30\"",
    ],
  ])
})

test('quello che non si capisce si dice, riga per riga', () => {
  const { scheda, problemi } = leggiScheda(`4x10 rec 60s
Giorno A
Panca 4x8 80kg
Croci ai cavi
S2: boh`)
  assert.deepEqual(scheda.giorni[0].esercizi.map((e) => e.nome), ['Panca', 'Croci ai cavi'])
  assert.deepEqual(
    problemi.map((p) => p.riga).sort(),
    [1, 4, 5],
    'lo schema senza esercizio, la settimana senza schema, l’esercizio senza serie',
  )
  assert.ok(problemi.every((p) => p.testo && p.motivo))
})

test('testo senza giorni: un giorno solo, che si rinomina dopo', () => {
  const s = parseSchedaTesto(`Panca 4x8 80kg rec 2min
Rematore 4x10 60kg rec 90s`)
  assert.equal(s.giorni.length, 1)
  assert.equal(s.giorni[0].esercizi.length, 2)
})

test('elenchi puntati, numerati e in inglese', () => {
  const s = parseSchedaTesto(`Day 1 - Push
1. Bench press 4 sets of 8 @ 80kg, rest 2 min
2) Incline dumbbell press 3x10-12 2x22kg rest 90s
- Lateral raises 3x15 rest 60s
• Triceps pushdown 3 x 12 rest 1'`)
  assert.deepEqual(riassunto(s)[0], [
    'Day 1 - Push',
    "Bench press: 4x8 80kg rec 2'",
    "Incline dumbbell press: 3x10-12 2×22kg rec 1'30\"",
    "Lateral raises: 3x15 rec 1'",
    "Triceps pushdown: 3x12 rec 1'",
  ])
})

test('il titolo, i giorni della settimana e il peso senza "kg"', () => {
  const s = parseSchedaTesto(`PROGRAMMA IPERTROFIA

Lunedì
panca 3x10 60
Stacco rumeno 3 serie da 10 reps 60kg
Alzate laterali 3x15 (ultimo a cedimento)`)
  assert.equal(s.nome, 'PROGRAMMA IPERTROFIA')
  assert.deepEqual(riassunto(s), [
    ['Lunedì', 'panca: 3x10 60kg', 'Stacco rumeno: 3x10 60kg', 'Alzate laterali: 3x15 [ultimo a cedimento]'],
  ])
  // Il nome scelto nella schermata vince sul titolo del testo.
  assert.equal(parseSchedaTesto('Titolo\nGiorno A\nPanca 3x8', 'La mia').nome, 'La mia')
})

test('le superserie: "+", "A1/A2" e "X + Y (superserie)"', () => {
  const s = parseSchedaTesto(`Giorno A
A1) Panca piana 4x8
A2) Rematore 4x8
B1) Squat 3x5
Lat machine + Curl martello (superserie) 4x8 rec 75s`)
  assert.deepEqual(riassunto(s)[0], [
    'Giorno A',
    'Panca piana: 4x8',
    '+ Rematore: 4x8',
    'Squat: 3x5',
    "Lat machine: 4x8 rec 1'15\"",
    "+ Curl martello: 4x8 rec 1'15\"",
  ])
})

test('una scheda scritta a sezioni per settimana', () => {
  const s = parseSchedaTesto(`Settimana 1-2
Giorno A
Panca 4x8 80kg
Rematore 4x10 60kg
Rest

Settimana 3
Giorno A
Panca 5x5 85kg
Rematore 4x10 60kg`)
  assert.equal(s.numeroSettimane, 3)
  assert.deepEqual(riassunto(s), [
    ['Giorno A', 'Panca: 4x8 80kg | 4x8 80kg | 5x5 85kg', 'Rematore: 4x10 60kg'],
    'Rest',
  ])
})

const { ESEMPIO_FORMATO } = await import('../src/lib/formatoScheda.js')

test('l’esempio della guida si legge tutto, senza problemi', () => {
  const { scheda, problemi } = leggiScheda(ESEMPIO_FORMATO)
  assert.deepEqual(problemi, [])
  assert.equal(scheda.numeroSettimane, 5)
  assert.deepEqual(riassunto(scheda), [
    [
      'Giorno A - Petto e tricipiti',
      "Panca piana bilanciere: 4x8-10 80kg rec 1'30\"",
      "Croci ai cavi: 3x12 rec 1'",
      "+ Push down ai cavi: 3x12 rec 1'",
      'Dips: 4x10 70kg | 4x10 70kg | 5x6 85kg | 5x6 85kg | 5x6 85kg [lenti in discesa]',
    ],
    'Rest (bici)',
    [
      'Giorno B - Gambe',
      "Squat: 3x5 100kg poi 2x3 110kg rec 3'",
      "Affondi bulgari: 3x10 per lato 2×16kg rec 1'30\"",
      "Leg press: 4x12 RPE 8 rec 2'",
      'Plank: 3x45" rec 30"',
    ],
  ])
})

// ---------------------------------------------------------------------------
// Riscaldamento e stretching del giorno (lib/preparazione): facoltativi.

test('l’esempio della guida porta riscaldamento e stretching nei loro giorni', () => {
  const { scheda } = leggiScheda(ESEMPIO_FORMATO)
  const [a, , b] = scheda.giorni
  assert.equal(a.riscaldamento, "5' cyclette\nrotazioni spalle con elastico 2x15")
  assert.equal(a.stretching, '')
  assert.equal(b.riscaldamento, '')
  assert.equal(b.stretching, 'quadricipiti 30" per gamba\nischiocrurali 30"')
  // Non sono esercizi.
  assert.equal(a.esercizi.length, 4)
  assert.equal(b.esercizi.length, 4)
})

test('senza riscaldamento né stretching i campi restano vuoti', () => {
  const { scheda } = leggiScheda('Giorno A\nPanca 4x8 80kg')
  assert.equal(scheda.giorni[0].riscaldamento, '')
  assert.equal(scheda.giorni[0].stretching, '')
})

test('"Riscaldamento:" da solo apre un elenco, fino alla riga vuota', () => {
  const { scheda, problemi } = leggiScheda(`Giorno A
Riscaldamento e mobilità:
- 5' bici
- Rotazioni spalle 2x10

Panca 4x8 80kg
Stretching finale
- Pettorali al muro 30"
- Tricipiti 30"`)
  assert.deepEqual(problemi, [])
  const g = scheda.giorni[0]
  assert.equal(g.riscaldamento, "5' bici\nRotazioni spalle 2x10")
  assert.equal(g.stretching, 'Pettorali al muro 30"\nTricipiti 30"')
  assert.deepEqual(g.esercizi.map((e) => e.nome), ['Panca'])
})

test('l’elenco si chiude a un giorno nuovo anche senza riga vuota', () => {
  const { scheda } = leggiScheda(`Giorno A
Panca 4x8
Stretching:
- Pettorali 30"
Giorno B
Squat 5x5`)
  assert.equal(scheda.giorni.length, 2)
  assert.equal(scheda.giorni[0].stretching, 'Pettorali 30"')
  assert.deepEqual(scheda.giorni[1].esercizi.map((e) => e.nome), ['Squat'])
})

test('il riscaldamento scritto prima dei giorni vale per chi non ha il suo', () => {
  const { scheda } = leggiScheda(`Riscaldamento: 10' tapis roulant
Giorno A
Panca 4x8
Giorno B
Riscaldamento: mobilità anca, 2x10 squat a corpo libero
Squat 5x5`)
  assert.equal(scheda.giorni[0].riscaldamento, "10' tapis roulant")
  assert.equal(scheda.giorni[1].riscaldamento, 'mobilità anca\n2x10 squat a corpo libero')
})

test('"Mobilità spalle: …" è una voce sola, e un esercizio di stretching resta un esercizio', () => {
  const { scheda } = leggiScheda(`Giorno A
Mobilità spalle: 2x10 rotazioni, 2x10 dislocazioni
Stretching pettorali 2x30s nota: piano
Panca 4x8`)
  const g = scheda.giorni[0]
  assert.equal(g.riscaldamento, 'Mobilità spalle: 2x10 rotazioni, 2x10 dislocazioni')
  assert.equal(g.stretching, '')
  assert.deepEqual(g.esercizi.map((e) => e.nome), ['Stretching pettorali', 'Panca'])
})
