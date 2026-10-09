import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.png'
import CorpoAllenato from './CorpoAllenato'
import { LinkLegali } from './Legale'
import { IconChevron, IconClose, IconPlus } from './icons'

// ---------------------------------------------------------------------------
// Il BENVENUTO: la prima cosa che vede chi non è ancora entrato.
//
// In cima un HERO a tutto schermo, sempre scuro: il logo grande col suo
// battito — una linea PIATTA attraversa lo schermo all'altezza del manubrio,
// un impulso di luce ci corre sopra, entra nel logo (dove la linea diventa
// l'onda del disegno), il logo batte, e l'impulso riesce dall'altra parte —
// poi il nome, la frase, lo slogan e i due tasti.
//
// Sotto, per chi scorre, l'app raccontata in cinque riquadri. Ognuno ha un
// piccolo schermo finto che si anima quando entra in vista (un timer che
// scende, i muscoli che si accendono, i macro che si riempiono): si capisce
// cosa fa l'app guardandola fare, non leggendo un elenco. In fondo, di nuovo
// i due tasti.
//
// ACCEDI e CREA non cambiano pagina: UserGate passa il form come `pannello`,
// che prende il posto dei due tasti. Intanto il hero si stringe (via lo slogan,
// logo più piccolo) e il racconto sotto sparisce: si è lì per entrare.
//
// ⚠️ Niente qui legge dati: è una pagina per chi non ha un account. Il corpo
// è quello vero (components/CorpoAllenato) con un allenamento di esempio.
//
// ⚠️ Con "riduci movimento" attivo sul telefono le animazioni si fermano e
// i riquadri sono subito visibili (vedi index.css, .benv).
// ---------------------------------------------------------------------------

const GIORNO_ESEMPIO = [
  { id: 'petto', serie: 9 },
  { id: 'tricipiti', serie: 6 },
  { id: 'spalle', serie: 4 },
]

const RACCONTO = [
  {
    id: 'scheda',
    kicker: 'Allenamento',
    titolo: 'La tua scheda, serie dopo serie',
    testo:
      'Importa la scheda del tuo PT incollando il testo, o creala tu. In palestra segui ogni serie, segna lo sforzo e lascia il recupero al timer.',
  },
  {
    id: 'corpo',
    kicker: 'Recap',
    titolo: 'Vedi dove hai lavorato',
    testo:
      'A fine allenamento il corpo si accende sui muscoli che hai allenato. A colpo d’occhio capisci se stai trascurando qualcosa.',
  },
  {
    id: 'dieta',
    kicker: 'Dieta',
    titolo: 'Dal PDF del nutrizionista al piatto',
    testo:
      'Carica la dieta o fattela calcolare dai tuoi dati. Ogni giorno vedi calorie e macro riempirsi pasto dopo pasto.',
  },
  {
    id: 'social',
    kicker: 'Social',
    titolo: 'Allenati in compagnia',
    testo:
      'Segui gli allenamenti degli amici, lascia un mi piace o un commento, scambiatevi schede e messaggi.',
  },
  {
    id: 'pt',
    kicker: 'Personal trainer',
    titolo: 'Il tuo PT, sempre aggiornato',
    testo:
      'Collegati al tuo personal trainer con un codice: vede i tuoi allenamenti e i tuoi progressi, solo quelli che decidi tu.',
  },
]

