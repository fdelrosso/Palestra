// ---------------------------------------------------------------------------
// Una scheda come foglio Excel: quello che la esporta dall'app (l'atleta la
// propria, il PT quella di un suo atleta).
//
// Il foglio è uno solo e si legge dall'alto in basso come la scheda nell'app:
// titolo, poi un blocco per giorno con la sua tabella di esercizi. Si stampa
// su una pagina di larghezza.
//
// ⚠️ Serie, ripetizioni, carico e recupero restano la NOTAZIONE DEL PT (§7 di
// context.md): "15/12", "1,15min" e "12rm" escono come testo, tali e quali.
// Diventa un numero solo una cifra intera e nient'altro ("8", "60"), che è
// l'unico caso in cui il numero dice esattamente la stessa cosa — "1,30" di
// recupero è un minuto e mezzo scritto dal PT, non 1,3.
//
// ⚠️ Le settimane: un esercizio uguale per tutta la scheda sta su UNA riga;
// uno che cambia ha una riga per ogni tratto uguale ("1–2", "3", "4–5"), che è
// anche il modo in cui il PT le scrive. Se nessun esercizio cambia, la colonna
// "Settimane" non c'è proprio: direbbe "tutte" su ogni riga.
// ---------------------------------------------------------------------------

import { GIORNI_SETTIMANA } from '../data/model.js'
import { gruppoDi } from './muscoli.js'
import { creaXlsx, lettera, MIME_XLSX, STILI } from './excel.js'

// Solo una cifra intera diventa numero: tutto il resto è notazione.
function valore(testo) {
  const t = String(testo ?? '').trim()
  return /^\d{1,6}$/.test(t) ? Number(t) : t
}

function uguali(a, b) {
  return (
    (a?.serie || '') === (b?.serie || '') &&
    (a?.ripetizioni || '') === (b?.ripetizioni || '') &&
    (a?.carico || '') === (b?.carico || '') &&
    (a?.recupero || '') === (b?.recupero || '') &&
    (a?.nota || '') === (b?.nota || '')
  )
}

/**
 * I tratti di settimane in cui un esercizio resta uguale.
 * @returns {{da:number, a:number, schema:object}[]}
 */
export function trattiSettimane(esercizio, numeroSettimane) {
  const n = Math.max(1, numeroSettimane || 1)
  if (!esercizio.variaPerSettimana || !esercizio.settimane?.length) {
    return [{ da: 1, a: n, schema: esercizio.schemaBase || {} }]
  }
  const tratti = []
  for (let w = 1; w <= n; w++) {
    const schema = esercizio.settimane[Math.min(w, esercizio.settimane.length) - 1] || {}
    const ultimo = tratti[tratti.length - 1]
    if (ultimo && uguali(ultimo.schema, schema)) ultimo.a = w
    else tratti.push({ da: w, a: w, schema })
  }
  return tratti
}

const etichettaTratto = ({ da, a }) => (da === a ? String(da) : `${da}–${a}`)

function dataCorta(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
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
  const conSettimane = n > 1 && esercizi.some((e) => trattiSettimane(e, n).length > 1)
  const conGruppo = esercizi.some((e) => gruppoDi(e.gruppo))

  const colonne = [
    { id: 'nome', titolo: 'Esercizio', largo: 30 },
    conGruppo && { id: 'gruppo', titolo: 'Gruppo', largo: 13 },
    conSettimane && { id: 'settimane', titolo: 'Settimane', largo: 11 },
    { id: 'serie', titolo: 'Serie', largo: 8 },
    { id: 'ripetizioni', titolo: 'Ripetizioni', largo: 13 },
    { id: 'carico', titolo: 'Carico', largo: 11 },
    { id: 'recupero', titolo: 'Recupero', largo: 11 },
    { id: 'note', titolo: 'Note', largo: 42 },
  ].filter(Boolean)
  const ultima = lettera(colonne.length - 1)

  const righe = []
  const unioni = []
  // Una riga che occupa tutta la larghezza (titoli e note lunghe).
  const rigaIntera = (v, stile) => {
    righe.push([{ v, stile }, ...colonne.slice(1).map(() => ({ v: '', stile }))])
    unioni.push(`A${righe.length}:${ultima}${righe.length}`)
  }

  rigaIntera(scheda.nome || 'Scheda', STILI.titolo)
  const giorniAllenamento = (scheda.giorniSettimana || [])
    .map((i) => GIORNI_SETTIMANA[i]?.breve)
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

  giorni.forEach((g, i) => {
    righe.push([])
    const nome = g.nome || (g.tipo === 'rest' ? 'Riposo' : `Giorno ${i + 1}`)
    rigaIntera(g.tipo === 'rest' && !/riposo|rest/i.test(nome) ? `${nome} — riposo` : nome, STILI.giorno)
    if (g.nota) rigaIntera(g.nota, STILI.nota)
    if (g.tipo !== 'workout') return
    if (!g.esercizi?.length) {
      rigaIntera('Nessun esercizio', STILI.nota)
      return
    }

    righe.push(colonne.map((c) => ({ v: c.titolo, stile: STILI.intestazione })))
    for (const es of g.esercizi) {
      const tratti = trattiSettimane(es, n)
      tratti.forEach((t, k) => {
        const primo = k === 0
        const celle = {
          // Il nome solo sulla prima riga: sotto, le righe dello stesso
          // esercizio si leggono come il seguito delle sue settimane.
          nome: primo ? es.nome || 'Esercizio' : '',
          gruppo: primo ? gruppoDi(es.gruppo)?.label || '' : '',
          settimane: etichettaTratto(t),
          serie: valore(t.schema.serie),
          ripetizioni: valore(t.schema.ripetizioni),
          carico: valore(t.schema.carico),
          recupero: valore(t.schema.recupero),
          note: [primo && es.nota, t.schema.nota].filter(Boolean).join(' · '),
        }
        righe.push(
          colonne.map((c) => ({
            v: celle[c.id],
            stile: c.id === 'note' || c.id === 'nome' ? STILI.aCapo : STILI.normale,
          })),
        )
      })
    }
  })

  return { nome: 'Scheda', righe, larghezze: colonne.map((c) => c.largo), unioni }
}

/** Il nome del file: di chi è (se lo esporta il PT) e come si chiama la scheda. */
export function nomeFileScheda(scheda, atleta = '') {
  const base = [atleta, scheda.nome || 'Scheda']
    .filter(Boolean)
    .join(' - ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return `${base || 'Scheda'}.xlsx`
}

/**
 * Il file pronto da condividere o scaricare.
 * @returns {File}
 */
export function fileSchedaExcel(scheda, { atleta = '' } = {}) {
  const byte = creaXlsx([foglioScheda(scheda, { atleta })])
  return new File([byte], nomeFileScheda(scheda, atleta), { type: MIME_XLSX })
}
