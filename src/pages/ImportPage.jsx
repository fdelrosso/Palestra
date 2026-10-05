import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { leggiScheda } from '../lib/parser'
import { ESEMPIO_FORMATO, PROMPT_AI, REGOLE_FORMATO } from '../lib/formatoScheda'
import { gruppiEsercizio, nomeInLibreria, patchGruppi } from '../lib/eserciziLibreria'
import { formatCarico, formatSerieRip, formattaRecupero } from '../lib/schema'
import { navigate, goBack, routes } from '../lib/router'
import SceltaGruppi from '../components/SceltaGruppi'
import { IconBack, IconCatena, IconClipboard } from '../components/icons'

// ---------------------------------------------------------------------------
// Importa una scheda da un testo incollato. In DUE passaggi:
//
//   1. si incolla il testo e l'app lo legge (lib/parser). Accanto c'è il
//      FORMATO (lib/formatoScheda): le regole, un esempio, e un prompt da dare
//      a un'AI per riscrivere così il messaggio di un PT qualunque;
//   2. il CONTROLLO prima di salvare: le righe che non si sono capite (in
//      rosso, col testo com'era), lo schema letto di ogni esercizio, il nome
//      della libreria quando somiglia, e i gruppi muscolari.
//
// ⚠️ I gruppi sono obbligatori, e ci sono per un difetto visto davvero: le
// schede importate non avevano gruppi, l'app li indovinava dal nome, e sbagliava
// in silenzio — lo "Stacco rumeno" di una scheda vera non accendeva le gambe
// nel recap. I messaggi del PT sono scritti a modo suo ("Military", "Lat
// inversa più stretta delle spalle"): indovinare è il punto di partenza, non la
// risposta. Quindi l'ipotesi si propone, ma la scheda non si salva finché ogni
// esercizio non ha almeno un gruppo.
//
// Più gruppi per esercizio, e il primo è il principale: i dip sono petto E
// tricipiti (components/SceltaGruppi).
// ---------------------------------------------------------------------------

function esercizi(scheda) {
  return (scheda?.giorni || []).flatMap((g) => (g.tipo === 'rest' ? [] : g.esercizi || []))
}

async function copia(testo) {
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    return false
  }
}

