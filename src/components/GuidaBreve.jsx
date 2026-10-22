import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { goBack, navigate } from '../lib/router'
import { chiaveGuida, guida, guidaDellaRotta } from '../lib/guide'
import { useSchedaSopraBarra } from './Tutorial'
import ScenaGuida from './ScenaGuida'

// ---------------------------------------------------------------------------
// Una MINI-GUIDA (lib/guide) a schermo: la stessa scheda del giro generale
// (components/Tutorial), appena sopra la barra. Non racconta e basta: FA
// VEDERE.
//   - Ogni passo può puntare un pezzo vero della pagina (`punta`): la pagina
//     scorre fin lì, il resto si scurisce e il pezzo resta acceso dentro un
//     anello (il FARO). Se la scheda lo coprirebbe, la scheda sale in cima.
//   - Le cose che non si possono aprire per finta (un allenamento in corso,
//     il recap appena fatto) hanno una piccola scena animata nella scheda
//     (`scena`, components/ScenaGuida).
//   - Aperta da Guida all'app (`daGuida`), porta prima nella pagina che
//     spiega (`apri` della guida) e alla fine torna indietro.
//
// Chi decide quale mostrare è `useGuidaPrimaVolta` (in App): la guida della
// pagina in cui si è entrati, o quella chiesta da un componente con
// `usePrimaVolta`, se non è ancora stata vista. Da Guida all'app ogni guida
// si riapre con `apriGuida(id)`, vista o no.
// ---------------------------------------------------------------------------

const EVENTO_APRI = 'palestra:guida'
const EVENTO_PRIMA = 'palestra:guida-prima'

// Da Guida all'app: mostra questa guida adesso.
export function apriGuida(id) {
  window.dispatchEvent(new CustomEvent(EVENTO_APRI, { detail: id }))
}

// Per le cose che non hanno una pagina loro (il recap di fine allenamento):
// finché il componente è montato e `attiva`, la sua guida passa davanti a
// quella della pagina.
export function usePrimaVolta(id, attiva = true) {
  useEffect(() => {
    if (!attiva) return undefined
    const manda = (su) => window.dispatchEvent(new CustomEvent(EVENTO_PRIMA, { detail: { id, su } }))
    manda(true)
    return () => manda(false)
  }, [id, attiva])
}

// Quale guida mostrare adesso, e come chiuderla. `bloccata`: c'è il giro
// generale (o non c'è la barra dove serviva): le guide aspettano. Si parte
// solo col giro già visto e le preferenze arrivate dal cloud, come il giro.
export function useGuidaPrimaVolta({ rotta, modoPt = false, bloccata = false }) {
  const { preferenze, aggiornaPreferenze, statoCloud } = useStore()
  const [forzata, setForzata] = useState(null)
  const [richieste, setRichieste] = useState([])
  // Chiuse in questa apertura dell'app: non tornano mentre il "vista" arriva
  // nelle preferenze.
  const [chiuse, setChiuse] = useState(() => new Set())

  useEffect(() => {
    const apri = (e) => setForzata(e.detail)
    const prima = (e) => {
      const { id, su } = e.detail
      setRichieste((r) => (su ? [...r.filter((x) => x !== id), id] : r.filter((x) => x !== id)))
    }
    window.addEventListener(EVENTO_APRI, apri)
    window.addEventListener(EVENTO_PRIMA, prima)
    return () => {
      window.removeEventListener(EVENTO_APRI, apri)
      window.removeEventListener(EVENTO_PRIMA, prima)
    }
  }, [])

  const avvisi = preferenze?.avvisi
  const candidata = richieste.length ? guida(richieste[richieste.length - 1]) : guidaDellaRotta(rotta, modoPt)
  const daVedere =
    !bloccata &&
    statoCloud !== 'caricamento' &&
    avvisi?.tutorial === 'visto' &&
    candidata &&
    avvisi[chiaveGuida(candidata.id)] !== 'vista' &&
    !chiuse.has(candidata.id)
  const mostrata = forzata ? guida(forzata) : daVedere ? candidata : null

  const chiudi = useCallback(() => {
    const id = mostrata?.id
    setForzata(null)
    if (!id) return
    setChiuse((c) => new Set(c).add(id))
    const chiave = chiaveGuida(id)
    if (avvisi?.[chiave] !== 'vista') aggiornaPreferenze((p) => ({ avvisi: { ...p.avvisi, [chiave]: 'vista' } }))
  }, [mostrata, avvisi, aggiornaPreferenze])

  // `daGuida`: aperta da Guida all'app, quindi porta nella sua pagina.
  return { guida: mostrata, daGuida: !!forzata, chiudi }
}

