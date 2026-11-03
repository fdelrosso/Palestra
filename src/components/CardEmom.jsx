// src/components/CardEmom.jsx
import { useEffect, useRef, useState } from 'react'
import { esercizioDelMinuto, intervalli, statoOrologio, testoEmom } from '../lib/emom'
import { fasiDi, formattaCarico, formattaRip } from '../lib/schema'
import { COLORI } from '../lib/session'
import { beep, sbloccaAudio } from '../hooks/useRestTimer'

const SFORZI = ['verde', 'giallo', 'rosso']
// Il conto dell'intervallo come un orologio: 1:00, 0:59 … 0:05.
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Il blocco EMOM in allenamento (lib/emom): l'orologio va da solo, calcolato
// dall'istante di partenza salvato nella sessione (`emom.inizio`), così regge
// lo schermo spento e "Esci" → "Riprendi". Lo sforzo si dà toccando il
// pallino, quando si vuole: l'orologio non si ferma mai. Un intervallo non
// dato resta in sospeso; a fine EMOM vale fatto come da piano (chiudiEmom).
export default function CardEmom({ esercizi, blocco, attiva, onAvvia, onColore, onCresci, onChiudi }) {
  const emom = esercizi[blocco.inizio].emom
  const n = blocco.indici.length
  const tot = intervalli(emom)
  const finito = emom.minutiFatti != null
  const corre = emom.inizio != null && !finito
  const [adesso, setAdesso] = useState(() => Date.now())
  useEffect(() => {
    if (!corre) return
    const t = setInterval(() => setAdesso(Date.now()), 250)
    return () => clearInterval(t)
  }, [corre])
  const stato = corre ? statoOrologio(emom.inizio, emom, adesso) : null

  // A ogni intervallo nuovo: bip (se acceso), vibrazione e, se manca, la
  // serie in più (a oltranza, o oltre le 30 della sessione). Riprendendo a
  // metà non suona: l'intervallo era già iniziato.
  const ultimo = useRef(null)
  const minuto = stato && !stato.pronti ? stato.minuto : null
  useEffect(() => {
    if (minuto == null) return
    if (stato.finito) {
      onChiudi(tot)
      return
    }
    if (ultimo.current === minuto) return
    if (ultimo.current !== null || minuto === 0) {
      beep()
      navigator.vibrate?.(200)
    }
    ultimo.current = minuto
    onCresci(minuto)
  }, [minuto, stato?.finito]) // eslint-disable-line react-hooks/exhaustive-deps

  // Il pallino scelto per dare lo sforzo; se no quello dell'intervallo in corso.
  const [scelto, setScelto] = useState(null)
  const visti = finito ? emom.minutiFatti : tot ?? (minuto ?? 0) + 1
  const diMinuto = (m) => {
    const { k, j } = esercizioDelMinuto(n, m)
    return { i: blocco.indici[k], j, m }
  }
  const quiOra = minuto != null ? diMinuto(minuto) : null
  const bersaglio = scelto || quiOra
  const descrivi = (i) => {
    const f = fasiDi(esercizi[i].schema)[0] || {}
    const rip = formattaRip(f.rip)
    return [esercizi[i].nome, rip && `×${rip}`, formattaCarico(f.carico)].filter(Boolean).join(' · ')
  }
  const dopo = minuto != null && (tot == null || minuto + 1 < tot) ? diMinuto(minuto + 1) : null

  return (
    <div className={'card emom-card' + (attiva ? '' : ' non-attiva')} inert={!attiva}>
      <div className="emom-titolo">{testoEmom(emom)}</div>

      {!corre && !finito && (
        <>
          <ul className="emom-piano">
            {blocco.indici.map((i) => (
              <li key={i}>{descrivi(i)}</li>
            ))}
          </ul>
          <button
            className="btn btn-accent btn-block"
            onClick={() => {
              sbloccaAudio()
              onAvvia()
            }}
          >
            Avvia EMOM
          </button>
        </>
      )}

      {stato && stato.pronti > 0 && (
        <div className="emom-orologio">
          <span className="emom-minuto">Pronti…</span>
          <span className="emom-conto">{stato.pronti}</span>
        </div>
      )}

      {stato && !stato.pronti && quiOra && (
        <>
          <div className={'emom-orologio' + (stato.restanteSec <= 3 ? ' ultimi' : '')}>
            <span className="emom-minuto">
              {emom.ogniSec === 60 ? 'Minuto' : 'Intervallo'} {minuto + 1}
              {tot != null && ` di ${tot}`}
            </span>
            <span className="emom-conto">{mmss(stato.restanteSec)}</span>
          </div>
          <div className="emom-ora">{descrivi(quiOra.i)}</div>
          {dopo && <div className="emom-dopo">Poi: {descrivi(dopo.i)}</div>}
        </>
      )}

      {finito && <div className="emom-finito">EMOM finito ✓</div>}

      {(corre || finito) && (
        <>
          <div className="emom-pallini" role="group" aria-label="Intervalli">
            {Array.from({ length: visti }, (_, m) => {
              const x = diMinuto(m)
              const colore = esercizi[x.i].sets[x.j]?.colore || ''
              const acceso = bersaglio && bersaglio.m === m
              return (
                <button
                  key={m}
                  type="button"
                  className={'set-dot ' + colore + (acceso ? ' acceso' : '')}
                  aria-label={`Intervallo ${m + 1}: ${esercizi[x.i].nome}`}
                  onClick={() => setScelto(x)}
                >
                  {m + 1}
                </button>
              )
            })}
          </div>
          {bersaglio && esercizi[bersaglio.i].sets[bersaglio.j] && (
            <div className="emom-sforzo">
              <span className="muted">
                Com'è andata? {esercizi[bersaglio.i].nome} · {bersaglio.m + 1}°
              </span>
              <div className="effort-buttons">
                {SFORZI.map((c) => (
                  <button
                    key={c}
                    className={'effort ' + c}
                    onClick={() => {
                      onColore(bersaglio.i, bersaglio.j, c)
                      setScelto(null)
                    }}
                  >
                    {COLORI[c].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Non durante il "Pronti…": un tocco per sbaglio chiuderebbe l'EMOM a zero. */}
      {corre && !stato.pronti && (
        <button
          className="btn btn-block"
          style={{ marginTop: 12 }}
          onClick={() => {
            if (tot != null && !confirm('Fermare l’EMOM? Valgono gli intervalli fatti.')) return
            onChiudi(minuto)
          }}
        >
          {tot == null ? 'Non ce la faccio più' : 'Ferma'}
        </button>
      )}
    </div>
  )
}
