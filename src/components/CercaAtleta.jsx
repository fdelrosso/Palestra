import Avatar from './Avatar'
import { IconClose, IconSearch } from './icons'

// ---------------------------------------------------------------------------
// Cerca fra i propri atleti: ovunque le cose del PT stanno divise per atleta
// (Atleti, Check e video, schede inviate, la scelta dell'atleta). Con tanti
// atleti scorrere l'elenco non basta. Si cerca per nome o username, senza
// badare ad accenti e maiuscole.
// ---------------------------------------------------------------------------

export default function CercaAtleta({ valore, onCambia, style }) {
  return (
    <div className="search-box" style={{ marginBottom: 12, ...style }}>
      <IconSearch width={17} height={17} className="faint" />
      <input
        className="search-input"
        type="search"
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        placeholder="Cerca un atleta"
        aria-label="Cerca un atleta"
        autoCapitalize="none"
        autoComplete="off"
      />
      {valore && (
        <button type="button" className="icon-btn" aria-label="Pulisci" onClick={() => onCambia('')}>
          <IconClose width={16} height={16} />
        </button>
      )}
    </div>
  )
}

/** Quando la ricerca non trova nessuno. */
export function NessunAtleta({ testo }) {
  return (
    <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
      Nessun atleta per «{testo.trim()}».
    </p>
  )
}

/**
 * In cima alla cartella di un atleta (schede inviate, diete mandate): chi è,
 * una volta sola, così le voci sotto non lo ripetono.
 */
export function TestaCartella({ id, nome }) {
  return (
    <div className="row" style={{ gap: 10, margin: '2px 2px 12px' }}>
      <Avatar id={id} nome={nome} taglia="" />
      <strong style={{ fontSize: 17, minWidth: 0 }}>{nome}</strong>
    </div>
  )
}
