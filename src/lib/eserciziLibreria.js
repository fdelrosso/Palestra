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

import { GRUPPI } from './muscoli'

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
    'Stacco da terra',
    'Stacco rumeno',
    'Hyperextension (lombari)',
    'Face pull',
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
    'Calf raise in piedi',
    'Calf raise seduto',
    'Adductor machine',
    'Abductor machine',
    'Step up',
    'Stacco sumo',
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
    'Scrollate bilanciere (shrug)',
    'Scrollate manubri',
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
  ],
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
const KEYWORDS = [
  ['gambe', ['squat', 'affond', 'leg press', 'leg extension', 'leg curl', 'pressa', 'polpacc', 'calf', 'adduct', 'abduct', 'hack', 'goblet', 'gambe tese', 'stacco sumo', 'step up']],
  ['addome', ['crunch', 'plank', 'addominal', 'russian twist', 'sit-up', 'situp', 'leg raise', 'mountain climber', 'hollow', 'ab wheel', 'bicycle', 'v-up', 'core']],
  ['cardio', ['tapis', 'corsa', 'cyclette', 'ellittica', 'vogatore', 'rowing', 'corda per', 'spinning', 'hiit', 'camminata', 'stair', 'bici da', 'cardio']],
  ['bicipiti', ['curl', 'hammer', 'scott', 'preacher', 'bicip', 'martello', 'spider']],
  ['tricipiti', ['push down', 'pushdown', 'french press', 'tricip', 'kickback', 'estensioni sopra', 'estensione manubrio', 'dips', 'presa stretta']],
  ['spalle', ['lento avanti', 'military', 'alzate', 'arnold', 'shoulder', 'upright', 'tirate al mento', 'rear delt', 'scrollate', 'shrug', 'face pull', 'deltoid']],
  ['schiena', ['trazion', 'lat machine', 'rematore', 'pulley', 'stacco', 'pull down', 'pulldown', 'chin-up', 'chin up', 'hyperext', 'iperestensioni', 'pullover', 'row ']],
  ['petto', ['panca', 'croci', 'chest', 'pector', 'push-up', 'piegament', 'spinte', 'distensioni']],
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
