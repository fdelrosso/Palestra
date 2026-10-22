import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { AnteprimaTrailer, LettoreTrailer } from './Benvenuto'
import { IconaSezione } from './icons'

// ---------------------------------------------------------------------------
// Il TUTORIAL: un giro dell'app, la prima volta che si entra.
//
// UNO SOLO, all'inizio, e non uno per pagina: le pagine sono una ventina, e
// una finestrella a ogni prima visita interromperebbe proprio quando si sta
// facendo qualcosa (si apre la Dieta per segnare il pranzo, non per leggere).
// Quello che serve sapere entrando è DOVE stanno le cose, e le cose stanno
// tutte nella barra in basso: il giro accende una linguetta per volta e dice
// cosa c'è dentro. Il primo passo ha la presentazione (lo stesso video del
// Benvenuto), che da dentro l'app prima non si poteva più rivedere.
//
// Visto una volta (Fine o Salta) non torna: si ricorda nelle preferenze del
// profilo (`avvisi.tutorial`), così vale su ogni telefono. Si riapre da
// Altro → "Guida all'app" (`apriTutorial`).
//
// Durante il giro la barra sale sopra lo sfondo scuro ma non si tocca:
// la linguetta di turno si accende (index.css, body[data-tutorial]).
// ---------------------------------------------------------------------------

const EVENTO = 'palestra:tutorial'

// Da Altro: riapre il giro dall'inizio, dovunque sia montato.
export function apriTutorial() {
  window.dispatchEvent(new Event(EVENTO))
}

const passi = (modoPt) => [
  {
    id: 'via',
    titolo: 'Benvenuto in Progetto Palestra',
    testo:
      'Ti facciamo fare un giro veloce: cinque linguette, e sai dove sta tutto. Se vuoi prima vedere l’app in movimento, guarda la presentazione.',
    video: true,
  },
  modoPt
    ? {
        id: 'inizio',
        titolo: 'Home: il tuo lavoro',
        testo:
          'In modalità PT qui ci sono i tuoi atleti, le schede di lavoro e la vetrina. La tua foto in alto apre il profilo: lì passi da PT ad atleta.',
      }
    : {
        id: 'inizio',
        titolo: 'Home',
        testo:
          'Si parte da qui: la settimana e l’allenamento di oggi, con un tasto per cominciare. Tocca la tua foto in alto per il profilo: dati fisici, PT, colori e account.',
      },
  {
    id: 'allenamento',
    titolo: 'Allenamento',
    testo:
      'Le tue schede, lo storico e il calendario. Col + incolli la scheda del tuo PT o ne crei una; in palestra segui ogni serie col timer del recupero.',
  },
  {
    id: 'dieta',
    titolo: 'Dieta',
    testo:
      'Il piano di oggi pasto per pasto, con calorie e macro che si riempiono. Carica il PDF del nutrizionista o fattela calcolare dai tuoi dati.',
  },
  {
    id: 'social',
    titolo: 'Social',
    testo:
      'Gli allenamenti degli amici, il tuo profilo, i messaggi e la ricerca. Dentro Social la barra cambia: per uscire c’è Home, a sinistra.',
  },
  {
    id: 'altro',
    titolo: 'Altro',
    testo:
      'Gli esercizi in 3D, le schede prefatte e quelle di tutti. Qui trovi anche questa guida e la presentazione, per rivederle quando vuoi.',
  },
]

// Aperto o no. La prima volta si apre da solo, ma solo dopo che le preferenze
// sono arrivate dal cloud: un "visto" dato da un altro telefono deve fare in
// tempo ad arrivare.
export function useTutorial() {
  const { preferenze, aggiornaPreferenze, statoCloud } = useStore()
  const [riaperto, setRiaperto] = useState(false)
  const [chiusoOra, setChiusoOra] = useState(false)
  useEffect(() => {
    const apri = () => setRiaperto(true)
    window.addEventListener(EVENTO, apri)
    return () => window.removeEventListener(EVENTO, apri)
  }, [])
  const visto = preferenze?.avvisi?.tutorial === 'visto'
  const aperto = riaperto || (!visto && !chiusoOra && statoCloud !== 'caricamento')
  const chiudi = useCallback(() => {
    setRiaperto(false)
    setChiusoOra(true)
    if (!visto) aggiornaPreferenze((p) => ({ avvisi: { ...p.avvisi, tutorial: 'visto' } }))
  }, [visto, aggiornaPreferenze])
  return { aperto, chiudi }
}

