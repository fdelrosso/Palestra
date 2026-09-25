import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../store/AccountContext'
import { SECONDI_FOTO } from '../lib/effimeri'
import { faiUscire, fileDaBlob } from '../lib/esporta'
import { IconClose, IconDownload } from './icons'

// ---------------------------------------------------------------------------
// Il visore di una foto/video momentaneo: si apre una volta sola.
//
// La regola è semplice e va rispettata alla lettera, altrimenti la promessa
// fatta a chi l'ha mandata non vale niente: **quando questa schermata si chiude
// il blob è già cancellato**. Le foto si chiudono da sole dopo qualche secondo,
// i video quando finiscono; in tutti e due i casi si può chiudere prima a mano.
//
// La cancellazione avviene all'apertura — non alla chiusura — di proposito: se
// l'app viene chiusa di colpo (il telefono che si spegne, la scheda che muore),
// il file è già andato e nessuno può riaprirlo. L'oggetto URL già creato resta
// valido finché la schermata è viva, quindi si vede lo stesso.
//
// Mentre è aperto lo si può SALVARE sul dispositivo: "sparisce" vuol dire che
// l'app non lo tiene, non che chi guarda non possa tenerlo (lo screenshot c'è
// sempre stato) — e chi manda lo legge scritto prima di mandare. Toccare
// "Salva" ferma il conto alla rovescia: il foglio di condivisione del telefono
// sta sopra la foto, e chiuderla da sotto a metà salvataggio sarebbe un dispetto.
// ---------------------------------------------------------------------------

export default function VisoreEffimero({ riga, onChiuso }) {
  const { apriEffimero, consumaEffimero } = useAccount()
  const [url, setUrl] = useState(null)
  const [errore, setErrore] = useState('')
  const [restano, setRestano] = useState(SECONDI_FOTO)
  const [fermo, setFermo] = useState(false) // conto alla rovescia fermo: si sta salvando
  const [esito, setEsito] = useState('')
  const urlRef = useRef(null)
  const blobRef = useRef(null)

  // Carica il blob e lo cancella subito: da qui in poi vive solo in memoria.
  useEffect(() => {
    let vivo = true
    apriEffimero(riga)
      .then(async (blob) => {
        if (!blob) {
          if (vivo) setErrore('Questo contenuto non c’è più.')
          await consumaEffimero(riga)
          return
        }
        const u = URL.createObjectURL(blob)
        urlRef.current = u
        blobRef.current = blob
        if (vivo) setUrl(u)
        await consumaEffimero(riga)
      })
      .catch(() => vivo && setErrore('Non riesco ad aprirlo.'))
    return () => {
      vivo = false
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
    // Una volta sola, su questa riga: riaprirlo non avrebbe nulla da mostrare.
  }, [riga.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le foto hanno un conto alla rovescia; i video finiscono da soli.
  useEffect(() => {
    if (!url || riga.tipo !== 'foto' || fermo) return
    const id = setInterval(() => setRestano((n) => (n > 0 ? n - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [url, riga.tipo, fermo])

  // La chiusura sta in un effetto suo, e non dentro l'aggiornamento del
  // contatore: chiudere vuol dire toccare lo stato del GENITORE, e farlo mentre
  // React sta calcolando il nostro render è proprio quello che React vieta.
  useEffect(() => {
    if (url && riga.tipo === 'foto' && restano === 0) onChiuso()
  }, [restano, url, riga.tipo, onChiuso])

  const salva = async () => {
    if (!blobRef.current) return
    setFermo(true)
    const giorno = (riga.inviatoIl || new Date().toISOString()).slice(0, 10)
    const file = fileDaBlob(blobRef.current, `${riga.tipo} ${riga.daNome || ''} ${giorno}`)
    const r = await faiUscire(file, {
      titolo: `${riga.tipo === 'video' ? 'Video' : 'Foto'} di ${riga.daNome}`,
    })
    setEsito(r.esito || (r.ok ? 'Fatto.' : ''))
  }

  return createPortal(
    <div className="visore-backdrop" onClick={onChiuso}>
      <div
        className="visore"
        role="dialog"
        aria-label={`${riga.tipo === 'video' ? 'Video' : 'Foto'} di ${riga.daNome}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="visore-head">
          <div style={{ minWidth: 0 }}>
            <div className="visore-nome">{riga.daNome}</div>
            <div className="visore-sub">
              {esito ||
                (riga.tipo === 'foto' && url && !fermo
                  ? `Sparisce fra ${restano}s`
                  : 'Si cancella appena chiudi')}
            </div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {url && (
              <button
                className="icon-btn"
                aria-label="Salva sul dispositivo"
                title="Salva sul dispositivo"
                onClick={salva}
              >
                <IconDownload />
              </button>
            )}
            <button className="icon-btn" aria-label="Chiudi" onClick={onChiuso}>
              <IconClose />
            </button>
          </div>
        </div>

        <div className="visore-corpo">
          {errore ? (
            <p className="muted" style={{ textAlign: 'center', padding: 24 }}>
              {errore}
            </p>
          ) : !url ? (
            <div className="media-loading" style={{ height: 220 }} />
          ) : riga.tipo === 'video' ? (
            <video src={url} autoPlay controls playsInline onEnded={onChiuso} />
          ) : (
            <img src={url} alt={`Foto mandata da ${riga.daNome}`} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
