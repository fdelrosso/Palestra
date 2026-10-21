import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useRoute } from '../lib/router'
import { VERSIONE_APK, urlApk, versioneInstallata } from '../lib/apk'

// ---------------------------------------------------------------------------
// "C'è una versione nuova": la barra in fondo con il tasto Aggiorna.
//
// ⚠️ PERCHÉ SERVE. L'app è installata sui telefoni di più persone, e da lì in
// poi vive di vita propria: una correzione pubblicata non raggiunge nessuno
// finché quella persona non chiude l'app DAVVERO (non in secondo piano: chiusa)
// e la riapre. Prima di questa barra non c'era modo di saperlo — si restava su
// una versione vecchia senza nemmeno il sospetto.
//
// ⚠️ PERCHÉ SI CHIEDE INVECE DI AGGIORNARE E BASTA. Aggiornare vuol dire
// ricaricare la pagina. Farlo da soli, nel momento sbagliato, vuol dire
// ricaricare in faccia a chi ha il bilanciere in mano. Quindi si chiede — e
// durante un allenamento non si chiede nemmeno (vedi sotto).
//
// ⚠️ "Più tardi" non è "mai": la barra sparisce e ritorna alla prossima
// apertura dell'app. Nessuno resta indietro per sempre, e nessuno viene
// tampinato mentre sta facendo altro.
//
// Nell'APP ANDROID c'è un secondo caso: il codice web arriva da solo, ma il
// NATIVO (plugin, permessi, icona) solo reinstallando. Se l'app installata è
// più vecchia dell'ultima pubblicata (lib/apk), la barra propone di scaricare
// quella nuova. Viene dopo l'aggiornamento web, mai insieme.
// ---------------------------------------------------------------------------

export default function AggiornamentoApp() {
  const route = useRoute()
  const {
    needRefresh: [daAggiornare, setDaAggiornare],
    updateServiceWorker,
  } = useRegisterSW({
    // Tornando sull'app si ricontrolla: è il momento in cui una versione nuova
    // ha più senso di trovarla, ed è anche l'unico gesto ricorrente che facciamo
    // su un telefono. Niente timer di sfondo.
    onRegisteredSW(_url, registrazione) {
      if (!registrazione) return
      const ricontrolla = () => {
        if (document.visibilityState === 'visible') registrazione.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', ricontrolla)
    },
  })

  // ⚠️ Durante l'allenamento la barra non si mostra. La sessione sopravvive a un
  // ricaricamento (è salvata, e il timer va sull'orario reale), ma chi è sotto
  // un bilanciere non deve avere un tasto "Aggiorna" a portata di pollice.
  // Non si perde niente: `daAggiornare` resta acceso, e appena l'allenamento
  // finisce la barra è lì.
  const durante = route.name === 'allenamento'

  const [apkVecchio, setApkVecchio] = useState(false)
  useEffect(() => {
    versioneInstallata().then((v) => setApkVecchio(v != null && v < VERSIONE_APK))
  }, [])

  if (durante) return null
  if (!daAggiornare) {
    if (!apkVecchio) return null
    return (
      <div className="agg-barra" role="status">
        <div className="agg-testo">
          <strong>C’è una nuova versione dell’app</strong>
          <span className="muted">Scaricala e installala sopra: i tuoi dati restano.</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm nowrap" onClick={() => setApkVecchio(false)}>
            Più tardi
          </button>
          {/* Un altro dominio: l'app lo apre nel browser, che lo scarica (lib/apk). */}
          <a className="btn btn-accent btn-sm nowrap" href={urlApk()}>
            Scarica
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="agg-barra" role="status">
      <div className="agg-testo">
        <strong>C’è una versione nuova</strong>
        <span className="muted">Aggiorna per averla: ci vuole un istante.</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-ghost btn-sm nowrap" onClick={() => setDaAggiornare(false)}>
          Più tardi
        </button>
        <button className="btn btn-accent btn-sm nowrap" onClick={() => updateServiceWorker(true)}>
          Aggiorna
        </button>
      </div>
    </div>
  )
}
