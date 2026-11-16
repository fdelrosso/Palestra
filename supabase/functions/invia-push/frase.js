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

// ---- Fra PT e atleta: le stesse frasi nel cuoricino (src/lib/notifiche) e nella push ----

/** La frase di una notifica di Check e video. */
export function fraseNotificaCheck(r) {
  const cosa = r.categoria === 'esecuzione' ? 'un video di esecuzione' : 'una foto del check'
  if (r.tipo === 'condiviso') return `${r.chi} ti ha mandato ${cosa}`
  return `${r.chi} ha commentato ${r.categoria === 'esecuzione' ? 'il video' : 'la foto'}`
}

/** La frase di una notifica delle schede del PT. `data` formatta la scadenza. */
export function fraseNotificaScheda(r, data = (x) => x) {
  const s = `«${r.nome}»`
  switch (r.tipo) {
    case 'richiesta':
      return `${r.chi} chiede di rinnovare ${s}`
    case 'accettata':
      return `${r.chi} ha rinnovato ${s}${r.scadenza ? ` fino al ${data(r.scadenza)}` : ''}`
    case 'rifiutata':
      return `${r.chi} non ha rinnovato ${s}`
    case 'scaduta':
      return `${s} è scaduta: puoi chiedere il rinnovo a ${r.chi}`
    case 'modificata':
      return `${r.chi} ha modificato ${s}`
    case 'allegato-video':
    case 'allegato-foto':
    case 'allegato-consiglio': {
      const [esercizio, giorno] = String(r.ultimoTesto || '').split('|')
      const cosa = { 'allegato-video': 'un video', 'allegato-foto': 'una foto', 'allegato-consiglio': 'un consiglio' }[r.tipo]
      const dove = [esercizio && `«${esercizio}»`, giorno && `(${giorno})`].filter(Boolean).join(' ')
      return `${r.chi} ha aggiunto ${cosa}${dove ? ` su ${dove}` : ''} in ${s}`
    }
    case 'allunga-richiesta':
      return `${r.chi} chiede di allungare ${s}`
    case 'allunga-accettata':
      return `${r.chi} ha allungato ${s}${r.settimane ? ` di ${r.settimane} settiman${r.settimane === 1 ? 'a' : 'e'}` : ''}`
    case 'allunga-rifiutata':
      return `${r.chi} non ha allungato ${s}`
    case 'sbloccata':
      return `${r.chi} ha sbloccato ${s}${r.settimane ? ` fino alla settimana ${r.settimane}` : ''}`
    default:
      return s
  }
}

/** La frase di una notifica di appuntamento. `orario` scrive giorno e ora. */
export function fraseNotificaAppuntamento(r, orario = (o) => `${o.giorno} ${o.ora}`) {
  switch (r.tipo) {
    case 'richiesta':
      // Al PT la chiede l'atleta; all'atleta la propone il PT.
      return r.sonoPt ? `${r.chi} chiede un appuntamento` : `${r.chi} ti propone un appuntamento`
    case 'proposte':
      return `${r.chi} ha proposto altri orari per l’appuntamento`
    case 'fissato':
      return `Appuntamento con ${r.chi} fissato${r.giorno ? `: ${orario({ giorno: r.giorno, ora: r.ora })}` : ''}`
    case 'annullato':
      // Era fissato (giorno e ora restano anche annullato): si dice quale.
      // Senza, era ancora una trattativa.
      return r.giorno
        ? `${r.chi} ha annullato l’appuntamento fissato per ${orario({ giorno: r.giorno, ora: r.ora })}`
        : `${r.chi} ha lasciato perdere la richiesta di appuntamento`
    default:
      return `Appuntamento con ${r.chi}`
  }
}

/** La frase della notifica di un nuovo atleta. */
export function fraseNotificaNuovoAtleta(r) {
  return `Nuovo atleta seguito: ${r.chi}`
}

/** La frase della notifica di un atleta che ha lasciato. */
export function fraseNotificaAtletaPerso(r) {
  return `${r.chi} ha smesso di farsi seguire da te`
}

/** La frase della notifica di un PT che ha smesso di seguire. */
export function fraseNotificaPtPerso(r) {
  return `${r.chi} ha smesso di seguirti come PT`
}

/** Il PT ha mandato una scheda o una dieta (solo push: nel cuoricino c'è la card). */
export function fraseNotificaProposta(r) {
  return `${r.chi} ti ha mandato ${r.genere === 'proposta-dieta' ? 'la dieta' : 'la scheda'} «${r.nome}»`
}
