// ---------------------------------------------------------------------------
// Tre modi per togliere il vuoto fra la "serie di adesso" e i tasti dello
// sforzo nella card dell'allenamento. L'allenamento è quello VERO
// (WorkoutSession sullo store finto); cambia solo il CSS qui sotto.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-sforzo.html?v=a   (o b, c; niente = com'è oggi)
//
// A · in basso:   serie e tasti scendono insieme, il vuoto va sotto il nome
// B · modellino:  il corpo esce dallo sfondo e riempie lo spazio che resta
// C · serie:      il riquadro della serie prende lo spazio, numeri grandi
// ---------------------------------------------------------------------------
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { nuovaScheda, nuovoEsercizio, nuovoGiorno, schemaVuoto } from '../src/data/model.js'
import { creaSessione } from '../src/lib/session.js'
import { impostaFinto } from './finto-store-vivo.js'
import WorkoutSession from '../src/pages/WorkoutSession.jsx'
import '../src/index.css'

// ?consiglio=1: senza peso nella scheda, cosi' compare la riga "Peso
// consigliato ›" (nell'uso vero c'e' quasi sempre, e prende ~56px).
const conConsiglio = new URLSearchParams(location.search).get('consiglio') === '1'
const sc = (serie, rip, kg, recuperoSec) =>
  schemaVuoto({ fasi: [{ serie, rip, carico: conConsiglio ? null : { tipo: 'kg', valore: kg } }], recuperoSec })

const giorno = nuovoGiorno({
  nome: 'Giorno A',
  esercizi: [
    nuovoEsercizio({ nome: 'Panca piana', gruppo: 'petto', gruppi: ['petto'], schemaBase: sc(5, 8, 62.5, 120) }),
    nuovoEsercizio({ nome: 'Squat', gruppo: 'gambe', gruppi: ['gambe'], schemaBase: sc(4, 6, 90, 180) }),
  ],
})
// ?ss=1: una superserie con le note lunghe, come nell'uso vero.
const giornoSS = nuovoGiorno({
  nome: 'Giorno B',
  esercizi: [
    nuovoEsercizio({ nome: 'Pectoral', gruppo: 'petto', gruppi: ['petto'], nota: '12rm', schemaBase: sc(3, 9, 40, null) }),
    nuovoEsercizio({
      nome: 'Pulley',
      gruppo: 'schiena',
      gruppi: ['schiena'],
      nota: 'culo rialzato focus centro schiena 9(12rm)',
      insiemeAlPrecedente: true,
      schemaBase: sc(3, 9, 45, 60),
    }),
    nuovoEsercizio({ nome: 'Crunch', gruppo: 'addome', gruppi: ['addome'], schemaBase: sc(3, 15, 0, 45) }),
  ],
})
const superserie = new URLSearchParams(location.search).get('ss') === '1'
const scheda = nuovaScheda({
  id: 's1',
  nome: 'Scheda di prova',
  numeroSettimane: 1,
  giorni: [superserie ? giornoSS : giorno],
})
// L'allenamento della settimana scorsa: la serie 3 era stata "Medio", e il
// tasto giallo lo dice ("ultima volta").
scheda.completamenti = [
  {
    data: '2026-10-04T10:00:00Z',
    esercizi: [
      {
        nome: 'Panca piana',
        schema: sc(5, 8, 60, 120),
        sets: ['verde', 'verde', 'giallo', 'giallo', 'rosso'].map((colore) => ({ colore, kg: 60, rip: 8 })),
      },
      {
        nome: 'Pectoral',
        schema: sc(3, 9, 40, null),
        sets: ['verde', 'verde', 'verde'].map((colore) => ({ colore, kg: 40, rip: 9 })),
      },
      {
        nome: 'Pulley',
        schema: sc(3, 9, 45, 60),
        sets: ['verde', 'verde', 'verde'].map((colore) => ({ colore, kg: 45, rip: 9 })),
      },
    ],
  },
]
// A metà del primo esercizio: due serie fatte, si guarda la terza.
const sessione = creaSessione(scheda, scheda.giorni[0], 1)
if (!superserie) {
  sessione.esercizi[0].sets[0].colore = 'verde'
  sessione.esercizi[0].sets[1].colore = 'giallo'
}
impostaFinto({ schede: [scheda], sessione })

// Il suggerimento sulla musica compare una volta sola: qui toglierebbe spazio
// alla card e falserebbe il confronto.
const BASE = '.suggerimento-musica { display: none; }'

