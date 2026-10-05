// Privacy e termini dentro l'app. I testi stanno fuori, in public/privacy.html
// e public/termini.html (si leggono anche senza account): qui ci sono solo le
// caselle per accettarli e i link per leggerli.
//
// I link aprono un'altra scheda: le pagine non sono dell'app, e dove stanno le
// caselle c'è un modulo mezzo compilato da non perdere.

const nuovaScheda = { target: '_blank', rel: 'noopener' }

export function LinkLegali() {
  return (
    <p className="link-legali">
      <a href="/termini" {...nuovaScheda}>
        Termini di servizio
      </a>
      {' · '}
      <a href="/privacy" {...nuovaScheda}>
        Informativa privacy
      </a>
    </p>
  )
}

// Due caselle e non una: il consenso sui dati sulla salute deve essere
// esplicito e separato dal resto (GDPR art. 9, vedi lib/consensi). Nessuna
// parte spuntata: un consenso già dato per te non è un consenso.
export function CaselleConsenso({ termini, salute, onTermini, onSalute }) {
  return (
    <div>
      <label className="consenso">
        <input type="checkbox" checked={termini} onChange={(e) => onTermini(e.target.checked)} />
        <span>
          Ho almeno 14 anni e accetto i{' '}
          <a href="/termini" {...nuovaScheda}>
            Termini di servizio
          </a>
          . Ho letto l’
          <a href="/privacy" {...nuovaScheda}>
            Informativa privacy
          </a>
          .
        </span>
      </label>
      <label className="consenso">
        <input type="checkbox" checked={salute} onChange={(e) => onSalute(e.target.checked)} />
        <span>
          Acconsento al trattamento dei miei dati sulla salute (peso, altezza, alimentazione,
          foto dei progressi): servono a calorie, dieta e allenamenti, e senza l’app non può
          funzionare.
        </span>
      </label>
    </div>
  )
}
