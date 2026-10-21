import { useState } from 'react'
import { androidSenzaApp, urlApk } from '../lib/apk'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// Sulla Home, a chi usa il sito o la PWA da un telefono Android: c'è l'app.
// Fa quello che una pagina web non può (lib/nativo, components/ComandiMusica).
// "Non mi interessa" la toglie per sempre da quel telefono (nel browser e non
// sul profilo: dipende dal telefono, e perderla costa al massimo rivederla).
// L'APK non viene dal Play Store: Android avvisa, e la card dice cosa fare.
// ---------------------------------------------------------------------------

const CHIAVE = 'palestra:card-app-android:v1'

function giaVista() {
  try {
    return localStorage.getItem(CHIAVE) === '1'
  } catch {
    return true
  }
}

export default function CardAppAndroid() {
  const [via, setVia] = useState(() => !androidSenzaApp() || giaVista())
  const [come, setCome] = useState(false)
  if (via) return null

  const chiudi = () => {
    setVia(true)
    try {
      localStorage.setItem(CHIAVE, '1')
    } catch {
      /* resta chiusa finché la pagina è aperta */
    }
  }

  return (
    <div className="riquadro card-app-android">
      <div className="row" style={{ width: '100%', alignItems: 'flex-start', gap: 8 }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <strong>Scarica l’app per Android</strong>
          <p className="muted card-app-testo">
            Durante l’allenamento comandi la musica senza uscire, condividi e salvi i file al volo. Stesso account,
            stessi dati.
          </p>
        </div>
        <button className="icon-btn" onClick={chiudi} aria-label="Non mi interessa">
          <IconClose width={18} height={18} />
        </button>
      </div>
      {come && (
        <ol className="muted card-app-passi">
          <li>Chrome può dire che il file “potrebbe essere dannoso”: scaricalo lo stesso.</li>
          <li>Aprilo, e consenti l’installazione da Chrome quando te lo chiede.</li>
          <li>Se Play Protect non conosce lo sviluppatore: “Altri dettagli” → “Installa comunque”.</li>
        </ol>
      )}
      <div className="row" style={{ gap: 8, width: '100%' }}>
        <a className="btn btn-accent btn-sm grow" href={urlApk()} onClick={() => setCome(true)}>
          Scarica l’app
        </a>
        {!come && (
          <button className="btn btn-sm" onClick={() => setCome(true)}>
            Come si installa
          </button>
        )}
      </div>
    </div>
  )
}