export default function ImportPage() {
  const { aggiungiScheda } = useStore()
  const [nome, setNome] = useState('')
  const [testo, setTesto] = useState('')
  const [bozza, setBozza] = useState(null)
  const [problemi, setProblemi] = useState([])
  const [copiato, setCopiato] = useState('')
  // Gli esercizi a cui il gruppo l'ha messo l'app: si segnano, perché chi
  // controlla guardi quelli prima degli altri.
  const [indovinati, setIndovinati] = useState(() => new Set())

  const leggi = () => {
    if (!testo.trim()) return
    const { scheda, problemi: p } = leggiScheda(testo, nome)
    const ipotesi = new Set()
    const conIpotesi = {
      ...scheda,
      giorni: scheda.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => {
          const g0 = gruppiEsercizio(e)
          if (g0.length > 0 && !(e.gruppi || []).length) ipotesi.add(e.id)
          return { ...e, ...patchGruppi(g0) }
        }),
      })),
    }
    setIndovinati(ipotesi)
    setProblemi(p)
    setBozza(conIpotesi)
    window.scrollTo?.(0, 0)
  }

  const patchEsercizio = (id, patch) =>
    setBozza((s) => ({
      ...s,
      giorni: s.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    }))

  const cambiaGruppi = (id, gruppi) => {
    patchEsercizio(id, patchGruppi(gruppi))
    // Toccato a mano: non è più un'ipotesi dell'app.
    setIndovinati((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
  }

  // Il nome della libreria al posto di quello scritto: i gruppi si rifanno da
  // lì, se erano un'ipotesi (quelli scelti a mano restano).
  const usaNome = (e, nuovo) => {
    const ipotesi = indovinati.has(e.id) || !(e.gruppi || []).length
    patchEsercizio(e.id, { nome: nuovo, ...(ipotesi ? patchGruppi(gruppiEsercizio({ nome: nuovo })) : {}) })
  }

  const senzaGruppo = useMemo(
    () => esercizi(bozza).filter((e) => !(e.gruppi || []).length).length,
    [bozza],
  )

  const salva = () => {
    if (!bozza || senzaGruppo > 0) return
    const salvata = aggiungiScheda(bozza)
    // Porta subito nell'editor per controllare serie, carichi e recuperi.
    navigate(routes.editor(salvata.id))
  }

  const copiaEDi = async (cosa, chi) => {
    setCopiato((await copia(cosa)) ? chi : 'errore')
    setTimeout(() => setCopiato(''), 2500)
  }

  // ------------------------------------------------ passaggio 2: il controllo
  if (bozza) {
    const tot = esercizi(bozza).length
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setBozza(null)} aria-label="Torna al testo">
            <IconBack />
          </button>
          <h1>Controlla la scheda</h1>
        </div>

        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 2px 12px' }}>
          <strong style={{ color: 'var(--text)' }}>{bozza.nome}</strong> · {bozza.numeroSettimane}{' '}
          {bozza.numeroSettimane === 1 ? 'settimana' : 'settimane'} · {tot}{' '}
          {tot === 1 ? 'esercizio' : 'esercizi'}. Per ogni esercizio accendi i muscoli che lavora —
          anche più di uno: i dip sono petto <em>e</em> tricipiti. Il primo è il principale (★).
          Quelli segnati <strong>da controllare</strong> li ho indovinati io dal nome.
        </p>

        {problemi.length > 0 && (
          <div className="card import-problemi" role="alert">
            <strong>
              {problemi.length === 1 ? 'Una riga da sistemare' : `${problemi.length} righe da sistemare`}
            </strong>
            <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 8px' }}>
              Tornando al testo le puoi correggere; oppure salva e sistemale nell’editor.
            </p>
            <ul>
              {problemi.map((p, k) => (
                <li key={k}>
                  <span className="import-riga">Riga {p.riga}</span> <code>{p.testo}</code>
                  <span className="import-motivo">{p.motivo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {bozza.giorni
          .filter((g) => g.tipo !== 'rest' && (g.esercizi || []).length > 0)
          .map((g) => (
            <div key={g.id} style={{ marginBottom: 16 }}>
              <div className="section-title">{g.nome || 'Giorno'}</div>
              <div className="stack" style={{ gap: 10 }}>
                {g.esercizi.map((e) => {
                  const vuoto = !(e.gruppi || []).length
                  const schema = e.variaPerSettimana ? e.settimane[0] : e.schemaBase
                  const libreria = nomeInLibreria(e.nome)
                  const riassunto = [formatSerieRip(schema), formatCarico(schema), formattaRecupero(schema) && `rec ${formattaRecupero(schema)}`]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <div
                      key={e.id}
                      className="card stack"
                      style={{
                        gap: 8,
                        ...(vuoto ? { borderColor: 'var(--danger)' } : null),
                      }}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 14.5, minWidth: 0, overflowWrap: 'anywhere' }}>
                          {e.insiemeAlPrecedente && (
                            <IconCatena width={14} height={14} style={{ marginRight: 4, verticalAlign: -2 }} aria-label="In superserie con il precedente" />
                          )}
                          {e.nome}
                        </strong>
                        {vuoto ? (
                          <span className="badge badge-danger">Manca il gruppo</span>
                        ) : indovinati.has(e.id) ? (
                          <span className="badge badge-warn">Da controllare</span>
                        ) : null}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {riassunto || <span style={{ color: 'var(--danger)' }}>Senza serie né ripetizioni</span>}
                        {e.variaPerSettimana && ' · cambia per settimana'}
                        {e.nota && <div className="ex-nota">{e.nota}</div>}
                      </div>
                      {libreria && (
                        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => usaNome(e, libreria)}>
                          Usa il nome della libreria: «{libreria}»
                        </button>
                      )}
                      <SceltaGruppi
                        compatto
                        valori={e.gruppi || []}
                        onChange={(gr) => cambiaGruppi(e.id, gr)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        <button
          className="btn btn-accent btn-lg btn-block"
          disabled={senzaGruppo > 0 || tot === 0}
          onClick={salva}
        >
          {tot === 0
            ? 'Nessun esercizio letto'
            : senzaGruppo > 0
              ? senzaGruppo === 1
                ? 'Manca il gruppo a 1 esercizio'
                : `Manca il gruppo a ${senzaGruppo} esercizi`
              : 'Salva e controlla la scheda'}
        </button>
      </div>
    )
  }

  // ------------------------------------------------ passaggio 1: il testo
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Importa da testo</h1>
      </div>

      <div className="field" style={{ marginTop: 6 }}>
        <label htmlFor="import-nome">Nome scheda</label>
        <input
          id="import-nome"
          className="input"
          value={nome}
          placeholder="Es. Forza & Ipertrofia — ottobre"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="import-testo">Incolla qui la scheda</label>
        <textarea
          id="import-testo"
          className="textarea"
          style={{ minHeight: 240, fontSize: 15, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          value={testo}
          placeholder={'Giorno A\nPanca piana 4x8 80kg rec 90s\nCroci ai cavi 3x12 rec 60s\n...'}
          onChange={(e) => setTesto(e.target.value)}
        />
      </div>

      <details className="card guida-formato">
        <summary>Come scriverla</summary>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '8px 0' }}>
          Una riga per esercizio. L’app capisce anche testi scritti diversamente (elenchi, inglese,
          “4 serie da 10”), ma così non sbaglia.
        </p>
        <dl className="regole-formato">
          {REGOLE_FORMATO.map(([come, cosa]) => (
            <div key={come}>
              <dt>
                <code>{come}</code>
              </dt>
              <dd>{cosa}</dd>
            </div>
          ))}
        </dl>
        <div className="section-title" style={{ margin: '12px 0 6px' }}>Esempio</div>
        <pre className="esempio-formato">{ESEMPIO_FORMATO}</pre>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={() => setTesto(ESEMPIO_FORMATO)}>
            Prova con l’esempio
          </button>
        </div>
      </details>

      <div className="card guida-formato">
        <strong style={{ fontSize: 14.5 }}>La scheda del PT è scritta a modo suo?</strong>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '4px 0 10px' }}>
          Copia questo prompt, incollalo in ChatGPT o Claude insieme al messaggio del PT, e incolla
          qui la risposta: è già nel formato giusto.
        </p>
        <button type="button" className="btn btn-sm" onClick={() => copiaEDi(PROMPT_AI, 'prompt')}>
          <IconClipboard width={15} height={15} />
          {copiato === 'prompt' ? 'Copiato!' : 'Copia il prompt per l’AI'}
        </button>
        {copiato === 'errore' && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            Non riesco a copiare: apri “Come scriverla” e usa l’esempio.
          </p>
        )}
      </div>

      <button className="btn btn-accent btn-lg btn-block" disabled={!testo.trim()} onClick={leggi}>
        Avanti: controlla la scheda
      </button>
    </div>
  )
}
