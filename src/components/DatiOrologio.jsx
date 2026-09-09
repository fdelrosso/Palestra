import { IconBattito } from './icons'

// Calorie e battiti presi dall'orologio (Apple Watch, Garmin, fascia cardio…)
// e inseriti A MANO come ultimo passo dell'allenamento.
//
// Perché a mano: una PWA non può leggere HealthKit né collegarsi al Watch —
// non esiste una Web API per farlo su iPhone. Quindi il flusso è: guardi
// l'orologio, copi due numeri, e la card usa quelli invece della stima.
//
// I campi restano stringhe (come nell'editor della dieta): la validazione la
// fa `numeroPositivo` in lib/recap, così un campo vuoto o scritto male non
// rompe niente e si torna semplicemente alla stima.
export default function DatiOrologio({ valori, onCambia }) {
  const set = (campo) => (e) => onCambia({ [campo]: e.target.value.replace(/[^\d,.]/g, '') })

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
        <IconBattito width={18} height={18} />
        <div className="card-titolo" style={{ marginBottom: 0 }}>Dati dall’orologio</div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
        Facoltativi. Se hai registrato l’allenamento sull’orologio, copia qui i numeri:
        finiscono nella card al posto della stima.
      </p>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="orologio-kcal">Calorie bruciate (kcal)</label>
        <input
          id="orologio-kcal"
          className="input"
          inputMode="numeric"
          placeholder="es. 412"
          value={valori.calorieReali ?? ''}
          onChange={set('calorieReali')}
        />
      </div>

      <div className="grid-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="orologio-fc">Battito medio (bpm)</label>
          <input
            id="orologio-fc"
            className="input"
            inputMode="numeric"
            placeholder="es. 138"
            value={valori.fcMedia ?? ''}
            onChange={set('fcMedia')}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="orologio-fc-max">Battito massimo (bpm)</label>
          <input
            id="orologio-fc-max"
            className="input"
            inputMode="numeric"
            placeholder="es. 165"
            value={valori.fcMax ?? ''}
            onChange={set('fcMax')}
          />
        </div>
      </div>
    </div>
  )
}
