import { lazy, Suspense, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import {
  aggiungiDaCandidata,
  aggiungiPalestra,
  cercaCandidate,
  cercaIndirizzi,
  CREDITI_INDIRIZZI,
  luogoPalestra,
  ZOOM_PIN,
} from '../lib/palestre'
import Foglio from './Foglio'
import { IconBack, IconClose, IconDumbbell, IconSearch } from './icons'

const MappaPin = lazy(() => import('./MappaPalestre').then((m) => ({ default: m.MappaPin })))

// ---------------------------------------------------------------------------
// "Aggiungi la tua palestra", da Cerca → Palestre (components/PalestreCerca),
// quando la propria non c'è. Prima si cerca fra le CANDIDATE (lib/palestre:
// i luoghi di Overture che sulla mappa non ci sono): toccata una e detto sì,
// diventa una palestra e va sul profilo. Se non c'è nemmeno lì, il PIN:
// si cerca l'indirizzo (Photon), la mappa ci va, si sposta sotto il mirino,
// e si scrive il nome. Se lì vicino c'è già una palestra, si chiede prima
// "È una di queste?". In tutti e due i casi è subito sul profilo, ma per gli
// altri resta da approvare finché un moderatore non decide (pages/
// ModerazionePage): approvata o no, arriva un avviso (AvvisiModerazione).
// `onFatto(palestra)`: è sul profilo, si torna alla mappa.
// ---------------------------------------------------------------------------

// Una ricerca che parte 300 ms dopo l'ultima lettera: { per, ...risposta }.
function useCercaDopo(testo, cerca, minimo) {
  const [risposta, setRisposta] = useState({ per: '' })
  const q = testo.trim()
  useEffect(() => {
    if (q.length < minimo) return undefined
    let vivo = true
    const t = setTimeout(async () => {
      const r = await cerca(q)
      if (vivo) setRisposta({ per: q, ...r })
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [q, cerca, minimo])
  return { q, esito: risposta.per === q ? risposta : null }
}

function RigaPalestra({ p, onClick }) {
  return (
    <button className="menu-voce" onClick={onClick}>
      <span className="palestra-icona" aria-hidden="true">
        <IconDumbbell width={18} height={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="menu-voce-nome">{p.nome}</span>
        <span className="menu-voce-desc">{luogoPalestra(p)}</span>
      </span>
    </button>
  )
}

const nota = { fontSize: 13.5, margin: '4px 2px' }

export default function AggiungiPalestra({ chiaveIniziale = '', onFatto, onAnnulla }) {
  const { scegliPalestra } = useAccount()
  const [passo, setPasso] = useState('cerca')
  const [chiave, setChiave] = useState(chiaveIniziale)
  const candidate = useCercaDopo(chiave, cercaCandidate, 2)
  const [daScegliere, setDaScegliere] = useState(null)
  // Il pin.
  const [nome, setNome] = useState(chiaveIniziale)
  const [via, setVia] = useState('')
  const indirizzi = useCercaDopo(via, cercaIndirizzi, 3)
  const [indirizzo, setIndirizzo] = useState('')
  const [centro, setCentro] = useState(null)
  const [mirino, setMirino] = useState(null)
  const [vicine, setVicine] = useState(null)
  const [salvo, setSalvo] = useState(false)
  const [errore, setErrore] = useState('')

  // Sul profilo, e si torna alla mappa.
  const metti = async (palestra) => {
    const r = await scegliPalestra(palestra.id)
    if (!r.ok) throw new Error(r.errore || 'Palestra non salvata. Riprova.')
    onFatto(palestra)
  }

  const conSalvo = async (fai) => {
    setSalvo(true)
    setErrore('')
    try {
      await fai()
    } catch (e) {
      setErrore(e.message)
    } finally {
      setSalvo(false)
    }
  }

  const prendiCandidata = () =>
    conSalvo(async () => {
      const r = await aggiungiDaCandidata(daScegliere.id)
      if (!r.ok) throw new Error(r.errore || 'Palestra non aggiunta. Riprova.')
      await metti(r.palestra)
    })

  const aggiungi = (ancheSeVicine = false) =>
    conSalvo(async () => {
      const r = await aggiungiPalestra({ nome, lat: mirino.lat, lon: mirino.lon, indirizzo, ancheSeVicine })
      if (!r.ok) throw new Error(r.errore || 'Palestra non aggiunta. Riprova.')
      if (r.esistenti.length) return setVicine(r.esistenti)
      setVicine(null)
      await metti(r.palestra)
    })

  const vaiA = (i) => {
    setCentro({ lat: i.lat, lon: i.lon })
    if (i.indirizzo) setIndirizzo(i.indirizzo)
    setVia('')
  }

  const preciso = mirino && mirino.zoom >= ZOOM_PIN
  const pronto = nome.trim().length >= 3 && preciso && !salvo

  const testata = (
    <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <button
        type="button"
        className="icon-btn"
        aria-label={passo === 'pin' ? 'Torna alla ricerca' : 'Torna alla mappa'}
        onClick={() => (passo === 'pin' ? setPasso('cerca') : onAnnulla())}
      >
        <IconBack />
      </button>
      <h2 style={{ fontSize: 17, margin: 0 }}>{passo === 'pin' ? 'Mettila sulla mappa' : 'Aggiungi la tua palestra'}</h2>
    </div>
  )

  if (passo === 'cerca') {
    const { q, esito } = candidate
    return (
      <>
        {testata}
        <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
          <IconSearch width={17} height={17} className="faint" />
          <input
            type="text"
            enterKeyHint="search"
            className="search-input"
            value={chiave}
            placeholder="Nome della palestra, comune"
            onChange={(e) => setChiave(e.target.value)}
            autoComplete="off"
            aria-label="Cerca la tua palestra"
            autoFocus
          />
          {chiave && (
            <button type="button" className="icon-btn" aria-label="Pulisci" onClick={() => setChiave('')}>
              <IconClose width={16} height={16} />
            </button>
          )}
        </form>
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {q.length < 2 ? (
            <p className="muted" style={nota}>
              Scrivi il nome: la cerchiamo fra le palestre che non sono ancora sulla mappa.
            </p>
          ) : !esito ? (
            <p className="muted" style={nota}>Cerco…</p>
          ) : !esito.ok ? (
            <p className="muted" style={nota}>{esito.errore || 'Ricerca non riuscita. Riprova.'}</p>
          ) : esito.palestre.length === 0 ? (
            <p className="muted" style={nota}>Nessuna con «{q}».</p>
          ) : (
            esito.palestre.map((p) => <RigaPalestra key={p.id} p={p} onClick={() => setDaScegliere(p)} />)
          )}
        </div>
        <div className="card" style={{ marginTop: 16, padding: '12px 14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 14 }}>Non c’è nemmeno qui?</p>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              if (!nome.trim()) setNome(chiave.trim())
              setPasso('pin')
            }}
          >
            Mettila sulla mappa
          </button>
        </div>

        {daScegliere && (
          <Foglio
            titolo="È la tua palestra?"
            sotto={[daScegliere.nome, luogoPalestra(daScegliere)].filter(Boolean).join(' · ')}
            onChiudi={() => {
              setDaScegliere(null)
              setErrore('')
            }}
          >
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
              Diventa subito la tua. Sulla mappa per tutti dopo che l’abbiamo controllata: ti avvisiamo noi. I tuoi
              allenamenti pubblici li vedrà, in «Vicino a te» nel feed, anche chi si allena vicino.
            </p>
            {errore && <p className="form-error">{errore}</p>}
            <button type="button" className="btn btn-accent btn-block" onClick={prendiCandidata} disabled={salvo}>
              {salvo ? 'Salvo…' : 'Sì, è la mia'}
            </button>
            <button type="button" className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setDaScegliere(null)}>
              Annulla
            </button>
          </Foglio>
        )}
      </>
    )
  }

  const { q: qVia, esito: esitoVia } = indirizzi
  return (
    <>
      {testata}
      <div className="field">
        <label htmlFor="aggiungi-via">Indirizzo</label>
        <input
          id="aggiungi-via"
          className="input"
          value={via}
          onChange={(e) => setVia(e.target.value)}
          placeholder="Via Roma 12, Prato"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      {qVia.length >= 3 && (
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {!esitoVia ? (
            <p className="muted" style={nota}>Cerco…</p>
          ) : !esitoVia.ok ? (
            <p className="muted" style={nota}>{esitoVia.errore}</p>
          ) : esitoVia.indirizzi.length === 0 ? (
            <p className="muted" style={nota}>Nessun indirizzo con «{qVia}»: prova senza il civico.</p>
          ) : (
            esitoVia.indirizzi.map((i) => (
              <button key={`${i.lat},${i.lon}`} className="menu-voce" onClick={() => vaiA(i)}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="menu-voce-nome">{i.titolo}</span>
                  {i.luogo && <span className="menu-voce-desc">{i.luogo}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <Suspense fallback={<p className="muted" style={{ fontSize: 13.5, marginTop: 14 }}>Carico la mappa…</p>}>
        <MappaPin centro={centro} onSposta={setMirino} />
      </Suspense>
      <p className="muted" style={{ fontSize: 12.5, margin: '6px 2px 0' }}>
        {preciso ? 'Sposta la mappa finché il segno è sull’ingresso.' : 'Cerca l’indirizzo, o avvicinati fino a vedere i palazzi.'}
      </p>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="aggiungi-nome">Nome della palestra</label>
        <input
          id="aggiungi-nome"
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Es. Fit Lab"
          maxLength={80}
        />
      </div>
      <div className="field">
        <label htmlFor="aggiungi-indirizzo">Indirizzo da mostrare (se vuoi)</label>
        <input
          id="aggiungi-indirizzo"
          className="input"
          value={indirizzo}
          onChange={(e) => setIndirizzo(e.target.value)}
          placeholder="Via Roma 12"
          maxLength={120}
        />
      </div>
      {errore && !vicine && <p className="form-error">{errore}</p>}
      <button type="button" className="btn btn-accent btn-block" onClick={() => aggiungi(false)} disabled={!pronto}>
        {salvo ? 'Salvo…' : 'Aggiungi'}
      </button>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.45, margin: '10px 2px 0' }}>
        Diventa subito la tua. Sulla mappa per tutti dopo che l’abbiamo controllata: ti avvisiamo noi.
      </p>
      <p className="faint" style={{ fontSize: 11, margin: '8px 2px 0' }}>{CREDITI_INDIRIZZI}</p>

      {vicine && (
        <Foglio
          titolo="È una di queste?"
          sotto="Lì c’è già una palestra"
          onChiudi={() => {
            setVicine(null)
            setErrore('')
          }}
        >
          <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
            {vicine.map((p) => (
              <RigaPalestra key={p.id} p={p} onClick={() => conSalvo(() => metti(p))} />
            ))}
          </div>
          {errore && <p className="form-error">{errore}</p>}
          <button type="button" className="btn btn-block" onClick={() => aggiungi(true)} disabled={salvo}>
            {salvo ? 'Salvo…' : 'No, è un’altra: aggiungila'}
          </button>
        </Foglio>
      )}
    </>
  )
}
