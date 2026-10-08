import { useEffect, useState } from 'react'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { personeSanzionate, segnalazioniAperte, sonoModeratore } from '../lib/segnalazioni'
import TestataSezione from '../components/TestataSezione'
import { IconBandiera, IconChevron, IconClipboard, IconGrid, IconLibrary } from '../components/icons'

// ---------------------------------------------------------------------------
// "Altro": la quinta linguetta. Raccoglie quello che non ha una sezione sua,
// così nessuna funzione resta senza una porta dopo che il menu laterale è
// sparito. Oggi sono le LIBRERIE: gli esercizi e le raccolte di schede (che si
// raggiungono anche dal "+" di Allenamento, quando si vuole cominciare).
// Una funzione nuova senza casa si aggiunge in VOCI.
// ---------------------------------------------------------------------------

const VOCI = [
  {
    id: 'esercizi',
    nome: 'Esercizi',
    descrizione: 'Tutte le varianti di esercizio per gruppo muscolare, in 3D',
    Icona: IconGrid,
    vai: () => navigate(routes.esercizi()),
  },
  {
    id: 'schede-prefatte',
    nome: 'Schede prefatte',
    descrizione: 'Programmi già pronti per obiettivo, giorni e durata',
    Icona: IconClipboard,
    vai: () => navigate(routes.schedePrefatte()),
  },
  {
    id: 'schede-generali',
    nome: 'Schede generali',
    descrizione: 'Le schede di tutti gli utenti: cerca per esercizio e filtra',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
]

// Solo per i moderatori (tabella `moderatori`, lib/segnalazioni): gli altri
// non la vedono nemmeno. Stava nel menu laterale, che non c'è più.
const VOCE_MODERAZIONE = {
  id: 'segnalazioni',
  nome: 'Segnalazioni',
  descrizione: 'Commenti e foto segnalati, richieste di sblocco',
  Icona: IconBandiera,
  vai: () => navigate(routes.segnalazioni()),
}

export default function AltroPage() {
  const { utenteCorrente } = useAccount()
  const ioId = utenteCorrente?.id || null
  // Per un moderatore: quante cose aspettano, segnalazioni e richieste di
  // sblocco (null = non lo è).
  const [daModerare, setDaModerare] = useState(null)
  useEffect(() => {
    let vivo = true
    sonoModeratore(ioId).then(async (si) => {
      if (!si) return vivo && setDaModerare(null)
      const [esito, sanzionate] = await Promise.all([segnalazioniAperte(), personeSanzionate()])
      if (vivo) setDaModerare(esito.voci.length + sanzionate.persone.filter((p) => p.richiesta).length)
    })
    return () => {
      vivo = false
    }
  }, [ioId])
  const voci = daModerare == null ? VOCI : [...VOCI, { ...VOCE_MODERAZIONE, daFare: daModerare }]

  return (
    <div className="app">
      <TestataSezione titolo="Altro" />
      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        {voci.map((v) => (
          <button key={v.id} className="menu-voce" onClick={v.vai}>
            <span className="menu-voce-icona" aria-hidden="true">
              <v.Icona width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">{v.nome}</span>
              <span className="menu-voce-desc">{v.descrizione}</span>
            </span>
            {v.daFare > 0 && <span className="pallino-notifica">{v.daFare}</span>}
            <IconChevron className="faint" />
          </button>
        ))}
      </div>
    </div>
  )
}
