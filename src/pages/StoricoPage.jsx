import { useMemo } from 'react'
import { storicoGlobale } from '../lib/storico'
import { goBack } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import ListaAllenamenti from '../components/ListaAllenamenti'
import { IconBack } from '../components/icons'

// Storico Allenamenti: gli allenamenti svolti da chiunque usi l'app, per
// prendere spunto. Da quando esiste la visibilità (lib/visibilita) qui
// compaiono solo quelli **pubblici**; i propri ci sono comunque, anche quelli
// tenuti privati, perché è pur sempre la propria cronologia.
export default function StoricoPage() {
  const { utenteCorrente } = useAccount()
  const voci = useMemo(
    () => storicoGlobale({ ioId: utenteCorrente?.id }),
    [utenteCorrente?.id],
  )

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Storico Allenamenti</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        Gli allenamenti resi pubblici da chi usa l'app — per prendere spunto. I tuoi ci sono sempre,
        anche quelli che hai tenuto per te.
      </p>

      <ListaAllenamenti
        voci={voci}
        mostraVisibilita
        vuoto={
          <>
            Ancora nessun allenamento pubblico.
            <br />
            Completane uno e comparirà qui.
          </>
        }
      />
    </div>
  )
}
