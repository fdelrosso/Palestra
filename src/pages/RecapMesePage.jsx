import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import { raccogliCompletamenti } from '../lib/oggi'
import { stileFondo } from '../lib/recap'
import { DURATA_SLIDE, avanzaStoria, meseDaPercorso, meseFinito, recapDelMese, slideDelMese, storiaIniziale } from '../lib/recapMese'
import { disegnaRecapMese, nomeFileMese } from '../lib/recapMeseImmagine'
import { caricaAvatar, caricaImmagineDaUrl, condividiImmagine } from '../lib/recapImmagine'
import { useCorpo, useCorpoPronto } from '../lib/corpoImmagini'
import SlideRecapMese from '../components/SlideRecapMese'
import { IconClose, IconPausa, IconPlay } from '../components/icons'
import { VISIBILITA_FOTO_ALL, chiaveAllenamento, fotoDiAllenamenti, urlFeed } from '../lib/fotoAllenamento'
import { leggiInterazioni } from '../lib/interazioni'

// ---------------------------------------------------------------------------
// Il RECAP DEL MESE come una storia (spec 2026-10-28): barrette in alto, ~6"
// a slide, tocco a destra avanti e a sinistra indietro, tenere premuto mette
// in pausa. È una PAGINA (/recap-mese/AAAA-MM) e non una finestra: indietro,
// anche quello di Android (lib/nativo), la chiude da solo.
// Si apre un mese finito con almeno un allenamento; quello in corso solo in
// locale, per provarlo. Le regole della storia stanno in lib/recapMese.
// ---------------------------------------------------------------------------

// Cosa annuncia lo screen reader a ogni slide, oltre al numero.
const NOMI = {
  mese: 'il tuo mese',
  foto: 'le foto del mese',
  fatica: 'il tempo e il peso sollevato',
  stile: 'il muscolo del mese e le abitudini',
  sforzo: 'lo sforzo',
  canzoni: 'le canzoni',
  record: 'i record',
  riepilogo: 'la card da condividere',
}

// Le foto PUBBLICATE del mese, al massimo FOTO_MESE: una per allenamento,
// dagli allenamenti con più mi piace e commenti (a pari merito il più
// recente); se gli allenamenti con foto sono meno, le altre foto dei primi.
// La loro copia da feed, pubblica, si legge senza link firmato e si può
// disegnare nella card. Le private non escono dal telefono di nessuno.
// Al massimo 3", poi la storia parte senza: un mese senza rete non aspetta.
// Fino a sei: tre per la slide delle foto (SlideRecapMese), tutte per lo
// sfondo della card.
const FOTO_MESE = 6
function scegliFoto(voci, per, interazioni) {
  const allenamenti = voci
    .map((v) => {
      const k = chiaveAllenamento(v)
      const i = interazioni[k] || { miPiace: 0, commenti: 0 }
      const righe = (per[k] || []).filter((x) => x.visibilita === VISIBILITA_FOTO_ALL.PUBBLICA && !x.soloLocale)
      return { v, righe, miPiace: i.miPiace, commenti: i.commenti }
    })
    .filter((a) => a.righe.length)
    .sort((a, b) => b.miPiace + b.commenti - (a.miPiace + a.commenti) || (a.v.data < b.v.data ? 1 : -1))
  const giri = Math.max(0, ...allenamenti.map((a) => a.righe.length))
  const scelte = []
  for (let g = 0; g < giri && scelte.length < FOTO_MESE; g++) {
    for (const a of allenamenti) {
      if (scelte.length >= FOTO_MESE) break
      const x = a.righe[g]
      if (x) scelte.push({ id: x.id, url: urlFeed(x.percorso), video: x.tipo === 'video', data: a.v.data, miPiace: a.miPiace, commenti: a.commenti })
    }
  }
  return scelte
}

function useFotoDelMese(voci) {
  const [foto, setFoto] = useState(null)
  useEffect(() => {
    if (!voci?.length) return undefined
    let vivo = true
    const basta = setTimeout(() => vivo && setFoto((f) => f || []), 3000)
    const chiavi = voci.map(chiaveAllenamento)
    Promise.all([fotoDiAllenamenti(chiavi), leggiInterazioni(chiavi)]).then(([per, interazioni]) => {
      if (vivo) setFoto(scegliFoto(voci, per, interazioni))
    })
    return () => {
      vivo = false
      clearTimeout(basta)
    }
  }, [voci])
  return voci?.length ? foto : []
}

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

  const foto = useFotoDelMese(r?.voci)

  useEffect(() => {
    if (!r) navigate(routes.calendario(), { sostituisci: true })
  }, [r])
  // Finché non si sa se ci sono foto, la storia non parte: se no la slide
  // delle foto arriverebbe dopo e la farebbe ricominciare.
  if (!r || !foto) return r ? <div className="rm-pagina" /> : null

  const slide = slideDelMese(r, { foto })
  const nome = utenteCorrente?.username ? `@${utenteCorrente.username}` : utenteCorrente?.nome || ''
  // `key`: se cambiano le slide (dati riletti) la storia riparte giusta.
  return <Storia key={slide.join()} r={r} foto={foto} slide={slide} nome={nome} ioId={utenteCorrente?.id || null} />
}

