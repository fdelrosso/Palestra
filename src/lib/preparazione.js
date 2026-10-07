// ---------------------------------------------------------------------------
// Il riscaldamento (con la mobilità) prima degli esercizi e lo stretching alla
// fine: due campi FACOLTATIVI del giorno (`Giorno.riscaldamento`,
// `Giorno.stretching`), testo con una voce per riga — come li scrive un PT,
// "5' cyclette", "rotazioni spalle 2x10". Non sono esercizi: niente serie da
// chiudere, niente recupero, il motore dei consigli non li conta.
//
// ⚠️ Vuoti = non ci sono: nessuna schermata deve parlarne. Una scheda senza
// riscaldamento è normale, non una scheda a cui manca qualcosa.
// ---------------------------------------------------------------------------

export const RISCALDAMENTO = {
  campo: 'riscaldamento',
  titolo: 'Riscaldamento e mobilità',
  aggiungi: 'Riscaldamento e mobilità',
  esempio: "Una voce per riga, es.\n5' cyclette\nRotazioni spalle con elastico 2x10\nSquat a corpo libero 15",
}

export const STRETCHING = {
  campo: 'stretching',
  titolo: 'Stretching finale',
  aggiungi: 'Stretching finale',
  esempio: 'Una voce per riga, es.\nQuadricipiti 30" per gamba\nIschiocrurali 30"\nPettorali al muro 30"',
}

/** Le voci di uno dei due campi: una per riga, senza le righe vuote. */
export function vociDi(testo) {
  return String(testo || '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
}
