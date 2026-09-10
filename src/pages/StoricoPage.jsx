import { useMemo, useState } from 'react'
import { storicoGlobale } from '../lib/storico'
import { goBack } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import ListaAllenamenti from '../components/ListaAllenamenti'
import { IconBack } from '../components/icons'

// Storico Allenamenti, in due schede: i PROPRI e quelli DEGLI ALTRI.
// Sono due cose diverse e si guardano per due motivi diversi — la propria
// cronologia si controlla, quella degli altri si sfoglia per prendere spunto —
// e mescolate finivano per nascondersi a vicenda: chi si allena tre volte a
// settimana e ha venti amici non ritrovava più i suoi.
//
// ⚠️ "Degli altri" NON vuol dire "degli amici": qui arriva chiunque abbia reso
// PUBBLICO un allenamento (lib/collettivo → allenamenti_visibili), amici
// compresi. Chiamarla "Amici" sarebbe una bugia a schermo. Il filtro non lo fa
// il browser: quello che non si deve vedere non esce dal server.
//
// I propri ci sono sempre, anche quelli tenuti privati o "solo al PT": è pur
// sempre la propria cronologia, e il badge dice cosa si è deciso di nascondere.
export default function StoricoPage() {
  const { utenteCorrente } = useAccount()
  // Le schede degli altri arrivano dal database (lib/collettivo): finché non
  // ci sono, la lista è vuota — ma non si scrive "non c'è niente".
  const { dati, caricando, errore } = useCollettivo()
  const [vista, setVista] = useState('miei')

  const ioId = utenteCorrente?.id || null

  const voci = useMemo(() => storicoGlobale({ collettivo: dati, ioId }), [dati, ioId])
  // "Miei" si decide sull'ID, mai sul nome: due omonimi si ritroverebbero gli
  // allenamenti dell'altro fra i propri.
  const miei = useMemo(() => voci.filter((v) => ioId && v.utenteId === ioId), [voci, ioId])
  const altrui = useMemo(() => voci.filter((v) => !ioId || v.utenteId !== ioId), [voci, ioId])

  const mieiAperti = vista === 'miei'
  const lista = mieiAperti ? miei : altrui

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Storico Allenamenti</h1>
      </div>

      <div className="row" style={{ gap: 8, margin: '4px 0 10px' }}>
        <button
          className={'btn grow' + (mieiAperti ? ' btn-accent' : '')}
          onClick={() => setVista('miei')}
          aria-pressed={mieiAperti}
        >
          I miei{miei.length > 0 ? ` (${miei.length})` : ''}
        </button>
        <button
          className={'btn grow' + (!mieiAperti ? ' btn-accent' : '')}
          onClick={() => setVista('altri')}
          aria-pressed={!mieiAperti}
        >
          Degli altri{altrui.length > 0 ? ` (${altrui.length})` : ''}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '2px 2px 12px', lineHeight: 1.4 }}>
        {mieiAperti
          ? 'Tutti i tuoi allenamenti, anche quelli che hai tenuto per te.'
          : 'Gli allenamenti resi pubblici da chi usa l’app, amici compresi — per prendere spunto.'}
      </p>

      {errore && <p className="form-error">{errore}</p>}

      <ListaAllenamenti
        voci={lista}
        mostraUtente={!mieiAperti}
        mostraVisibilita={mieiAperti}
        vuoto={
          caricando ? (
            'Sto leggendo…'
          ) : mieiAperti ? (
            <>
              Non hai ancora completato un allenamento.
              <br />
              Il primo comparirà qui.
            </>
          ) : (
            <>
              Ancora nessun allenamento pubblico da parte di altri.
              <br />
              Compariranno qui appena qualcuno ne rende uno visibile.
            </>
          )
        }
      />
    </div>
  )
}
