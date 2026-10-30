import { useEffect, useState } from 'react'
import { palestraAllenamento } from '../lib/palestre'

// ---------------------------------------------------------------------------
// La palestra di un allenamento (`palestraId`) di `personaId`, per il recap:
// la card del riepilogo e i post del feed (components/RecapPost). La dà il
// database (`palestra_allenamento`) con la regola del profilo: approvata, e
// solo a chi la persona la mostra (ChiVedePalestra: tutti, amici, nessuno).
// Senza la persona, niente.
// Una richiesta per persona e palestra, non per post: venti post della stessa
// la chiedono una volta (la promessa resta qui finché l'app è aperta).
// ponytail: niente scadenza; una palestra approvata, o una scelta "chi la
// vede" cambiata, compare a chi guarda alla riapertura dell'app.
// ---------------------------------------------------------------------------

const cache = new Map()

export default function usePalestra(id, personaId) {
  const chiave = id && personaId ? `${personaId}|${id}` : ''
  const [risposta, setRisposta] = useState({ chiave: '', palestra: null })
  useEffect(() => {
    if (!chiave) return undefined
    let vivo = true
    if (!cache.has(chiave)) cache.set(chiave, palestraAllenamento(personaId, id))
    cache.get(chiave).then((p) => vivo && setRisposta({ chiave, palestra: p }))
    return () => {
      vivo = false
    }
  }, [chiave, id, personaId])
  return chiave && risposta.chiave === chiave ? risposta.palestra : null
}
