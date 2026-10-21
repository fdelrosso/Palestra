import { useEffect, useRef, useState } from 'react'
import {
  VISIBILITA_FOTO_ALL,
  aggiornaVisibilitaFotoAllenamento,
  aggiungiFotoAllenamento,
  eliminaFotoAllenamento,
  fonteFotoAllenamento,
  fotoDiAllenamenti,
} from '../lib/fotoAllenamento'
import { DURATA_VIDEO_MAX, durataVideo, fileTroppoPesante, messaggioTroppoPesante, PESO_FILE_MAX_MB, videoTroppoLungo } from '../lib/media'
import { IconClose, IconImage } from './icons'
import TastoFoto from './TastoFoto'
import useStatoModerazione from '../hooks/useStatoModerazione'

// ---------------------------------------------------------------------------
// Le foto e i video di UN allenamento, da chi l'ha fatto: aggiungerli e
// toglierli. Si sfogliano nel Feed insieme al recap.
//
// Sta in UN posto solo, apposta: il riepilogo (components/Riepilogo), a fine
// allenamento (è il momento in cui le foto si hanno in mano) e riaprendone
// uno vecchio dal calendario o dallo Storico (per aggiungerle dopo). Dal Feed non si aggiunge niente: il Feed si guarda, e una
// pagina "aggiungi una foto" in mezzo ai recap degli altri era rumore.
//
// ⚠️ LA VISIBILITÀ DELLE FOTO SEGUE QUELLA DELL'ALLENAMENTO (`pubblica`). La
// foto se la porta scritta addosso (vedi `allenamento_foto` in schema.sql), e
// se le due non combaciano il Feed mostra un allenamento pubblico con le foto
// che non si aprono — o, peggio, foto pubbliche di un allenamento nascosto.
// Qui si tengono allineate: all'apertura e a ogni cambio di visibilità, che
// nei due posti sta proprio accanto a questo pannello.
//
// ⚠️ La foto di SFONDO del recap (`sfondo`, lib/fotoAllenamento) è una riga
// di questo allenamento ma NON un allegato: qui non si vede e non si conta (si
// cambia dal recap), però la sua visibilità si allinea con le altre.
// ---------------------------------------------------------------------------


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
 * @param {{chiave:string, userId:string, pubblica:boolean, sfondo?:string|null}} props
 *   `chiave` = chiaveAllenamento(voce); `pubblica` = l'allenamento lo è;
 *   `sfondo` = l'id della foto di sfondo del recap.
 *   `onNumero(n)`: quante sono (senza lo sfondo), per la pillola del riepilogo;
 *   `nudo`: senza la card e il titolo, per quando sta già in un foglio.
 *   `onAllegati(righe)`: gli allegati (senza lo sfondo), per mostrarli sotto la
 *   card del riepilogo (components/AllegatiRecap).
 */
export default function FotoAllenamento({ chiave, userId, pubblica, sfondo = null, onNumero, onAllegati, nudo = false }) {
  const [righe, setRighe] = useState(null) // null = ancora da leggere
  const [avviso, setAvviso] = useState('')
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    let vivo = true
    if (!chiave) return undefined
    fotoDiAllenamenti([chiave]).then((per) => vivo && setRighe(per[chiave] || []))
    return () => {
      vivo = false
    }
    // `sfondo`: una foto di sfondo nuova è una riga nuova, da rileggere per
    // allinearne la visibilità.
  }, [chiave, sfondo])

  // Allinea la visibilità delle foto a quella dell'allenamento (vedi in testa).
  // `inviate` ricorda cosa si è già mandato per ogni foto, così aggiungerne
  // una nuova non rimanda la stessa richiesta per tutte le altre.
  // Con la pubblicazione bloccata (moderazione) le foto restano private: il
  // database rifiuterebbe comunque quelle pubbliche.
  const { pubblicazioneBloccata } = useStatoModerazione(userId)
  const voluta =
    pubblica && !pubblicazioneBloccata ? VISIBILITA_FOTO_ALL.PUBBLICA : VISIBILITA_FOTO_ALL.PRIVATA
  const inviate = useRef({})
  useEffect(() => {
    if (!righe) return
    for (const r of righe) {
      const attuale = inviate.current[r.id] ?? r.visibilita
      if (attuale === voluta) continue
      inviate.current[r.id] = voluta
      // Se non va (senza rete) si dimentica l'invio: si riprova al prossimo
      // giro, se no la foto resterebbe privata e nel feed non la vedrebbe nessuno.
      aggiornaVisibilitaFotoAllenamento(r.id, voluta).then((esito) => {
        if (!esito.ok) delete inviate.current[r.id]
      })
    }
  }, [voluta, righe])

  const allegati = (righe || []).filter((r) => r.id !== sfondo)

  const onFile = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length === 0 || !chiave || !userId) return
    setInCorso(true)
    const problemi = []
    let posizione = allegati.length
    for (const file of files) {
      if (fileTroppoPesante(file)) {
        problemi.push(messaggioTroppoPesante(file))
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

  const n = allegati.length
  useEffect(() => {
    if (righe) onNumero?.(n)
  }, [righe, n, onNumero])
  useEffect(() => {
    if (righe) onAllegati?.(righe.filter((r) => r.id !== sfondo))
  }, [righe, sfondo, onAllegati])
  return (
    <div className={nudo ? '' : 'card'} style={nudo ? undefined : { marginTop: 12 }}>
      {!nudo && (
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="kicker">Foto e video</span>
          {n > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{n}</span>}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12.5, margin: nudo ? 0 : '4px 0 0', lineHeight: 1.4 }}>
        {pubblica && pubblicazioneBloccata
          ? 'La pubblicazione nel Feed è bloccata: le vedi solo tu.'
          : pubblica
          ? 'Nel feed si sfogliano insieme al recap.'
          : 'L’allenamento non è pubblico: le vedi solo tu. Se lo pubblichi, le vedranno con lui.'}
      </p>

      {n > 0 && (
        <div className="foto-all-griglia">
          {allegati.map((r) => (
            <Miniatura key={r.id} riga={r} onTogli={() => togli(r)} />
          ))}
        </div>
      )}

      <TastoFoto
        className={nudo ? 'btn grow' : 'btn btn-block'}
        style={{ marginTop: 10 }}
        accept="image/*,video/*"
        multiple
        disabled={inCorso || righe === null}
        onChange={onFile}
        inLinea={nudo}
      >
        <IconImage width={17} height={17} />
        {inCorso ? 'Carico…' : n === 0 ? 'Aggiungi foto o video' : 'Aggiungine altre'}
      </TastoFoto>
      {/* In linea i tasti dicono solo "Scatta" e "Galleria": il caricamento
          si legge qui sotto. */}
      {nudo && inCorso && (
        <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0', textAlign: 'center' }}>
          Carico…
        </p>
      )}
      <div className="vis-hint" style={{ marginTop: 6 }}>
        Video: al massimo {DURATA_VIDEO_MAX} secondi e {PESO_FILE_MAX_MB}MB (meglio in 720p).
      </div>
      {avviso && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          {avviso}
        </p>
      )}
    </div>
  )
}
