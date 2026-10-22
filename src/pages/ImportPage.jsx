import { useState } from 'react'
import { leggiScheda } from '../lib/parser'
import { ESEMPIO_FORMATO, REGOLE_FORMATO } from '../lib/formatoScheda'
import { gruppiEsercizio, patchGruppi } from '../lib/eserciziLibreria'
import { navigate, goBack, routes } from '../lib/router'
import { IconBack } from '../components/icons'
import { rimpicciolisciImmagine } from '../lib/media'
import { supabase } from '../lib/supabase'
import { BOZZA_LAVORO, BOZZA_MIA, controlloDellaBozza, salvaBozzaPerAtleta } from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Importa una scheda da un testo incollato: si incolla il testo e l'app lo
// legge (lib/parser). Prima del parser il testo (o la foto, o il PDF) passa da
// un'AI di Mistral (api/riscrivi) che lo riscrive nel FORMATO di
// lib/formatoScheda: così il messaggio di un PT qualunque va bene com'è. Senza
// rete o senza AI (npm run dev senza chiave) il testo va al parser così com'è.
// Il testo riscritto torna nella casella: chi importa vede cosa ha capito l'AI.
// Letta, la scheda va nello STESSO editor a passi di quella
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

// Il PDF passa intero; la foto rimpicciolita (2000px bastano a leggere il
// testo, e Vercel non accetta richieste sopra i 4,5MB).
const PDF_MAX_MB = 3

function inDataUrl(blob) {
  return new Promise((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.onerror = () => ko(r.error)
    r.readAsDataURL(blob)
  })
}

async function riscriviConAi(testo, file) {
  const corpo = { testo }
  if (file) {
    const blob = file.type === 'application/pdf' ? file : await rimpicciolisciImmagine(file, { lato: 2000, qualita: 0.85 })
    corpo.file = await inDataUrl(blob)
  }
  const { data } = await supabase.auth.getSession()
  const r = await fetch('/api/riscrivi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify(corpo),
  })
  const risposta = await r.json().catch(() => ({}))
  if (!r.ok || !risposta.ok) throw new Error(risposta.errore || 'Lettura non riuscita, riprova più tardi')
  return risposta.testo
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
  const [file, setFile] = useState(null)
  const [leggendo, setLeggendo] = useState(false)
  const [errore, setErrore] = useState('')

  const leggi = async () => {
    if (!testo.trim() && !file) return
    setLeggendo(true)
    setErrore('')
    let daLeggere = testo
    try {
      daLeggere = await riscriviConAi(testo, file)
      setTesto(daLeggere)
      setFile(null)
    } catch (e) {
      setLeggendo(false)
      // Una foto senza AI non si legge; un testo sì, col parser da solo.
      if (file) return setErrore(e.message === 'Failed to fetch' ? 'Sei offline? Riprova appena hai rete' : e.message)
      console.warn('riscrivi: uso il parser da solo', e)
    }
    setLeggendo(false)
    const { scheda, problemi } = leggiScheda(daLeggere, nome)
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
    salvaBozzaPerAtleta(chiave, conIpotesi, null, { problemi, daControllare, testo: daLeggere, nome })
    navigate(perLavoro ? routes.schedaLavoro('nuova') : perAtleta ? routes.schedaPerAtleta(perAtleta) : routes.editor(null))
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
        <label htmlFor="import-testo">Incolla qui la scheda, scritta come ti è arrivata</label>
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

      <div className="field row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="btn btn-sm">
          {file ? 'Cambia file' : 'Oppure allega una foto o un PDF'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (f.type === 'application/pdf' && f.size > PDF_MAX_MB * 1024 * 1024) {
                return setErrore(`Il PDF è troppo pesante (massimo ${PDF_MAX_MB}MB): prova con una foto delle pagine`)
              }
              setErrore('')
              setFile(f)
            }}
          />
        </label>
        {file && (
          <>
            <span className="muted" style={{ fontSize: 13 }}>
              {file.name}
            </span>
            <button type="button" className="btn btn-sm" onClick={() => setFile(null)}>
              Togli
            </button>
          </>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
        La legge un’AI (Mistral) e la riscrive nel formato dell’app: nel passo dopo controlli tu che
        sia giusta.
      </p>

      <details className="card guida-formato">
        <summary>Come scriverla</summary>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '8px 0' }}>
          Non serve: l’AI la riscrive così da sola. Ma se la scrivi tu, una riga per esercizio.
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

      {vuota && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>
          Non ho trovato nessun esercizio: controlla il testo, o apri “Come scriverla”.
        </div>
      )}
      {errore && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>
          {errore}
        </div>
      )}
      <button
        className="btn btn-accent btn-lg btn-block"
        disabled={(!testo.trim() && !file) || leggendo}
        onClick={leggi}
      >
        {leggendo ? 'Leggo la scheda…' : 'Avanti'}
      </button>
    </div>
  )
}
