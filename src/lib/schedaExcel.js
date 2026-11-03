// ---------------------------------------------------------------------------
// Una scheda come foglio Excel: quello che la esporta dall'app (l'atleta la
// propria, il PT quella di un suo atleta).
//
// Il foglio è uno solo e si legge dall'alto in basso come la scheda nell'app:
// titolo, poi un blocco per giorno con la sua tabella di esercizi. Si stampa
// su una pagina di larghezza.
//
// ⚠️ Serie, ripetizioni, carico e recupero escono come li si legge nell'app
// (lib/schema): "15/12", "1'15\"" e "12RM" come testo. Diventa un numero
// solo una cifra intera e nient'altro ("8", "60"), che è l'unico caso in cui
// il numero dice esattamente la stessa cosa — "1'30\"" non è 1,3.
//
// ⚠️ Le settimane scorrono in verticale, una riga ciascuna, e le serie in
// orizzontale, una casella ciascuna ("8 × 80kg"), come nei risultati (144ª).
// Ogni allenamento comincia su una pagina sua (`salti`, lib/excel e lib/pdf).
// ---------------------------------------------------------------------------

import { GIORNI_SETTIMANA, schemaPerSettimana } from '../data/model.js'
import { gruppoDi } from './muscoli.js'
import { creaXlsx, lettera, MIME_XLSX, STILI } from './excel.js'
import {
  formatDurata,
  formatParametri,
  formattaCarico,
  formattaRip,
  formattaSecondi,
  normalizzaSchema,
  numeroIt,
  numeroSerie,
  obiettivoSerie,
  schemaInTesto,
  serieEspanse,
  schemiUguali,
} from './schema.js'
import { RISCALDAMENTO, STRETCHING, vociDi } from './preparazione.js'
import { normalizzaNome } from './eserciziLibreria.js'
import { statoScheda } from './progression.js'

// Solo una cifra intera diventa numero: tutto il resto è notazione.
function valore(testo) {
  const t = String(testo ?? '').trim()
  return /^\d{1,6}$/.test(t) ? Number(t) : t
}


/**
 * I tratti di settimane in cui un esercizio resta uguale.
 * @returns {{da:number, a:number, schema:object}[]}
 */
export function trattiSettimane(esercizio, numeroSettimane) {
  const n = Math.max(1, numeroSettimane || 1)
  if (!esercizio.variaPerSettimana || !esercizio.settimane?.length) {
    return [{ da: 1, a: n, schema: normalizzaSchema(esercizio.schemaBase) }]
  }
  const tratti = []
  for (let w = 1; w <= n; w++) {
    const schema = normalizzaSchema(esercizio.settimane[Math.min(w, esercizio.settimane.length) - 1])
    const ultimo = tratti[tratti.length - 1]
    if (ultimo && schemiUguali(ultimo.schema, schema)) ultimo.a = w
    else tratti.push({ da: w, a: w, schema })
  }
  return tratti
}