// Dove sta il pezzo di cui parla il passo. `punta` è un selettore CSS se
// comincia con . # [ o col nome di un campo (input, textarea…), altrimenti un
// testo che si legge a schermo: vince l'elemento più piccolo che lo contiene.
// Un contenitore alto più di mezzo schermo non vale: il testo che contiene
// sarà di un pezzo nascosto (un tasto che c'è solo in certi casi). Una scritta sola
// (un titolo, un'etichetta) si allarga alla sua card, se la card è di misura;
// un'etichetta si prende anche il campo che la segue.
const BLOCCO = '.card, .menu-voce, .choice-card, .field, .stat'
const CLICCABILI = 'button, a, input, textarea, select, [role="tab"]'

function visibile(el) {
  if (el.closest('.tutorial')) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && !coperto(el, r)
}

// Sotto un'altra finestra (un foglio aperto sopra la pagina): accenderlo
// farebbe un buco sul foglio, su un pezzo che non c'entra. Si guarda chi sta
// in cima al suo centro; fuori schermo, o sotto la barra o la guida, va bene.
function coperto(el, r) {
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false
  const sopra = document.elementFromPoint(x, y)
  if (!sopra || el.contains(sopra) || sopra.contains(el)) return false
  return !sopra.closest('.tutorial, .barra-basso')
}

function trova(punta) {
  if (!punta) return null
  // Più modi di dire la stessa cosa (un tasto che cambia nome): il primo che c'è.
  if (Array.isArray(punta)) {
    for (const p of punta) {
      const el = trova(p)
      if (el) return el
    }
    return null
  }
  if (/^([.#[]|(input|textarea|select|button)\b)/.test(punta)) {
    try {
      return [...document.querySelectorAll(punta)].find(visibile) || null
    } catch {
      return null
    }
  }
  const cerca = punta.toLowerCase()
  let meglio = null
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 6) continue
    const t = el.textContent.trim().toLowerCase()
    if (!t.includes(cerca) || !visibile(el)) continue
    if (el.getBoundingClientRect().height > window.innerHeight * 0.6) continue
    if (!meglio || t.length < meglio.textContent.trim().length || meglio.contains(el)) meglio = el
  }
  if (!meglio) return null
  const premibile = meglio.closest(CLICCABILI)
  if (premibile) return premibile
  const blocco = meglio.closest(BLOCCO)
  if (blocco && blocco.getBoundingClientRect().height < window.innerHeight * 0.45) return blocco
  return meglio
}

// Il rettangolo da accendere: l'elemento, più il campo che segue un'etichetta.
function rettangolo(el) {
  const r = el.getBoundingClientRect()
  const dopo = el.tagName === 'LABEL' ? el.nextElementSibling : null
  if (!dopo) return r
  const d = dopo.getBoundingClientRect()
  const top = Math.min(r.top, d.top)
  const left = Math.min(r.left, d.left)
  return { top, left, width: Math.max(r.right, d.right) - left, height: Math.max(r.bottom, d.bottom) - top }
}

