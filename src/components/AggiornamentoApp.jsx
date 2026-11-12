import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useRoute } from '../lib/router'
import { VERSIONE_APK, urlApk, versioneInstallata } from '../lib/apk'
import { fileNuovi } from '../lib/aggiornamento'
import { IconCheck } from './icons'
import logo from '../assets/logo.png'

// ---------------------------------------------------------------------------
// Gli aggiornamenti dell'app: quello web in silenzio, l'APK con una barra.
//
// ⚠️ IL CODICE WEB SI AGGIORNA DA SOLO, E SOLO ALL'AVVIO (166ª tornata).
// Prima qui c'era una barra "C'è una versione nuova · Aggiorna" a ogni
// pubblicazione: troppo spesso, e invadente. Ora a metà uso non si ricarica
// MAI — né sotto il bilanciere, né con una scheda a metà nell'editor. Tornando
// sull'app la versione nuova si scarica in silenzio e resta in attesa.
//
// ALL'AVVIO, sopra tutto, la stessa schermata di <Avvio /> (App.jsx), finché
// non si sa se c'è una versione nuova:
// - già scaricata (in attesa): si applica lì sotto, senza dire niente;
// - pubblicata da poco (lib/aggiornamento): "C'è una versione nuova" con la
//   barra, si scaricano i file nuovi e si ricarica appena il service worker
//   nuovo è pronto;
// - niente, o il controllo non risponde entro CONTROLLO ms: si entra.
// ⚠️ I file nuovi li scarica la PAGINA, non si aspetta il service worker: il
// browser appena aperta l'app il controllo lo fa partire dopo ~3 secondi, poi
// riscarica tutto da sé. Scaricati prima finiscono nella cache del browser
// (/assets è `immutable`, vercel.json) e lui li ritrova lì in un attimo. La
// barra conta quei file: per numero, non per byte (il pacchetto principale
// pesa più degli altri, lì fa un salto); l'ultimo pezzo è il service worker.
// ⚠️ Tutto entro MASSIMO ms dall'apertura: poi si entra comunque, e la
// versione nuova si finisce in silenzio per l'avvio dopo.
// Alla prima installazione (nessun service worker ancora) la schermata non c'è.
//
// Nell'APP ANDROID c'è un secondo caso: il codice web arriva da solo, ma il
// NATIVO (plugin, permessi, icona) solo reinstallando. Se l'app installata è
// più vecchia dell'ultima pubblicata (lib/apk), la barra propone di scaricare
// quella nuova. Per questa si chiede ancora: va scaricata e installata a mano.
// ---------------------------------------------------------------------------

const CONTROLLO = 1500
const MASSIMO = 8000

// Per vedere la schermata ferma, solo con `npm run dev`: `?aggiornamento=0.4`
// la barra al 40%, `=1` "Fatto, la apro…", `?aggiornamento` "Un attimo…".
const PROVA = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('aggiornamento') : null

