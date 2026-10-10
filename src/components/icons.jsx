// Icone SVG inline (nessuna dipendenza). Ereditano il colore da `currentColor`.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconBack(p) {
  return (
    <svg {...base} {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
export function IconPlus(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
export function IconCheck(p) {
  return (
    <svg {...base} {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
export function IconChevron(p) {
  return (
    <svg {...base} {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
export function IconClock(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
export function IconWeight(p) {
  return (
    <svg {...base} {...p}>
      <path d="M6.5 9h11l1.5 10h-14z" />
      <path d="M9 9a3 3 0 016 0" />
    </svg>
  )
}
// Sole e luna: il cambio tema nel menu "Funzionalita'".
export function IconSole(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </svg>
  )
}
export function IconLuna(p) {
  return (
    <svg {...base} {...p}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </svg>
  )
}
// Il manubrio, di fronte e in orizzontale come quello del logo: il disco
// grande, il disco piccolo e la punta della sbarra per parte, la presa in
// mezzo. Prima era una sbarra in diagonale con due quadratini storti in cima,
// che a 23px non si leggeva come un manubrio. E' la linguetta "Allenamenti"
// della barra in basso e l'icona di ogni allenamento nelle liste.
export function IconDumbbell(p) {
  return (
    <svg {...base} {...p}>
      <rect x="5" y="5.5" width="3.5" height="13" rx="1.2" />
      <rect x="15.5" y="5.5" width="3.5" height="13" rx="1.2" />
      <path d="M5 8.5H3.8a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1H5" />
      <path d="M19 8.5h1.2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H19" />
      <path d="M8.5 12h7M1 12h1.8M21.2 12H23" />
    </svg>
  )
}
export function IconTrash(p) {
  return (
    <svg {...base} {...p}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  )
}
// La scatola di "Archivia" (pages/SchedaPage).
export function IconArchivio(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10h14V9M10 13h4" />
    </svg>
  )
}

// La bandierina di "Segnala" (components/SegnalaContenuto).
export function IconBandiera(p) {
  return (
    <svg {...base} {...p}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  )
}
export function IconEdit(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  )
}
export function IconMusica(p) {
  return (
    <svg {...base} {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
export function IconDots(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  )
}
export function IconBed(p) {
  return (
    <svg {...base} {...p}>
      <path d="M3 18v-6a2 2 0 012-2h9a4 4 0 014 4v4M3 14h18M3 18v2M21 18v2" />
      <circle cx="7" cy="11" r="1.3" />
    </svg>
  )
}
export function IconMenu(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
export function IconCalendar(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  )
}
export function IconClose(p) {
  return (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
export function IconLibrary(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="16" rx="1.5" />
    </svg>
  )
}
export function IconImage(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M21 15l-5-5-8 8" />
    </svg>
  )
}
export function IconVideo(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </svg>
  )
}
export function IconComment(p) {
  return (
    <svg {...base} {...p}>
      {/* Fumetto quadrato con due righe di testo, la coda in basso a sinistra. */}
      <path d="M7 17.5H6a3 3 0 01-3-3v-8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3h-7.5L6.5 21v-3.5z" />
      <path d="M7.5 8.5h9M7.5 12.5h5.5" />
    </svg>
  )
}
export function IconSearch(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
export function IconLock(p) {
  return (
    <svg {...base} {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  )
}
export function IconGlobe(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z" />
    </svg>
  )
}
export function IconBolt(p) {
  return (
    <svg {...base} {...p}>
      <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
    </svg>
  )
}
export function IconGrid(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}
export function IconApple(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 8c-1.5-2-4-2.3-5.5-1C4.7 8.4 4.5 11 5.5 14c.8 2.4 2.3 4.8 4 4.8 1 0 1.4-.5 2.5-.5s1.5.5 2.5.5c1.7 0 3.2-2.4 4-4.8 1-3 .8-5.6-1-7-1.5-1.3-4-1-5.5 1z" />
      <path d="M12 8c0-1.5.6-3 2-3.8" />
    </svg>
  )
}
// Cuore col tracciato del battito: i dati presi dall'orologio.
export function IconBattito(p) {
  return (
    <svg {...base} {...p}>
      <path d="M20.8 6.6a4.6 4.6 0 0 0-7.8-1.4L12 6.3l-1-1.1A4.6 4.6 0 0 0 3.2 6.6c-.6 1.6-.2 3.3 1 4.7" />
      <path d="M4.2 11.3h3.3L9 8.9l2 5.2 1.6-3h2.3" />
      <path d="M16.4 11.3h3.4c-1.2 2.6-5.1 5.6-7.8 7.8-1.3-1-3.1-2.4-4.6-3.9" />
    </svg>
  )
}
export function IconLogout(p) {
  return (
    <svg {...base} {...p}>
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
    </svg>
  )
}

// Personal trainer: una persona con il fischietto (il "coach").
export function IconCoach(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="7" r="3.2" />
      <path d="M3.4 20.5c0-3.1 2.5-5.5 5.6-5.5 1.2 0 2.4.4 3.3 1" />
      <circle cx="18" cy="16.5" r="3.2" />
      <path d="M14.9 15.1l-2.6-1.9 1-1.6 3 1.6" />
    </svg>
  )
}

// Amici: due persone affiancate.
export function IconAmici(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c0-3.1 2.8-5.4 6.2-5.4s6.2 2.3 6.2 5.4" />
      <path d="M16.6 5.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M18 14.9c2 .7 3.4 2.4 3.4 4.5" />
    </svg>
  )
}

// Amici: due persone abbracciate. Diversa da IconAmici (una persona e mezza,
// che vuol dire "gente"): qui le due figure si tengono, perché la sezione non
// è un elenco di utenti ma le persone con cui hai un legame.
export function IconAbbraccio(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="8.4" cy="6.6" r="2.9" />
      <circle cx="15.6" cy="6.6" r="2.9" />
      <path d="M2.6 20.4c0-3 2.6-5.2 5.8-5.2" />
      <path d="M21.4 20.4c0-3-2.6-5.2-5.8-5.2" />
      <path d="M6.6 16.2c1.7 1.1 3.5 1.6 5.4 1.6s3.7-.5 5.4-1.6" />
    </svg>
  )
}

// Lavoro (sezione del PT): una valigetta.
export function IconLavoro(p) {
  return (
    <svg {...base} {...p}>
      <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M2.5 12.5h19" />
    </svg>
  )
}

// Schede prefatte: una tavoletta con il programma già scritto.
export function IconClipboard(p) {
  return (
    <svg {...base} {...p}>
      <rect x="4" y="4" width="16" height="17" rx="2.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 10h7M8.5 14h7M8.5 17.5h4" />
    </svg>
  )
}
export function IconShare(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4" />
    </svg>
  )
}
export function IconLeaf(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 20c0-8 5-13 15-13 0 9-5 13-11 13H4z" />
      <path d="M4 20c3-4 6-6.5 10-8.5" />
    </svg>
  )
}
export function IconUpload(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 16V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}
// Il cuore del mi piace. `pieno` = il mio c'è: si riempie invece di cambiare
// forma, così si riconosce anche senza colori.
export function IconCuore({ pieno = false, ...p }) {
  return (
    <svg {...base} fill={pieno ? 'currentColor' : 'none'} {...p}>
      <path d="M12 20.3s-7.6-4.6-9.2-9.3C1.7 7.6 3.9 4.3 7.2 4.3c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.5 3.3 4.4 6.7-1.6 4.7-9.2 9.3-9.2 9.3z" />
    </svg>
  )
}
// Due anelli di catena: la superserie, esercizi legati che si fanno di fila.
export function IconCatena(p) {
  return (
    <svg {...base} {...p}>
      <path d="M10 13.5a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.6l-1.2 1.2" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.6l1.2-1.2" />
    </svg>
  )
}
// La freccia che scende nel vassoio: salvare sul dispositivo.
export function IconDownload(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 4v12" />
      <path d="M7.5 11.5L12 16l4.5-4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}
// Un foglio a righe e colonne: l'esportazione in Excel.
export function IconTabella(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.8h17M9.5 9.5V20" />
    </svg>
  )
}
// Un foglio con l'angolo piegato: l'esportazione in PDF.
export function IconDocumento(p) {
  return (
    <svg {...base} {...p}>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h5" />
    </svg>
  )
}
export function IconUtente(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}
export function IconBusta(p) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  )
}

// La batteria dello sforzo: quanto era rimasto dopo la serie. Piena = facile
// (ne avevo ancora), una tacca = al limite, vuota = non ce l'ho fatta.
// `tacche` da 0 a 3; le tacche sono piene, il guscio a filo come le altre.
export function IconBatteria({ tacche = 3, ...p }) {
  return (
    <svg {...base} {...p}>
      <rect x="2" y="7" width="17" height="10" rx="2.5" />
      <path d="M21.5 10.5v3" />
      {[5, 9, 13].slice(0, tacche).map((x) => (
        <rect key={x} x={x} y="10" width="3" height="4" rx="0.75" fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

// La campanella del bip di fine recupero; `spenta` la barra.
// I tasti del recupero (components/TimerRecupero): play e pausa PIENI, come
// sui lettori; il reset e' la freccia che torna indietro in tondo.
export function IconPlay(p) {
  return (
    <svg {...base} fill="currentColor" {...p}>
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  )
}
export function IconPausa(p) {
  return (
    <svg {...base} fill="currentColor" {...p}>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  )
}
export function IconReset(p) {
  return (
    <svg {...base} {...p}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3" />
      <path d="M3 3.5v4.8h4.8" />
    </svg>
  )
}
export function IconCampana({ spenta = false, ...p }) {
  return (
    <svg {...base} {...p}>
      <path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
      {spenta && <path d="M3 3l18 18" />}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Le icone della BARRA IN BASSO (components/BarraBasso): un set a parte, tutte
// dello stesso peso e della stessa misura ottica, ognuna in due stati come le
// icone di sistema del telefono — a filo quando è spenta, PIENA quando è la
// sezione in cui si è. Così dove si è lo dice la forma, non solo il colore.
// Senza etichette: la forma deve bastare, quindi poche linee e niente dettagli
// che a 24px diventano rumore.
//   - Home: la casa, con la porta ad arco (piena: la porta resta vuota).
//   - Allenamento: il manubrio, inclinato come lo si impugna.
//   - Dieta: la mela, con la foglia.
//   - Social: due persone, quella davanti piena quando è accesa.
//   - Altro: tre quadrati e un cerchio, "il resto delle cose".
// ---------------------------------------------------------------------------
const tratto = { ...base, strokeWidth: 1.8 }
const CASA = 'M4 10.4 12 3.8l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z'
const PORTA = 'M10 20.5v-4.3a2 2 0 0 1 4 0v4.3'
const MELA =
  'M12 7.6c-1.2-1-2.6-1.5-4.1-1.2C5.4 6.9 4 9.1 4 12.1c0 4.3 2.8 8.4 5.4 8.4.9 0 1.6-.5 2.6-.5s1.7.5 2.6.5c2.6 0 5.4-4.1 5.4-8.4 0-3-1.4-5.2-3.9-5.7-1.5-.3-2.9.2-4.1 1.2z'

const GLOBO =
  'M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm83.13,96H179.56a144.3,144.3,0,0,0-21.35-66.36A84.22,84.22,0,0,1,211.13,116ZM128,207c-9.36-10.81-24.46-33.13-27.45-67h54.94a119.74,119.74,0,0,1-17.11,52.77A108.61,108.61,0,0,1,128,207Zm-27.45-91a119.74,119.74,0,0,1,17.11-52.77A108.61,108.61,0,0,1,128,49c9.36,10.81,24.46,33.13,27.45,67ZM97.79,49.64A144.3,144.3,0,0,0,76.44,116H44.87A84.22,84.22,0,0,1,97.79,49.64ZM44.87,140H76.44a144.3,144.3,0,0,0,21.35,66.36A84.22,84.22,0,0,1,44.87,140Zm113.34,66.36A144.3,144.3,0,0,0,179.56,140h31.57A84.22,84.22,0,0,1,158.21,206.36Z'
const GLOBO_PIENO =
  'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z'

export function IconaSezione({ sezione, piena = false, ...p }) {
  const pieno = piena ? 'currentColor' : 'none'
  switch (sezione) {
    case 'inizio':
      return (
        <svg {...tratto} {...p}>
          {piena ? (
            <path d={CASA + PORTA + 'z'} fill="currentColor" fillRule="evenodd" />
          ) : (
            <>
              <path d={CASA} />
              <path d={PORTA} />
            </>
          )}
        </svg>
      )
    case 'allenamento':
      return (
        <svg {...tratto} {...p}>
          <g transform="rotate(-45 12 12)">
            <rect x="4.2" y="7" width="3.6" height="10" rx="1.4" fill={pieno} />
            <rect x="16.2" y="7" width="3.6" height="10" rx="1.4" fill={pieno} />
            <path d="M7.8 12h8.4M2.2 12h2M19.8 12h2" />
          </g>
        </svg>
      )
    case 'dieta':
      return (
        <svg {...tratto} {...p}>
          <path d={MELA} fill={pieno} />
          <path d="M12 7.6c.1-1.9 1.2-3.4 3.1-4.1" />
        </svg>
      )
    case 'social':
      // Il mondo: gli allenamenti di tutti ("Per te"). Da Phosphor Icons
      // (MIT, phosphoricons.com): da spenta globe-simple "bold", pulito anche
      // a 25px; da accesa globe-hemisphere-west "fill", coi continenti, che
      // nella bolla hanno spazio (i continenti a contorno, piccoli, si
      // impastavano). Le persone di prima erano uguali ad Amici,
      // che nella barra di Social è una voce accanto.
      return (
        <svg viewBox="0 0 256 256" fill="currentColor" {...p}>
          <path d={piena ? GLOBO_PIENO : GLOBO} />
        </svg>
      )
    case 'altro':
      return (
        <svg {...tratto} {...p}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" fill={pieno} />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" fill={pieno} />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" fill={pieno} />
          <circle cx="16.75" cy="16.75" r="3.4" fill={pieno} />
        </svg>
      )
    default:
      return null
  }
}
