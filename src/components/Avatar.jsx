import { useEffect, useState } from 'react'
import { fotoDi } from '../lib/fotoProfili'

// ---------------------------------------------------------------------------
// Il pallino di una persona: la sua foto, o l'iniziale se non ne ha una.
// Basta l'id: la foto la chiede lib/fotoProfili, una richiesta sola per tutti
// gli avatar della schermata. `foto` si passa quando la si ha già (il proprio
// profilo, che cambia sotto gli occhi e non deve aspettare la cache).
// ---------------------------------------------------------------------------

export default function Avatar({ id, nome, foto, taglia = 'sm' }) {
  const [daServer, setDaServer] = useState({ per: null, foto: '' })
  useEffect(() => {
    if (foto !== undefined || !id) return undefined
    let vivo = true
    fotoDi(id).then((f) => vivo && setDaServer({ per: id, foto: f }))
    return () => {
      vivo = false
    }
  }, [id, foto])
  const src = foto ?? (daServer.per === id ? daServer.foto : '')
  // Il file non è arrivato (rete debole all'apertura): al posto dell'icona
  // rotta l'iniziale, e si riprova quando torna la rete o fra 10 secondi.
  const [rotta, setRotta] = useState({ src: null, tentativo: 0 })
  const fallita = !!src && rotta.src === src
  useEffect(() => {
    if (!fallita) return undefined
    const riprova = () => setRotta((r) => ({ src: null, tentativo: r.tentativo + 1 }))
    const t = setTimeout(riprova, 10000)
    window.addEventListener('online', riprova)
    return () => {
      clearTimeout(t)
      window.removeEventListener('online', riprova)
    }
  }, [fallita])
  const iniziale = String(nome || '').trim().charAt(0).toUpperCase() || '?'
  return (
    <span className={'user-avatar' + (taglia ? ' ' + taglia : '')} aria-hidden="true">
      {src && !fallita ? (
        <img key={rotta.tentativo} src={src} alt="" onError={() => setRotta((r) => ({ ...r, src }))} />
      ) : (
        iniziale
      )}
    </span>
  )
}
