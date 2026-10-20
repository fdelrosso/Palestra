import { useEffect, useMemo, useReducer, useState } from 'react'
import { cancellatiDiRecente, spostatiDiRecente, storicoGlobale } from '../lib/storico'
import { useStore } from '../store/StoreContext'
import { goBack, navigate, routes } from '../lib/router'
import { useAccount } from '../store/AccountContext'
import useCollettivo from '../hooks/useCollettivo'
import ListaAllenamenti from '../components/ListaAllenamenti'
import TastoConferma from '../components/TastoConferma'
import { chiaveAllenamento, eliminaFotoDiAllenamento, fotoDiAllenamenti } from '../lib/fotoAllenamento'
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
  const { schede, eliminaCompletamento } = useStore()
  const [vista, setVista] = useState('miei')
  // ⚠️ Gli allenamenti appena cancellati o spostati (data corretta): questa
  // pagina legge il collettivo tenuto da parte, dove ci sono ancora com'erano.
  // Le liste stanno in lib/storico, perché si cancella e si corregge anche
  // dalla pagina dell'allenamento. Dei propri fa fede la copia LOCALE (le
  // schede), trovata per scheda e data.
  // `ridisegna`: cancellando da qui (gli allenamenti dell'archivio) la lista
  // cambia senza che cambi nient'altro.
  const [giro, ridisegna] = useReducer((n) => n + 1, 0)
  const cancellati = cancellatiDiRecente
  const spostati = spostatiDiRecente

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le liste di lib/storico cambiano dentro: le segue `giro`
    [voci, ioId, locali, giro],
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
          : 'Gli allenamenti resi pubblici da chi usa l’app, amici compresi, per prendere spunto.'}
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
        // I propri si aprono nella loro pagina: lo stesso riepilogo di fine
        // allenamento (pages/AllenamentoSvoltoPage). Quelli dei profili
        // eliminati (l'archivio) non stanno fra le proprie schede: niente da
        // correggere, nel recap qui si possono solo togliere.
        onApri={(v) => {
          if (!mieiAperti) return false
          const data = spostati.get(`${v.schedaId}|${v.data}`) || v.data
          if (!locali.has(`${v.schedaId}|${data}`)) return false
          navigate(routes.svolto(chiaveAllenamento({ schedaId: v.schedaId, data })))
          return true
        }}
        azioni={
          mieiAperti
            ? (v, chiudi) => (
                <TastoConferma
                  style={{ marginTop: 14 }}
                  etichetta="Cancella questo allenamento"
                  domanda="Cancellare questo allenamento? Sparisce dal calendario e dallo storico, e non si torna indietro."
                  onConferma={() => {
                    eliminaCompletamento(v.data, v.schedaId)
                    eliminaFotoDiAllenamento(chiaveAllenamento(v))
                    cancellatiDiRecente.add(v.data)
                    ridisegna()
                    chiudi()
                  }}
                />
              )
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
