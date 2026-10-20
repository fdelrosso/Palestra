import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import {
  allineaCopie,
  nuovaScheda,
  nuovoGiorno,
  nuovoEsercizio,
  schemaPerSettimana,
  schemaVuoto,
  GIORNI_SETTIMANA,
} from '../data/model'
import { esci, routes } from '../lib/router'
import { avanzaSeFinita } from '../lib/progression'
import { IconBack, IconPlus, IconTrash } from '../components/icons'
import EliminaScheda from '../components/EliminaScheda'
import { GiornoEditor } from '../components/GiornoEditor'
import VisibilitaPicker from '../components/VisibilitaPicker'
import { useAccount } from '../store/AccountContext'
import { lavoroDellaBozza, prendiBozzaPerAtleta, proponiScheda } from '../lib/proposteScheda'
import { eliminaSchedaLavoro, salvaSchedaLavoro } from '../lib/schedeLavoro'
import { conMuscoliScritti } from '../lib/eserciziLibreria'

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
  const [scheda, setScheda] = useState(() => {
    if (esistente) return structuredClone(esistente)
    if (lavoro?.scheda) return structuredClone(lavoro.scheda)
    const bozza = perAtleta ? prendiBozzaPerAtleta(perAtleta) : null
    if (bozza) return { ...structuredClone(bozza), id: nuovaScheda().id, completamenti: [], settimanaCorrente: 1 }
    return nuovaScheda({ nome: '', numeroSettimane: 5 })
  })
  const [notaPt, setNotaPt] = useState('')
  const [invio, setInvio] = useState({ inCorso: false, errore: '' })

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

  // Attiva/disattiva un giorno della settimana tra quelli di allenamento,
  // mantenendo l'array ordinato (lunedì-first).
  const toggleGiornoSettimana = (idx) =>
    setScheda((s) => {
      const set = new Set(s.giorniSettimana || [])
      if (set.has(idx)) set.delete(idx)
      else set.add(idx)
      return { ...s, giorniSettimana: [...set].sort((a, b) => a - b) }
    })

  // I giorni da scrivere: le copie (copiaDi) seguono il loro originale e non
  // si mostrano.
  const originali = scheda.giorni.filter((g) => !g.copiaDi)

  // Una scheda nuova si scrive a passi: prima i dati e i giorni della
  // settimana, poi un allenamento alla volta (`attivo`, indice in `originali`).
  // Gli allenamenti diversi possono essere meno dei giorni (2 su 4: A B A B):
  // i giorni in più sono copie, in giro, così si scrivono una volta sola.
  const aPassi = !esistente && !perAtleta && !lavoro
  const [attivo, setAttivo] = useState(null)
  const [diversi, setDiversi] = useState(null)
  const nGiorni = scheda.giorniSettimana.length
  const nDiversi = Math.min(diversi ?? nGiorni, nGiorni)
  const lettera = (i) => String.fromCharCode(65 + i) // A, B, C...
  const avanti = () => {
    const tenuti = Array.from(
      { length: nDiversi },
      (_, i) => originali[i] || nuovoGiorno({ nome: `Giorno ${lettera(i)}` }),
    )
    const copie = Array.from({ length: nGiorni - nDiversi }, (_, j) =>
      nuovoGiorno({ copiaDi: tenuti[(nDiversi + j) % nDiversi].id }),
    )
    const persi = originali.slice(nDiversi).filter((g) => g.esercizi.length)
    if (persi.length && !confirm(`Togliere ${persi.map((g) => g.nome).join(', ')} e i suoi esercizi?`)) return
    patch({ giorni: allineaCopie([...tenuti, ...copie]) })
    vaiAlGiorno(0)
  }
  const vaiAlGiorno = (i) => {
    setAttivo(i)
    window.scrollTo(0, 0)
  }

  const addGiorno = () => {
    const allenamenti = originali.filter((g) => g.tipo === 'workout')
    const nome = `Giorno ${String.fromCharCode(65 + allenamenti.length)}` // A, B, C...
    // Riscaldamento e stretching partono come quelli del giorno prima: di solito
    // sono gli stessi tutta la scheda, e così si scrivono una volta sola. Chi li
    // vuole diversi li cambia, chi non li vuole li toglie.
    const prima = allenamenti[allenamenti.length - 1]
    const preparazione = prima ? { riscaldamento: prima.riscaldamento || '', stretching: prima.stretching || '' } : {}
    patch({ giorni: [...scheda.giorni, nuovoGiorno({ nome, ...preparazione })] })
  }
  const removeGiorno = (gid) => {
    const g = scheda.giorni.find((x) => x.id === gid)
    if (g?.esercizi?.length && !confirm(`Eliminare "${g.nome}" e i suoi esercizi?`)) return
    patch({ giorni: scheda.giorni.filter((x) => x.id !== gid && x.copiaDi !== gid) })
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

  const invia = async () => {
    if (invio.inCorso) return
    if (!scheda.giorni.some((g) => g.tipo === 'workout' && g.esercizi.length > 0)) {
      setInvio({ inCorso: false, errore: 'Metti almeno un giorno con qualche esercizio.' })
      return
    }
    setInvio({ inCorso: true, errore: '' })
    const r = await proponiScheda(perAtleta, conMuscoliScritti(scheda), notaPt)
    if (!r.ok) {
      setInvio({ inCorso: false, errore: r.errore })
      return
    }
    // Partita da una scheda di lavoro: ora è fra le inviate, lì non serve più.
    const daLavoro = lavoroDellaBozza(perAtleta)
    if (daLavoro) await eliminaSchedaLavoro(daLavoro)
    esci({ salta: delFlussoPt, poi: routes.atleta(perAtleta) })
  }

  // Fra le schede di lavoro: in modo `lavoro`, o "Salva senza inviare" da una
  // scheda per un atleta (ci torna la stessa, se veniva da lì).
  const salvaLavoro = async () => {
    if (invio.inCorso) return
    setInvio({ inCorso: true, errore: '' })
    const daLavoro = perAtleta ? lavoroDellaBozza(perAtleta) : null
    const r = await salvaSchedaLavoro(utenteCorrente?.id, conMuscoliScritti(daLavoro ? { ...scheda, id: daLavoro } : scheda))
    if (!r.ok) {
      setInvio({ inCorso: false, errore: r.errore })
      return
    }
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
    // I muscoli che l'editor mostra diventano quelli salvati (conMuscoliScritti).
    const daSalvare = conMuscoliScritti({ ...scheda, nome: scheda.nome.trim() || 'Scheda senza nome' })
    if (esistente) {
      aggiornaScheda(daSalvare)
      esci({ salta: delFlusso, poi: routes.scheda(daSalvare.id) })
    } else {
      const s = aggiungiScheda(daSalvare)
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
        {lavoro ? (
          <button className="btn btn-accent btn-sm" onClick={salvaLavoro} disabled={invio.inCorso}>
            {invio.inCorso ? 'Salvo…' : 'Salva'}
          </button>
        ) : perAtleta ? (
          <button className="btn btn-accent btn-sm" onClick={invia} disabled={invio.inCorso}>
            {invio.inCorso ? 'Invio…' : 'Invia'}
          </button>
        ) : aPassi && attivo == null ? null : (
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
            {GIORNI_SETTIMANA.map((g) => (
              <button
                key={g.id}
                type="button"
                className={'giorno-chip' + (scheda.giorniSettimana.includes(g.id) ? ' on' : '')}
                onClick={() => toggleGiornoSettimana(g.id)}
                aria-pressed={scheda.giorniSettimana.includes(g.id)}
                aria-label={g.label}
              >
                {g.breve}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.4 }}>
            I giorni in cui ti alleni: il calendario ci mette gli allenamenti in
            ordine, e gli altri giorni sono riposo.
            {aPassi
              ? ' Poi li scrivi uno alla volta.'
              : " Senza giorni scelti vale l'elenco qui sotto, un giorno dopo l'altro."}
          </p>
        </div>

        {aPassi && nGiorni > 1 && (
          <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label>Allenamenti diversi</label>
            <div className="giorni-picker">
              {Array.from({ length: nGiorni }, (_, i) => i + 1).map((n) => (
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
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.4 }}>
              {scheda.giorniSettimana.map((gs, p) => `${GIORNI_SETTIMANA[gs].breve} ${lettera(p % nDiversi)}`).join(' · ')}
              {nDiversi < nGiorni && ': ognuno lo scrivi una volta, e si ripete da solo.'}
            </p>
          </div>
        )}

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

      {aPassi && attivo == null && (
        <button
          className="btn btn-accent btn-block"
          style={{ marginTop: 14 }}
          disabled={!scheda.giorniSettimana.length}
          onClick={avanti}
        >
          Avanti
        </button>
      )}

      {/* Scheda nuova, secondo passo: un allenamento alla volta, coi giorni in cui si fa. */}
      {attivo != null && (
        <div className="giorni-picker" style={{ marginTop: 6 }}>
          {originali.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={'giorno-chip' + (i === attivo ? ' on' : '')}
              onClick={() => vaiAlGiorno(i)}
              aria-pressed={i === attivo}
            >
              {lettera(i)} ·{' '}
              {scheda.giorniSettimana
                .filter((_, p) => p % originali.length === i)
                .map((gs) => GIORNI_SETTIMANA[gs].breve)
                .join(' ')}
            </button>
          ))}
        </div>
      )}

      {/* Giorni */}
      {(aPassi ? (attivo == null ? [] : [originali[attivo]]) : originali).map((g) => (
        <GiornoEditor
          key={g.id}
          giorno={g}
          schedaId={scheda.id}
          numeroSettimane={scheda.numeroSettimane}
          senzaSettimane={!!scheda.senzaFine}
          conPreparazione
          onPatch={(p) => patchGiorno(g.id, p)}
          onRemove={aPassi ? undefined : () => removeGiorno(g.id)}
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

      {!aPassi && (
        <button className="btn btn-block" style={{ marginTop: 14 }} onClick={addGiorno}>
          <IconPlus width={18} height={18} /> Giorno
        </button>
      )}

      {attivo != null && (
        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          <button className="btn btn-block" onClick={() => (attivo ? vaiAlGiorno(attivo - 1) : setAttivo(null))}>
            Indietro
          </button>
          {attivo < originali.length - 1 ? (
            <button className="btn btn-accent btn-block" onClick={() => vaiAlGiorno(attivo + 1)}>
              Avanti
            </button>
          ) : (
            <button className="btn btn-accent btn-block" onClick={salva}>
              Salva
            </button>
          )}
        </div>
      )}

      {perAtleta && (
        <button className="btn btn-accent btn-block" style={{ marginTop: 22 }} onClick={invia} disabled={invio.inCorso}>
          {invio.inCorso ? 'Invio…' : `Invia a ${atleta.nome}`}
        </button>
      )}
      {perAtleta && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={salvaLavoro} disabled={invio.inCorso}>
          Salva senza inviare (fra le schede di lavoro)
        </button>
      )}
      {lavoro && (
        <button className="btn btn-accent btn-block" style={{ marginTop: 22 }} onClick={salvaLavoro} disabled={invio.inCorso}>
          {invio.inCorso ? 'Salvo…' : 'Salva'}
        </button>
      )}
      {lavoro && !lavoro.nuova && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={eliminaLavoro}>
          <IconTrash width={18} height={18} /> Elimina scheda di lavoro
        </button>
      )}

      {esistente && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 22 }} onClick={() => setEliminare(true)}>
          <IconTrash width={18} height={18} /> Elimina scheda
        </button>
      )}
      {eliminare && (
        <EliminaScheda scheda={esistente} onChiudi={() => setEliminare(false)} onEliminata={fuori} onArchiviata={fuori} />
      )}
    </div>
  )
}
