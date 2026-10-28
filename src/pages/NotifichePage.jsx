import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '../store/AccountContext'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  fraseNotifica,
  fraseNotificaAppuntamento,
  fraseNotificaCheck,
  fraseNotificaScheda,
  leggiNotifiche,
  segnaNotificheLette,
} from '../lib/notifiche'
import { quandoBreve } from '../lib/format'
import { dataScadenza } from '../lib/scadenza'
import { orarioInParole } from '../lib/orariAppuntamento'
import { IconBack, IconCalendar, IconComment, IconCuore, IconImage, IconVideo } from '../components/icons'

// ---------------------------------------------------------------------------
// Il cuoricino del proprio Profilo (/notifiche): chi ha messo mi piace o ha
// commentato i tuoi allenamenti, una riga per allenamento e per tipo
// (lib/notifiche). Toccare una riga porta al post nel tuo profilo, con i mi
// piace o i commenti già aperti.
//
// Aprire questa pagina segna tutto come visto (il numero rosso si spegne), ma
// DOPO aver letto: le righe nuove restano evidenziate finché si è qui.
// ---------------------------------------------------------------------------

export default function NotifichePage() {
  const { utenteCorrente } = useAccount()
  const { schede } = useStore()
  const ioId = utenteCorrente?.id || null
  const [righe, setRighe] = useState(null)

  useEffect(() => {
    if (!ioId) return undefined
    let vivo = true
    leggiNotifiche().then((esito) => {
      if (!vivo) return
      setRighe(esito.righe)
      if (esito.ok) segnaNotificheLette(ioId)
    })
    return () => {
      vivo = false
    }
  }, [ioId])

  // Il nome dell'allenamento dalla chiave '<schedaId>|<data>': è mio, quindi
  // sta fra le mie schede.
  const nomeDi = useMemo(() => {
    const mappa = new Map()
    for (const s of schede || []) {
      for (const c of s.completamenti || []) {
        if (!c.data) continue
        const giorno = (s.giorni || []).find((g) => g.id === c.giornoId)
        mappa.set(`${s.id}|${c.data}`, c.nomeGiorno || giorno?.nome || 'Allenamento')
      }
    }
    return (chiave) => mappa.get(chiave) || 'Allenamento'
  }, [schede])

  const apri = (r) => {
    // Check e video: lo scatto, nella cartella giusta — la mia (Check e video)
    // o quella dell'atleta (Lavoro → Check e video atleti).
    if (r.genere === 'check') {
      if (r.atletaId === ioId) return navigate(`${routes.foto()}?${new URLSearchParams({ apri: r.chiave })}`)
      return navigate(`${routes.fotoAtleti()}?${new URLSearchParams({ atleta: r.atletaId, apri: r.chiave })}`)
    }
    // Le schede del PT: al PT la pagina dell'atleta (lì decide il rinnovo),
    // all'atleta la sua copia della scheda (lib/proposteScheda, id `pt-…`).
    if (r.genere === 'appuntamento') return navigate(`${routes.appuntamenti()}?${new URLSearchParams({ apri: r.chiave })}`)
    if (r.genere === 'scheda') {
      if (r.tipo === 'richiesta' || r.tipo === 'allunga-richiesta') return navigate(routes.atleta(r.atletaId))
      return navigate(schede.some((s) => s.id === 'pt-' + r.chiave) ? routes.scheda('pt-' + r.chiave) : routes.home())
    }
    const q = new URLSearchParams({ post: r.chiave, apri: r.tipo })
    navigate(`${routes.amici()}?${q}`)
  }

  const riga = (r) =>
    r.genere === 'scheda' || r.genere === 'appuntamento' ? (
      <RigaScheda key={`${r.genere}-${r.tipo}-${r.chiave}-${r.ultimoIl}`} r={r} onApri={() => apri(r)} />
    ) : r.genere === 'check' ? (
      <RigaCheck key={`c-${r.tipo}-${r.chiave}-${r.ultimoIl}`} r={r} onApri={() => apri(r)} />
    ) : (
      <RigaNotifica key={r.tipo + r.chiave} r={r} nome={nomeDi(r.chiave)} onApri={() => apri(r)} />
    )

  const nuove = (righe || []).filter((r) => r.nuovi > 0)
  const prima = (righe || []).filter((r) => r.nuovi === 0)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => goBack()} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Attività</h1>
      </div>

      {righe == null ? (
        <p className="muted">Un attimo…</p>
      ) : righe.length === 0 ? (
        <div className="empty">
          <div className="big">🤍</div>
          <p>
            Ancora niente.
            <br />
            Qui trovi chi mette mi piace o commenta i tuoi allenamenti pubblici, e i commenti
            del tuo PT su check e video.
          </p>
        </div>
      ) : (
        <>
          {nuove.length > 0 && (
            <>
              <div className="section-title">Nuove</div>
              <div className="chat-lista">
                {nuove.map(riga)}
              </div>
            </>
          )}
          {prima.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: nuove.length ? 18 : 0 }}>
                {nuove.length ? 'Prima' : 'Tutte'}
              </div>
              <div className="chat-lista">
                {prima.map(riga)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function RigaNotifica({ r, nome, onApri }) {
  const commento = r.tipo === 'commento'
  return (
    <button className={'chat-lista-riga notifica-riga' + (r.nuovi > 0 ? ' da-leggere' : '')} onClick={onApri}>
      <span className={'notifica-icona' + (commento ? ' commento' : '')} aria-hidden="true">
        {commento ? <IconComment width={18} height={18} /> : <IconCuore pieno width={18} height={18} />}
      </span>
      <span className="chat-lista-testo">
        <span className="notifica-frase">
          <strong>{fraseNotifica(r)}</strong> {commento ? 'il tuo allenamento' : 'al tuo allenamento'}{' '}
          <strong>{nome}</strong>
        </span>
        {commento && r.ultimoTesto && <span className="notifica-citazione">“{r.ultimoTesto}”</span>}
        <span className="chat-lista-ora">{quandoBreve(r.ultimoIl)}</span>
      </span>
      {r.nuovi > 0 && (
        <span className="pallino-notifica" aria-label={`${r.nuovi} nuovi`}>
          {r.nuovi}
        </span>
      )}
    </button>
  )
}

// Una notifica delle schede del PT (lib/notifiche, daRigaScheda): scadenza,
// rinnovo, settimane sbloccate, allungamenti, allegati del PT. Con l'icona del calendario anche quelle degli
// appuntamenti (daRigaAppuntamento).
function RigaScheda({ r, onApri }) {
  const frase =
    r.genere === 'appuntamento' ? fraseNotificaAppuntamento(r, orarioInParole) : fraseNotificaScheda(r, dataScadenza)
  // Un allegato del PT su un esercizio: il testo è "esercizio|giorno", già
  // dentro la frase (lib/notifiche).
  const allegato = String(r.tipo || '').startsWith('allegato-')
  return (
    <button className={'chat-lista-riga notifica-riga' + (r.nuovi > 0 ? ' da-leggere' : '')} onClick={onApri}>
      <span className="notifica-icona" aria-hidden="true">
        {r.tipo === 'allegato-video' ? <IconVideo width={18} height={18} /> : <IconCalendar width={18} height={18} />}
      </span>
      <span className="chat-lista-testo">
        <span className="notifica-frase">
          <strong>{frase}</strong>
        </span>
        {r.ultimoTesto && !allegato &&
          (r.tipo === 'modificata' ? (
            // Cosa è cambiato, una riga per cambio (lib/cambiScheda).
            <span className="notifica-citazione" style={{ whiteSpace: 'pre-line' }}>{r.ultimoTesto}</span>
          ) : (
            <span className="notifica-citazione">“{r.ultimoTesto}”</span>
          ))}
        <span className="chat-lista-ora">{quandoBreve(r.ultimoIl)}</span>
      </span>
      {r.nuovi > 0 && <span className="pallino-notifica" aria-label="Nuova">1</span>}
    </button>
  )
}

// Una notifica di Check e video (lib/notifiche, daRigaCheck): una per evento.
function RigaCheck({ r, onApri }) {
  const commento = r.tipo === 'commento'
  return (
    <button className={'chat-lista-riga notifica-riga' + (r.nuovi > 0 ? ' da-leggere' : '')} onClick={onApri}>
      <span className={'notifica-icona' + (commento ? ' commento' : '')} aria-hidden="true">
        {commento ? (
          <IconComment width={18} height={18} />
        ) : r.categoria === 'esecuzione' ? (
          <IconVideo width={18} height={18} />
        ) : (
          <IconImage width={18} height={18} />
        )}
      </span>
      <span className="chat-lista-testo">
        <span className="notifica-frase">
          <strong>{fraseNotificaCheck(r)}</strong>
        </span>
        {r.ultimoTesto && <span className="notifica-citazione">“{r.ultimoTesto}”</span>}
        <span className="chat-lista-ora">{quandoBreve(r.ultimoIl)}</span>
      </span>
      {r.nuovi > 0 && <span className="pallino-notifica" aria-label="Nuova">1</span>}
    </button>
  )
}