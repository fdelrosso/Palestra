import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  consiglioPerPasto,
  dietaDaDatiFisici,
  dietaDiOggi,
  giornataDelGiorno,
  giornatePerTipo,
  labelObiettivo,
  macroGiornata,
  oggiISO,
  pastoVuoto,
  periodoTesto,
  pianoDelGiorno,
} from '../lib/dieta'
import {
  GIORNI_SETTIMANA,
  casellaDi,
  giornoSettimana,
  labelCategoria,
  pastoConCategoria,
  versioniConSchema,
} from '../lib/schemaDieta'
import {
  SLOT_EXTRA,
  SLOT_GIORNATA,
  adattaPastiRimasti,
  alimentiMangiati,
  macroDelPasto,
  pastiFatti,
  restante,
  sceltaDiPartenza,
  somma,
  totaliGiorno,
  versioniPasto,
  vociDaPasto,
  vociPerSlot,
} from '../lib/diario'
import { descriviQuantita } from '../lib/unita'
import { datiMancanti, metabolismoBasale } from '../lib/datiFisici'
import { adattaPiano } from '../lib/alimenti'
import { preferenzeAttive } from '../lib/preferenzeCibo'
import { oggiEAllenamento } from '../lib/consiglio'
import {
  IconApple,
  IconBack,
  IconCalendar,
  IconCheck,
  IconChevron,
  IconLeaf,
  IconPlus,
  IconTrash,
  IconUtente,
} from '../components/icons'
import AggiungiMangiato from '../components/AggiungiMangiato'
import { DietaTestata } from '../components/TestataSezione'

