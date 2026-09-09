// ---------------------------------------------------------------------------
// L'esecuzione di un esercizio, disegnata e animata.
//
// Prende il movimento dal catalogo (lib/animazioniEsercizi), ne calcola i
// fotogrammi (lib/figura) e li da' in pasto al browser come animazioni SMIL
// (`<animate>` dentro l'SVG). SMIL e non JavaScript perche' cosi' l'animazione
// la manda avanti il browser: nessun timer, nessun re-render di React, e in una
// lista con venti esercizi che si muovono insieme la differenza si sente. Anche
// Safari su iPhone lo supporta, che qui e' il vero banco di prova.
//
// Ogni pezzo del corpo e' UNA polyline con UN solo `<animate>` sull'attributo
// `points`: l'alternativa (un animate per ogni coordinata) moltiplicava per sei
// il numero di animazioni sulla pagina. Attrezzi e testa si spostano invece con
// un `animateTransform` di tipo translate, che e' ancora piu' economico.
//
// Chi ha chiesto meno animazioni (prefers-reduced-motion) vede la figura ferma
// nel punto di massimo sforzo: l'informazione "come si fa" resta.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { fotogrammi, serie, serieTrasla, riquadro, VIEWBOX, MISURE } from '../lib/figura'
import { movimentoDi } from '../lib/animazioniEsercizi'

// I fotogrammi di un movimento non cambiano mai: si calcolano una volta sola
// per tutta la vita della pagina.
const CACHE = new Map()
function frameDi(mov, n) {
  const chiave = mov.id + ':' + n
  if (!CACHE.has(chiave)) CACHE.set(chiave, fotogrammi(mov.a, mov.b, n))
  return CACHE.get(chiave)
}

const menoAnimazioni = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Serie di valori per una polyline i cui punti si calcolano a mano.
function serieDa(frames, fn) {
  return frames
    .map((f) =>
      fn(f)
        .map((p) => `${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`)
        .join(' ')
    )
    .join(';')
}

// Una polyline animata: `nomi` sono i punti del corpo da collegare.
function Osso({ frames, nomi, dur, className, larghezza, statico }) {
  const punti = frames.map((f) => nomi.map((n) => f[n]))
  const iniziale = punti[statico ? Math.floor(frames.length / 2) : 0]
  return (
    <polyline
      className={className}
      strokeWidth={larghezza}
      points={iniziale.map((p) => `${p[0]},${p[1]}`).join(' ')}
    >
      {!statico && (
        <animate
          attributeName="points"
          values={serie(frames, nomi)}
          dur={dur}
          repeatCount="indefinite"
        />
      )}
    </polyline>
  )
}

// Un gruppo che segue un punto del corpo (testa, attrezzi).
function Segue({ frames, nome, dur, offX = 0, offY = 0, statico, children }) {
  const i = statico ? Math.floor(frames.length / 2) : 0
  const p = frames[i][nome]
  return (
    <g transform={`translate(${p[0] + offX} ${p[1] + offY})`}>
      {!statico && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values={serieTrasla(frames, nome, offX, offY)}
          dur={dur}
          repeatCount="indefinite"
        />
      )}
      {children}
    </g>
  )
}

// ------------------------------------------------------------------- scene

const PAV = (
  <line className="mov-terra" x1="2" y1="100" x2="118" y2="100" />
)

function panca(x1, x2, y) {
  return (
    <g className="mov-arredo">
      <rect x={x1} y={y} width={x2 - x1} height="5" rx="2" />
      <rect x={x1 + 3} y={y + 5} width="3.5" height={100 - y - 5} />
      <rect x={x2 - 6.5} y={y + 5} width="3.5" height={100 - y - 5} />
    </g>
  )
}

// Il montante va SEMPRE a bordo riquadro, con un braccio orizzontale fino alla
// carrucola: disegnandolo sotto la carrucola passava in mezzo alla figura.
function puleggia(x, y) {
  const montante = x < 60 ? 8 : 112
  const cima = Math.min(y, 14)
  const braccio = Math.abs(x - montante)
  return (
    <g className="mov-arredo">
      <rect x={montante - 2} y={cima} width="4" height={100 - cima} rx="1.5" />
      {braccio > 5 && (
        <rect x={Math.min(x, montante)} y={y - 2} width={braccio} height="4" rx="1.5" />
      )}
      <circle className="mov-puleggia" cx={x} cy={y} r="4" />
    </g>
  )
}

