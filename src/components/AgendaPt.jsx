import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import {
  aggiungiAttivita,
  eliminaAttivita,
  giorniDaLunedi,
  isoDi,
  leggiAgenda,
  lunediDi,
  ordinaAttivita,
} from '../lib/agendaPt'
import { IconBack, IconChevron, IconPlus, IconTrash } from './icons'

// ---------------------------------------------------------------------------
// L'agenda del PT, sulla sua Home (pages/LavoroPage): una settimana alla volta,
// e sotto le cose del giorno toccato. Serve a pianificare (lib/agendaPt), non
// a registrare allenamenti: per questo non c'è niente da "fare" o spuntare,
// solo da scrivere e togliere.
// ---------------------------------------------------------------------------

const GIORNI_LETTERA = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function giornoLungo(iso) {
  const [a, m, g] = iso.split('-').map(Number)
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(a, m - 1, g),
  )
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function meseDellaSettimana(giorni) {
  const f = (d) => new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(d)
  const primo = f(giorni[0])
  const ultimo = f(giorni[6])
  return primo === ultimo ? primo : `${primo} – ${ultimo}`
}

export default function AgendaPt() {
  const { mieiAtleti } = useAccount()
  const oggi = isoDi(new Date())
  const [lunedi, setLunedi] = useState(() => lunediDi(new Date()))
  const [scelto, setScelto] = useState(oggi)
  const [righe, setRighe] = useState([])
  const [errore, setErrore] = useState('')
  const [nuova, setNuova] = useState(false)

  const giorni = useMemo(() => giorniDaLunedi(lunedi), [lunedi])
  const da = isoDi(giorni[0])
  const a = isoDi(giorni[6])

  const ricarica = useCallback(async () => {
    const esito = await leggiAgenda(da, a)
    setRighe(esito.righe)
    setErrore(esito.errore)
  }, [da, a])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    ricarica()
  }, [ricarica])

  const sposta = (settimane) => {
    const l = new Date(lunedi)
    l.setDate(l.getDate() + settimane * 7)
    setLunedi(l)
    setScelto(isoDi(l))
  }
  const tornaAOggi = () => {
    setLunedi(lunediDi(new Date()))
    setScelto(oggi)
  }

  const delGiorno = righe.filter((r) => r.data === scelto)
  const nomeAtleta = (id) => mieiAtleti.find((x) => x.id === id)?.nome || ''

  const togli = async (r) => {
    if (!window.confirm(`Togliere “${r.titolo}” dall’agenda?`)) return
    const esito = await eliminaAttivita(r.id)
    if (esito.ok) setRighe((tutte) => tutte.filter((x) => x.id !== r.id))
    else setErrore(esito.errore)
  }

  return (
    <section className="agenda-pt">
      <div className="agenda-pt-testa">
        <button className="icon-btn" onClick={() => sposta(-1)} aria-label="Settimana prima">
          <IconBack width={18} height={18} />
        </button>
        <button className="agenda-pt-mese" onClick={tornaAOggi} title="Torna a oggi">
          {meseDellaSettimana(giorni)}
        </button>
        <button className="icon-btn" onClick={() => sposta(1)} aria-label="Settimana dopo">
          <IconChevron width={18} height={18} />
        </button>
      </div>

      <div className="inizio-settimana" role="group" aria-label="Giorni della settimana">
        {giorni.map((d, i) => {
          const iso = isoDi(d)
          const quante = righe.filter((r) => r.data === iso).length
          return (
            <button
              key={iso}
              type="button"
              className="inizio-giorno agenda-pt-giorno"
              onClick={() => setScelto(iso)}
              aria-pressed={iso === scelto}
              aria-label={`${giornoLungo(iso)}${quante ? `, ${quante} in agenda` : ''}`}
            >
              <span className="inizio-lettera">{GIORNI_LETTERA[i]}</span>
              <span
                className={
                  'cal-day' +
                  (iso === oggi ? ' today' : '') +
                  (quante ? ' previsto' : ' futuro') +
                  (iso === scelto ? ' scelto' : '')
                }
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      <div className="agenda-pt-giorno-testa">
        <strong>{scelto === oggi ? 'Oggi' : giornoLungo(scelto)}</strong>
        <button className="btn btn-sm" onClick={() => setNuova(true)}>
          <IconPlus width={15} height={15} /> Aggiungi
        </button>
      </div>

      {errore && <p className="muted" style={{ fontSize: 12.5 }}>{errore}</p>}

      {delGiorno.length === 0 ? (
        <p className="muted agenda-pt-vuoto">Niente in programma.</p>
      ) : (
        <ul className="agenda-pt-lista">
          {delGiorno.map((r) => (
            <li key={r.id} className="agenda-pt-voce">
              <span className="agenda-pt-ora">{r.ora || 'Giornata'}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="agenda-pt-titolo">{r.titolo}</span>
                {(r.atletaId || r.nota) && (
                  <span className="agenda-pt-sotto">
                    {[nomeAtleta(r.atletaId), r.nota].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              <button className="icon-btn" onClick={() => togli(r)} aria-label={`Togli ${r.titolo}`}>
                <IconTrash width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuova && (
        <NuovaAttivita
          data={scelto}
          atleti={mieiAtleti}
          onChiudi={() => setNuova(false)}
          onSalvata={(r) => {
            setNuova(false)
            setScelto(r.data)
            if (r.data >= da && r.data <= a) setRighe((tutte) => ordinaAttivita([...tutte, r]))
            else setLunedi(lunediDi(new Date(r.data + 'T12:00')))
          }}
        />
      )}
    </section>
  )
}

function NuovaAttivita({ data: dataIniziale, atleti, onChiudi, onSalvata }) {
  const [data, setData] = useState(dataIniziale)
  const [ora, setOra] = useState('')
  const [titolo, setTitolo] = useState('')
  const [atletaId, setAtletaId] = useState('')
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  const salva = async (e) => {
    e.preventDefault()
    if (salvando) return
    setSalvando(true)
    const esito = await aggiungiAttivita({ data, ora, titolo, nota, atletaId: atletaId || null })
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
        {atleti.length > 0 && (
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Con chi (facoltativo)</span>
            <select className="input" value={atletaId} onChange={(e) => setAtletaId(e.target.value)}>
              <option value="">Nessun atleta</option>
              {atleti.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </label>
        )}
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
            {salvando ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
