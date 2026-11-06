// ---------------------------------------------------------------------------
// Il promemoria dei giorni di allenamento (app Android).
//
// Sta tutto sul telefono: il programma lo calcola già lib/pianoScheda, e rifarlo
// sul server vorrebbe dire tenere due calcoli uguali. A ogni apertura si
// riprogrammano i prossimi GIORNI: chi smette di aprire l'app smette anche di
// ricevere promemoria. Un programma cambiato dal PT si vede alla prossima apertura.
//
// L'ora sta nel telefono, come il bip: spento finché non la si sceglie.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { chiaveDiOggi, raccogliCompletamenti } from './oggi'
import { nomeGiornata, pianoScheda, schedaInCorso } from './pianoScheda'

const CHIAVE = 'palestra:promemoria:v1'
const CANALE = 'promemoria'
const PRIMO_ID = 7000
const GIORNI = 14
const IDS = Array.from({ length: GIORNI }, (_, n) => ({ id: PRIMO_ID + n }))

// ⚠️ Non basta isPluginAvailable: il plugin ha anche una versione per il browser,
// che lì lo dà per disponibile e chiederebbe il permesso delle notifiche a ogni
// allenamento. Un APK più vecchio, senza il plugin, qui risponde no.
export const promemoriaDisponibile = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications')

export function oraPromemoria() {
  try {
    return localStorage.getItem(CHIAVE)
  } catch {
    return null
  }
}

export function salvaOraPromemoria(ora) {
  try {
    if (ora) localStorage.setItem(CHIAVE, ora)
    else localStorage.removeItem(CHIAVE)
  } catch {
    /* senza storage non si ricorda: pazienza */
  }
}

/** Il permesso di Android per le notifiche (dal 13 va chiesto). @returns {Promise<boolean>} */
export async function chiediPermessoNotifiche() {
  if (!promemoriaDisponibile()) return false
  try {
    return (await LocalNotifications.requestPermissions()).display === 'granted'
  } catch {
    return false
  }
}

/**
 * I promemoria da programmare: un giorno di allenamento, all'ora scelta. Oggi
 * no se è già fatto o se ci si sta allenando.
 */
export function promemoriaDa({ schede, sessione = null, ora, adesso = new Date() }) {
  const inCorso = schedaInCorso(schede)
  const piano = inCorso && pianoScheda(inCorso.scheda, adesso)
  if (!piano || !ora) return []
  const [h, m] = ora.split(':').map(Number)
  const oggiFatto = !!sessione || raccogliCompletamenti(schede).has(chiaveDiOggi(adesso))
  const out = []
  for (let n = oggiFatto ? 1 : 0; n < GIORNI; n++) {
    const at = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + n, h, m)
    const giorno = piano.previsto(at)
    if (at <= adesso || giorno?.tipo !== 'workout' || giorno.saltato) continue
    out.push({
      id: PRIMO_ID + n,
      title: `Oggi: ${nomeGiornata(giorno)}`,
      body: 'È giorno di allenamento: ci vediamo in palestra.',
      channelId: CANALE,
      schedule: { at, allowWhileIdle: true },
    })
  }
  return out
}

let ultimi = null

/** Rimette i promemoria in linea col programma. Senza un'ora scelta li toglie. */
export async function sincronizzaPromemoria(schede, sessione) {
  if (!promemoriaDisponibile()) return
  const lista = promemoriaDa({ schede, sessione, ora: oraPromemoria() })
  const chiave = JSON.stringify(lista)
  if (chiave === ultimi) return
  ultimi = chiave
  try {
    await LocalNotifications.cancel({ notifications: IDS })
    if (!lista.length) return
    await LocalNotifications.createChannel({ id: CANALE, name: 'Promemoria allenamento', importance: 4 })
    await LocalNotifications.schedule({ notifications: lista })
  } catch {
    ultimi = null // si riprova alla prossima occasione
  }
}

/** All'uscita dall'account: i promemoria sono del programma di chi è uscito. */
export function togliPromemoria() {
  ultimi = null
  if (promemoriaDisponibile()) LocalNotifications.cancel({ notifications: IDS }).catch(() => {})
}
