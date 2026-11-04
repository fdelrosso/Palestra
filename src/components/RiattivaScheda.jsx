import { useStore } from '../store/StoreContext'
import { daCapo, riprendi } from '../data/model'
import { navigate, routes } from '../lib/router'

// ---------------------------------------------------------------------------
// "Riattiva", dalla pagina di una scheda terminata o archiviata (144ª).
//
// Con allenamenti già fatti si sceglie: portarla a termine (si riprende da
// dove si era) o ripartire da capo. Da capo è una scheda NUOVA (model, daCapo):
// quella di prima resta terminata com'è, coi suoi allenamenti, per calendario,
// storico ed export. Senza allenamenti non c'è niente da scegliere: il tasto
// la riattiva e basta, e questa finestra non si apre.
// ---------------------------------------------------------------------------

export default function RiattivaScheda({ scheda, onChiudi }) {
  const { aggiornaScheda, aggiungiScheda, rendiAttiva } = useStore()
  const fatti = (scheda.completamenti || []).length

  const portaATermine = () => {
    aggiornaScheda(riprendi(scheda))
    rendiAttiva(scheda.id)
    onChiudi()
  }
  const ripartiDaCapo = () => {
    // aggiungiScheda la rende attiva: è quella che si vuole seguire.
    const nuova = aggiungiScheda(daCapo(scheda))
    onChiudi()
    navigate(routes.scheda(nuova.id))
  }

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={`Riattivare ${scheda.nome}?`} onClick={(e) => e.stopPropagation()}>
        <h3>Riattivare «{scheda.nome}»?</h3>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '-4px 0 14px' }}>
          Ci hai già fatto {fatti === 1 ? 'un allenamento' : `${fatti} allenamenti`}, fino alla settimana{' '}
          {scheda.settimanaCorrente}. Puoi riprendere da lì oppure ricominciare dalla settimana 1: in quel
          caso ne nasce una nuova, e questa resta com'è, coi suoi allenamenti.
        </p>
        <div className="stack" style={{ gap: 8 }}>
          <button type="button" className="btn btn-accent btn-block" onClick={portaATermine}>
            Portala a termine
          </button>
          <button type="button" className="btn btn-block" onClick={ripartiDaCapo}>
            Riparti da capo
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
