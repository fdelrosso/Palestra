// ---------------------------------------------------------------------------
// Libreria esercizi: per ogni gruppo muscolare (vedi lib/muscoli) un catalogo
// di tutte le varianti più comuni. Usata da:
//   - la sezione "Esercizi" (sfoglia le varianti per gruppo);
//   - il generatore di allenamenti consigliati (lib/consiglio), come pool di
//     esercizi da proporre quando non se ne conoscono di "propri".
//
// `gruppoDaNome(nome)` prova a indovinare il gruppo di un esercizio dal nome
// (prima per appartenenza al catalogo, poi per parole chiave): serve a taggare
// col gruppo gli esercizi dello storico/schede che non lo riportano.
// ---------------------------------------------------------------------------

import { GRUPPI, SOTTOGRUPPI, sottogruppoDi } from './muscoli.js'

export const LIBRERIA = {
  petto: [
    'Panca piana bilanciere',
    'Panca piana manubri',
    'Panca inclinata bilanciere',
    'Panca inclinata manubri',
    'Panca declinata bilanciere',
    'Chest press macchina',
    'Croci ai cavi',
    'Croci ai cavi alti',
    'Croci ai cavi bassi',
    'Croci su panca piana manubri',
    'Croci su panca inclinata manubri',
    'Pectoral machine (pec deck)',
    'Spinte al multipower (Smith)',
    'Dips alle parallele (petto)',
    'Piegamenti (push-up)',
    'Pullover con manubrio',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Panca declinata manubri',
    'Panca inclinata al multipower',
    'Panca piana con fermo (paused)',
    'Floor press bilanciere',
    'Chest press inclinata macchina',
    'Hammer strength chest press',
    'Croci ai cavi su panca inclinata',
    'Piegamenti piedi rialzati (decline push-up)',
    'Piegamenti mani rialzate (incline push-up)',
    'Piegamenti presa larga',
    'Svend press (con disco)',
    'Landmine press',
  ],
  schiena: [
    'Trazioni presa prona',
    'Trazioni presa supina (chin-up)',
    'Trazioni presa neutra',
    'Lat machine avanti',
    'Lat machine presa inversa',
    'Lat machine presa stretta',
    'Pulley basso (rematore al cavo)',
    'Rematore bilanciere',
    'Rematore manubrio singolo',
    'Rematore Pendlay',
    'Rematore T-bar',
    'Rematore alla macchina',
    'Pullover ai cavi',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Trazioni zavorrate',
    'Trazioni assistite (macchina)',
    'Lat machine presa neutra',
    'Lat machine monolaterale',
    'Pulley basso presa larga',
    'Rematore Yates (presa supina)',
    'Rematore al multipower',
    'Rematore manubri su panca inclinata (chest supported)',
    'Rematore Meadows (landmine)',
    'Seal row',
    'Rematore inverso (inverted row)',
    'Rack pull',
    'Superman (lombari a terra)',
    // Dal 2026-10-19 (prima stavano in spalle): lavorano il trapezio.
    'Scrollate bilanciere (shrug)',
    'Scrollate manubri',
    'Scrollate al multipower',
    'Scrollate ai cavi',
  ],
  gambe: [
    'Squat bilanciere',
    'Squat frontale',
    'Hack squat',
    'Leg press',
    'Pressa 45°',
    'Affondi con manubri',
    'Affondi bulgari (split squat)',
    'Goblet squat',
    'Leg extension',
    'Leg curl sdraiato',
    'Leg curl seduto',
    'Stacco gambe tese',
    'Adductor machine',
    'Step up',
    'Stacco sumo',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Squat al multipower',
    'Squat con fermo (pause squat)',
    'Box squat',
    'Pendulum squat',
    'Belt squat',
    'Zercher squat',
    'Sissy squat',
    'Pistol squat',
    'Leg press monopodalica',
    'Affondi in camminata (walking lunge)',
    'Affondi indietro (reverse lunge)',
    'Affondi con bilanciere',
    'Affondi laterali',
    'Leg extension monopodalica',
    'Leg curl in piedi',
    'Nordic curl (femorali)',
    'Wall sit (sedia al muro)',
    'Adduzioni ai cavi',
    // Dal 2026-10-19: gli stacchi e il good morning sono prima di tutto gambe
    // (la schiena è il secondo gruppo, ALTRI_GRUPPI), e la pressa orizzontale.
    'Stacco da terra',
    'Stacco rumeno',
    'Stacco con trap bar',
    'Good morning',
    'Pressa orizzontale',
  ],
  // Glutei e polpacci: gruppi a sé dalla 38a (prima stavano in "gambe"). Il
  // primo di ogni elenco è il fondamentale, come negli altri (lib/consiglio).
  glutei: [
    'Hip thrust bilanciere',
    'Hip thrust alla macchina',
    'Glute bridge (ponte glutei)',
    'Abductor machine',
    'Kickback ai cavi (glutei)',
    'Glute machine (slanci indietro)',
    'Abduzioni con elastico',
    'Frog pump',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Hip thrust monopodalico',
    'Hip thrust al multipower',
    'Glute bridge monopodalico',
    'Abduzioni ai cavi',
    'Abduzioni da seduto con elastico',
    'Clamshell (conchiglia)',
    'Donkey kick (slanci a quattro zampe)',
    'Fire hydrant',
    'Reverse hyperextension',
    'Cable pull through',
    'Sumo squat con manubrio',
    'Affondi incrociati (curtsy lunge)',
    // Dal 2026-10-19 (prima stava in schiena, che resta il secondo gruppo).
    'Hyperextension (lombari)',
  ],
  polpacci: [
    'Calf raise in piedi',
    'Calf raise seduto',
    'Calf raise alla leg press',
    'Calf raise al multipower',
    'Calf raise monopodalico',
    'Donkey calf raise',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Calf raise con manubri',
    'Calf raise allo step (gradino)',
    'Calf raise alla hack squat',
    'Saltelli sulle punte',
    'Tibialis raise (tibiali)',
  ],
  spalle: [
    'Lento avanti bilanciere (military)',
    'Lento avanti manubri',
    'Arnold press',
    'Shoulder press macchina',
    'Alzate laterali manubri',
    'Alzate laterali ai cavi',
    'Alzate frontali manubri',
    'Alzate posteriori (rear delt)',
    'Reverse pec deck (rear delt machine)',
    'Tirate al mento (upright row)',
    'Face pull',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Lento dietro (behind the neck)',
    'Lento avanti al multipower',
    'Push press',
    'Z press (seduto a terra)',
    'Alzate laterali alla macchina',
    'Alzate laterali inclinate (lean away)',
    'Alzate frontali bilanciere',
    'Alzate frontali con disco',
    'Alzate frontali ai cavi',
    'Alzate posteriori ai cavi',
    'Alzate posteriori su panca inclinata',
    'Y-raise',
    'Rotazioni esterne ai cavi (cuffia)',
  ],
  bicipiti: [
    'Curl bilanciere',
    'Curl bilanciere EZ',
    'Curl manubri alternato',
    'Curl manubri simultaneo',
    'Curl a martello (hammer)',
    'Curl concentrato',
    'Curl panca Scott (preacher)',
    'Curl ai cavi',
    'Curl panca inclinata',
    'Curl Spider',
    'Curl inverso (reverse)',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Curl bilanciere presa larga',
    'Curl bilanciere presa stretta',
    'Curl 21',
    'Curl Drag',
    'Curl Zottman',
    'Curl a martello alternato',
    'Curl a martello ai cavi (corda)',
    'Curl Bayesian (cavo dietro)',
    'Curl concentrato ai cavi',
    'Curl alla macchina',
    'Curl panca Scott manubrio singolo',
  ],
  tricipiti: [
    'Push down ai cavi (corda)',
    'Push down ai cavi (barra)',
    'Push down presa inversa',
    'French press bilanciere EZ',
    'French press manubri',
    'Estensioni sopra la testa ai cavi',
    'Estensione manubrio singolo dietro la testa',
    'Dips alle parallele',
    'Dips tra due panche',
    'Panca piana presa stretta',
    'Kickback manubri',
    'Kickback ai cavi',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Push down monolaterale ai cavi',
    'Skull crusher su panca declinata',
    'Tate press',
    'JM press',
    'Panca presa stretta al multipower',
    'Estensioni sopra la testa con bilanciere EZ',
    'Tricipiti alla macchina (dip machine)',
    'Dips alla macchina assistita',
    'Piegamenti presa stretta (diamond push-up)',
  ],
  addome: [
    'Crunch a terra',
    'Crunch inverso',
    'Crunch ai cavi',
    'Plank',
    'Plank laterale',
    'Russian twist',
    'Sit-up',
    'Leg raise a terra',
    'Leg raise alla sbarra',
    'Bicycle crunch',
    'Mountain climber',
    'Ab wheel (ruota)',
    'Hollow hold',
    'V-up',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Crunch alla macchina',
    'Crunch su fitball',
    'Crunch obliqui',
    'Plank con tocco spalle (shoulder tap)',
    'Dead bug',
    'Bird dog',
    'Pallof press (anti-rotazione)',
    'Woodchopper ai cavi',
    'Toes to bar',
    'Ginocchia al petto alla sbarra (knee raise)',
    'Leg raise alla captain chair',
    'Dragon flag',
    'Sforbiciate (flutter kick)',
    'Side bend con manubrio',
    'L-sit',
  ],
  cardio: [
    'Tapis roulant (corsa)',
    'Camminata in salita',
    'Cyclette',
    'Ellittica',
    'Vogatore (rowing)',
    'Corda per saltare',
    'Stair climber (scalatore)',
    'HIIT sprint',
    'Bici da spinning',
    // Aggiunti il 2026-10-14: altri esercizi e varianti.
    'Camminata veloce',
    'Air bike (assault bike)',
    'Ski erg',
    'Burpees',
    'Jumping jack',
    'Box jump',
    'Kettlebell swing',
    'Battle rope',
    'Spinta della slitta (sled push)',
    'Nuoto',
  ],
}

