import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import DietaTestata from '../components/DietaTestata'
import { dietaDaDatiFisici, oggiISO } from '../lib/dieta'
import { oggiEAllenamento } from '../lib/consiglio'
import { guardaGiorno } from '../lib/giornoDieta'
import { giorniMese, giorniSettimana, riepilogoGiorno, riepilogoPeriodo, sposta } from '../lib/andamentoDieta'
import { IconChevron } from '../components/icons'

// ---------------------------------------------------------------------------
// Dieta → Storico: com'è andata. Come lo Storico di Allenamento, ma per il
// mangiare: la SETTIMANA giorno per giorno (quanto, su quanto) e il MESE a
// calendario, ogni giorno col colore di com'è andato. In cima le medie del
// periodo, solo sui giorni segnati (lib/andamentoDieta).
//
// Toccando un giorno si apre "Oggi" su quel giorno, per vederlo o correggerlo.
// ⚠️ Il colore (dentro, sotto, sopra) ce l'hanno solo le giornate completate:
// le altre sono "segnate" e restano neutre (lib/andamentoDieta).
// ---------------------------------------------------------------------------

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const STATI = {
  dentro: 'Nell’obiettivo',
  sotto: 'Sotto',
  sopra: 'Sopra',
  segnato: 'Non completata',
}