function Scena({ mov }) {
  const a = mov.ancora
  switch (mov.scena) {
    case 'panca':
      return (
        <>
          {PAV}
          {panca(10, 78, 78)}
        </>
      )
    case 'panca-bassa':
      return (
        <>
          {PAV}
          {panca(16, 52, 84)}
        </>
      )
    case 'panca-dietro':
      return (
        <>
          {PAV}
          {panca(14, 46, 78)}
        </>
      )
    case 'panca-inclinata':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <path d="M22.5 58.4 L55 77.2 L52 82.4 L19.5 63.6 Z" />
            <rect x="52" y="80" width="3.5" height="20" />
            <rect x="20" y="62" width="3.5" height="38" />
          </g>
        </>
      )
    case 'panca-declinata':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <path d="M26 78 L70 62 L72 69 L28 85 Z" />
            <rect x="30" y="85" width="3.5" height="15" />
            <rect x="64" y="68" width="3.5" height="32" />
          </g>
        </>
      )
    case 'panca-45':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <path d="M46 62 L64 76 L60 82 L42 68 Z" />
            <rect x="50" y="76" width="4" height="24" />
            <rect x="60" y="86" width="16" height="4" rx="2" />
          </g>
        </>
      )
    case 'panca-scott':
      return (
        <>
          {PAV}
          {panca(20, 56, 84)}
          <g className="mov-arredo">
            <path d="M58 60 L76 60 L80 74 L62 74 Z" />
            <rect x="66" y="74" width="4" height="26" />
          </g>
        </>
      )
    case 'macchina-schienale':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="26" y="82" width="34" height="5" rx="2" />
            <rect x="24" y="46" width="6" height="38" rx="3" />
            <rect x="40" y="87" width="4" height="13" />
            <rect x="20" y="40" width="4" height="60" />
          </g>
        </>
      )
    case 'macchina-petto':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="26" y="86" width="30" height="5" rx="2" />
            <rect x="62" y="46" width="6" height="30" rx="3" />
            <rect x="70" y="30" width="4" height="70" />
            <rect x="38" y="91" width="4" height="9" />
          </g>
        </>
      )
    case 'macchina-gambe':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="26" y="82" width="34" height="5" rx="2" />
            <rect x="24" y="48" width="6" height="36" rx="3" />
            <rect x="40" y="87" width="4" height="13" />
            <rect x="72" y="60" width="4" height="40" />
          </g>
        </>
      )
    case 'sbarra-alta':
      return (
        <g className="mov-arredo">
          <rect x="24" y="16" width="58" height="4" rx="2" />
          <rect x="24" y="16" width="4" height="18" />
          <rect x="78" y="16" width="4" height="18" />
        </g>
      )
    case 'parallele':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="30" y="58" width="46" height="4" rx="2" />
            <rect x="34" y="62" width="4" height="38" />
            <rect x="68" y="62" width="4" height="38" />
          </g>
        </>
      )
    case 'rack':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="20" y="26" width="4" height="74" />
            <rect x="92" y="26" width="4" height="74" />
          </g>
        </>
      )
    case 'lat-machine':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="30" y="84" width="30" height="5" rx="2" />
            <rect x="42" y="89" width="4" height="11" />
            <rect x="16" y="66" width="26" height="4" rx="2" />
          </g>
          {a && puleggia(a[0], a[1])}
        </>
      )
    case 'pulley':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="24" y="86" width="52" height="4" rx="2" />
          </g>
          {a && puleggia(a[0], a[1])}
        </>
      )
    case 'cavo-alto':
    case 'cavo-basso':
    case 'cavo-alto-fronte':
      return (
        <>
          {PAV}
          {a && puleggia(a[0], a[1])}
        </>
      )
    case 'cavi-doppi':
      return (
        <>
          {PAV}
          {a && puleggia(a[0], a[1])}
          {a && puleggia(120 - a[0], a[1])}
        </>
      )
    case 'leg-press':
      return (
        <g className="mov-arredo">
          <path d="M58 96 L104 26 L110 30 L64 100 Z" opacity="0.45" />
          <rect x="30" y="84" width="30" height="5" rx="2" />
          <rect x="22" y="60" width="6" height="30" rx="3" />
        </g>
      )
    case 'gradino':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="60" y="82" width="34" height="18" rx="2" />
          </g>
        </>
      )
    case 'tapis':
    case 'tapis-salita':
      return (
        <g className="mov-arredo">
          <path
            d={mov.scena === 'tapis' ? 'M18 98 h84 v6 h-84 z' : 'M18 104 L102 88 l1.5 6 L19.5 110 z'}
            rx="2"
          />
          <rect x="94" y="52" width="4" height="46" />
          <rect x="82" y="50" width="18" height="4" rx="2" />
        </g>
      )
    case 'cyclette':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <circle className="mov-vuoto" cx="69" cy="83" r="9" />
            <rect x="30" y="70" width="6" height="30" rx="2" />
            <rect x="24" y="66" width="20" height="5" rx="2" />
            <rect x="76" y="46" width="5" height="24" rx="2" />
            <rect x="70" y="44" width="20" height="4" rx="2" />
          </g>
        </>
      )
    case 'ellittica':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="26" y="94" width="70" height="5" rx="2" />
            <circle className="mov-vuoto" cx="34" cy="84" r="9" />
          </g>
        </>
      )
    case 'vogatore':
      return (
        <>
          {PAV}
          <g className="mov-arredo">
            <rect x="26" y="88" width="76" height="4" rx="2" />
            <rect x="96" y="66" width="6" height="24" rx="2" />
          </g>
          {a && <circle className="mov-puleggia" cx={a[0]} cy={a[1]} r="3.5" />}
        </>
      )
    case 'scala':
      return (
        <g className="mov-arredo">
          <path d="M34 100 h18 v-8 h18 v-8 h18 v-8 h10 v24 z" opacity="0.5" />
          <rect x="96" y="44" width="4" height="34" />
          <rect x="84" y="42" width="18" height="4" rx="2" />
        </g>
      )
    default:
      return PAV
  }
}

