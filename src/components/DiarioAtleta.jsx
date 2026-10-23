import { useEffect, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { conKcal, oggiISO } from '../lib/dieta'
import { SLOT_GIORNATA, bicchieriDi, totaliGiorno, vociPerSlot } from '../lib/diario'
import { giorniSettimana, sposta } from '../lib/andamentoDieta'
import { diarioDellAtleta } from '../lib/diarioAtleta'
import { proposteDietaMandate } from '../lib/proposteDieta'
import { IconCheck, IconChevron } from './icons'

// ---------------------------------------------------------------------------
// Il PT guarda cosa mangia un suo atleta (pages/AtletiPage, linguetta Dieta):
// la settimana giorno per giorno, con calorie, macro e acqua, e toccando un
// giorno cosa c'è dentro pasto per pasto.
//
// ⚠️ Solo le giornate che l'atleta lascia visibili (in fondo a Dieta → Oggi,
// di default sì): le altre il database non le manda, e qui sembrano vuote.
// Lo si dice, così un giorno "vuoto" non diventa un giorno saltato.
//
// La spunta accanto alle calorie: l'atleta ha chiuso la giornata ("Giornata
// completata"), quindi il conto è quello vero e non uno a metà.
//
// Come riferimento, l'ultima dieta che il PT gli ha mandato e che lui ha
// salvato: le sue calorie di allenamento e di riposo.
// ---------------------------------------------------------------------------

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const gg = (iso) => Number(iso.slice(8, 10))
const mese = (iso) => MESI[Number(iso.slice(5, 7)) - 1]

function Giorno({ giorno, data, indice }) {
  const [aperto, setAperto] = useState(false)
  const voci = giorno?.voci || []
  const t = totaliGiorno(giorno)
  const acqua = bicchieriDi(giorno)
  const futuro = data > oggiISO()
  const vuoto = voci.length === 0 && acqua === 0
  const perSlot = vociPerSlot(giorno)
  return (
    <div className="card diario-atleta-giorno">
      <button
        type="button"
        className="diario-atleta-testa"
        onClick={() => setAperto((a) => !a)}
        disabled={vuoto}
        aria-expanded={vuoto ? undefined : aperto}
      >
        <span className="diario-atleta-data">
          <strong>{GIORNI[indice]}</strong> {gg(data)}
        </span>
        {vuoto ? (
          <span className="faint grow">{futuro ? '' : 'Niente da vedere'}</span>
        ) : (
          <span className="grow" style={{ minWidth: 0 }}>
            <strong>{t.kcal} kcal</strong>
            {giorno.completata && (
              <IconCheck width={13} height={13} aria-label="Giornata completata" style={{ color: 'var(--good)', marginLeft: 4, verticalAlign: '-2px' }} />
            )}
            <span className="muted" style={{ fontSize: 12 }}>
              {' '}· P {Math.round(t.proteine)} · C {Math.round(t.carbo)} · G {Math.round(t.grassi)}
              {acqua > 0 && ` · ${acqua} bicch.`}
            </span>
          </span>
        )}
        {!vuoto && (
          <IconChevron width={15} height={15} style={{ transform: aperto ? 'rotate(90deg)' : undefined }} />
        )}
      </button>
      {aperto && (
        <div className="diario-atleta-pasti">
          {SLOT_GIORNATA.filter((s) => perSlot[s.id]?.length).map((s) => (
            <div key={s.id}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>{s.label}</div>
              {perSlot[s.id].map((v) => (
                <div key={v.id} className="row" style={{ justifyContent: 'space-between', gap: 8, fontSize: 13.5 }}>
                  <span style={{ minWidth: 0 }}>{v.testo || v.nome}</span>
                  <span className="faint" style={{ flexShrink: 0 }}>{v.kcal} kcal</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiarioAtleta({ atleta }) {
  const { utenteCorrente } = useAccount()
  const [quando, setQuando] = useState(oggiISO())
  const [giorni, setGiorni] = useState(undefined)
  const [dieta, setDieta] = useState(null)
  const settimana = giorniSettimana(quando)
  const lunedi = settimana[0]

  useEffect(() => {
    let vivo = true
    const s = giorniSettimana(lunedi)
    diarioDellAtleta(atleta.id, s[0], s[6]).then((g) => vivo && setGiorni(g))
    return () => {
      vivo = false
    }
  }, [atleta.id, lunedi])

  useEffect(() => {
    let vivo = true
    proposteDietaMandate(utenteCorrente?.id).then((r) => {
      if (!vivo) return
      const salvate = r.filter((p) => p.atletaId === atleta.id && p.stato === 'accettata')
      setDieta(salvate[0] || null)
    })
    return () => {
      vivo = false
    }
  }, [utenteCorrente?.id, atleta.id])

  const perData = new Map((giorni || []).map((g) => [g.data, g]))
  const visibili = (giorni || []).filter((g) => g.voci.length > 0)
  const media = visibili.length ? Math.round(visibili.reduce((t, g) => t + totaliGiorno(g).kcal, 0) / visibili.length) : 0
  const questa = settimana.includes(oggiISO())

  return (
    <>
      {dieta && (
        <div className="card row" style={{ gap: 8, marginBottom: 10, padding: '10px 12px' }}>
          <span className="muted grow" style={{ fontSize: 13 }}>
            Segue <strong style={{ color: 'var(--text)' }}>{dieta.nome}</strong>
          </span>
          <span className="faint" style={{ fontSize: 12.5 }}>
            {conKcal(dieta.dati?.allenamento) || '-'} / {conKcal(dieta.dati?.riposo) || '-'} kcal
          </span>
        </div>
      )}

      <div className="giorno-dieta">
        <button className="icon-btn" aria-label="Settimana prima" onClick={() => (setGiorni(undefined), setQuando(sposta(quando, { settimane: -1 })))}>
          <IconChevron width={18} height={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="giorno-dieta-nome">
          {questa ? 'Questa settimana' : `${gg(settimana[0])} ${mese(settimana[0])} – ${gg(settimana[6])} ${mese(settimana[6])}`}
        </span>
        {!questa && (
          <button className="btn btn-ghost btn-sm" onClick={() => (setGiorni(undefined), setQuando(oggiISO()))}>
            Oggi
          </button>
        )}
        <button className="icon-btn" aria-label="Settimana dopo" onClick={() => (setGiorni(undefined), setQuando(sposta(quando, { settimane: 1 })))}>
          <IconChevron width={18} height={18} />
        </button>
      </div>

      {giorni === undefined ? (
        <p className="muted" style={{ fontSize: 13, margin: '8px 2px' }}>Carico…</p>
      ) : giorni === null ? (
        <div className="riquadro riquadro-avviso">Non riesco a leggere il diario adesso. Riprova fra poco.</div>
      ) : (
        <>
          {visibili.length > 0 && (
            <p className="muted" style={{ fontSize: 13, margin: '0 2px 8px' }}>
              In media <strong style={{ color: 'var(--text)' }}>{media} kcal</strong> nei {visibili.length}{' '}
              {visibili.length === 1 ? 'giorno segnato' : 'giorni segnati'}.
            </p>
          )}
          <div className="stack" style={{ gap: 6 }}>
            {settimana.map((d, i) => (
              <Giorno key={d} data={d} indice={i} giorno={perData.get(d)} />
            ))}
          </div>
          <p className="faint" style={{ fontSize: 12, margin: '10px 2px 0', lineHeight: 1.45 }}>
            Vedi solo le giornate che {atleta.nome} lascia visibili: quelle private qui sembrano vuote.
          </p>
        </>
      )}
    </>
  )
}
