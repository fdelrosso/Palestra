import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import {
  giorniWorkout,
  isCompletato,
  completamentoDi,
  statoScheda,
  segnaCompletato,
  annullaCompletato,
  impostaSettimana,
  avanzaSettimana,
} from '../lib/progression'
import { nuovoEsercizio, schemaVuoto, schemaPerSettimana } from '../data/model'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import { navigate, goBack, routes } from '../lib/router'
import { formatSec } from '../lib/parseRecupero'
import { storicoCarichi } from '../lib/carico'
import EsercizioCard from '../components/EsercizioCard'
import ConsiglioCarico from '../components/ConsiglioCarico'
import EsercizioAllegati from '../components/EsercizioAllegati'
import { GiornoEditor } from '../components/GiornoEditor'
import CondividiConAmici from '../components/CondividiConAmici'
import { TIPO_CONDIVISIONE } from '../lib/condivisioni'
import { IconBack, IconCheck, IconChevron, IconEdit, IconBed, IconShare } from '../components/icons'

export default function SchedaPage({ id }) {
  const { schede, getScheda, aggiornaScheda, sessione, iniziaSessione } = useStore()
  const scheda = getScheda(id)
  // Come sono andati gli esercizi le volte scorse (pallini + carico): serve
  // all'anteprima del giorno per consigliare se salire o scendere di peso.
  const carichi = useMemo(() => storicoCarichi(schede), [schede])
  const [giornoApertoId, setGiornoApertoId] = useState(null)
  // Modale "manda a un amico": la scheda parte come copia congelata.
  const [condividi, setCondividi] = useState(false)
  // Giorno scelto a mano dall'utente come "allenamento di oggi" (override del
  // consigliato automatico). Null = usa il consigliato calcolato dalla progressione.
  const [giornoSceltoId, setGiornoSceltoId] = useState(null)

  if (!scheda) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate(routes.home())}>
            <IconBack />
          </button>
          <h1>Scheda</h1>
        </div>
        <div className="empty">Scheda non trovata.</div>
      </div>
    )
  }

  const settimana = scheda.settimanaCorrente
  const workout = giorniWorkout(scheda)
  const stato = statoScheda(scheda)
  const giornoAperto = scheda.giorni.find((g) => g.id === giornoApertoId) || null
  const sessioneAttiva = sessione && sessione.schedaId === scheda.id
  // Una sessione è "iniziata" se almeno una serie ha già un colore; finché non lo
  // è, la trattiamo come allenamento consigliato (in cima) da avviare quando vuoi.
  const sessioneIniziata =
    sessioneAttiva && sessione.esercizi.some((e) => e.sets.some((s) => s.colore))
  // "Allenamento di oggi" mostrato in cima: quello scelto a mano se valido,
  // altrimenti il consigliato automatico (primo giorno workout non completato).
  const giornoScelto = giornoSceltoId
    ? scheda.giorni.find((g) => g.id === giornoSceltoId && g.tipo === 'workout') || null
    : null
  const giornoOggi = giornoScelto || stato.giornoCorrente

  const setWeek = (w) => {
    setGiornoApertoId(null)
    setGiornoSceltoId(null) // la scelta è legata alla settimana visualizzata
    aggiornaScheda(impostaSettimana(scheda, w))
  }
  const toggleGiorno = (giorno) => {
    if (isCompletato(scheda, settimana, giorno.id)) {
      aggiornaScheda(annullaCompletato(scheda, settimana, giorno.id))
    } else {
      aggiornaScheda(segnaCompletato(scheda, settimana, giorno.id))
    }
  }
  const iniziaAllenamento = (giorno) => {
    // Allenamento già in corso sullo stesso giorno → riprendilo (non ricrearlo,
    // altrimenti perderei i progressi).
    if (sessione && sessione.giornoId === giorno.id) {
      navigate(routes.allenamento())
      return
    }
    // Sostituzione con un giorno diverso: conferma e poi mettilo in cima alla
    // scheda come consigliato, SENZA entrare subito nella sessione.
    if (sessione) {
      const ok = confirm(
        `C’è già un allenamento in corso (${sessione.nomeGiorno}). Sostituirlo con «${giorno.nome}»? ` +
          `Verrà messo in cima alla scheda come consigliato, senza avviarsi subito.`,
      )
      if (!ok) return
      iniziaSessione(scheda, giorno, settimana)
      setGiornoApertoId(null) // torna alla panoramica: il consigliato è in cima
      return
    }
    // Nessuna sessione attiva: avvio normale (entra direttamente nella sessione).
    iniziaSessione(scheda, giorno, settimana)
    navigate(routes.allenamento())
  }
  // Salva le modifiche fatte a un giorno dall'anteprima (add/remove/modifica esercizi e serie).
  const salvaGiorno = (giornoAggiornato) =>
    aggiornaScheda({
      ...scheda,
      giorni: scheda.giorni.map((g) => (g.id === giornoAggiornato.id ? giornoAggiornato : g)),
    })
  const settimanaFatta = (w) =>
    workout.length > 0 && workout.every((g) => isCompletato(scheda, w, g.id))
  // Gruppi muscolari effettivamente usati nella scheda (per la legenda dei colori).
  const gruppiUsati = GRUPPI.filter((gr) =>
    scheda.giorni.some((g) => g.tipo === 'workout' && g.esercizi.some((e) => e.gruppo === gr.id)),
  )

  // ----- Anteprima di un giorno -------------------------------------------
  if (giornoAperto) {
    return (
      <WorkoutPreview
        giorno={giornoAperto}
        carichi={carichi}
        settimana={settimana}
        numeroSettimane={scheda.numeroSettimane}
        completato={isCompletato(scheda, settimana, giornoAperto.id)}
        completamento={completamentoDi(scheda, settimana, giornoAperto.id)}
        onIndietro={() => setGiornoApertoId(null)}
        onInizia={() => iniziaAllenamento(giornoAperto)}
        onToggleManuale={() => toggleGiorno(giornoAperto)}
        onSalvaGiorno={salvaGiorno}
      />
    )
  }

  // ----- Panoramica scheda -------------------------------------------------
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack}>
          <IconBack />
        </button>
        <h1>{scheda.nome}</h1>
        <button
          className="icon-btn"
          aria-label="Manda questa scheda a un amico"
          onClick={() => setCondividi(true)}
        >
          <IconShare />
        </button>
        <button className="icon-btn" onClick={() => navigate(routes.editor(scheda.id))}>
          <IconEdit />
        </button>
      </div>

      {condividi && (
        <CondividiConAmici
          tipo={TIPO_CONDIVISIONE.SCHEDA}
          titolo={scheda.nome}
          sottotitolo={`${workout.length} allenamenti a settimana`}
          payload={scheda}
          onChiudi={() => setCondividi(false)}
        />
      )}

      {scheda.nota && (
        <p className="muted" style={{ fontSize: 13.5, margin: '2px 2px 10px', lineHeight: 1.4 }}>
          {scheda.nota}
        </p>
      )}

      {/* Selettore settimana */}
      <div className="weekbar">
        {Array.from({ length: scheda.numeroSettimane }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            className={'pill' + (w === settimana ? ' active' : '') + (settimanaFatta(w) ? ' done' : '')}
            onClick={() => setWeek(w)}
          >
            Sett {w}
            <small>{settimanaFatta(w) ? 'fatta' : `${scheda.numeroSettimane} sett.`}</small>
          </button>
        ))}
      </div>

      {/* Hero: sessione in corso / allenamento corrente / settimana / fine */}
      {sessioneAttiva ? (
        <div className="hero">
          <div className="kicker">
            {sessioneIniziata ? 'Allenamento in corso' : 'Allenamento consigliato'}
          </div>
          <div className="titolo">{sessione.nomeGiorno}</div>
          {!sessioneIniziata && (
            <div className="muted" style={{ marginTop: 4 }}>
              Settimana {sessione.settimana} · {sessione.esercizi.length} esercizi
            </div>
          )}
          <button
            className="btn btn-accent btn-lg btn-block"
            style={{ marginTop: 16 }}
            onClick={() => navigate(routes.allenamento())}
          >
            {sessioneIniziata ? 'Riprendi allenamento' : 'Inizia allenamento'}
          </button>
        </div>
      ) : giornoOggi ? (
        <div className="hero">
          <div className="kicker">Allenamento di oggi</div>
          <div className="titolo">{giornoOggi.nome}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {isCompletato(scheda, settimana, giornoOggi.id)
              ? 'Completato · tocca per rivedere o annullare'
              : `Settimana ${settimana} · ${giornoOggi.esercizi.length} esercizi`}
          </div>
          <button
            className="btn btn-accent btn-lg btn-block"
            style={{ marginTop: 16 }}
            onClick={() => setGiornoApertoId(giornoOggi.id)}
          >
            Apri allenamento
          </button>
        </div>
      ) : stato.schedaCompletata ? (
        <div className="hero">
          <div className="kicker">Complimenti</div>
          <div className="titolo">Scheda completata 🎉</div>
          <p className="muted" style={{ marginTop: 8 }}>
            Hai finito tutte le {scheda.numeroSettimane} settimane. Chiedi la prossima scheda al PT!
          </p>
        </div>
      ) : (
        <div className="hero">
          <div className="kicker">Settimana {settimana} completata</div>
          <div className="titolo">Ottimo lavoro 💪</div>
          <button
            className="btn btn-accent btn-lg btn-block"
            style={{ marginTop: 16 }}
            onClick={() => aggiornaScheda(avanzaSettimana(scheda))}
          >
            Vai alla settimana {settimana + 1}
          </button>
        </div>
      )}

      {/* Elenco di tutti i giorni */}
      <div className="section-title">Giorni · settimana {settimana}</div>
      {gruppiUsati.length > 0 && (
        <div className="gruppo-legenda">
          {gruppiUsati.map((gr) => (
            <span key={gr.id} className="gruppo-legenda-item" style={{ '--g': gr.colore }}>
              <span className="g-dot" />
              {gr.label}
            </span>
          ))}
        </div>
      )}
      <div className="stack">
        {scheda.giorni.map((g, i) => {
          if (g.tipo === 'rest') {
            return (
              <div key={g.id} className="day-row rest">
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
          const done = isCompletato(scheda, settimana, g.id)
          const isOggi = giornoOggi?.id === g.id
          const label = g.nome?.replace(/^Giorno\s+/i, '') || String(i + 1)
          // Toccare un giorno lo imposta come "allenamento di oggi" in cima (non
          // apre subito l'anteprima); da lì "Apri allenamento" apre/avvia.
          // Se però c'è una sessione in corso su un altro giorno, aprire l'anteprima
          // è la via per sostituirla, quindi in quel caso apriamo direttamente.
          const scegli = () => {
            if (sessioneAttiva && sessione.giornoId !== g.id) {
              setGiornoApertoId(g.id)
              return
            }
            setGiornoSceltoId(g.id)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          return (
            <button
              key={g.id}
              className={'day-row' + (isOggi ? ' current' : '')}
              onClick={scegli}
            >
              <div className={'day-dot' + (done ? ' done' : isOggi ? ' current' : '')}>
                {done ? <IconCheck width={18} height={18} /> : label}
              </div>
              <div className="grow">
                <div className="titolo">{g.nome}</div>
                <div className="day-row-bottom">
                  <span className="sub">
                    {done ? 'Completato' : isOggi ? 'Da fare ora' : `${g.esercizi.length} esercizi`}
                  </span>
                  {g.esercizi.length > 0 && (
                    <span className="gruppo-dots">
                      {g.esercizi.map((e) => {
                        const gr = gruppoDi(e.gruppo)
                        return (
                          <span
                            key={e.id}
                            className={'g-dot' + (gr ? '' : ' vuoto')}
                            style={gr ? { '--g': gr.colore } : undefined}
                            title={gr ? gr.label : 'Nessun gruppo'}
                          />
                        )
                      })}
                    </span>
                  )}
                </div>
              </div>
              <IconChevron className="faint" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anteprima del giorno: esercizi (sola lettura) + "Inizia allenamento".
// Col tasto penna in alto a destra si passa alla modifica in-place degli
// esercizi/serie del giorno (aggiungi/rimuovi/modifica), salvata nella scheda.
// ---------------------------------------------------------------------------
function WorkoutPreview({
  giorno,
  carichi,
  settimana,
  numeroSettimane,
  completato,
  completamento,
  onIndietro,
  onInizia,
  onToggleManuale,
  onSalvaGiorno,
}) {
  const [modifica, setModifica] = useState(false)
  const [bozza, setBozza] = useState(null)

  const entraModifica = () => {
    setBozza(structuredClone(giorno))
    setModifica(true)
  }
  const annullaModifica = () => {
    setModifica(false)
    setBozza(null)
  }
  const salvaModifica = () => {
    if (bozza) onSalvaGiorno(bozza)
    setModifica(false)
    setBozza(null)
  }

  // Modifiche immutabili sulla bozza (un singolo giorno).
  const patchEsercizio = (eid, p) =>
    setBozza((g) => ({ ...g, esercizi: g.esercizi.map((e) => (e.id === eid ? { ...e, ...p } : e)) }))
  const patchSchema = (eid, weekIdx, p) =>
    setBozza((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) => {
        if (e.id !== eid) return e
        if (weekIdx == null) return { ...e, schemaBase: { ...e.schemaBase, ...p } }
        return { ...e, settimane: e.settimane.map((sc, i) => (i === weekIdx ? { ...sc, ...p } : sc)) }
      }),
    }))
  const toggleVaria = (eid) =>
    setBozza((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) => {
        if (e.id !== eid) return e
        if (!e.variaPerSettimana) {
          const settimane = Array.from({ length: numeroSettimane }, () => schemaVuoto(e.schemaBase))
          return { ...e, variaPerSettimana: true, settimane }
        }
        return { ...e, variaPerSettimana: false, schemaBase: schemaVuoto(e.settimane[0]) }
      }),
    }))
  const addEsercizio = () =>
    setBozza((g) => ({ ...g, esercizi: [...g.esercizi, nuovoEsercizio()] }))
  const removeEsercizio = (eid) =>
    setBozza((g) => ({ ...g, esercizi: g.esercizi.filter((e) => e.id !== eid) }))

  return (
    <div className="app">
      <div className="topbar">
        <button
          className="icon-btn"
          onClick={modifica ? annullaModifica : onIndietro}
          aria-label="Indietro"
        >
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>{giorno.nome}</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {modifica ? 'Modifica esercizi' : `Settimana ${settimana} · ${giorno.esercizi.length} esercizi`}
          </div>
        </div>
        {!modifica && completato && <span className="badge badge-good">Fatto</span>}
        {!modifica && (
          <button className="icon-btn" onClick={entraModifica} aria-label="Modifica esercizi">
            <IconEdit />
          </button>
        )}
      </div>

      {modifica ? (
        <>
          <p className="muted" style={{ fontSize: 13, margin: '4px 2px 0', lineHeight: 1.4 }}>
            Aggiungi, rimuovi o modifica esercizi e serie. Le modifiche valgono per l’intera scheda;
            per gli esercizi che cambiano ogni settimana modifichi lo schema riga per riga.
          </p>
          <GiornoEditor
            giorno={bozza}
            schedaId={scheda.id}
            numeroSettimane={numeroSettimane}
            soloEsercizi
            onAddEsercizio={addEsercizio}
            onRemoveEsercizio={removeEsercizio}
            onPatchEsercizio={patchEsercizio}
            onToggleVaria={toggleVaria}
            onPatchSchema={patchSchema}
          />
        </>
      ) : (
        <>
          {completato && completamento?.durataSec != null && (
            <div className="card" style={{ marginTop: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Ultimo allenamento</span>
                <span className="timer-total">⏱ {formatSec(completamento.durataSec)}</span>
              </div>
            </div>
          )}

          <div className="stack" style={{ marginTop: 12 }}>
            {giorno.esercizi.map((e) => (
              <div key={e.id}>
                <EsercizioCard esercizio={e} settimana={settimana} />
                {/* Come è andato l'esercizio l'ultima volta che l'hai incontrato. */}
                <ConsiglioCarico
                  nome={e.nome}
                  carichi={carichi}
                  caricoAttuale={schemaPerSettimana(e, settimana).carico || ''}
                />
                <EsercizioAllegati esercizio={e} readOnly />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Barra azione in basso */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--border)',
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          {modifica ? (
            <>
              <button className="btn btn-accent btn-block btn-lg" onClick={salvaModifica}>
                Salva modifiche
              </button>
              <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 6 }} onClick={annullaModifica}>
                Annulla
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-accent btn-block btn-lg" onClick={onInizia}>
                {completato ? 'Ripeti allenamento' : 'Inizia allenamento'}
              </button>
              <button
                className={'btn btn-sm btn-block' + (completato ? ' btn-ghost btn-danger' : ' btn-ghost')}
                style={{ marginTop: 6 }}
                onClick={() => {
                  if (
                    completato &&
                    !confirm(
                      'Annullare il completamento di questo allenamento? Verrà rimosso dai giorni fatti (se lo avevi avviato per sbaglio).',
                    )
                  )
                    return
                  onToggleManuale()
                }}
              >
                {completato ? 'Annulla completamento' : 'Segna come completato senza allenarti'}
              </button>
            </>
          )}
        </div>
      </div>
      <div style={{ height: 108 }} />
    </div>
  )
}
