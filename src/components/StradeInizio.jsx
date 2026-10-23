import { navigate, routes } from '../lib/router'
import { IconAmici, IconChevron, IconClipboard, IconEdit, IconLibrary } from './icons'

// ---------------------------------------------------------------------------
// Le strade per cominciare, quando non c'è una scheda in corso: nella Home
// (InizioPage, al posto del vecchio "Consigliato per oggi · Crea") e in
// Programmi vuoto (HomePage, al posto di "Ancora niente qui, tocca il +").
// La prima è piena: è la via maestra. `riprendi`: ci sono schede proprie ma
// nessuna in corso, e allora la via maestra è riprenderne una (2026-10-23).
// ---------------------------------------------------------------------------

const RIPRENDI = {
  id: 'riprendi',
  nome: 'Riprendi una tua scheda',
  desc: 'Scegli quale seguire fra quelle che hai già',
  Icona: IconLibrary,
  vai: () => navigate(routes.home()),
}
const STRADE = [
  {
    id: 'nuova',
    nome: 'Crea la tua scheda',
    desc: 'Scrivila esercizio per esercizio, o incollala dal PT',
    Icona: IconClipboard,
    vai: () => navigate(routes.nuova()),
  },
  {
    id: 'community',
    nome: 'Prendine una dalla community',
    desc: 'Schede pronte, condivise da chi usa l’app',
    Icona: IconAmici,
    vai: () => navigate(routes.schedeGenerali()),
  },
  {
    id: 'libero',
    nome: 'Allenati a mano libera',
    desc: 'Senza programma: segni gli esercizi mentre li fai',
    Icona: IconEdit,
    vai: () => navigate(routes.nuovoAllenamento()),
  },
]

export default function StradeInizio({ kicker, titolo, riprendi = false }) {
  const strade = riprendi ? [RIPRENDI, ...STRADE] : STRADE
  return (
    <section className="inizio-oggi tipo-benvenuto" aria-labelledby="strade-inizio-titolo">
      <p className="inizio-benvenuto-kicker">{kicker}</p>
      <h2 className="inizio-oggi-titolo" id="strade-inizio-titolo">
        {titolo}
      </h2>
      <p className="inizio-oggi-stato">
        Con una scheda l’app sa cosa ti tocca ogni giorno, con che pesi, e se sei in pari con la settimana.
      </p>
      <div className="inizio-vie">
        {strade.map(({ id, nome, desc, Icona, vai }, i) => (
          <button key={id} className={'inizio-via' + (i === 0 ? ' principale' : '')} onClick={vai}>
            <span className="inizio-via-icona" aria-hidden="true">
              <Icona width={22} height={22} />
            </span>
            <span className="inizio-via-testo">
              <span className="inizio-via-nome">{nome}</span>
              <span className="inizio-via-desc">{desc}</span>
            </span>
            <IconChevron width={18} height={18} />
          </button>
        ))}
      </div>
    </section>
  )
}
