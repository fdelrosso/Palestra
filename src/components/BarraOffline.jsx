import { useStore } from '../store/StoreContext'

// ---------------------------------------------------------------------------
// La striscia "senza rete", in cima a ogni schermata quando il server non
// risponde.
//
// A cosa serve. Senza rete l'app funziona lo stesso: le schede sono sul
// telefono, l'allenamento si fa, le modifiche si accodano e partono da sole
// quando la rete torna (lib/sync). Il problema non e' che si perda qualcosa —
// non si perde — e' che senza dirlo uno non lo SA: chiude l'app convinto che
// sia tutto al sicuro sul server, e se il telefono si rompe quella sera li'
// scopre che non lo era.
//
// ⚠️ Non e' un errore e non si scrive in rosso: non c'e' niente da riparare e
// niente da toccare. E' un avviso, e dice l'unica cosa che serve sapere.
//
// ⚠️ `statoCloud` esisteva gia' in StoreContext ('caricamento' /
// 'sincronizzato' / 'locale') e non lo leggeva nessuno. Non se n'e' fatto uno
// nuovo: due semafori per lo stesso fatto prima o poi si contraddicono.
// 'caricamento' NON si mostra — all'avvio la barra comparirebbe per un istante
// a ogni apertura, e una barra che lampeggia senza motivo si smette di leggere.
// ---------------------------------------------------------------------------
export default function BarraOffline() {
  const { statoCloud } = useStore()
  if (statoCloud !== 'locale') return null
  return (
    <div className="barra-offline" role="status">
      Senza rete: quello che fai resta sul telefono e parte da solo quando torna
      la connessione.
    </div>
  )
}
