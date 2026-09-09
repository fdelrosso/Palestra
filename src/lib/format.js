// Formattazione della parte "serie × ripetizioni" di uno schema.
export function formatSerieRip(schema) {
  const serie = (schema.serie || '').trim()
  const rip = (schema.ripetizioni || '').trim()
  if (serie && rip) return `${serie}×${rip}`
  if (serie) return `${serie} serie`
  if (rip) return `${rip} rip`
  return ''
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
