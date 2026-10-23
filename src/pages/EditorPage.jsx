import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import {
  nuovaScheda,
  nuovoEsercizio,
  ricomponiGiorni,
  schemaPerSettimana,
  schemaVuoto,
  slotSettimana,
  GIORNI_SETTIMANA,
} from '../data/model'
import { esci, goBack, routes } from '../lib/router'
import { avanzaSeFinita } from '../lib/progression'
import { IconBack, IconTrash } from '../components/icons'
import EliminaScheda from '../components/EliminaScheda'
import { GiornoEditor } from '../components/GiornoEditor'
import VisibilitaPicker from '../components/VisibilitaPicker'
import { useAccount } from '../store/AccountContext'
import {
  BOZZA_LAVORO,
  BOZZA_MIA,
  controlloDellaBozza,
  lavoroDellaBozza,
  prendiBozzaPerAtleta,
  proponiScheda,
  salvaBozzaPerAtleta,
} from '../lib/proposteScheda'
import { eliminaSchedaLavoro, salvaSchedaLavoro } from '../lib/schedeLavoro'
import { conMuscoliScritti, muscoliMancanti } from '../lib/eserciziLibreria'

// Ridimensiona gli array `settimane` degli esercizi quando cambia il numero di settimane.
function resizeSettimane(scheda, n) {
  return {
    ...scheda,
    numeroSettimane: n,
    giorni: scheda.giorni.map((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) => {
        if (!e.variaPerSettimana) return e
        const cur = e.settimane || []
        const arr = Array.from({ length: n }, (_, i) =>
          schemaVuoto(cur[i] || cur[cur.length - 1] || {}),
        )
        return { ...e, settimane: arr }
      }),
    })),
  }
}

// Le pagine del flusso "scrivi una scheda": la freccia le salta tutte, e il
// salvataggio non ne lascia indietro nessuna. ⚠️ Prima salvare portava AVANTI
// alla scheda, e da lì la freccia riapriva l'editor: dopo tre modifiche per
// uscire si ripassava da sei pagine.
const FLUSSO = new Set(['nuova', 'editor', 'importa'])
const delFlusso = (r) => FLUSSO.has(r.name)
// Lo stesso per la scheda che un PT scrive a un atleta: si esce verso l'atleta.
const delFlussoPt = (r) => r.name === 'scheda-per-atleta' || r.name === 'importa-per-atleta'
const delFlussoLavoro = (r) => r.name === 'scheda-lavoro'

