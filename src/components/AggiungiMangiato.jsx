import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { analizzaTesto } from '../lib/diario'
import { alimentoDaId, macroDi, normalizzaCibo } from '../lib/alimenti'
import { normalizzaCiboMio } from '../lib/cibiMiei'
import { cercaAlimenti, riassuntoPer100 } from '../lib/catalogoCibi'
import { cercaPerCodice, cercaPerNome } from '../lib/ricercaCibo'
import { UNITA_SCELTA, converti, grammiDa, numeroIt, pesoPezzo } from '../lib/unita'
import ScannerCodice from './ScannerCodice'
import { IconClose, IconCodiceBarre, IconPlus, IconSearch } from './icons'

// ---------------------------------------------------------------------------
// "Cosa hai mangiato": si cerca, si scrive o si inquadra, e i valori compaiono
// qui dentro. Non si esce mai dall'app.
//
// UN CAMPO SOLO. Mentre si scrive compaiono gli alimenti che rispondono: prima
// i propri, poi quelli del catalogo — subito, anche senza rete — e poco dopo
// i prodotti veri (marca compresa) trovati online su Open Food Facts. ⚠️ A chi
// guarda non si dice da dove arriva un risultato: è un elenco solo, e si
// tocca quello giusto. Prima di scrivere ci sono gli alimenti usati di recente.
//
// Chi preferisce SCRIVERE la frase ("150g di pollo e una banana") la scrive
// nello stesso campo: appena c'è un numero o una virgola la frase viene letta
// voce per voce, dai miei cibi e dal catalogo, senza rete. Quello che non si
// riconosce non diventa un numero inventato: si cerca, o se ne scrivono i
// valori.
//
// Il codice a barre è la stessa ricerca senza digitare.
//
// ⚠️ Quello che si trova online, o che si scrive a mano, viene RICORDATO
// (`onRicorda`): la volta dopo si trova da solo e senza rete. È quello che fa
// sì che dopo due settimane la propria spesa sia tutta dentro l'app.
//
// ⚠️ Nessun numero viene inventato mai. I prodotti online senza valori
// nutrizionali — su Open Food Facts capita, i dati li mettono gli utenti —
// non si mostrano: non servirebbero a niente.
//
// ⚠️ LA QUANTITÀ NON SI SCRIVE SOLO IN GRAMMI. Dopo aver inquadrato un pacco
// di biscotti nessuno sa dire "sedici grammi": sa dire "due biscotti". Quindi
// accanto al numero c'è sempre l'unità (lib/unita), e se sono pezzi e quanto
// pesa un pezzo non si sa, lo si CHIEDE una volta sola e poi lo si ricorda.
//
// ⚠️ I CAMPI RESTANO VUOTI SE UNO LI SVUOTA. La quantità si tiene come TESTO,
// non come numero: chi cancella "100" per scrivere "80" deve vedere il campo
// vuoto, non uno zero da scavalcare. Il numero si ricava solo al momento dei
// conti, e una quantità vuota vale niente — non zero calorie, proprio niente.
// ---------------------------------------------------------------------------

const MACRO = [
  ['kcal', 'kcal'],
  ['proteine', 'Prot.'],
  ['carbo', 'Carbo'],
  ['grassi', 'Grassi'],
]

// Una frase da leggere, non un nome da cercare: c'è una quantità o un elenco.
// "riso con ceci" è un piatto da leggere, come "pollo e riso".
const eUnaFrase = (testo) => /\d|[,;+\n]|\s(e|con)\s/i.test(testo)

const daOnline = (a) => a?.fonte === 'openfoodfacts'

/** L'alimento con dentro il peso di un pezzo appena scritto a mano. */
function conPezzoScritto(alimento, pezzo) {
  const p = numeroIt(pezzo)
  return p && p > 0 ? { ...alimento, pezzo: p } : alimento
}

// Da un alimento (catalogo, mio, o trovato online) alla voce di diario. Un
// posto solo: i macro si calcolano sempre nello stesso modo.
function voceDa(alimento, quantita, unita, pezzo) {
  const a = conPezzoScritto(alimento, pezzo)
  const grammi = grammiDa(quantita, unita, a) || 0
  return {
    testo: alimento.nome,
    nome: alimento.marca ? `${alimento.nome} (${alimento.marca})` : alimento.nome,
    alimentoId: alimento.id,
    grammi: Math.round(grammi),
    quantita: numeroIt(quantita),
    unita,
    ...macroDi(alimento, grammi),
    stimata: false,
  }
}

