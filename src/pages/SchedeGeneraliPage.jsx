import { useMemo, useState } from 'react'
import { schedeGenerali } from '../lib/schedeGenerali'
import { schemaPerSettimana } from '../data/model'
import { goBack } from '../lib/router'
import { formatSerieRip } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import { useAccount } from '../store/AccountContext'
import EsercizioAllegati from '../components/EsercizioAllegati'
import { IconBack, IconSearch, IconBed, IconChevron, IconCoach } from '../components/icons'

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

export default function SchedeGeneraliPage() {
  const { utenteCorrente } = useAccount()
  // Chi ha un PT si vede in cima le sue schede e quelle degli altri suoi atleti.
  const tutte = useMemo(() => schedeGenerali({ utente: utenteCorrente }), [utenteCorrente])
  const [q, setQ] = useState('')
  const [filtroAll, setFiltroAll] = useState('') // allenamenti/settimana ('' = tutti)
  const [filtroSett, setFiltroSett] = useState('') // durata in settimane ('' = tutte)
  const [aperta, setAperta] = useState(null)

  // Valori disponibili per i filtri (distinti, ordinati).
  const opzAll = useMemo(
    () => [...new Set(tutte.map((s) => s.numAllenamenti))].sort((a, b) => a - b),
    [tutte],
  )
  const opzSett = useMemo(
    () => [...new Set(tutte.map((s) => s.numeroSettimane))].sort((a, b) => a - b),
    [tutte],
  )

  const ql = q.trim().toLowerCase()
  const filtrate = useMemo(
    () =>
      tutte.filter((s) => {
        if (filtroAll && s.numAllenamenti !== Number(filtroAll)) return false
        if (filtroSett && s.numeroSettimane !== Number(filtroSett)) return false
        if (ql && !s.eserciziNomi.some((n) => n.toLowerCase().includes(ql))) return false
        return true
      }),
    [tutte, filtroAll, filtroSett, ql],
  )

  if (aperta) return <DettaglioScheda sg={aperta} onIndietro={() => setAperta(null)} />

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Schede Generali</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        Tutte le schede create da chiunque usi l'app — per prendere spunto. Cerca un esercizio o filtra
        per allenamenti a settimana e durata.
      </p>

      {/* Ricerca + filtri */}
      <div className="filtri">
        <div className="search-box">
          <IconSearch width={17} height={17} className="faint" />
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca un esercizio (es. Panca)"
            autoCapitalize="none"
          />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            className="select"
            value={filtroAll}
            onChange={(e) => setFiltroAll(e.target.value)}
            aria-label="Filtra per allenamenti a settimana"
          >
            <option value="">Tutti gli allenamenti/sett.</option>
            {opzAll.map((n) => (
              <option key={n} value={n}>
                {n} allenament{n === 1 ? 'o' : 'i'}/sett.
              </option>
            ))}
          </select>
          <select
            className="select"
            value={filtroSett}
            onChange={(e) => setFiltroSett(e.target.value)}
            aria-label="Filtra per durata"
          >
            <option value="">Tutte le durate</option>
            {opzSett.map((n) => (
              <option key={n} value={n}>
                {n} settiman{n === 1 ? 'a' : 'e'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtrate.length === 0 ? (
        <div className="empty">
          <div className="big">📚</div>
          <p>
            {tutte.length === 0
              ? 'Ancora nessuna scheda. Creane una e comparirà qui.'
              : 'Nessuna scheda corrisponde ai filtri.'}
          </p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 4 }}>
          {filtrate.map((s) => {
            const match = ql ? s.eserciziNomi.filter((n) => n.toLowerCase().includes(ql)) : []
            return (
              <button key={s.key} className="storico-card" onClick={() => setAperta(s)}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span className="user-avatar sm" aria-hidden="true">
                      {iniziale(s.utenteNome)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.nome}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>
                        di {s.utenteNome}
                        {s.autoreEPt && ' · PT'}
                      </div>
                    </div>
                  </div>
                  <IconChevron className="faint" />
                </div>

                <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {s.relazionePt > 0 && (
                    <span className="badge badge-good">
                      <IconCoach width={13} height={13} />
                      {s.relazionePt === 2 ? 'Del tuo PT' : 'Stesso PT'}
                    </span>
                  )}
                  <span className="badge badge-accent">
                    {s.numAllenamenti} allenament{s.numAllenamenti === 1 ? 'o' : 'i'}/sett.
                  </span>
                  <span className="badge">
                    {s.numeroSettimane} settiman{s.numeroSettimane === 1 ? 'a' : 'e'}
                  </span>
                  <span className="badge">{s.numEsercizi} esercizi</span>
                </div>

                {match.length > 0 && (
                  <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {match.slice(0, 4).map((n, i) => (
                      <span key={i} className="chip chip-match">
                        {n}
                      </span>
                    ))}
                    {match.length > 4 && (
                      <span className="chip chip-nota">+{match.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Dettaglio (sola lettura) di una scheda generale: giorni + esercizi (schema
// della settimana 1) + eventuali commenti/media, per prendere spunto.
// --------------------------------------------------------------------------
function DettaglioScheda({ sg, onIndietro }) {
  const { scheda, utenteNome } = sg
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{scheda.nome}</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>
            di {utenteNome} · {sg.numAllenamenti} allenamenti/sett. · {scheda.numeroSettimane} settimane
          </div>
        </div>
      </div>

      {scheda.nota && (
        <p className="muted" style={{ fontSize: 13.5, margin: '2px 2px 10px', lineHeight: 1.4 }}>
          {scheda.nota}
        </p>
      )}

      <p className="muted" style={{ fontSize: 12.5, margin: '2px 2px 12px' }}>
        Anteprima con lo schema della settimana 1.
      </p>

      {scheda.giorni.map((g) => {
        if (g.tipo === 'rest') {
          return (
            <div key={g.id} className="day-row rest" style={{ marginTop: 10 }}>
              <div className="day-dot">
                <IconBed width={18} height={18} />
              </div>
              <div className="grow">
                <div className="titolo">{g.nota ? `Rest · ${g.nota}` : 'Rest'}</div>
                <div className="sub">Riposo</div>
              </div>
            </div>
          )
        }
        return (
          <div key={g.id} style={{ marginTop: 16 }}>
            <div className="section-title" style={{ margin: '0 2px 8px' }}>
              {g.nome} · {g.esercizi.length} esercizi
            </div>
            <div className="stack">
              {g.esercizi.map((e) => (
                <div key={e.id}>
                  <EsercizioSpunto esercizio={e} />
                  <EsercizioAllegati esercizio={e} readOnly />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div style={{ height: 24 }} />
    </div>
  )
}

// Riga esercizio in sola lettura per lo "spunto" (schema settimana 1).
function EsercizioSpunto({ esercizio }) {
  const schema = schemaPerSettimana(esercizio, 1)
  const serieRip = formatSerieRip(schema)
  const gruppo = gruppoDi(esercizio.gruppo)
  return (
    <div
      className={'ex-card' + (gruppo ? ' has-gruppo' : '')}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
    >
      <div className="ex-head">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="nome">{esercizio.nome}</div>
          {gruppo && <span className="gruppo-tag">{gruppo.label}</span>}
          {esercizio.nota && <div className="ex-nota">{esercizio.nota}</div>}
        </div>
      </div>
      <div className="ex-scheme">
        {serieRip && <span className="serie-rip">{serieRip}</span>}
        {schema.carico && <span className="chip">{schema.carico}</span>}
        {schema.recupero && <span className="chip">{schema.recupero}</span>}
        {esercizio.variaPerSettimana && <span className="chip chip-nota">varia per settimana</span>}
      </div>
    </div>
  )
}
