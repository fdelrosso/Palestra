// ---------------------------------------------------------------------------
// Le notifiche push nell'app Android: mi piace e commenti ad app chiusa. Qui si
// dice al server dove trovare il telefono (supabase/functions/invia-push fa il resto).
//
// ⚠️ Il plugin arriva con l'APK: uno più vecchio non lo ha. Fuori dall'app non c'è:
// il plugin ha una versione per il browser, per questo c'è anche isNativePlatform.
// ---------------------------------------------------------------------------

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { navigate } from './router'
import { supabase } from './supabase'

export const pushDisponibile = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')

let tokenAttuale = null
let installata = false

/** Solo i percorsi dell'app: da una notifica non si esce per nessun motivo. */
export const percorsoValido = (p) => typeof p === 'string' && /^\/(?!\/)/.test(p)

function installa() {
  if (installata) return
  installata = true
  PushNotifications.addListener('registration', ({ value }) => {
    tokenAttuale = value
    supabase.rpc('registra_push_token', { p_token: value }).then(() => {}, () => {})
  })
  PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const p = notification?.data?.percorso
    if (percorsoValido(p)) navigate(p)
  })
  PushNotifications.createChannel({ id: 'social', name: 'Mi piace e commenti', importance: 3 }).catch(() => {})
}

/** All'avvio, a persona entrata: registra il telefono se il permesso c'è già. Non chiede niente. */
export async function avviaPush() {
  if (!pushDisponibile()) return
  installa()
  try {
    if ((await PushNotifications.checkPermissions()).receive === 'granted') await PushNotifications.register()
  } catch {
    /* senza push l'app va lo stesso: il cuoricino c'è */
  }
}

/** Chiede il permesso: dal cuoricino o dal Profilo. @returns {Promise<boolean>} */
export async function chiediPush() {
  if (!pushDisponibile()) return false
  installa()
  try {
    const ok = (await PushNotifications.requestPermissions()).receive === 'granted'
    if (ok) await PushNotifications.register()
    return ok
  } catch {
    return false
  }
}

/** ⚠️ PRIMA di uscire dall'account: dopo non si può più togliere il token. */
export async function togliPush() {
  if (!tokenAttuale) return
  const t = tokenAttuale
  tokenAttuale = null
  await supabase.rpc('togli_push_token', { p_token: t }).then(() => {}, () => {})
}
