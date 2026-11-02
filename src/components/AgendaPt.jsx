import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { aggiungiAttivita, giorniDaLunedi, isoDi, leggiAgenda, lunediDi } from '../lib/agendaPt'
import { proponiAppuntamento, useFasceInAttesa, useOrariImpegnati } from '../lib/appuntamenti'
import { nuovaFascia, problemaOrari } from '../lib/orariAppuntamento'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import EditorOrari from './EditorOrari'

// ---------------------------------------------------------------------------
// L'agenda del PT, sulla sua Home (pages/LavoroPage): la settimana, come quella
// di chi si allena (pages/InizioPage). Toccandola si apre il calendario del
// mese (pages/AgendaPtPage), dove si scrive e si toglie. Serve a pianificare
// (lib/agendaPt), non a registrare allenamenti.
// ---------------------------------------------------------------------------

const GIORNI_LETTERA = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export default function AgendaPt() {
  const oggi = isoDi(new Date())
  const [righe, setRighe] = useState([])
  const giorni = useMemo(() => giorniDaLunedi(lunediDi(new Date())), [])
  const da = isoDi(giorni[0])
  const a = isoDi(giorni[6])
  const inAttesa = useFasceInAttesa(useAccount().utenteCorrente?.id)

  useEffect(() => {
    let vivo = true
    leggiAgenda(da, a).then((esito) => {
      if (vivo) setRighe(esito.righe)
    })
    return () => {
      vivo = false
    }
  }, [da, a])

  return (
    <section className="agenda-pt">
      <button
        className="inizio-settimana"
        onClick={() => navigate(routes.agendaPt())}
        aria-label={`Settimana: ${righe.length} in agenda. Apri il calendario`}
      >
        {giorni.map((d, i) => {
          const iso = isoDi(d)
          const quante = righe.filter((r) => r.data === iso).length
          return (
            <span key={iso} className="inizio-giorno" aria-hidden="true">
              <span className="inizio-lettera">{GIORNI_LETTERA[i]}</span>
              <span
                className={
                  'cal-day' +
                  (iso === oggi ? ' today' : '') +
                  (quante ? ' previsto' : ' futuro') +
                  (inAttesa.some((x) => x.giorno === iso) ? ' in-attesa' : '')
                }
              >
                {d.getDate()}
              </span>
            </span>
          )
        })}
      </button>
      <p className="inizio-conta">
        <strong>{righe.length}</strong> {righe.length === 1 ? 'impegno' : 'impegni'} questa settimana
      </p>
    </section>
  )
}

export function NuovaAttivita({ data: dataIniziale, atleti, onChiudi, onSalvata }) {
  const [data, setData] = useState(dataIniziale)
  const [ora, setOra] = useState('')
  const [titolo, setTitolo] = useState('')
  const [atletaId, setAtletaId] = useState('')
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const io = useAccount().utenteCorrente?.id
  const impegni = useOrariImpegnati(io)
  const atleta = atleti.find((x) => x.id === atletaId)
  // Le fasce da proporre all'atleta. La prima parte dal giorno scelto qui.
  const [fasce, setFasce] = useState(null)
  const orari = fasce || [nuovaFascia(data, impegni)]

  // Con un atleta non si fissa: gli arriva la richiesta, e l'appuntamento
  // entra in agenda quando accetta (lib/appuntamenti). Si va a vederla.
  const proponi = async () => {
    const problema = problemaOrari(orari, new Set(), new Date(), impegni)
    if (problema) return setErrore(problema)
    setSalvando(true)
    const esito = await proponiAppuntamento(atletaId, [titolo.trim(), nota.trim()].filter(Boolean).join('\n'), orari)
    setSalvando(false)
    if (!esito.ok) return setErrore(esito.errore)
    onChiudi()
    navigate(`${routes.appuntamenti()}?${new URLSearchParams({ apri: esito.id })}`)
  }

  const salva = async (e) => {
    e.preventDefault()
    if (salvando) return
    if (atletaId) return proponi()
    setSalvando(true)
    const esito = await aggiungiAttivita({ data, ora, titolo, nota, atletaId: null })
    setSalvando(false)
    if (esito.ok) onSalvata(esito.riga)
    else setErrore(esito.errore)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <form className="modal stack" style={{ gap: 10 }} onSubmit={salva} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 2 }}>In agenda</h3>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Cosa</span>
          <input
            className="input"
            autoFocus
            maxLength={120}
            value={titolo}
            placeholder="Lezione, valutazione, chiamata…"
            onChange={(e) => {
              setTitolo(e.target.value)
              setErrore('')
            }}
          />
        </label>
        {!atleta && (
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label className="stack" style={{ gap: 4, flex: '1 1 140px' }}>
              <span className="muted" style={{ fontSize: 12 }}>Giorno</span>
              <input className="input" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            <label className="stack" style={{ gap: 4, flex: '1 1 100px' }}>
              <span className="muted" style={{ fontSize: 12 }}>Ora (facoltativa)</span>
              <input className="input" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
            </label>
          </div>
        )}
        {atleti.length > 0 && (
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Con chi (facoltativo)</span>
            <select
              className="input"
              value={atletaId}
              onChange={(e) => {
                setAtletaId(e.target.value)
                setErrore('')
              }}
            >
              <option value="">Nessun atleta</option>
              {atleti.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
            {atleta && (
              <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                {atleta.nome} sceglie quando dentro la fascia. Fino ad allora è in attesa di conferma.
              </span>
            )}
          </label>
        )}
        {atleta && <EditorOrari orari={orari} impegni={impegni} onChange={setFasce} />}
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Nota (facoltativa)</span>
          <input className="input" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        {errore && <p className="form-error">{errore}</p>}
        <div className="row" style={{ gap: 10, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onChiudi}>
            Annulla
          </button>
          <button type="submit" className="btn btn-accent" style={{ flex: 1 }} disabled={salvando || !titolo.trim()}>
            {salvando ? (atleta ? 'Invio…' : 'Salvo…') : atleta ? `Manda a ${atleta.nome}` : 'Salva'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
