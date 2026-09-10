import { useEffect, useState } from 'react'
import { collettivoVuoto, leggiCollettivo } from '../lib/collettivo'
import { useAccount } from '../store/AccountContext'

// ---------------------------------------------------------------------------
// Il collettivo (lib/collettivo) messo a disposizione di una pagina.
//
// ⚠️ Torna sempre un collettivo VALIDO, anche mentre sta caricando e anche se
// la lettura fallisce: e' vuoto, e le pagine sanno gia' cosa fare con una lista
// vuota. `caricando` serve a non scrivere "ancora nessun allenamento" a chi sta
// solo aspettando la risposta — che e' la bugia piu' facile da dire qui.
// ---------------------------------------------------------------------------

// ⚠️ UNO SOLO per tutta l'app, e non uno nuovo a ogni render: le pagine ci
// costruiscono sopra dei useMemo, e un oggetto nuovo ogni volta li farebbe
// ricalcolare all'infinito. Si legge e basta, quindi condividerlo è sicuro.
const VUOTO = { dati: collettivoVuoto(), caricando: false, errore: '' }

export default function useCollettivo() {
  const { utenteCorrente, mioPt } = useAccount()
  const utenteId = utenteCorrente?.id || null
  const mioPtId = mioPt?.id || null
  const [stato, setStato] = useState(() =>
    utenteId ? { dati: collettivoVuoto(), caricando: true, errore: '' } : VUOTO,
  )

  useEffect(() => {
    if (!utenteId) return undefined
    let vivo = true
    leggiCollettivo(utenteId, mioPtId).then((esito) => {
      if (!vivo) return
      setStato({ dati: esito.dati, caricando: false, errore: esito.ok ? '' : esito.errore })
    })
    return () => {
      vivo = false
    }
  }, [utenteId, mioPtId])

  // Uscendo (o prima di entrare) non si mostra quello che si era letto: chi
  // apre l'app dopo di te non deve trovare la lista di prima.
  return utenteId ? stato : VUOTO
}
