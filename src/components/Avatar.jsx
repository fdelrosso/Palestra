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
  const iniziale = String(nome || '').trim().charAt(0).toUpperCase() || '?'
  return (
    <span className={'user-avatar' + (taglia ? ' ' + taglia : '')} aria-hidden="true">
      {src ? <img src={src} alt="" /> : iniziale}
    </span>
  )
}
