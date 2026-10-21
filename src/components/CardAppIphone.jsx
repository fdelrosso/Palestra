import { useState } from 'react'
import { iphoneSenzaHome } from '../lib/iphone'
import { IconClose, IconCondividiIos } from './icons'

// ---------------------------------------------------------------------------
// Sulla Home e sul Benvenuto, a chi usa il sito da iPhone nel browser: come
// mettere l'app sulla schermata Home. È la gemella di CardAppAndroid (stessa
// forma, stessi posti), ma non c'è niente da scaricare: si spiegano i passi.
// "Non mi interessa" la toglie per sempre da quel telefono; chi apre già
// dall'icona sulla Home non la vede (lib/iphone).
// ---------------------------------------------------------------------------

const CHIAVE = 'palestra:card-app-iphone:v1'

function giaVista() {
  try {
    return localStorage.getItem(CHIAVE) === '1'
  } catch {
    return true
  }
}

export default function CardAppIphone() {
  const [via, setVia] = useState(() => !iphoneSenzaHome() || giaVista())
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
          <strong>Metti l’app sulla schermata Home</strong>
          <p className="muted card-app-testo">
            Su iPhone l’app si aggiunge dal browser: poi la apri dall’icona, a tutto schermo come le altre. Stesso
            account, stessi dati.
          </p>
        </div>
        <button className="icon-btn" onClick={chiudi} aria-label="Non mi interessa">
          <IconClose width={18} height={18} />
        </button>
      </div>
      {come && (
        <ol className="muted card-app-passi">
          <li>Apri progettopalestra.it in Safari.</li>
          <li>
            Tocca Condividi <IconCondividiIos width={14} height={14} className="card-app-icona" /> (in basso, o nel
            menu “···”).
          </li>
          <li>Scorri e scegli “Aggiungi alla schermata Home”, poi “Aggiungi”.</li>
        </ol>
      )}
      {!come && (
        <div className="row" style={{ gap: 8, width: '100%' }}>
          <button className="btn btn-accent btn-sm grow" onClick={() => setCome(true)}>
            Come si fa
          </button>
        </div>
      )}
    </div>
  )
}