// Il faro: segue il pezzo mentre il passo è aperto (la pagina può scorrere,
// un elenco può arrivare dalla rete), e se la scheda gli starebbe sopra la manda
// in cima. Senza pezzo (o non trovato) resta solo il velo leggero.
function useFaro(punta, faro, scheda) {
  const [acceso, setAcceso] = useState(false)
  useLayoutEffect(() => {
    let el = null
    let tentativi = 0
    const passo = () => {
      if (!el || !el.isConnected) {
        // Per tre secondi lo si aspetta (una pagina che arriva dalla rete),
        // poi il passo resta a parole.
        if (!punta || tentativi++ > 60) return setAcceso(false)
        el = trova(punta)
        if (el) {
          // Fin lì, lasciando sotto lo spazio per la scheda.
          el.scrollIntoView({ block: 'nearest' })
          const r = el.getBoundingClientRect()
          const sotto = window.innerHeight - (scheda.current?.offsetHeight || 0) - 120
          if (r.top < 90 || r.bottom > sotto) window.scrollBy({ top: r.top - 110, behavior: 'smooth' })
        } else return setAcceso(false)
      }
      if (el && faro.current && scheda.current) {
        const r = rettangolo(el)
        const f = faro.current.style
        f.top = r.top - 6 + 'px'
        f.left = r.left - 6 + 'px'
        f.width = r.width + 12 + 'px'
        f.height = r.height + 12 + 'px'
        setAcceso(true)
        const s = scheda.current
        const sopra = s.classList.contains('in-alto')
        const altezza = s.offsetHeight
        const fondo = window.innerHeight - altezza - 110
        // In cima quando il pezzo sta nella parte bassa e la scheda lo coprirebbe.
        if (!sopra && r.top + r.height > fondo && r.top > altezza + 40) s.classList.add('in-alto')
        else if (sopra && r.top < altezza + 40) s.classList.remove('in-alto')
      }
    }
    // Un colpo ogni 50 ms e a ogni scorrimento, non a ogni fotogramma: dove
    // i fotogrammi si fermano (pagina in secondo piano, telefono che
    // risparmia) il faro deve arrivare lo stesso. La transizione del CSS
    // ammorbidisce i salti.
    passo()
    const giro = setInterval(passo, 50)
    window.addEventListener('scroll', passo, true)
    return () => {
      clearInterval(giro)
      window.removeEventListener('scroll', passo, true)
    }
  }, [String(punta), faro, scheda]) // eslint-disable-line react-hooks/exhaustive-deps
  return acceso
}

// `conBarra`: la scheda sta sopra la barra in basso; senza (durante
// l'allenamento, in chat) scende in fondo allo schermo. `daGuida`: aperta da
// Guida all'app, quindi prima si va nella pagina che spiega.
export default function GuidaBreve({ guida: g, onChiudi, conBarra = true, daGuida = false }) {
  const { schede, diete } = useStore()
  const [n, setN] = useState(0)
  const scheda = useRef(null)
  const faro = useRef(null)
  const avanti = useRef(null)
  // La pagina in cui si è entrati per la guida (null = si resta qui).
  const [pagina] = useState(() => (daGuida && g.apri ? g.apri({ schede, diete }) : null))
  useEffect(() => {
    if (pagina) navigate(pagina)
  }, [pagina])
  useSchedaSopraBarra(scheda, n)
  const passo = g.passi[n]
  const acceso = useFaro(passo.punta, faro, scheda)
  const ultimo = n === g.passi.length - 1

  const chiudi = () => {
    if (pagina && window.location.pathname === pagina) goBack()
    onChiudi()
  }
  const vai = (d) => (n + d >= g.passi.length ? chiudi() : setN(Math.max(0, n + d)))

  useEffect(() => {
    avanti.current?.focus({ preventScroll: true })
  }, [n])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') chiudi()
      else if (e.key === 'ArrowRight') vai(1)
      else if (e.key === 'ArrowLeft') vai(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={'tutorial' + (acceso ? ' con-faro' : '')} role="dialog" aria-modal="true" aria-label={g.titolo}>
      <div className="tutorial-sfondo" aria-hidden="true" />
      <div ref={faro} className="guida-faro" aria-hidden="true" />
      <div ref={scheda} key={n} className={'tutorial-scheda guida-breve' + (conBarra ? '' : ' senza-barra')}>
        <div className="tutorial-testa">
          <span className="tutorial-conta">
            {g.titolo}
            {g.passi.length > 1 && ` · ${n + 1} di ${g.passi.length}`}
          </span>
          {!ultimo && (
            <button className="btn btn-ghost btn-sm" onClick={chiudi}>
              Salta
            </button>
          )}
        </div>
        <h3 className="tutorial-titolo">{passo.titolo}</h3>
        {passo.scena && <ScenaGuida scena={passo.scena} />}
        <p className="tutorial-testo">{passo.testo}</p>
        <div className="tutorial-tasti">
          {n > 0 && (
            <button className="btn" onClick={() => vai(-1)}>
              Indietro
            </button>
          )}
          <button ref={avanti} className="btn btn-accent grow" onClick={() => vai(1)}>
            {ultimo ? 'Ho capito' : 'Avanti'}
          </button>
        </div>
      </div>
    </div>
  )
}
