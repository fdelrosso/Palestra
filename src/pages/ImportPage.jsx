import { useState } from 'react'
import { leggiScheda } from '../lib/parser'
import { gruppiEsercizio, inLibreria, patchGruppi, sottogruppiEsercizio } from '../lib/eserciziLibreria'
import { navigate, goBack, routes } from '../lib/router'
import { IconBack } from '../components/icons'
import { rimpicciolisciImmagine } from '../lib/media'
import { testoDaXlsx } from '../lib/leggiXlsx'
import { supabase } from '../lib/supabase'
import { BOZZA_LAVORO, BOZZA_MIA, controlloDellaBozza, salvaBozzaPerAtleta } from '../lib/proposteScheda'

// ---------------------------------------------------------------------------
// Importa una scheda da una foto, un PDF, un Excel o un testo incollato, e l'app la
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
  return (scheda?.giorni || []).flatMap((g) => g.esercizi || [])
}

// Il PDF passa intero; la foto rimpicciolita (2000px bastano a leggere il
// testo, e Vercel non accetta richieste sopra i 4,5MB).
const PDF_MAX_MB = 3

// Excel e CSV non vanno all'AI come file: diventano testo qui (lib/leggiXlsx)
// e finiscono nella casella, come se li avessero incollati.
const FOGLIO = /\.(xlsx|xls|csv)$/i

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
  return risposta
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
    let ai = false
    let nomi = {}
    try {
      ;({ testo: daLeggere, nomi = {} } = await riscriviConAi(testo, file))
      ai = true
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
    // Non quelli scritti già col nome della libreria: i loro muscoli li dice
    // la libreria, non sono un'ipotesi.
    const daControllare = []
    const conIpotesi = {
      ...scheda,
      giorni: scheda.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => {
          // L'esercizio della libreria che l'AI ha riconosciuto: i suoi muscoli,
          // ma il nome resta quello del PT. ⚠️ L'AI a volte sbaglia esercizio
          // (le "Alzate 90°" del PT diventavano le alzate laterali): rinominare
          // cambierebbe l'esercizio in silenzio, il gruppo sbagliato di rado.
          // Il nome lo propone il foglio dell'esercizio (GiornoEditor).
          const lib = nomi[e.nome]
          if (lib && !(e.gruppi || []).length) {
            daControllare.push(e.id)
            return { ...e, ...patchGruppi(gruppiEsercizio({ nome: lib })), sottogruppi: sottogruppiEsercizio({ nome: lib }) }
          }
          const g0 = gruppiEsercizio(e)
          if (g0.length > 0 && !(e.gruppi || []).length && !inLibreria(e.nome)) daControllare.push(e.id)
          return { ...e, ...patchGruppi(g0) }
        }),
      })),
    }
    if (!esercizi(conIpotesi).length) {
      setVuota(true)
      return
    }
    salvaBozzaPerAtleta(chiave, conIpotesi, null, { problemi, daControllare, testo: daLeggere, nome, ai, nomi })
    navigate(perLavoro ? routes.schedaLavoro('nuova') : perAtleta ? routes.schedaPerAtleta(perAtleta) : routes.editor(null))
  }

  // ------------------------------------------------ passaggio 1: il testo
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Importa scheda</h1>
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

      <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 12px' }}>
        Da una foto, un PDF, un Excel o un testo: la legge un’AI (Mistral) e la riscrive nel formato dell’app.
        Nel passo dopo controlli tu che sia giusta.
      </p>

      <div className="field">
        {/* Foto e PDF prima del testo: è come arriva quasi sempre la scheda del PT. */}
        <label className="choice-card import-file">
          <span className="choice-emoji">📷</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>
              {file ? 'Cambia file' : 'Scegli una foto, un PDF o un Excel'}
            </span>
            <span className="muted" style={{ display: 'block', fontSize: 13.5, overflowWrap: 'anywhere' }}>
              {file ? file.name : `La foto del foglio, uno screenshot, il PDF o l’Excel del PT (PDF fino a ${PDF_MAX_MB}MB)`}
            </span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx,.xls,.csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (FOGLIO.test(f.name)) {
                if (/\.xls$/i.test(f.name)) {
                  return setErrore('I file .xls vecchi non si leggono: aprilo e salvalo come .xlsx, oppure fai una foto')
                }
                try {
                  const letto = /\.csv$/i.test(f.name) ? await f.text() : await testoDaXlsx(await f.arrayBuffer())
                  if (!letto.trim()) return setErrore('Questo file è vuoto')
                  setErrore('')
                  setVuota(false)
                  // Un file nuovo prende il posto di quello che c'era nella casella.
                  setTesto(letto)
                  setFile(null)
                  if (!nome) setNome(f.name.replace(FOGLIO, ''))
                } catch (err) {
                  setErrore(err.message || 'Non riesco a leggere questo file')
                }
                return
              }
              if (f.type === 'application/pdf' && f.size > PDF_MAX_MB * 1024 * 1024) {
                return setErrore(`Il PDF è troppo pesante (massimo ${PDF_MAX_MB}MB): prova con una foto delle pagine`)
              }
              setErrore('')
              setTesto('')
              setFile(f)
            }}
          />
        </label>
        {file && (
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setFile(null)}>
            Togli il file
          </button>
        )}
      </div>

      <div className="field">
        <label htmlFor="import-testo">Oppure incolla qui il testo, scritto come ti è arrivato</label>
        <textarea
          id="import-testo"
          className="textarea"
          style={{ minHeight: 200, fontSize: 15, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          value={testo}
          placeholder={'Giorno A\nPanca piana 4x8 80kg rec 90s\nCroci ai cavi 3x12 rec 60s\n...'}
          onChange={(e) => {
            setTesto(e.target.value)
            setVuota(false)
          }}
        />
      </div>

      {vuota && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>
          Non ho trovato nessun esercizio: controlla il testo o prova con una foto più nitida.
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
