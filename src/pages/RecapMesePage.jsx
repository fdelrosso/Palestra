import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { stileFondo } from '../lib/recap'
import { DURATA_SLIDE, avanzaStoria, meseDaPercorso, meseFinito, recapDelMese, slideDelMese, storiaIniziale } from '../lib/recapMese'
import { disegnaRecapMese, nomeFileMese } from '../lib/recapMeseImmagine'
import { caricaAvatar, caricaImmagineDaUrl, condividiImmagine } from '../lib/recapImmagine'
import { useCorpoPronto } from '../lib/corpoImmagini'
import SlideRecapMese from '../components/SlideRecapMese'
import { IconClose } from '../components/icons'

// ---------------------------------------------------------------------------
// Il RECAP DEL MESE come una storia (spec 2026-10-28): barrette in alto, ~6"
// a slide, tocco a destra avanti e a sinistra indietro, tenere premuto mette
// in pausa. È una PAGINA (/recap-mese/AAAA-MM) e non una finestra: indietro,
// anche quello di Android (lib/nativo), la chiude da solo.
// Si apre un mese finito con almeno un allenamento; quello in corso solo in
// locale, per provarlo. Le regole della storia stanno in lib/recapMese.
// ---------------------------------------------------------------------------

const fermo = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RecapMesePage({ periodo: testo }) {
  const { schede } = useStore()
  const { utenteCorrente } = useAccount()
  const r = useMemo(() => {
    const periodo = meseDaPercorso(testo)
    if (!periodo || !(meseFinito(periodo) || import.meta.env.DEV)) return null
    const voci = [...raccogliCompletamenti(schede).values()].flat()
    return recapDelMese(voci, periodo, { schede })
  }, [schede, testo])

  useEffect(() => {
    if (!r) navigate(routes.calendario(), { sostituisci: true })
  }, [r])
  if (!r) return null

  const slide = slideDelMese(r)
  const nome = utenteCorrente?.username || utenteCorrente?.nome || ''
  // `key`: se cambiano le slide (dati riletti) la storia riparte giusta.
  return <Storia key={slide.join()} r={r} slide={slide} nome={nome} ioId={utenteCorrente?.id || null} />
}

