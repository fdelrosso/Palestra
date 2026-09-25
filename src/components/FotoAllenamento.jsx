import { useEffect, useRef, useState } from 'react'
import {
  VISIBILITA_FOTO_ALL,
  aggiornaVisibilitaFotoAllenamento,
  aggiungiFotoAllenamento,
  eliminaFotoAllenamento,
  fonteFotoAllenamento,
  fotoDiAllenamenti,
} from '../lib/fotoAllenamento'
import { DURATA_VIDEO_MAX, durataVideo, videoTroppoLungo } from '../lib/media'
import { IconClose, IconImage } from './icons'

// ---------------------------------------------------------------------------
// Le foto e i video di UN allenamento, da chi l'ha fatto: aggiungerli e
// toglierli. Si sfogliano nel Feed insieme al recap.
//
// Sta in DUE posti soli, apposta: il riepilogo di fine allenamento (è il
// momento in cui le foto si hanno in mano) e il recap del calendario (per
// aggiungerle dopo). Dal Feed non si aggiunge niente: il Feed si guarda, e una
// pagina "aggiungi una foto" in mezzo ai recap degli altri era rumore.
//
// ⚠️ LA VISIBILITÀ DELLE FOTO SEGUE QUELLA DELL'ALLENAMENTO (`pubblica`). La
// foto se la porta scritta addosso (vedi `allenamento_foto` in schema.sql), e
// se le due non combaciano il Feed mostra un allenamento pubblico con le foto
// che non si aprono — o, peggio, foto pubbliche di un allenamento nascosto.
// Qui si tengono allineate: all'apertura e a ogni cambio di visibilità, che
// nei due posti sta proprio accanto a questo pannello.
// ---------------------------------------------------------------------------

const LIMITE_BYTE = 200 * 1024 * 1024 // come il bucket

function Miniatura({ riga, onTogli }) {
  const [url, setUrl] = useState(null)
  const [chiede, setChiede] = useState(false)
  const { id, percorso } = riga

  useEffect(() => {
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id, percorso })
      .then((f) => {
        if (!vivo) return f.revoca()
        revoca = f.revoca
        setUrl(f.url)
      })
      .catch(() => {})
    return () => {
      vivo = false
      revoca()
    }
  }, [id, percorso])

  return (
    <div className="foto-all-mini">
      {url ? (
        riga.tipo === 'video' ? (
          <video src={url} muted playsInline preload="metadata" />
        ) : (
          <img src={url} alt={riga.nome || 'Foto dell’allenamento'} />
        )
      ) : (
        <div className="media-loading" />
      )}
      {riga.tipo === 'video' && <span className="foto-all-tipo">Video</span>}
      {riga.soloLocale && <span className="media-locale">Solo qui</span>}
      {/* Togliere chiede conferma DENTRO la miniatura: niente `confirm()`,
          che dove non compare risponde "no" da solo. */}
      {chiede ? (
        <div className="foto-all-conferma">
          <button type="button" className="btn btn-sm btn-danger-pieno" onClick={onTogli}>
            Togli
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setChiede(false)}>
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="foto-all-x"
          aria-label="Togli questa foto"
          onClick={() => setChiede(true)}
        >
          <IconClose width={14} height={14} />
        </button>
      )}
    </div>
  )
}

/**
 * @param {{chiave:string, userId:string, pubblica:boolean}} props
 *   `chiave` = chiaveAllenamento(voce); `pubblica` = l'allenamento lo è.
 */
export default function FotoAllenamento({ chiave, userId, pubblica }) {
  const [righe, setRighe] = useState(null) // null = ancora da leggere
  const [avviso, setAvviso] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const input = useRef(null)

  useEffect(() => {
    let vivo = true
    if (!chiave) return undefined
    fotoDiAllenamenti([chiave]).then((per) => vivo && setRighe(per[chiave] || []))
    return () => {
      vivo = false
    }
  }, [chiave])

  // Allinea la visibilità delle foto a quella dell'allenamento (vedi in testa).
  // `inviate` ricorda cosa si è già mandato per ogni foto, così aggiungerne
  // una nuova non rimanda la stessa richiesta per tutte le altre.
  const voluta = pubblica ? VISIBILITA_FOTO_ALL.PUBBLICA : VISIBILITA_FOTO_ALL.PRIVATA
  const inviate = useRef({})
  useEffect(() => {
    if (!righe) return
    for (const r of righe) {
      const attuale = inviate.current[r.id] ?? r.visibilita
      if (attuale === voluta) continue
      inviate.current[r.id] = voluta
      aggiornaVisibilitaFotoAllenamento(r.id, voluta)
    }
  }, [voluta, righe])

  const onFile = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length === 0 || !chiave || !userId) return
    setInCorso(true)
    const problemi = []
    let posizione = (righe || []).length
    for (const file of files) {
      if (file.size > LIMITE_BYTE) {
        problemi.push(`"${file.name}" è troppo grande (oltre 200MB).`)
        continue
      }
      const tipo = file.type.startsWith('video') ? 'video' : 'foto'
      if (tipo === 'video') {
        const secondi = await durataVideo(file)
        if (secondi == null) {
          problemi.push(`"${file.name}": non riesco a leggerne la durata.`)
          continue
        }
        if (videoTroppoLungo(secondi)) {
          problemi.push(`"${file.name}" dura ${Math.round(secondi)}": il massimo è ${DURATA_VIDEO_MAX}".`)
          continue
        }
      }
      const esito = await aggiungiFotoAllenamento({
        blob: file,
        userId,
        chiave,
        tipo,
        nome: file.name,
        posizione: posizione++,
        visibilita: voluta,
      })
      setRighe((rs) => [...(rs || []), esito.riga])
      if (esito.errore) problemi.push(`"${file.name}": ${esito.errore}`)
      else if (esito.soloLocale) problemi.push('Una foto è solo su questo telefono: riprovo con la rete.')
    }
    setAvviso(problemi.join(' '))
    setInCorso(false)
  }

  const togli = async (riga) => {
    setRighe((rs) => rs.filter((r) => r.id !== riga.id))
    const esito = await eliminaFotoAllenamento(riga)
    if (!esito.ok) setAvviso('Non sono riuscito a toglierla dal server: riprova più tardi.')
  }

  const n = (righe || []).length
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="kicker">Foto e video</span>
        {n > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{n}</span>}
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.4 }}>
        {pubblica
          ? 'Nel feed si sfogliano insieme al recap.'
          : 'L’allenamento non è pubblico: le vedi solo tu. Se lo pubblichi, le vedranno con lui.'}
      </p>

      {n > 0 && (
        <div className="foto-all-griglia">
          {righe.map((r) => (
            <Miniatura key={r.id} riga={r} onTogli={() => togli(r)} />
          ))}
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={onFile}
      />
      <button
        type="button"
        className="btn btn-block"
        style={{ marginTop: 10 }}
        disabled={inCorso || righe === null}
        onClick={() => input.current?.click()}
      >
        <IconImage width={17} height={17} />
        {inCorso ? 'Carico…' : n === 0 ? 'Aggiungi foto o video' : 'Aggiungine altre'}
      </button>
      <div className="vis-hint" style={{ marginTop: 6 }}>
        Video: al massimo {DURATA_VIDEO_MAX} secondi.
      </div>
      {avviso && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          {avviso}
        </p>
      )}
    </div>
  )
}
