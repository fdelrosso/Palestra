import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import useRileggi from '../hooks/useRileggi'
import { aggiungiAttivita, eliminaAttivita, giornoLungo, giorniDaLunedi, isoDi, leggiAgenda, lunediDi } from '../lib/agendaPt'
import { proponiAppuntamento, useFasceInAttesa, useOrariImpegnati } from '../lib/appuntamenti'
import { nuovaFascia, problemaOrari } from '../lib/orariAppuntamento'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import EditorOrari from './EditorOrari'
import { IconChevron, IconTrash } from './icons'
import useSchermoLargo from '../hooks/useSchermoLargo'

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
  // Sullo schermo largo due settimane, questa e la prossima (due righe da 7).
  const dueSettimane = useSchermoLargo()
  const giorni = useMemo(() => {
    const lunedi = lunediDi(new Date())
    if (!dueSettimane) return giorniDaLunedi(lunedi)
    const dopo = new Date(lunedi)
    dopo.setDate(dopo.getDate() + 7)
    return [...giorniDaLunedi(lunedi), ...giorniDaLunedi(dopo)]
  }, [dueSettimane])
  const da = isoDi(giorni[0])
  const a = isoDi(giorni[giorni.length - 1])
  const { utenteCorrente, mieiAtleti } = useAccount()
  const inAttesa = useFasceInAttesa(utenteCorrente?.id)
  const nomeAtleta = (id) => (id && (mieiAtleti || []).find((x) => x.id === id)?.nome) || ''
  // L'impegno aperto dai prossimi (DettaglioAttivita).
  const [aperta, setAperta] = useState(null)

  useEffect(() => {
    let vivo = true
    leggiAgenda(da, a).then((esito) => {
      if (vivo) setRighe(esito.righe)
    })
    return () => {
      vivo = false
    }
  }, [da, a])
  // Un orario accettato dall'atleta entra in agenda dall'altra parte: senza
  // rileggere, la fascia "In attesa" spariva e l'appuntamento non compariva.
  const rileggi = useCallback(() => leggiAgenda(da, a).then((esito) => esito.ok && setRighe(esito.righe)), [da, a])
  useRileggi(rileggi)

  // Sullo schermo largo, accanto alle due settimane, i prossimi impegni per
  // intero: da oggi in poi, quello in agenda e le fasce proposte a un atleta
  // e non ancora scelte, in ordine di giorno e ora.
  const prossimi = dueSettimane
    ? [
        ...righe.map((r) => ({ id: r.id, giorno: r.data, ora: r.ora, testo: r.titolo, chi: nomeAtleta(r.atletaId), riga: r })),
        ...inAttesa.map((x) => ({
          id: `${x.appId}-${x.giorno}-${x.ora}`,
          giorno: x.giorno,
          ora: x.ora,
          testo: 'In attesa',
          chi: nomeAtleta(x.atletaId),
          attesa: true,
          appId: x.appId,
        })),
      ]
        .filter((v) => v.giorno >= oggi && v.giorno <= a)
        .sort((x, y) => `${x.giorno} ${x.ora || '99'}`.localeCompare(`${y.giorno} ${y.ora || '99'}`))
        .slice(0, 4)
    : []

  const settimane = (
    <button
      className="inizio-settimana"
      onClick={() => navigate(routes.agendaPt())}
      aria-label={`${dueSettimane ? 'Due settimane' : 'Settimana'}: ${righe.length} in agenda. Apri il calendario`}
    >
      {giorni.map((d, i) => {
        const iso = isoDi(d)
        const quante = righe.filter((r) => r.data === iso).length
        return (
          <span key={iso} className="inizio-giorno" aria-hidden="true">
            {i < 7 && <span className="inizio-lettera">{GIORNI_LETTERA[i]}</span>}
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
  )
  const conta = (
    <p className="inizio-conta">
      <strong>{righe.length}</strong> {righe.length === 1 ? 'impegno' : 'impegni'}{' '}
      {dueSettimane ? 'in queste due settimane' : 'questa settimana'}
    </p>
  )

  if (!dueSettimane) {
    return (
      <section className="agenda-pt">
        {settimane}
        {conta}
      </section>
    )
  }
  return (
    <section className="agenda-pt agenda-pt-largo">
      <div>
        {settimane}
        {conta}
      </div>
      <div className="agenda-prossimi">
        <div className="agenda-prossimi-titolo">Prossimi impegni</div>
        {prossimi.length === 0 && <p className="muted agenda-prossimi-vuoto">Niente in agenda da qui a due settimane.</p>}
        {/* Toccandone uno: in agenda si apre il dettaglio (come nel calendario),
            una fascia in attesa porta all'appuntamento in Appuntamenti. */}
        {prossimi.map((v) => (
          <button
            key={v.id}
            type="button"
            className={'agenda-prossimo' + (v.attesa ? ' attesa' : '')}
            onClick={() =>
              v.attesa ? navigate(`${routes.appuntamenti()}?${new URLSearchParams({ apri: v.appId })}`) : setAperta(v.riga)
            }
          >
            <span className="agenda-prossimo-quando">
              {giornoBreve(v.giorno)}
              {v.ora && ` · ${v.ora}`}
            </span>
            <span className="agenda-prossimo-cosa">
              {v.testo}
              {v.chi && <span className="agenda-prossimo-chi"> · {v.chi}</span>}
            </span>
            <IconChevron className="faint" width={16} height={16} />
          </button>
        ))}
        {aperta && (
          <DettaglioAttivita
            attivita={aperta}
            nomeAtleta={nomeAtleta(aperta.atletaId)}
            onChiudi={() => setAperta(null)}
            onTolta={(r, esito) => {
              setAperta(null)
              if (esito.ok) setRighe((tutte) => tutte.filter((x) => x.id !== r.id))
            }}
          />
        )}
        <button className="agenda-prossimi-tutta" onClick={() => navigate(routes.agendaPt())}>
          Tutta l’agenda ›
        </button>
      </div>
    </section>
  )
}

// "Ven 13" da 'AAAA-MM-GG'.
function giornoBreve(iso) {
  const [y, m, g] = iso.split('-').map(Number)
  const s = new Date(y, m - 1, g).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Un impegno dell'agenda, aperto: titolo, quando, con chi, la descrizione, e
 * Annulla (un appuntamento: l'atleta riceve la notifica) o Togli. Lo usano il
 * calendario (pages/AgendaPtPage) e i prossimi impegni qui sopra.
 * `onTolta(riga, esito)` dopo il tentativo.
 */
export function DettaglioAttivita({ attivita: r, nomeAtleta = '', onChiudi, onTolta }) {
  const togli = async () => {
    const domanda = r.atletaId
      ? `Annullare “${r.titolo}”? ${nomeAtleta || 'L’atleta'} riceverà una notifica.`
      : `Togliere “${r.titolo}” dall’agenda?`
    if (!window.confirm(domanda)) return
    onTolta(r, await eliminaAttivita(r.id))
  }
  return createPortal(
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={r.titolo} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 2 }}>{r.titolo}</h3>
        <div className="muted" style={{ fontSize: 13.5 }}>
          {[giornoLungo(r.data), r.oraFine ? `${r.ora}–${r.oraFine}` : r.ora, nomeAtleta].filter(Boolean).join(' · ')}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.45, margin: '10px 0 14px', whiteSpace: 'pre-wrap' }}>
          {r.nota || 'Nessuna descrizione.'}
        </p>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost btn-danger" onClick={togli}>
            <IconTrash width={16} height={16} /> {r.atletaId ? 'Annulla' : 'Togli'}
          </button>
          <button className="btn grow" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
