// ---------------------------------------------------------------------------
// Preferenze alimentari del profilo: allergie, intolleranze, regime e i cibi
// che uno proprio non vuole vedere nel piatto.
//
// Stanno sul PROFILO e non sulla singola dieta di proposito: chi è intollerante
// al lattosio lo è anche nella dieta dell'anno prossimo. Così ogni dieta —
// calcolata dall'app, scritta dal nutrizionista o incollata da un PDF — passa
// dallo stesso filtro (lib/alimenti) senza doverle ridire ogni volta.
//
// Persistenza: `palestra:u:<id>:preferenze:v1`, come schede e diete (vedi
// lib/utenti). Sono dati di salute: restano nel dispositivo finché non c'è il
// cloud, e anche allora vanno trattati come tali.
// ---------------------------------------------------------------------------

import { ESCLUSIONI, REGIMI, labelRegime } from './alimenti'

/**
 * @typedef {Object} PreferenzeCibo
 * @property {string} regime        id di REGIMI (onnivoro/vegetariano/vegano)
 * @property {string[]} esclusioni  id di ESCLUSIONI spuntati
 * @property {string[]} evito       cibi scritti a mano che non si mangiano
 * @property {string[]} preferisco  cibi graditi (a parità di scelta vincono)
 * @property {string} note          tutto il resto, in parole
 * @property {string|null} aggiornateIl
 */

export function preferenzeVuote() {
  return {
    regime: 'onnivoro',
    esclusioni: [],
    evito: [],
    preferisco: [],
    note: '',
    aggiornateIl: null,
  }
}

// Le liste scritte a mano arrivano da un campo di testo: si accettano virgole,
// punti e virgola e a capo, si buttano i doppioni e gli spazi.
export function listaDaTesto(testo) {
  return [
    ...new Set(
      String(testo || '')
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
}

export function testoDaLista(lista) {
  return (lista || []).join(', ')
}

export function normalizzaPreferenze(pref) {
  const base = preferenzeVuote()
  if (!pref || typeof pref !== 'object') return base
  const idsEsclusioni = new Set(ESCLUSIONI.map((e) => e.id))
  return {
    regime: REGIMI.some((r) => r.id === pref.regime) ? pref.regime : base.regime,
    esclusioni: Array.isArray(pref.esclusioni) ? pref.esclusioni.filter((id) => idsEsclusioni.has(id)) : [],
    evito: Array.isArray(pref.evito) ? pref.evito.filter(Boolean) : [],
    preferisco: Array.isArray(pref.preferisco) ? pref.preferisco.filter(Boolean) : [],
    note: typeof pref.note === 'string' ? pref.note : '',
    aggiornateIl: pref.aggiornateIl || null,
  }
}

/** C'è qualcosa da applicare, o è tutto al valore di partenza? */
export function preferenzeAttive(pref) {
  const p = normalizzaPreferenze(pref)
  return (
    p.regime !== 'onnivoro' ||
    p.esclusioni.length > 0 ||
    p.evito.length > 0 ||
    p.preferisco.length > 0
  )
}

/** Una riga di riassunto per le schermate ("Vegetariano · niente lattosio, uova"). */
export function riassuntoPreferenze(pref) {
  const p = normalizzaPreferenze(pref)
  const parti = []
  if (p.regime !== 'onnivoro') parti.push(labelRegime(p.regime))
  const nomi = p.esclusioni
    .map((id) => ESCLUSIONI.find((e) => e.id === id)?.label)
    .filter(Boolean)
    .map((l) => l.toLowerCase())
  if (nomi.length) parti.push(`niente ${nomi.join(', ')}`)
  if (p.evito.length) parti.push(`evita ${p.evito.slice(0, 3).join(', ')}${p.evito.length > 3 ? '…' : ''}`)
  if (parti.length === 0) return 'Nessuna esclusione: la dieta resta com’è'
  return parti.join(' · ')
}
