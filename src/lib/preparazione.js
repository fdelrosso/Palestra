// ---------------------------------------------------------------------------
// Il riscaldamento (con la mobilità) prima degli esercizi e lo stretching alla
// fine: due campi FACOLTATIVI del giorno (`Giorno.riscaldamento`,
// `Giorno.stretching`), testo con una voce per riga — come li scrive un PT,
// "5' cyclette", "rotazioni spalle 2x10". Non sono esercizi: niente serie da
// chiudere, niente recupero, il motore dei consigli non li conta.
//
// ⚠️ Vuoti = non ci sono: nessuna schermata deve parlarne. Una scheda senza
// riscaldamento è normale, non una scheda a cui manca qualcosa.
//
// IL CARDIO DI RISCALDAMENTO (116ª): un esercizio di cardio può essere segnato
// `riscaldamento: true` (dal foglio dell'esercizio). Resta un esercizio, col
// suo timer e i suoi dati, ma sta in testa al giorno e nella barra
// dell'allenamento fa parte del riscaldamento, insieme alle voci di testo se ci
// sono. Il segno vale solo sul cardio: cambiato il tipo, non conta più.
// ---------------------------------------------------------------------------

import { normalizzaNome, tipoEsercizio } from './eserciziLibreria.js'

/** È un cardio di riscaldamento? */
export function diRiscaldamento(e) {
  return !!e?.riscaldamento && tipoEsercizio(e) === 'cardio'
}

/**
 * Gli esercizi coi cardio di riscaldamento in testa (fra loro e fra gli altri
 * l'ordine resta). Non sono in superserie con niente: si tolgono i legami loro
 * e di chi li seguiva. La stessa lista se è già in ordine.
 */
export function riscaldamentoInTesta(esercizi) {
  const risc = esercizi.map(diRiscaldamento)
  const inOrdine = risc.every((r, i) => !r || i === 0 || risc[i - 1])
  const legati = esercizi.some((e, i) => e.insiemeAlPrecedente && (risc[i] || risc[i - 1]))
  if (inOrdine && !legati) return esercizi
  const slega = (e, i) => (e.insiemeAlPrecedente && (risc[i] || risc[i - 1]) ? { ...e, insiemeAlPrecedente: false } : e)
  const tutti = esercizi.map(slega)
  return [...tutti.filter((_, i) => risc[i]), ...tutti.filter((_, i) => !risc[i])]
}

const immagini = (nome) => [1, 2, 3, 4, 5, 6].map((k) => `/preparazione/${nome}-${k}.png`)

export const RISCALDAMENTO = {
  campo: 'riscaldamento',
  titolo: 'Riscaldamento e mobilità',
  aggiungi: 'Riscaldamento e mobilità',
  // Gli esercizi disegnati che girano nella card dell'allenamento, come il
  // modellino in quelle degli esercizi (public/preparazione).
  sfondo: immagini('riscaldamento'),
  esempio: "Una voce per riga, es.\n5' cyclette\nRotazioni spalle con elastico 2x10\nSquat a corpo libero 15",
}

export const STRETCHING = {
  campo: 'stretching',
  titolo: 'Stretching finale',
  aggiungi: 'Stretching finale',
  sfondo: immagini('stretching'),
  esempio: 'Una voce per riga, es.\nQuadricipiti 30" per gamba\nIschiocrurali 30"\nPettorali al muro 30"',
}

// Quale disegno del riscaldamento (public/preparazione/riscaldamento-N.png)
// è quale macchina.
const MACCHINE = [
  [/tapis|corsa|camminata|running/, 1],
  [/cyclette|bici|bike|spinning/, 2],
  [/ellittica/, 3],
  [/vogatore|rowing|ski erg/, 4],
  [/corda/, 5],
  [/stair|scala|step/, 6],
]

/**
 * I disegni dietro alla card di un esercizio di cardio: quello della sua
 * macchina se c'è (il tapis roulant ha il suo), se no tutti, a rotazione.
 */
export function immaginiCardio(nome) {
  const n = normalizzaNome(nome)
  const k = MACCHINE.find(([re]) => re.test(n))?.[1]
  return k ? [RISCALDAMENTO.sfondo[k - 1]] : RISCALDAMENTO.sfondo
}

/** Le voci di uno dei due campi: una per riga, senza le righe vuote. */
export function vociDi(testo) {
  return String(testo || '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
}