function dataCorta(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Una serie prevista in una casella: "8 × 80kg", "12 per lato", "30\"".
function cellaPrevista(schema, j) {
  const tutte = serieEspanse(schema)
  const x = tutte[j]
  if (!x) return ''
  const rip = formattaRip(x.rip, x.perLato)
  const singolo = x.carico && !Array.isArray(x.carico) ? x.carico : null
  const peso = x.carico ? formattaCarico(x.carico) : ''
  const kg = singolo?.tipo === 'kg'
  return rip && peso ? `${rip}${kg ? ' × ' : ' · '}${peso}` : rip || peso || '✓'
}

/**
 * Il foglio (righe, larghezze, celle unite) di una scheda.
 * @param {object} scheda
 * @param {{atleta?: string, oggi?: Date}} [opzioni] `atleta` = di chi è, quando
 *   a esportarla è il PT; `oggi` serve alle prove.
 */
export function foglioScheda(scheda, { atleta = '', oggi = new Date() } = {}) {
  const n = Math.max(1, scheda.numeroSettimane || 1)
  const giorni = scheda.giorni || []
  const esercizi = giorni.flatMap((g) => (g.tipo === 'workout' ? g.esercizi || [] : []))
  const conGruppo = esercizi.some((e) => gruppoDi(e.gruppo))
  // Quante caselle di serie: la serie più lunga di tutta la scheda.
  let maxSerie = 1
  for (const e of esercizi) {
    for (let w = 1; w <= n; w++) maxSerie = Math.max(maxSerie, serieEspanse(schemaPerSettimana(e, w)).length)
  }

  const colonne = [
    { id: 'nome', titolo: 'Esercizio', largo: 28 },
    conGruppo && { id: 'gruppo', titolo: 'Gruppo', largo: 12 },
    n > 1 && { id: 'settimana', titolo: 'Sett.', largo: 6 },
    { id: 'recupero', titolo: 'Recupero', largo: 9 },
    ...Array.from({ length: maxSerie }, (_, j) => ({ id: j, titolo: `Serie ${j + 1}`, largo: 13 })),
    { id: 'note', titolo: 'Note', largo: 30 },
  ].filter(Boolean)
  const ultima = lettera(colonne.length - 1)

  const righe = []
  const unioni = []
  const salti = []
  // Una riga che occupa tutta la larghezza (titoli e note lunghe).
  const rigaIntera = (v, stile) => {
    righe.push([{ v, stile }, ...colonne.slice(1).map(() => ({ v: '', stile }))])
    unioni.push(`A${righe.length}:${ultima}${righe.length}`)
  }

  rigaIntera(scheda.nome || 'Scheda', STILI.titolo)
  const giorniAllenamento = (scheda.giorniSettimana || [])
    .map((i) => GIORNI_SETTIMANA[i] && GIORNI_SETTIMANA[i].breve + (scheda.doppi?.includes(i) ? ' ×2' : ''))
    .filter(Boolean)
  rigaIntera(
    [
      atleta && `Atleta: ${atleta}`,
      `${n} ${n === 1 ? 'settimana' : 'settimane'}`,
      giorniAllenamento.length && `ci si allena ${giorniAllenamento.join(', ')}`,
      `esportata il ${dataCorta(oggi)}`,
    ]
      .filter(Boolean)
      .join(' · '),
    STILI.normale,
  )
  if (scheda.nota) rigaIntera(scheda.nota, STILI.nota)

  let primoAllenamento = true
  giorni.forEach((g, i) => {
    righe.push([])
    // Ogni allenamento su una pagina sua (144ª): stampato, si stacca e si porta
    // in palestra. Il primo resta sotto il titolo; i riposi non la meritano.
    if (g.tipo === 'workout') {
      if (!primoAllenamento) salti.push(righe.length)
      primoAllenamento = false
    }
    const nome = g.nome || (g.tipo === 'rest' ? 'Riposo' : `Giorno ${i + 1}`)
    rigaIntera(g.tipo === 'rest' && !/riposo|rest/i.test(nome) ? `${nome}, riposo` : nome, STILI.giorno)
    if (g.nota) rigaIntera(g.nota, STILI.nota)
    if (g.tipo !== 'workout') return
    // Riscaldamento sopra la tabella, stretching sotto: dove si fanno.
    const preparazione = (info) => {
      const voci = vociDi(g[info.campo])
      if (voci.length) rigaIntera(`${info.titolo}: ${voci.join(' · ')}`, STILI.nota)
    }
    preparazione(RISCALDAMENTO)
    if (!g.esercizi?.length) {
      rigaIntera('Nessun esercizio', STILI.nota)
      preparazione(STRETCHING)
      return
    }

    righe.push(colonne.map((c) => ({ v: c.titolo, stile: STILI.intestazione })))
    g.esercizi.forEach((es, k) => {
      if (k > 0) rigaIntera('', STILI.separatore)
      // In superserie col precedente (lib/superserie): si scrive nelle note
      // della sua prima riga, dove lo legge chi apre il foglio.
      const precedente = k > 0 && es.insiemeAlPrecedente ? g.esercizi[k - 1] : null
      const superserie = precedente ? `Superserie con ${precedente.nome || 'il precedente'}` : ''
      // ⚠️ Dalla 144ª le settimane scorrono in verticale (una riga ciascuna) e
      // le serie in orizzontale (una casella ciascuna), come nei risultati:
      // prima c'era una riga per tratto uguale con serie, ripetizioni e carico
      // in tre colonne. La nota della settimana si ripete solo se cambia.
      let notaPrima = null
      for (let w = 1; w <= n; w++) {
        const schema = schemaPerSettimana(es, w)
        const primo = w === 1
        // A tempo, i parametri (velocità, livello, zona…) vanno nelle note.
        const notaSett = [...schema.fasi.map((f) => formatParametri(f.parametri)), schema.nota].filter(Boolean).join(' · ')
        const note = [primo && superserie, primo && es.nota, notaSett !== notaPrima && notaSett].filter(Boolean).join(' · ')
        notaPrima = notaSett
        const celle = {
          // Il nome solo sulla prima riga: sotto, le righe dello stesso
          // esercizio si leggono come il seguito delle sue settimane.
          nome: primo ? es.nome || 'Esercizio' : '',
          gruppo: primo ? gruppoDi(es.gruppo)?.label || '' : '',
          settimana: w,
          recupero: valore(formattaSecondi(schema.recuperoSec)),
          note,
        }
        righe.push(
          colonne.map((c) =>
            typeof c.id === 'number'
              ? { v: valore(cellaPrevista(schema, c.id)), stile: STILI.normale }
              : { v: celle[c.id], stile: c.id === 'note' || c.id === 'nome' ? STILI.aCapo : STILI.normale },
          ),
        )
      }
    })
    preparazione(STRETCHING)
  })

  return { nome: 'Scheda', righe, larghezze: colonne.map((c) => c.largo), unioni, salti }
}

// ---------------------------------------------------------------------------
// I RISULTATI: come è andata, settimana per settimana.
//
// Stessa struttura della scheda (un blocco per giorno, gli esercizi nel loro
// ordine), ma ogni esercizio ha una riga per SETTIMANA — e una per ogni volta,
// se quel giorno è stato rifatto ("Ripeti allenamento") — con una casella per
// serie: ripetizioni × peso, colorata come il pallino (verde facile, giallo
// medio, rosso duro). Le settimane non ancora fatte ci sono lo stesso, con
// quello che è previsto: è la scheda intera, che si riempie man mano.
//
// ⚠️ Peso e ripetizioni sono quelli FATTI (`sets[j].kg/rip`, dalla 37ª). Gli
// allenamenti di prima hanno solo il colore: lì si scrive quello che era
// previsto quel giorno (lo schema congelato nel completamento), come fa il
// resto dell'app.
// ⚠️ Un allenamento fatto si ritrova nella scheda per `esercizioId` (salvato
// dalla 38ª) o, prima, per nome. Quello che non si ritrova — un esercizio
// aggiunto solo quel giorno, o rinominato dopo — non sparisce: va in fondo
// alla scheda, sotto "Fuori scheda", coi suoi risultati.
// ---------------------------------------------------------------------------

// Una serie chiusa in una casella: "10 × 80kg", colorata come il pallino.
function cellaSerie(es, j) {
  const s = es.sets?.[j]
  if (!s) return ''
  if (!s.colore) return { v: '-', stile: STILI.nota }
  // A tempo: il tempo fatto, e la distanza se c'è ("10 min · 2 km").
  if (s.sec != null) {
    const v = [formatDurata(s.sec), formatParametri(s.parametri)].filter(Boolean).join(' · ')
    return { v, stile: STILI[s.colore] ?? STILI.normale }
  }
  const { rip, carico } = obiettivoSerie(es.schema, j)
  const singolo = carico && !Array.isArray(carico) ? carico : null
  const ripTesto = s.rip != null ? numeroIt(s.rip) : formattaRip(rip)
  let peso = ''
  if (s.kg != null) peso = formattaCarico({ tipo: 'kg', valore: s.kg, coppia: !!singolo?.coppia })
  else if (singolo) peso = formattaCarico(singolo)
  const kg = s.kg != null || singolo?.tipo === 'kg'
  const v = ripTesto && peso ? `${ripTesto}${kg ? ' × ' : ' · '}${peso}` : ripTesto || peso || '✓'
  return { v, stile: STILI[s.colore] ?? STILI.normale }
}

/**
 * Il foglio dei risultati di una scheda.
 * @param {object} scheda
 * @param {{atleta?: string, oggi?: Date}} [opzioni]
 */
export function foglioRisultati(scheda, { atleta = '', oggi = new Date() } = {}) {
  // Senza fine, le settimane sono quelle arrivate fin qui.
  const n = Math.max(1, (scheda.senzaFine ? scheda.settimanaCorrente : scheda.numeroSettimane) || 1)
  const giorni = (scheda.giorni || []).filter((g) => g.tipo === 'workout')
  const fatti = (scheda.completamenti || [])
    .filter((c) => c && c.data)
    .slice()
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  // Ogni allenamento fatto: i suoi esercizi assegnati a quelli della scheda
  // (prima per id, poi per nome), il resto da parte.
  const perGiorno = new Map() // giornoId (o 'altro:<id>') → [{ c, abbinati, avanzi }]
  for (const c of fatti) {
    const giorno = giorni.find((g) => g.id === c.giornoId)
    const abbinati = new Map() // id dell'esercizio della scheda → esercizio fatto
    const avanzi = []
    const liberi = [...(giorno?.esercizi || [])]
    for (const es of Array.isArray(c.esercizi) ? c.esercizi : []) {
      let i = es.esercizioId ? liberi.findIndex((e) => e.id === es.esercizioId) : -1
      if (i === -1) i = liberi.findIndex((e) => normalizzaNome(e.nome) === normalizzaNome(es.nome))
      if (i === -1) avanzi.push(es)
      else abbinati.set(liberi.splice(i, 1)[0].id, es)
    }
    const chiave = giorno ? giorno.id : `altro:${c.giornoId || ''}`
    if (!perGiorno.has(chiave)) perGiorno.set(chiave, [])
    perGiorno.get(chiave).push({ c, abbinati, avanzi })
  }

  // Quante caselle di serie: la serie più lunga, prevista o fatta.
  let maxSerie = 1
  for (const g of giorni) {
    for (const e of g.esercizi || []) {
      for (let w = 1; w <= n; w++) maxSerie = Math.max(maxSerie, numeroSerie(schemaPerSettimana(e, w)))
    }
  }
  for (const c of fatti) for (const es of c.esercizi || []) maxSerie = Math.max(maxSerie, es.sets?.length || 0)
  // Le note scritte in allenamento su un esercizio (`appunto`, 144ª): la
  // colonna c'è solo se ce n'è almeno una.
  const conNote = fatti.some((c) => (c.esercizi || []).some((es) => es.appunto))

  const colonne = [
    { titolo: 'Esercizio', largo: 28 },
    { titolo: 'Sett.', largo: 6 },
    { titolo: 'Data', largo: 11 },
    { titolo: 'Previsto', largo: 24 },
    ...Array.from({ length: maxSerie }, (_, j) => ({ titolo: `Serie ${j + 1}`, largo: 12 })),
    ...(conNote ? [{ titolo: 'Note', largo: 30 }] : []),
  ]
  const ultima = lettera(colonne.length - 1)
  const righe = []
  const unioni = []
  const salti = []
  const rigaIntera = (v, stile) => {
    righe.push([{ v, stile }, ...colonne.slice(1).map(() => ({ v: '', stile }))])
    unioni.push(`A${righe.length}:${ultima}${righe.length}`)
  }
  // Ogni giorno (e il fuori scheda) su una pagina sua, tranne il primo.
  let sezioni = 0
  const nuovaSezione = (titolo) => {
    righe.push([])
    if (sezioni++) salti.push(righe.length)
    rigaIntera(titolo, STILI.giorno)
  }
  const intestazione = () => righe.push(colonne.map((c) => ({ v: c.titolo, stile: STILI.intestazione })))

  // Una riga: nome (solo sulla prima dell'esercizio), settimana, data,
  // previsto, e le serie — fatte, oppure una nota (segnato senza le serie,
  // non fatto quel giorno), oppure niente se la settimana non è ancora fatta.
  const riga = ({ nome, w, c, previsto, es, nota }) => {
    const celle = [
      { v: nome, stile: STILI.aCapo },
      w,
      c ? dataCorta(new Date(c.data)) : '',
      { v: previsto, stile: STILI.aCapo },
    ]
    if (es) for (let j = 0; j < maxSerie; j++) celle.push(cellaSerie(es, j))
    else if (nota) celle.push({ v: nota, stile: STILI.nota })
    // La nota di quel giorno sulla riga di quel giorno: resta attaccata alla
    // settimana e all'esercizio in cui la si è scritta.
    if (conNote && es?.appunto) {
      while (celle.length < colonne.length - 1) celle.push('')
      celle.push({ v: es.appunto, stile: STILI.aCapo })
    }
    righe.push(celle)
  }

  // In cima: cos'è, a che punto è, e cosa vogliono dire i colori.
  const stato = statoScheda(scheda)
  rigaIntera(`${scheda.nome || 'Scheda'}: ${stato.schedaCompletata ? 'recap' : 'progressi'}`, STILI.titolo)
  rigaIntera(
    [
      atleta && `Atleta: ${atleta}`,
      stato.schedaCompletata
        ? 'scheda completata'
        : `in corso: settimana ${stato.settimana}${scheda.senzaFine ? '' : ` di ${n}`}`,
      `${fatti.length} ${fatti.length === 1 ? 'allenamento fatto' : 'allenamenti fatti'}`,
      `esportata il ${dataCorta(oggi)}`,
    ]
      .filter(Boolean)
      .join(' · '),
    STILI.normale,
  )
  // La legenda: la frase sotto il nome, i tre colori nelle caselle delle
  // serie (con meno di tre serie scivolano sulle colonne prima).
  const legenda = colonne.map(() => '')
  legenda[0] = { v: 'In ogni serie: ripetizioni × peso, del colore del pallino', stile: STILI.nota }
  const primaLegenda = Math.max(1, Math.min(4, colonne.length - 3))
  ;[
    ['Facile', STILI.verde],
    ['Medio', STILI.giallo],
    ['Duro', STILI.rosso],
  ].forEach(([v, stile], k) => {
    legenda[primaLegenda + k] = { v, stile }
  })
  righe.push(legenda)

  // Quello che non si ritrova nella scheda: esercizi fatti solo quel giorno
  // (o rinominati dopo), raccolti per nome. Quelli dei giorni della scheda
  // vanno tutti insieme in fondo, sotto "Fuori scheda" (dalla 144ª: prima
  // stavano in fondo al loro giorno, mischiati al programma).
  const avanziInFondo = (volte, etichetta = '') => {
    const perNome = new Map()
    for (const { c, avanzi } of volte) {
      for (const es of avanzi) {
        const k = normalizzaNome(es.nome)
        if (!perNome.has(k)) perNome.set(k, [])
        perNome.get(k).push({ c, es })
      }
    }
    ;[...perNome.values()].forEach((lista, k) => {
      if (k > 0) rigaIntera('', STILI.separatore)
      lista.forEach(({ c, es }, k) => {
        riga({
          nome: k === 0 ? `${es.nome || 'Esercizio'}${etichetta}` : '',
          w: c.settimana,
          c,
          previsto: schemaInTesto(es.schema),
          es,
        })
      })
    })
  }

  giorni.forEach((g, gi) => {
    nuovaSezione(g.nome || `Giorno ${gi + 1}`)
    const volte = perGiorno.get(g.id) || []
    if (!(g.esercizi || []).length && !volte.length) {
      rigaIntera('Nessun esercizio', STILI.nota)
      return
    }
    intestazione()
    ;(g.esercizi || []).forEach((e, k) => {
      if (k > 0) rigaIntera('', STILI.separatore)
      let primo = true
      const nome = () => {
        const v = primo ? e.nome || 'Esercizio' : ''
        primo = false
        return v
      }
      for (let w = 1; w <= n; w++) {
        const previsto = schemaInTesto(schemaPerSettimana(e, w))
        const diQuesta = volte.filter((x) => x.c.settimana === w)
        if (!diQuesta.length) riga({ nome: nome(), w, previsto })
        for (const { c, abbinati } of diQuesta) {
          const es = abbinati.get(e.id)
          if (!Array.isArray(c.esercizi)) {
            riga({ nome: nome(), w, c, previsto, nota: 'segnato come fatto, senza le serie' })
          } else if (!es) {
            riga({ nome: nome(), w, c, previsto, nota: 'non fatto quel giorno' })
          } else {
            // Il previsto di QUEL giorno: lo schema congelato nell'allenamento.
            riga({ nome: nome(), w, c, previsto: schemaInTesto(es.schema), es })
          }
        }
      }
    })
  })

  // Gli allenamenti di giorni che nella scheda non ci sono più.
  for (const [chiave, volte] of perGiorno) {
    if (!chiave.startsWith('altro:')) continue
    nuovaSezione(`${volte[0].c.nomeGiorno || 'Giorno'} (non più nella scheda)`)
    intestazione()
    avanziInFondo(volte)
    for (const { c } of volte) {
      if (!Array.isArray(c.esercizi)) riga({ nome: '', w: c.settimana, c, previsto: '', nota: 'segnato come fatto, senza le serie' })
    }
  }

  // Tutto il fuori scheda dei giorni della scheda, in ordine di data.
  const fuori = giorni.flatMap((g) => perGiorno.get(g.id) || []).sort((a, b) => new Date(a.c.data) - new Date(b.c.data))
  if (fuori.some((x) => x.avanzi.length)) {
    nuovaSezione('Fuori scheda')
    intestazione()
    avanziInFondo(fuori)
  }

  return { nome: 'Risultati', righe, larghezze: colonne.map((c) => c.largo), unioni, salti }
}

/** Il nome del file: di chi è (se lo esporta il PT), come si chiama la scheda e cos'è. */
export function nomeFileScheda(scheda, atleta = '', suffisso = '', estensione = 'xlsx') {
  const base = [atleta, scheda.nome || 'Scheda', suffisso]
    .filter(Boolean)
    .join(' - ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return `${base || 'Scheda'}.${estensione}`
}

/**
 * Il file pronto da condividere o scaricare.
 * @returns {File}
 */
export function fileSchedaExcel(scheda, { atleta = '' } = {}) {
  const byte = creaXlsx([foglioScheda(scheda, { atleta })])
  return new File([byte], nomeFileScheda(scheda, atleta), { type: MIME_XLSX })
}

/**
 * I risultati come file: "progressi" finché la scheda è in corso, "recap"
 * quando è finita.
 * @returns {File}
 */
export function fileRisultatiExcel(scheda, { atleta = '' } = {}) {
  const byte = creaXlsx([foglioRisultati(scheda, { atleta })])
  const suffisso = statoScheda(scheda).schedaCompletata ? 'recap' : 'progressi'
  return new File([byte], nomeFileScheda(scheda, atleta, suffisso), { type: MIME_XLSX })
}
