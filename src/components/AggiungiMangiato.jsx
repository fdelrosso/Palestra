import { useMemo, useRef, useState } from 'react'
import { analizzaTesto } from '../lib/diario'
import { alimentoDaId, macroDi } from '../lib/alimenti'
import { cercaFraIMiei, normalizzaCiboMio } from '../lib/cibiMiei'
import { cercaPerCodice, cercaPerNome } from '../lib/ricercaCibo'
import ScannerCodice from './ScannerCodice'
import { IconClose, IconSearch } from './icons'

// ---------------------------------------------------------------------------
// "Cosa hai mangiato": si scrive, si cerca o si inquadra, e i valori compaiono
// qui dentro. Non si esce mai dall'app.
//
// Tre strade, in ordine di velocità:
//   1. SI SCRIVE. "150g di pollo e una banana" viene letto subito, senza rete,
//      dai miei cibi e dal catalogo. È la strada di tutti i giorni.
//   2. SI CERCA ONLINE. Quello che non si riconosce non diventa un numero
//      inventato: diventa un tasto "Cerca online", e i prodotti veri (marca
//      compresa) arrivano da Open Food Facts.
//   3. SI INQUADRA il codice a barre, che è la stessa ricerca senza digitare.
//
// ⚠️ Quello che si trova online, o che si scrive a mano, viene RICORDATO
// (`onRicorda`): la volta dopo si riconosce da solo e senza rete. È quello che
// fa sì che dopo due settimane la propria spesa sia tutta dentro l'app.
//
// ⚠️ Nessun numero viene inventato mai. Un prodotto senza valori nutrizionali
// — su Open Food Facts capita, i dati li mettono gli utenti — si mostra con i
// campi vuoti da riempire, non con una stima.
// ---------------------------------------------------------------------------

const MACRO = [
  ['kcal', 'kcal'],
  ['proteine', 'Prot.'],
  ['carbo', 'Carbo'],
  ['grassi', 'Grassi'],
]

// Da un alimento (catalogo, mio, o trovato online) alla voce di diario per N
// grammi. Un posto solo: i macro si calcolano sempre nello stesso modo.
function voceDa(alimento, grammi) {
  return {
    testo: alimento.nome,
    nome: alimento.marca ? `${alimento.nome} (${alimento.marca})` : alimento.nome,
    alimentoId: alimento.id,
    grammi: Math.round(grammi),
    ...macroDi(alimento, grammi),
    stimata: false,
  }
}