// Gli ALTRI gruppi di un esercizio della libreria, dopo il principale (che è
// la sezione in cui sta in LIBRERIA): i dip sono petto E tricipiti. Chi sceglie
// l'esercizio dalla ricerca se li trova già scritti (gruppiDaNome).
const ALTRI_GRUPPI = {
  'Dips alle parallele (petto)': ['tricipiti'],
  'Pullover con manubrio': ['tricipiti'],
  'Trazioni presa supina (chin-up)': ['bicipiti'],
  'Lat machine presa inversa': ['bicipiti'],
  'Stacco da terra': ['schiena', 'glutei'],
  'Stacco rumeno': ['schiena', 'glutei'],
  'Stacco con trap bar': ['schiena', 'glutei'],
  'Good morning': ['schiena', 'glutei'],
  'Stacco gambe tese': ['schiena', 'glutei'],
  'Stacco sumo': ['schiena'],
  'Squat bilanciere': ['glutei'],
  'Squat con fermo (pause squat)': ['glutei'],
  'Hyperextension (lombari)': ['schiena'],
}

// I SOTTOGRUPPI (lib/muscoli) di gambe, spalle e schiena che un esercizio della
// libreria lavora, il principale per primo. Contano solo quelli di un gruppo
// dell'esercizio (sottogruppiEsercizio): un gruppo senza sottogruppi qui si
// accende intero. La cuffia ha per ora il deltoide posteriore.
const Q = 'quadricipiti'
const F = 'femorali'
const AD = 'adduttori'
const DA = 'deltoideAnteriore'
const DL = 'deltoideLaterale'
const DP = 'deltoidePosteriore'
const DO = 'dorsali'
const TR = 'trapezio'
const RO = 'romboidi'
const LO = 'lombari'
const SOTTOGRUPPI_ESERCIZI = {
  // gambe
  'Squat bilanciere': [Q, AD],
  'Squat frontale': [Q],
  'Hack squat': [Q],
  'Leg press': [Q],
  'Pressa 45°': [Q],
  'Pressa orizzontale': [Q],
  'Leg press monopodalica': [Q],
  'Affondi con manubri': [Q],
  'Affondi bulgari (split squat)': [Q],
  'Affondi in camminata (walking lunge)': [Q],
  'Affondi indietro (reverse lunge)': [Q, F],
  'Affondi con bilanciere': [Q],
  'Affondi laterali': [Q, AD],
  'Goblet squat': [Q],
  'Squat al multipower': [Q],
  'Squat con fermo (pause squat)': [Q],
  'Box squat': [Q, F],
  'Pendulum squat': [Q],
  'Belt squat': [Q],
  'Zercher squat': [Q],
  'Sissy squat': [Q],
  'Pistol squat': [Q],
  'Step up': [Q],
  'Wall sit (sedia al muro)': [Q],
  'Leg extension': [Q],
  'Leg extension monopodalica': [Q],
  'Leg curl sdraiato': [F],
  'Leg curl seduto': [F],
  'Leg curl in piedi': [F],
  'Nordic curl (femorali)': [F],
  'Stacco gambe tese': [F, LO],
  'Stacco rumeno': [F, LO],
  'Good morning': [F, LO],
  'Stacco da terra': [F, LO],
  'Stacco con trap bar': [F, LO],
  'Stacco sumo': [F, LO],
  'Adductor machine': [AD],
  'Adduzioni ai cavi': [AD],
  // spalle
  'Lento avanti bilanciere (military)': [DA, DL],
  'Lento avanti manubri': [DA, DL],
  'Lento avanti al multipower': [DA, DL],
  'Lento dietro (behind the neck)': [DL, DA],
  'Arnold press': [DA, DL],
  'Shoulder press macchina': [DA],
  'Push press': [DA],
  'Z press (seduto a terra)': [DA, DL],
  'Alzate laterali manubri': [DL],
  'Alzate laterali ai cavi': [DL],
  'Alzate laterali alla macchina': [DL],
  'Alzate laterali inclinate (lean away)': [DL],
  'Tirate al mento (upright row)': [DL],
  'Y-raise': [DL, DP],
  'Alzate frontali manubri': [DA],
  'Alzate frontali bilanciere': [DA],
  'Alzate frontali con disco': [DA],
  'Alzate frontali ai cavi': [DA],
  'Alzate posteriori (rear delt)': [DP],
  'Alzate posteriori ai cavi': [DP],
  'Alzate posteriori su panca inclinata': [DP],
  'Reverse pec deck (rear delt machine)': [DP],
  'Face pull': [DP],
  'Rotazioni esterne ai cavi (cuffia)': [DP],
  // schiena
  'Trazioni presa prona': [DO],
  'Trazioni presa supina (chin-up)': [DO],
  'Trazioni presa neutra': [DO],
  'Trazioni zavorrate': [DO],
  'Trazioni assistite (macchina)': [DO],
  'Lat machine avanti': [DO],
  'Lat machine presa inversa': [DO],
  'Lat machine presa stretta': [DO],
  'Lat machine presa neutra': [DO],
  'Lat machine monolaterale': [DO],
  'Pullover ai cavi': [DO],
  'Pulley basso (rematore al cavo)': [DO, RO],
  'Pulley basso presa larga': [RO, TR],
  'Rematore bilanciere': [DO, RO],
  'Rematore manubrio singolo': [DO],
  'Rematore Pendlay': [DO, RO],
  'Rematore T-bar': [DO, RO],
  'Rematore alla macchina': [DO, RO],
  'Rematore Yates (presa supina)': [DO],
  'Rematore al multipower': [DO, RO],
  'Rematore manubri su panca inclinata (chest supported)': [RO, DO],
  'Rematore Meadows (landmine)': [DO],
  'Seal row': [RO, DO],
  'Rematore inverso (inverted row)': [RO, DO],
  'Rack pull': [TR, LO],
  'Superman (lombari a terra)': [LO],
  'Scrollate bilanciere (shrug)': [TR],
  'Scrollate manubri': [TR],
  'Scrollate al multipower': [TR],
  'Scrollate ai cavi': [TR],
  // glutei, con la schiena secondaria
  'Hyperextension (lombari)': [LO],
}