// --------------------------------------------------------------- attrezzi

function Attrezzi({ mov, frames, dur, statico }) {
  const su = mov.attrezzoSu || 'polso'
  const off = mov.attrezzoOffset || [0, 0]
  const fronte = mov.vista === 'fronte'
  const comuni = { frames, dur, statico, offX: off[0], offY: off[1] }

  switch (mov.attrezzo) {
    case 'bilanciere': {
      const disco = (
        <>
          <circle className="mov-attrezzo" r="8.4" />
          <circle className="mov-attrezzo-buco" r="2.6" />
        </>
      )
      if (su === 'mani' || (fronte && su !== 'spalla')) {
        // vista frontale: la barra si vede per intero tra le due mani
        return (
          <>
            <polyline
              className="mov-barra"
              strokeWidth="3.4"
              points={frames[statico ? 6 : 0].polso2.join(',') + ' ' + frames[statico ? 6 : 0].polso.join(',')}
            >
              {!statico && (
                <animate
                  attributeName="points"
                  values={serieDa(frames, (f) => [
                    [f.polso2[0] - 9, f.polso2[1]],
                    [f.polso[0] + 9, f.polso[1]],
                  ])}
                  dur={dur}
                  repeatCount="indefinite"
                />
              )}
            </polyline>
            <Segue {...comuni} nome="polso" offX={off[0] + 9}>
              {disco}
            </Segue>
            <Segue {...comuni} nome="polso2" offX={off[0] - 9}>
              {disco}
            </Segue>
          </>
        )
      }
      return (
        <Segue {...comuni} nome={su === 'spalla' ? 'spalla' : 'polso'}>
          {disco}
        </Segue>
      )
    }
    case 'manubrio': {
      const manubrio = (
        <g className="mov-attrezzo-g">
          <rect className="mov-attrezzo" x="-5.5" y="-1.4" width="11" height="2.8" rx="1.2" />
          <rect className="mov-attrezzo" x="-7.5" y="-4" width="3.2" height="8" rx="1.2" />
          <rect className="mov-attrezzo" x="4.3" y="-4" width="3.2" height="8" rx="1.2" />
        </g>
      )
      return (
        <>
          <Segue {...comuni} nome="polso">
            {manubrio}
          </Segue>
          {fronte && (
            <Segue {...comuni} nome="polso2">
              {manubrio}
            </Segue>
          )}
        </>
      )
    }
    case 'maniglia': {
      const maniglia = <rect className="mov-attrezzo" x="-1.8" y="-5" width="3.6" height="10" rx="1.6" />
      return (
        <>
          <Segue {...comuni} nome="polso">
            {maniglia}
          </Segue>
          {fronte && (
            <Segue {...comuni} nome="polso2">
              {maniglia}
            </Segue>
          )}
        </>
      )
    }
    case 'cavo': {
      const anc = mov.ancora || [110, 12]
      const anc2 = [120 - anc[0], anc[1]]
      return (
        <>
          <polyline
            className="mov-cavo"
            points={`${anc[0]},${anc[1]} ${frames[statico ? 6 : 0].polso.join(',')}`}
          >
            {!statico && (
              <animate
                attributeName="points"
                values={serieDa(frames, (f) => [anc, f.polso])}
                dur={dur}
                repeatCount="indefinite"
              />
            )}
          </polyline>
          {fronte && (
            <polyline
              className="mov-cavo"
              points={`${anc2[0]},${anc2[1]} ${frames[statico ? 6 : 0].polso2.join(',')}`}
            >
              {!statico && (
                <animate
                  attributeName="points"
                  values={serieDa(frames, (f) => [anc2, f.polso2])}
                  dur={dur}
                  repeatCount="indefinite"
                />
              )}
            </polyline>
          )}
          <Segue {...comuni} nome="polso">
            <rect className="mov-attrezzo" x="-1.8" y="-4.5" width="3.6" height="9" rx="1.6" />
          </Segue>
          {fronte && (
            <Segue {...comuni} nome="polso2">
              <rect className="mov-attrezzo" x="-1.8" y="-4.5" width="3.6" height="9" rx="1.6" />
            </Segue>
          )}
        </>
      )
    }
    case 'piastra':
      return (
        <Segue {...comuni} nome="caviglia">
          <rect className="mov-attrezzo" x="-3" y="-13" width="6" height="26" rx="2" />
        </Segue>
      )
    case 'rullo':
      return (
        <Segue {...comuni} nome="caviglia">
          <circle className="mov-attrezzo" r="4.4" />
        </Segue>
      )
    case 'palla':
      return (
        <Segue {...comuni} nome="polso">
          <circle className="mov-attrezzo" r="6" />
        </Segue>
      )
    case 'ruota':
      return (
        <Segue {...comuni} nome="polso">
          <circle className="mov-attrezzo" r="6" />
          <circle className="mov-attrezzo-buco" r="1.8" />
        </Segue>
      )
    case 'corda':
      return (
        <polyline
          className="mov-cavo"
          points={serieDa([frames[statico ? 6 : 0]], (f) => [f.polso, [f.bacino[0], 104], f.polso2])}
        >
          {!statico && (
            <animate
              attributeName="points"
              values={serieDa(frames, (f) => [
                f.polso,
                [f.bacino[0] + 22, f.polso[1] + 30],
                [f.bacino[0], f.caviglia[1] + 8],
                [f.bacino[0] - 22, f.polso2[1] + 30],
                f.polso2,
              ])}
              dur={dur}
              repeatCount="indefinite"
            />
          )}
        </polyline>
      )
    default:
      return null
  }
}

