import { useState } from 'react'
import { createPortal } from 'react-dom'
import { schemaPerSettimana } from '../data/model'
import { statoScheda } from '../lib/progression'
import { formatSerieRip } from '../lib/schema'
import { IconChevron, IconClose } from './icons'

// ---------------------------------------------------------------------------
// "Seleziona da scheda" (pages/NuovoAllenamentoPage): un allenamento di una
// delle proprie schede da fare adesso. Parte come allenamento a sé
// (iniziaAllenamentoLibero), quindi resta nello storico e la scheda non si
// accorge di niente: non avanza e non perde quell'allenamento.
//
// Tre passi nello stesso foglio: le SCHEDE in anteprima (anche terminate e
// archiviate, dopo quelle in corso), toccandone una i suoi GIORNI, e per un
// giorno che cambia di settimana in settimana la SETTIMANA, con gli schemi di
// quella settimana sotto (parte da quella a cui è arrivata la scheda). Un
// giorno uguale in tutte le settimane parte subito.
// ---------------------------------------------------------------------------

/** Il giorno pronto per l'allenamento libero, con gli schemi della settimana scelta (se no quella in corso). */
export function giornoDaScheda(scheda, giorno, settimana = statoScheda(scheda).settimana) {
  return {
    nome: giorno.nome,
    esercizi: giorno.esercizi.map((e) => ({
      ...e,
      variaPerSettimana: false,
      schemaBase: schemaPerSettimana(e, settimana),
    })),
    riscaldamento: giorno.riscaldamento,
    stretching: giorno.stretching,
  }
}

const giorniDi = (s) => s.giorni.filter((g) => g.tipo === 'workout' && g.esercizi.length)
const numeroEsercizi = (n) => `${n} ${n === 1 ? 'esercizio' : 'esercizi'}`

export default function SelezionaDaScheda({ schede, onScegli, onChiudi }) {
  // Anche le terminate e le archiviate (sono archiviate anche le terminate):
  // un allenamento di una scheda vecchia si rifà volentieri.
  const conGiorni = (schede || [])
    .filter((s) => !s.libera && giorniDi(s).length)
    .sort((a, b) => !!a.archiviata - !!b.archiviata)
  const [schedaId, setSchedaId] = useState(null)
  const [giornoId, setGiornoId] = useState(null)
  const [settimana, setSettimana] = useState(null)

  const scheda = conGiorni.find((s) => s.id === schedaId) || null
  const giorno = scheda?.giorni.find((g) => g.id === giornoId) || null
  const settimane = scheda ? Math.max(1, scheda.numeroSettimane || 1) : 1

  const scegliGiorno = (g) => {
    // Le settimane si chiedono solo se il giorno cambia davvero.
    if (settimane < 2 || !g.esercizi.some((e) => e.variaPerSettimana)) return onScegli(giornoDaScheda(scheda, g))
    setGiornoId(g.id)
    setSettimana(Math.min(statoScheda(scheda).settimana, settimane))
  }
  const indietro = () => (giorno ? setGiornoId(null) : setSchedaId(null))

  const titolo = giorno ? giorno.nome : scheda ? scheda.nome : 'Seleziona da scheda'

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Seleziona da scheda" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>
          {scheda && (
            <button className="icon-btn" aria-label="Indietro" onClick={indietro}>
              <IconChevron style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          <h3 className="grow" style={{ minWidth: 0 }}>
            {titolo}
          </h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        {!scheda ? (
          conGiorni.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5 }}>Non hai ancora schede con degli allenamenti.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {conGiorni.map((s) => (
                <AnteprimaScheda key={s.id} scheda={s} onApri={() => setSchedaId(s.id)} />
              ))}
            </div>
          )
        ) : !giorno ? (
          <div className="stack" style={{ gap: 8 }}>
            {giorniDi(scheda).map((g) => (
              <button key={g.id} className="menu-voce" onClick={() => scegliGiorno(g)}>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="menu-voce-nome">{g.nome}</span>
                  <span className="menu-voce-desc">
                    {numeroEsercizi(g.esercizi.length)} ·{' '}
                    {g.esercizi
                      .map((e) => e.nome?.trim())
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </span>
                <IconChevron className="faint" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="section-title" style={{ marginBottom: 8 }}>
              Quale settimana
            </div>
            <div className="tipi-rip" role="group" aria-label="Settimana" style={{ marginTop: 0 }}>
              {Array.from({ length: settimane }, (_, i) => i + 1).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={'chip chip-scelta' + (settimana === w ? ' on' : '')}
                  aria-pressed={settimana === w}
                  onClick={() => setSettimana(w)}
                >
                  Settimana {w}
                </button>
              ))}
            </div>
            <div className="stack" style={{ gap: 4, marginTop: 14 }}>
              {giorno.esercizi.map((e) => (
                <div key={e.id} className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}>
                  <span style={{ minWidth: 0 }}>{e.nome}</span>
                  <span className="muted nowrap">{formatSerieRip(schemaPerSettimana(e, settimana))}</span>
                </div>
              ))}
            </div>
            <button
              className="btn btn-accent btn-block btn-lg"
              style={{ marginTop: 16 }}
              onClick={() => onScegli(giornoDaScheda(scheda, giorno, settimana))}
            >
              Inizia
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// Una scheda in breve: nome, a che punto è, i suoi giorni.
function AnteprimaScheda({ scheda, onApri }) {
  const giorni = giorniDi(scheda)
  const stato = statoScheda(scheda)
  return (
    <button className="scheda-card" onClick={onApri}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="nome">{scheda.nome}</div>
          <div className="meta" style={{ flexWrap: 'wrap' }}>
            {scheda.archiviata ? (
              <span className="badge">{scheda.terminataIl ? 'Terminata' : 'Archiviata'}</span>
            ) : (
              <span className="badge badge-accent">
                Settimana {stato.settimana}
                {scheda.senzaFine ? '' : `/${scheda.numeroSettimane}`}
              </span>
            )}
            <span className="nowrap">
              {giorni.length} {giorni.length === 1 ? 'giorno' : 'giorni'}
            </span>
          </div>
        </div>
        <IconChevron className="faint" />
      </div>
      <div className="stack" style={{ gap: 3, marginTop: 10 }}>
        {giorni.map((g) => (
          <div key={g.id} className="meta" style={{ marginTop: 0, minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }} className="nowrap">
              {g.nome}
            </span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {g.esercizi
                .map((e) => e.nome?.trim())
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}