export default function AggiungiMangiato({ cibiMiei, onAggiungi, onRicorda, onChiudi }) {
  const [testo, setTesto] = useState('')
  // Correzioni per voce: grammi (riconosciute) o macro a mano (sconosciute).
  const [tocchi, setTocchi] = useState({})
  const [pasto, setPasto] = useState('')
  // La ricerca online aperta: per quale voce, cosa si cerca, cosa è tornato.
  const [ricerca, setRicerca] = useState(null)
  const [scanner, setScanner] = useState(false)
  // Alimenti scelti online o col codice, in attesa dei grammi.
  const [scelti, setScelti] = useState([])
  const richiesta = useRef(0)

  const analisi = useMemo(() => analizzaTesto(testo, cibiMiei), [testo, cibiMiei])

  // Le voci lette dal testo, più le correzioni fatte a mano.
  const vociTesto = useMemo(
    () =>
      analisi.voci.map((v) => {
        const t = tocchi[v.id] || {}
        if (v.riconosciuto) {
          if (t.grammi == null) return v
          const g = Number(t.grammi) || 0
          const alimento = alimentoDaId(v.alimentoId) || (cibiMiei || []).find((c) => c.id === v.alimentoId)
          return { ...v, grammi: g, stimata: false, ...macroDi(alimento, g) }
        }
        return {
          ...v,
          kcal: Number(t.kcal) || 0,
          proteine: Number(t.proteine) || 0,
          carbo: Number(t.carbo) || 0,
          grassi: Number(t.grassi) || 0,
        }
      }),
    [analisi, tocchi, cibiMiei],
  )

  const tutte = [...vociTesto, ...scelti.map((s) => voceDa(s.alimento, s.grammi))]
  const totale = tutte.reduce((a, v) => a + (v.kcal || 0), 0)
  const tocca = (id, campo) => (e) =>
    setTocchi((t) => ({ ...t, [id]: { ...t[id], [campo]: e.target.value } }))

  // ---- ricerca online ----
  const apriRicerca = (perVoce, iniziale) =>
    setRicerca({ perVoce, testo: iniziale || '', risultati: [], caricando: false, errore: '' })

  const cerca = async (q) => {
    const mio = (richiesta.current += 1)
    setRicerca((r) => ({ ...r, testo: q, caricando: true, errore: '', risultati: [] }))
    try {
      const risultati = await cercaPerNome(q)
      if (richiesta.current !== mio) return
      setRicerca((r) => ({
        ...r,
        caricando: false,
        risultati,
        errore: risultati.length === 0 ? `Non ho trovato niente per «${q}».` : '',
      }))
    } catch (e) {
      if (richiesta.current !== mio) return
      setRicerca((r) => ({ ...r, caricando: false, errore: e.message }))
    }
  }

  const daCodice = async (codice) => {
    setScanner(false)
    setRicerca({ perVoce: null, testo: codice, risultati: [], caricando: true, errore: '' })
    try {
      const prodotto = await cercaPerCodice(codice)
      if (!prodotto) {
        setRicerca((r) => ({
          ...r,
          caricando: false,
          errore: `Il codice ${codice} non è in elenco. Prova a cercarlo per nome, o scrivi tu i valori.`,
        }))
        return
      }
      setRicerca(null)
      scegli(prodotto, null)
    } catch (e) {
      setRicerca((r) => ({ ...r, caricando: false, errore: e.message }))
    }
  }

  // Un alimento scelto (online o col codice): si ricorda subito e si mette in
  // attesa dei grammi. ⚠️ Si ricorda anche se poi non si aggiunge al diario:
  // averlo cercato basta a dire che interessa.
  const scegli = (prodotto, perVoce) => {
    const cibo = normalizzaCiboMio(prodotto)
    if (!cibo) {
      setRicerca({
        perVoce,
        testo: prodotto.nome,
        risultati: [],
        caricando: false,
        errore: 'Di questo prodotto non conosco i valori: scrivili tu qui sotto.',
      })
      return
    }
    onRicorda?.(cibo)
    setScelti((s) => [...s, { alimento: cibo, grammi: cibo.pezzo || 100, chiave: `${cibo.id}:${s.length}` }])
    // Se la ricerca era partita da una voce scritta, quella voce ha finito il
    // suo compito: si toglie dal testo, se no finirebbe contata due volte.
    if (perVoce) {
      const v = analisi.voci.find((x) => x.id === perVoce)
      if (v) setTesto((t) => t.split(v.testo).join('').replace(/^[\s,;+]+|[\s,;+]+$/g, ''))
    }
    setRicerca(null)
  }

  const conferma = () => {
    const buone = tutte.filter((v) => v.kcal > 0 || v.proteine > 0 || v.carbo > 0 || v.grassi > 0)
    if (buone.length === 0) return
    // Anche quello scritto a mano diventa un cibo mio: la prossima volta si
    // riconosce da solo.
    for (const v of buone) {
      if (v.alimentoId || !v.grammi) continue
      const per100 = 100 / v.grammi
      onRicorda?.(
        normalizzaCiboMio({
          nome: v.nome,
          m: { p: v.proteine * per100, c: v.carbo * per100, g: v.grassi * per100 },
          kcal: Math.round(v.kcal * per100),
        }),
      )
    }
    onAggiungi(buone.map((v) => ({ ...v, pasto: pasto.trim() })))
  }

  const suggeriti = cercaFraIMiei(testo.split(/[,;+\n]/).pop() || '', cibiMiei, 4)

  return (
    <div className="card" style={{ marginTop: 4 }}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button className="btn btn-sm grow" onClick={() => setScanner(true)}>
          📷 Codice a barre
        </button>
        <button className="btn btn-sm grow" onClick={() => apriRicerca(null, testo.trim())}>
          <IconSearch width={15} height={15} /> Cerca un prodotto
        </button>
      </div>

      <div className="field">
        <label htmlFor="diario-testo">Cosa hai mangiato</label>
        <textarea
          id="diario-testo"
          className="textarea"
          rows={2}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="150g di pollo, 80g di riso e un cucchiaio di olio"
          autoFocus
        />
      </div>
      <div className="vis-hint" style={{ marginTop: -4, marginBottom: 10 }}>
        Separa con virgole o con «e». Se non scrivi la quantità ne immagino una e te lo dico.
      </div>

      {/* Quello che si è già salvato una volta, per non riscriverlo tutto. */}
      {suggeriti.length > 0 && (
        <div className="gruppo-chips" style={{ marginBottom: 10 }}>
          {suggeriti.map((c) => (
            <button
              key={c.id}
              className="chip"
              onClick={() => setScelti((s) => [...s, { alimento: c, grammi: c.pezzo || 100, chiave: `${c.id}:${s.length}` }])}
            >
              + {c.nome}
            </button>
          ))}
        </div>
      )}

      {/* Gli alimenti scelti online o col codice: manca solo la quantità. */}
      {scelti.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {scelti.map((s, i) => {
            const v = voceDa(s.alimento, s.grammi)
            return (
              <div key={s.chiave} className="voce-letta">
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <div className="voce-diario-nome grow">{v.nome}</div>
                  <button
                    className="icon-btn"
                    aria-label={`Togli ${v.nome}`}
                    onClick={() => setScelti((lista) => lista.filter((_, k) => k !== i))}
                  >
                    <IconClose width={15} height={15} />
                  </button>
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <input
                    className="input input-sm"
                    style={{ width: 90 }}
                    type="number"
                    inputMode="numeric"
                    aria-label={`Grammi di ${v.nome}`}
                    value={s.grammi}
                    onChange={(e) =>
                      setScelti((lista) =>
                        lista.map((x, k) => (k === i ? { ...x, grammi: Number(e.target.value) || 0 } : x)),
                      )
                    }
                  />
                  <span className="muted" style={{ fontSize: 13 }}>g</span>
                  <span className="voce-diario-macro grow" style={{ textAlign: 'right' }}>
                    {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quello che si è scritto, letto voce per voce. */}
      {vociTesto.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {vociTesto.map((v) => (
            <div key={v.id} className={'voce-letta' + (v.riconosciuto ? '' : ' ignota')}>
              <div className="voce-diario-nome">
                {v.nome}
                {v.riconosciuto && v.stimata && <span className="badge badge-warn">quantità stimata</span>}
                {!v.riconosciuto && <span className="badge badge-warn">non lo conosco</span>}
              </div>

              {v.riconosciuto ? (
                <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <input
                    className="input input-sm"
                    style={{ width: 90 }}
                    type="number"
                    inputMode="numeric"
                    aria-label={`Grammi di ${v.nome}`}
                    value={tocchi[v.id]?.grammi ?? v.grammi ?? ''}
                    onChange={tocca(v.id, 'grammi')}
                  />
                  <span className="muted" style={{ fontSize: 13 }}>g</span>
                  <span className="voce-diario-macro grow" style={{ textAlign: 'right' }}>
                    {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
                  </span>
                </div>
              ) : (
                <>
                  <div className="row" style={{ gap: 8, margin: '6px 0' }}>
                    <button className="btn btn-sm grow" onClick={() => apriRicerca(v.id, v.nome)}>
                      <IconSearch width={14} height={14} /> Cerca «{v.nome}» online
                    </button>
                  </div>
                  <div className="vis-hint" style={{ marginBottom: 6 }}>
                    Oppure scrivi tu i suoi valori: li ricordo e non te li richiedo più.
                  </div>
                  <div className="grid-4">
                    {MACRO.map(([campo, lab]) => (
                      <input
                        key={campo}
                        className="input input-sm"
                        type="number"
                        inputMode="numeric"
                        placeholder={lab}
                        aria-label={`${lab} di ${v.nome}`}
                        value={tocchi[v.id]?.[campo] ?? ''}
                        onChange={tocca(v.id, campo)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="field">
        <label htmlFor="diario-pasto">A che pasto (facoltativo)</label>
        <input
          id="diario-pasto"
          className="input"
          value={pasto}
          onChange={(e) => setPasto(e.target.value)}
          placeholder="Es. Pranzo"
          maxLength={30}
        />
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={onChiudi}>
          Annulla
        </button>
        <button className="btn btn-accent grow" disabled={totale <= 0} onClick={conferma}>
          Aggiungi{totale > 0 ? ` ${totale} kcal` : ''}
        </button>
      </div>

      {scanner && <ScannerCodice onCodice={daCodice} onChiudi={() => setScanner(false)} />}
      {ricerca && (
        <RisultatiRicerca
          stato={ricerca}
          onCerca={cerca}
          onScegli={(p) => scegli(p, ricerca.perVoce)}
          onChiudi={() => setRicerca(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- la ricerca
function RisultatiRicerca({ stato, onCerca, onScegli, onChiudi }) {
  const [q, setQ] = useState(stato.testo || '')
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Cerca un prodotto" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Cerca un prodotto</h3>
          <button className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>

        <form
          className="row"
          style={{ gap: 8, margin: '12px 0' }}
          onSubmit={(e) => {
            e.preventDefault()
            onCerca(q.trim())
          }}
        >
          <input
            className="input grow"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Es. yogurt greco Fage"
            autoFocus
          />
          <button className="btn btn-accent" type="submit" disabled={q.trim().length < 3}>
            Cerca
          </button>
        </form>

        {stato.caricando && <p className="muted" style={{ fontSize: 13.5 }}>Sto cercando…</p>}
        {stato.errore && <p className="form-error" style={{ marginTop: 0 }}>{stato.errore}</p>}

        <div className="stack" style={{ gap: 6, maxHeight: '45vh', overflowY: 'auto' }}>
          {stato.risultati.map((p) => (
            <button key={p.id} className="voce-letta" style={{ textAlign: 'left' }} onClick={() => onScegli(p)}>
              <div className="voce-diario-nome">
                {p.nome}
                {p.senzaValori && <span className="badge badge-warn">senza valori</span>}
              </div>
              <div className="voce-diario-macro">
                {[p.marca, p.confezione].filter(Boolean).join(' · ')}
                {p.senzaValori
                  ? ''
                  : ` — ${p.kcal ?? Math.round(p.m.p * 4 + p.m.c * 4 + p.m.g * 9)} kcal/100g · P ${p.m.p} · C ${p.m.c} · G ${p.m.g}`}
              </div>
            </button>
          ))}
        </div>

        <p className="vis-hint" style={{ marginTop: 10 }}>
          I prodotti arrivano da Open Food Facts, una banca dati aperta compilata dagli utenti: i
          valori sono quelli dell'etichetta, ma non tutti i prodotti sono completi.
        </p>
      </div>
    </div>
  )
}
