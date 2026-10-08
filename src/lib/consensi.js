// ---------------------------------------------------------------------------
// I consensi: i Termini di servizio (con la presa visione dell'Informativa
// privacy) e, a parte, i dati sulla salute. A parte perche' lo vuole il GDPR
// (art. 9): peso, altezza, diario alimentare e foto dei progressi sono dati
// sulla salute, e per quelli serve un consenso esplicito, distinto dal resto.
//
// Si chiedono alla registrazione (UserGate) e, a chi l'account ce l'aveva gia'
// prima, al primo accesso (pages/Consensi). Senza tutti e due non si entra:
// i dati sulla salute sono il cuore dell'app (deciso il 2026-10-05).
//
// Stanno nei metadati dell'account Supabase (`user_metadata.consensi`), non in
// una tabella: lo schema non si tocca, e la registrazione li scrive insieme a
// tutto il resto. Ci sono la versione dei testi accettati e il momento.
//
// ⚠️ VERSIONE_TESTI e' la data di "Ultimo aggiornamento" di public/privacy.html
// e public/termini.html (lo controlla tests/consensi.test.js). Si cambia solo
// quando i testi cambiano nella sostanza: a quel punto l'app chiede di nuovo
// il consenso a tutti. Per una virgola si lascia stare.
// ---------------------------------------------------------------------------

export const VERSIONE_TESTI = '2026-10-07'

/** I consensi da salvare adesso nei metadati dell'account. */
export function nuoviConsensi(ora = new Date()) {
  const quando = ora.toISOString()
  return { versione: VERSIONE_TESTI, termini: quando, salute: quando }
}

/** True se nei metadati c'e' il consenso a tutti e due, sui testi di adesso. */
export function consensiValidi(metadati) {
  const c = metadati?.consensi
  return !!c && c.versione === VERSIONE_TESTI && !!c.termini && !!c.salute
}
