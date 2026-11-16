import Avatar from './Avatar'
import { IconChevron } from './icons'

// A quale dei miei atleti: per mandargli una scheda (pages/SchedeLavoroPage)
// o una dieta (pages/DietaVistaPage). `nota` dice cosa succede dopo la scelta.
export default function ScegliAtleta({ atleti, titolo, nota, onChiudi, onScelto }) {
  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <h3>{titolo}</h3>
        <div className="stack" style={{ gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {atleti.map((a) => (
            <button key={a.id} type="button" className="menu-voce" onClick={() => onScelto(a)}>
              <Avatar id={a.id} nome={a.nome} taglia="" />
              <span className="menu-voce-nome" style={{ flex: 1, marginLeft: 10 }}>{a.nome}</span>
              <IconChevron className="faint" />
            </button>
          ))}
        </div>
        {nota && (
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, margin: '10px 2px 0' }}>
            {nota}
          </p>
        )}
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
