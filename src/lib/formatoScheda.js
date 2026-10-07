// ---------------------------------------------------------------------------
// Il formato della scheda da incollare: le regole mostrate in ImportPage,
// l'esempio, e il prompt da dare a un'AI perché riscriva così il messaggio di
// un PT qualunque. Il parser (lib/parser) legge questo e molto altro; qui c'è
// quello che si PROMETTE. ⚠️ tests/parser.test.js controlla che l'esempio si
// legga senza problemi: cambiando le regole, si cambia anche lui.
// ---------------------------------------------------------------------------

export const ESEMPIO_FORMATO = `Settimane: 5

Giorno A - Petto e tricipiti
Panca piana bilanciere 4x8-10 80kg rec 90s
Croci ai cavi 3x12 rec 60s
+ Push down ai cavi 3x12 rec 60s
Dips 3xmax nota: lenti in discesa
  S1-2: 4x10 70kg
  S3-5: 5x6 85kg

Rest (bici)

Giorno B - Gambe
Squat 3x5 100kg poi 2x3 110kg rec 3min
Affondi bulgari 3x10 per lato 2x16kg rec 90s
Leg press 4x12 RPE 8 rec 2min
Plank 3x45s rec 30s`

// Le regole, una per riga: [come si scrive, cosa vuol dire].
export const REGOLE_FORMATO = [
  ['Giorno A - Petto', 'un giorno di allenamento (anche Day 1, Lunedì…)'],
  ['Rest (bici)', 'un giorno di riposo, tra parentesi la nota'],
  ['Panca 4x8 80kg rec 90s', 'un esercizio per riga: nome, serie×ripetizioni, carico, recupero'],
  ['4x8-10 · 3xmax · 3x45s · 4x12/10/8', 'ripetizioni: numero, intervallo, massimo, tempo, una per serie'],
  ['80kg · 2x16kg · 12rm · 70% · RPE 8 · RIR 2', 'carico: kg, due manubri, RM, % del massimale, RPE o RIR'],
  ['rec 90s · rec 2min · rec 1\'30"', 'recupero'],
  ['3x5 80kg poi 2x2 90kg', 'fasi: serie diverse nello stesso esercizio'],
  ['+ Push down 3x12', 'il "+" davanti: in superserie con quello sopra'],
  ['  S1-2: 4x10 70kg', 'sotto un esercizio: lo schema di quelle settimane'],
  ['3x10 per lato', 'esercizi a un arto alla volta'],
  ['nota: lento in discesa', 'una nota all’esercizio'],
  ['Settimane: 5', 'in cima, quanto dura la scheda'],
]

export const PROMPT_AI = `Riscrivi la scheda di allenamento qui sotto nel formato che segue, senza aggiungere né togliere esercizi e senza inventare numeri che non ci sono. Rispondi solo con la scheda, senza commenti.

Regole del formato:
${REGOLE_FORMATO.map(([come, cosa]) => `- ${come.trim()}  → ${cosa}`).join('\n')}
- Se un esercizio cambia di settimana in settimana, scrivi lo schema base sulla sua riga e sotto, rientrate di due spazi, le righe "S<settimane>: ..." (es. "  S1-2: 4x10 70kg").
- Le cose che non sono serie, ripetizioni, carico o recupero vanno in "nota: ...".

Esempio:
${ESEMPIO_FORMATO}

Ecco la scheda da riscrivere:
`