// "Dieta giornaliera": l'obiettivo di oggi, e i pasti che lo riempiono.
//
// La schermata principale fa due cose sole:
//
//   1. L'OBIETTIVO. In cima: le calorie e i tre macro da raggiungere oggi, e
//      quanto se n'è già preso. Le barre si riempiono man mano che si scrive.
//   2. I PASTI. Colazione, spuntino, pranzo, merenda, cena (più "Extra"): in
//      ognuno si scrive quello che si è mangiato davvero ("150g di pollo e una
//      banana") e i macro li calcola l'app. È la persona che riempie la
//      giornata, non l'app che gliela detta.
//
// I CONSIGLI stanno DENTRO ogni pasto (`/dieta/oggi/<pasto>`): cosa dice la
// dieta per quel pasto, con i grammi già ricalcolati su quello che manca, e
// tutte le alternative. Ci si entra se si vuole, e da lì c'è anche "L'ho
// mangiato", la strada veloce per chi la dieta la segue alla lettera.
// ⚠️ Prima era il contrario: il piano occupava la pagina e il diario era una
// sezione in mezzo. Chi la usava si ritrovava a scorrere piatti che non avrebbe
// mangiato per arrivare a scrivere quello che aveva mangiato.
//
// ⚠️ I pasti già fatti NON si riscrivono e quelli riscritti lo dicono: una
// dieta che cambia i numeri alle spalle di chi la segue non è più una dieta.
// Il piano salvato non viene toccato mai — qui è tutto una lente, come già
// l'adattamento alle preferenze alimentari. Un pasto è "fatto" se è stato
// segnato dal piano o se ci si è scritto dentro qualcosa.
//
// SE NON C'È NESSUNA DIETA la pagina non si arrende: dai dati del profilo
// calcola il metabolismo basale, ci applica l'obiettivo e propone quelle
// calorie coi piatti per arrivarci. Se mancano i dati si dice cosa manca.
//
// LO SCHEMA SETTIMANALE (lib/schemaDieta), se la dieta ne ha uno, decide da
// quale versione di ogni pasto si parte: oggi è lunedì e lo schema dice
// "pranzo: legumi" → il pranzo proposto è quello coi legumi, e sulla card del
// pranzo c'è il badge "Legumi". Dentro il pasto le alternative fuori schema
// stanno in fondo, separate, e restano sceglibili: se in casa non ci sono
// legumi, non si resta a digiuno.
function dataOggiLunga() {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const arrotonda = (n) => Math.round(Number(n) || 0)

// Una barra "quanto ne ho preso di quanto ne dovevo prendere". Oltre il 100%
// resta piena e cambia colore: sforare è un'informazione, non un errore da
// nascondere. Accanto al nome, quanto manca: è il numero che serve per
// decidere cosa mangiare adesso.
function BarraMacro({ label, fatto, obiettivo, unita = 'g', grande = false }) {
  const perc = obiettivo > 0 ? Math.min(100, Math.round((fatto / obiettivo) * 100)) : 0
  const oltre = obiettivo > 0 && fatto > obiettivo * 1.05
  const manca = arrotonda(obiettivo) - arrotonda(fatto)
  return (
    <div className={'barra-macro' + (grande ? ' barra-macro-grande' : '')}>
      <div className="barra-macro-testa">
        <span className="barra-macro-lab">
          {label}
          {obiettivo > 0 && (
            <span className="faint" style={{ fontWeight: 600 }}>
              {' · '}
              {manca > 0 ? `mancano ${manca}${unita === 'kcal' ? ' kcal' : unita}` : manca < 0 ? `${-manca}${unita === 'kcal' ? ' kcal' : unita} in più` : 'fatto'}
            </span>
          )}
        </span>
        <span className={'barra-macro-num' + (oltre ? ' oltre' : '')}>
          {arrotonda(fatto)}<span className="faint"> / {arrotonda(obiettivo) || '—'}{unita === 'kcal' ? ' kcal' : unita}</span>
        </span>
      </div>
      <div className="barra-macro-pista">
        <div className={'barra-macro-riempi' + (oltre ? ' oltre' : '')} style={{ width: `${perc}%` }} />
      </div>
    </div>
  )
}

// Una cosa mangiata, in una riga: com'era stata detta ("2 pezzi") e i grammi
// che ne sono usciti — l'unico modo per accorgersi che il peso di un pezzo è
// finito storto.
function VoceMangiata({ v, onTogli }) {
  return (
    <div className="voce-slot">
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="voce-diario-nome">
          {v.nome}
          {v.grammi ? <span className="faint"> · {descriviQuantita(v)}</span> : null}
          {v.stimata && <span className="badge badge-warn">stimato</span>}
        </div>
        <div className="voce-diario-macro">
          {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
        </div>
      </div>
      <button className="icon-btn" onClick={onTogli} aria-label={`Togli ${v.nome}`}>
        <IconTrash width={16} height={16} />
      </button>
    </div>
  )
}

// La versione scelta per ogni pasto, per OGGI: sopravvive al ricaricare la
// pagina e al passaggio fra il pasto e l'elenco. Si tiene il testo e non la
// posizione: l'ordine delle versioni cambia con quello che si mangia.
const chiaveScelte = (data) => `dieta-scelte-${data}`
function leggiScelte(data) {
  try {
    return JSON.parse(localStorage.getItem(chiaveScelte(data)) || '{}') || {}
  } catch {
    return {}
  }
}
function scriviScelte(data, scelte) {
  try {
    localStorage.setItem(chiaveScelte(data), JSON.stringify(scelte))
  } catch {
    /* senza storage la scelta vale finché la pagina è aperta */
  }
}

// Da dove viene una versione, detto a chi la legge.
const FONTE_VERSIONE = {
  schema: 'dallo schema',
  piano: 'dal piano',
  generata: 'rifatta per lo schema',
}

const labelSlot = (id) => SLOT_GIORNATA.find((s) => s.id === id)?.label || ''
const slotDi = (p) => p.slot || SLOT_EXTRA

export default function DietaOggiPage({ pastoId = null }) {
  const {
    diete,
    schede,
    preferenze,
    aggiungiDieta,
    giornoDiario,
    aggiungiVociDiario,
    eliminaVoceDiario,
    togliPastoDiario,
    ricordaCibo,
  } = useStore()
  const { utenteCorrente } = useAccount()
  const salvata = useMemo(() => dietaDiOggi(diete), [diete])
  // Nessuna dieta scritta: la si calcola dai dati del profilo. Non viene
  // salvata finché non lo chiede l'utente.
  const proposta = useMemo(
    () => (salvata ? null : dietaDaDatiFisici(utenteCorrente?.dati, preferenze)),
    [salvata, utenteCorrente, preferenze],
  )
  const attiva = salvata || proposta
  const mancanti = datiMancanti(utenteCorrente?.dati)
  const info = useMemo(() => oggiEAllenamento(schede), [schede])
  const [tipo, setTipo] = useState(info.allenamento ? 'allenamento' : 'riposo')
  // Giornata tipo scelta a mano (null = quella proposta per oggi).
  const [giornataId, setGiornataId] = useState(null)
  // ⚠️ La data si prende UNA volta per render e si passa in giro: chi scrive a
  // mezzanotte meno un minuto deve vedere la voce finire nel giorno che sta
  // guardando, non in quello dopo.
  const data = oggiISO()
  // Per ogni pasto, quale versione si è scelta oggi (il suo testo).
  const [opzionePer, setOpzionePer] = useState(() => leggiScelte(data))
  useEffect(() => scriviScelte(data, opzionePer), [data, opzionePer])
  // In quale pasto è aperto il pannello "aggiungi quello che hai mangiato".
  const [aggiungoIn, setAggiungoIn] = useState(null)
  // Mostrare i pasti com'erano scritti, invece che adattati a quanto resta.
  const [originale, setOriginale] = useState(false)
  // I pasti in cui si è chiesto un consiglio (quelli che la dieta non ha).
  const [consiglioChiesto, setConsiglioChiesto] = useState({})

  const allenamento = tipo === 'allenamento'
  const giorno = giornoDiario(data)
  const mangiato = totaliGiorno(giorno)
  const fatti = pastiFatti(giorno)
  // Gli alimenti che oggi sono già finiti nel piatto: servono a non
  // riproporre a cena quello che si è mangiato a pranzo.
  const giaMangiati = alimentiMangiati(giorno)
  const cibiMiei = preferenze?.cibi || []

  const giornate = useMemo(
    () => (attiva ? giornatePerTipo(attiva, allenamento) : []),
    [attiva, allenamento],
  )

  // Quale menu si sta guardando: quello scelto, quello proposto per oggi, o il
  // piano base se la dieta non ha giornate tipo.
  const giornata = useMemo(() => {
    if (!attiva || giornate.length === 0) return null
    if (giornataId) return giornate.find((g) => g.id === giornataId) || null
    return giornataDelGiorno(attiva, allenamento)
  }, [attiva, giornate, giornataId, allenamento])

  const pianoBase = useMemo(
    () => (attiva ? (giornata ? macroGiornata(giornata, attiva, allenamento) : pianoDelGiorno(attiva, allenamento)) : null),
    [attiva, giornata, allenamento],
  )

  // L'adattamento alle preferenze: non tocca la dieta salvata.
  const adattato = useMemo(
    () => (pianoBase && preferenzeAttive(preferenze) ? adattaPiano(pianoBase, preferenze) : null),
    [pianoBase, preferenze],
  )
  const piano = adattato ? adattato.piano : pianoBase

  const resta = restante(piano || {}, mangiato)

  // Lo schema di oggi: la casella di ogni pasto per questo giorno della
  // settimana. Una dieta senza schema non ne ha nessuna, e tutto va come prima.
  const oggiSett = giornoSettimana()
  const schema = attiva?.schema || []
  const casellaDelloSlot = (slot) => (slot && slot !== SLOT_EXTRA ? casellaDi(schema, oggiSett, slot) : null)

  // Ogni pasto con le sue versioni nell'ordine dello schema (lib/schemaDieta):
  // prima quelle della categoria di oggi, in fondo quelle fuori schema. Il
  // pasto "visto" ha come testo la prima e come opzioni le altre, così tutto
  // quello che c'era prima (non ripetere, "l'ho mangiato") funziona uguale.
  const conSchema = new Map(
    (piano?.pasti || []).map((p) => {
      const casella = p.slot ? casellaDelloSlot(p.slot) : null
      const cat = casella?.categoria
      const generata = cat && cat !== 'libero' ? pastoConCategoria(p.testo, cat, preferenze) : null
      const { versioni, nelloSchema } = versioniConSchema(p, casella, generata)
      const visto = { ...p, testo: versioni[0]?.testo || '', opzioni: versioni.slice(1).map((v) => v.testo) }
      return [p.id, { casella, versioni, nelloSchema, visto }]
    }),
  )
  // I pasti del piano che hanno qualcosa dentro.
  const pastiDelGiorno = (piano?.pasti || []).filter((p) => !pastoVuoto(conSchema.get(p.id).visto))

  // Le versioni di partenza. ⚠️ Se non si è scelto niente a mano, si parte
  // da quella che NON ripete quello che si è già mangiato oggi: avuto il pollo
  // a pranzo, per cena la dieta propone da sola il pesce, se fra le
  // alternative c'è. ⚠️ Solo fra quelle dello schema: non ripetere il pollo
  // non è un buon motivo per uscirne.
  const versioniPer = new Map(
    pastiDelGiorno.map((p) => [p.id, versioniPasto(conSchema.get(p.id).visto, giaMangiati, cibiMiei)]),
  )
  const versioneDi = (p) => {
    const versioni = versioniPer.get(p.id) || []
    const scelta = opzionePer[p.id]
    const i = scelta ? versioni.findIndex((v) => v.testo === scelta) : -1
    if (i >= 0) return i
    const { visto, nelloSchema } = conSchema.get(p.id)
    return sceltaDiPartenza(visto, giaMangiati, cibiMiei, nelloSchema)
  }
  const scegli = (p, testo) => setOpzionePer((o) => ({ ...o, [p.id]: testo }))
  const pastiScelti = pastiDelGiorno.map((p) => ({
    ...p,
    testo: versioniPer.get(p.id)?.[versioneDi(p)]?.testo || conSchema.get(p.id).visto.testo,
  }))

  // Quello che si è mangiato, pasto per pasto.
  const perSlot = vociPerSlot(giorno, piano?.pasti || [])
  // Un pasto è fatto se è stato segnato dal piano, o se dentro il suo slot si
  // è scritto qualcosa (gli extra del piano solo col primo modo: "Extra" è
  // un contenitore, non un pasto).
  const pastoFatto = (p) => fatti.has(p.id) || (!!p.slot && perSlot[p.slot]?.length > 0)

  // Quelli che restano da fare, riscritti sui macro che restano. ⚠️ Si adatta
  // solo se si è già mangiato qualcosa: a stomaco vuoto il piano giusto è
  // quello che c'è scritto.
  const rimasti = pastiScelti.filter((p) => !pastoFatto(p))
  const adattamento = mangiato.kcal > 0 ? adattaPastiRimasti(rimasti, resta) : null
  const adattatiPerId = new Map()
  if (adattamento?.attendibile) for (const p of adattamento.pasti) adattatiPerId.set(p.id, p.testo)
  const testoDi = (p) => (!pastoFatto(p) && !originale && adattatiPerId.get(p.id)) || p.testo

  const pastiDelloSlot = (slot) => pastiScelti.filter((p) => slotDi(p) === slot)
  // Un pasto che la dieta non ha (una dieta "da calorie e macro" non ne ha
  // nessuno) il consiglio lo dà a richiesta: vedi dentro il pasto. "Extra" non
  // è un pasto, senza macro non c'è da dove partire, e a obiettivo raggiunto
  // un tasto che risponde "niente" non serve.
  const puoConsigliare = (slot) =>
    slot !== SLOT_EXTRA &&
    (piano?.proteine || 0) + (piano?.carbo || 0) + (piano?.grassi || 0) > 0 &&
    resta.kcal >= 60 &&
    pastiDelloSlot(slot).length === 0
  const chiediConsiglio = (slot) => setConsiglioChiesto((c) => ({ ...c, [slot]: true }))
  // Quanto la dieta mette in questo pasto, a grandi linee: il riferimento per
  // chi scrive a mano ("a pranzo sono a 420 su ~600"). ⚠️ Solo se il conto è
  // completo: "una porzione di secondo" non ha grammi, e un "~140 kcal" per
  // una colazione che ne vale 350 è un numero sbagliato che sembra giusto.
  const kcalConsigliate = (slot) => {
    const macro = pastiDelloSlot(slot).map((p) => macroDelPasto(testoDi(p), cibiMiei))
    if (macro.some((m) => !m.completo)) return 0
    return macro.reduce((t, m) => t + m.totale.kcal, 0)
  }

  const aggiungi = (slot, voci) => {
    aggiungiVociDiario(
      data,
      voci.map((v) => ({ ...v, slot, pasto: labelSlot(slot) })),
    )
    setAggiungoIn(null)
  }
  const mangiaPasto = (pasto) => {
    const voci = vociDaPasto(pasto, cibiMiei)
    if (voci.length === 0) return
    aggiungiVociDiario(data, voci)
  }

  const pannelloAggiungi = (slot) =>
    aggiungoIn === slot ? (
      <div style={{ marginTop: 10 }}>
        <AggiungiMangiato
          pasto={labelSlot(slot)}
          cibiMiei={cibiMiei}
          onRicorda={ricordaCibo}
          onChiudi={() => setAggiungoIn(null)}
          onAggiungi={(voci) => aggiungi(slot, voci)}
        />
      </div>
    ) : null

  // ---- DENTRO UN PASTO: quello che si è mangiato e i consigli ----
  // Il pasto arriva come slot ("pranzo"); i vecchi indirizzi avevano l'id del
  // pasto del piano, e portano al suo slot.
  const slotAperto = !pastoId
    ? null
    : SLOT_GIORNATA.some((s) => s.id === pastoId)
      ? pastoId
      : (() => {
          const p = (piano?.pasti || []).find((x) => x.id === pastoId)
          return p ? slotDi(p) : null
        })()

  if (attiva && slotAperto) {
    const voci = perSlot[slotAperto] || []
    const pasti = pastiDelloSlot(slotAperto)
    const casella = casellaDelloSlot(slotAperto)
    const cat = casella?.categoria
    const conVincolo = cat && cat !== 'libero'
    const kcalQui = somma(voci).kcal

    // Una versione di un pasto del piano: il testo, da dove viene e i tasti.
    const versione = (p, v, { scelta, meta, fatto }) => {
      const eScelta = v.i === scelta
      // La versione scelta si mostra coi grammi ricalcolati su quanto resta;
      // le alternative come sono scritte.
      const testo = eScelta ? testoDi(p) : v.testo
      const riscritta = eScelta && testo !== v.testo
      const macro = macroDelPasto(testo, cibiMiei)
      const m = meta[v.i] || {}
      return (
        <div
          key={v.i}
          className={'card pasto-card' + (eScelta ? ' versione-scelta' : '') + (m.fuoriSchema ? ' versione-fuori' : '')}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {eScelta && <span className="badge badge-good">Consigliata</span>}
              {m.categoria && <span className="badge">{labelCategoria(m.categoria)}</span>}
              <span className="faint" style={{ fontSize: 11.5 }}>{FONTE_VERSIONE[m.fonte]}</span>
            </div>
            {macro.totale.kcal > 0 && (
              <span className="badge">
                {macro.completo ? '' : '≥ '}
                {macro.totale.kcal} kcal
              </span>
            )}
          </div>
          <div className="pasto-testo" style={{ marginTop: 6 }}>{testo}</div>
          {riscritta && (
            <div className="vis-hint" style={{ marginTop: 6 }}>Grammi ricalcolati su quanto ti resta oggi.</div>
          )}
          {v.ripete.length > 0 && (
            <div className="vis-hint" style={{ marginTop: 6 }}>↺ Oggi hai già mangiato {v.ripete.join(', ')}.</div>
          )}
          {!fatto && (
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              {!eScelta && (
                <button className="btn btn-sm grow" onClick={() => scegli(p, v.testo)}>
                  Preferisco questa
                </button>
              )}
              <button
                className="btn btn-sm grow"
                disabled={macro.totale.kcal <= 0}
                title={
                  macro.totale.kcal <= 0
                    ? 'Qui non riconosco alimenti con i grammi: aggiungi quello che hai mangiato a mano'
                    : undefined
                }
                onClick={() => {
                  // ⚠️ La versione mangiata si fissa: se no, appena il latte è
                  // nel diario, "non ripetere" farebbe cambiare piatto alla
                  // colazione appena mangiata.
                  scegli(p, v.testo)
                  mangiaPasto({ ...p, testo })
                }}
              >
                L'ho mangiata
              </button>
            </div>
          )}
        </div>
      )
    }

    const consigliDi = (p) => {
      const { versioni: meta } = conSchema.get(p.id)
      const versioni = versioniPer.get(p.id) || []
      const scelta = versioneDi(p)
      const fatto = fatti.has(p.id)
      const dentro = versioni.filter((v) => !meta[v.i]?.fuoriSchema)
      const fuori = versioni.filter((v) => meta[v.i]?.fuoriSchema)
      // La consigliata in cima, poi le altre nell'ordine di sempre.
      const ordina = (xs) => [...xs.filter((v) => v.i === scelta), ...xs.filter((v) => v.i !== scelta)]
      const opz = { scelta, meta, fatto }
      return (
        <div key={p.id} style={{ marginBottom: 16 }}>
          {pasti.length > 1 && <div className="section-title">{p.nome || 'Pasto'}</div>}
          {fatto && (
            <div className="card" style={{ marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 13.5 }}>Questo pasto l'hai segnato come mangiato dal piano.</p>
              <button
                className="btn btn-ghost btn-sm btn-block"
                style={{ marginTop: 8 }}
                onClick={() => togliPastoDiario(data, p.id)}
              >
                <IconCheck width={15} height={15} /> Mangiato — annulla
              </button>
            </div>
          )}
          <div className="stack">{ordina(dentro).map((v) => versione(p, v, opz))}</div>
          {fuori.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 16 }}>
                Fuori schema · {fuori.length}
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
                Non sono {labelCategoria(cat).toLowerCase()}, quindi oggi non rispettano lo schema. Se ti
                servono, restano qui.
              </p>
              <div className="stack">{ordina(fuori).map((v) => versione(p, v, opz))}</div>
            </>
          )}
        </div>
      )
    }

    // ---- Il consiglio a richiesta, per un pasto che la dieta non ha ----
    // Una dieta "da calorie e macro" è solo il limite: i piatti si chiedono
    // qui, e sono fatti sulla parte di quello che manca che tocca a QUESTO
    // pasto (lib/dieta, consiglioPerPasto). Gli altri pasti da fare dopo si
    // tengono la loro, i pasti saltati prima no. "Extra" non è un pasto.
    const principali = SLOT_GIORNATA.map((x) => x.id).filter((id) => id !== SLOT_EXTRA)
    const consigliabile = puoConsigliare(slotAperto)
    const dopo = principali.slice(principali.indexOf(slotAperto) + 1).filter((x) => !(perSlot[x]?.length > 0))
    const consiglio =
      consigliabile && consiglioChiesto[slotAperto] ? consiglioPerPasto({ slot: slotAperto, resta, dopo }, preferenze) : null
    // Il consiglio si comporta come un pasto del piano: le sue versioni, la
    // scelta ricordata per oggi, "L'ho mangiata" che lo segna fatto.
    const pastoConsiglio = consiglio
      ? { id: `consiglio-${slotAperto}`, slot: slotAperto, nome: labelSlot(slotAperto), testo: consiglio.testo, opzioni: consiglio.opzioni }
      : null
    const vistaConsiglio = () => {
      const fatto = fatti.has(pastoConsiglio.id)
      if (fatto) {
        return (
          <div className="card" style={{ marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>Il consiglio di questo pasto l'hai segnato come mangiato.</p>
            <button
              className="btn btn-ghost btn-sm btn-block"
              style={{ marginTop: 8 }}
              onClick={() => togliPastoDiario(data, pastoConsiglio.id)}
            >
              <IconCheck width={15} height={15} /> Mangiato — annulla
            </button>
          </div>
        )
      }
      const versioni = versioniPasto(pastoConsiglio, giaMangiati, cibiMiei)
      const ricordata = opzionePer[pastoConsiglio.id]
      const i = ricordata ? versioni.findIndex((v) => v.testo === ricordata) : -1
      const scelta = i >= 0 ? i : sceltaDiPartenza(pastoConsiglio, giaMangiati, cibiMiei)
      const p = { ...pastoConsiglio, testo: versioni[scelta]?.testo || pastoConsiglio.testo }
      const opz = { scelta, meta: {}, fatto: false }
      const ordinate = [...versioni.filter((v) => v.i === scelta), ...versioni.filter((v) => v.i !== scelta)]
      return (
        <>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
            Pensato per questo pasto: circa <strong>{consiglio.obiettivo.kcal} kcal</strong> (P{' '}
            {consiglio.obiettivo.proteine} · C {consiglio.obiettivo.carbo} · G {consiglio.obiettivo.grassi})
            {dopo.length > 0
              ? `. Il resto lo lascio a ${dopo.map((x) => labelSlot(x).toLowerCase()).join(', ')}.`
              : ": è l'ultimo pasto da fare, quindi è tutto quello che ti resta."}
          </p>
          <div className="stack">{ordinate.map((v) => versione(p, v, opz))}</div>
        </>
      )
    }

    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17 }}>{labelSlot(slotAperto)}</h1>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {GIORNI_SETTIMANA[oggiSett].nome}
              {cat ? ` · schema: ${labelCategoria(cat).toLowerCase()}` : ''}
            </div>
          </div>
        </div>

        {/* ---- Quello che si è mangiato in questo pasto ---- */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="card-titolo" style={{ margin: 0 }}>Cosa hai mangiato</div>
            {kcalQui > 0 && <span className="pasto-slot-kcal">{kcalQui} kcal</span>}
          </div>
          {voci.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
              Ancora niente.
            </p>
          ) : (
            <div style={{ marginTop: 4 }}>
              {voci.map((v) => (
                <VoceMangiata key={v.id} v={v} onTogli={() => eliminaVoceDiario(data, v.id)} />
              ))}
            </div>
          )}
          {aggiungoIn === slotAperto ? (
            pannelloAggiungi(slotAperto)
          ) : (
            <button className="btn btn-accent btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => setAggiungoIn(slotAperto)}>
              <IconPlus width={16} height={16} /> Aggiungi
            </button>
          )}
        </div>

        {/* ---- I consigli per arrivare all'obiettivo ---- */}
        <div className="section-title">Consigli per arrivare all'obiettivo</div>
        {piano?.kcal > 0 && (
          <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
            {resta.kcal > 0
              ? `Per oggi ti restano ${resta.kcal} kcal · P ${arrotonda(Math.max(0, resta.proteine))} · C ${arrotonda(Math.max(0, resta.carbo))} · G ${arrotonda(Math.max(0, resta.grassi))}.`
              : `Oggi sei già a ${mangiato.kcal} kcal su ${piano.kcal}.`}
          </p>
        )}

        {conVincolo && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-titolo">
              <IconCalendar width={15} height={15} /> Lo schema di oggi
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              Di {GIORNI_SETTIMANA[oggiSett].nome.toLowerCase()} a {labelSlot(slotAperto).toLowerCase()}:{' '}
              <strong>{labelCategoria(cat).toLowerCase()}</strong>. Qui sotto le alternative che lo
              rispettano; in fondo, separate, quelle che no.
            </p>
          </div>
        )}
        {cat === 'libero' && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-titolo">
              <IconCalendar width={15} height={15} /> Pasto libero
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              Oggi lo schema lascia questo pasto a te: fuori, o qualcosa di più elaborato. Quello che
              mangi scrivilo qui sopra, il conto lo faccio io.
            </p>
          </div>
        )}

        {/* ⚠️ Si sfora, e si dice. I pasti rimasti non scendono sotto il 60%
            di quello che c'era scritto: chi a pranzo ha esagerato non si
            ritrova una cena da 30g di pasta, che non segue nessuno. La
            contropartita e' che il conto non torna, e allora lo si scrive. */}
        {adattamento?.attendibile && adattamento.sforo.kcal > 0 && (
          <div className="card avviso-sforo">
            <strong>Oggi sei sopra l'obiettivo.</strong> Mangiando i pasti che restano arrivi a
            circa <strong>{mangiato.kcal + adattamento.previstoDopo.kcal} kcal</strong>, cioè{' '}
            {adattamento.sforo.kcal} in più di quelle che ti eri dato. Li ho già alleggeriti fin
            dove aveva senso: sotto una certa soglia non sarebbero più pasti. Capita, e un giorno
            così non cambia niente.
          </div>
        )}
        {adattamento?.attendibile && pasti.some((p) => adattatiPerId.has(p.id) && !pastoFatto(p)) && (
          <div className="row" style={{ gap: 8, alignItems: 'center', margin: '0 2px 10px' }}>
            <span className="vis-hint grow" style={{ margin: 0 }}>
              I grammi sono ricalcolati su quello che ti rimane da mangiare.
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setOriginale((o) => !o)}>
              {originale ? 'Vedi adattati' : 'Vedi originali'}
            </button>
          </div>
        )}

        {pasti.length === 0 && consiglio ? (
          vistaConsiglio()
        ) : pasti.length === 0 && consigliabile && consiglioChiesto[slotAperto] ? (
          <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px', lineHeight: 1.45 }}>
            Per oggi l'obiettivo è raggiunto: non resta abbastanza per un pasto. Se hai fame,
            verdure a piacere.
          </p>
        ) : pasti.length === 0 && consigliabile ? (
          <>
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 10px', lineHeight: 1.45 }}>
              La tua dieta non ha niente di scritto per questo pasto: scrivi quello che mangi e il
              conto lo faccio io. Se non sai cosa, te lo propongo io su quello che ti manca.
            </p>
            <button className="btn btn-block" onClick={() => chiediConsiglio(slotAperto)}>
              Consigliami cosa mangiare
            </button>
          </>
        ) : pasti.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px', lineHeight: 1.45 }}>
            {slotAperto === SLOT_EXTRA
              ? 'Qui va quello che mangi fuori dai cinque pasti. La tua dieta non ha pasti in più per oggi.'
              : 'La tua dieta non ha niente di scritto per questo pasto: scrivi quello che mangi e il conto lo faccio io.'}
          </p>
        ) : (
          pasti.map(consigliDi)
        )}

        {/* Cosa è stato cambiato per le tue preferenze */}
        {adattato && adattato.sostituzioni.length > 0 && (
          <div className="card" style={{ marginTop: 6 }}>
            <div className="card-titolo">
              <IconLeaf width={15} height={15} /> Adattato a quello che non mangi
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {adattato.sostituzioni.map((s, i) => (
                <li key={i} className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {s.da} → <strong>{s.a}</strong>
                </li>
              ))}
            </ul>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
              I grammi sono ricalcolati per lasciare invariati i macro. La dieta salvata non è
              stata modificata.
            </p>
          </div>
        )}
        {adattato?.avvisi.map((a, i) => (
          <p key={i} className="form-error" style={{ marginTop: 10 }}>{a}</p>
        ))}
      </div>
    )
  }

  // ---- LA SCHERMATA PRINCIPALE ----
  return (
    <div className="app">
      <DietaTestata attiva="oggi" />
      <div className="muted" style={{ fontSize: 13, margin: '0 2px 10px' }}>{dataOggiLunga()}</div>

      {!attiva ? (
        <div className="empty">
          <div className="big">🍎</div>
          <p>
            Nessuna dieta attiva per oggi, e non posso calcolarne una: manca{' '}
            <strong>{mancanti.join(', ')}</strong> nei tuoi dati.
          </p>
          <button
            className="btn btn-accent"
            style={{ marginTop: 14 }}
            onClick={() => navigate(routes.datiFisici())}
          >
            <IconUtente width={17} height={17} /> Completa i miei dati
          </button>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => navigate(routes.dieta())}>
            Vai alla sezione Dieta
          </button>
        </div>
      ) : (
        <>
          {/* ---- 1. L'OBIETTIVO DI OGGI: si riempie man mano ---- */}
          <div className="card bilancio">
            <div className="segmented" role="tablist" aria-label="Tipo di giornata" style={{ marginBottom: 6 }}>
              {[
                ['allenamento', 'Allenamento'],
                ['riposo', 'Riposo'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tipo === k}
                  className={'seg-btn' + (tipo === k ? ' on' : '')}
                  onClick={() => {
                    setTipo(k)
                    setGiornataId(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="faint" style={{ fontSize: 11.5, textAlign: 'center', marginBottom: 12 }}>
              {info.noto
                ? info.allenamento
                  ? 'Oggi ti alleni, secondo le tue schede.'
                  : 'Oggi è riposo, secondo le tue schede.'
                : 'Imposta i giorni di allenamento nelle schede per sceglierlo in automatico.'}
            </div>

            <div className="bilancio-kcal">
              <div className="kcal-big">
                {mangiato.kcal} <small>/ {piano?.kcal || '—'} kcal</small>
              </div>
              <div className={'bilancio-resta' + (resta.kcal < 0 ? ' oltre' : '')}>
                {piano?.kcal > 0
                  ? resta.kcal >= 0
                    ? `Mancano ${resta.kcal} kcal`
                    : `${-resta.kcal} kcal oltre l'obiettivo`
                  : 'Nessun obiettivo di calorie impostato'}
              </div>
              {piano?.kcal > 0 && (
                <div className="barra-macro-pista kcal-pista">
                  <div
                    className={'barra-macro-riempi' + (resta.kcal < -piano.kcal * 0.05 ? ' oltre' : '')}
                    style={{ width: `${Math.min(100, Math.round((mangiato.kcal / piano.kcal) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              <BarraMacro label="Proteine" fatto={mangiato.proteine} obiettivo={piano?.proteine} />
              <BarraMacro label="Carboidrati" fatto={mangiato.carbo} obiettivo={piano?.carbo} />
              <BarraMacro label="Grassi" fatto={mangiato.grassi} obiettivo={piano?.grassi} />
            </div>
          </div>

          {/* ---- 2. I PASTI: si scrive quello che si mangia ---- */}
          <div className="section-title" style={{ marginTop: 18 }}>I pasti di oggi</div>
          <div className="stack">
            {SLOT_GIORNATA.map((s) => {
              const voci = perSlot[s.id] || []
              const kcal = somma(voci).kcal
              const consigliate = kcalConsigliate(s.id)
              const haConsigli = pastiDelloSlot(s.id).length > 0 || casellaDelloSlot(s.id)
              const casella = casellaDelloSlot(s.id)
              return (
                <div key={s.id} className="card pasto-slot">
                  <button
                    className="pasto-slot-testa"
                    onClick={() => navigate(routes.dietaOggi(s.id))}
                    aria-label={`${s.label}: apri i consigli`}
                  >
                    <span className="pasto-nome">{s.label}</span>
                    {casella?.categoria && (
                      <span className="badge badge-accent">{labelCategoria(casella.categoria)}</span>
                    )}
                    <span className="grow" />
                    <span className="pasto-slot-kcal">
                      {kcal > 0 ? `${kcal}` : voci.length ? '0' : ''}
                      {consigliate > 0 ? (
                        <span className="faint">{kcal > 0 || voci.length ? ' / ' : ''}~{consigliate} kcal</span>
                      ) : kcal > 0 || voci.length ? (
                        ' kcal'
                      ) : null}
                    </span>
                    <IconChevron width={15} height={15} />
                  </button>

                  {voci.length > 0 && (
                    <div className="pasto-slot-voci">
                      {voci.map((v) => (
                        <VoceMangiata key={v.id} v={v} onTogli={() => eliminaVoceDiario(data, v.id)} />
                      ))}
                    </div>
                  )}

                  {aggiungoIn === s.id ? (
                    pannelloAggiungi(s.id)
                  ) : (
                    <div className="row" style={{ gap: 8, marginTop: 10 }}>
                      <button className="btn btn-sm grow" onClick={() => setAggiungoIn(s.id)}>
                        <IconPlus width={15} height={15} /> Aggiungi
                      </button>
                      {haConsigli ? (
                        <button
                          className="btn btn-ghost btn-sm grow"
                          onClick={() => navigate(routes.dietaOggi(s.id))}
                        >
                          Consigli <IconChevron width={14} height={14} />
                        </button>
                      ) : (
                        puoConsigliare(s.id) && (
                          <button
                            className="btn btn-ghost btn-sm grow"
                            onClick={() => {
                              chiediConsiglio(s.id)
                              navigate(routes.dietaOggi(s.id))
                            }}
                          >
                            Consigliami <IconChevron width={14} height={14} />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ---- 3. DA DOVE VENGONO I NUMERI ---- */}
          {/* La dieta calcolata al volo: si dice che è una proposta, da dove
              vengono i numeri e come renderla definitiva. */}
          {!salvata && (
            <div className="card proposta-dieta" style={{ marginTop: 18 }}>
              <div className="card-titolo">Obiettivo calcolato dai tuoi dati</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                Non hai ancora una dieta scritta. Questo obiettivo è calcolato dal tuo metabolismo
                basale ({metabolismoBasale(utenteCorrente?.dati)} kcal) e dall'obiettivo «
                {labelObiettivo(utenteCorrente?.dati?.obiettivo)}». Non è salvato: cambia da solo
                se cambi i tuoi dati.
              </p>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-accent btn-sm grow"
                  onClick={() => {
                    const d = aggiungiDieta(proposta)
                    navigate(routes.dietaEditor(d.id))
                  }}
                >
                  Salva come mia dieta
                </button>
                <button className="btn btn-sm grow" onClick={() => navigate(routes.dietaMacro())}>
                  Ho i miei numeri
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{attiva.nome || 'Dieta'}</div>
                <div className="meta" style={{ marginTop: 4 }}>
                  <span className="badge badge-accent">{labelObiettivo(attiva.obiettivo)}</span>
                  {attiva.fonte === 'esterna' && (
                    <span className="badge" title={attiva.fonteNota || 'Data da un esperto'}>
                      Del nutrizionista
                    </span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  {salvata ? periodoTesto(attiva) : 'Proposta, non salvata'}
                </div>
              </div>
              <span className="dieta-oggi-ico" aria-hidden="true"><IconApple /></span>
            </div>

            {/* Le giornate tipo: cambiano i consigli (e a volte l'obiettivo). */}
            {giornate.length > 1 && (
              <>
                <div className="muted" style={{ fontSize: 12.5, margin: '12px 0 6px', lineHeight: 1.4 }}>
                  {giornate.length} menu per questo tipo di giorno — oggi tocca a «{giornata?.nome}».
                </div>
                <div className="gruppo-chips">
                  {giornate.map((g) => (
                    <button
                      key={g.id}
                      className={'chip' + (g.id === giornata?.id ? ' chip-match' : '')}
                      onClick={() => setGiornataId(g.id)}
                      aria-pressed={g.id === giornata?.id}
                    >
                      {g.nome}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm grow" onClick={() => navigate(routes.dietaPreferenze())}>
                Cosa non mangio
              </button>
              {salvata && (
                <button className="btn btn-ghost btn-sm grow" onClick={() => navigate(routes.dietaEditor(attiva.id))}>
                  Modifica dieta
                </button>
              )}
            </div>
          </div>

          <p className="muted" style={{ fontSize: 12, margin: '16px 2px 0', lineHeight: 1.45 }}>
            I macro degli alimenti sono valori medi da tabella: servono a tenere il conto, non a
            pesare un farmaco.
          </p>
        </>
      )}
    </div>
  )
}
