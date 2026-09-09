import { VISIBILITA, opzioniVisibilita, visibilitaDi } from '../lib/visibilita'
import { useAccount } from '../store/AccountContext'

// ---------------------------------------------------------------------------
// "Chi lo vede": il selettore di visibilità di un allenamento o di una scheda.
//
// Le opzioni dipendono da chi sta scegliendo: chi non ha un personal trainer ne
// vede due (Pubblico / Nascondi a tutti), perché "mostra solo al PT" non
// vorrebbe dire nulla. Sotto compare sempre la riga che spiega cosa comporta la
// scelta fatta, così non si deve indovinare — e la spiegazione dice il nome del
// PT, che è l'unica cosa che uno vuole davvero sapere prima di condividere.
//
// `genere` serve solo alla lingua: un allenamento "lo" si vede, una scheda "la"
// si vede. Senza, vengono fuori frasi come "questo scheda resta solo tuo".
// ---------------------------------------------------------------------------

// Etichette dei bottoni: sono le stesse ovunque.
const LABEL = {
  [VISIBILITA.PUBBLICA]: 'Pubblico',
  [VISIBILITA.SOLO_PT]: 'Mostra solo al PT',
  [VISIBILITA.NASCOSTA]: 'Nascondi a tutti',
}

// La spiegazione cambia con la scelta, col genere della cosa e col fatto di
// avere o no un PT: sono i tre soli casi che la rendono giusta o sbagliata.
function spiegazione(scelta, { femminile, pt }) {
  const lo = femminile ? 'la' : 'lo'
  const tuo = femminile ? 'tua' : 'tuo'
  if (scelta === VISIBILITA.PUBBLICA) {
    return `${femminile ? 'La' : 'Lo'} vedono i tuoi amici e le sezioni generali dell'app.`
  }
  if (scelta === VISIBILITA.SOLO_PT) {
    return `${femminile ? 'La' : 'Lo'} vede soltanto ${pt ? pt.nome : 'il tuo personal trainer'}, nella sua sezione Lavoro.`
  }
  return pt
    ? `Non ${lo} vede nessuno, nemmeno ${pt.nome}.`
    : `Resta solo ${tuo}: non ${lo} vede nessun altro.`
}

export default function VisibilitaPicker({
  valore,
  onChange,
  etichetta = 'Chi lo vede',
  genere = 'm',
}) {
  const { mioPt } = useAccount()
  const opzioni = opzioniVisibilita(!!mioPt)
  const attuale = visibilitaDi({ visibilita: valore })
  const femminile = genere === 'f'

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{etichetta}</label>
      <div className="segmented vis-seg-3">
        {opzioni.map((v) => (
          <button
            key={v}
            type="button"
            className={'seg-btn' + (attuale === v ? ' on' : '')}
            onClick={() => onChange(v)}
            aria-pressed={attuale === v}
          >
            {LABEL[v]}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.4 }}>
        {spiegazione(attuale, { femminile, pt: mioPt })}
      </p>
    </div>
  )
}
