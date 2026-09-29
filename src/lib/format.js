import { fasiDi } from './fasi.js'

// Formattazione della parte "serie × ripetizioni" di uno schema. Con più fasi
// (lib/fasi) una per fase: "3×5 + 2×2".
export function formatSerieRip(schema) {
  const fasi = fasiDi(schema)
  if (fasi.length > 1) return fasi.map(serieRipDiUna).join(' + ')
  return serieRipDiUna(schema || {})
}

function serieRipDiUna(schema) {
  const serie = (schema.serie || '').trim()
  const rip = (schema.ripetizioni || '').trim()
  if (serie && rip) return `${serie}×${rip}`
  if (serie) return `${serie} serie`
  if (rip) return `${rip} rip`
  return ''
}

// Il carico da mostrare. Con più fasi e pesi diversi, uno per fase nello
// stesso ordine di formatSerieRip: "3×5 + 2×2" accanto a "80kg + 90kg".
// ⚠️ Mai il campo grezzo di un esercizio a fasi: sarebbe
// "80kg/80kg/80kg/90kg/90kg", giusto ma illeggibile.
export function formatCarico(schema) {
  const fasi = fasiDi(schema)
  if (fasi.length < 2) return (schema?.carico || '').trim()
  const carichi = fasi.map((f) => f.carico.trim())
  if (carichi.every((c) => c === carichi[0])) return carichi[0]
  return carichi.map((c) => c || '—').join(' + ')
}

// Uno schema è "vuoto" se non ha nessun dato utile.
export function schemaHaContenuto(schema) {
  if (!schema) return false
  return ['serie', 'ripetizioni', 'carico', 'recupero', 'nota'].some(
    (k) => (schema[k] || '').trim() !== '',
  )
}

// Etichetta breve di un giorno per liste/badge.
export function etichettaGiorno(giorno) {
  if (giorno.tipo === 'rest') return giorno.nota ? `Rest · ${giorno.nota}` : 'Rest'
  return giorno.nome || 'Giorno'
}

// Data + ora in italiano, con l'iniziale maiuscola. Es. "Lun 1 set, 18:30".
export function dataOra(iso) {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Data per esteso. Es. "Lunedì 1 settembre 2026".
export function dataLunga(iso) {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Quando, nel modo più corto che si capisce ancora: è l'ora nell'elenco delle
// chat, dove lo spazio è una riga sola. Oggi "18:30", ieri "Ieri", in
// settimana "Lun", quest'anno "12 set", prima "12/09/25".
export function quandoBreve(iso, ora = new Date()) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const inizio = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const giorni = Math.round((inizio(ora) - inizio(d)) / 86400000)
  if (giorni <= 0) {
    return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(d)
  }
  if (giorni === 1) return 'Ieri'
  if (giorni < 7) {
    const g = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d)
    return g.charAt(0).toUpperCase() + g.slice(1)
  }
  if (d.getFullYear() === ora.getFullYear()) {
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(d)
  }
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d)
}
