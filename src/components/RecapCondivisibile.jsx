import { useEffect, useMemo, useRef, useState } from 'react'
import { altraPalette, haRiscaldamento, paletteFondo, statisticheRecap } from '../lib/recap'
import {
  disegnaRecap,
  caricaImmagine,
  caricaImmagineDaUrl,
  canvasInBlob,
  fotoPerSfondo,
  caricaAvatar,
} from '../lib/recapImmagine'
import { normalizzaMusica, spotifyDi } from '../lib/musica'
import { fonteFotoAllenamento, percorsoFotoAllenamento } from '../lib/fotoAllenamento'
import { fotogrammaVideo, sfondoPuoMuoversi } from '../lib/media'
import { useCorpoPronto } from '../lib/corpoImmagini'
import useCorpoAllenamento from '../hooks/useCorpoAllenamento'
import { IconImage, IconClose, IconCheck, IconShare, IconEdit, IconPlus, IconInvia, IconDownload, IconDado, IconVideo } from './icons'
import TastoFoto from './TastoFoto'
import SceltaSpezzone from './SceltaSpezzone'
import RecapLayoutEditor from './RecapLayoutEditor'
import { acceso, alterna } from '../lib/recapLayout'
import { numeroPositivo } from '../lib/recap'
import Foglio, { SezioneFoglio } from './Foglio'
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
//   2. Scarica → <a download> (desktop: lo stesso tasto, dove navigator.share
//      non c'è, si chiama così);
//   3. sempre valido: tieni premuto sull'anteprima e salva l'immagine.
//
// C'e poi una quarta strada che non esce dall'app: "Manda a un amico". La non
// viaggia l'immagine ma i NUMERI del recap, e la card la ridisegna il telefono
// di chi la riceve - un PNG 1080x1350 in localStorage non ci starebbe.
// ⚠️ Sulla card (dal 2026-09-18): il TITOLO si può cambiare (`nome`); commento,
// calorie e battito sono facoltativi e, se vuoti, non compaiono. Dalla 58ª la
// card è IDENTICA al recap del feed (lib/recapImmagine): in fondo ci sono
// avatar e nome di chi l'ha fatto (`utente`, `utenteId`) col commento sotto.
// ⚠️ Dal 2026-09-29 la card è a blocchi: "Modifica" sopra l'anteprima sceglie
// quali pezzi tenere e in che ordine (`layout`, lib/recapLayout). Il layout
// lo salva chi chiama sull'allenamento, e viaggia col recap mandato agli amici.
// ⚠️ La si apre anche dal calendario, dove nome, commento e orologio non si
// scrivono: senza `onCommento` / `onOrologio` quei campi non ci sono. Il NOME
// si cambia fuori di qui (nel riepilogo, sopra la card): qui serve solo per
// disegnarlo.
// ⚠️ LA FOTO DI SFONDO SI SALVA (52ª+): `onSfondo(blob|null)` la passa a chi
// chiama, che la carica come foto dell'allenamento e ne scrive l'id sul
// completamento (`sfondo`) — il riepilogo lo fa al "Salva". È la stessa che il feed di Social mette dietro al recap: card e
// feed hanno lo stesso sfondo. `sfondoId` + `utenteId` la ritrovano quando il
// recap si riapre. Senza `onSfondo` la foto vale solo per l'immagine di adesso.
// L'immagine da disegnare sotto la card: la foto, o per uno sfondo VIDEO (78ª,
// lo spezzone di SceltaSpezzone) un suo fotogramma. La card è un PNG: un video
// non ci sta, nel feed invece si muove. `fonte` = un file o un indirizzo.
async function immagineDiSfondo(fonte) {
  const video = typeof fonte !== 'string' && String(fonte?.type || '').startsWith('video')
  if (!video) {
    try {
      return { img: typeof fonte === 'string' ? await caricaImmagineDaUrl(fonte) : await caricaImmagine(fonte), video: false }
    } catch {
      // Un indirizzo non dice cos'è: se non è un'immagine, si prova come video.
      if (typeof fonte !== 'string') throw new Error('Immagine non leggibile')
    }
  }
  const fotogramma = await fotogrammaVideo(fonte, { lato: 1600 })
  return { img: await caricaImmagine(fotogramma), video: true }
}

// L'indirizzo da far girare nell'anteprima: un file diventa un URL locale,
// che va revocato quando non serve più.
function indirizzoVideo(fonte) {
  if (typeof fonte === 'string') return { url: fonte, revoca: () => {} }
  const url = URL.createObjectURL(fonte)
  return { url, revoca: () => URL.revokeObjectURL(url) }
}

