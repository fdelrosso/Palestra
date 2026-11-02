import { DURATE, FASCE, FINI, MAX_ORARI, ampiezza, durataDi, durataInParole, fineDi, fineVicina, nuovaFascia, orarioImpegnato, piuMinuti } from '../lib/orariAppuntamento'
import { giornoIso } from '../lib/scadenza'
import { IconClose, IconPlus } from './icons'

// ---------------------------------------------------------------------------
// Le fasce di una richiesta di appuntamento (pages/AppuntamentiPage,
// components/AgendaPt): il giorno, dalle-alle e quanto dura. Una riga per fascia.
// I periodi dove sei già impegnato ci sono ma non si scelgono. Cambiando giorno,
// se la fascia lì è occupata si passa alla prima libera.
// ---------------------------------------------------------------------------

const seOccupata = (giorno, ora, fine, impegni) => !!orarioImpegnato({ giorno, ora, fine }, impegni)

export default function EditorOrari({ orari, impegni = [], onChange }) {
  const cambia = (i, patch) =>
    onChange(
      orari.map((o, j) => {
        if (j !== i) return o
        let nuovo = { ...o, ...patch }
        if (patch.giorno && orarioImpegnato(nuovo, impegni)) nuovo = nuovaFascia(nuovo.giorno, impegni, o.ora)
        if (nuovo.fine <= nuovo.ora) nuovo.fine = fineVicina(nuovo.ora)
        const minuti = ampiezza(nuovo)
        if (nuovo.durata > minuti) nuovo.durata = DURATE.filter((d) => d <= minuti).at(-1)
        return nuovo
      }),
    )
  const aggiungi = () => onChange([...orari, nuovaFascia(orari.at(-1)?.giorno || giornoIso(), [...impegni, ...orari], orari.at(-1)?.ora)])

  return (
    <div className="stack" style={{ gap: 10 }}>
      {orari.map((o, i) => {
        const impegno = orarioImpegnato(o, impegni)
        const inizi = FASCE.includes(o.ora) ? FASCE : [...FASCE, o.ora].sort()
        const fini = FINI.filter((f) => f > o.ora)
        const durate = DURATE.filter((d) => d <= ampiezza(o))
        return (
          <div key={i} className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 6 }}>
              <input
                type="date"
                className="input grow"
                aria-label={`Giorno ${i + 1}`}
                min={giornoIso()}
                value={o.giorno}
                onChange={(e) => cambia(i, { giorno: e.target.value })}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Togli questa fascia"
                disabled={orari.length === 1}
                onClick={() => onChange(orari.filter((_, j) => j !== i))}
              >
                <IconClose width={16} height={16} />
              </button>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="muted" style={{ fontSize: 12 }}>Dalle</span>
                <select className="input" value={o.ora} onChange={(e) => cambia(i, { ora: e.target.value })}>
                  {inizi.map((ora) => {
                    const occupata = seOccupata(o.giorno, ora, piuMinuti(ora, 30), impegni)
                    return (
                      <option key={ora} value={ora} disabled={occupata}>
                        {ora}
                        {occupata ? ' · impegnato' : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="muted" style={{ fontSize: 12 }}>Alle</span>
                <select className="input" value={fineDi(o)} onChange={(e) => cambia(i, { fine: e.target.value })}>
                  {fini.map((fine) => {
                    const occupata = seOccupata(o.giorno, o.ora, fine, impegni)
                    return (
                      <option key={fine} value={fine} disabled={occupata}>
                        {fine}
                        {occupata ? ' · impegnato' : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="muted" style={{ fontSize: 12 }}>Durata</span>
                <select className="input" value={durataDi(o)} onChange={(e) => cambia(i, { durata: Number(e.target.value) })}>
                  {durate.map((d) => (
                    <option key={d} value={d}>
                      {durataInParole(d)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {impegno && (
              <p className="form-error" style={{ margin: '2px 2px 0', fontSize: 12.5 }}>
                Hai già un impegno: {impegno.titolo} alle {impegno.ora}.
              </p>
            )}
          </div>
        )
      })}
      {orari.length < MAX_ORARI && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={aggiungi}>
          <IconPlus width={14} height={14} /> Aggiungi una fascia
        </button>
      )}
    </div>
  )
}
