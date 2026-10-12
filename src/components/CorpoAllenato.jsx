import { CUORE, coloreMuscolo } from '../lib/corpoForme'
import { gruppoDi } from '../lib/muscoli'
import { CUORE_IMG, GRUPPI_VISTA, gruppoNelPunto, urlFigura, urlMaschera } from '../lib/corpoImmagini'

// ---------------------------------------------------------------------------
// Il corpo del RECAP: due sagome (davanti e dietro) con tutta la muscolatura
// disegnata e i gruppi allenati oggi accesi, ognuno col colore del suo gruppo.
//
// A cosa serve: un elenco di nomi ("Petto · 12, Tricipiti · 6") dice quanto hai
// fatto ma non DOVE. La figura lo dice in un colpo d'occhio, e a distanza di
// giorni fa vedere subito se si sta lavorando sempre la stessa metà del corpo.
//
// Differenze da <CorpoMuscoli> (la sagoma della sezione Esercizi):
//   - lì si accende UN gruppo; qui se ne accendono N, ognuno col colore del
//     suo gruppo (lo stesso dei pallini e delle etichette in tutta l'app), e
//     la sua intensità dice quanto l'hai lavorato;
//   - gli altri muscoli non spariscono: restano quelli grigi della figura, così
//     il colore si legge come "questo sì, quello no" e non come un corpo a pezzi;
//   - due viste sempre, non solo quella dove il gruppo si vede: un allenamento
//     tocca quasi sempre tutte e due le facce.
//
// L'intensità del colore è la QUOTA di serie del gruppo sul gruppo più lavorato
// della giornata: è una proporzione interna all'allenamento, non un giudizio.
// Con `calore` (vista del recap) niente colori dei gruppi: una scala sola dal
// bianco (poco) al blu (tanto).
//
// Il disegno sono immagini (lib/corpoImmagini): la figura e una maschera per
// gruppo. Il cardio non è un muscolo e non ha maschera: quando c'è si accende
// il cuore in mezzo al petto.
//
// I muscoli accesi si possono TOCCARE (`onGruppo`): nel recap il tocco sceglie
// quel gruppo e fa vedere solo i suoi esercizi. Con dei gruppi scelti
// (`selezionati`) gli altri accesi si spengono un po', così si vede su cosa si
// sta guardando.
// ⚠️ Il tocco sulla figura è una comodità per il dito: la figura resta
// aria-hidden, e chi usa tastiera o lettore di schermo ha le stesse scelte
// nelle pastiglie sotto, che sono pulsanti veri. Un gruppo piccolo (gli
// avambracci) col dito si prende male: le pastiglie servono anche a quello.
// ---------------------------------------------------------------------------

const ETICHETTA = { fronte: 'Davanti', dietro: 'Dietro' }

/**
 * Una vista del corpo fatta di immagini (lib/corpoImmagini): la figura e sopra,
 * per ogni gruppo acceso, la sua maschera riempita del colore del gruppo.
 * Si usa anche da sola (components/CorpoMuscoli). `quote` = {id: 0..1}.
 */
export function FiguraCorpo({
  vista,
  quote,
  altezza,
  scelti = new Set(),
  onGruppo = null,
  tutto = false,
  calore = false,
  className = '',
}) {
  const accesi = GRUPPI_VISTA[vista].filter((id) => quote[id] != null)
  const cardio = vista === 'fronte' && quote.cardio != null
  const classe = (id) => (scelti.has(id) ? ' scelto' : scelti.size > 0 ? ' spento' : '')
  // Il tocco: le maschere sono immagini intere una sopra l'altra, il muscolo
  // sotto il dito lo dice il pixel (lib/corpoImmagini).
  const tocca = onGruppo
    ? (e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const fx = (e.clientX - r.left) / r.width
        const fy = (e.clientY - r.top) / r.height
        const nelCuore =
          cardio && Math.hypot(fx - CUORE_IMG.x, (fy - CUORE_IMG.y) * (r.height / r.width)) < CUORE_IMG.lato / 2
        const id = nelCuore ? 'cardio' : gruppoNelPunto(vista, fx, fy, accesi)
        if (!id) return
        // Il recap del feed si apre toccando la scheda: il muscolo toccato
        // apre il SUO, non quello intero.
        e.stopPropagation()
        onGruppo(id)
      }
    : undefined
  return (
    <div
      className={'corpo-svg corpo-foto' + (onGruppo ? ' toccabile' : '') + (className ? ' ' + className : '')}
      style={{ height: altezza }}
      onClick={tocca}
      aria-hidden="true"
    >
      <img src={urlFigura(vista)} alt="" draggable="false" />
      {/* `tutto`: la figura intera nel colore del gruppo (il cardio nella
          sezione Esercizi: lavora tutto il corpo). */}
      {tutto && (
        <span
          className="corpo-foto-muscolo corpo-foto-tutto"
          style={{ maskImage: `url(${urlFigura(vista)})`, WebkitMaskImage: `url(${urlFigura(vista)})` }}
        />
      )}
      {accesi.map((id) => {
        const url = `url(${urlMaschera(vista, id)})`
        return (
          <span
            key={id}
            className={'corpo-foto-muscolo corpo-gruppo' + classe(id)}
            style={{ background: coloreMuscolo(id, quote[id], calore), maskImage: url, WebkitMaskImage: url }}
          />
        )
      })}
      {/* Il cardio non è un muscolo: si accende il cuore in mezzo al petto. */}
      {cardio && (
        <svg
          className={'corpo-foto-cuore corpo-gruppo' + classe('cardio') + (tutto ? ' batte' : '')}
          viewBox="-10 -10 20 20"
          style={{ fill: coloreMuscolo('cardio', quote.cardio, calore) }}
        >
          <path d={CUORE} />
        </svg>
      )}
    </div>
  )
}

