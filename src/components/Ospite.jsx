import { useContext, useEffect, useMemo, useState } from 'react'
import { AccountContext } from '../store/AccountContext'
import { StoreContext } from '../store/StoreContext'
import { EVENTO_ACCOUNT, esciOspite, soloLettura, valoreStoreOspite } from '../lib/ospite'
import { goBack } from '../lib/router'

// I pezzi della modalità ospite (lib/ospite): i due context finti sopra le
// pagine vere, la barra in cima, la pagina chiusa e il foglio "Crea un account".

/** L'account: quello vero (senza sessione) con l'utente d'esempio, e ogni funzione chiede l'account. */
export function AccountOspite({ utente, children }) {
  const reale = useContext(AccountContext)
  const valore = useMemo(() => ({ ...soloLettura(reale), utenteCorrente: utente, utenteVero: utente }), [reale, utente])
  return <AccountContext.Provider value={valore}>{children}</AccountContext.Provider>
}

export function StoreOspite({ esempio, children }) {
  const valore = useMemo(() => valoreStoreOspite(esempio), [esempio])
  return <StoreContext.Provider value={valore}>{children}</StoreContext.Provider>
}

const creaAccount = () => esciOspite('crea')

export function BarraOspite() {
  return (
    <div className="barra-ospite" role="note">
      <span>Stai guardando un esempio</span>
      <button type="button" className="btn btn-accent btn-sm" onClick={creaAccount}>
        Crea un account
      </button>
    </div>
  )
}

export function PaginaChiusa() {
  return (
    <div className="page pagina-chiusa">
      <div className="big">🔒</div>
      <h2>Questa parte è per chi ha un account</h2>
      <p className="muted">Crearlo è gratis e ci vuole un minuto.</p>
      <button type="button" className="btn btn-accent btn-lg btn-block" onClick={creaAccount}>
        Crea un account
      </button>
      <button type="button" className="btn btn-lg btn-block" onClick={goBack}>
        Torna indietro
      </button>
    </div>
  )
}

export function FoglioAccount() {
  const [aperto, setAperto] = useState(false)
  useEffect(() => {
    const apri = () => setAperto(true)
    window.addEventListener(EVENTO_ACCOUNT, apri)
    return () => window.removeEventListener(EVENTO_ACCOUNT, apri)
  }, [])
  if (!aperto) return null
  return (
    <div className="modal-backdrop" onClick={() => setAperto(false)}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Crea un account per farlo</h3>
        <p className="muted">Questo è solo un esempio: con un account le schede, gli allenamenti e la dieta sono i tuoi.</p>
        <button type="button" className="btn btn-accent btn-lg btn-block" onClick={creaAccount}>
          Crea un account
        </button>
        <button type="button" className="btn btn-lg btn-block" onClick={() => setAperto(false)}>
          Non ora
        </button>
      </div>
    </div>
  )
}
