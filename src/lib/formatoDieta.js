// ---------------------------------------------------------------------------
// Il formato della dieta per l'AI: il gemello di lib/formatoScheda, per la
// dieta del nutrizionista invece della scheda del PT.
//
// La dieta arriva come capita (foto del foglio, PDF di Word, PDF scansionato,
// messaggio): un'AI di Mistral (api/riscrivi-dieta) la riscrive in un testo
// che lib/parserDieta legge senza sorprese, e da lì la strada è quella di
// sempre (DietaImportPage: si vede, si corregge, si salva).
//
// Perché serve: il parser da solo, sui PDF veri, sbaglia in modi che non si
// vedono. Su un piano reale (Word, 5 pagine) perdeva lo spuntino dei giorni di
// allenamento dietro un numero di pagina, faceva diventare "2-3 fette di pane"
// (un'alternativa alla PASTA) un pranzo intero, chiamava "Merenda" lo spuntino
// prima di dormire e spezzava la tabella delle sostituzioni. L'AI legge il
// foglio come una persona e lo riscrive nella forma che il parser capisce.
//
// ⚠️ tests/formatoDieta.test.js controlla che l'esempio qui sotto si legga
// come promesso: cambiando le regole, si cambia anche lui.
// ---------------------------------------------------------------------------

// Quello che l'AI risponde quando le si dà altro (la foto di un piatto, una
// scheda di allenamento): senza, le sue scuse finivano nella casella.
export const NESSUNA_DIETA = 'NESSUNA_DIETA'

export const ESEMPIO_DIETA = `GIORNO DI ALLENAMENTO
Colazione: una tazza di latte parzialmente scremato, 40-50g di cereali (cornflakes, fiocchi di riso o avena)
oppure: una tazza di latte + 3 fette biscottate con marmellata
oppure: un vasetto di yogurt greco + una porzione di frutta + 3 cucchiai di muesli
Spuntino: un pacchetto di crackers, un bicchiere di succo di frutta
oppure: una banana + 2 gallette
Pranzo: 80g di pasta o riso (oppure 100g di pane, oppure 4 fette di pan bauletto); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: riso con tonno e pomodori + frutta
Cena: 80g di pasta o riso (oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: trancio di salmone con verdure e patate + frutta
Spuntino serale: un bicchiere di latte parzialmente scremato, 10g di frutta secca

GIORNO DI RIPOSO
Colazione: una tazza di latte parzialmente scremato, 40-50g di cereali (cornflakes, fiocchi di riso o avena)
oppure: una tazza di latte + 3 fette biscottate con marmellata
oppure: un vasetto di yogurt greco + una porzione di frutta + 3 cucchiai di muesli
Pranzo: 80g di pasta o riso (oppure 100g di pane, oppure 4 fette di pan bauletto); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: petto di pollo alla griglia e pomodori + pane + frutta
oppure: riso con tonno e pomodori + frutta
Merenda: un vasetto di yogurt greco 0%, una porzione di frutta
oppure: 2 gallette con 6 fette di bresaola
Cena: 80g di pasta o riso (oppure 300g di patate); una porzione di secondo piatto; una porzione di verdura; 1 cucchiaio di olio; una porzione di frutta
oppure: trancio di salmone con verdure e patate + frutta
Spuntino serale: un bicchiere di latte parzialmente scremato, 10g di frutta secca

Note:
Sono previsti 20g di olio extravergine d'oliva al giorno, preferibilmente a crudo.
Sostituzioni della pasta (80g): riso, cous cous, farro 80g; gnocchi di patate 160-170g; pane 100g; patate 300g.
Pesce almeno 2-3 volte a settimana (filetti 200-250g, salmone o tonno 150g).`

const REGOLE_DIETA = [
  'Ogni giornata comincia con il suo titolo, da solo su una riga, tutto maiuscolo: "GIORNO DI ALLENAMENTO", "GIORNO DI RIPOSO", oppure "GIORNATA TIPO" se la dieta non distingue. Se la dieta ha più giornate diverse (es. "Giornata tipo 1", "Giornata tipo 2"), una per ciascuna, col nome com\'è scritto.',
  'Se un pasto cambia fra giorni di allenamento e di riposo (es. "Nei giorni di rest: …" e "Nei giorni di allenamento: …"), scrivi DUE giornate, GIORNO DI ALLENAMENTO e GIORNO DI RIPOSO, ognuna con TUTTI i suoi pasti: quelli uguali si ripetono in tutte e due.',
  'Un pasto per riga, sempre cominciando col suo nome e i due punti: "Colazione:", "Spuntino:", "Pranzo:", "Merenda:", "Cena:". Lo spuntino della mattina è "Spuntino", quello del pomeriggio è "Merenda", quello dopo cena o prima di dormire è "Spuntino serale". Pre e post allenamento: "Pre workout:", "Post workout:".',
  'Sulla riga del pasto, separati da punto e virgola, gli alimenti della prima proposta, con le quantità esattamente come sono scritte.',
  'Un ingrediente che si può sostituire con un altro (es. "80g di pasta oppure 100g di pane") resta sulla riga del pasto, tra parentesi: "80g di pasta (oppure 100g di pane)". Mai a inizio riga.',
  'Ogni altro modo di fare TUTTO il pasto (le liste "In alternativa è possibile consumare", "Esempi", "Opzione 2") va su una riga sua subito sotto il pasto, che comincia con "oppure: ".',
  'Calorie e macro solo se la dieta li scrive: una riga sotto il titolo della giornata, es. "2400 kcal, proteine 150 g, carboidrati 280 g, grassi 70 g". Mai inventarli o calcolarli.',
  'In fondo, dopo tutte le giornate, una riga "Note:" e sotto le indicazioni generali del nutrizionista (olio, sostituzioni, porzioni dei secondi, consigli), una per riga, riassunte senza perdere numeri. Nessuna riga delle note deve cominciare col nome di un pasto.',
  'Niente nome del paziente, nome o contatti del nutrizionista, numeri di pagina, intestazioni.',
  'Copia alimenti e quantità ESATTAMENTE: niente alimenti, grammi o pasti inventati, niente consigli aggiunti.',
  'Testo semplice: niente markdown (niente **, #, ---, elenchi puntati).',
]

export const PROMPT_AI_DIETA = `Riscrivi la dieta qui sotto nel formato che segue, senza aggiungere né togliere alimenti e senza inventare numeri che non ci sono. Rispondi solo con la dieta, senza commenti. Se il testo non è una dieta, rispondi solo: ${NESSUNA_DIETA}

Regole del formato:
${REGOLE_DIETA.map((r) => `- ${r}`).join('\n')}

Esempio:
${ESEMPIO_DIETA}

Ecco la dieta da riscrivere:
`

// Per una foto o un PDF che non si legge come testo: prima l'AI trascrive,
// poi la trascrizione si riscrive come un testo (come per le schede, dove
// leggere e riscrivere nella stessa chiamata era troppo per ministral).
export const PROMPT_TRASCRIVI_DIETA = `Trascrivi ESATTAMENTE il testo di questa dieta o piano alimentare, senza riscriverlo né interpretarlo: titoli, pasti, elenchi e tabelle nell'ordine in cui sono. Per ogni riga di tabella una riga, con le celle separate da " | ". Salta i numeri di pagina. Niente commenti. Se nell'immagine non c'è una dieta o un piano alimentare (per esempio è una foto di cibo, una scheda di allenamento, una persona), rispondi solo: ${NESSUNA_DIETA}`
