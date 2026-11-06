// ---------------------------------------------------------------------------
// Il ponte col plugin `Allenamento` (android/…/AllenamentoPlugin.java): la
// notifica con esercizio, recupero e i tre tasti dello sforzo, che funziona
// anche a schermo bloccato. La logica sta in lib/comandiAllenamento.
//
// ⚠️ Il plugin arriva con l'APK: un APK più vecchio non lo ha, e allora resta
// tutto come nel browser. Per questo ogni chiamata passa da `comandiDisponibili`.
// ---------------------------------------------------------------------------

import { Capacitor, registerPlugin } from '@capacitor/core'

const Allenamento = registerPlugin('Allenamento')

export const comandiDisponibili = () => Capacitor.isPluginAvailable('Allenamento')

export function aggiornaComandi(stato) {
  if (comandiDisponibili()) Allenamento.aggiorna(stato).catch(() => {})
}

export function fermaComandi() {
  if (comandiDisponibili()) Allenamento.ferma().catch(() => {})
}

/** I tocchi fatti dalla notifica e non ancora applicati. Letti, il nativo li scorda. */
export async function leggiTocchi() {
  if (!comandiDisponibili()) return []
  try {
    return (await Allenamento.leggiTocchi()).tocchi || []
  } catch {
    return []
  }
}

/** `chiama` a ogni tocco arrivato; torna la funzione che smette di ascoltare. */
export function ascoltaTocchi(chiama) {
  const h = Allenamento.addListener('tocco', chiama)
  return () => h.then((x) => x.remove())
}

/**
 * La notifica è stata aperta. Il nativo tiene l'evento finché c'è chi ascolta:
 * vale anche ad app chiusa. ⚠️ Solo a pagina montata (App): arriva subito, e
 * prima dell'effetto di useRoute il cambio di indirizzo andrebbe perso.
 */
export function allAperturaDaNotifica(chiama) {
  if (!comandiDisponibili()) return () => {}
  const h = Allenamento.addListener('apri', chiama)
  return () => h.then((x) => x.remove())
}
