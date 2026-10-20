import { useStore } from '../store/StoreContext'
import { chiaveAllenamento } from '../lib/fotoAllenamento'
import { navigate, routes } from '../lib/router'

// Un allenamento finito e mai salvato (`daSalvare`, lib/session): si è usciti
// dal riepilogo senza "Salva". Finché c'è, una pillola sopra la barra in basso
// lo ricorda e lo riapre (pages/AllenamentoSvoltoPage), dove si finisce come a
// fine allenamento. L'ultimo, se sono più d'uno.
export default function AvvisoDaSalvare({ nascosto }) {
  const { schede } = useStore()
  if (nascosto) return null
  let ultimo = null
  for (const s of schede) {
    for (const c of s.completamenti || []) {
      if (c.daSalvare && c.data && (!ultimo || c.data > ultimo.data)) ultimo = { schedaId: c.schedaId || s.id, data: c.data }
    }
  }
  if (!ultimo) return null
  return (
    <button type="button" className="btn btn-accent avviso-da-salvare" onClick={() => navigate(routes.svolto(chiaveAllenamento(ultimo)))}>
      Hai un allenamento da salvare · <b>Apri</b>
    </button>
  )
}
