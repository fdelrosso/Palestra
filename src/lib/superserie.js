// ---------------------------------------------------------------------------
// Le SUPERSERIE (jumpset, superset): due o più esercizi fatti di fila, senza
// recupero fra l'uno e l'altro, e il recupero solo alla fine del giro.
//
// Nella scheda restano esercizi SEPARATI, ognuno col suo schema (serie,
// ripetizioni, carico diversi): è quello che scrive il PT, ed è ciò che serve
// al consiglio sul carico, allo storico e al recap, che ragionano per
// esercizio. A unirli è un flag solo, sull'esercizio che viene DOPO:
//
//   Esercizio.insiemeAlPrecedente = true   → si fa insieme a quello prima
//
// Un blocco è quindi una corsa di esercizi consecutivi legati dal flag: il
// primo non ce l'ha, gli altri sì. Tre legati di fila sono una tri-serie, e
// funziona uguale.
//
// ⚠️ Perché un flag sul successivo e non un id di gruppo condiviso: la
// superserie è fatta di vicini, e un id di gruppo permetterebbe di "unire" due
// esercizi con in mezzo un terzo che non c'entra — una cosa che in palestra
// non esiste e che ogni schermata dovrebbe poi saper disegnare. Col flag la
// vicinanza è la regola stessa.
//
// ⚠️ Il flag sul PRIMO esercizio del giorno non vuol dire niente (non ha un
// precedente) e si ignora: capita quando si cancella o si sposta il primo di
// un blocco, e le funzioni qui sotto lo trattano come se non ci fosse.
// ---------------------------------------------------------------------------

/** Il flag, letto come va letto: sul primo esercizio non conta. */
export function unitoAlPrecedente(esercizi, i) {
  return i > 0 && !!esercizi?.[i]?.insiemeAlPrecedente
}

/**
 * Gli esercizi raggruppati in blocchi: un esercizio da solo è un blocco di uno,
 * una superserie è un blocco di due o più.
 * @template T
 * @param {T[]} esercizi
 * @returns {{inizio:number, fine:number, indici:number[]}[]}
 */
export function blocchi(esercizi) {
  const out = []
  ;(esercizi || []).forEach((_, i) => {
    if (unitoAlPrecedente(esercizi, i) && out.length) {
      const b = out[out.length - 1]
      b.fine = i
      b.indici.push(i)
    } else {
      out.push({ inizio: i, fine: i, indici: [i] })
    }
  })
  return out
}

/** L'indice del blocco che contiene l'esercizio `i` (0 se la lista è vuota). */
export function bloccoDi(esercizi, i) {
  const bs = blocchi(esercizi)
  const k = bs.findIndex((b) => i >= b.inizio && i <= b.fine)
  return k === -1 ? 0 : k
}

/** È un blocco di più esercizi, cioè una superserie vera. */
export function eSuperserie(blocco) {
  return !!blocco && blocco.indici.length > 1
}

/**
 * Il recupero di una superserie: quello scritto sull'ULTIMO esercizio che ne
 * ha uno. È il recupero di fine giro, l'unico che c'è davvero: fra un
 * esercizio e l'altro del blocco non si recupera. Se il PT l'ha scritto sul
 * primo (capita), si prende quello.
 * @param {object[]} esercizi
 * @param {{indici:number[]}} blocco
 * @param {(e:object) => {recupero?:string}} schemaDi
 */
export function recuperoBlocco(esercizi, blocco, schemaDi = (e) => e.schema) {
  for (let k = blocco.indici.length - 1; k >= 0; k--) {
    const r = schemaDi(esercizi[blocco.indici[k]])?.recupero
    if (r && String(r).trim()) return r
  }
  return ''
}

/**
 * Toglie un esercizio senza rompere le superserie intorno: se era il PRIMO di
 * un blocco, quello dopo diventa il nuovo primo. Senza, il secondo di una
 * superserie tolta a metà finirebbe attaccato all'esercizio che stava prima,
 * che con lui non c'entra niente.
 */
export function togliEsercizio(esercizi, id) {
  const i = esercizi.findIndex((e) => e.id === id)
  if (i === -1) return esercizi
  const out = esercizi.filter((_, k) => k !== i)
  const successivo = esercizi[i + 1]
  if (successivo && successivo.insiemeAlPrecedente && !unitoAlPrecedente(esercizi, i)) {
    out[i] = { ...successivo, insiemeAlPrecedente: false }
  }
  return out
}

/**
 * Sposta un BLOCCO intero (un esercizio da solo, o una superserie con tutti i
 * suoi esercizi) di un posto: prima (-1) o dopo (+1) il blocco vicino. È il
 * riordino delle card nell'editor: la superserie si sposta tutta insieme e
 * resta com'era, perché i flag viaggiano con i suoi esercizi e il primo di
 * ogni blocco il flag non ce l'ha.
 * @param {string} id  un esercizio qualsiasi del blocco da spostare
 */
export function spostaBlocco(esercizi, id, verso) {
  const i = esercizi.findIndex((e) => e.id === id)
  if (i === -1) return esercizi
  const bs = blocchi(esercizi)
  const k = bloccoDi(esercizi, i)
  const altro = k + verso
  if (altro < 0 || altro >= bs.length) return esercizi
  const ordine = bs.map((_, n) => n)
  ordine[k] = altro
  ordine[altro] = k
  return ordine.flatMap((n) =>
    bs[n].indici.map((x, pos) => ({
      ...esercizi[x],
      // Il primo di ogni blocco non è legato a niente: tenerlo pulito vuol
      // dire che due blocchi scambiati non si incollano per sbaglio.
      insiemeAlPrecedente: pos > 0,
    })),
  )
}

/**
 * Sposta un esercizio DENTRO la sua superserie (-1 prima, +1 dopo): cambia chi
 * si fa per primo nel giro, e la superserie resta intera. Fuori dal blocco non
 * va: per quello c'è spostaBlocco, o l'interruttore che la scioglie.
 */
export function spostaNelBlocco(esercizi, id, verso) {
  const i = esercizi.findIndex((e) => e.id === id)
  if (i === -1) return esercizi
  const b = blocchi(esercizi)[bloccoDi(esercizi, i)]
  const j = i + verso
  if (j < b.inizio || j > b.fine) return esercizi
  const out = [...esercizi]
  out[i] = esercizi[j]
  out[j] = esercizi[i]
  for (let n = b.inizio; n <= b.fine; n++) {
    out[n] = { ...out[n], insiemeAlPrecedente: n > b.inizio }
  }
  return out
}

/**
 * L'ordine in cui si fanno le serie di un blocco: il giro. In una superserie
 * A+B da 3 serie è A1 B1 · A2 B2 · A3 B3; da solo è A1 A2 A3, cioè
 * l'ordine di sempre. Se gli esercizi hanno un numero diverso di serie, chi
 * ne ha meno salta i giri in più.
 * @param {{sets:object[]}[]} esercizi  gli esercizi della sessione
 * @param {{indici:number[]}} blocco
 * @returns {{i:number, j:number}[]}  i = indice dell'esercizio, j = serie
 */
export function giro(esercizi, blocco) {
  const max = Math.max(0, ...blocco.indici.map((i) => esercizi[i]?.sets?.length || 0))
  const out = []
  for (let j = 0; j < max; j++) {
    for (const i of blocco.indici) {
      if (j < (esercizi[i]?.sets?.length || 0)) out.push({ i, j })
    }
  }
  return out
}
