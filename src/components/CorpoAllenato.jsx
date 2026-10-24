import { CUORE, LIVELLI_CALORE, coloreMuscolo } from '../lib/corpoForme'
import { gruppoDi } from '../lib/muscoli'
import { sottogruppiEsercizio } from '../lib/eserciziLibreria'
import { CUORE_IMG, ZONE_VISTA, gruppoNelPunto, quoteZone, urlFigura, urlMaschera, useCorpo } from '../lib/corpoImmagini'

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
// gruppo, e per i SOTTOGRUPPI (lib/muscoli) di gambe, spalle e schiena: un leg
// curl accende i femorali, non tutta la gamba. Le pastiglie e i numeri restano
// per gruppo; il tocco su un sottogruppo sceglie il suo gruppo. Il cardio non è un muscolo e non ha maschera: quando c'è si accende
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
 * per ogni zona accesa (gruppo o sottogruppo), la sua maschera riempita del
 * colore del gruppo. Si usa anche da sola (components/CorpoMuscoli).
 * `quote` = {zona: 0..1} (lib/corpoImmagini quoteZone); `scelti` e `onGruppo`
 * parlano di GRUPPI. `corpo` ('uomo'|'donna'): senza, il proprio (useCorpo).
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
  corpo: corpoDato,
}) {
  const corpo = useCorpo(corpoDato)
  const accesi = ZONE_VISTA[vista].filter((id) => quote[id] != null)
  const cardio = vista === 'fronte' && quote.cardio != null
  const classe = (zona) => {
    const id = gruppoDi(zona)?.id ?? zona
    return scelti.has(id) ? ' scelto' : scelti.size > 0 ? ' spento' : ''
  }
  // Il tocco: le maschere sono immagini intere una sopra l'altra, il muscolo
  // sotto il dito lo dice il pixel (lib/corpoImmagini).
  const tocca = onGruppo
    ? (e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const fx = (e.clientX - r.left) / r.width
        const fy = (e.clientY - r.top) / r.height
        const nelCuore =
          cardio && Math.hypot(fx - CUORE_IMG.x, (fy - CUORE_IMG.y) * (r.height / r.width)) < CUORE_IMG.lato / 2
        const zona = nelCuore ? 'cardio' : gruppoNelPunto(vista, fx, fy, accesi, corpo)
        if (!zona) return
        const id = gruppoDi(zona)?.id ?? zona
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
      <img src={urlFigura(vista, corpo)} alt="" draggable="false" />
      {/* `tutto`: la figura intera nel colore del gruppo (il cardio nella
          sezione Esercizi: lavora tutto il corpo). */}
      {tutto && (
        <span
          className="corpo-foto-muscolo corpo-foto-tutto"
          style={{ maskImage: `url(${urlFigura(vista, corpo)})`, WebkitMaskImage: `url(${urlFigura(vista, corpo)})` }}
        />
      )}
      {accesi.map((id) => {
        const url = `url(${urlMaschera(vista, id, corpo)})`
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

function Vista({ vista, quote, altezza, scelti, onGruppo, calore, corpo }) {
  return (
    <div className="corpo-vista">
      <FiguraCorpo
        vista={vista}
        quote={quote}
        altezza={altezza}
        scelti={scelti}
        onGruppo={onGruppo}
        calore={calore}
        corpo={corpo}
      />
      <span className="corpo-vista-label">{ETICHETTA[vista]}</span>
    </div>
  )
}

/**
 * @param {object} p
 * @param {{id:string, serie:number, sotto?:object, intere?:number}[]} p.gruppi
 *   i gruppi allenati (lib/recap gruppiAllenati), coi sottogruppi se ci sono
 * @param {number} [p.altezza]  altezza di ogni sagoma, in px
 * @param {string[]} [p.selezionati]  i gruppi scelti: gli altri si spengono
 * @param {(id:string) => void} [p.onGruppo]  se c'è, i muscoli accesi si toccano
 * @param {('fronte'|'dietro')[]} [p.viste]  quali sagome: tutte e due, o una
 *   sola quando il corpo si ingrandisce (components/CorpoZoom)
 * @param {boolean} [p.calore]  i tre livelli di intensità (vista del recap)
 * @param {'uomo'|'donna'} [p.corpo]  di chi è l'allenamento (lib/corpoImmagini
 *   corpoDiAllenamento); senza, il proprio
 */
export default function CorpoAllenato({
  gruppi = [],
  altezza = 172,
  className = '',
  selezionati = [],
  onGruppo = null,
  viste = ['fronte', 'dietro'],
  calore = false,
  corpo,
}) {
  if (gruppi.length === 0) return null
  // Quota di ogni zona sul gruppo più lavorato della giornata.
  const quote = quoteZone(gruppi)
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
          corpo={corpo}
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
  const sg = sottogruppiEsercizio(esercizio)
  // Per ogni gruppo i suoi sottogruppi: il principale pieno, gli altri meno.
  const conSotto = gruppi.map((g) => {
    const suoi = sg.filter((s) => gruppoDi(s)?.id === g.id)
    if (suoi.length === 0) return { id: g.id, serie: 1 }
    return { id: g.id, serie: 1, intere: 0, sotto: Object.fromEntries(suoi.map((s) => [s, s === sg[0] ? 1 : 0.6])) }
  })
  const quote = quoteZone(conSotto)
  // Solo le viste dove si vede almeno una zona accesa.
  const viste = ['fronte', 'dietro'].filter(
    (v) => ZONE_VISTA[v].some((z) => quote[z] != null) || (v === 'fronte' && quote.cardio != null),
  )
  return (
    <CorpoAllenato
      gruppi={conSotto}
      viste={viste}
      altezza={altezza}
      className={'ex-corpo' + (className ? ' ' + className : '')}
    />
  )
}

/** La legenda della vista "Per intensità": poco, i livelli in fila, tanto. */
export function LegendaCalore({ className = '' }) {
  return (
    <div className={'rp-calore' + (className ? ' ' + className : '')}>
      poco
      <span className="rp-calore-livelli">
        {LIVELLI_CALORE.map((l) => (
          <i key={l.colore} style={{ background: l.colore }} />
        ))}
      </span>
      tanto
    </div>
  )
}
