import { useEffect, useState } from 'react'
import { fileRisultatiExcel, fileSchedaExcel } from '../lib/schedaExcel'
import { fileRisultatiPdf, fileSchedaPdf } from '../lib/schedaPdf'
import { statoScheda } from '../lib/progression'
import { faiUscire } from '../lib/esporta'
import { IconDocumento, IconTabella } from './icons'

// "Esporta la scheda" / "Esporta i progressi": la scheda fuori dall'app, in
// Excel o in PDF (lib/schedaExcel, lib/schedaPdf — gli stessi fogli).
//
// Il tasto apre la scelta del formato, sotto: un tocco in più, ma il nome del
// tasto resta corto e dice COSA si esporta; il COME si sceglie dopo.
//
// Come esce dall'app: foglio di condivisione sul telefono, scaricamento sul
// computer (lib/esporta, dove c'è il perché).
// `atleta` = il nome di chi la usa, quando a esportarla è il suo PT: finisce
// nel foglio e nel nome del file.
// `risultati` = non la scheda da fare ma come è andata: ogni settimana, ogni
// serie col suo peso e il colore del pallino ("progressi" finché è in corso,
// "recap" a scheda finita, nel nome del file). Senza allenamenti fatti non c'è
// niente da esportare, e il tasto non compare.
// `etichetta` = il nome del tasto, se non va bene quello di sempre.
export default function EsportaScheda({ scheda, atleta = '', risultati = false, etichetta = '', className = 'btn btn-block' }) {
  const [scelta, setScelta] = useState(false)
  const [esito, setEsito] = useState('')

  useEffect(() => {
    if (!esito) return undefined
    const id = setTimeout(() => setEsito(''), 3000)
    return () => clearTimeout(id)
  }, [esito])

  if (risultati && !(scheda.completamenti || []).length) return null
  const nome = etichetta || (risultati ? 'Esporta i progressi' : 'Esporta la scheda')

  const esporta = async (formato) => {
    setScelta(false)
    let file
    try {
      const fai = risultati
        ? formato === 'pdf' ? fileRisultatiPdf : fileRisultatiExcel
        : formato === 'pdf' ? fileSchedaPdf : fileSchedaExcel
      file = fai(scheda, { atleta })
    } catch (e) {
      console.warn('Esportazione non riuscita', e)
      setEsito('Non sono riuscito a preparare il file.')
      return
    }
    const titolo = scheda.nome || 'Scheda'
    const cosa = risultati ? (statoScheda(scheda).schedaCompletata ? ' — recap' : ' — progressi') : ''
    const r = await faiUscire(file, { titolo: titolo + cosa })
    setEsito(r.esito)
  }

  return (
    <div>
      <button type="button" className={className} onClick={() => setScelta((s) => !s)} aria-expanded={scelta}>
        <IconDocumento width={18} height={18} /> {nome}
      </button>
      {scelta && (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-sm btn-block" onClick={() => esporta('pdf')}>
            <IconDocumento width={16} height={16} /> PDF
          </button>
          <button type="button" className="btn btn-sm btn-block" onClick={() => esporta('excel')}>
            <IconTabella width={16} height={16} /> Excel
          </button>
        </div>
      )}
      {esito && (
        <p className="muted" role="status" style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>
          {esito}
        </p>
      )}
    </div>
  )
}
