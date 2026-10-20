import { FERMO_DOPO_GIORNI, quandoUltimo } from '../lib/lavoro'

const CLASSE_AVVISO = { fermo: 'badge-danger', mai: 'badge-warn', scade: 'badge-warn', 'senza-scheda': 'badge-warn' }

/** I badge di a che punto è: avvisi, ultimo allenamento, ultimi 7 giorni. */
export default function BadgeAndamento({ andamento, style }) {
  const { ultimo, giorniDallUltimo, ultimi7, obiettivo, avvisi } = andamento
  return (
    <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap', ...style }}>
      {avvisi.map((a) => (
        <span key={a.tipo} className={'badge ' + CLASSE_AVVISO[a.tipo]}>{a.testo}</span>
      ))}
      {ultimo && giorniDallUltimo < FERMO_DOPO_GIORNI && (
        <span className="badge">Ultimo: {quandoUltimo(giorniDallUltimo)}</span>
      )}
      <span className={'badge' + (obiettivo && ultimi7 >= obiettivo ? ' badge-good' : ' badge-accent')}>
        {ultimi7}
        {obiettivo ? ` di ${obiettivo}` : ''} negli ultimi 7 giorni
      </span>
    </div>
  )
}