export default function Tutorial({ onChiudi, modoPt = false }) {
  const elenco = passi(modoPt)
  const [n, setN] = useState(0)
  const [trailer, setTrailer] = useState(false)
  const [freccia, setFreccia] = useState(null)
  const scheda = useRef(null)
  const avanti = useRef(null)
  const passo = elenco[n]
  const ultimo = n === elenco.length - 1
  const sezione = passo.video ? null : passo.id

  // La linguetta di turno, accesa dal CSS.
  useEffect(() => {
    document.body.classList.add('tutorial-aperto')
    return () => {
      document.body.classList.remove('tutorial-aperto')
      delete document.body.dataset.tutorial
    }
  }, [])
  useEffect(() => {
    if (sezione) document.body.dataset.tutorial = sezione
    else delete document.body.dataset.tutorial
    avanti.current?.focus()
  }, [sezione])

  // La punta sotto la scheda va sopra la linguetta: si misura, perché la
  // barra è larga al massimo 420px e centrata, la scheda no.
  useLayoutEffect(() => {
    const misura = () => {
      const voce = sezione && document.querySelector(`.barra-voce[data-sezione="${sezione}"]`)
      const box = scheda.current?.getBoundingClientRect()
      if (!voce || !box) return setFreccia(null)
      const v = voce.getBoundingClientRect()
      setFreccia(v.left + v.width / 2 - box.left)
    }
    misura()
    window.addEventListener('resize', misura)
    return () => window.removeEventListener('resize', misura)
  }, [sezione])

  const vai = (d) => (n + d >= elenco.length ? onChiudi() : setN(Math.max(0, n + d)))

  useEffect(() => {
    // Col video aperto Esc chiude il video (LettoreTrailer), non il giro.
    if (trailer) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onChiudi()
      else if (e.key === 'ArrowRight') vai(1)
      else if (e.key === 'ArrowLeft') vai(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="tutorial" role="dialog" aria-modal="true" aria-label="Guida all’app">
      <div className="tutorial-sfondo" aria-hidden="true" />
      <div
        ref={scheda}
        key={passo.id}
        className={'tutorial-scheda' + (freccia != null ? ' con-freccia' : '')}
        style={freccia != null ? { '--freccia-x': freccia + 'px' } : undefined}
      >
        <div className="tutorial-testa">
          <span className="tutorial-conta">
            {n + 1} di {elenco.length}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
            {ultimo ? 'Chiudi' : 'Salta'}
          </button>
        </div>

        <h3 className="tutorial-titolo">
          {sezione && (
            <span className="tutorial-icona" aria-hidden="true">
              <IconaSezione sezione={sezione} piena width={20} height={20} />
            </span>
          )}
          {passo.titolo}
        </h3>
        <p className="tutorial-testo">{passo.testo}</p>

        {passo.video && <AnteprimaTrailer className="tutorial-trailer" onApri={() => setTrailer(true)} />}

        <div className="tutorial-punti" aria-hidden="true">
          {elenco.map((p, i) => (
            <span key={p.id} className={i === n ? 'on' : ''} />
          ))}
        </div>

        <div className="tutorial-tasti">
          {n > 0 && (
            <button className="btn" onClick={() => vai(-1)}>
              Indietro
            </button>
          )}
          <button ref={avanti} className="btn btn-accent grow" onClick={() => vai(1)}>
            {ultimo ? 'Ho capito' : n === 0 ? 'Fai il giro' : 'Avanti'}
          </button>
        </div>
      </div>
      {trailer && <LettoreTrailer onChiudi={() => setTrailer(false)} />}
    </div>
  )
}