// `perAtleta` (id): un PT scrive una scheda per un suo atleta. Stesso editor,
// ma "Invia" al posto di "Salva": parte una PROPOSTA (lib/proposteScheda) e
// fra le schede del PT non resta niente. La bozza di partenza (una sua scheda,
// o il testo incollato) la lascia chi porta qui, in sessionStorage.
//
// `lavoro` ({ scheda, nuova }): una scheda di lavoro del PT (lib/schedeLavoro),
// da mandare poi a un atleta. "Salva" la mette fra le schede di lavoro, mai fra
// le sue personali. La carica pages/SchedaLavoroPage.
export default function EditorPage({ id, perAtleta = null, lavoro = null }) {
  const { getScheda, aggiungiScheda, aggiornaScheda } = useStore()
  const { mieiAtleti, utenteCorrente } = useAccount()
  const atleta = perAtleta ? mieiAtleti.find((a) => a.id === perAtleta) || null : null
  const esistente = id && !perAtleta && !lavoro ? getScheda(id) : null
  // La bozza lasciata da chi porta qui (lib/proposteScheda): per un atleta, per
  // le schede di lavoro (la legge SchedaLavoroPage), o una scheda nuova propria.
  const chiaveBozza = perAtleta || (lavoro ? (lavoro.nuova ? BOZZA_LAVORO : null) : id ? null : BOZZA_MIA)
  const [scheda, setScheda] = useState(() => {
    if (esistente) return structuredClone(esistente)
    if (lavoro?.scheda) return structuredClone(lavoro.scheda)
    const bozza = chiaveBozza ? prendiBozzaPerAtleta(chiaveBozza) : null
    if (bozza) return { ...structuredClone(bozza), id: nuovaScheda().id, completamenti: [], settimanaCorrente: 1 }
    return nuovaScheda({ nome: '', numeroSettimane: 5 })
  })
  const [notaPt, setNotaPt] = useState('')
  const [invio, setInvio] = useState({ inCorso: false, errore: '' })
  // Letta da un testo (ImportPage): le righe non capite, e gli esercizi coi
  // gruppi indovinati, segnati finché non li si apre.
  const [controllo] = useState(() => (chiaveBozza ? controlloDellaBozza(chiaveBozza) : null))
  const [problemiChiusi, setProblemiChiusi] = useState(false)
  const [daControllare, setDaControllare] = useState(() => new Set(controllo?.daControllare || []))
  const visto = (eid) =>
    setDaControllare((s) => {
      if (!s.has(eid)) return s
      const n = new Set(s)
      n.delete(eid)
      return n
    })

  // ---- helper di aggiornamento immutabile ----
  const patch = (p) => setScheda((s) => ({ ...s, ...p }))
  const patchGiorno = (gid, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => (g.id === gid ? { ...g, ...p } : g)),
    }))
  const patchEsercizio = (gid, eid, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) =>
        g.id === gid
          ? { ...g, esercizi: g.esercizi.map((e) => (e.id === eid ? { ...e, ...p } : e)) }
          : g,
      ),
    }))
  const patchSchema = (gid, eid, weekIdx, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => {
        if (g.id !== gid) return g
        return {
          ...g,
          esercizi: g.esercizi.map((e) => {
            if (e.id !== eid) return e
            if (weekIdx == null) return { ...e, schemaBase: { ...e.schemaBase, ...p } }
            const settimane = e.settimane.map((sc, i) => (i === weekIdx ? { ...sc, ...p } : sc))
            return { ...e, settimane }
          }),
        }
      }),
    }))

  // Il numero si applica quando si esce dal campo: applicato a ogni tasto,
  // svuotarlo per riscriverlo portava la scheda a 1 settimana e cancellava
  // gli schemi delle altre. Vuoto o non valido, resta quello di prima.
  const [bozzaSettimane, setBozzaSettimane] = useState(null)
  const confermaSettimane = () => {
    const n = parseInt(bozzaSettimane, 10)
    // ponytail: 52 è solo un tetto contro i refusi (un anno di settimane).
    if (n >= 1) setScheda((s) => resizeSettimane(s, Math.min(52, n)))
    setBozzaSettimane(null)
  }

  // Senza fine: la scheda non finisce e non cambia da una settimana all'altra.
  // Gli esercizi che variavano tengono lo schema della settimana in corso,
  // che è quello che si stava facendo.
  const toggleSenzaFine = () =>
    setScheda((s) => {
      if (s.senzaFine) return { ...s, senzaFine: false, settimanaCorrente: Math.min(s.settimanaCorrente, s.numeroSettimane) }
      // Con la settimana già finita si passa subito alla prossima.
      return avanzaSeFinita({
        ...s,
        senzaFine: true,
        giorni: s.giorni.map((g) => ({
          ...g,
          esercizi: g.esercizi.map((e) =>
            e.variaPerSettimana
              ? { ...e, variaPerSettimana: false, schemaBase: schemaVuoto(schemaPerSettimana(e, s.settimanaCorrente)) }
              : e,
          ),
        })),
      })
    })

  // Un tocco sul giorno della settimana gira: spento → allenamento → due
  // allenamenti (×2, Scheda.doppi) → spento. Gli array restano ordinati
  // (lunedì-first).
  const toggleGiornoSettimana = (idx) =>
    setScheda((s) => {
      const set = new Set(s.giorniSettimana || [])
      const doppi = new Set(s.doppi || [])
      if (doppi.has(idx)) {
        doppi.delete(idx)
        set.delete(idx)
      } else if (set.has(idx)) doppi.add(idx)
      else set.add(idx)
      const ordina = (x) => [...x].sort((a, b) => a - b)
      return { ...s, giorniSettimana: ordina(set), doppi: ordina(doppi) }
    })

  // Ogni scheda si scrive a passi: prima i dati e i giorni della settimana,
  // poi un allenamento alla volta (`attivo`, indice in `allenamenti`). Le copie
  // (copiaDi) seguono il loro originale e non si mostrano; i riposi non hanno
  // niente da scrivere.
  // Allenamenti diversi e giorni non devono coincidere: 2 su 4 giorni (A B A B,
  // i giorni in più sono copie) o 4 su 2 (A B, poi C D: il calendario li fa
  // girare). Vedi ricomponiGiorni.
  const allenamenti = scheda.giorni.filter((g) => g.tipo === 'workout' && !g.copiaDi)
  const [attivo, setAttivo] = useState(null)
  // Quanti allenamenti diversi: quelli già scritti; in una scheda vuota segue i
  // giorni scelti finché non lo si sceglie.
  const [diversi, setDiversi] = useState(() => allenamenti.length || null)
  // Un posto per allenamento: i giorni ×2 contano due (slotSettimana).
  const slot = slotSettimana(scheda)
  const nGiorni = slot.length
  const nDiversi = diversi ?? nGiorni
  const lettera = (i) => String.fromCharCode(65 + i) // A, B, C...
  // Le prime settimane di calendario, finché ogni allenamento è uscito una
  // volta. Un doppio si legge "Lun A+B".
  const anteprima = nGiorni
    ? Array.from({ length: Math.ceil(nDiversi / nGiorni) }, (_, w) =>
        scheda.giorniSettimana
          .map(
            (gs) =>
              `${GIORNI_SETTIMANA[gs].breve} ` +
              slot
                .map((x, p) => (x === gs ? lettera((w * nGiorni + p) % nDiversi) : null))
                .filter(Boolean)
                .join('+'),
          )
          .join(' · '),
      )
    : []
  const avanti = () => {
    const { giorni, persi } = ricomponiGiorni(scheda.giorni, nGiorni, nDiversi)
    const scritti = persi.filter((g) => g.esercizi.length)
    if (scritti.length && !confirm(`Togliere ${scritti.map((g) => g.nome).join(', ')} e i suoi esercizi?`)) return
    patch({ giorni })
    vaiAlGiorno(0)
  }
  const vaiAlGiorno = (i) => {
    setAttivo(i)
    window.scrollTo(0, 0)
  }
  // `patch`: quello scelto nella ricerca (nome, gruppi, lo schema dell'ultima volta).
  const addEsercizio = (gid, patch = {}) =>
    patchGiorno(gid, {
      esercizi: [...scheda.giorni.find((g) => g.id === gid).esercizi, nuovoEsercizio(patch)],
    })
  const removeEsercizio = (gid, eid) =>
    patchGiorno(gid, {
      esercizi: scheda.giorni.find((g) => g.id === gid).esercizi.filter((e) => e.id !== eid),
    })

  const toggleVaria = (gid, eid) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => {
        if (g.id !== gid) return g
        return {
          ...g,
          esercizi: g.esercizi.map((e) => {
            if (e.id !== eid) return e
            if (!e.variaPerSettimana) {
              // base -> per settimana: copia lo schema base su ogni settimana
              const settimane = Array.from({ length: s.numeroSettimane }, () =>
                schemaVuoto(e.schemaBase),
              )
              return { ...e, variaPerSettimana: true, settimane }
            }
            // per settimana -> base: usa la prima settimana come base
            return { ...e, variaPerSettimana: false, schemaBase: schemaVuoto(e.settimane[0]) }
          }),
        }
      }),
    }))

  // Come nel foglio dell'esercizio, che non si chiude senza: fuori dalla
  // libreria gruppo e muscolo li dice chi scrive (muscoliMancanti). Si va
  // all'allenamento del primo che manca, dove la riga lo dice.
  const mancanoMuscoli = () => {
    const quali = allenamenti.flatMap((g) => g.esercizi.filter((e) => muscoliMancanti(e)))
    if (!quali.length) return false
    const n = quali.length
    setInvio({
      inCorso: false,
      errore: `Manca il gruppo o il muscolo a ${n === 1 ? '1 esercizio' : `${n} esercizi`}: ${quali.map((e) => e.nome).join(', ')}.`,
    })
    vaiAlGiorno(allenamenti.findIndex((g) => g.esercizi.includes(quali[0])))
    return true
  }

  const invia = async () => {
    if (invio.inCorso) return
    if (!scheda.giorni.some((g) => g.tipo === 'workout' && g.esercizi.length > 0)) {
      setInvio({ inCorso: false, errore: 'Metti almeno un giorno con qualche esercizio.' })
      return
    }
    if (mancanoMuscoli()) return
    setInvio({ inCorso: true, errore: '' })
    const r = await proponiScheda(perAtleta, conMuscoliScritti(scheda), notaPt)
    if (!r.ok) {
      setInvio({ inCorso: false, errore: r.errore })
      return
    }
    // Partita da una scheda di lavoro: ora è fra le inviate, lì non serve più.
    const daLavoro = lavoroDellaBozza(perAtleta)
    if (daLavoro) await eliminaSchedaLavoro(daLavoro)
    salvaBozzaPerAtleta(chiaveBozza, null)
    esci({ salta: delFlussoPt, poi: routes.atleta(perAtleta) })
  }

  // Fra le schede di lavoro: in modo `lavoro`, o "Salva senza inviare" da una
  // scheda per un atleta (ci torna la stessa, se veniva da lì).
  const salvaLavoro = async () => {
    if (invio.inCorso || mancanoMuscoli()) return
    setInvio({ inCorso: true, errore: '' })
    const daLavoro = perAtleta ? lavoroDellaBozza(perAtleta) : null
    const r = await salvaSchedaLavoro(utenteCorrente?.id, conMuscoliScritti(daLavoro ? { ...scheda, id: daLavoro } : scheda))
    if (!r.ok) {
      setInvio({ inCorso: false, errore: r.errore })
      return
    }
    if (chiaveBozza) salvaBozzaPerAtleta(chiaveBozza, null)
    if (perAtleta) esci({ salta: delFlussoPt, poi: routes.schedeLavoro() })
    else esci({ salta: delFlussoLavoro, poi: routes.schedeLavoro() })
  }

  const eliminaLavoro = async () => {
    if (!window.confirm(`Eliminare «${scheda.nome || 'questa scheda'}»?`)) return
    const r = await eliminaSchedaLavoro(scheda.id)
    if (!r.ok) return setInvio({ inCorso: false, errore: r.errore })
    esci({ salta: delFlussoLavoro, poi: routes.schedeLavoro() })
  }

  const salva = () => {
    if (mancanoMuscoli()) return
    // I muscoli che l'editor mostra diventano quelli salvati (conMuscoliScritti).
    const daSalvare = conMuscoliScritti({ ...scheda, nome: scheda.nome.trim() || 'Scheda senza nome' })
    if (esistente) {
      aggiornaScheda(daSalvare)
      esci({ salta: delFlusso, poi: routes.scheda(daSalvare.id) })
    } else {
      const s = aggiungiScheda(daSalvare)
      // Salvata: la bozza (e il testo dell'import) non serve più.
      salvaBozzaPerAtleta(BOZZA_MIA, null)
      esci({ salta: delFlusso, poi: routes.scheda(s.id) })
    }
  }

  const [eliminare, setEliminare] = useState(false)
  // Eliminata o archiviata: anche la pagina della scheda si salta, nell'elenco
  // non c'è più.
  const fuori = () =>
    esci({
      salta: (r) => delFlusso(r) || (r.name === 'scheda' && r.id === scheda.id),
      poi: routes.home(),
    })

  if (perAtleta && !atleta) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" aria-label="Indietro" onClick={() => esci({ salta: delFlussoPt, riserva: routes.atleti() })}>
            <IconBack />
          </button>
          <h1>Nuova scheda</h1>
        </div>
        <div className="empty">
          <div className="big">🤝</div>
          <p>Questa persona non è fra i tuoi atleti.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <button
          className="icon-btn"
          aria-label="Indietro"
          onClick={() =>
            attivo != null
              ? setAttivo(null)
              : controllo
                // Letta da un testo: si torna al testo (ImportPage lo ritrova), per correggerlo.
                ? goBack()
                : perAtleta
              ? esci({ salta: delFlussoPt, riserva: routes.atleta(perAtleta) })
              : lavoro
                ? esci({ salta: delFlussoLavoro, riserva: routes.schedeLavoro() })
                : esci({ salta: delFlusso, riserva: esistente ? routes.scheda(esistente.id) : routes.home() })
          }
        >
          <IconBack />
        </button>
        <h1 style={perAtleta ? { fontSize: 17 } : undefined}>
          {perAtleta
            ? `Scheda per ${atleta.nome}`
            : lavoro
              ? 'Scheda di lavoro'
              : esistente
                ? 'Modifica scheda'
                : 'Nuova scheda'}
        </h1>
        {/* Si salva dal secondo passo: dal primo c'è "Avanti", che sistema i giorni. */}
        {attivo == null ? null : lavoro ? (
          <button className="btn btn-accent btn-sm" onClick={salvaLavoro} disabled={invio.inCorso}>
            {invio.inCorso ? 'Salvo…' : 'Salva'}
          </button>
        ) : perAtleta ? (
          <button className="btn btn-accent btn-sm" onClick={invia} disabled={invio.inCorso}>
            {invio.inCorso ? 'Invio…' : 'Invia'}
          </button>
        ) : (
          <button className="btn btn-accent btn-sm" onClick={salva}>
            Salva
          </button>
        )}
      </div>

      {lavoro && (
        <p className="muted" style={{ fontSize: 13, margin: '2px 2px 10px', lineHeight: 1.45 }}>
          Resta fra le tue schede di lavoro, non fra quelle con cui ti alleni. La mandi a un atleta da
          «Schede di lavoro».
        </p>
      )}
      {perAtleta && (
        <p className="muted" style={{ fontSize: 13, margin: '2px 2px 10px', lineHeight: 1.45 }}>
          {atleta.nome} la riceve come proposta: se la salva finisce fra le sue schede, e la rende
          attiva lui quando vuole.
        </p>
      )}
      {invio.errore && (
        <div className="riquadro riquadro-avviso" role="alert" style={{ marginBottom: 10 }}>
          {invio.errore}
        </div>
      )}

      {/* Le righe del testo che non si sono capite, com'erano scritte. */}
      {controllo?.problemi?.length > 0 && !problemiChiusi && (
        <div className="card import-problemi" role="alert">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <strong>
              {controllo.problemi.length === 1
                ? 'Una riga del testo non l’ho capita'
                : `${controllo.problemi.length} righe del testo non le ho capite`}
            </strong>
            <button className="btn btn-ghost btn-sm" onClick={() => setProblemiChiusi(true)}>
              Ok
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 8px' }}>
            Aggiungile qui, o torna indietro al testo e correggile.
          </p>
          <ul>
            {controllo.problemi.map((p, k) => (
              <li key={k}>
                <span className="import-riga">Riga {p.riga}</span> <code>{p.testo}</code>
                <span className="import-motivo">{p.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dati scheda */}
      {attivo == null && (
      <div className="card" style={{ marginTop: 6 }}>
        <div className="field">
          <label>Nome scheda</label>
          <input
            className="input"
            value={scheda.nome}
            placeholder="Es. Forza & Ipertrofia"
            onChange={(e) => patch({ nome: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Note (facoltative)</label>
          <textarea
            className="textarea"
            value={scheda.nota}
            placeholder="Es. rotazione A · B · Rest · C · D…"
            onChange={(e) => patch({ nota: e.target.value })}
          />
        </div>
        <div className="field">
          <div className="toggle-row">
            <span>
              <strong>Senza fine</strong>
              <span className="muted" style={{ display: 'block', fontSize: 12.5, lineHeight: 1.4 }}>
                Sempre gli stessi esercizi: finita una settimana riparte la successiva, e la
                scheda non si chiude mai.
              </span>
            </span>
            <button
              type="button"
              className={'switch' + (scheda.senzaFine ? ' on' : '')}
              onClick={toggleSenzaFine}
              role="switch"
              aria-checked={!!scheda.senzaFine}
              aria-label="Scheda senza fine"
            >
              <span className="knob" />
            </button>
          </div>
        </div>
        {!scheda.senzaFine && (
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Numero di settimane</label>
            <input
              className="input"
              inputMode="numeric"
              value={bozzaSettimane ?? scheda.numeroSettimane}
              onChange={(e) => setBozzaSettimane(e.target.value.replace(/\D/g, ''))}
              onBlur={confermaSettimane}
              onKeyDown={(e) => e.key === 'Enter' && confermaSettimane()}
            />
          </div>
        )}
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Giorni di allenamento</label>
          <div className="giorni-picker">
            {GIORNI_SETTIMANA.map((g) => {
              const doppio = scheda.doppi?.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  className={'giorno-chip' + (scheda.giorniSettimana.includes(g.id) ? ' on' : '')}
                  onClick={() => toggleGiornoSettimana(g.id)}
                  aria-pressed={scheda.giorniSettimana.includes(g.id)}
                  aria-label={g.label + (doppio ? ', due allenamenti' : '')}
                >
                  {g.breve}
                  {doppio && ' ×2'}
                </button>
              )
            })}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.4 }}>
            I giorni in cui ti alleni: il calendario ci mette gli allenamenti in
            ordine, e gli altri giorni sono riposo. Tocca di nuovo un giorno per
            farci due allenamenti (×2).
          </p>
        </div>

        <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label>Allenamenti diversi</label>
            {/* Letta da un testo, quanti sono lo dice il testo: si legge e basta.
                Toglierne uno vorrebbe dire buttare un giorno scritto. */}
            {controllo ? (
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>{nDiversi}</strong>
                <span className="muted"> · {allenamenti.map((g, i) => g.nome.trim() || lettera(i)).join(', ')}, dal testo</span>
              </p>
            ) : (
              <div className="giorni-picker">
                {/* ponytail: 7 come i giorni della settimana; un tetto, non una regola. */}
                {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={'giorno-chip' + (n === nDiversi ? ' on' : '')}
                    onClick={() => setDiversi(n)}
                    aria-pressed={n === nDiversi}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            {anteprima.length > 0 && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
                {anteprima.map((riga, w) => (
                  <span key={w} style={{ display: 'block' }}>
                    {anteprima.length > 1 && `${w + 1}ª settimana: `}
                    {riga}
                  </span>
                ))}
                {nDiversi < nGiorni && 'Ognuno lo scrivi una volta, e si ripete da solo.'}
                {/* ⚠️ La "settimana" della scheda è il giro di tutti gli allenamenti
                    (statoScheda): con più allenamenti che giorni dura di più. */}
                {nDiversi > nGiorni &&
                  !scheda.senzaFine &&
                  `Una settimana della scheda è il giro completo, da A a ${lettera(nDiversi - 1)}: ${scheda.numeroSettimane} settimane della scheda sono circa ${Math.round((scheda.numeroSettimane * nDiversi) / nGiorni)} di calendario.`}
              </p>
            )}
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />

        {perAtleta ? (
          // Chi la vede lo decide l'atleta: nasce "solo al PT" (schedaDaProposta).
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Messaggio per {atleta.nome} (facoltativo)</label>
            <textarea
              className="textarea"
              value={notaPt}
              maxLength={1000}
              placeholder="Es. Da lunedì: le prime due settimane tieniti leggero sugli stacchi."
              onChange={(e) => setNotaPt(e.target.value)}
            />
          </div>
        ) : lavoro ? null : (
          <VisibilitaPicker
            valore={scheda.visibilita}
            onChange={(v) => patch({ visibilita: v })}
            etichetta="Chi vede questa scheda"
            genere="f"
          />
        )}
      </div>
      )}

      {attivo == null && (
        <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} disabled={!nDiversi} onClick={avanti}>
          Avanti
        </button>
      )}
      {attivo == null && lavoro && !lavoro.nuova && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 22 }} onClick={eliminaLavoro}>
          <IconTrash width={18} height={18} /> Elimina scheda di lavoro
        </button>
      )}
      {attivo == null && esistente && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 22 }} onClick={() => setEliminare(true)}>
          <IconTrash width={18} height={18} /> Elimina scheda
        </button>
      )}

      {/* Secondo passo: un allenamento alla volta. Col suo nome e, se ha giorni
          fissi (non più allenamenti che giorni), i giorni in cui si fa. */}
      {attivo != null && (
        <div className="giorni-picker" style={{ marginTop: 6 }}>
          {allenamenti.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={'giorno-chip' + (i === attivo ? ' on' : '')}
              onClick={() => vaiAlGiorno(i)}
              aria-pressed={i === attivo}
            >
              {g.nome.trim() || lettera(i)}
              {nGiorni >= allenamenti.length &&
                ' · ' +
                  [...new Set(slot.filter((_, p) => p % allenamenti.length === i))]
                    .map((gs) => GIORNI_SETTIMANA[gs].breve)
                    .join(' ')}
            </button>
          ))}
        </div>
      )}

      {attivo != null && allenamenti[attivo] && [allenamenti[attivo]].map((g) => (
        <GiornoEditor
          key={g.id}
          giorno={g}
          schedaId={scheda.id}
          numeroSettimane={scheda.numeroSettimane}
          senzaSettimane={!!scheda.senzaFine}
          conPreparazione
          daControllare={daControllare}
          onApri={visto}
          onPatch={(p) => patchGiorno(g.id, p)}
          onAddEsercizio={(patch) => addEsercizio(g.id, patch)}
          onRemoveEsercizio={(eid) => removeEsercizio(g.id, eid)}
          onEsercizi={(fn) =>
            setScheda((s) => ({
              ...s,
              giorni: s.giorni.map((x) => (x.id === g.id ? { ...x, esercizi: fn(x.esercizi) } : x)),
            }))
          }
          onPatchEsercizio={(eid, p) => patchEsercizio(g.id, eid, p)}
          onToggleVaria={(eid) => toggleVaria(g.id, eid)}
          onPatchSchema={(eid, weekIdx, p) => patchSchema(g.id, eid, weekIdx, p)}
        />
      ))}

      {/* In fondo all'ultimo allenamento, quello che chiude: salvare, o per
          un atleta inviare (e "salva senza inviare"). */}
      {attivo != null && (
        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          <button className="btn btn-block" onClick={() => (attivo ? vaiAlGiorno(attivo - 1) : setAttivo(null))}>
            Indietro
          </button>
          {attivo < allenamenti.length - 1 ? (
            <button className="btn btn-accent btn-block" onClick={() => vaiAlGiorno(attivo + 1)}>
              Avanti
            </button>
          ) : perAtleta ? (
            <button className="btn btn-accent btn-block" onClick={invia} disabled={invio.inCorso}>
              {invio.inCorso ? 'Invio…' : `Invia a ${atleta.nome}`}
            </button>
          ) : (
            <button className="btn btn-accent btn-block" onClick={lavoro ? salvaLavoro : salva} disabled={invio.inCorso}>
              {invio.inCorso ? 'Salvo…' : 'Salva'}
            </button>
          )}
        </div>
      )}
      {attivo != null && attivo === allenamenti.length - 1 && perAtleta && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={salvaLavoro} disabled={invio.inCorso}>
          Salva senza inviare (fra le schede di lavoro)
        </button>
      )}

      {eliminare && (
        <EliminaScheda scheda={esistente} onChiudi={() => setEliminare(false)} onEliminata={fuori} onArchiviata={fuori} />
      )}
    </div>
  )
}
