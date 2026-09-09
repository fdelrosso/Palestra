// Converte la notazione (umana e irregolare) del recupero in secondi.
// Esempi dai messaggi del PT:
//   "1min"     -> 60
//   "1,15min"  -> 75   (1 min 15 s)
//   "1,45min"  -> 105  (1 min 45 s)
//   "1,5min"   -> 90   (1 min e mezzo: una sola cifra dopo la virgola = decimi di minuto)
//   "2min"     -> 120
//   '30" ...'  -> 30
//
// È una stima: nell'app il valore resta modificabile e si mostra sempre il
// testo originale, così un'eventuale interpretazione sbagliata si corregge al volo.
export function parseRecuperoSec(str) {
  if (!str) return null
  const s = String(str).toLowerCase().replace(/\s+/g, ' ').trim()

  // Minuti con virgola/punto: "1,15min", "1.5 min", "1,45"
  let m = s.match(/(\d+)[,.](\d+)\s*(?:min|m|')?/)
  if (m) {
    const min = parseInt(m[1], 10)
    const frac = m[2]
    if (frac.length === 1) {
      // decimi di minuto: ",5" = mezzo minuto
      return min * 60 + Math.round((parseInt(frac, 10) / 10) * 60)
    }
    // secondi: ",15" = 15 s
    return min * 60 + parseInt(frac, 10)
  }

  // Minuti interi: "2min", "1 min"
  m = s.match(/(\d+)\s*min\b/)
  if (m) return parseInt(m[1], 10) * 60

  // Secondi: '30"', "45s", "30 sec"
  m = s.match(/(\d+)\s*(?:"|''|sec|s)(?!\w)/)
  if (m) return parseInt(m[1], 10)

  // Solo minuti con apice: "2'"
  m = s.match(/(\d+)\s*'/)
  if (m) return parseInt(m[1], 10) * 60

  // Numero nudo: euristica (>=10 -> secondi, altrimenti minuti)
  m = s.match(/^(\d+)$/)
  if (m) {
    const n = parseInt(m[1], 10)
    return n >= 10 ? n : n * 60
  }
  return null
}

// Formatta i secondi come m:ss.
export function formatSec(totale) {
  const t = Math.max(0, Math.round(totale))
  const min = Math.floor(t / 60)
  const sec = t % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}