const giornoDelMese = (iso) => Number(iso.slice(8, 10))
const etichettaSettimana = (giorni) => {
  const [a, b] = [giorni[0], giorni[6]]
  const mese = (iso) => MESI[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase()
  return `${giornoDelMese(a)} ${mese(a)} – ${giornoDelMese(b)} ${mese(b)}`
}

export default function DietaStoricoPage() {
  const { diario, diete, schede, preferenze } = useStore()
  const { utenteCorrente } = useAccount()
  const [vista, setVista] = useState('settimana')
  const [quando, setQuando] = useState(oggiISO())

  const contesto = useMemo(
    () => ({
      diario,
      diete,
      proposta: diete.length ? null : dietaDaDatiFisici(utenteCorrente?.dati, preferenze),
      allenamentoIl: (d) => oggiEAllenamento(schede, d).allenamento,
    }),
    [diario, diete, schede, utenteCorrente, preferenze],
  )
  const giorni = useMemo(
    () => (vista === 'settimana' ? giorniSettimana(quando) : giorniMese(quando)).map((d) => riepilogoGiorno(d, contesto)),
    [vista, quando, contesto],
  )
  const periodo = riepilogoPeriodo(giorni)
  const oggi = oggiISO()

  const apri = (data) => {
    guardaGiorno(data)
    navigate(routes.dietaOggi())
  }
  const passo = (n) => setQuando((q) => sposta(q, vista === 'settimana' ? { settimane: n } : { mesi: n }))
  const titolo =
    vista === 'settimana'
      ? etichettaSettimana(giorni.map((g) => g.data))
      : `${MESI[Number(quando.slice(5, 7)) - 1]} ${quando.slice(0, 4)}`

  return (
    <div className="app">
      <DietaTestata attiva="storico" />

      <div className="segmented" role="tablist" aria-label="Periodo" style={{ marginBottom: 12 }}>
        {[
          ['settimana', 'Settimana'],
          ['mese', 'Mese'],
        ].map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={vista === k}
            className={'seg-btn' + (vista === k ? ' on' : '')}
            onClick={() => setVista(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="giorno-dieta">
        <button className="icon-btn" aria-label={vista === 'settimana' ? 'Settimana prima' : 'Mese prima'} onClick={() => passo(-1)}>
          <IconChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="giorno-dieta-nome">{titolo}</span>
        <button className="icon-btn" aria-label={vista === 'settimana' ? 'Settimana dopo' : 'Mese dopo'} onClick={() => passo(1)}>
          <IconChevron width={18} height={18} />
        </button>
      </div>

      {/* Le medie del periodo, solo sui giorni in cui si è segnato qualcosa. */}
      <div className="card bilancio" style={{ marginBottom: 14 }}>
        {periodo.segnati === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13.5, textAlign: 'center' }}>
            {vista === 'settimana' ? 'Questa settimana' : 'Questo mese'} non hai segnato niente.
          </p>
        ) : (
          <>
            <div className="bilancio-kcal">
              <div className="kcal-big">
                {periodo.kcal} <small>{periodo.obiettivoKcal ? `/ ${periodo.obiettivoKcal} kcal` : 'kcal'}</small>
              </div>
              <div className="bilancio-resta">
                In media, sui {periodo.segnati} {periodo.segnati === 1 ? 'giorno segnato' : 'giorni segnati'}
              </div>
            </div>
            <div className="dieta-vista-numeri" style={{ marginTop: 12 }}>
              <div>
                <strong>{periodo.completate ? `${periodo.dentro}/${periodo.completate}` : '–'}</strong>
                <span>{periodo.completate ? 'nell’obiettivo' : 'completate'}</span>
              </div>
              <div>
                <strong>{periodo.proteine}</strong>
                <span>proteine</span>
              </div>
              <div>
                <strong>{periodo.carbo}</strong>
                <span>carbo</span>
              </div>
              <div>
                <strong>{periodo.grassi}</strong>
                <span>grassi</span>
              </div>
            </div>
          </>
        )}
      </div>

      {vista === 'settimana' ? (
        <div className="card lista-cibi">
          {giorni.map((g, i) => {
            const perc = g.obiettivo?.kcal ? Math.min(100, Math.round((g.mangiato.kcal / g.obiettivo.kcal) * 100)) : 0
            return (
              <button
                key={g.data}
                type="button"
                className="riga-alimento storico-giorno"
                onClick={() => apri(g.data)}
                disabled={g.futuro}
              >
                <span className={'storico-giorno-nome' + (g.data === oggi ? ' oggi' : '')}>
                  {GIORNI[i]} {giornoDelMese(g.data)}
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="barra-macro-pista" style={{ display: 'block' }}>
                    <span
                      className={'barra-macro-riempi stato-' + g.stato}
                      style={{ display: 'block', width: g.segnato ? `${perc || 100}%` : 0 }}
                    />
                  </span>
                </span>
                <span className="storico-giorno-kcal">
                  {g.segnato ? g.mangiato.kcal : '–'}
                  {g.obiettivo?.kcal ? <span className="faint"> / {g.obiettivo.kcal}</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <section className="cal-card">
          <div className="cal-grid cal-dow">
            {GIORNI.map((g) => (
              <div key={g} className="cal-dow-cell" aria-label={g}>
                {g.charAt(0)}
              </div>
            ))}
          </div>
          <div className="cal-grid">
            {/* Il mese parte dal suo giorno della settimana: celle vuote davanti. */}
            {Array.from({ length: (new Date(Number(quando.slice(0, 4)), Number(quando.slice(5, 7)) - 1, 1).getDay() + 6) % 7 }, (_, i) => (
              <div key={`v${i}`} className="cal-cell" />
            ))}
            {giorni.map((g) => (
              <div key={g.data} className="cal-cell">
                <button
                  type="button"
                  className={
                    'cal-day' +
                    (g.segnato ? ` dieta-${g.stato}` : g.futuro ? ' futuro' : ' passato') +
                    (g.data === oggi ? ' today' : '')
                  }
                  onClick={() => apri(g.data)}
                  disabled={g.futuro}
                  aria-label={`${giornoDelMese(g.data)}: ${g.segnato ? `${g.mangiato.kcal} kcal, ${STATI[g.stato].toLowerCase()}` : 'niente segnato'}`}
                >
                  {giornoDelMese(g.data)}
                </button>
              </div>
            ))}
          </div>
          <div className="cal-legenda">
            {['dentro', 'sotto', 'sopra'].map((s) => (
              <span key={s}>
                <span className={`cal-day cal-day-mini dieta-${s}`} aria-hidden="true" />
                {STATI[s]}
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="muted" style={{ fontSize: 12, margin: '14px 2px 0', lineHeight: 1.45 }}>
        «Nell’obiettivo» vuol dire entro il 10% dalle calorie della tua dieta per quel giorno
        (allenamento o riposo). Tocca un giorno per aprirlo.
      </p>
    </div>
  )
}
