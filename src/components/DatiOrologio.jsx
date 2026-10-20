// Calorie e battiti presi dall'orologio (Apple Watch, Garmin, fascia cardio…)
// e inseriti A MANO come ultimo passo dell'allenamento.
//
// Perché a mano: una PWA non può leggere HealthKit né collegarsi al Watch —
// non esiste una Web API per farlo su iPhone. Quindi il flusso è: guardi
// l'orologio, copi due numeri, e la card usa quelli invece della stima.
//
// I campi restano stringhe (come nell'editor della dieta): la validazione la
// fa `numeroPositivo` in lib/recap, così un campo vuoto o scritto male non
// rompe niente. ⚠️ Dal 2026-09-18 non c'è più una stima di ripiego sulla
// card: campo vuoto = sulla card quella casella non c'è.
// Dal riepilogo nuovo i tre campi stanno in un foglio (components/Foglio), che
// ha già titolo e spiegazione: qui solo i numeri, in fila.
export default function DatiOrologio({ valori, onCambia }) {
  const set = (campo) => (e) => onCambia({ [campo]: e.target.value.replace(/[^\d,.]/g, '') })
  const campi = [
    ['calorieReali', 'orologio-kcal', 'kcal', '412'],
    ['fcMedia', 'orologio-fc', 'bpm medi', '138'],
    ['fcMax', 'orologio-fc-max', 'bpm max', '165'],
  ]

  return (
    <div className="orologio-tre">
      {campi.map(([campo, id, etichetta, esempio], i) => (
        <div key={campo} className="field" style={{ marginBottom: 0 }}>
          <input
            id={id}
            className="input"
            inputMode="numeric"
            autoFocus={i === 0}
            placeholder={esempio}
            value={valori[campo] ?? ''}
            onChange={set(campo)}
          />
          <label htmlFor={id}>{etichetta}</label>
        </div>
      ))}
    </div>
  )
}