/**
 * I risultati per quello che si sta scrivendo: quelli che si conoscono già
 * (subito) e, dopo una breve pausa nella scrittura, quelli online. Una
 * risposta arrivata tardi per una parola già cambiata si butta.
 */
function useRicercaCibi(testo, cibiMiei, attiva = true) {
  const q = attiva ? testo.trim() : ''
  const locali = useMemo(() => cercaAlimenti(q, cibiMiei, 8), [q, cibiMiei])
  const [online, setOnline] = useState({ per: '', risultati: [], errore: '' })

  useEffect(() => {
    if (q.length < 3) return undefined
    let annullata = false
    const timer = setTimeout(async () => {
      try {
        const risultati = await cercaPerNome(q)
        if (!annullata) setOnline({ per: q, risultati: risultati.filter((a) => !a.senzaValori), errore: '' })
      } catch (e) {
        if (annullata) return
        setOnline({
          per: q,
          risultati: [],
          errore: e.diRete ? 'Senza connessione trovo solo gli alimenti che conosco già.' : e.message,
        })
      }
    }, 450)
    return () => {
      annullata = true
      clearTimeout(timer)
    }
  }, [q])

  const aggiornati = online.per === q
  // Lo stesso prodotto già fra i miei (stesso codice, o stesso nome e marca)
  // non si ripete.
  const chiave = (a) => `${normalizzaCibo(a.nome)}|${normalizzaCibo(a.marca)}`
  const noti = new Set(locali.map(chiave))
  const codici = new Set(locali.map((a) => a.codice).filter(Boolean))
  const daRete = aggiornati ? online.risultati.filter((a) => !codici.has(a.codice) && !noti.has(chiave(a))) : []

  return {
    risultati: [...locali, ...daRete],
    cerca: q.length >= 3 && !aggiornati,
    errore: aggiornati ? online.errore : '',
    vuota: q.length >= 2 && aggiornati && locali.length + daRete.length === 0,
  }
}

function ListaRisultati({ ricerca, testo, onScegli }) {
  return (
    <div className="lista-cibi">
      {ricerca.risultati.map((a) => (
        <button key={a.id} type="button" className="riga-alimento" onClick={() => onScegli(a)}>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="voce-diario-nome">
              {a.nome}
              {a.marca && <span className="faint" style={{ fontWeight: 500 }}>{a.marca}</span>}
            </span>
            <span className="voce-diario-macro">
              {[a.confezione, `${riassuntoPer100(a)} per 100 g`].filter(Boolean).join(' · ')}
            </span>
          </span>
          <IconPlus width={16} height={16} className="faint" />
        </button>
      ))}
      {ricerca.cerca && <p className="muted" style={{ fontSize: 13, margin: '2px 2px 0' }}>Cerco…</p>}
      {ricerca.vuota && !ricerca.errore && (
        <p className="muted" style={{ fontSize: 13, margin: '2px 2px 0' }}>
          Niente per «{testo.trim()}». Scrivilo con la quantità («100 g di {testo.trim()}») e mettine tu i valori.
        </p>
      )}
      {ricerca.errore && <p className="muted" style={{ fontSize: 13, margin: '2px 2px 0' }}>{ricerca.errore}</p>}
    </div>
  )
}

/**
 * Il campo della quantità: un numero, l'unità, e — se servono i pezzi di un
 * alimento di cui non si sa quanto pesa uno — la domanda che lo chiede.
 *
 * ⚠️ Cambiando unità il numero SI CONVERTE (150 g di yogurt diventano 1
 * vasetto). Lasciarlo com'è vorrebbe dire trasformare "150 g" in "150 pezzi",
 * cioè quindici chili di biscotti, con l'aria di non aver fatto niente.
 */
