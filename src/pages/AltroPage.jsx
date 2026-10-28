import { useEffect, useState } from 'react'
import { navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import { personeSanzionate, segnalazioniAperte, sonoModeratore } from '../lib/segnalazioni'
import { isSoloPt } from '../lib/pt'
import TestataSezione from '../components/TestataSezione'
import { IconApple, IconBandiera, IconChevron, IconGrid, IconLibrary, IconPlay } from '../components/icons'

// ---------------------------------------------------------------------------
// "Altro": la quinta linguetta. Raccoglie quello che non ha una sezione sua,
// così nessuna funzione resta senza una porta dopo che il menu laterale è
// sparito. Oggi sono le LIBRERIE: gli esercizi, gli alimenti e le raccolte di schede (che si
// raggiungono anche dal "+" di Allenamento, quando si vuole cominciare).
// In fondo la GUIDA: il giro dell'app col video e le mini-guide (pages/GuidaPage).
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
    id: 'alimenti',
    nome: 'Alimenti',
    descrizione: 'Il catalogo della dieta coi valori, e i tuoi alimenti da aggiungere',
    Icona: IconApple,
    vai: () => navigate(routes.alimenti()),
  },
  {
    id: 'schede-generali',
    nome: 'Schede della community',
    descrizione: 'Le schede dei tuoi amici e di tutti: cerca per esercizio e filtra',
    Icona: IconLibrary,
    vai: () => navigate(routes.schedeGenerali()),
  },
  {
    id: 'guida',
    nome: 'Guida all’app',
    descrizione: 'Il giro dell’app col video, e come si usa ogni funzione',
    Icona: IconPlay,
    vai: () => navigate(routes.guida()),
  },
]

// Quelle che restano a chi è SOLO PT (gli alimenti gli servono per le diete
// che manda agli atleti).
const VOCI_SOLO_PT = ['esercizi', 'alimenti', 'guida']

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
  // Un solo PT (lib/pt) non ha la dieta né schede sue: gli restano gli
  // esercizi, gli alimenti e la guida. Le Segnalazioni restano a chi modera: è un compito
  // dell'account, non del modo in cui usa l'app.
  const base = isSoloPt(utenteCorrente) ? VOCI.filter((v) => VOCI_SOLO_PT.includes(v.id)) : VOCI
  const voci = daModerare == null ? base : [...base, { ...VOCE_MODERAZIONE, daFare: daModerare }]

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
