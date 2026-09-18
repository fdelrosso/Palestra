import { useEffect, useState } from 'react'
import { fileSchedaExcel } from '../lib/schedaExcel'
import { IconTabella } from './icons'

// "Esporta in Excel": la scheda come file .xlsx (vedi lib/schedaExcel).
//
// Come esce dall'app, come il recap (RecapCondivisibile):
//   · sul TELEFONO il foglio di condivisione — Salva su File, WhatsApp, Mail.
//     ⚠️ Su iPhone, nell'app installata, uno scaricamento "classico" apre il
//     file a tutto schermo senza un tasto per tornare indietro: il foglio di
//     condivisione è l'unica strada che non chiude l'app in un vicolo cieco;
//   · sul COMPUTER lo scaricamento, che è quello che ci si aspetta lì (anche
//     Windows ha un foglio di condivisione, ma per un file da aprire in Excel
//     è la strada sbagliata).
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
    const telefono = window.matchMedia?.('(pointer: coarse)').matches
    if (telefono && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: scheda.nome || 'Scheda' })
      } catch (err) {
        // Chiudere il foglio di condivisione non è un errore.
        if (err?.name !== 'AbortError') setEsito('Condivisione non riuscita.')
      }
      return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setEsito(`Scaricato: ${file.name}`)
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
