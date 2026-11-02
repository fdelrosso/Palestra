// ---------------------------------------------------------------------------
// L'APP ANDROID da scaricare (l'APK firmato, 75ª/77ª tornata): l'ultima
// versione pubblicata e dove sta. Il file sta nel bucket PUBBLICO `app` di
// Supabase (supabase/schema.sql), caricato a mano dalla dashboard.
//
// ⚠️ Sta su un ALTRO dominio apposta: dentro l'app un link al nostro dominio
// resterebbe nel WebView, che non sa scaricare; uno a un altro dominio
// Capacitor lo apre nel browser del telefono, che lo scarica.
//
// ⚠️ QUANDO CAMBIA IL NATIVO (plugin, permessi, icona): si alza `versionCode`
// in android/app/build.gradle, si genera l'APK firmato, lo si carica come
// `ProgettoPalestra-<versione>.apk` e si alza VERSIONE_APK qui. Le due devono
// coincidere (tests/apk.test.js): chi ha l'app vecchia vede "C'è una nuova
// versione dell'app" (components/AggiornamentoApp).
// ---------------------------------------------------------------------------

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

export const VERSIONE_APK = 4

/** Dove si scarica l'ultima versione: un indirizzo che si calcola, nessuna richiesta. */
export function urlApk() {
  return supabase.storage.from('app').getPublicUrl(`ProgettoPalestra-${VERSIONE_APK}.apk`).data.publicUrl
}

/** Un telefono Android fuori dall'app: a lui si propone di scaricarla. */
export function androidSenzaApp() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) && !Capacitor.isNativePlatform()
}

/** La versione dell'app installata (versionCode), o null fuori dall'app. */
export async function versioneInstallata() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const n = Number((await App.getInfo()).build)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
