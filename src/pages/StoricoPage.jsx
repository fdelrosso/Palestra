import { useEffect, useMemo, useState } from 'react'
import { storicoGlobale } from '../lib/storico'
import { useStore } from '../store/StoreContext'
import { goBack } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import ListaAllenamenti from '../components/ListaAllenamenti'
import AzioniAllenamento from '../components/AzioniAllenamento'
import TastoConferma from '../components/TastoConferma'
import {
  chiaveAllenamento,
  eliminaFotoDiAllenamento,
  fotoDiAllenamenti,
  spostaFotoAllenamento,
} from '../lib/fotoAllenamento'
import { spostaInterazioni } from '../lib/interazioni'
import { raccogliCompletamenti } from '../lib/oggi'
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
  const { schede, aggiornaCompletamento, eliminaCompletamento } = useStore()
  const [vista, setVista] = useState('miei')
  // ⚠️ Gli allenamenti appena cancellati da QUESTA schermata.
  // Questa pagina non legge le proprie schede: legge il collettivo, cioe' quello
  // che risponde il server, e quella risposta e' tenuta da parte per non
  // riscaricarla a ogni pagina. Cancellando, la riga sparisce dai dati veri ma
  // resta a schermo fino alla prossima apertura — e chi guarda pensa che il
  // tasto non abbia funzionato. Rileggere subito dal server non risolve: la
  // cancellazione ci sta ancora arrivando, e si rischia di riscaricare la riga
  // appena tolta. Quindi la si toglie qui, e alla prossima lettura non ci sara'
  // piu' davvero.
  const [cancellati, setCancellati] = useState(() => new Set())
  // ⚠️ Stesso motivo per le correzioni: il server le ha, la sua risposta tenuta
  // da parte no. Dei propri allenamenti fa fede la copia LOCALE (le schede,
  // la stessa che corregge il calendario), trovata per scheda e data; e se la
  // correzione ha cambiato la data, qui si ricorda dove è andato a finire.
  const [spostati, setSpostati] = useState(() => new Map()) // "schedaId|data vecchia" → data nuova

  const ioId = utenteCorrente?.id || null

  const voci = useMemo(() => storicoGlobale({ collettivo: dati, ioId }), [dati, ioId])
  const locali = useMemo(() => {
    const m = new Map()
    for (const arr of raccogliCompletamenti(schede).values()) for (const c of arr) m.set(`${c.schedaId}|${c.data}`, c)
    return m
  }, [schede])
  // "Miei" si decide sull'ID, mai sul nome: due omonimi si ritroverebbero gli
  // allenamenti dell'altro fra i propri.
  const miei = useMemo(
    () =>
      voci
        .filter((v) => ioId && v.utenteId === ioId)
        .map((v) => {
          const data = spostati.get(`${v.schedaId}|${v.data}`) || v.data
          const c = locali.get(`${v.schedaId}|${data}`)
          return c ? { ...v, ...c, dettagliato: Array.isArray(c.esercizi) && c.esercizi.length > 0 } : v
        })
        .filter((v) => !cancellati.has(v.data))
        .sort((a, b) => new Date(b.data) - new Date(a.data)),
    [voci, ioId, cancellati, spostati, locali],
  )

  // Le foto dei propri, per lo sfondo dei recap: in una richiesta sola, come
  // nel feed (FeedPage).
  const [foto, setFoto] = useState({})
  const chiaviFirma = miei.map((v) => chiaveAllenamento(v)).join('~')
  useEffect(() => {
    let vivo = true
    const chiavi = chiaviFirma ? chiaviFirma.split('~') : []
    fotoDiAllenamenti(chiavi)
      .then((f) => vivo && setFoto(f))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [chiaviFirma])

  // Come nel calendario (CalendarPage): se cambia la DATA cambia la chiave
  // dell'allenamento, e foto, mi piace e commenti vanno spostati con lui.
  const salvaModifica = (c, patch, cambiaData, chiudi) => {
    aggiornaCompletamento(c.schedaId, c.data, patch)
    if (!cambiaData) return
    spostaFotoAllenamento(ioId, chiaveAllenamento(c), chiaveAllenamento({ schedaId: c.schedaId, data: patch.data }))
    spostaInterazioni(chiaveAllenamento(c), chiaveAllenamento({ schedaId: c.schedaId, data: patch.data }))
    setSpostati((prima) => {
      const m = new Map(prima)
      // La chiave resta quella che arriva dal server, anche alla seconda correzione.
      const origine = [...m].find(([, d]) => d === c.data)?.[0] || `${c.schedaId}|${c.data}`
      m.set(origine, patch.data)
      return m
    })
    // Il recap aperto non saprebbe più quale voce seguire: si chiude.
    chiudi()
  }
  const dataOccupata = (schedaId) => (data) => locali.has(`${schedaId}|${data}`)
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
        // I propri col recap del feed di Social; quelli degli altri restano
        // righe, da scorrere in fretta per prendere spunto.
        comeRecap={mieiAperti}
        foto={foto}
        chiaveFoto={chiaveAllenamento}
        // Sui propri, quello che si fa dal giorno aperto nel calendario: recap
        // da condividere, mandarlo a un amico, chi lo vede, foto e video,
        // correggerlo e cancellarlo. ⚠️ Solo sui propri: sugli allenamenti
        // degli altri questi tasti non devono nemmeno esistere.
        azioni={
          mieiAperti
            ? (v, chiudi) => {
                const c = locali.get(`${v.schedaId}|${v.data}`)
                const elimina = () => {
                  eliminaCompletamento(v.data, v.schedaId)
                  eliminaFotoDiAllenamento(chiaveAllenamento(v))
                  setCancellati((prima) => new Set(prima).add(v.data))
                  chiudi()
                }
                // Quelli dei profili eliminati (l'archivio) non stanno fra le
                // proprie schede: niente da correggere, si possono solo togliere.
                if (!c) {
                  return (
                    <TastoConferma
                      style={{ marginTop: 14 }}
                      etichetta="Cancella questo allenamento"
                      domanda="Cancellare questo allenamento? Sparisce dal calendario e dallo storico, e non si torna indietro."
                      onConferma={elimina}
                    />
                  )
                }
                return (
                  <AzioniAllenamento
                    c={c}
                    occupata={dataOccupata(v.schedaId)}
                    onSalvaModifica={(patch, cambiaData) => salvaModifica(c, patch, cambiaData, chiudi)}
                    onElimina={elimina}
                  />
                )
              }
            : undefined
        }
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
