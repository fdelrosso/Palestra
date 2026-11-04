// ---------------------------------------------------------------------------
// Le regole della password, le stesse impostate su Supabase (Authentication →
// Email → Password requirements: almeno 8 caratteri, "Lowercase, uppercase
// letters, digits and symbols").
//
// ⚠️ Chi decide e' Supabase: qui si ripetono le regole solo per dirle PRIMA a
// chi sceglie la password, invece di fargli scoprire dopo l'invio cosa manca.
// Se si cambiano dalla dashboard vanno cambiate anche qui.
// Le lettere contano solo se sono quelle senza accento, e i simboli solo
// questi: e' cosi' che li conta Supabase (una "è" o uno spazio non bastano).
// ---------------------------------------------------------------------------

export const PASSWORD_MIN = 8

const SIMBOLI = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export const REQUISITI_PASSWORD = [
  { id: 'lunga', testo: `Almeno ${PASSWORD_MIN} caratteri`, ok: (pw) => pw.length >= PASSWORD_MIN },
  { id: 'minuscola', testo: 'Una lettera minuscola', ok: (pw) => /[a-z]/.test(pw) },
  { id: 'maiuscola', testo: 'Una lettera maiuscola', ok: (pw) => /[A-Z]/.test(pw) },
  { id: 'numero', testo: 'Un numero', ok: (pw) => /[0-9]/.test(pw) },
  { id: 'simbolo', testo: 'Un simbolo, es. ! ? @ # . -', ok: (pw) => [...pw].some((c) => SIMBOLI.includes(c)) },
]

/** La frase da mostrare se alla password manca qualcosa; '' se va bene. */
export function errorePassword(pw) {
  if (REQUISITI_PASSWORD.every((r) => r.ok(pw))) return ''
  return 'La password non va ancora bene: sotto il campo trovi cosa manca.'
}
