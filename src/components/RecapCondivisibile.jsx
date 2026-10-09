import { useEffect, useMemo, useRef, useState } from 'react'
import { statisticheRecap } from '../lib/recap'
import { disegnaRecap, caricaImmagine, canvasInBlob } from '../lib/recapImmagine'
import { IconImage, IconClose, IconCheck, IconShare, IconEdit } from './icons'
import RecapLayoutEditor from './RecapLayoutEditor'
import { durataLunga } from '../lib/recap'
import DatiOrologio from './DatiOrologio'
import CondividiConAmici from './CondividiConAmici'
import { TIPO_CONDIVISIONE } from '../lib/condivisioni'

// Recap "da condividere" di fine allenamento.
//
// L'anteprima che si vede È l'immagine che si esporta: la card viene disegnata
// su canvas (lib/recapImmagine) e mostrata come <img>. Così non esistono due
// versioni della stessa grafica che possono divergere, e quello che l'utente
// vede è esattamente quello che finisce nel post.
//
// Come esce dall'app, in ordine di preferenza:
//   1. Condividi → navigator.share con il file (iOS/Android: apre il foglio
//      di condivisione, quindi Instagram, WhatsApp, Foto…);
//   2. Scarica → <a download> (desktop);
//   3. sempre valido: tieni premuto sull'anteprima e salva l'immagine.
//
// C'e poi una quarta strada che non esce dall'app: "Manda a un amico". La non
// viaggia l'immagine ma i NUMERI del recap, e la card la ridisegna il telefono
// di chi la riceve - un PNG 1080x1350 in localStorage non ci starebbe.
// ⚠️ Sulla card (dal 2026-09-18): il TITOLO si può cambiare (`nome`); il nome
// dell'utente e il "N° allenamento del mese" non ci sono; commento, calorie e
// battito sono facoltativi e, se vuoti, non compaiono. `utente` resta solo nel
// pacchetto mandato agli amici, non nell'immagine.
// ⚠️ Dal 2026-09-29 la card è a blocchi: "Modifica" sopra l'anteprima sceglie
// quali pezzi tenere e in che ordine (`layout`, lib/recapLayout). Il layout
// lo salva chi chiama sull'allenamento, e viaggia col recap mandato agli amici.
// ⚠️ La si apre anche dal calendario, dove nome, commento e orologio non si
// scrivono: senza `onNome` / `onCommento` / `onOrologio` quei campi non ci sono.
export default function RecapCondivisibile({
  riep,
  schede,
  diete,
  dati,
  utente,
  nome,
  onNome,
  commento,
  onCommento,
  orologio,
  onOrologio,
  layout,
  onLayout,
}) {
  const [modifica, setModifica] = useState(false)
  const [foto, setFoto] = useState(null)
  const [condividiInApp, setCondividiInApp] = useState(false)
  const [errore, setErrore] = useState('')
  const [fatto, setFatto] = useState('')
  const inputFile = useRef(null)

  // I numeri copiati dall'orologio si comportano come campi del riepilogo: li
  // sovrapponiamo a una copia, così `statisticheRecap` legge un oggetto solo e
  // la card si ridisegna a ogni cifra digitata.
  // Il titolo: quello scritto qui, o quello di partenza se il campo è vuoto.
  const riepCompleto = useMemo(
    () => ({ ...riep, ...orologio, nomeGiorno: nome?.trim() || riep?.nomeGiorno || 'Allenamento' }),
    [riep, orologio, nome],
  )

  // `dati` = i dati fisici del profilo: servono ancora alla stima delle
  // calorie, che però sulla card non va più (vedi lib/recap).
  const stat = useMemo(
    () => statisticheRecap(riepCompleto, { schede, diete, dati }),
    [riepCompleto, schede, diete, dati],
  )

  // La card si ridisegna a ogni modifica di commento/foto. È un valore
  // derivato dagli input, non uno stato: niente effetto, niente doppio render.
  const { canvas, url } = useMemo(() => {
    const c = disegnaRecap({ riep: riepCompleto, stat, commento, foto, layout })
    return { canvas: c, url: c.toDataURL('image/png') }
  }, [riepCompleto, stat, commento, foto, layout])

  // Un messaggio di conferma che sparisce da solo.
  useEffect(() => {
    if (!fatto) return
    const id = setTimeout(() => setFatto(''), 2600)
    return () => clearTimeout(id)
  }, [fatto])

  const scegliFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // così riselezionare lo stesso file rifà partire l'evento
    if (!file) return
    setErrore('')
    try {
      setFoto(await caricaImmagine(file))
    } catch {
      setErrore('Non riesco a leggere questa immagine. Prova con un’altra.')
    }
  }

  const nomeFile = () => {
    const d = new Date(riep?.data || Date.now())
    const p = (n) => String(n).padStart(2, '0')
    return `allenamento-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.png`
  }

  const condividi = async () => {
    setErrore('')
    const blob = await canvasInBlob(canvas)
    if (!blob) return
    const file = new File([blob], nomeFile(), { type: 'image/png' })
    // canShare({files}) è l'unico modo affidabile di sapere se il dispositivo
    // accetta la condivisione di file (iOS lo supporta, molti desktop no).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: riepCompleto.nomeGiorno })
        setFatto('Condiviso!')
      } catch (err) {
        // L'utente che annulla il foglio di condivisione non è un errore.
        if (err?.name !== 'AbortError') setErrore('Condivisione non riuscita.')
      }
      return
    }
    scarica(blob)
  }

  const scarica = async (blobPronto) => {
    const blob = blobPronto || (await canvasInBlob(canvas))
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeFile()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setFatto('Immagine salvata')
  }

  // WhatsApp: dal telefono l'immagine passa dal foglio di condivisione (è
  // l'unico modo di mandarle un file: WhatsApp si sceglie lì). Dove i file non
  // si condividono (quasi tutti i computer) si scarica l'immagine e si apre
  // WhatsApp con due righe di testo: l'immagine la si allega da lì.
  const testoWhatsApp = () =>
    [
      riepCompleto.nomeGiorno,
      [stat.durataSec > 0 ? durataLunga(stat.durataSec) : null, stat.serieFatte > 0 ? `${stat.serieFatte} serie` : null]
        .filter(Boolean)
        .join(' · '),
    ]
      .filter(Boolean)
      .join(' · ')

  const whatsapp = async () => {
    setErrore('')
    const blob = await canvasInBlob(canvas)
    if (!blob) return
    const file = new File([blob], nomeFile(), { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: testoWhatsApp() })
        setFatto('Condiviso!')
      } catch (err) {
        if (err?.name !== 'AbortError') setErrore('Condivisione non riuscita.')
      }
      return
    }
    await scarica(blob)
    window.open(`https://wa.me/?text=${encodeURIComponent(testoWhatsApp())}`, '_blank', 'noopener')
  }

  const puoCondividere = typeof navigator !== 'undefined' && !!navigator.canShare

  return (
    <>
      {/* Il titolo della card. Si salva anche sull'allenamento: lo stesso nome
          lo ritrovi in calendario e nello storico. */}
      {onNome && (
        <div className="field">
          <label htmlFor="recap-nome">Nome dell’allenamento</label>
          <input
            id="recap-nome"
            className="input"
            maxLength={60}
            value={nome ?? ''}
            placeholder={riep?.nomeGiorno || 'Allenamento'}
            onChange={(e) => onNome?.(e.target.value)}
          />
        </div>
      )}

      {/* Cosa c'è sulla card: si apre da qui, sopra l'anteprima, che si
          ridisegna a ogni tocco. */}
      {onLayout && (
        <button
          type="button"
          className={'btn btn-sm btn-block' + (modifica ? ' btn-accent' : '')}
          style={{ marginBottom: 10 }}
          onClick={() => setModifica((m) => !m)}
          aria-expanded={modifica}
        >
          <IconEdit width={15} height={15} /> {modifica ? 'Fatto' : 'Modifica'}
        </button>
      )}

      {/* In modifica l'anteprima resta in alto, più piccola, mentre si scorre
          la lista dei pezzi: ogni tocco si vede subito. */}
      <div className={'recap-share' + (modifica ? ' recap-share-fissa' : '')}>
        <img className="recap-img" src={url} alt="Recap dell’allenamento" />
      </div>

      {modifica && onLayout && <RecapLayoutEditor layout={layout} onCambia={onLayout} />}

      <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', margin: '10px 2px 0' }}>
        Tieni premuto sull’immagine per salvarla, oppure usa i tasti qui sotto.
      </p>

      {/* Ultimo passo dell'allenamento: i numeri letti sull'orologio. */}
      {onOrologio && <DatiOrologio valori={orologio || {}} onCambia={onOrologio} />}

      {/* Commento: facoltativo. Se c'è finisce nella card e viene salvato
          sull'allenamento; se è vuoto, sulla card non c'è niente al suo posto. */}
      {onCommento && (
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="recap-commento">Commento (facoltativo)</label>
          <textarea
            id="recap-commento"
            className="input"
            rows={2}
            maxLength={180}
            placeholder="Com’è andata? Se lo lasci vuoto, sulla card non compare."
            value={commento}
            onChange={(e) => onCommento(e.target.value)}
          />
          <div className="faint" style={{ fontSize: 11.5, textAlign: 'right', marginTop: 4 }}>
            {commento.length}/180
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button
          className="btn grow"
          onClick={() => inputFile.current?.click()}
        >
          <IconImage width={17} height={17} />
          {foto ? 'Cambia foto' : 'Foto di sfondo'}
        </button>
        {foto && (
          <button className="btn" onClick={() => setFoto(null)} aria-label="Togli la foto">
            <IconClose width={17} height={17} />
          </button>
        )}
      </div>
      <input
        ref={inputFile}
        type="file"
        accept="image/*"
        hidden
        onChange={scegliFoto}
      />

      {errore && (
        <p className="form-error" style={{ marginTop: 10 }}>
          {errore}
        </p>
      )}
      {fatto && (
        <p className="row" style={{ gap: 6, color: 'var(--good)', fontSize: 13, marginTop: 10 }}>
          <IconCheck width={16} height={16} />
          {fatto}
        </p>
      )}

      <button
        className="btn btn-block"
        style={{ marginTop: 14 }}
        onClick={() => setCondividiInApp(true)}
      >
        <IconShare width={17} height={17} /> Manda a un amico (nell'app)
      </button>

      {condividiInApp && (
        <CondividiConAmici
          tipo={TIPO_CONDIVISIONE.RECAP}
          titolo={riepCompleto.nomeGiorno}
          sottotitolo={riep?.nomeScheda || ''}
          payload={{ riep: riepCompleto, stat, utente, commento, layout }}
          onChiudi={() => setCondividiInApp(false)}
        />
      )}

      <button className="btn btn-block btn-lg btn-whatsapp" style={{ marginTop: 14 }} onClick={whatsapp}>
        <IconShare width={17} height={17} /> WhatsApp
      </button>

      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        {puoCondividere && (
          <button className="btn btn-accent btn-lg grow" onClick={condividi}>
            Condividi
          </button>
        )}
        <button className={'btn btn-lg' + (puoCondividere ? '' : ' btn-accent grow')} onClick={() => scarica()}>
          Scarica
        </button>
      </div>
    </>
  )
}