export function Quantita({ alimento, valore, onCambia, nome, children }) {
  const a = conPezzoScritto(alimento, valore.pezzo)
  const servePezzo = valore.unita === 'pz' && pesoPezzo(a) == null
  const cambiaUnita = (u) =>
    onCambia({ ...valore, unita: u, quantita: converti(valore.quantita, valore.unita, u, a) })

  return (
    <>
      <div className="row riga-quantita">
        <input
          className="input input-sm qta-numero"
          type="text"
          inputMode="decimal"
          aria-label={`Quantità di ${nome}`}
          value={valore.quantita}
          onChange={(e) => onCambia({ ...valore, quantita: e.target.value })}
        />
        <select
          className="select input-sm qta-unita"
          aria-label={`Unità di misura di ${nome}`}
          value={valore.unita}
          onChange={(e) => cambiaUnita(e.target.value)}
        >
          {UNITA_SCELTA.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
        {children}
      </div>

      {servePezzo && (
        <div className="row riga-pezzo">
          <span>Quanto pesa un pezzo?</span>
          <input
            className="input input-sm qta-numero"
            type="text"
            inputMode="decimal"
            aria-label={`Peso di un pezzo di ${nome}`}
            value={valore.pezzo}
            onChange={(e) => onCambia({ ...valore, pezzo: e.target.value })}
            placeholder="es. 8"
          />
          <span className="muted">g</span>
        </div>
      )}
    </>
  )
}

// `pasto`: il pasto per cui si scrive, quando lo si sa già (lo si apre dalla
// card della colazione): allora la domanda "a che pasto" non si fa.
// `recenti`: gli alimenti usati di recente (lib/catalogoCibi, cibiRecenti).
// `dosePer`: i grammi che la dieta dà a un alimento (lib/piatti), o null: è la
// quantità di partenza quando non la si scrive.
export default function AggiungiMangiato({
  cibiMiei,
  recenti = [],
  dosePer = null,
  onAggiungi,
  onRicorda,
  onChiudi,
  pasto: pastoFisso = null,
}) {
  const [testo, setTesto] = useState('')
  // Correzioni per voce: quantità (riconosciute) o macro a mano (sconosciute).
  const [tocchi, setTocchi] = useState({})
  const [pasto, setPasto] = useState('')
  // La voce della frase che non si conosceva e per cui si sta cercando.
  const [cercaPer, setCercaPer] = useState(null)
  const [scanner, setScanner] = useState(false)
  const [avviso, setAvviso] = useState('')
  // Alimenti scelti dalla ricerca o col codice, in attesa della quantità.
  const [scelti, setScelti] = useState([])
  const campo = useRef(null)

  const frase = eUnaFrase(testo)
  const ricerca = useRicercaCibi(testo, cibiMiei, !frase)
  const analisi = useMemo(
    () => (frase ? analizzaTesto(testo, cibiMiei, { dosePer }) : { voci: [] }),
    [frase, testo, cibiMiei, dosePer],
  )

  const alimentoDi = (id) => alimentoDaId(id) || (cibiMiei || []).find((c) => c.id === id)

  // Cosa c'è scritto nei campi di una voce letta dal testo: quello che ha
  // toccato la persona, se no quello che diceva la frase.
  const valoreDi = (v) => ({
    quantita: tocchi[v.id]?.quantita ?? String(v.quantita ?? v.grammi ?? ''),
    unita: tocchi[v.id]?.unita ?? v.unita ?? 'g',
    pezzo: tocchi[v.id]?.pezzo ?? '',
  })

  // Le voci lette dal testo, più le correzioni fatte a mano.
  const vociTesto = useMemo(
    () =>
      analisi.voci.map((v) => {
        const t = tocchi[v.id] || {}
        if (v.riconosciuto) {
          if (t.quantita == null && t.unita == null && t.pezzo == null) return v
          const alimento = alimentoDaId(v.alimentoId) || (cibiMiei || []).find((c) => c.id === v.alimentoId)
          const a = conPezzoScritto(alimento, t.pezzo)
          const g = grammiDa(t.quantita ?? v.quantita ?? v.grammi, t.unita ?? v.unita, a) || 0
          return {
            ...v,
            grammi: Math.round(g),
            quantita: numeroIt(t.quantita ?? v.quantita),
            unita: t.unita ?? v.unita ?? 'g',
            stimata: false,
            ...macroDi(alimento, g),
          }
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

  const tutte = [...vociTesto, ...scelti.map((s) => voceDa(s.alimento, s.quantita, s.unita, s.pezzo))]
  const totale = tutte.reduce((a, v) => a + (v.kcal || 0), 0)
  const tocca = (id, campo) => (e) =>
    setTocchi((t) => ({ ...t, [id]: { ...t[id], [campo]: e.target.value } }))
  const toccaQuantita = (id) => (valore) => setTocchi((t) => ({ ...t, [id]: { ...t[id], ...valore } }))

  const aggiungiScelto = (cibo) =>
    setScelti((s) => [
      ...s,
      {
        alimento: cibo,
        quantita: String(dosePer?.(cibo) ?? cibo.pezzo ?? 100),
        unita: 'g',
        pezzo: '',
        chiave: `${cibo.id}:${s.length}`,
      },
    ])

  // Un alimento scelto dalla ricerca o col codice: si mette in attesa della
  // quantità. Quello trovato online si ricorda subito — ⚠️ anche se poi non si
  // aggiunge al diario: averlo cercato basta a dire che interessa.
  const scegli = (prodotto, perVoce = null) => {
    const cibo = daOnline(prodotto) ? normalizzaCiboMio(prodotto) : prodotto
    if (!cibo) {
      setAvviso(`Di «${prodotto.nome}» non conosco i valori: scrivilo con la quantità e mettili tu.`)
      return
    }
    if (daOnline(prodotto)) onRicorda?.(cibo)
    aggiungiScelto(cibo)
    setAvviso('')
    // Se la ricerca era partita da una voce della frase, quella voce ha finito
    // il suo compito: si toglie dal testo, se no finirebbe contata due volte.
    if (perVoce) {
      const v = analisi.voci.find((x) => x.id === perVoce)
      if (v) setTesto((t) => t.split(v.testo).join('').replace(/^[\s,;+]+|[\s,;+]+$/g, ''))
    } else {
      setTesto('')
      campo.current?.focus()
    }
    setCercaPer(null)
  }

  const daCodice = async (codice) => {
    setScanner(false)
    setAvviso('Cerco il codice…')
    try {
      const prodotto = await cercaPerCodice(codice)
      if (!prodotto) {
        setAvviso(`Il codice ${codice} non lo trovo. Cerca il prodotto per nome, o scrivi tu i valori.`)
        return
      }
      if (prodotto.senzaValori) {
        setAvviso(`Di «${prodotto.nome}» non conosco i valori: scrivilo con la quantità e mettili tu.`)
        return
      }
      scegli(prodotto)
    } catch (e) {
      setAvviso(e.message)
    }
  }

  // Quanto pesa un pezzo l'ha appena scritto la persona: è la cosa più utile
  // che si possa imparare di un prodotto, e la si impara una volta sola.
  // ⚠️ Solo per i cibi miei: il catalogo non è mio e non si tocca.
  const ricordaPezzo = (alimento, pezzo) => {
    const p = numeroIt(pezzo)
    if (!p || p <= 0 || !alimento?.mio || pesoPezzo(alimento) === p) return
    onRicorda?.({ ...alimento, pezzo: p })
  }

  const conferma = () => {
    const buone = tutte.filter((v) => v.kcal > 0 || v.proteine > 0 || v.carbo > 0 || v.grassi > 0)
    if (buone.length === 0) return
    for (const s of scelti) ricordaPezzo(s.alimento, s.pezzo)
    for (const [id, t] of Object.entries(tocchi)) {
      const v = analisi.voci.find((x) => x.id === id)
      if (v?.alimentoId) ricordaPezzo(alimentoDi(v.alimentoId), t.pezzo)
    }
    // Anche quello scritto a mano diventa un cibo mio: la prossima volta si
    // trova da solo.
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
    onAggiungi(buone.map((v) => ({ ...v, pasto: pastoFisso ?? pasto.trim() })))
  }

  const voceCercata = cercaPer ? analisi.voci.find((v) => v.id === cercaPer) : null

  return (
    <div className="card" style={{ marginTop: 4 }}>
      <div className="search-box cerca-cibo">
        <IconSearch width={17} height={17} className="faint" aria-hidden="true" />
        <input
          ref={campo}
          className="search-input"
          value={testo}
          onChange={(e) => {
            setTesto(e.target.value)
            setAvviso('')
          }}
          placeholder="Cerca un alimento, o scrivi «150 g di pollo»"
          aria-label="Cosa hai mangiato"
          autoFocus
        />
        {testo && (
          <button className="icon-btn" aria-label="Svuota" onClick={() => setTesto('')}>
            <IconClose width={15} height={15} />
          </button>
        )}
        <button className="icon-btn" aria-label="Inquadra il codice a barre" onClick={() => setScanner(true)}>
          <IconCodiceBarre width={20} height={20} />
        </button>
      </div>
      {avviso && <p className="muted" style={{ fontSize: 13, margin: '0 2px 10px' }}>{avviso}</p>}

      {/* Prima di scrivere: gli alimenti usati di recente. */}
      {!testo.trim() && recenti.length > 0 && (
        <>
          <div className="faint" style={{ fontSize: 12, margin: '0 2px 6px' }}>Usati di recente</div>
          <div className="gruppo-chips" style={{ marginBottom: 10 }}>
            {recenti.map((c) => (
              <button key={c.id} className="chip" onClick={() => aggiungiScelto(c)}>
                + {c.nome}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mentre si scrive un nome: i risultati, toccabili. */}
      {!frase && testo.trim().length >= 2 && (
        <div style={{ marginBottom: 12 }}>
          <ListaRisultati ricerca={ricerca} testo={testo} onScegli={(a) => scegli(a)} />
        </div>
      )}

      {/* Gli alimenti scelti: manca solo la quantità. */}
      {scelti.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {scelti.map((s, i) => {
            const v = voceDa(s.alimento, s.quantita, s.unita, s.pezzo)
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
                <Quantita
                  alimento={s.alimento}
                  nome={v.nome}
                  valore={s}
                  onCambia={(nuovo) => setScelti((lista) => lista.map((x, k) => (k === i ? { ...x, ...nuovo } : x)))}
                >
                  <span className="voce-diario-macro grow" style={{ textAlign: 'right' }}>
                    {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
                  </span>
                </Quantita>
              </div>
            )
          })}
        </div>
      )}

      {/* La frase scritta, letta voce per voce. */}
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
                <Quantita
                  alimento={alimentoDi(v.alimentoId)}
                  nome={v.nome}
                  valore={valoreDi(v)}
                  onCambia={toccaQuantita(v.id)}
                >
                  <span className="voce-diario-macro grow" style={{ textAlign: 'right' }}>
                    {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
                  </span>
                </Quantita>
              ) : (
                <>
                  <div className="row" style={{ gap: 8, margin: '6px 0' }}>
                    <button className="btn btn-sm grow" onClick={() => setCercaPer(v.id)}>
                      <IconSearch width={14} height={14} /> Cerca «{v.nome}»
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

      {pastoFisso == null && (
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
      )}

      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={onChiudi}>
          Annulla
        </button>
        <button className="btn btn-accent grow" disabled={totale <= 0} onClick={conferma}>
          Aggiungi{totale > 0 ? ` ${totale} kcal` : ''}
        </button>
      </div>

      {scanner && <ScannerCodice onCodice={daCodice} onChiudi={() => setScanner(false)} />}
      {voceCercata && (
        <FoglioRicerca
          iniziale={voceCercata.nome}
          cibiMiei={cibiMiei}
          onScegli={(a) => scegli(a, voceCercata.id)}
          onChiudi={() => setCercaPer(null)}
        />
      )}
    </div>
  )
}

// ------------------------------------------- la ricerca per una voce ignota
// La stessa ricerca del campo, in un foglio dal basso: per la voce della frase
// che non si è riconosciuta.
function FoglioRicerca({ iniziale, cibiMiei, onScegli, onChiudi }) {
  const [q, setQ] = useState(iniziale || '')
  const ricerca = useRicercaCibi(q, cibiMiei)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Cerca un alimento" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>Cerca un alimento</h3>
          <button className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>
        <div className="search-box cerca-cibo">
          <IconSearch width={17} height={17} className="faint" aria-hidden="true" />
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Es. yogurt greco Fage"
            aria-label="Cerca un alimento"
            autoFocus
          />
        </div>
        {q.trim().length >= 2 && <ListaRisultati ricerca={ricerca} testo={q} onScegli={onScegli} />}
      </div>
    </div>,
    document.body,
  )
}
