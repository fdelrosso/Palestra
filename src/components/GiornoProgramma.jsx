import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { navigate, routes } from '../lib/router'
import { schedaAttiva } from '../data/model'
import { conModifica, numeroGiorno } from '../lib/pianoScheda'

// ---------------------------------------------------------------------------
// Un giorno del PROGRAMMA della scheda, toccato nel calendario (lib/pianoScheda).
//
// Dice cosa tocca e porta DRITTO a quell'allenamento (/scheda/:id/giorno/:g);
// un riposo non porta da nessuna parte. Da oggi in poi il giorno si può
// cambiare: un altro allenamento della scheda, riposo, uno fuori dalla scheda
// (di un'altra scheda o salvato) o qualcosa fuori dall'app scritto a mano.
// La modifica si scrive su Scheda.programma (conModifica).
// ---------------------------------------------------------------------------

function dataLunga(data) {
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(data)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Il valore della tendina per una modifica, e il contrario.
function valoreDi(voce) {
  if (!voce) return ''
  if (voce.tipo === 'giorno') return `g:${voce.giornoId}`
  if (voce.tipo === 'riposo') return 'riposo'
  if (voce.tipo === 'allenamento') return `s:${voce.schedaId}:${voce.giornoId}`
  return 'altro'
}

export default function GiornoProgramma({ data, scheda, piano, onChiudi }) {
  const { schede, aggiornaScheda, iniziaAllenamentoLibero } = useStore()
  const previsto = piano.previsto(data)
  const futuro = numeroGiorno(data) >= numeroGiorno(new Date())
  const eOggi = numeroGiorno(data) === numeroGiorno(new Date())
  const recupero = eOggi ? piano.daRecuperare : null

  const [cambia, setCambia] = useState(false)
  const [scelta, setScelta] = useState(() => valoreDi(previsto?.modificato))
  const [nomeAltro, setNomeAltro] = useState(() =>
    previsto?.modificato?.tipo === 'altro' ? previsto.modificato.nome : '',
  )

  const workout = scheda.giorni.filter((g) => g.tipo === 'workout')
  const salvati = schede.find((s) => s.libera)?.giorni.filter((g) => g.salvato) || []
  const altre = schede.filter((s) => schedaAttiva(s) && s.id !== scheda.id && s.giorni.some((g) => g.tipo === 'workout'))
  const libera = schede.find((s) => s.libera)

  const vaiA = (schedaId, giornoId) => navigate(routes.giornoScheda(schedaId, giornoId))

  // Un allenamento fuori dalla scheda: di un'altra scheda si apre lì; uno
  // salvato si rifà come da "Schede e allenamenti" (un giorno nuovo, stessi esercizi).
  const apriEsterno = (voce) => {
    const sc = schede.find((s) => s.id === voce.schedaId)
    const g = sc?.giorni.find((x) => x.id === voce.giornoId)
    if (!g) return
    if (sc.libera) {
      iniziaAllenamentoLibero({ nome: g.nome, esercizi: g.esercizi })
      navigate(routes.allenamento())
    } else {
      vaiA(sc.id, g.id)
    }
  }
  const esternoApribile = (voce) =>
    voce?.tipo === 'allenamento' &&
    !!schede.find((s) => s.id === voce.schedaId)?.giorni.some((g) => g.id === voce.giornoId)

  const salva = () => {
    let voce = null
    if (scelta.startsWith('g:')) voce = { tipo: 'giorno', giornoId: scelta.slice(2) }
    else if (scelta === 'riposo') voce = { tipo: 'riposo' }
    else if (scelta.startsWith('s:')) {
      const [, schedaId, giornoId] = scelta.split(':')
      const g = schede.find((s) => s.id === schedaId)?.giorni.find((x) => x.id === giornoId)
      if (!g) return
      voce = { tipo: 'allenamento', schedaId, giornoId, nome: g.nome }
    } else if (scelta === 'altro') {
      const nome = nomeAltro.trim()
      if (!nome) return
      voce = { tipo: 'altro', nome: nome.slice(0, 60) }
    } else return
    aggiornaScheda(conModifica(scheda, data, voce))
    setCambia(false)
  }
  const ripristina = () => {
    aggiornaScheda(conModifica(scheda, data, null))
    setScelta('')
    setNomeAltro('')
    setCambia(false)
  }

  let descrizione = 'Niente in programma.'
  if (previsto?.saltato) descrizione = `Era in programma ${previsto.giorno.nome}, ma non l’hai fatto.`
  else if (previsto?.tipo === 'workout') descrizione = `In programma: ${previsto.giorno.nome}.`
  else if (previsto?.tipo === 'esterno') descrizione = `In programma: ${previsto.nome} (fuori dalla scheda).`
  else if (previsto?.tipo === 'rest') descrizione = 'Riposo.'

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Giorno in programma" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>{dataLunga(data)}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        <div className="cal-recap-scheda">{scheda.nome}</div>
        <p style={{ fontSize: 15, margin: '0 2px 4px', lineHeight: 1.45 }}>{descrizione}</p>
        {previsto?.modificato && <p className="faint" style={{ fontSize: 12.5, margin: '0 2px 4px' }}>Cambiato a mano</p>}
        {recupero && (previsto?.tipo !== 'workout' || previsto.giorno.id !== recupero.id) && (
          <p className="muted" style={{ fontSize: 13.5, margin: '0 2px 4px' }}>
            Hai saltato {recupero.nome}: potresti recuperarlo oggi.
          </p>
        )}

        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          {previsto?.tipo === 'workout' && (
            <button className="btn btn-accent btn-block" onClick={() => vaiA(scheda.id, previsto.giorno.id)}>
              {previsto.saltato ? `Recupera ${previsto.giorno.nome}` : `Apri ${previsto.giorno.nome}`}
            </button>
          )}
          {previsto?.tipo === 'esterno' && esternoApribile(previsto.modificato) && (
            <button className="btn btn-accent btn-block" onClick={() => apriEsterno(previsto.modificato)}>
              Apri {previsto.nome}
            </button>
          )}
          {recupero && (previsto?.tipo !== 'workout' || previsto.giorno.id !== recupero.id) && (
            <button className="btn btn-block" onClick={() => vaiA(scheda.id, recupero.id)}>
              Recupera {recupero.nome}
            </button>
          )}
          {futuro && !cambia && (
            <button className="btn btn-ghost btn-block" onClick={() => setCambia(true)}>
              Cambia cosa fare questo giorno
            </button>
          )}
          {futuro && !cambia && previsto?.modificato && (
            <button className="btn btn-ghost btn-block" onClick={ripristina}>
              Torna al programma
            </button>
          )}
        </div>

        {futuro && cambia && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="programma-scelta">Al posto di quello in programma</label>
              <select
                id="programma-scelta"
                className="select"
                value={scelta}
                onChange={(e) => setScelta(e.target.value)}
              >
                <option value="" disabled>
                  Scegli…
                </option>
                <optgroup label={scheda.nome}>
                  {workout.map((g) => (
                    <option key={g.id} value={`g:${g.id}`}>
                      {g.nome}
                    </option>
                  ))}
                  <option value="riposo">Riposo</option>
                </optgroup>
                {salvati.length > 0 && libera && (
                  <optgroup label="Allenamenti salvati">
                    {salvati.map((g) => (
                      <option key={g.id} value={`s:${libera.id}:${g.id}`}>
                        {g.nome}
                      </option>
                    ))}
                  </optgroup>
                )}
                {altre.map((sc) => (
                  <optgroup key={sc.id} label={sc.nome}>
                    {sc.giorni
                      .filter((g) => g.tipo === 'workout')
                      .map((g) => (
                        <option key={g.id} value={`s:${sc.id}:${g.id}`}>
                          {g.nome}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <optgroup label="Fuori dall'app">
                  <option value="altro">Altro (scrivilo tu)…</option>
                </optgroup>
              </select>
            </div>
            {scelta === 'altro' && (
              <div className="field" style={{ marginBottom: 8 }}>
                <input
                  className="input"
                  value={nomeAltro}
                  maxLength={60}
                  placeholder="Es. Calcetto, Corsa, Nuoto"
                  onChange={(e) => setNomeAltro(e.target.value)}
                  aria-label="Cosa fai questo giorno"
                />
              </div>
            )}
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px', lineHeight: 1.4 }}>
              L’allenamento che c’era passa al prossimo giorno di allenamento.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-sm grow" onClick={() => setCambia(false)}>
                Annulla
              </button>
              <button
                className="btn btn-accent btn-sm grow"
                onClick={salva}
                disabled={!scelta || (scelta === 'altro' && !nomeAltro.trim())}
              >
                Salva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
