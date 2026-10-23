// ---------------------------------------------------------------------------
// LO STORICO DELLA DIETA: com'è andata, settimana per settimana e mese per
// mese (pages/DietaStoricoPage).
//
// Per ogni giorno: quanto si è mangiato (il diario), quanto si doveva (la
// dieta di QUEL giorno, allenamento o riposo secondo le schede) e quindi com'è
// andata. Un giorno senza niente segnato è "vuoto", non "sotto": non aver
// scritto non vuol dire aver digiunato, e nelle medie non entra.
//
// "Dentro" è entro il 10% dalle calorie dell'obiettivo: nessuno mangia 2185
// kcal precise, e un margine stretto renderebbe rosso ogni giorno.
// ---------------------------------------------------------------------------

import { conKcal, dietaDiOggi, oggiISO, pianoDelGiorno } from './dieta'
import { giornoDi, totaliGiorno } from './diario'

export const MARGINE = 0.1

/** 'YYYY-MM-DD' → Date a mezzanotte, ora locale. */
const dataDa = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** I 7 giorni (lunedì → domenica) della settimana che contiene `iso`. */
export function giorniSettimana(iso) {
  const d = dataDa(iso)
  const lun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => oggiISO(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + i)))
}

/** Tutti i giorni del mese che contiene `iso`. */
export function giorniMese(iso) {
  const d = dataDa(iso)
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => oggiISO(new Date(d.getFullYear(), d.getMonth(), i + 1)))
}

/** Lo stesso giorno spostato di `settimane` settimane o `mesi` mesi. */
export function sposta(iso, { settimane = 0, mesi = 0 }) {
  const d = dataDa(iso)
  if (mesi) return oggiISO(new Date(d.getFullYear(), d.getMonth() + mesi, 1))
  return oggiISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + settimane * 7))
}

/**
 * Com'è andato un giorno.
 * @param {{diario, diete, proposta, allenamentoIl: (Date) => boolean}} contesto
 *   `proposta`: la dieta calcolata dai dati, per chi non ne ha una salvata;
 *   `allenamentoIl`: se quel giorno era di allenamento (lib/consiglio).
 */
export function riepilogoGiorno(data, { diario, diete, proposta = null, allenamentoIl }) {
  const giorno = giornoDi(diario, data)
  const segnato = (giorno.voci || []).length > 0
  const mangiato = totaliGiorno(giorno)
  const dieta = dietaDiOggi(diete, data) || dietaDiOggi(diete) || proposta
  const piano = dieta ? pianoDelGiorno(dieta, allenamentoIl(dataDa(data))) : null
  const obiettivo = piano ? { kcal: conKcal(piano), proteine: piano.proteine, carbo: piano.carbo, grassi: piano.grassi } : null
  let stato = 'vuoto'
  if (segnato) {
    if (!obiettivo?.kcal) stato = 'segnato'
    else {
      const r = mangiato.kcal / obiettivo.kcal
      stato = r < 1 - MARGINE ? 'sotto' : r > 1 + MARGINE ? 'sopra' : 'dentro'
    }
  }
  return { data, segnato, mangiato, obiettivo, stato, futuro: data > oggiISO() }
}

/** Le medie di un periodo, solo sui giorni segnati. */
export function riepilogoPeriodo(giorni) {
  const segnati = giorni.filter((g) => g.segnato)
  const media = (f) => (segnati.length ? Math.round(segnati.reduce((t, g) => t + f(g), 0) / segnati.length) : 0)
  const conObiettivo = segnati.filter((g) => g.obiettivo?.kcal)
  return {
    segnati: segnati.length,
    dentro: segnati.filter((g) => g.stato === 'dentro').length,
    kcal: media((g) => g.mangiato.kcal),
    proteine: media((g) => g.mangiato.proteine),
    carbo: media((g) => g.mangiato.carbo),
    grassi: media((g) => g.mangiato.grassi),
    obiettivoKcal: conObiettivo.length
      ? Math.round(conObiettivo.reduce((t, g) => t + g.obiettivo.kcal, 0) / conObiettivo.length)
      : 0,
  }
}