export default function AggiornamentoApp() {
  const route = useRoute()
  // All'avvio, con un service worker già al lavoro: { nuova, p } finché si
  // decide. `nuova` = se ne scarica una, p 0..1.
  const [avvio, setAvvio] = useState(() =>
    PROVA != null
      ? { nuova: PROVA !== '', p: Number(PROVA) || 0 }
      : typeof navigator !== 'undefined' && navigator.serviceWorker?.controller ? { nuova: false, p: 0 } : null,
  )
  // Si ricarica appena il service worker nuovo è pronto (l'effetto più sotto).
  const [allAvvio, setAllAvvio] = useState(false)

  useEffect(() => {
    if (!avvio || PROVA != null) return undefined
    let finito = false
    const chiudi = () => {
      finito = true
      setAllAvvio(false)
      setAvvio(null)
    }
    const fine = setTimeout(chiudi, Math.max(0, MASSIMO - performance.now()))
    ;(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg?.active) return chiudi()
      // Già scaricata in una sessione di prima: si applica sotto "Un attimo…".
      if (reg.waiting) return setAllAvvio(true)
      const ferma = new AbortController()
      const tetto = setTimeout(() => ferma.abort(), CONTROLLO)
      const testo = await (await fetch(reg.active.scriptURL, { cache: 'no-store', signal: ferma.signal })).text()
      clearTimeout(tetto)
      const cache = await caches.open(`workbox-precache-v2-${reg.scope}`)
      const inCache = new Set((await cache.keys()).map((q) => q.url))
      const nuovi = fileNuovi(testo, reg.active.scriptURL, inCache)
      if (finito) return
      if (!nuovi.length) return chiudi()
      setAllAvvio(true)
      setAvvio({ nuova: true, p: 0 })
      reg.update().catch(() => {})
      // Quelli con la revisione (index.html & c.) il service worker li riprende
      // comunque dalla rete: si scaricano solo quelli con l'hash nel nome.
      const daScaricare = nuovi.filter((f) => !f.revisionato).map((f) => f.url)
      let fatti = 0
      await Promise.all(
        daScaricare.map((url) =>
          fetch(url)
            .then((r) => r.blob())
            .catch(() => {})
            .finally(() => {
              fatti++
              if (!finito) setAvvio({ nuova: true, p: (0.9 * fatti) / daScaricare.length })
            }),
        ),
      )
    })().catch(chiudi)
    return () => clearTimeout(fine)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    needRefresh: [daAggiornare],
    updateServiceWorker,
  } = useRegisterSW({
    // Subito, non al `load` della pagina: all'avvio la si sta aspettando.
    immediate: true,
    // Tornando sull'app si ricontrolla, e la nuova si scarica per la prossima
    // apertura. Niente timer di sfondo.
    onRegisteredSW(_url, registrazione) {
      if (!registrazione) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registrazione.update().catch(() => {})
      })
    },
  })
  useEffect(() => {
    if (daAggiornare && allAvvio) updateServiceWorker(true)
  }, [daAggiornare, allAvvio, updateServiceWorker])

  // Durante l'allenamento la barra dell'APK non si mostra: chi è sotto un
  // bilanciere non deve avere un tasto a portata di pollice.
  const durante = route.name === 'allenamento'

  const [apkVecchio, setApkVecchio] = useState(false)
  useEffect(() => {
    versioneInstallata().then((v) => setApkVecchio(v != null && v < VERSIONE_APK))
  }, [])

  if (avvio) {
    // Il service worker nuovo è pronto: si sta ricaricando.
    const p = daAggiornare && allAvvio ? 1 : avvio.p
    // Una versione nuova: lo sfondo e il logo del Benvenuto (la pagina di
    // accesso), sempre scuri.
    if (avvio.nuova) {
      return (
        <div className="agg-schermo benv" role="status" aria-live="polite">
          <div className="benv-hero">
            <div className="benv-luce" aria-hidden="true" />
            <div className="benv-logo">
              <img src={logo} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            </div>
            <p className="agg-titolo">C’è una versione nuova</p>
            <p className="agg-sotto">{p === 1 ? (
                <span className="agg-fatto">
                  <IconCheck width={18} height={18} /> Fatto!
                </span>
              ) : (
                'La sto scaricando, un attimo.'
              )}</p>
            <div className="progress agg-progresso">
              <div className="progress-fill" style={{ width: `${Math.round(p * 100)}%` }} />
            </div>
            <p className="agg-percento">{Math.round(p * 100)}%</p>
          </div>
        </div>
      )
    }
    // Identica a <Avvio /> (App.jsx): chi non aggiorna niente non deve
    // accorgersi che c'è.
    return (
      <div className="agg-schermo" role="status" aria-live="polite">
        <div className="app">
          <div className="gate">
            <div className="gate-head">
              <div className="gate-mark" aria-hidden="true">
                <img src={logo} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              </div>
              <p className="muted">Un attimo…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (durante || !apkVecchio) return null
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