// ------------------------------------------------------------------ figura

/**
 * Animazione di un esercizio.
 * @param {object} p
 * @param {string} p.nome        nome dell esercizio
 * @param {string} [p.gruppo]    gruppo muscolare (per il colore e la riserva)
 * @param {string} [p.colore]    colore dell attrezzo
 * @param {number} [p.altezza]   altezza in px
 * @param {boolean} [p.mini]     versione ridotta: niente scena, solo la figura
 */
export default function EsercizioAnimato({ nome, gruppo, colore, altezza = 120, mini = false, movimento, className = '' }) {
  const mov = useMemo(() => movimento || movimentoDi(nome, gruppo), [movimento, nome, gruppo])
  const statico = useMemo(() => menoAnimazioni(), [])
  const frames = useMemo(() => (mov ? frameDi(mov, 13) : null), [mov])
  if (!mov || !frames) return null

  const dur = `${mov.durata}s`
  const comuni = { frames, dur, statico }

  return (
    <svg
      className={`mov-svg${className ? ' ' + className : ''}`}
      viewBox={mini ? riquadro(frames) : VIEWBOX}
      height={altezza}
      style={colore ? { '--g': colore } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {!mini && <Scena mov={mov} />}
      <g className="mov-corpo" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* arti lontani: piu' chiari, cosi' si legge la profondita' */}
        <g className="mov-lontano">
          <Osso {...comuni} nomi={['ancaB', 'ginocchio2', 'caviglia2', 'punta2']} larghezza="6" />
          <Osso {...comuni} nomi={['spallaB', 'gomito2', 'polso2']} larghezza="4.6" />
        </g>
        <Osso {...comuni} nomi={['bacino', 'spalla', 'collo']} larghezza="9.5" />
        <Osso {...comuni} nomi={['ancaA', 'ginocchio', 'caviglia', 'punta']} larghezza="6.4" />
        <Osso {...comuni} nomi={['spallaA', 'gomito', 'polso']} larghezza="5" />
      </g>
      <Segue {...comuni} nome="testa">
        <circle className="mov-testa" r={MISURE.raggioTesta} />
      </Segue>
      <Attrezzi mov={mov} frames={frames} dur={dur} statico={statico} />
    </svg>
  )
}