function Storia({ r, foto, slide, nome, ioId }) {
  const [s, manda] = useReducer(avanzaStoria, slide.length, storiaIniziale)
  const id = slide[s.indice]
  const [ferma] = useState(fermo) // una volta per apertura

  // Il tempo passato davvero: barretta e slide non si sfasano. In secondo
  // piano (altra app, altra scheda) si ferma.
  useEffect(() => {
    if (ferma) return
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
  }, [ferma])

  const chiudi = () => goBack(routes.calendario())
  const rivedi = useCallback(() => manda({ tipo: 'rivedi' }), [])

  useEffect(() => {
    const tasto = (e) => {
      if (e.key === 'ArrowRight') manda({ tipo: 'avanti' })
      else if (e.key === 'ArrowLeft') manda({ tipo: 'indietro' })
      else if (e.key === ' ') {
        e.preventDefault()
        manda({ tipo: 'fermaRiparti' })
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
    // Il centro (dove cade anche il doppio tocco di VoiceOver): pausa e via.
    else if (!ferma) manda({ tipo: 'fermaRiparti' })
  }
  const via = () => {
    const p = premuto.current
    premuto.current = null
    if (p) clearTimeout(p.timer)
    if (p?.tenuto) manda({ tipo: 'riprendi' })
  }

  return (
    <div className="rm-pagina">
      <div className="rm-storia">
        {/* Lo strato del fondo come quello del feed (.post-fondo, più grande
            della storia): le luci dei muscoli cadono dove le ha pensate. */}
        <div className="rm-fondo" style={stileFondo(r.gruppi) || undefined} aria-hidden="true" />
        <FondoSlide key={id} id={id} r={r} foto={foto} />
        <p className="rm-solo-voce" aria-live="polite">{`Slide ${s.indice + 1} di ${slide.length}: ${NOMI[id] || ''}`}</p>
        <div className="rm-barrette" aria-hidden="true">
          {slide.map((x, i) => (
            <span key={x} className="rm-barretta">
              <span style={{ width: `${i < s.indice ? 100 : i > s.indice ? 0 : (s.trascorso / DURATA_SLIDE) * 100}%` }} />
            </span>
          ))}
        </div>
        {!ferma && (
          <button
            type="button"
            className="rm-chiudi rm-pausa"
            aria-label={s.ferma ? 'Riprendi' : 'Metti in pausa'}
            aria-pressed={s.ferma}
            onClick={() => manda({ tipo: 'fermaRiparti' })}
          >
            {s.ferma ? <IconPlay width={20} height={20} /> : <IconPausa width={20} height={20} />}
          </button>
        )}
        <button type="button" className="rm-chiudi" aria-label="Chiudi il recap" onClick={chiudi}>
          <IconClose width={20} height={20} />
        </button>
        <section
          key={id}
          className="rm-slide"
          onPointerDown={giu}
          onPointerUp={su}
          onPointerCancel={via}
          onPointerLeave={via}
        >
          <SlideRecapMese
            id={id}
            r={r}
            foto={foto}
            nome={nome}
            riepilogo={id === 'riepilogo' ? <Riepilogo r={r} foto={foto} nome={nome} ioId={ioId} onRivedi={rivedi} /> : null}
          />
        </section>
      </div>
    </div>
  )
}

// IL FONDO DI OGNI SLIDE, sopra quello dei muscoli (che resta per la card):
// ogni slide ha il colore di quello che racconta. Il mese l'accento scelto,
// la fatica il caldo, lo stile il colore del muscolo, lo sforzo i SUOI pallini
// nelle loro proporzioni, i record l'oro; foto e canzoni la loro immagine,
// sfocata. Arriva in dissolvenza e respira piano (fermo con "riduci movimento").
const luci = (base, ...l) => [...l.map(([c, x, y, a = 60]) => `radial-gradient(${a}% ${a * 0.8}% at ${x}% ${y}%, ${c}, transparent 70%)`), base].join(', ')
function fondoDi(id, r, foto) {
  switch (id) {
    case 'mese':
      return { background: luci('#06121c', ['color-mix(in srgb, var(--accent) 75%, transparent)', 85, 12], ['color-mix(in srgb, var(--accent) 35%, transparent)', 5, 90, 55]) }
    case 'foto':
      return foto[0] ? { immagine: foto[0].url } : null
    case 'fatica':
      return { background: luci('#1a0a0c', ['rgba(249, 115, 22, 0.75)', 85, 15], ['rgba(225, 29, 72, 0.6)', 10, 88, 65]) }
    case 'stile': {
      // Il colore del muscolo del mese, come il suo nome.
      const c = r.gruppi[0]?.colore
      return c
        ? { background: luci('#0b0d10', [`color-mix(in srgb, ${c} 60%, transparent)`, 82, 14], [`color-mix(in srgb, ${c} 30%, transparent)`, 8, 90, 55]) }
        : null
    }
    case 'sforzo': {
      // Una luce per colore, grande quanto la sua parte delle serie.
      const { verde, giallo, rosso, tot } = r.sforzo
      const ampia = (n) => 28 + (n / tot) * 70
      return {
        background: luci(
          '#0b0d10',
          ['rgba(52, 211, 153, 0.55)', 12, 14, ampia(verde)],
          ['rgba(245, 197, 66, 0.5)', 92, 48, ampia(giallo)],
          ['rgba(242, 109, 109, 0.55)', 28, 94, ampia(rosso)],
        ),
      }
    }
    case 'canzoni':
      return r.canzoni[0]?.musica.copertina ? { immagine: r.canzoni[0].musica.copertina } : null
    case 'record':
      return { background: luci('#160f04', ['rgba(245, 197, 66, 0.7)', 80, 14], ['rgba(180, 83, 9, 0.65)', 12, 86, 65]) }
    default:
      return null
  }
}

function FondoSlide({ id, r, foto }) {
  const f = fondoDi(id, r, foto)
  if (!f) return null
  return (
    <div className={'rm-fondo-slide' + (f.immagine ? ' immagine' : '')} aria-hidden="true">
      <div className="rm-fondo-tela" style={f.immagine ? { backgroundImage: `url("${f.immagine}")` } : { background: f.background }} />
    </div>
  )
}

// L'ultima slide: la card (lo stesso PNG che si condivide) e i tasti. I tocchi
// qui non devono muovere la storia: si fermano prima di arrivare alla slide.
function Riepilogo({ r, foto, nome, ioId, onRivedi }) {
  const [avatar, setAvatar] = useState(null)
  const [copertine, setCopertine] = useState([])
  const [immagini, setImmagini] = useState([])
  // Il condensato dei titoli: il canvas non aspetta i font, si ridisegna quando ci sono.
  const [fonti, setFonti] = useState(false)
  useEffect(() => {
    let vivo = true
    Promise.all(["800 40px 'Recap Condensato'", "700 40px 'Recap Condensato'"].map((f) => document.fonts?.load(f)))
      .catch(() => {})
      .then(() => vivo && setFonti(true))
    return () => {
      vivo = false
    }
  }, [])
  const [esito, setEsito] = useState('')
  const corpo = useCorpo()
  const corpoPronto = useCorpoPronto(corpo)
  useEffect(() => {
    let vivo = true
    caricaAvatar(ioId).then((img) => vivo && setAvatar(img))
    // Le copertine delle canzoni della pila (le prime tre); quella che non si legge resta senza.
    Promise.all(r.canzoni.slice(0, 3).map((c) => (c.musica.copertina ? caricaImmagineDaUrl(c.musica.copertina).catch(() => null) : null))).then(
      (imgs) => vivo && setCopertine(imgs),
    )
    // Le foto pubblicate, per lo sfondo della card: quelle che non si leggono restano fuori.
    Promise.all(foto.map((f) => caricaImmagineDaUrl(f.url).catch(() => null))).then(
      (imgs) => vivo && setImmagini(imgs.filter(Boolean)),
    )
    return () => {
      vivo = false
    }
  }, [ioId, r.canzoni, foto])
  // corpoPronto fra le dipendenze: arrivate le immagini del corpo si ridisegna.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- corpoPronto: ridisegna quando arrivano le immagini
  const canvas = useMemo(() => disegnaRecapMese(r, { nome, avatar, copertine, corpo, foto: immagini }), [r, nome, avatar, copertine, corpo, corpoPronto, immagini, fonti])
  const url = useMemo(() => canvas.toDataURL('image/png'), [canvas])
  const puoCondividere = typeof navigator !== 'undefined' && !!navigator.canShare

  const condividi = async () => {
    const e = await condividiImmagine(canvas, { nomeFile: nomeFileMese(r), titolo: `Il mio ${r.nomeMese}` })
    setEsito(e === 'condiviso' ? 'Condiviso!' : e === 'salvato' ? 'Immagine salvata' : e === 'errore' ? 'Non è partita: riprova, o tieni premuta la card per salvarla.' : '')
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