// Parole chiave per indovinare il gruppo dal nome, quando l'esercizio non è nel
// catalogo (tipico delle schede scritte a mano dal PT).
//
// L'ordine conta due volte:
//   - i gruppi con parole INEQUIVOCABILI vanno prima di quelli con parole
//     generiche, se no "Curl panca Scott" diventa petto per via di "panca";
//   - dentro un gruppo, le parole devono essere abbastanza lunghe da non
//     pescare dentro altre parole: "chin" (di chin-up) sta dentro "maCHINe" e
//     "macCHINa", e da solo mandava ogni macchina nella schiena.
// Glutei e polpacci stanno PRIMA delle gambe: "Calf raise alla leg press" è
// polpacci anche se dice "leg press", "Kickback glutei" non è tricipiti.
const KEYWORDS = [
  ['polpacci', ['polpacc', 'calf', 'gemell', 'soleo', 'tibial', 'sulle punte']],
  // ⚠️ Niente "ponte" né "bridge" da soli: il ponte laterale e il side bridge sono plank.
  ['glutei', ['glute', 'gluteo', 'glutei', 'hip thrust', 'hip bridge', 'abduct', 'abduzion', 'slanci', 'clamshell', 'frog pump', 'donkey kick', 'fire hydrant', 'pull through', 'curtsy', 'incrociati', 'sumo squat', 'reverse hyper']],
  ['gambe', ['squat', 'affond', 'leg press', 'leg ext', 'leg curl', 'rdl', 'pressa', 'adduct', 'hack', 'goblet', 'gambe tese', 'stacco', 'step up', 'nordic', 'sissy', 'pistol', 'wall sit', 'zercher', 'pendulum', 'belt squat', 'lunge', 'adduzion']],
  ['addome', ['crunch', 'plank', 'addominal', 'russian twist', 'sit-up', 'situp', 'leg raise', 'mountain climber', 'hollow', 'ab wheel', 'bicycle', 'v-up', 'core', 'dead bug', 'bird dog', 'pallof', 'woodchopper', 'toes to bar', 'knee raise', 'ginocchia al petto', 'dragon flag', 'flutter', 'sforbiciate', 'side bend', 'l-sit', 'obliqui', 'shoulder tap']],
  ['cardio', ['tapis', 'corsa', 'cyclette', 'ellittica', 'vogatore', 'rowing', 'corda per', 'spinning', 'hiit', 'camminata', 'stair', 'bici da', 'cardio', 'burpee', 'jumping jack', 'box jump', 'kettlebell', 'battle rope', 'slitta', 'sled', 'nuoto', 'air bike', 'assault bike', 'ski erg']],
  ['bicipiti', ['curl', 'hammer', 'scott', 'preacher', 'bicip', 'martello', 'spider']],
  ['tricipiti', ['push down', 'pushdown', 'french press', 'tricip', 'kickback', 'estensioni sopra', 'estensione manubrio', 'dips', 'presa stretta', 'skull', 'jm press', 'tate press', 'diamond', 'dip machine']],
  ['spalle', ['lento avanti', 'military', 'alzate', 'arnold', 'shoulder', 'upright', 'tirate al mento', 'rear delt', 'face pull', 'deltoid', 'push press', 'z press', 'y-raise', 'lento dietro', 'rotazioni esterne', 'cuffia']],
  ['schiena', ['trazion', 'scrollate', 'shrug', 'lat machine', 'rematore', 'pulley', 'pull down', 'pulldown', 'chin-up', 'chin up', 'hyperext', 'iperestensioni', 'pullover', 'row ', 'good morning', 'rack pull', 'trap bar', 'superman', 'seal row', 'inverted row', 'rematore inverso']],
  ['petto', ['panca', 'croci', 'chest', 'pector', 'push-up', 'piegament', 'spinte', 'distensioni', 'floor press', 'svend', 'landmine press']],
]