const CSS = {
  a: `
    .app.sessione .sforzo-fondo { margin-top: 0; }
    .app.sessione .pista-esercizi > .card > .serie-ora { margin-top: auto; }
  `,
  b: `
    .app.sessione .pista-esercizi > .card > .serie-ora ~ * { order: 2; }
    .app.sessione .corpo-allenato.ex-sfondo {
      position: static; order: 1; flex: 1 1 0; min-height: 0;
      opacity: 1; z-index: auto; justify-content: center; gap: 10px; margin: 8px 0 0;
    }
    .app.sessione .ex-sfondo .corpo-vista { height: 100%; flex: none; }
    .app.sessione .ex-sfondo .corpo-foto { height: 100% !important; width: auto; }
    .app.sessione .ex-sfondo .corpo-vista + .corpo-vista { margin-left: 0; }
  `,
  // --- Seconda tornata: si rifà la barra dello sforzo, non il resto. ---
  // D · tasti alti: i tre tasti si allungano e prendono tutto lo spazio.
  d: `
    .app.sessione .sforzo-fondo { flex: 1 1 auto; display: flex; flex-direction: column; margin-top: 4px; }
    .app.sessione .effort-buttons { flex: 1 1 auto; min-height: 120px; }
    .app.sessione .effort { justify-content: center; gap: 10px; font-size: 18px; }
    .app.sessione .effort svg { width: 44px; height: 44px; }
  `,
  // E · tasti a righe: uno sotto l'altro, larghi, con cosa vuol dire ciascuno.
  e: `
    .app.sessione .sforzo-fondo { flex: 1 1 auto; display: flex; flex-direction: column; margin-top: 4px; }
    .app.sessione .effort-buttons {
      flex: 1 1 auto; grid-template-columns: 1fr; grid-auto-rows: minmax(60px, 88px); align-content: end;
    }
    .app.sessione .effort { flex-direction: row; justify-content: flex-start; gap: 14px; padding: 0 20px; font-size: 18px; }
    .app.sessione .effort svg { width: 34px; height: 34px; }
    .app.sessione .effort::after { margin-left: auto; font-size: 14px; font-weight: 600; opacity: 0.75; }
    .app.sessione .effort.verde::after { content: 'avevo margine'; }
    .app.sessione .effort.giallo::after { content: 'giusto così'; }
    .app.sessione .effort.rosso::after { content: 'al limite'; }
  `,
  // F · barra fissa: i tasti escono dalla card e stanno in fondo allo schermo,
  // come una barra; la card è alta quanto il suo contenuto.
  f: `
    .app.sessione > .pista-esercizi { align-items: flex-start; }
    .app.sessione .pista-esercizi > .card { padding-bottom: 6px; }
    .app.sessione .card.non-attiva .sforzo-fondo { display: none; }
    .app.sessione .sforzo-fondo {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 5;
      padding: 10px 16px calc(14px + var(--safe-bottom));
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(12px);
      border-top: 1px solid color-mix(in srgb, var(--text) 10%, transparent);
    }
    .app.sessione .sforzo-testa { margin-top: 0; }
  `,
  c: `
    .app.sessione .pista-esercizi > .card > .serie-ora {
      flex: 1 1 auto; display: flex; flex-direction: column;
      justify-content: center; align-items: center; text-align: center; gap: 4px;
    }
    .app.sessione .serie-ora-obiettivo {
      justify-content: center; font-size: clamp(30px, 7vh, 56px); margin: 8px 0 18px;
    }
    .app.sessione .serie-ora-per { font-size: 0.7em; }
    .app.sessione .serie-ora .set-dots { justify-content: center; }
    .app.sessione .serie-ora .set-dot { width: 40px; height: 40px; }
  `,
}
const parametri = new URLSearchParams(location.search)
const v = parametri.get('v')
const CHIAVE_PIP = 'palestra:pip:v1' // come in WorkoutSession
// ?pip=1: l'allenamento con la fascia del video in fondo (menu ⋯ → PiP).
try {
  if (parametri.get('pip') === '1') localStorage.setItem(CHIAVE_PIP, '1')
  else localStorage.removeItem(CHIAVE_PIP)
} catch {
  // niente localStorage: si vede senza PiP
}

// ?misura=1: in alto a sinistra quanto e' alta la card attiva e quanto
// vorrebbe esserlo il suo contenuto (scrollHeight). Se il secondo e' piu'
// grande, la card scorre.
if (parametri.get('misura') === '1') {
  setTimeout(() => {
    const c = document.querySelector('.pista-esercizi > .card:not(.non-attiva)')
    const d = document.createElement('div')
    d.style.cssText = 'position:fixed;top:0;left:0;z-index:99;background:#000;color:#ff0;font:bold 14px monospace;padding:4px'
    d.textContent = `card ${c.clientHeight} / contenuto ${c.scrollHeight}`
    document.body.append(d)
  }, 1500)
}

// ?tocca=verde,giallo: dopo il caricamento preme quei tasti dello sforzo, uno
// alla volta, nella card attiva (per vedere dove porta il giro).
const tocchi = (parametri.get('tocca') || '').split(',').filter(Boolean)
tocchi.forEach((c, n) =>
  setTimeout(() => document.querySelector(`.pista-esercizi > .card:not(.non-attiva) .effort.${c}`)?.click(), 800 + n * 300),
)

const nodo = document.getElementById('radice')
nodo._radice ||= createRoot(nodo)
nodo._radice.render(
  <StrictMode>
    <style>{BASE + (CSS[v] || '')}</style>
    <WorkoutSession />
  </StrictMode>,
)