// Lo schermo finto di ogni riquadro. Solo forme e CSS: le animazioni partono
// quando il riquadro riceve `.visibile`.
function Schermo({ id }) {
  if (id === 'scheda') {
    return (
      <div className="benv-schermo benv-timer">
        <div className="benv-timer-anello">
          <span>1:30</span>
        </div>
        <div className="benv-serie">
          {['verde', 'verde', 'giallo', 'rosso'].map((c, i) => (
            <span key={i} className={'benv-serie-dot ' + c} style={{ '--i': i }} />
          ))}
        </div>
        <div className="benv-riga">Panca piana · 4 × 8 · 70 kg</div>
      </div>
    )
  }
  if (id === 'corpo') {
    return (
      <div className="benv-schermo benv-corpo">
        <CorpoAllenato gruppi={GIORNO_ESEMPIO} />
      </div>
    )
  }
  if (id === 'dieta') {
    return (
      <div className="benv-schermo benv-dieta">
        <div className="benv-kcal">
          <span>1.840</span>
          <small>/ 2.400 kcal</small>
        </div>
        {[
          ['Proteine', 78],
          ['Carboidrati', 64],
          ['Grassi', 52],
        ].map(([nome, q], i) => (
          <div key={nome} className="benv-macro">
            <span>{nome}</span>
            <span className="benv-macro-pista">
              <span style={{ '--q': q + '%', '--i': i }} />
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (id === 'social') {
    return (
      <div className="benv-schermo benv-social">
        {[
          ['G', 'Giulia', 'Gambe · 18 serie'],
          ['L', 'Luca', 'Push · 1 h 05 min'],
        ].map(([ini, nome, cosa], i) => (
          <div key={nome} className="benv-post" style={{ '--i': i }}>
            <span className="benv-avatar">{ini}</span>
            <span className="grow">
              <strong>{nome}</strong>
              <small>{cosa}</small>
            </span>
            <span className="benv-cuore" aria-hidden="true">
              ♥
            </span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="benv-schermo benv-pt">
      <small>Il codice del tuo PT</small>
      <div className="benv-codice">
        {'MARCO7K'.split('').map((c, i) => (
          <span key={i} style={{ '--i': i }}>
            {c}
          </span>
        ))}
      </div>
      <div className="benv-collegato">✓ Collegato</div>
    </div>
  )
}

// La presentazione dell'app (public/trailer-palestra.mp4). Sta in public e non
// in src/assets: è grossa, non deve passare dal bundle né dalla precache del
// service worker (che prende solo js, css e html). L'anteprima è il video
// stesso fermo a un secondo (`#t=1`): nessuna immagine in più da tenere in pari.
const TRAILER = '/trailer-palestra.mp4'

function durata(s) {
  if (!Number.isFinite(s)) return ''
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

function AnteprimaTrailer({ className, onApri }) {
  const [dura, setDura] = useState('')
  return (
    <div className={'benv-trailer ' + className}>
      <button className="benv-trailer-quadro" onClick={onApri} aria-label="Guarda la presentazione">
        <video
          src={`${TRAILER}#t=1`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
          onLoadedMetadata={(e) => setDura(durata(e.currentTarget.duration))}
        />
        <span className="benv-trailer-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
        </span>
        {dura && <span className="benv-trailer-durata">{dura}</span>}
      </button>
      <span className="benv-trailer-etichetta">Guarda la presentazione</span>
    </div>
  )
}

function LettoreTrailer({ onChiudi }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])
  return (
    <div className="benv-lettore" role="dialog" aria-label="Presentazione" onClick={onChiudi}>
      <button className="icon-btn benv-lettore-chiudi" aria-label="Chiudi" onClick={onChiudi}>
        <IconClose />
      </button>
      <video src={TRAILER} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

export default function Benvenuto({ onAccedi, onCrea, pannello }) {
  const [trailer, setTrailer] = useState(false)
  const radice = useRef(null)
  const aperto = !!pannello

  // I riquadri si animano quando entrano in vista, una volta sola.
  useEffect(() => {
    const el = radice.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.querySelectorAll('.benv-capitolo').forEach((c) => c.classList.add('visibile'))
      return undefined
    }
    const oss = new IntersectionObserver(
      (voci) =>
        voci.forEach((v) => {
          if (!v.isIntersecting) return
          v.target.classList.add('visibile')
          oss.unobserve(v.target)
        }),
      { threshold: 0.35 },
    )
    el.querySelectorAll('.benv-capitolo').forEach((c) => oss.observe(c))
    return () => oss.disconnect()
  }, [aperto])

  const scopri = () =>
    radice.current?.querySelector('.benv-racconto')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className={'benv' + (aperto ? ' aperto' : '')} ref={radice}>
      {/* Su schermo largo in alto a sinistra, accanto alla colonna; su
          telefono il logo occupa la larghezza, e l'anteprima scende sotto i
          tasti (l'altra copia, qui sotto). Il CSS ne mostra una sola. */}
      <AnteprimaTrailer className="benv-trailer-lato" onApri={() => setTrailer(true)} />
      {trailer && <LettoreTrailer onChiudi={() => setTrailer(false)} />}
      <section className="benv-hero">
        <div className="benv-luce" aria-hidden="true" />

        <div className="benv-logo">
          <span className="benv-linea" aria-hidden="true" />
          <img src={logo} alt="" />
        </div>

        <h1 className="benv-nome">
          Progetto<span>Palestra</span>
        </h1>
        <p className="benv-frase">Il fitness a un click.</p>
        <span className="benv-filo" aria-hidden="true" />
        <p className="benv-slogan">
          Dalla scheda del tuo PT al piatto di stasera: segui ogni serie, ogni pasto, ogni
          progresso.
        </p>

        {pannello || (
          <>
            <div className="benv-tasti">
              <button className="btn btn-accent btn-lg btn-block" onClick={onAccedi}>
                Accedi
              </button>
              <button className="btn btn-lg btn-block" onClick={onCrea}>
                <IconPlus width={18} height={18} /> Crea un account
              </button>
            </div>

            <button className="benv-scopri" onClick={scopri}>
              Scopri l’app
              <IconChevron width={18} height={18} style={{ transform: 'rotate(90deg)' }} />
            </button>

            <AnteprimaTrailer className="benv-trailer-flusso" onApri={() => setTrailer(true)} />
          </>
        )}
      </section>

      {!aperto && (
        <section className="benv-racconto" aria-label="Cosa fa l’app">
          {RACCONTO.map((r, i) => (
            <article key={r.id} className={'benv-capitolo' + (i % 2 ? ' destra' : '')}>
              <Schermo id={r.id} />
              <div className="benv-testo">
                <span className="benv-kicker">{r.kicker}</span>
                <h2>{r.titolo}</h2>
                <p>{r.testo}</p>
              </div>
            </article>
          ))}

          <div className="benv-fine">
            <h2>Pronto a cominciare?</h2>
            <p>
              Ogni account è protetto da password. Chi usa l’app sul tuo stesso telefono non vede i
              tuoi dati, né sa che il tuo profilo esiste.
            </p>
            <button className="btn btn-accent btn-lg btn-block" onClick={onCrea}>
              Crea un account
            </button>
            <button className="btn btn-lg btn-block" onClick={onAccedi}>
              Ho già un account
            </button>
            <LinkLegali />
          </div>
        </section>
      )}
    </div>
  )
}