export default function RecapCondivisibile({
  riep,
  schede,
  diete,
  dati,
  utente,
  nome,
  commento,
  onCommento,
  orologio,
  onOrologio,
  layout,
  onLayout,
  sfondoId = null,
  utenteId = null,
  onSfondo,
  // La foto scelta e non ancora salvata (il blob di `onSfondo`, o null se
  // tolta; undefined = non toccata). La tiene chi chiama: passando alla vista
  // Dettaglio questa card si smonta, e la foto andava persa (2026-10-21).
  sfondoNuovo,
  // La canzone dell'allenamento (lib/musica): quella appena scelta nel
  // riepilogo, o quella salvata. Va in fondo alla card, come nel feed.
  musica = riep?.musica || null,
  // La palette dello sfondo (lib/recap, paletteFondo) e il dado per cambiarla,
  // come lo sfondo delle storie di Instagram in "Crea". Senza `onColori`
  // niente dado.
  colori = riep?.colori || null,
  onColori,
  pillole = null,
  // Solo da guardare: l'allenamento di un altro (components/ListaAllenamenti).
  // Niente pillole per cambiarlo, niente condividi né manda: la card e basta.
  solaLettura = false,
  // La card a tutto schermo (components/AllegatiRecap): `onUrlCard` riceve
  // l'immagine ogni volta che si ridisegna, `onApriCard` il tocco sulla card.
  // `onVideoCard`: con lo sfondo video che si muove, { video, sopra } (il video
  // e la card senza sfondo da metterci sopra), sennò null.
  onUrlCard,
  onVideoCard,
  onApriCard,
  // Subito sotto la card (gli allegati, components/AllegatiRecap).
  sottoCard = null,
}) {
  const [modifica, setModifica] = useState(false)
  const [foto, setFoto] = useState(null)
  // Lo sfondo è un video (78ª): cambia solo cosa dicono i tasti.
  const [fotoVideo, setFotoVideo] = useState(false)
  // Il video scelto da cui prendere i 6 secondi (SceltaSpezzone aperta).
  const [spezzoneDa, setSpezzoneDa] = useState(null)
  // Lo sfondo video che gira SOTTO l'anteprima (come nel feed): { url, revoca }.
  // La card resta un'immagine; qui sopra il video ci va disegnata senza sfondo.
  const [videoSotto, setVideoSotto] = useState(null)
  const cambiaVideoSotto = (fonte) => setVideoSotto(fonte ? indirizzoVideo(fonte) : null)
  // Quello di prima si butta quando cambia (e quando la card si chiude).
  useEffect(() => () => videoSotto?.revoca(), [videoSotto])
  // Lo sfondo già salvato: si ricarica una volta, se non se n'è scelto un altro.
  const scelta = useRef(sfondoNuovo !== undefined)
  // Quello scelto e non ancora salvato: si ricarica tornando sulla card.
  useEffect(() => {
    if (!sfondoNuovo) return undefined
    let vivo = true
    immagineDiSfondo(sfondoNuovo)
      .then(({ img, video }) => {
        if (!vivo) return
        setFoto(img)
        setFotoVideo(video)
        if (video) cambiaVideoSotto(sfondoNuovo)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura: dopo la foto la cambia scegliFoto
  }, [])
  useEffect(() => {
    if (!sfondoId || !utenteId || scelta.current) return undefined
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id: sfondoId, percorso: percorsoFotoAllenamento(utenteId, sfondoId) })
      .then(async (f) => {
        revoca = f.revoca
        if (!f.url) return
        const { img, video } = await immagineDiSfondo(f.url)
        if (vivo && !scelta.current) {
          setFoto(img)
          setFotoVideo(video)
          if (video) cambiaVideoSotto(f.url)
        }
      })
      .catch(() => {})
    return () => {
      vivo = false
      revoca()
    }
  }, [sfondoId, utenteId])
  // La foto profilo: in fondo alla card, accanto al nome, come nel feed.
  const [avatar, setAvatar] = useState(null)
  useEffect(() => {
    let vivo = true
    caricaAvatar(utenteId).then((img) => vivo && setAvatar(img))
    return () => {
      vivo = false
    }
  }, [utenteId])
  // La copertina della canzone, accanto al titolo in fondo alla card. Il
  // server di Apple manda le immagini con CORS aperto: la canvas resta
  // esportabile. Se non arriva, la pillola resta col solo testo.
  const urlCopertina = normalizzaMusica(musica)?.copertina || ''
  const [copertina, setCopertina] = useState(null)
  useEffect(() => {
    if (!urlCopertina) return undefined
    let vivo = true
    caricaImmagineDaUrl(urlCopertina)
      .then((img) => vivo && setCopertina({ url: urlCopertina, img }))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [urlCopertina])
  // Quella di una canzone tolta o cambiata non si disegna.
  const imgCopertina = copertina?.url === urlCopertina ? copertina.img : null
  // E quella della playlist di Spotify collegata, per la pillola in cima
  // (anche Spotify manda le copertine con CORS aperto).
  const urlSpotify = spotifyDi(musica)?.copertina || ''
  const [copSpotify, setCopSpotify] = useState(null)
  useEffect(() => {
    if (!urlSpotify) return undefined
    let vivo = true
    caricaImmagineDaUrl(urlSpotify)
      .then((img) => vivo && setCopSpotify({ url: urlSpotify, img }))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [urlSpotify])
  const imgSpotify = copSpotify?.url === urlSpotify ? copSpotify.img : null
  const [condividiInApp, setCondividiInApp] = useState(false)
  const [errore, setErrore] = useState('')
  const [fatto, setFatto] = useState('')

  // I numeri copiati dall'orologio si comportano come campi del riepilogo: li
  // sovrapponiamo a una copia, così `statisticheRecap` legge un oggetto solo e
  // la card si ridisegna a ogni cifra digitata.
  // Il titolo: quello scritto qui, o quello di partenza se il campo è vuoto.
  const riepCompleto = useMemo(
    () => ({ ...riep, ...orologio, nomeGiorno: nome?.trim() || riep?.nomeGiorno || 'Allenamento', musica, colori }),
    [riep, orologio, nome, musica, colori],
  )

  // `dati` = i dati fisici del profilo: servono ancora alla stima delle
  // calorie, che però sulla card non va più (vedi lib/recap).
  const stat = useMemo(
    () => statisticheRecap(riepCompleto, { schede, diete, dati }),
    [riepCompleto, schede, diete, dati],
  )

  // La card si ridisegna a ogni modifica di commento/foto. È un valore
  // derivato dagli input, non uno stato: niente effetto, niente doppio render.
  // Le immagini del corpo arrivano dopo: quando ci sono, la card si ridisegna.
  const corpo = useCorpoAllenamento(riepCompleto)
  const corpoPronto = useCorpoPronto(corpo)
  const { canvas, url } = useMemo(() => {
    const c = disegnaRecap({
      riep: riepCompleto,
      stat,
      commento,
      foto,
      layout,
      nome: utente,
      avatar,
      copertina: imgCopertina,
      copertinaSpotify: imgSpotify,
      corpo,
    })
    return { canvas: c, url: c.toDataURL('image/png') }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corpoPronto: ridisegna quando arrivano le immagini
  }, [riepCompleto, stat, commento, foto, layout, utente, avatar, imgCopertina, imgSpotify, corpo, corpoPronto])

  // L'anteprima che si muove: la stessa card senza sfondo (solo il velo),
  // sopra il video. Quella da condividere resta `url`, col fotogramma.
  const muoversi = fotoVideo && !!videoSotto && sfondoPuoMuoversi()
  const urlSopra = useMemo(
    () =>
      muoversi
        ? disegnaRecap({
            riep: riepCompleto,
            stat,
            commento,
            layout,
            nome: utente,
            avatar,
            copertina: imgCopertina,
            copertinaSpotify: imgSpotify,
            soloVelo: true,
            corpo,
          }).toDataURL('image/png')
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corpoPronto: ridisegna quando arrivano le immagini
    [muoversi, riepCompleto, stat, commento, layout, utente, avatar, imgCopertina, imgSpotify, corpo, corpoPronto],
  )

  useEffect(() => {
    onUrlCard?.(url)
  }, [url, onUrlCard])
  useEffect(() => {
    onVideoCard?.(urlSopra ? { video: videoSotto.url, sopra: urlSopra } : null)
  }, [urlSopra, videoSotto, onVideoCard])

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
    let img
    try {
      img = await caricaImmagine(file)
    } catch {
      setErrore('Non riesco a leggere questa immagine. Prova con un’altra.')
      return
    }
    scelta.current = true
    setFoto(img)
    setFotoVideo(false)
    cambiaVideoSotto(null)
    if (onSfondo) onSfondo(await fotoPerSfondo(img))
  }

  // I 6 secondi pronti (SceltaSpezzone): sulla card il loro fotogramma, e lo
  // spezzone va a chi salva, come una foto.
  const usaSpezzone = async (spezzone) => {
    setSpezzoneDa(null)
    setErrore('')
    try {
      const { img } = await immagineDiSfondo(spezzone)
      scelta.current = true
      setFoto(img)
      setFotoVideo(true)
      cambiaVideoSotto(spezzone)
      onSfondo?.(spezzone)
    } catch {
      setErrore('Non riesco a leggere il video ritagliato. Prova con un altro.')
    }
  }

  const togliFoto = () => {
    scelta.current = true
    setFoto(null)
    setFotoVideo(false)
    cambiaVideoSotto(null)
    onSfondo?.(null)
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

  const puoCondividere = typeof navigator !== 'undefined' && !!navigator.canShare

  // I campi facoltativi non stanno più in pagina (2026-10-20): sotto la card
  // c'è una fila di pillole ("+ Commento", "+ Sfondo"…) e ognuna apre il suo
  // foglio. Piena = quel pezzo c'è già, e dice cosa. Chi chiama può
  // aggiungerne di sue (`pillole`: le foto e video del riepilogo).
  const [foglio, setFoglio] = useState(null)
  const chiudi = () => setFoglio(null)
  const testoOrologio = orologio
    ? [
        numeroPositivo(orologio.calorieReali) && `${numeroPositivo(orologio.calorieReali)} kcal`,
        numeroPositivo(orologio.fcMedia) && `${numeroPositivo(orologio.fcMedia)} bpm`,
        numeroPositivo(orologio.fcMax) && `max ${numeroPositivo(orologio.fcMax)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <>
      {/* In modifica l'anteprima resta in alto, più piccola, mentre si scorre
          la lista dei pezzi: ogni tocco si vede subito. Il "Fatto" della
          modifica sta in fondo (vedi sotto). Per entrare in modifica il tasto
          sta in testa alle pillole e dice cosa fa: "Scegli cosa mostrare" (con
          "Modifica" sembrava che cambiasse l'allenamento; sull'angolo della
          card copriva la prima riga). */}
      <div className={'recap-share' + (modifica ? ' recap-share-fissa' : '')}>
        <div className="recap-tela">
          {urlSopra && (
            <video className="recap-video-sotto" src={videoSotto.url} muted loop playsInline autoPlay aria-hidden="true" />
          )}
          {onApriCard && !modifica ? (
            <button type="button" className="recap-img-apri" onClick={onApriCard} aria-label="Apri il recap a tutto schermo">
              <img className={'recap-img' + (urlSopra ? ' sopra-video' : '')} src={urlSopra || url} alt="Recap dell’allenamento" />
            </button>
          ) : (
            <img className={'recap-img' + (urlSopra ? ' sopra-video' : '')} src={urlSopra || url} alt="Recap dell’allenamento" />
          )}
        </div>
      </div>
      {!modifica && sottoCard}

      {/* Il tasto per chiudere la modifica sta IN FONDO, appiccicato al bordo
          di sotto (anche nel modale del calendario): dove ci si aspetta una
          conferma. In cima, sopra l'anteprima, non lo si cercava. Nel
          riepilogo prende il posto di "Riprendi" e "Fatto", che in modifica
          si nascondono (.riep-fondo in index.css): sembravano della modifica,
          e "Fatto" chiudeva il riepilogo. */}
      {modifica && onLayout && (
        <>
          <RecapLayoutEditor layout={layout} onCambia={onLayout} presenti={haRiscaldamento(stat) ? ['riscaldamento'] : []} />
          <div className="recap-modifica-fondo">
            <button type="button" className="btn btn-accent btn-lg grow" onClick={() => setModifica(false)} aria-expanded>
              Fatto
            </button>
          </div>
        </>
      )}

      {!modifica && !solaLettura && (
        <div className="recap-pillole">
          {onLayout && (
            <button
              type="button"
              className="chip recap-pill recap-pill-mostra"
              onClick={() => setModifica(true)}
              aria-expanded={false}
            >
              <IconEdit width={13} height={13} /> Scegli cosa mostrare
            </button>
          )}
          {/* Il riscaldamento sulla card, sì o no: un tocco, senza aprire
              "Scegli cosa mostrare" (dove c'è lo stesso). Solo se c'era; accanto a
              lui, che fa la stessa cosa per tutto il resto. */}
          {onLayout && haRiscaldamento(stat) && (
            <PillolaRecap piena={acceso(layout, 'riscaldamento')} onClick={() => onLayout(alterna(layout, 'riscaldamento'))}>
              Riscaldamento
            </PillolaRecap>
          )}
          {/* I record, come il riscaldamento: se ce n'è uno, toglierlo (o
              rimetterlo) è un tocco. */}
          {onLayout && stat.record.length > 0 && (
            <PillolaRecap piena={acceso(layout, 'record')} onClick={() => onLayout(alterna(layout, 'record'))}>
              {stat.record.length === 1 ? 'Record' : `${stat.record.length} record`}
            </PillolaRecap>
          )}
          {/* Lo sfondo: i colori (il dado) o una foto, nello stesso foglio. */}
          <PillolaRecap piena={!!foto || !!colori} onClick={() => setFoglio('sfondo')}>
            {fotoVideo ? 'Sfondo · video' : foto ? 'Sfondo · foto' : colori ? 'Sfondo · colori' : 'Sfondo'}
          </PillolaRecap>
          {onCommento && (
            <PillolaRecap piena={!!commento.trim()} onClick={() => setFoglio('commento')}>
              Commento
            </PillolaRecap>
          )}
          {onOrologio && (
            <PillolaRecap piena={!!testoOrologio} onClick={() => setFoglio('orologio')}>
              {testoOrologio || 'Orologio'}
            </PillolaRecap>
          )}
          {pillole}
        </div>
      )}

      {errore && (
        <p className="form-error" style={{ marginTop: 10, textAlign: 'center' }}>
          {errore}
        </p>
      )}
      {fatto && (
        <p className="row" style={{ gap: 6, color: 'var(--good)', fontSize: 13, marginTop: 10, justifyContent: 'center' }}>
          <IconCheck width={16} height={16} />
          {fatto}
        </p>
      )}

      {/* Una riga sola: in grande il foglio di condivisione del telefono, la
          lista di tutti i modi (WhatsApp, Instagram, Messaggi, Salva
          immagine…; sul computer, dove non c'è, scarica il PNG), e accanto
          "Manda a un amico". ⚠️ Niente tasto apposta per le storie di
          Instagram (provato il 2026-10-20): una web app non può aprirle con
          l'immagine dentro — lo fa solo un'app nativa — e il tasto apriva lo
          stesso foglio di questo. */}
      {!modifica && !solaLettura && (
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button className="btn btn-lg grow" onClick={puoCondividere ? condividi : () => scarica()}>
            {puoCondividere ? <IconShare width={18} height={18} /> : <IconDownload width={18} height={18} />}
            {puoCondividere ? 'Condividi' : 'Scarica'}
          </button>
          <button
            className="btn recap-tasto-icona"
            onClick={() => setCondividiInApp(true)}
            aria-label="Manda a un amico nell’app"
            title="Manda a un amico nell’app"
          >
            <IconInvia width={18} height={18} />
          </button>
        </div>
      )}

      {condividiInApp && (
        <CondividiConAmici
          tipo={TIPO_CONDIVISIONE.RECAP}
          titolo={riepCompleto.nomeGiorno}
          sottotitolo={riep?.nomeScheda || ''}
          payload={{ riep: riepCompleto, stat, utente, commento, layout }}
          onChiudi={() => setCondividiInApp(false)}
        />
      )}

      {/* Commento: se c'è finisce nella card e viene salvato sull'allenamento;
          se è vuoto, sulla card non c'è niente al suo posto. */}
      {foglio === 'commento' && (
        <Foglio titolo="Commento" sotto="Sulla card e nel feed, sotto il tuo nome." onChiudi={chiudi}>
          <textarea
            id="recap-commento"
            className="input"
            aria-label="Commento"
            rows={3}
            maxLength={180}
            autoFocus
            placeholder="Com’è andata?"
            value={commento}
            onChange={(e) => onCommento(e.target.value)}
          />
          <div className="faint" style={{ fontSize: 11.5, textAlign: 'right', marginTop: 4 }}>
            {commento.length}/180
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            {commento && (
              <button
                className="btn grow"
                onClick={() => {
                  onCommento('')
                  chiudi()
                }}
              >
                Togli
              </button>
            )}
            <button className="btn btn-accent grow" onClick={chiudi}>
              Fatto
            </button>
          </div>
        </Foglio>
      )}

      {/* Il dado prima di tutto: un'altra palette (lib/recap, paletteFondo),
          come lo sfondo delle storie di Instagram in "Crea". Il foglio resta
          aperto, così si tira finché non piace. Coi colori la foto se ne va:
          sotto la foto la palette non si vedrebbe. */}
      {foglio === 'sfondo' && (
        <Foglio
          titolo="Sfondo"
          sotto={onSfondo ? 'Dietro al recap: sulla card e nel feed.' : 'Dietro al recap, sulla card.'}
          onChiudi={chiudi}
        >
          <div className="stack" style={{ gap: 10 }}>
            {onColori && (
              <SezioneFoglio
                icona={<IconDado width={20} height={20} />}
                titolo="Colori"
                sotto="Una palette coi colori dei muscoli allenati: tira il dado finché ti piace."
                inUso={!foto}
              >
                <button
                  className="btn btn-block recap-pill-dado"
                  onClick={() => {
                    if (foto) togliFoto()
                    onColori(altraPalette(paletteFondo(stat.gruppi, colori)?.id))
                  }}
                >
                  <IconDado width={17} height={17} /> {foto ? 'Usa i colori' : 'Cambia i colori'}
                </button>
              </SezioneFoglio>
            )}
            <SezioneFoglio
              icona={<IconImage width={20} height={20} />}
              titolo="Foto"
              sotto="Una tua foto, velata dietro ai numeri."
              inUso={!!foto && !fotoVideo}
            >
              <div className="row" style={{ gap: 8 }}>
                <TastoFoto
                  className="btn grow"
                  style={{ flex: 1 }}
                  inLinea
                  onChange={async (e) => {
                    await scegliFoto(e)
                    chiudi()
                  }}
                >
                  <IconImage width={17} height={17} /> {foto && !fotoVideo ? 'Cambia foto' : 'Scegli una foto'}
                </TastoFoto>
              </div>
              {foto && !fotoVideo && (
                <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={togliFoto}>
                  <IconClose width={17} height={17} /> Togli la foto
                </button>
              )}
            </SezioneFoglio>
            {/* Un video: se ne scelgono 6 secondi, che nel feed si muovono dietro
                al recap (SceltaSpezzone). Solo se lo sfondo si salva: nel PNG
                da condividere resterebbe un fotogramma e basta. */}
            {onSfondo && (
              <SezioneFoglio
                icona={<IconVideo width={20} height={20} />}
                titolo="Video"
                sotto="6 secondi che si muovono dietro al recap nel feed. Sulla card condivisa resta un fotogramma."
                inUso={fotoVideo}
              >
                <label className="btn btn-block">
                  <IconVideo width={17} height={17} /> {fotoVideo ? 'Cambia video' : 'Scegli un video'}
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) setSpezzoneDa(file)
                    }}
                  />
                </label>
                {fotoVideo && (
                  <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={togliFoto}>
                    <IconClose width={17} height={17} /> Togli il video
                  </button>
                )}
              </SezioneFoglio>
            )}
            <button className="btn btn-accent btn-block" onClick={chiudi}>
              Fatto
            </button>
          </div>
        </Foglio>
      )}

      {spezzoneDa && (
        <SceltaSpezzone
          file={spezzoneDa}
          onChiudi={() => setSpezzoneDa(null)}
          onFatto={async (spezzone) => {
            await usaSpezzone(spezzone)
            chiudi()
          }}
        />
      )}

      {/* I numeri letti sull'orologio. */}
      {foglio === 'orologio' && (
        <Foglio
          titolo="Dati dall’orologio"
          sotto="Calorie e battito misurati dall’orologio, fra i numeri della card. Quelli che lasci vuoti non compaiono."
          onChiudi={chiudi}
        >
          <DatiOrologio valori={orologio || {}} onCambia={onOrologio} />
          <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} onClick={chiudi}>
            Fatto
          </button>
        </Foglio>
      )}

    </>
  )
}

// La pillola di un pezzo facoltativo del recap: vuota "+ Commento"
// (tratteggiata), piena "✓ Commento" (dell'accento).
export function PillolaRecap({ piena, onClick, children }) {
  return (
    <button type="button" className={'chip recap-pill' + (piena ? ' piena' : '')} onClick={onClick} aria-pressed={!!piena}>
      {piena ? <IconCheck width={14} height={14} /> : <IconPlus width={14} height={14} />} {children}
    </button>
  )
}
