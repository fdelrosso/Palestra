import { useEffect, useState } from 'react'
import { palestraDaId } from '../lib/palestre'

// ---------------------------------------------------------------------------
// La palestra di un allenamento (`palestraId`), per il recap: la card del
// riepilogo e i post del feed (components/RecapPost). Si legge dalla tabella,
// che a ognuno dà solo quelle che può vedere: una da approvare compare a chi
// l'ha scelta e a nessun altro.
// Una richiesta per palestra, non per post: venti post della stessa palestra
// la chiedono una volta (la promessa resta qui finché l'app è aperta).
// ponytail: niente scadenza; una palestra approvata dopo che la si è chiesta
// compare alla riapertura dell'app.
// ---------------------------------------------------------------------------

const cache = new Map()

export default function usePalestra(id) {
  const [risposta, setRisposta] = useState({ id: null, palestra: null })
  useEffect(() => {
    if (!id) return undefined
    let vivo = true
    if (!cache.has(id)) cache.set(id, palestraDaId(id))
    cache.get(id).then((p) => vivo && setRisposta({ id, palestra: p }))
    return () => {
      vivo = false
    }
  }, [id])
  return id && risposta.id === id ? risposta.palestra : null
}
