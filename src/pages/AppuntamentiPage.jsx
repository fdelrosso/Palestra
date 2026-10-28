import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { goBack } from '../lib/router'
import {
  accettaOrario,
  annullaAppuntamento,
  chiediAppuntamento,
  controproponiOrari,
  leggiAppuntamenti,
  mieiAperti,
  notaDellAltro,
  orariDellAltro,
  rifiutati,
  toccaAMe,
  useOrariImpegnati,
} from '../lib/appuntamenti'
import { FASCE, MAX_ORARI, orarioImpegnato, orarioInParole, primaFasciaLibera, problemaOrari } from '../lib/orariAppuntamento'
import { domani, giornoIso } from '../lib/scadenza'
import { IconBack, IconClose, IconPlus } from '../components/icons'

// ---------------------------------------------------------------------------
// Gli appuntamenti fra atleta e PT (/appuntamenti, lib/appuntamenti). Una
// pagina sola per tutti e due:
//   - l'atleta col PT chiede: il motivo e una lista di giorni e orari;
//   - chi ha il turno ne sceglie uno dell'altro ("Va bene") e l'appuntamento
//     è fissato (va anche nell'agenda del PT), oppure manda altri orari;
//   - gli orari già rifiutati non si possono riproporre;
//   - le fasce dove sei già impegnato (in qualunque ruolo, lib/appuntamenti →
//     useOrariImpegnati) non si scelgono e non si accettano.
// In cima quelli dove tocca a te. `?apri=<id>` (dalle notifiche) lo porta in
// vista.
// ---------------------------------------------------------------------------

export default function AppuntamentiPage() {
  const { utenteCorrente, mioPt, mieiAtleti } = useAccount()
  const io = utenteCorrente?.id || null
  const [tutti, setTutti] = useState(null)
  const [chiedi, setChiedi] = useState(false)
  const impegni = useOrariImpegnati(io)
  const apri = new URLSearchParams(window.location.search).get('apri')

  const rileggi = useCallback(() => {
    leggiAppuntamenti(io).then(setTutti)
  }, [io])
  useEffect(() => {
    rileggi()
    const visibile = () => document.visibilityState === 'visible' && rileggi()
    document.addEventListener('visibilitychange', visibile)
    return () => document.removeEventListener('visibilitychange', visibile)
  }, [rileggi])

  useEffect(() => {
    if (apri && tutti) document.getElementById('app-' + apri)?.scrollIntoView({ block: 'center' })
  }, [apri, tutti])

  // Con chi è: per il PT l'atleta, per l'atleta il PT.
  const altroDi = (a) =>
    a.ptId === io
      ? mieiAtleti.find((x) => x.id === a.atletaId)?.nome || 'Un atleta'
      : mioPt?.id === a.ptId
        ? mioPt.nome
        : 'Il tuo PT'

  const lista = tutti || []
  const daDecidere = lista.filter((a) => toccaAMe(a, io))
  const inAttesa = lista.filter((a) => a.stato === 'trattativa' && !toccaAMe(a, io))
  const fissati = lista.filter((a) => a.stato === 'fissato')
  const annullati = lista.filter((a) => a.stato === 'annullato')

  const card = (a) => (
    <CardAppuntamento key={a.id} app={a} io={io} altro={altroDi(a)} impegni={impegni} evidenziato={a.id === apri} onCambiato={rileggi} />
  )

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack()} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Appuntamenti</h1>
      </div>

      {mioPt && !chiedi && (
        <button className="btn btn-accent btn-block" style={{ marginBottom: 14 }} onClick={() => setChiedi(true)}>
          <IconPlus width={18} height={18} /> Chiedi un appuntamento a {mioPt.nome}
        </button>
      )}
      {mioPt && chiedi && (
        <NuovaRichiesta
          nomePt={mioPt.nome}
          impegni={impegni}
          onChiudi={() => setChiedi(false)}
          onMandata={() => {
            setChiedi(false)
            rileggi()
          }}
        />
      )}

      {tutti === null ? (
        <p className="muted">Un attimo…</p>
      ) : lista.length === 0 ? (
        <div className="empty">
          <div className="big">📅</div>
          <p>
            Nessun appuntamento.
            {mioPt
              ? ` Chiedine uno a ${mioPt.nome}: scrivi il motivo e i giorni e gli orari in cui puoi.`
              : ' Qui arrivano le richieste dei tuoi atleti.'}
          </p>
        </div>
      ) : (
        <>
          <Sezione titolo="Tocca a te" voci={daDecidere} card={card} />
          <Sezione titolo="In attesa di risposta" voci={inAttesa} card={card} />
          <Sezione titolo="Fissati" voci={fissati} card={card} />
          <Sezione titolo="Annullati" voci={annullati} card={card} />
        </>
      )}
    </div>
  )
}

function Sezione({ titolo, voci, card }) {
  if (!voci.length) return null
  return (
    <>
      <div className="section-title" style={{ marginTop: 14 }}>
        {titolo} · {voci.length}
      </div>
      <div className="stack" style={{ gap: 8 }}>{voci.map(card)}</div>
    </>
  )
}

