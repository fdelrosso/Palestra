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
export function IconDumbbell(p) {
  return (
    <svg {...base} {...p}>
      <path d="M6.5 6.5l11 11" />
      <path d="M4 8l-1 1a1.5 1.5 0 000 2l0 0M8 4l-1 1M20 16l-1 1M16 20l1-1" />
      <rect x="2.2" y="7.5" width="3" height="4" rx="1" transform="rotate(45 3.7 9.5)" />
      <rect x="18.8" y="12.5" width="3" height="4" rx="1" transform="rotate(45 20.3 14.5)" />
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
export function IconEdit(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
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
      <path d="M21 11.5a7.5 7.5 0 01-10.9 6.7L4 20l1.8-5.1A7.5 7.5 0 1121 11.5z" />
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
export function IconUtente(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}
