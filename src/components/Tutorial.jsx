import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { routes, useRoute, vaiASezione } from '../lib/router'
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
// tutte nella barra in basso: il giro ENTRA in una sezione per volta (come
// toccarne la linguetta), la accende e dice cosa c'è dentro. Finito o
// saltato, si torna dove si era partiti. Il primo passo ha la presentazione
// (lo stesso video del Benvenuto), che da dentro l'app prima non si poteva
// più rivedere.
//
// Visto una volta (Fine o Salta) non torna: si ricorda nelle preferenze del
// profilo (`avvisi.tutorial`), così vale su ogni telefono. Si riapre da
// Altro → "Guida all'app" (`apriTutorial`).
//
// La spiegazione è una scheda bassa appena sopra la barra, su un velo
// leggero: la pagina si deve VEDERE. La sua altezza (--tutorial-alto) alza
// il fondo delle pagine e il "+", così scorrendo niente le resta sotto. La
// pagina scorre ma non si tocca (i tocchi fuori dalla scheda si fermano
// qui). La barra sta sopra il velo; la linguetta di turno si accende
// (index.css, body[data-tutorial]).
// ---------------------------------------------------------------------------

const EVENTO = 'palestra:tutorial'

// Da Altro: riapre il giro dall'inizio, dovunque sia montato.
export function apriTutorial() {
  window.dispatchEvent(new Event(EVENTO))
}

// `vai`: la sezione in cui entra il passo (il primo resta dov'è).
const passi = (modoPt) => [
  {
    id: 'via',
    titolo: 'Benvenuto in Progetto Palestra',
    testo:
      'Ti facciamo fare un giro veloce: cinque sezioni, e sai dove sta tutto. Se vuoi prima vedere l’app in movimento, guarda la presentazione.',
    video: true,
  },
  modoPt
    ? {
        id: 'inizio',
        vai: routes.inizio(),
        titolo: 'Home: il tuo lavoro',
        testo:
          'In modalità PT qui ci sono i tuoi atleti, le schede di lavoro e la vetrina. La tua foto in alto apre il profilo: lì torni ad allenarti come atleta.',
      }
    : {
        id: 'inizio',
        vai: routes.inizio(),
        titolo: 'Home',
        testo:
          'Si parte da qui: la settimana e l’allenamento di oggi. La tua foto in alto apre il profilo: dati fisici, PT, colori e account. Sei un personal trainer? Dal profilo attivi la modalità PT, e qui trovi i tuoi atleti.',
      },
  {
    id: 'allenamento',
    vai: routes.home(),
    titolo: 'Allenamento',
    testo:
      'Le tue schede, lo storico e il calendario. Col + incolli la scheda del tuo PT o ne crei una, e in palestra segui l’allenamento serie dopo serie.',
  },
  {
    id: 'dieta',
    vai: routes.dietaOggi(),
    titolo: 'Dieta',
    testo:
      'Il piano di oggi pasto per pasto, con calorie e macro. Carica il PDF del nutrizionista, fattela calcolare dai tuoi dati, o usala come semplice diario di quello che mangi.',
  },
  {
    id: 'social',
    vai: routes.feed(),
    titolo: 'Social',
    testo:
      'La parte social dell’app: qui incontri gli altri iscritti. Guardi gli allenamenti degli amici, lasci mi piace e commenti, scrivi in chat, cerchi persone nuove e vi scambiate le schede. Per uscire c’è Home, a sinistra.',
  },
  {
    id: 'altro',
    vai: routes.altro(),
    titolo: 'Altro',
    testo:
      'Le funzioni in più, come gli esercizi in 3D e le schede degli altri iscritti. E questa guida, col video: la riapri da qui quando vuoi.',
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
  // Dove si era quando il giro è partito: ci si torna alla fine.
  const partenza = useRef(window.location.pathname)
  const passo = elenco[n]
  const ultimo = n === elenco.length - 1
  const sezione = passo.video ? null : passo.id

  // Si entra nella sezione del passo, come toccandone la linguetta.
  useEffect(() => {
    vaiASezione(passo.vai || partenza.current)
  }, [passo.vai])

  // La linguetta di turno, accesa dal CSS.
  useEffect(() => {
    document.body.classList.add('tutorial-aperto')
    return () => {
      document.body.classList.remove('tutorial-aperto')
      delete document.body.dataset.tutorial
      document.body.style.removeProperty('--tutorial-alto')
    }
  }, [])
  // Si scorre, ma non si tocca niente fuori dalla scheda e dal video: il
  // giro non deve finire in un'altra pagina per un tocco distratto.
  useEffect(() => {
    const ferma = (e) => {
      if (e.target.closest?.('.tutorial-scheda, .benv-lettore')) return
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('click', ferma, true)
    return () => document.removeEventListener('click', ferma, true)
  }, [])
  // Quanto è alta la scheda: le pagine lasciano altrettanto spazio in fondo.
  useLayoutEffect(() => {
    const el = scheda.current
    if (!el) return undefined
    const misura = () => document.body.style.setProperty('--tutorial-alto', el.offsetHeight + 'px')
    misura()
    if (typeof ResizeObserver === 'undefined') return undefined
    const oss = new ResizeObserver(misura)
    oss.observe(el)
    return () => oss.disconnect()
  }, [n])
  useEffect(() => {
    if (sezione) document.body.dataset.tutorial = sezione
    else delete document.body.dataset.tutorial
    avanti.current?.focus()
  }, [sezione])

  // La punta sotto la scheda va sopra la linguetta: si misura, perché la
  // barra è larga al massimo 420px e centrata, la scheda no. Di nuovo quando
  // la pagina è cambiata: entrando in Social la barra cambia voci, e le voci
  // nuove entrano animate (di qui la seconda misura, a animazione finita).
  const rotta = useRoute().name
  useLayoutEffect(() => {
    const misura = () => {
      const voce = sezione && document.querySelector(`.barra-voce[data-sezione="${sezione}"]`)
      const box = scheda.current?.getBoundingClientRect()
      if (!voce || !box) return setFreccia(null)
      const v = voce.getBoundingClientRect()
      setFreccia(v.left + v.width / 2 - box.left)
    }
    misura()
    const dopo = setTimeout(misura, 500)
    window.addEventListener('resize', misura)
    return () => {
      clearTimeout(dopo)
      window.removeEventListener('resize', misura)
    }
  }, [sezione, rotta])

  const chiudi = () => {
    vaiASezione(partenza.current)
    onChiudi()
  }
  const vai = (d) => (n + d >= elenco.length ? chiudi() : setN(Math.max(0, n + d)))

  useEffect(() => {
    // Col video aperto Esc chiude il video (LettoreTrailer), non il giro.
    if (trailer) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') chiudi()
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
          <button className="btn btn-ghost btn-sm" onClick={chiudi}>
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
