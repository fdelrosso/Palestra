import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { cercaPalestre, luogoPalestra, palestraDaId } from '../lib/palestre'
import AggiungiPalestra from './AggiungiPalestra'
import Foglio from './Foglio'
import { IconCheck, IconClose, IconDumbbell, IconSearch } from './icons'

// MapLibre pesa: entra solo a chi apre Cerca → Palestre.
const MappaPalestre = lazy(() => import('./MappaPalestre'))

// ---------------------------------------------------------------------------
// Cerca → Palestre: si trova la propria palestra e la si sceglie, sulla mappa.
// Per nome, comune o sigla della provincia (lib/palestre, `cerca_palestre`):
// i risultati stanno sopra la mappa, e toccarne uno ci porta la mappa. O
// "Vicino a me", che porta la mappa dove si è. Toccare il pallino di una
// palestra chiede "È la tua palestra?"; il sì la scrive sul profilo
// (`scegliPalestra`, profili.palestra_id), e il pallino della propria offre
// di toglierla. Quale sia la propria si legge nel profilo di Social
// (pages/AmiciPage, "La mia palestra").
//
// Chi non la trova la aggiunge (components/AggiungiPalestra): al posto della
// ricerca e della mappa, e finito si torna qui, sulla sua.
//
// "Vicino a me" usa la posizione del telefono UNA volta, quando lo si tocca:
// non si salva e non arriva al database, sposta solo la mappa.
// ---------------------------------------------------------------------------