// Normalizza un nome per confronti (minuscolo, senza accenti, spazi compattati).
export function normalizzaNome(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Slug stabile di un esercizio (per key/selezione).
export function slugEsercizio(nome) {
  return normalizzaNome(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Indice inverso slug → gruppo, costruito una volta dal catalogo.
const INDICE_SLUG = (() => {
  const m = {}
  for (const g of GRUPPI) {
    for (const nome of LIBRERIA[g.id] || []) {
      const s = slugEsercizio(nome)
      if (!(s in m)) m[s] = g.id
    }
  }
  return m
})()

/**
 * Esercizi di un gruppo come oggetti { id, nome, gruppo }.
 * @param {string} gruppoId
 */
export function eserciziDiGruppo(gruppoId) {
  return (LIBRERIA[gruppoId] || []).map((nome) => ({
    id: slugEsercizio(nome),
    nome,
    gruppo: gruppoId,
  }))
}

// ---------------------------------------------------------------------------
// I GRUPPI di un esercizio — al plurale.
//
// Un esercizio può lavorare più gruppi: i dip sono petto E tricipiti, lo
// stacco rumeno è gambe E schiena. Per anni il modello ne ha tenuto uno solo
// (`gruppo`), e il recap di un allenamento di dip accendeva il petto e
// lasciava spenti i tricipiti.
//
// ⚠️ `gruppi` è l'elenco vero; `gruppo` resta, ed è il PRIMO dell'elenco —
// il principale. Non è un doppione da tenere per pigrizia: una trentina di
// punti dell'app (consigli, libreria, animazioni, excel) ragionano per gruppo
// principale e continuano a farlo. Chi ha bisogno di tutti i gruppi — il corpo
// che si accende, le pastiglie del recap, il filtro del feed — passa da
// `gruppiEsercizio`, e da nessun'altra parte. Per scriverli si passa da
// `patchGruppi`, che tiene le due cose allineate.
// ---------------------------------------------------------------------------

const ID_GRUPPI = new Set(GRUPPI.map((g) => g.id))

/**
 * Tutti i gruppi di un esercizio, dal principale.
 * In ordine: quelli scritti in `gruppi`; se mancano, il vecchio `gruppo`; se
 * manca anche quello, l'ipotesi dal nome (gruppiDaNome). ⚠️ Per un nome
 * fuori dalla libreria l'ipotesi dà UN gruppo solo: i secondari non si
 * indovinano, si scrivono — è il motivo per cui l'import chiede di confermarli.
 * ⚠️ Si leggono COME SONO SCRITTI: i gruppi rivisti della libreria
 * (gruppiProposti) arrivano su un esercizio salvato solo se chi l'ha salvato
 * li accetta (components/AvvisoSottogruppi).
 * @returns {string[]}
 */
export function gruppiEsercizio(e) {
  const scritti = Array.isArray(e?.gruppi) ? e.gruppi.filter((g) => ID_GRUPPI.has(g)) : []
  if (scritti.length > 0) return [...new Set(scritti)]
  if (e?.gruppo && ID_GRUPPI.has(e.gruppo)) return [e.gruppo]
  return gruppiDaNome(e?.nome)
}

/**
 * Solo i gruppi SCRITTI, senza ipotesi dal nome. Serve dove si modificano:
 * mostrare acceso un gruppo indovinato, che nel salvataggio non c'è, farebbe
 * credere di averlo già scelto.
 * @returns {string[]}
 */
export function gruppiScritti(e) {
  const scritti = Array.isArray(e?.gruppi) ? e.gruppi.filter((g) => ID_GRUPPI.has(g)) : []
  if (scritti.length > 0) return [...new Set(scritti)]
  return e?.gruppo && ID_GRUPPI.has(e.gruppo) ? [e.gruppo] : []
}

/**
 * La modifica da applicare a un esercizio per dargli questi gruppi: l'elenco
 * pulito (niente doppioni, niente id sconosciuti) e il principale allineato.
 * @param {string[]} gruppi
 * @returns {{ gruppi: string[], gruppo: string }}
 */
export function patchGruppi(gruppi) {
  const puliti = [...new Set((gruppi || []).filter((g) => ID_GRUPPI.has(g)))]
  return { gruppi: puliti, gruppo: puliti[0] || '' }
}

/**
 * Aggiunge o toglie un gruppo. Toccare il principale lo toglie e il secondo
 * diventa principale: l'ordine è quello in cui li si è scelti.
 */
export function alternaGruppo(gruppi, id) {
  const ora = gruppi || []
  return ora.includes(id) ? ora.filter((g) => g !== id) : [...ora, id]
}

// Gli esercizi scritti come "gambe" quando glutei e polpacci non c'erano (fino
// alla 37a): un calf raise era "gambe" perché non poteva essere altro.
const PRIMA_DENTRO_GAMBE = new Set(['glutei', 'polpacci'])

/**
 * Glutei e polpacci da quando sono gruppi loro: un esercizio che ha come gruppo
 * SOLO "gambe" e che dal nome è un esercizio per glutei o polpacci passa a
 * quel gruppo. Restituisce la modifica da applicare (`patchGruppi`), o null se
 * non c'è niente da cambiare. Si applica da sola, quando la scheda si carica
 * (data/model normalizzaScheda).
 *
 * ⚠️ Solo "gambe" da solo: chi ha scritto più gruppi li ha scelti uno per uno,
 * e quelli non si toccano. Vale per le schede e per gli allenamenti già fatti,
 * così recap e consigli contano un calf raise di un mese fa come polpacci.
 */
export function gruppiAggiornati(e) {
  const scritti = gruppiScritti(e)
  if (scritti.length !== 1 || scritti[0] !== 'gambe') return null
  const g = gruppoDaNome(e?.nome)
  return PRIMA_DENTRO_GAMBE.has(g) ? patchGruppi([g]) : null
}

/**
 * I gruppi rivisti della libreria (2026-10-19) PROPOSTI a un esercizio salvato:
 * la modifica da applicare (`patchGruppi`), o null. ⚠️ Non si applica da sola:
 * li propone l'avviso dei sottogruppi (components/AvvisoSottogruppi), e chi li
 * accetta li vede prima uno per uno.
 *
 * Si propongono a un esercizio della libreria coi gruppi che la libreria gli
 * dava UNA VOLTA. Le versioni di una volta sono due: fino al 2026-10-19 un
 * gruppo solo, la sezione in cui stava (GRUPPO_DI_PRIMA se è cambiata, se no
 * il principale di adesso); poi, per gli stacchi, gambe e schiena
 * (STACCHI_PRIMA), prima che arrivassero i glutei. Un dip "petto" diventa
 * petto e tricipiti, uno stacco rumeno "schiena" gambe, schiena e glutei, un
 * face pull "schiena" spalle, una scrollata "spalle" schiena, uno squat
 * "gambe" gambe e glutei.
 *
 * ⚠️ Solo le versioni di una volta, non qualunque gruppo: chi ha scritto i
 * bicipiti sullo stacco li tiene, chi gli ha tolto la schiena ("gambe" da
 * solo, che la libreria non gli ha mai dato) pure, e gli stessi gruppi in un
 * altro ordine non si propongono (il principale l'ha scelto chi li ha scritti).
 */
export function gruppiProposti(e) {
  const scritti = gruppiScritti(e)
  if (scritti.length === 0) return null
  const slug = slugEsercizio(e?.nome)
  if (!INDICE_SLUG[slug]) return null
  const adesso = gruppiDaNome(e.nome)
  const uguali = (a, b) => a.length === b.length && a.every((g) => b.includes(g))
  if (uguali(scritti, adesso)) return null
  const prima = [[GRUPPO_DI_PRIMA[slug] ?? adesso[0]], ...(STACCHI_PRIMA[slug] ? [STACCHI_PRIMA[slug]] : [])]
  return prima.some((p) => uguali(scritti, p)) ? patchGruppi(adesso) : null
}

// Il gruppo che la libreria dava, fino al 2026-10-19, agli esercizi che hanno
// cambiato gruppo principale.
const GRUPPO_DI_PRIMA = Object.fromEntries([
  ...['Stacco da terra', 'Stacco rumeno', 'Stacco con trap bar', 'Good morning', 'Hyperextension (lombari)', 'Face pull'].map(
    (nome) => [slugEsercizio(nome), 'schiena'],
  ),
  ...['Scrollate bilanciere (shrug)', 'Scrollate manubri', 'Scrollate al multipower', 'Scrollate ai cavi'].map(
    (nome) => [slugEsercizio(nome), 'spalle'],
  ),
])

// Gli stacchi fra la prima revisione dei gruppi e l'arrivo dei glutei (sempre
// il 2026-10-19): gambe e schiena.
const STACCHI_PRIMA = Object.fromEntries(
  ['Stacco da terra', 'Stacco rumeno', 'Stacco con trap bar', 'Good morning', 'Stacco gambe tese'].map((nome) => [
    slugEsercizio(nome),
    ['gambe', 'schiena'],
  ]),
)

/**
 * Prova a dedurre il gruppo muscolare dal nome di un esercizio.
 * @param {string} nome
 * @returns {string} id del gruppo, o '' se non riconosciuto
 */
export function gruppoDaNome(nome) {
  const n = normalizzaNome(nome)
  if (!n) return ''
  const slug = slugEsercizio(nome)
  if (INDICE_SLUG[slug]) return INDICE_SLUG[slug]
  for (const [gruppo, chiavi] of KEYWORDS) {
    if (chiavi.some((k) => n.includes(k.trim()))) return gruppo
  }
  return ''
}

const INDICE_ALTRI = Object.fromEntries(
  Object.entries(ALTRI_GRUPPI).map(([nome, gruppi]) => [slugEsercizio(nome), gruppi]),
)

/**
 * Tutti i gruppi che si sanno dal nome: il principale (gruppoDaNome) e, per un
 * esercizio della libreria, gli altri di ALTRI_GRUPPI. [] se non si sa.
 * @param {string} nome
 * @returns {string[]}
 */
export function gruppiDaNome(nome) {
  const g = gruppoDaNome(nome)
  if (!g) return []
  return [g, ...(INDICE_ALTRI[slugEsercizio(nome)] || []).filter((x) => x !== g)]
}

const INDICE_SOTTO = Object.fromEntries(
  Object.entries(SOTTOGRUPPI_ESERCIZI).map(([nome, sotto]) => [slugEsercizio(nome), sotto]),
)

// I sottogruppi dalle PAROLE del nome, per gli esercizi scritti a mano (le
// schede incollate dal PT: "Leg curl", "Lat machine", "Alzate laterali").
// Come KEYWORDS: prima le parole più precise ("alzate laterali" prima di
// "alzate"), e mai pezzi che pescano dentro altre parole. Anche le
// abbreviazioni delle schede vere: "leg ext" (che copre "leg extension"), "rdl".
const SOTTO_KEYWORDS = [
  [[F], ['leg curl', 'curl femorali', 'femorali', 'nordic', 'glute ham']],
  [[F, LO], ['stacco', 'good morning', 'deadlift', 'rdl']],
  [[AD], ['adductor', 'adduzion', 'adduttor']],
  [[Q], ['squat', 'leg ext', 'leg press', 'pressa', 'affond', 'lunge', 'hack', 'step up', 'quadricip', 'sissy', 'wall sit']],
  [[DP], ['posterior', 'rear delt', 'face pull', 'reverse pec', 'reverse fly', 'cuffia', 'rotazioni esterne']],
  [[DL], ['alzate laterali', 'laterali', 'lateral raise', 'tirate al mento', 'upright']],
  [[DA], ['alzate frontali', 'frontali', 'front raise']],
  [[DA, DL], ['lento', 'military', 'shoulder press', 'push press', 'arnold', 'overhead press', 'z press']],
  [[TR], ['scrollate', 'shrug', 'trapez']],
  [[LO], ['hyperext', 'iperestension', 'lombari', 'superman']],
  [[DO], ['trazion', 'lat machine', 'pull down', 'pulldown', 'pull-up', 'pullup', 'chin', 'pullover', 'dorsal']],
  [[DO, RO], ['rematore', 'pulley', 'row', 'romboid']],
]

/** I sottogruppi che si sanno da un nome: la libreria, poi le parole. */
export function sottogruppiDaNome(nome) {
  const esatti = INDICE_SOTTO[slugEsercizio(nome)]
  if (esatti) return esatti
  const vicino = nomeInLibreria(nome)
  if (vicino && INDICE_SOTTO[slugEsercizio(vicino)]) return INDICE_SOTTO[slugEsercizio(vicino)]
  const n = normalizzaNome(nome)
  if (!n) return []
  for (const [sotto, chiavi] of SOTTO_KEYWORDS) {
    if (chiavi.some((k) => n.includes(k))) return sotto
  }
  return []
}

/**
 * I sottogruppi (lib/muscoli) di un esercizio, il principale per primo: quelli
 * SCRITTI (`sottogruppi`, scelti nell'editor o all'import) se ci sono, se no
 * quelli della libreria per il suo nome (o per il nome della libreria più
 * vicino, o per le parole del nome). Sempre solo quelli di un gruppo
 * dell'esercizio: chi ha tolto la schiena allo stacco non vede i lombari.
 * [] se non si sa: allora il gruppo si accende intero.
 * ⚠️ `sottogruppi: []` scritto vuol dire "nessuno, il gruppo intero": è una
 * scelta, non un dato che manca.
 * @returns {string[]}
 */
export function sottogruppiEsercizio(e) {
  const base = Array.isArray(e?.sottogruppi) ? e.sottogruppi : sottogruppiDaNome(e?.nome)
  if (!base.length) return []
  const gruppi = new Set(gruppiEsercizio(e))
  return [...new Set(base)].filter((id) => gruppi.has(sottogruppoDi(id)?.gruppo))
}

/**
 * La scheda coi muscoli di ogni esercizio SCRITTI: quelli che l'editor e
 * l'import mostrano (della libreria, se nessuno li ha cambiati) diventano
 * quelli salvati. Da lì in poi i disegni del corpo colorano quello che c'è
 * scritto, non un'ipotesi dal nome rifatta ogni volta. Chi li aveva già
 * scritti (anche `[]`, "il gruppo intero") li tiene. Restituisce la stessa
 * scheda se non c'è niente da scrivere.
 */
export function conMuscoliScritti(scheda) {
  let cambiata = false
  const giorni = (scheda?.giorni || []).map((g) => {
    let cambiato = false
    const esercizi = (g.esercizi || []).map((e) => {
      const patch = {}
      if (!gruppiScritti(e).length) {
        const gr = gruppiEsercizio(e)
        if (gr.length) Object.assign(patch, patchGruppi(gr))
      }
      if (!Array.isArray(e.sottogruppi)) patch.sottogruppi = sottogruppiEsercizio({ ...e, ...patch })
      if (!Object.keys(patch).length) return e
      cambiato = true
      return { ...e, ...patch }
    })
    if (!cambiato) return g
    cambiata = true
    return { ...g, esercizi }
  })
  return cambiata ? { ...scheda, giorni } : scheda
}

/** Il nome è uno degli esercizi della libreria (scritto uguale)? */
export function inLibreria(nome) {
  return !!INDICE_SLUG[slugEsercizio(nome)]
}

/**
 * La modifica per dare a un esercizio questi gruppi, coi sottogruppi a posto:
 * restano quelli dei gruppi che restano, e a un gruppo appena acceso vanno
 * quelli della libreria per quel gruppo (chi accende la schiena allo stacco
 * trova i lombari). Si usa dove si scelgono i gruppi a mano (SceltaGruppi).
 * `suggerisci: false` per un esercizio fuori dalla libreria: i sottogruppi li
 * sceglie chi l'ha scritto, niente ipotesi dalle parole del nome.
 * @returns {{ gruppi: string[], gruppo: string, sottogruppi: string[] }}
 */
export function patchMuscoli(e, gruppi, { suggerisci = true } = {}) {
  const pg = patchGruppi(gruppi)
  const prima = new Set(gruppiScritti(e))
  const restano = Array.isArray(e?.sottogruppi) || !suggerisci ? e?.sottogruppi || [] : sottogruppiEsercizio(e)
  const nuovi = suggerisci ? sottogruppiDaNome(e?.nome).filter((s) => !prima.has(sottogruppoDi(s)?.gruppo)) : []
  const sottogruppi = [...new Set([...restano, ...nuovi])].filter((s) => pg.gruppi.includes(sottogruppoDi(s)?.gruppo))
  return { ...pg, sottogruppi }
}

/**
 * Cosa manca a un esercizio FUORI dalla libreria perché si sappia cosa lavora:
 * 'gruppo' (nessun gruppo scritto), 'sottogruppo' (un gruppo coi sottogruppi —
 * gambe, spalle, schiena — senza nessuno dei suoi scelto) o '' se c'è tutto.
 * Per un esercizio della libreria '' sempre: lo dice la libreria.
 */
export function muscoliMancanti(e) {
  if (inLibreria(e?.nome)) return ''
  const gruppi = gruppiScritti(e)
  if (!gruppi.length) return 'gruppo'
  const sotto = Array.isArray(e?.sottogruppi) ? e.sottogruppi : []
  const conSotto = gruppi.filter((g) => SOTTOGRUPPI.some((s) => s.gruppo === g))
  return conSotto.some((g) => !sotto.some((s) => sottogruppoDi(s)?.gruppo === g)) ? 'sottogruppo' : ''
}

// ---------------------------------------------------------------------------
// Cercare un esercizio per nome: la ricerca dell'editor (components/
// CercaEsercizio) e il "Usa il nome della libreria" dell'import.
//
// Si confrontano le PAROLE, senza accenti, maiuscole e parole vuote ("ai",
// "con"): "panca bil" trova "Panca piana bilanciere", "Military" trova "Lento
// avanti bilanciere (military)". Una parola cercata vale se è l'inizio di una
// parola del nome.
// ---------------------------------------------------------------------------

const PAROLE_VUOTE = new Set(['a', 'ai', 'al', 'alla', 'alle', 'con', 'da', 'di', 'del', 'e', 'in', 'la', 'le', 'il', 'su', 'per', 'the', 'with', 'of'])

function paroleDi(nome) {
  return normalizzaNome(nome)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p && !PAROLE_VUOTE.has(p))
}

// Quanto `nome` risponde a `parole` (0..1): la parte delle parole cercate che
// si trova, e a parità chi ha meno parole in più.
function punteggio(parole, nome) {
  const sue = paroleDi(nome)
  if (!parole.length || !sue.length) return 0
  const trovate = parole.filter((p) => sue.some((s) => s.startsWith(p))).length
  if (!trovate) return 0
  // "lat" è più Lat machine che Plank laterale: conta come comincia il nome.
  const inTesta = sue[0].startsWith(parole[0]) ? 0.05 : 0
  return trovate / parole.length - (sue.length - trovate) * 0.01 + inTesta
}

const NOMI_LIBRERIA = Object.entries(LIBRERIA).flatMap(([gruppo, nomi]) => nomi.map((nome) => ({ nome, gruppo })))

/**
 * Gli esercizi che rispondono a una ricerca: prima i propri (`propri`, i nomi
 * già usati nelle schede e nello storico), poi la libreria, dai più vicini.
 * @param {string} testo
 * @param {string[]} [propri]
 * @param {number} [quanti]
 * @returns {{ nome: string, gruppo: string, proprio: boolean }[]}
 */
export function cercaEsercizi(testo, propri = [], quanti = 30) {
  const parole = paroleDi(testo)
  const visti = new Set()
  const tutti = [
    ...propri.map((nome) => ({ nome, gruppo: gruppoDaNome(nome), proprio: true })),
    ...NOMI_LIBRERIA.map((e) => ({ ...e, proprio: false })),
  ].filter((e) => {
    const k = normalizzaNome(e.nome)
    if (!k || visti.has(k)) return false
    visti.add(k)
    return true
  })
  if (!parole.length) return tutti.slice(0, quanti)
  return tutti
    .map((e) => ({ e, p: punteggio(parole, e.nome) }))
    // Tutte le parole cercate devono esserci: "panca bil" non trova le croci.
    .filter(({ p }) => p > 0.9)
    // I propri prima: è quasi sempre uno di quelli che si cerca.
    .sort((a, b) => Number(b.e.proprio) - Number(a.e.proprio) || b.p - a.p)
    .slice(0, quanti)
    .map(({ e }) => e)
}

/**
 * Il nome della libreria che contiene tutte le parole di un nome scritto a
 * mano (il più corto, a parità), se non è già lui: "Panca piana" → "Panca piana bilanciere",
 * "Military" → "Lento avanti bilanciere (military)". null se non c'è.
 */
export function nomeInLibreria(nome) {
  const parole = paroleDi(nome)
  if (!parole.length) return null
  let meglio = null
  for (const e of NOMI_LIBRERIA) {
    const sue = paroleDi(e.nome)
    // Qui le parole devono esserci intere: "pec" non è "pectoral".
    const trovate = parole.filter((p) => sue.includes(p)).length
    const p = trovate / parole.length - (sue.length - trovate) * 0.01
    if (trovate && (!meglio || p > meglio.p)) meglio = { p, nome: e.nome }
  }
  // Tutte le parole scritte devono esserci: "Curl a 45 manubri" non è il
  // curl alternato, e proporlo vorrebbe dire sbagliare esercizio.
  if (!meglio || meglio.p < 0.9) return null
  return normalizzaNome(meglio.nome) === normalizzaNome(nome) ? null : meglio.nome
}

/**
 * Gli esercizi che una persona ha già usato, dal più recente, ognuno con lo
 * schema dell'ultima volta: quello di un allenamento fatto, o se non l'ha mai
 * fatto quello scritto in scheda. Servono alla ricerca dell'editor, che li
 * propone per primi e ne copia lo schema.
 * @param {object[]} schede
 * @returns {{ nome: string, schema: object|null, muscoli: {gruppi: string[], sottogruppi?: string[]}|null }[]}
 */
export function eserciziPropri(schede) {
  const visti = new Map() // nome normalizzato → { nome, schema, muscoli, data }
  const metti = (e, schema, data) => {
    const k = normalizzaNome(e.nome)
    if (!k) return
    const c = visti.get(k)
    // I muscoli scritti l'ultima volta: un esercizio fuori dalla libreria li
    // ha scelti chi l'ha usato, e la volta dopo non si richiedono.
    const gruppi = gruppiScritti(e)
    const muscoli = gruppi.length
      ? { gruppi, ...(Array.isArray(e.sottogruppi) ? { sottogruppi: e.sottogruppi } : {}) }
      : null
    if (!c || data > c.data) visti.set(k, { nome: String(e.nome).trim(), schema: schema || null, muscoli, data })
  }
  for (const s of schede || []) {
    for (const g of s.giorni || []) {
      for (const e of g.esercizi || []) {
        const schema = e.variaPerSettimana ? e.settimane?.[0] : e.schemaBase
        metti(e, schema, s.creataIl || '')
      }
    }
    for (const c of s.completamenti || []) {
      for (const e of c.esercizi || []) metti(e, e.schema, c.data || '')
    }
  }
  return [...visti.values()]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .map(({ nome, schema, muscoli }) => ({ nome, schema, muscoli }))
}
