import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { chiaveGuida, guida, guidaDellaRotta } from '../lib/guide'
import { useSchedaSopraBarra } from './Tutorial'

// ---------------------------------------------------------------------------
// Una MINI-GUIDA (lib/guide) a schermo: la stessa scheda del giro generale
// (components/Tutorial), appena sopra la barra, ma senza linguette da
// accendere e senza cambiare pagina — spiega quella che si ha davanti.
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

  return { guida: mostrata, chiudi }
}

// `conBarra`: la scheda sta sopra la barra in basso; senza (durante
// l'allenamento, in chat) scende in fondo allo schermo.
export default function GuidaBreve({ guida: g, onChiudi, conBarra = true }) {
  const [n, setN] = useState(0)
  const scheda = useRef(null)
  const avanti = useRef(null)
  useSchedaSopraBarra(scheda, n)
  const passo = g.passi[n]
  const ultimo = n === g.passi.length - 1
  const vai = (d) => (n + d >= g.passi.length ? onChiudi() : setN(Math.max(0, n + d)))

  useEffect(() => {
    avanti.current?.focus()
  }, [n])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onChiudi()
      else if (e.key === 'ArrowRight') vai(1)
      else if (e.key === 'ArrowLeft') vai(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="tutorial" role="dialog" aria-modal="true" aria-label={g.titolo}>
      <div className="tutorial-sfondo" aria-hidden="true" />
      <div ref={scheda} key={n} className={'tutorial-scheda guida-breve' + (conBarra ? '' : ' senza-barra')}>
        <div className="tutorial-testa">
          <span className="tutorial-conta">
            {g.titolo}
            {g.passi.length > 1 && ` · ${n + 1} di ${g.passi.length}`}
          </span>
          {!ultimo && (
            <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
              Salta
            </button>
          )}
        </div>
        <h3 className="tutorial-titolo">{passo.titolo}</h3>
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