function posizione() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error('Questo dispositivo non dà la posizione.'))
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        no(
          new Error(
            e.code === 1
              ? 'Serve il permesso per la posizione: dallo nelle impostazioni e riprova.'
              : 'Posizione non trovata. Riprova all’aperto, o cerca per nome.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

export default function PalestreCerca() {
  const { utenteCorrente, scegliPalestra } = useAccount()
  const miaId = utenteCorrente?.palestraId || null
  const [mia, setMia] = useState(null)
  const [chiave, setChiave] = useState('')
  const [risposta, setRisposta] = useState({ per: '', ok: true, palestre: [], errore: '' })
  // Dove si e' secondo "Vicino a me".
  const [vicino, setVicino] = useState({ stato: 'fermo', punto: null, errore: '' })
  const [daConfermare, setDaConfermare] = useState(null)
  // La palestra toccata fra i risultati: la mappa ci va.
  const [inVista, setInVista] = useState(null)
  const [salvo, setSalvo] = useState(false)
  const [errore, setErrore] = useState('')
  const [aggiungo, setAggiungo] = useState(false)

  const q = chiave.trim()
  const cercando = q.length >= 2 && risposta.per !== q
  const esito = risposta.per === q ? risposta : null

  // La mia come riga intera (nome, luogo): si legge solo se non la si ha già.
  useEffect(() => {
    if (!miaId || mia?.id === miaId) return undefined
    let vivo = true
    palestraDaId(miaId).then((p) => vivo && setMia(p))
    return () => {
      vivo = false
    }
  }, [miaId, mia])

  useEffect(() => {
    if (q.length < 2) return undefined
    let vivo = true
    const t = setTimeout(async () => {
      const r = await cercaPalestre(q)
      if (vivo) setRisposta({ per: q, ...r })
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [q])

  const vicinoAMe = async () => {
    setVicino((v) => ({ ...v, stato: 'cerco', errore: '' }))
    try {
      const punto = await posizione()
      setVicino({ stato: 'ok', punto, errore: '' })
      // Vince l'ultima cosa chiesta: ora la mappa va dove si è.
      setInVista(null)
    } catch (e) {
      setVicino({ stato: 'errore', punto: null, errore: e.message })
    }
  }

  const conferma = async () => {
    setSalvo(true)
    const r = await scegliPalestra(daConfermare.id)
    setSalvo(false)
    if (!r.ok) {
      setErrore(r.errore || 'Palestra non salvata. Riprova.')
      return
    }
    setMia(daConfermare)
    setDaConfermare(null)
    setErrore('')
  }

  const togli = async () => {
    setSalvo(true)
    const r = await scegliPalestra(null)
    setSalvo(false)
    if (!r.ok) {
      setErrore(r.errore || 'Palestra non tolta. Riprova.')
      return
    }
    setMia(null)
    setDaConfermare(null)
    setErrore('')
  }

  // Dove sta la mappa: la palestra cercata, se no il punto di "Vicino a me",
  // se no la mia. Lo zoom lo decide la mappa.
  const centro = useMemo(
    () =>
      inVista
        ? { lat: inVista.lat, lon: inVista.lon }
        : vicino.punto || (miaId && mia?.id === miaId ? { lat: mia.lat, lon: mia.lon } : null),
    [inVista, vicino.punto, miaId, mia],
  )

  // Toccare un risultato porta la mappa su quella palestra (e il suo
  // pallino, toccato, chiede "È la tua palestra?"). Una copia, perché toccare
  // di nuovo la stessa dopo aver girato la mappa ci riporti.
  const mostraSullaMappa = (p) => {
    setInVista({ ...p })
    setChiave('')
  }

  if (aggiungo) {
    return (
      <AggiungiPalestra
        chiaveIniziale={q}
        onAnnulla={() => setAggiungo(false)}
        onFatto={(p) => {
          setAggiungo(false)
          setMia(p)
          setChiave('')
          setInVista({ ...p })
        }}
      />
    )
  }

  const nonLaTrovi = (
    <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAggiungo(true)}>
      Non trovi la tua palestra? Aggiungila
    </button>
  )

  return (
    <>
      <div className="row palestre-ricerca" style={{ gap: 10, alignItems: 'center' }}>
        <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
          <IconSearch width={17} height={17} className="faint" />
          <input
            type="text"
            enterKeyHint="search"
            className="search-input"
            value={chiave}
            placeholder="Nome, comune o FI"
            onChange={(e) => setChiave(e.target.value)}
            autoComplete="off"
            aria-label="Cerca una palestra"
          />
          {chiave && (
            <button type="button" className="icon-btn" aria-label="Pulisci" onClick={() => setChiave('')}>
              <IconClose width={16} height={16} />
            </button>
          )}
        </form>
        <button type="button" className="btn btn-sm nowrap" onClick={vicinoAMe} disabled={vicino.stato === 'cerco'}>
          {vicino.stato === 'cerco' ? 'Cerco…' : 'Vicino a me'}
        </button>
      </div>
      {vicino.stato === 'errore' && (
        <p className="form-error" style={{ marginTop: 8 }}>
          {vicino.errore || 'Posizione non trovata. Riprova.'}
        </p>
      )}

      {/* ⚠️ I risultati stanno SOPRA la mappa, e la mappa resta montata:
          toccando una palestra ci vola dalla vista di prima. Smontata
          ripartirebbe dall'Italia intera, e ci salterebbe. */}
      {q.length >= 2 && (
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {cercando ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>Cerco…</p>
          ) : !esito.ok ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
              {esito.errore || 'Ricerca non riuscita. Riprova.'}
            </p>
          ) : esito.palestre.length === 0 ? (
            <div className="empty">
              <div className="big">🔍</div>
              <p>Nessuna palestra con «{q}».</p>
            </div>
          ) : (
            esito.palestre.map((p) => (
              <button key={p.id} className="menu-voce" onClick={() => mostraSullaMappa(p)}>
                <span className="palestra-icona" aria-hidden="true">
                  <IconDumbbell width={18} height={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="menu-voce-nome">{p.nome}</span>
                  <span className="menu-voce-desc">{luogoPalestra(p)}</span>
                </span>
                {p.id === miaId && <IconCheck style={{ color: 'var(--accent)' }} aria-label="La tua palestra" />}
              </button>
            ))
          )}
          {esito?.ok && nonLaTrovi}
        </div>
      )}

      <Suspense fallback={<p className="muted" style={{ fontSize: 13.5, marginTop: 14 }}>Carico la mappa…</p>}>
        <MappaPalestre centro={centro} miaId={miaId} onScegli={setDaConfermare} />
      </Suspense>
      {q.length < 2 && <div style={{ marginTop: 12 }}>{nonLaTrovi}</div>}

      {daConfermare && (
        <Foglio
          titolo={daConfermare.id === miaId ? 'È già la tua palestra' : 'È la tua palestra?'}
          sotto={[daConfermare.nome, luogoPalestra(daConfermare)].filter(Boolean).join(' · ')}
          onChiudi={() => {
            setDaConfermare(null)
            setErrore('')
          }}
        >
          {daConfermare.id !== miaId && (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
              I tuoi allenamenti pubblici li vedrà, in «Vicino a te» nel feed, anche chi si allena vicino.
            </p>
          )}
          {errore && <p className="form-error">{errore}</p>}
          {daConfermare.id !== miaId ? (
            <button type="button" className="btn btn-accent btn-block" onClick={conferma} disabled={salvo}>
              {salvo ? 'Salvo…' : 'Sì, è la mia'}
            </button>
          ) : (
            <button type="button" className="btn btn-block" onClick={togli} disabled={salvo}>
              {salvo ? 'Tolgo…' : 'Non è più la mia'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setDaConfermare(null)
              setErrore('')
            }}
          >
            {daConfermare.id === miaId ? 'Chiudi' : 'Annulla'}
          </button>
        </Foglio>
      )}
    </>
  )
}
