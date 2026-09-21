import { useEffect, useRef, useState } from 'react'
import { IconClose } from './icons'

// ---------------------------------------------------------------------------
// Inquadra il codice a barre di un prodotto e lo legge, DENTRO l'app.
//
// Due modi di leggerlo, scelti da soli:
//   - `BarcodeDetector` del browser, dove c'è (Android/Chrome): non costa
//     niente, lo fa il telefono;
//   - il polyfill `barcode-detector` (ZXing compilato in WebAssembly) dove non
//     c'è — cioè su iPhone, che è il telefono su cui questa app vive. Safari ce
//     l'ha solo dietro un'impostazione nascosta, quindi in pratica non c'è.
//
// ⚠️ Il polyfill si carica SOLO quando si apre lo scanner (`import()` dentro la
// funzione). Sono qualche centinaio di KB più un file WebAssembly: metterli nel
// pacchetto principale vorrebbe dire farli scaricare a chi la fotocamera non la
// apre mai, cioè quasi tutti.
//
// ⚠️ Il .wasm arriva dal NOSTRO dominio, non da un CDN: `?url` lo fa copiare a
// Vite fra gli asset del sito. Un file eseguibile preso da un server di terzi a
// ogni scansione è una dipendenza che non si vede e non si controlla.
//
// ⚠️ LA FOTOCAMERA VA SPENTA. Se si esce senza fermare le tracce, la spia resta
// accesa e il telefono continua a lavorare: è il classico difetto che nessuno
// nota in sviluppo e che tutti notano sul proprio telefono. Qui la pulizia sta
// nel `return` dell'effetto, che React chiama comunque vada.
//
// ⚠️ Serve HTTPS (o localhost): senza, `getUserMedia` non esiste proprio e il
// messaggio del browser non spiega niente. Lo diciamo noi.
// ---------------------------------------------------------------------------

// I formati dei codici a barre dei prodotti alimentari. Limitarli rende la
// lettura più veloce e riduce i falsi positivi: qui non si leggono QR.
const FORMATI = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']

async function creaLettore() {
  // Il nativo, se c'è davvero: su Safari l'oggetto può esistere ma fallire, e
  // per questo si prova a costruirlo qui invece di fidarsi della sua presenza.
  if ('BarcodeDetector' in globalThis) {
    try {
      const supportati = await globalThis.BarcodeDetector.getSupportedFormats()
      const buoni = FORMATI.filter((f) => supportati.includes(f))
      if (buoni.length > 0) return new globalThis.BarcodeDetector({ formats: buoni })
    } catch {
      /* si passa al polyfill */
    }
  }
  const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasm }] = await Promise.all([
    import('barcode-detector/pure'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  setZXingModuleOverrides({ locateFile: (file, prefisso) => (file.endsWith('.wasm') ? wasm : prefisso + file) })
  return new BarcodeDetector({ formats: FORMATI })
}

function messaggioErrore(e) {
  const nome = e?.name || ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return 'Non mi hai dato il permesso di usare la fotocamera. Puoi cambiarlo nelle impostazioni del browser, oppure scrivere il nome del prodotto.'
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
    return 'Non trovo una fotocamera su questo dispositivo.'
  }
  if (nome === 'NotReadableError') {
    return 'La fotocamera è occupata da un’altra app. Chiudila e riprova.'
  }
  return 'Non riesco ad aprire la fotocamera. Prova a scrivere il nome del prodotto.'
}

export default function ScannerCodice({ onCodice, onChiudi }) {
  const videoRef = useRef(null)
  const [errore, setErrore] = useState('')
  const [pronto, setPronto] = useState(false)
  // ⚠️ Un ref e non uno stato: serve a non chiamare `onCodice` due volte
  // quando due fotogrammi di fila vedono lo stesso codice, e deve valere
  // SUBITO — uno stato arriverebbe al giro dopo, cioè troppo tardi.
  const fatto = useRef(false)

  useEffect(() => {
    let flusso = null
    let timer = null
    let vivo = true

    const spegni = () => {
      vivo = false
      clearTimeout(timer)
      for (const t of flusso?.getTracks() || []) t.stop()
    }

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrore(
          'Questo browser non mi lascia usare la fotocamera da qui (serve una connessione sicura). Scrivi il nome del prodotto.',
        )
        return
      }
      let lettore
      try {
        lettore = await creaLettore()
      } catch {
        setErrore('Non sono riuscito a caricare il lettore di codici. Scrivi il nome del prodotto.')
        return
      }
      try {
        // `environment` = la fotocamera posteriore, quella con cui si inquadra
        // una confezione. Senza, sui telefoni parte quella dei selfie.
        flusso = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
      } catch (e) {
        setErrore(messaggioErrore(e))
        return
      }
      if (!vivo) return spegni()

      const video = videoRef.current
      if (!video) return spegni()
      video.srcObject = flusso
      try {
        await video.play()
      } catch {
        /* su iOS play() puo' rifiutare: il video parte lo stesso con playsInline */
      }
      if (!vivo) return spegni()
      setPronto(true)

      const guarda = async () => {
        if (!vivo || fatto.current) return
        try {
          const codici = await lettore.detect(video)
          const buono = codici.find((c) => c.rawValue && /^\d{6,14}$/.test(c.rawValue))
          if (buono && !fatto.current) {
            fatto.current = true
            spegni()
            onCodice(buono.rawValue)
            return
          }
        } catch {
          /* un fotogramma illeggibile non e' un errore: si riprova */
        }
        // ~6 letture al secondo: di piu' scalda il telefono senza leggere
        // meglio, di meno si sente il ritardo mentre si inquadra.
        timer = setTimeout(guarda, 160)
      }
      guarda()
    })()

    return spegni
  }, [onCodice])

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal scanner" role="dialog" aria-label="Inquadra il codice a barre" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Inquadra il codice a barre</h3>
          <button className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>

        {errore ? (
          <p className="form-error" style={{ marginTop: 12 }}>{errore}</p>
        ) : (
          <>
            <div className="scanner-vista">
              {/* ⚠️ `playsInline` e `muted` non sono decorazioni: senza, iOS
                  apre il video a tutto schermo e lo scanner sparisce. */}
              <video ref={videoRef} playsInline muted autoPlay className="scanner-video" />
              <div className="scanner-mirino" aria-hidden="true" />
            </div>
            <p className="vis-hint" style={{ marginTop: 10 }}>
              {pronto
                ? 'Tieni il codice dentro il riquadro, a una decina di centimetri.'
                : 'Sto accendendo la fotocamera…'}
            </p>
          </>
        )}

        <button className="btn btn-block" style={{ marginTop: 12 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
