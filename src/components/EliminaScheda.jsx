import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { chiaveAllenamento, eliminaFotoDiAllenamento } from '../lib/fotoAllenamento'
import { IconTrash } from './icons'

// ---------------------------------------------------------------------------
// "Elimina scheda", dalla pagina della scheda e dall'editor.
//
// ⚠️ Gli allenamenti fatti stanno DENTRO la scheda (i suoi completamenti):
// cancellarla li cancella, dal calendario, dallo storico e dai progressi, e
// con loro le foto. Per questo il numero si dice per esteso, il tasto rosso
// resta spento finché non si spunta di aver capito, e accanto c'è la strada
// che non perde niente: archiviarla.
// ---------------------------------------------------------------------------

export default function EliminaScheda({ scheda, onChiudi, onEliminata, onArchiviata }) {
  const { eliminaScheda, aggiornaScheda } = useStore()
  const fatti = (scheda.completamenti || []).length
  const [capito, setCapito] = useState(false)
  // Uno solo cambia tutta la frase, non solo il nome: "verrà cancellato
  // l'allenamento", non "verranno cancellati i 1 allenamento".
  const uno = fatti === 1

  const elimina = () => {
    eliminaScheda(scheda.id)
    for (const c of scheda.completamenti || []) {
      if (c.data) eliminaFotoDiAllenamento(chiaveAllenamento({ ...c, schedaId: scheda.id }))
    }
    onEliminata?.()
  }
  const archivia = () => {
    aggiornaScheda({ ...scheda, archiviata: true })
    onArchiviata?.()
  }

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="alertdialog" aria-label={`Eliminare ${scheda.nome}?`} onClick={(e) => e.stopPropagation()}>
        <h3>Eliminare «{scheda.nome}»?</h3>
        {fatti > 0 ? (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 14px' }}>
              {uno ? (
                <>
                  Verrà cancellato anche <strong>l'allenamento</strong> fatto con questa scheda, con
                  le sue foto: sparisce dal calendario, dallo storico e dai progressi.
                </>
              ) : (
                <>
                  Verranno cancellati anche i <strong>{fatti} allenamenti</strong> fatti con questa
                  scheda, con le loro foto: spariscono dal calendario, dallo storico e dai progressi.
                </>
              )}{' '}
              <strong>Non si può annullare.</strong>
            </p>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 14px' }}>
              Se l'hai solo finita, archiviala: non la vedi più fra le schede, ma i suoi allenamenti
              restano.
            </p>
            <label className="consenso">
              <input type="checkbox" checked={capito} onChange={(e) => setCapito(e.target.checked)} />
              <span>
                Ho capito: cancella la scheda e {uno ? 'il suo allenamento' : `i suoi ${fatti} allenamenti`}
              </span>
            </label>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 14px' }}>
            Non hai ancora fatto allenamenti con questa scheda. Non si può annullare.
          </p>
        )}
        <div className="row" style={{ gap: 8 }}>
          {fatti > 0 && !scheda.archiviata ? (
            <button type="button" className="btn grow" onClick={archivia}>
              Archivia invece
            </button>
          ) : (
            <button type="button" className="btn grow" onClick={onChiudi}>
              Annulla
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger-pieno grow"
            disabled={fatti > 0 && !capito}
            onClick={elimina}
          >
            <IconTrash width={16} height={16} /> Elimina definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}
