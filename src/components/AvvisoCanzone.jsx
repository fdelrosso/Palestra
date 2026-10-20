import { useStore } from '../store/StoreContext'

// ---------------------------------------------------------------------------
// La novità della CANZONE DELL'ALLENAMENTO (2026-10-20), una volta sola: a fine
// allenamento, sotto la card del recap, la pillola "Musica" (components/
// Riepilogo) sceglie una canzone, che va sul recap come polaroid.
// "Ho capito" si ricorda nelle preferenze del profilo (`avvisi.canzone`),
// così non torna su un altro telefono.
//
// Lo monta AvvisoMuscoli quando non ha niente da dire: le finestre
// all'apertura vengono una dopo l'altra, mai insieme.
// ---------------------------------------------------------------------------

export default function AvvisoCanzone() {
  const { preferenze, aggiornaPreferenze } = useStore()
  if (preferenze?.avvisi?.canzone) return null

  const visto = () => aggiornaPreferenze({ avvisi: { ...preferenze?.avvisi, canzone: 'visto' } })

  return (
    <div className="modal-backdrop al-centro">
      <div className="modal avviso-sottogruppi" role="dialog" aria-label="Novità: la canzone dell’allenamento">
        <h3>Novità: la canzone dell’allenamento</h3>
        <p className="muted avviso-testo">
          A fine allenamento, sotto il recap, tocca <strong>Musica</strong> e scegli la canzone che ti ha tirato su.
          Finisce sul recap come una polaroid, con la copertina, e della cornice scegli il colore.
        </p>
        <p className="muted avviso-testo">
          Chi guarda il tuo post la tocca e la apre su Spotify, Apple Music o YouTube Music. Puoi metterla anche a un
          allenamento già fatto, riaprendolo dal calendario.
        </p>
        <button className="btn btn-accent btn-block" onClick={visto}>
          Ho capito
        </button>
      </div>
    </div>
  )
}
