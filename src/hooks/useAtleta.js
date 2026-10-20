import { useMemo } from 'react'
import useCollettivo from '../hooks/useCollettivo'
import { allenamentiDiUtente } from '../lib/storico'
import { schedeDiUtente } from '../lib/schedeGenerali'
import { andamentoAtleta } from '../lib/lavoro'

/** Schede e allenamenti di un atleta che il PT può vedere, con l'andamento. */
/**
 * L'andamento di più atleti, chi ha un avviso prima e poi chi si è allenato da
 * più tempo (AtletiPage).
 */
export function useAndamenti(atleti) {
  const { dati } = useCollettivo()
  return useMemo(() => {
    const righe = atleti.map((atleta) => ({
      atleta,
      andamento: andamentoAtleta({
        schede: schedeDiUtente(atleta, { collettivo: dati, comePt: true }),
        allenamenti: allenamentiDiUtente(atleta, { collettivo: dati, comePt: true }),
      }),
    }))
    const avviso = (a) => (a.avvisi.length ? 1 : 0)
    const fermo = (a) => (a.giorniDallUltimo == null ? Infinity : a.giorniDallUltimo)
    return righe.sort((x, y) => avviso(y.andamento) - avviso(x.andamento) || fermo(y.andamento) - fermo(x.andamento))
  }, [atleti, dati])
}

export default function useAtleta(atleta) {
  const { dati } = useCollettivo()
  const schede = useMemo(
    () => schedeDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const allenamenti = useMemo(
    () => allenamentiDiUtente(atleta, { collettivo: dati, comePt: true }),
    [atleta, dati],
  )
  const andamento = useMemo(() => andamentoAtleta({ schede, allenamenti }), [schede, allenamenti])
  return { schede, allenamenti, andamento }
}

