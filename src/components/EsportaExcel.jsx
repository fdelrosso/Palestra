import { useEffect, useState } from 'react'
import { fileSchedaExcel } from '../lib/schedaExcel'
import { faiUscire } from '../lib/esporta'
import { IconTabella } from './icons'

// "Esporta in Excel": la scheda come file .xlsx (vedi lib/schedaExcel).
//
// Come esce dall'app: foglio di condivisione sul telefono, scaricamento sul
// computer (lib/esporta, dove c'è il perché).
// `atleta` = il nome di chi la usa, quando a esportarla è il suo PT: finisce
// nel foglio e nel nome del file.
export default function EsportaExcel({ scheda, atleta = '', className = 'btn btn-block' }) {
  const [esito, setEsito] = useState('')

  useEffect(() => {
    if (!esito) return undefined
    const id = setTimeout(() => setEsito(''), 3000)
    return () => clearTimeout(id)
  }, [esito])

  const esporta = async () => {
    let file
    try {
      file = fileSchedaExcel(scheda, { atleta })
    } catch (e) {
      console.warn('Esportazione Excel non riuscita', e)
      setEsito('Non sono riuscito a preparare il file.')
      return
    }
    const r = await faiUscire(file, { titolo: scheda.nome || 'Scheda' })
    setEsito(r.esito)
  }

  return (
    <>
      <button type="button" className={className} onClick={esporta}>
        <IconTabella width={18} height={18} /> Esporta in Excel
      </button>
      {esito && (
        <p className="muted" role="status" style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>
          {esito}
        </p>
      )}
    </>
  )
}
