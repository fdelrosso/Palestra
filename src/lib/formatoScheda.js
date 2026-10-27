// ---------------------------------------------------------------------------
// Il formato della scheda da incollare: le regole mostrate in ImportPage,
// l'esempio, e il prompt da dare a un'AI perché riscriva così il messaggio di
// un PT qualunque. Il parser (lib/parser) legge questo e molto altro; qui c'è
// quello che si PROMETTE. ⚠️ tests/parser.test.js controlla che l'esempio si
// legga senza problemi: cambiando le regole, si cambia anche lui.
// ---------------------------------------------------------------------------

export const ESEMPIO_FORMATO = `Settimane: 5

Giorno A - Petto e tricipiti
Riscaldamento: 5' cyclette, rotazioni spalle con elastico 2x15
Panca piana bilanciere 4x8-10 80kg rec 90s
Croci ai cavi 3x12 rec 60s
+ Push down ai cavi 3x12 rec 60s
Dips 3xmax nota: lenti in discesa
  S1-2: 4x10 70kg
  S3-5: 5x6 85kg

Giorno B - Gambe
Squat 3x5 100kg poi 2x3 110kg rec 3min
Affondi bulgari 3x10 per lato 2x16kg rec 90s
Leg press 4x12 RPE 8 rec 2min
Plank 3x45s rec 30s
Stretching: quadricipiti 30" per gamba, ischiocrurali 30"`

// Le regole, una per riga: [come si scrive, cosa vuol dire].
export const REGOLE_FORMATO = [
  ['Giorno A - Petto', 'un giorno di allenamento (anche Day 1, Lunedì…)'],
  ['Panca 4x8 80kg rec 90s', 'un esercizio per riga: nome, serie×ripetizioni, carico, recupero'],
  ['4x8-10 · 3xmax · 3x45s · 4x12/10/8', 'ripetizioni: numero, intervallo, massimo, tempo, una per serie'],
  ['80kg · 2x16kg · 12rm · 70% · RPE 8 · RIR 2', 'carico: kg, due manubri, RM, % del massimale, RPE o RIR'],
  ['rec 90s · rec 2min · rec 1\'30"', 'recupero'],
  ['3x5 80kg poi 2x2 90kg', 'fasi: serie diverse nello stesso esercizio'],
  ['+ Push down 3x12', 'il "+" davanti: in superserie con quello sopra'],
  ['  S1-2: 4x10 70kg', 'sotto un esercizio: lo schema di quelle settimane'],
  ['3x10 per lato', 'esercizi a un arto alla volta'],
  ['nota: lento in discesa', 'una nota all’esercizio'],
  ["Tapis roulant 20' 10 km/h pendenza 5% zona 2", 'cardio a tempo: durata, e se ci sono velocità, pendenza, liv 8, 150 W, 2 km, 130 bpm, zona'],
  ["Riscaldamento: 5' bici, mobilità spalle",'facoltativo, sotto il nome del giorno: riscaldamento e mobilità, voci separate da virgole'],
  ['Stretching: quadricipiti 30", polpacci 30"', 'facoltativo, in fondo al giorno: lo stretching finale'],
  ['Settimane: 5', 'in cima, quanto dura la scheda: solo se la scheda lo dice'],
]

// Per l'AI (api/riscrivi) le superserie si scrivono A1/A2 invece del "+":
// ministral il "+" lo mette anche sul primo della coppia, e così il primo
// finiva in superserie con quello sopra. Le etichette le sbaglia molto meno, e
// il parser le legge uguali.
const REGOLE_AI = REGOLE_FORMATO.filter(([come]) => !come.startsWith('+')).concat([
  ['A1 Croci 3x12 / A2 Push down 3x12', 'superserie: la stessa lettera con 1, 2 (poi B1, B2…) su TUTTI gli esercizi della superserie'],
])
// Senza "Settimane: 5": ministral la copiava dall'esempio in ogni scheda.
const ESEMPIO_AI = ESEMPIO_FORMATO.replace('Settimane: 5\n\n', '')
  .replace('Croci ai cavi', 'A1 Croci ai cavi')
  .replace('+ Push down', 'A2 Push down')

export const PROMPT_AI = `Riscrivi la scheda di allenamento qui sotto nel formato che segue, senza aggiungere né togliere esercizi e senza inventare numeri che non ci sono. Rispondi solo con la scheda, senza commenti.

Regole del formato:
${REGOLE_AI.map(([come, cosa]) => `- ${come.trim()}  → ${cosa}`).join('\n')}
- Se un esercizio cambia di settimana in settimana, scrivi lo schema base sulla sua riga e sotto, rientrate di due spazi, le righe "S<settimane>: ..." (es. "  S1-2: 4x10 70kg").
- Le cose che non sono serie, ripetizioni, carico o recupero vanno in "nota: ...".
- Riscaldamento, mobilità e stretching solo se la scheda li ha: se non ci sono, niente riga (non scrivere "non specificato").
- Testo semplice: niente markdown (niente **, #, ---, elenchi puntati).
- I giorni di riposo NON si scrivono: saltali, solo i giorni di allenamento.
- Una tabella o sezione a parte (es. "ADDOMINALI", "CARDIO") con gli esercizi segnati dalla lettera o dal numero di un giorno (A, B, 1, 2, anche cerchiati, o "[segnato A]") NON è un giorno: ogni esercizio va in fondo al giorno della sua lettera (quelli con A nel Giorno A, quelli con B nel Giorno B).
- Un giorno senza esercizi (una tabella vuota) non si scrive.
- Il nome del giorno com'è scritto ("Giorno A", "Day 1", "Lunedì - Petto"): non inventare titoli.
- Gli esercizi restano nello STESSO ORDINE in cui sono nella scheda, giorno per giorno: non spostarli.
- "poi" e le righe S… sono solo dello stesso esercizio: mai un altro esercizio dentro. Se una nota dice che un esercizio ne sostituisce un altro ("dip → french press"), è solo una nota di quella riga.
- MAI due esercizi sulla stessa riga. Se il PT ne scrive più di uno su una riga (con "+", virgole, "SS", "core: a, b, c"), dividili: una riga ciascuno, con A1/A2 se sono in superserie.
- Stretching, defaticamento o foam roller a fine allenamento vanno nella riga "Stretching: ...", non sono esercizi.
- "SS", "superserie", "superset", "in SS con ↓", "+ … SS", "A1/A2" vogliono dire superserie: scrivile SEMPRE con le etichette A1/A2 (B1/B2…), anche se il segno è in una nota o in un'altra colonna.
- Gli esercizi che non sono in superserie non hanno etichetta, anche se sono "a fine allenamento". Niente "+".
- Serie di riscaldamento seguite da serie diverse: fasi con "poi" (es. "Squat 2x8 60kg poi 3x5 100kg"), non una nota.
- Copia i numeri ESATTAMENTE come sono scritti (carichi, ripetizioni, recuperi). Se un numero manca, non metterlo: niente carichi o recuperi inventati. Se la scheda dice un recupero di base, vale per gli esercizi che non ne hanno uno.
- Nelle note solo quello che c'è scritto, senza aggiungere consigli.

Esempio:
${ESEMPIO_AI}

Ecco la scheda da riscrivere:
`