function Vista({ vista, quote, altezza, scelti, onGruppo, calore }) {
  return (
    <div className="corpo-vista">
      <FiguraCorpo
        vista={vista}
        quote={quote}
        altezza={altezza}
        scelti={scelti}
        onGruppo={onGruppo}
        calore={calore}
      />
      <span className="corpo-vista-label">{ETICHETTA[vista]}</span>
    </div>
  )
}

/**
 * @param {object} p
 * @param {{id:string, serie:number}[]} p.gruppi  i gruppi allenati (lib/recap)
 * @param {number} [p.altezza]  altezza di ogni sagoma, in px
 * @param {string[]} [p.selezionati]  i gruppi scelti: gli altri si spengono
 * @param {(id:string) => void} [p.onGruppo]  se c'è, i muscoli accesi si toccano
 * @param {('fronte'|'dietro')[]} [p.viste]  quali sagome: tutte e due, o una
 *   sola quando il corpo si ingrandisce (components/CorpoZoom)
 * @param {boolean} [p.calore]  la scala bianco → blu (vista del recap)
 */
export default function CorpoAllenato({
  gruppi = [],
  altezza = 172,
  className = '',
  selezionati = [],
  onGruppo = null,
  viste = ['fronte', 'dietro'],
  calore = false,
}) {
  if (gruppi.length === 0) return null
  // Quota di ogni gruppo sul più lavorato della giornata. Con serie tutte a
  // zero (allenamento segnato ma non svolto) il massimo è 0: allora si accende
  // tutto pieno, perché il gruppo è stato comunque toccato.
  const max = Math.max(...gruppi.map((g) => g.serie || 0))
  const quote = {}
  for (const g of gruppi) quote[g.id] = max > 0 ? (g.serie || 0) / max : 1
  const scelti = new Set(selezionati)

  return (
    <div className={'corpo-allenato' + (className ? ' ' + className : '')}>
      {viste.map((v) => (
        <Vista
          key={v}
          vista={v}
          quote={quote}
          altezza={altezza}
          scelti={scelti}
          onGruppo={onGruppo}
          calore={calore}
        />
      ))}
    </div>
  )
}

/**
 * Il modellino di UN esercizio, nelle card della scheda e dell'allenamento:
 * tutti i suoi gruppi (`gruppi`, i dip sono petto E tricipiti) accesi pieni,
 * ognuno del suo colore, e solo le viste dove se ne vede almeno uno (la
 * schiena da dietro, il petto davanti; tutte e due se servono).
 * Niente etichette "Davanti/Dietro": a questa misura la figura basta.
 */
export function CorpoEsercizio({ esercizio, altezza = 88, className = '' }) {
  const ids = esercizio.gruppi?.length ? esercizio.gruppi : [esercizio.gruppo]
  const gruppi = ids.map(gruppoDi).filter(Boolean)
  if (gruppi.length === 0) return null
  const viste = ['fronte', 'dietro'].filter((v) => gruppi.some((g) => g.vista === v))
  return (
    <CorpoAllenato
      gruppi={gruppi.map((g) => ({ id: g.id, serie: 1 }))}
      viste={viste}
      altezza={altezza}
      className={'ex-corpo' + (className ? ' ' + className : '')}
    />
  )
}
