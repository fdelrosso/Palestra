import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { schedaAttivaOra } from '../lib/pianoScheda'
import { IconCheck } from './icons'

// Da che scheda viene un allenamento, nel calendario e nello storico: il nome,
// col ✓ se è la scheda attiva. Gli allenamenti si vedono tutti, di tutte le
// schede: questo dice quale è quale.
export default function NomeScheda({ schedaId, nome, className = '', style }) {
  const { schede } = useStore()
  const attivaId = useMemo(() => schedaAttivaOra(schede)?.id, [schede])
  if (!nome) return null
  const attiva = !!schedaId && schedaId === attivaId
  return (
    <span className={'chip-scheda' + (attiva ? ' attiva' : '') + (className ? ' ' + className : '')} style={style}>
      {attiva && <IconCheck width={12} height={12} aria-label="scheda attiva" />}
      {nome}
    </span>
  )
}