function Storia({ r, slide, nome, ioId }) {
  const [s, manda] = useReducer(avanzaStoria, slide.length, storiaIniziale)
  const id = slide[s.indice]

  // Il tempo passato davvero: barretta e slide non si sfasano. In secondo
  // piano (altra app, altra scheda) si ferma.
  useEffect(() => {
    if (fermo()) return
    let ultimo = performance.now()
    let giro = requestAnimationFrame(function passo(t) {
      manda({ tipo: 'tempo', ms: t - ultimo })
      ultimo = t
      giro = requestAnimationFrame(passo)
    })
    const vista = () => {
      ultimo = performance.now()
      manda({ tipo: document.hidden ? 'pausa' : 'riprendi' })
    }
    document.addEventListener('visibilitychange', vista)
    return () => {
      cancelAnimationFrame(giro)
      document.removeEventListener('visibilitychange', vista)
    }
  }, [])

  const chiudi = () => (window.history.length > 1 ? window.history.back() : navigate(routes.calendario()))

  useEffect(() => {
    const tasto = (e) => {
      if (e.key === 'ArrowRight') manda({ tipo: 'avanti' })
      else if (e.key === 'ArrowLeft') manda({ tipo: 'indietro' })
      else if (e.key === ' ') {
        e.preventDefault()
        manda({ tipo: s.inPausa ? 'riprendi' : 'pausa' })
      } else if (e.key === 'Escape') chiudi()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  })

  // Tenere premuto = pausa; un tocco breve = avanti (terzo destro) o
  // indietro (terzo sinistro).
  const premuto = useRef(null)
  const giu = () => {
    const p = { tenuto: false }
    p.timer = setTimeout(() => {
      p.tenuto = true
      manda({ tipo: 'pausa' })
    }, 200)
    premuto.current = p
  }
  const su = (e) => {
    const p = premuto.current
    premuto.current = null
    if (!p) return
    clearTimeout(p.timer)
    if (p.tenuto) return manda({ tipo: 'riprendi' })
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - left) / width
    if (x < 1 / 3) manda({ tipo: 'indietro' })
    else if (x > 2 / 3) manda({ tipo: 'avanti' })
  }
  const via = () => {
    const p = premuto.current
    premuto.current = null
    if (p) clearTimeout(p.timer)
    if (p?.tenuto) manda({ tipo: 'riprendi' })
  }

  return (
    <div className="rm-pagina" style={stileFondo(r.gruppi) || undefined}>
      <div className="rm-storia">
        <div className="rm-barrette" aria-label={`Slide ${s.indice + 1} di ${slide.length}`}>
          {slide.map((x, i) => (
            <span key={x} className="rm-barretta">
              <span style={{ width: `${i < s.indice ? 100 : i > s.indice ? 0 : (s.trascorso / DURATA_SLIDE) * 100}%` }} />
            </span>
          ))}
        </div>
        <button type="button" className="rm-chiudi" aria-label="Chiudi il recap" onClick={chiudi}>
          <IconClose width={20} height={20} />
        </button>
        <section
          key={id}
          className={'rm-slide' + (fermo() ? ' rm-ferma' : '')}
          aria-live="polite"
          onPointerDown={giu}
          onPointerUp={su}
          onPointerCancel={via}
          onPointerLeave={via}
        >
          <SlideRecapMese
            id={id}
            r={r}
            nome={nome}
            riepilogo={id === 'riepilogo' ? <Riepilogo r={r} nome={nome} ioId={ioId} onRivedi={() => manda({ tipo: 'rivedi' })} /> : null}
          />
        </section>
      </div>
    </div>
  )
}

// L'ultima slide: la card (lo stesso PNG che si condivide) e i tasti. I tocchi
// qui non devono muovere la storia: si fermano prima di arrivare alla slide.
function Riepilogo({ r, nome, ioId, onRivedi }) {
  const [avatar, setAvatar] = useState(null)
  const [copertina, setCopertina] = useState(null)
  const [esito, setEsito] = useState('')
  const corpoPronto = useCorpoPronto(undefined)
  useEffect(() => {
    let vivo = true
    caricaAvatar(ioId).then((img) => vivo && setAvatar(img))
    if (r.musica?.copertina) caricaImmagineDaUrl(r.musica.copertina).then((img) => vivo && setCopertina(img)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [ioId, r.musica?.copertina])
  // corpoPronto fra le dipendenze: arrivate le immagini del corpo si ridisegna.
  const canvas = useMemo(() => disegnaRecapMese(r, { nome, avatar, copertina }), [r, nome, avatar, copertina, corpoPronto])
  const url = useMemo(() => canvas.toDataURL('image/png'), [canvas])
  const puoCondividere = typeof navigator !== 'undefined' && !!navigator.canShare

  const condividi = async () => {
    const e = await condividiImmagine(canvas, { nomeFile: nomeFileMese(r), titolo: `Il mio ${r.nomeMese}` })
    setEsito(e === 'condiviso' ? 'Condiviso!' : e === 'salvato' ? 'Immagine salvata' : e === 'errore' ? 'Condivisione non riuscita.' : '')
  }
  const ferma = (e) => e.stopPropagation()

  return (
    <div className="rm-riepilogo" onPointerDown={ferma} onPointerUp={ferma}>
      <img className="rm-card" src={url} alt={`Il recap di ${r.nomeMese} ${r.anno}`} />
      <div className="rm-tasti">
        <button type="button" className="btn btn-accent" onClick={condividi}>
          {puoCondividere ? 'Condividi' : 'Scarica'}
        </button>
        <button type="button" className="btn" onClick={onRivedi}>
          Rivedi
        </button>
      </div>
      {esito && <p className="rm-sotto">{esito}</p>}
    </div>
  )
}
