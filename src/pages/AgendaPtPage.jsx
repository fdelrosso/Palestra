import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { eliminaAttivita, isoDi, leggiAgenda, ordinaAttivita } from '../lib/agendaPt'
import { useFasceInAttesa } from '../lib/appuntamenti'
import { durataDi, durataInParole } from '../lib/orariAppuntamento'
import { goBack, navigate, routes } from '../lib/router'
import { MESI, celleDelMese } from '../lib/recapMese'
import { NuovaAttivita } from '../components/AgendaPt'
import { IconBack, IconChevron, IconPlus, IconTrash } from '../components/icons'

// ---------------------------------------------------------------------------
// Il calendario del PT (/lavoro/agenda), che si apre dalla settimana sulla sua
// Home: lo stesso mese di chi si allena (pages/CalendarPage, .cal-card), con
// sotto le cose del giorno toccato. Toccandone una si apre la sua descrizione.
// Qui si aggiungono e si tolgono.
// ---------------------------------------------------------------------------

const GIORNI_SETT = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function giornoLungo(iso) {
  const [a, m, g] = iso.split('-').map(Number)
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(a, m - 1, g),
  )
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AgendaPtPage() {
  const { mieiAtleti, utenteCorrente } = useAccount()
  const inAttesa = useFasceInAttesa(utenteCorrente?.id)
  const adesso = new Date()
  const oggi = isoDi(adesso)
  const [vista, setVista] = useState({ anno: adesso.getFullYear(), mese: adesso.getMonth() })
  const [scelto, setScelto] = useState(oggi)
  const [righe, setRighe] = useState([])
  const [errore, setErrore] = useState('')
  const [nuova, setNuova] = useState(false)
  const [aperta, setAperta] = useState(null)

  const celle = useMemo(() => celleDelMese(vista.anno, vista.mese), [vista])
  const da = isoDi(new Date(vista.anno, vista.mese, 1))
  const a = isoDi(new Date(vista.anno, vista.mese + 1, 0))

  const ricarica = useCallback(async () => {
    const esito = await leggiAgenda(da, a)
    setRighe(esito.righe)
    setErrore(esito.errore)
  }, [da, a])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    ricarica()
  }, [ricarica])

  const cambiaMese = (delta) => {
    const d = new Date(vista.anno, vista.mese + delta, 1)
    setVista({ anno: d.getFullYear(), mese: d.getMonth() })
    setScelto(isoDi(d))
  }
  const vaiAOggi = () => {
    setVista({ anno: adesso.getFullYear(), mese: adesso.getMonth() })
    setScelto(oggi)
  }

  const delGiorno = righe.filter((r) => r.data === scelto)
  const attesaDelGiorno = inAttesa.filter((f) => f.giorno === scelto)
  const nomeAtleta = (id) => mieiAtleti.find((x) => x.id === id)?.nome || ''
  const nomeMese = MESI[vista.mese].charAt(0).toUpperCase() + MESI[vista.mese].slice(1)

  const togli = async (r) => {
    // Con un atleta è un appuntamento: lo annulla il database e l'atleta lo sa.
    const domanda = r.atletaId
      ? `Annullare “${r.titolo}”? ${nomeAtleta(r.atletaId) || 'L’atleta'} riceverà una notifica.`
      : `Togliere “${r.titolo}” dall’agenda?`
    if (!window.confirm(domanda)) return
    const esito = await eliminaAttivita(r.id)
    setAperta(null)
    if (esito.ok) setRighe((tutte) => tutte.filter((x) => x.id !== r.id))
    else setErrore(esito.errore)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack()} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Agenda</h1>
      </div>

      <section className="cal-card">
        <span className="cal-filigrana" aria-hidden="true">
          {vista.mese + 1}
        </span>
        <div className="cal-nav">
          <button className="cal-mese" onClick={vaiAOggi} title="Vai a oggi">
            <span className="cal-mese-nome">{nomeMese}</span>
            <span className="cal-mese-anno">{vista.anno}</span>
            <span className="cal-mese-conto">
              {righe.length === 0
                ? 'Nessun impegno'
                : `${righe.length} ${righe.length === 1 ? 'impegno' : 'impegni'}`}
            </span>
          </button>
          <button className="cal-freccia" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
            <IconChevron style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button className="cal-freccia" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
            <IconChevron />
          </button>
        </div>

        <div className="cal-grid cal-dow">
          {GIORNI_SETT.map((g, i) => (
            <div key={i} className="cal-dow-cell">
              {g}
            </div>
          ))}
        </div>

        <div className="cal-grid">
          {celle.map((giorno, i) => {
            if (!giorno) return <div key={i} className="cal-cell" />
            const iso = isoDi(new Date(vista.anno, vista.mese, giorno))
            const quante = righe.filter((r) => r.data === iso).length
            return (
              <div key={i} className="cal-cell">
                <button
                  className={
                    'cal-day' +
                    (iso === oggi ? ' today' : '') +
                    (quante ? ' previsto' : iso < oggi ? ' passato' : ' futuro') +
                    (inAttesa.some((x) => x.giorno === iso) ? ' in-attesa' : '') +
                    (iso === scelto ? ' scelto' : '')
                  }
                  onClick={() => setScelto(iso)}
                  aria-pressed={iso === scelto}
                  aria-label={`${giornoLungo(iso)}${quante ? `, ${quante} in agenda` : ''}${inAttesa.some((x) => x.giorno === iso) ? ', in attesa di conferma' : ''}`}
                >
                  {giorno}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="agenda-pt">
        <div className="agenda-pt-giorno-testa">
          <strong>{scelto === oggi ? 'Oggi' : giornoLungo(scelto)}</strong>
          <button className="btn btn-sm" onClick={() => setNuova(true)}>
            <IconPlus width={15} height={15} /> Aggiungi
          </button>
        </div>

        {errore && <p className="muted" style={{ fontSize: 12.5 }}>{errore}</p>}

        {delGiorno.length === 0 && attesaDelGiorno.length === 0 ? (
          <p className="muted agenda-pt-vuoto">Niente in programma.</p>
        ) : (
          <ul className="agenda-pt-lista">
            {/* Mandate, non ancora accettate: si guardano in Appuntamenti. */}
            {attesaDelGiorno.map((f) => (
              <li key={f.id}>
                <button
                  className="agenda-pt-voce agenda-pt-apri agenda-pt-attesa"
                  onClick={() => navigate(`${routes.appuntamenti()}?${new URLSearchParams({ apri: f.appId })}`)}
                >
                  <span className="agenda-pt-ora">{f.ora}–{f.fine}</span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="agenda-pt-titolo">In attesa di conferma</span>
                    <span className="agenda-pt-sotto">
                      {[nomeAtleta(f.atletaId), durataInParole(durataDi(f))].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              </li>
            ))}
            {delGiorno.map((r) => (
              <li key={r.id}>
                <button className="agenda-pt-voce agenda-pt-apri" onClick={() => setAperta(r)}>
                  <span className="agenda-pt-ora">
                    {r.ora ? (r.oraFine ? `${r.ora}–${r.oraFine}` : r.ora) : 'Giornata'}
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="agenda-pt-titolo">{r.titolo}</span>
                    {r.atletaId && <span className="agenda-pt-sotto">{nomeAtleta(r.atletaId)}</span>}
                  </span>
                  <IconChevron className="faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {aperta && (
        <div className="modal-backdrop" onClick={() => setAperta(null)}>
          <div className="modal" role="dialog" aria-label={aperta.titolo} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 2 }}>{aperta.titolo}</h3>
            <div className="muted" style={{ fontSize: 13.5 }}>
              {[giornoLungo(aperta.data), aperta.oraFine ? `${aperta.ora}–${aperta.oraFine}` : aperta.ora, nomeAtleta(aperta.atletaId)]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: '10px 0 14px', whiteSpace: 'pre-wrap' }}>
              {aperta.nota || 'Nessuna descrizione.'}
            </p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-ghost btn-danger" onClick={() => togli(aperta)}>
                <IconTrash width={16} height={16} /> {aperta.atletaId ? 'Annulla' : 'Togli'}
              </button>
              <button className="btn grow" onClick={() => setAperta(null)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
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
            else {
              const [anno, mese] = r.data.split('-').map(Number)
              setVista({ anno, mese: mese - 1 })
            }
          }}
        />
      )}
    </div>
  )
}
