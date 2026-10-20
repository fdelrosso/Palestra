import { useState } from 'react'
import { leggiScheda } from '../lib/parser'
import { ESEMPIO_FORMATO, PROMPT_AI, REGOLE_FORMATO } from '../lib/formatoScheda'
import { gruppiEsercizio, patchGruppi } from '../lib/eserciziLibreria'
import { navigate, goBack, routes } from '../lib/router'
import { IconBack, IconClipboard } from '../components/icons'
import { BOZZA_LAVORO, BOZZA_MIA, controlloDellaBozza, salvaBozzaPerAtleta } from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Importa una scheda da un testo incollato: si incolla il testo e l'app lo
// legge (lib/parser). Accanto c'è il FORMATO (lib/formatoScheda): le regole,
// un esempio, e un prompt da dare a un'AI per riscrivere così il messaggio di
// un PT qualunque. Letta, la scheda va nello STESSO editor a passi di quella
// scritta a mano (EditorPage), con la bozza e il suo `controllo`: le righe non
// capite in cima, gli esercizi coi gruppi indovinati segnati "da controllare",
// il nome della libreria proposto nel foglio dell'esercizio.
//
// ⚠️ I gruppi sono obbligatori, e ci sono per un difetto visto davvero: le
// schede importate non avevano gruppi, l'app li indovinava dal nome, e sbagliava
// in silenzio — lo "Stacco rumeno" di una scheda vera non accendeva le gambe
// nel recap. I messaggi del PT sono scritti a modo suo ("Military", "Lat
// inversa più stretta delle spalle"): indovinare è il punto di partenza, non la
// risposta. Quindi l'ipotesi si propone, ma la scheda non si salva finché ogni
// esercizio non ha i suoi muscoli (EditorPage, muscoliMancanti).
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

// `perAtleta` (id): un PT incolla la scheda di un suo atleta, e la scheda va
// nell'editor "Scheda per…". `perLavoro`: lo stesso, verso una nuova scheda di
// lavoro (SchedaLavoroPage). Senza nessuno dei due: una scheda nuova sua.
export default function ImportPage({ perAtleta = null, perLavoro = false }) {
  const chiave = perLavoro ? BOZZA_LAVORO : perAtleta || BOZZA_MIA
  // Tornando dall'editor per correggere il testo, lo si ritrova com'era.
  const [prima] = useState(() => controlloDellaBozza(chiave))
  const [nome, setNome] = useState(prima?.nome || '')
  const [testo, setTesto] = useState(prima?.testo || '')
  const [vuota, setVuota] = useState(false)
  const [copiato, setCopiato] = useState('')

  const leggi = () => {
    if (!testo.trim()) return
    const { scheda, problemi } = leggiScheda(testo, nome)
    // Gli esercizi a cui il gruppo l'ha messo l'app: nell'editor si segnano
    // "da controllare", perché chi controlla guardi quelli prima degli altri.
    const daControllare = []
    const conIpotesi = {
      ...scheda,
      giorni: scheda.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => {
          const g0 = gruppiEsercizio(e)
          if (g0.length > 0 && !(e.gruppi || []).length) daControllare.push(e.id)
          return { ...e, ...patchGruppi(g0) }
        }),
      })),
    }
    if (!esercizi(conIpotesi).length) {
      setVuota(true)
      return
    }
    salvaBozzaPerAtleta(chiave, conIpotesi, null, { problemi, daControllare, testo, nome })
    navigate(perLavoro ? routes.schedaLavoro('nuova') : perAtleta ? routes.schedaPerAtleta(perAtleta) : routes.editor(null))
  }

  const copiaEDi = async (cosa, chi) => {
    setCopiato((await copia(cosa)) ? chi : 'errore')
    setTimeout(() => setCopiato(''), 2500)
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
          placeholder="Es. Forza & Ipertrofia, ottobre"
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
          onChange={(e) => {
            setTesto(e.target.value)
            setVuota(false)
          }}
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

      {vuota && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>
          Non ho trovato nessun esercizio: controlla il testo, o apri “Come scriverla”.
        </div>
      )}
      <button className="btn btn-accent btn-lg btn-block" disabled={!testo.trim()} onClick={leggi}>
        Avanti
      </button>
    </div>
  )
}
