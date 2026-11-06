// La frase di una notifica: la stessa per la push e per il cuoricino (src/lib/notifiche).
// Sta qui perché la funzione gira fuori dall'app, e l'app può importarla da qui.

/**
 * Chi ha fatto cosa, in parole.
 * @param {string[]} nomi  dal più recente
 * @param {number} persone quante in tutto
 */
export function chiInParole(nomi, persone) {
  const n = Math.max(persone, nomi.length)
  if (nomi.length === 0) return n === 1 ? 'Qualcuno' : `${n} persone`
  if (n === 1) return nomi[0]
  if (n === 2 && nomi.length >= 2) return `${nomi[0]} e ${nomi[1]}`
  const primi = nomi.slice(0, 2)
  const altri = n - primi.length
  return `${primi.join(', ')} e ${altri === 1 ? 'un altro' : `altri ${altri}`}`
}

/** La frase, senza il nome dell'allenamento. */
export function frase(r) {
  const chi = chiInParole(r.nomi, r.persone)
  const plurale = Math.max(r.persone, r.nomi.length) > 1
  if (r.tipo === 'mi_piace') return `${chi} ${plurale ? 'hanno' : 'ha'} messo mi piace`
  const quanti = r.quanti > 1 ? ` (${r.quanti} commenti)` : ''
  return `${chi} ${plurale ? 'hanno' : 'ha'} commentato${quanti}`
}