function CardAppuntamento({ app: a, io, altro, impegni, evidenziato, onCambiato }) {
  const [rispondi, setRispondi] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')
  const sonoPt = a.ptId === io
  const mio = toccaAMe(a, io)
  const suoi = orariDellAltro(a, io)
  const miei = mieiAperti(a, io)
  const nota = notaDellAltro(a, io)
  const scartati = a.orari.filter((o) => o.stato === 'rifiutato')

  const fai = async (azione) => {
    setOccupato(true)
    setErrore('')
    const r = await azione()
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    setRispondi(false)
    onCambiato()
  }
  const annulla = () => {
    if (!window.confirm(a.stato === 'fissato' ? 'Annullare l’appuntamento fissato?' : 'Lasciare perdere questa richiesta?')) return
    fai(() => annullaAppuntamento(a.id))
  }

  return (
    <div id={'app-' + a.id} className="card" style={{ borderColor: evidenziato || mio ? 'var(--accent)' : undefined }}>
      <div style={{ fontWeight: 800, fontSize: 15.5 }}>{sonoPt ? altro : `Con ${altro}`}</div>
      {a.motivo && (
        <p style={{ fontSize: 14, lineHeight: 1.45, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
          <span className="muted">Motivo: </span>
          {a.motivo}
        </p>
      )}

      {a.stato === 'fissato' && (
        <div style={{ marginTop: 10 }}>
          <span className="badge badge-good">Fissato: {orarioInParole({ giorno: a.giorno, ora: a.ora })}</span>
        </div>
      )}
      {a.stato === 'annullato' && (
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {a.ultimoDa === io ? 'Annullato da te' : `Annullato da ${altro}`}
          {a.giorno ? `: era fissato per ${orarioInParole({ giorno: a.giorno, ora: a.ora })}` : ''}
        </div>
      )}

      {a.stato === 'trattativa' && mio && (
        <>
          {nota && <p style={{ fontSize: 14, lineHeight: 1.45, margin: '10px 0 0' }}>«{nota}»</p>}
          <div className="muted" style={{ fontSize: 12.5, margin: '10px 0 6px' }}>
            {suoi.length === 1 ? `${altro} può in questo orario: ti va bene?` : `${altro} può in questi orari: ne va bene uno?`}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {suoi.map((o) => {
              // Già impegnato a quell'ora (in qualunque ruolo): non si accetta.
              const impegno = orarioImpegnato(o, impegni)
              return (
                <div key={o.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>
                    {orarioInParole(o)}
                    {impegno && (
                      <span className="muted" style={{ display: 'block', fontWeight: 400, fontSize: 12.5 }}>
                        Hai già un impegno: {impegno.titolo} alle {impegno.ora}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    disabled={occupato || !!impegno}
                    onClick={() => fai(() => accettaOrario(o.id))}
                  >
                    Va bene
                  </button>
                </div>
              )
            })}
          </div>
          {!rispondi && (
            <button type="button" className="btn btn-block btn-sm" style={{ marginTop: 10 }} onClick={() => setRispondi(true)}>
              Nessuno va bene: proponi altri orari
            </button>
          )}
          {rispondi && (
            <AltriOrari
              impegni={impegni}
              rifiutati={new Set([...rifiutati(a), ...suoi.map((o) => `${o.giorno} ${o.ora}`)])}
              altro={altro}
              occupato={occupato}
              onAnnulla={() => setRispondi(false)}
              onManda={(orari, n) => fai(() => controproponiOrari(a.id, orari, n))}
            />
          )}
        </>
      )}

      {a.stato === 'trattativa' && !mio && (
        <>
          <div className="muted" style={{ fontSize: 12.5, margin: '10px 0 6px' }}>
            {miei.length === 1 ? 'Hai proposto' : 'Hai proposto questi orari'}: aspetta che {altro} ne scelga uno o ne
            mandi altri.
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {miei.map((o) => (
              <span key={o.id} className="badge">{orarioInParole(o)}</span>
            ))}
          </div>
        </>
      )}

      {a.stato === 'trattativa' && scartati.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
          Già scartati: {scartati.map((o) => orarioInParole(o)).join(' · ')}
        </div>
      )}

      {errore && <p className="form-error">{errore}</p>}

      {a.stato !== 'annullato' && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ display: 'flex', marginTop: 8, paddingLeft: 0 }} disabled={occupato} onClick={annulla}>
          {a.stato === 'fissato' ? 'Annulla l’appuntamento' : 'Lascia perdere'}
        </button>
      )}
    </div>
  )
}

// La richiesta dell'atleta: il motivo e gli orari.
function NuovaRichiesta({ nomePt, impegni, onChiudi, onMandata }) {
  const [motivo, setMotivo] = useState('')
  const [orari, setOrari] = useState(() => [{ giorno: domani(), ora: '18:00' }])
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')

  const manda = async () => {
    const p = problemaOrari(orari, new Set(), new Date(), impegni)
    if (p) return setErrore(p)
    setOccupato(true)
    setErrore('')
    const r = await chiediAppuntamento(motivo, orari)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    onMandata()
  }

  return (
    <div className="card" style={{ marginBottom: 14, borderColor: 'var(--accent)' }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>Appuntamento con {nomePt}</div>
      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="motivo-app">Motivo</label>
        <textarea
          id="motivo-app"
          className="textarea"
          value={motivo}
          maxLength={500}
          placeholder="Es. Vorrei rivedere lo stacco, sento la schiena."
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>
      <div className="section-title" style={{ marginTop: 4 }}>Quando puoi</div>
      <EditorOrari orari={orari} impegni={impegni} onChange={setOrari} />
      {errore && <p className="form-error">{errore}</p>}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="btn grow" onClick={onChiudi}>
          Annulla
        </button>
        <button type="button" className="btn btn-accent grow" onClick={manda} disabled={occupato}>
          {occupato ? 'Invio…' : 'Manda la richiesta'}
        </button>
      </div>
    </div>
  )
}

// Rispondere con altri orari: quelli dell'altro si scartano, e non tornano.
function AltriOrari({ rifiutati: giaScartati, impegni, altro, occupato, onAnnulla, onManda }) {
  const [orari, setOrari] = useState(() => [{ giorno: domani(), ora: '18:00' }])
  const [nota, setNota] = useState('')
  const [errore, setErrore] = useState('')
  const manda = () => {
    const p = problemaOrari(orari, giaScartati, new Date(), impegni)
    if (p) return setErrore(p)
    setErrore('')
    onManda(orari, nota)
  }
  return (
    <div style={{ marginTop: 12 }}>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
        Gli orari di {altro} vengono scartati e non si possono riproporre. Metti i tuoi:
      </div>
      <EditorOrari orari={orari} impegni={impegni} onChange={setOrari} />
      <div className="field" style={{ margin: '8px 0 0' }}>
        <input
          className="input"
          aria-label={`Messaggio per ${altro}`}
          value={nota}
          maxLength={500}
          placeholder="Messaggio (facoltativo)"
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
      {errore && <p className="form-error">{errore}</p>}
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button type="button" className="btn grow btn-sm" onClick={onAnnulla}>
          Annulla
        </button>
        <button type="button" className="btn btn-accent grow btn-sm" onClick={manda} disabled={occupato}>
          Manda gli orari
        </button>
      </div>
    </div>
  )
}

// La lista di giorni e orari: una riga per orario, da aggiungere e togliere.
// L'ora si sceglie fra le fasce (lib/orariAppuntamento → FASCE): quelle dove
// hai già un impegno ci sono ma non si scelgono. Cambiando giorno, se l'ora
// scelta lì è occupata si passa alla prima libera.
function EditorOrari({ orari, impegni = [], onChange }) {
  const cambia = (i, campo, valore) =>
    onChange(
      orari.map((o, j) => {
        if (j !== i) return o
        const nuovo = { ...o, [campo]: valore }
        if (campo === 'giorno' && orarioImpegnato(nuovo, impegni)) nuovo.ora = primaFasciaLibera(valore, impegni, o.ora) || o.ora
        return nuovo
      }),
    )
  const aggiungi = () => {
    const giorno = orari.at(-1)?.giorno || domani()
    onChange([...orari, { giorno, ora: primaFasciaLibera(giorno, impegni, orari.at(-1)?.ora || '18:00') || '18:00' }])
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      {orari.map((o, i) => {
        const fasce = !o.ora || FASCE.includes(o.ora) ? FASCE : [...FASCE, o.ora].sort()
        const impegno = orarioImpegnato(o, impegni)
        return (
          <div key={i}>
            <div className="row" style={{ gap: 6 }}>
              <input
                type="date"
                className="input grow"
                aria-label={`Giorno ${i + 1}`}
                min={giornoIso()}
                value={o.giorno}
                onChange={(e) => cambia(i, 'giorno', e.target.value)}
              />
              <select
                className="input"
                style={{ width: 132 }}
                aria-label={`Ora ${i + 1}`}
                value={o.ora}
                onChange={(e) => cambia(i, 'ora', e.target.value)}
              >
                {fasce.map((ora) => {
                  const occupata = !!orarioImpegnato({ giorno: o.giorno, ora }, impegni)
                  return (
                    <option key={ora} value={ora} disabled={occupata}>
                      {ora}
                      {occupata ? ' · impegnato' : ''}
                    </option>
                  )
                })}
              </select>
              <button
                type="button"
                className="icon-btn"
                aria-label="Togli questo orario"
                disabled={orari.length === 1}
                onClick={() => onChange(orari.filter((_, j) => j !== i))}
              >
                <IconClose width={16} height={16} />
              </button>
            </div>
            {impegno && (
              <p className="form-error" style={{ margin: '2px 2px 0', fontSize: 12.5 }}>
                Hai già un impegno: {impegno.titolo} alle {impegno.ora}.
              </p>
            )}
          </div>
        )
      })}
      {orari.length < MAX_ORARI && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={aggiungi}>
          <IconPlus width={14} height={14} /> Aggiungi un orario
        </button>
      )}
    </div>
  )
}
