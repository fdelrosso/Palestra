import { goBack, navigate, routes } from '../lib/router'
import { IconBack, IconCalendar, IconChevron, IconTabella, IconUpload, IconUtente } from '../components/icons'

// "Nuova dieta": prima di tutto, da dove si parte.
//
//   1. Dal PDF del nutrizionista — i cinque pasti con TUTTE le sue alternative,
//      letti dal foglio (lib/pdfTesto + lib/parserDieta);
//   2. Da calorie e macro — i numeri li mette la persona (se scrive solo i
//      macro le calorie si contano da sole) e la dieta è solo quel limite: i
//      piatti li propone l'app pasto per pasto, se glieli si chiede, dentro la
//      dieta giornaliera;
//   3. Dai dati del profilo — per chi i numeri non li ha: li stima l'app.
//
// Lo schema settimanale non è una strada: si aggiunge DOPO, a una dieta che
// c'è già, perché dice quale pasto fare quale giorno e presuppone i pasti.
const STRADE = [
  {
    id: 'pdf',
    icona: IconUpload,
    nome: 'Dal PDF del nutrizionista',
    desc: 'Carica il piano: pasti e alternative li leggo io, tu controlli',
    vai: () => navigate(routes.dietaImporta()),
  },
  {
    id: 'macro',
    icona: IconTabella,
    nome: 'Da calorie e macro',
    desc: 'Scrivi il tuo limite (bastano i macro): se vuoi un consiglio per un pasto, lo chiedi lì',
    vai: () => navigate(routes.dietaMacro()),
  },
  {
    id: 'calcolo',
    icona: IconUtente,
    nome: 'Non ho i numeri: calcolali tu',
    desc: 'Dai tuoi dati (peso, altezza, età, movimento) stimo calorie e macro',
    vai: () => navigate(routes.dietaEditor(null)),
  },
]

export default function DietaNuovaPage() {
  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Nuova dieta</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>Da dove partiamo?</div>
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {STRADE.map((s) => (
          <button key={s.id} className="menu-voce" onClick={s.vai}>
            <span className="menu-voce-icona" aria-hidden="true">
              <s.icona width={20} height={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="menu-voce-nome">{s.nome}</span>
              <span className="menu-voce-desc">{s.desc}</span>
            </span>
            <IconChevron className="faint" />
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-titolo">
          <IconCalendar width={15} height={15} /> E lo schema settimanale?
        </div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
          Se il nutrizionista ti ha dato anche lo schema della settimana (lunedì legumi, martedì
          uova…), lo aggiungi dopo aver creato la dieta: dalla dieta, «Schema settimanale». Da lì
          «Dieta giornaliera» ti propone ogni giorno il pasto giusto.
        </p>
      </div>
    </div>
  )
}
