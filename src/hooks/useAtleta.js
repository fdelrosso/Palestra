import { useEffect, useMemo, useState } from 'react'
import { leggiAndamentiAtleti, leggiAtleta } from '../lib/atletiServer'
import { andamentoAtleta } from '../lib/lavoro'

const VUOTO = { schede: new Map(), ritmo: new Map() }

/**
 * L'andamento di più atleti, chi ha un avviso prima e poi chi si è allenato da
 * più tempo (AtletiPage). Lo legge dal server: schede e ritmo, non gli allenamenti.
 */
export function useAndamenti(atleti) {
  const [letti, setLetti] = useState(VUOTO)
  const chiave = atleti.map((a) => a.id).join(',')
  useEffect(() => {
    let vivo = true
    leggiAndamentiAtleti().then((r) => vivo && setLetti(r))
    return () => {
      vivo = false
    }
  }, [chiave])
  return useMemo(() => {
    const righe = atleti.map((atleta) => ({
      atleta,
      andamento: andamentoAtleta({
        schede: letti.schede.get(atleta.id) || [],
        ritmo: letti.ritmo.get(atleta.id) || { ultimo: null, ultimi7: 0 },
      }),
    }))
    const avviso = (a) => (a.avvisi.length ? 1 : 0)
    const fermo = (a) => (a.giorniDallUltimo == null ? Infinity : a.giorniDallUltimo)
    return righe.sort((x, y) => avviso(y.andamento) - avviso(x.andamento) || fermo(y.andamento) - fermo(x.andamento))
  }, [atleti, letti])
}

/** Schede e allenamenti di un atleta che il PT può vedere, con l'andamento. */
export default function useAtleta(atleta) {
  const [letti, setLetti] = useState({ schede: [], allenamenti: [] })
  useEffect(() => {
    let vivo = true
    leggiAtleta(atleta).then((r) => vivo && r && setLetti(r))
    return () => {
      vivo = false
    }
  }, [atleta.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const { schede, allenamenti } = letti
  const andamento = useMemo(() => andamentoAtleta({ schede, allenamenti }), [schede, allenamenti])
  return { schede, allenamenti, andamento }
}
