import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { goBack, navigate, routes } from '../lib/router'
import {
  dietaAttiva,
  dietaDaDatiFisici,
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
import { labelPasto } from '../lib/pastiBase'
import {
  adattaPastiRimasti,
  alimentiMangiati,
  macroDelPasto,
  pastiFatti,
  percentualiMacro,
  restante,
  sceltaDiPartenza,
  totaliGiorno,
  versioniPasto,
  vociDaPasto,
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

// "Dieta giornaliera": il piano di oggi E quello che si è mangiato davvero.
//
// La pagina fa tre cose, in quest'ordine di importanza:
//
//   1. IL BILANCIO. In cima: quanto si è assunto finora, come è distribuito fra
//      i macro, e quanto resta. È l'unica domanda che uno si fa a metà
//      pomeriggio, quindi sta sopra a tutto il resto.
//   2. IL DIARIO. Si scrive quello che si è mangiato ("150g di pollo e una
//      banana") e i macro li calcola l'app dal catalogo di lib/alimenti. Ogni
//      pasto del piano ha anche il tasto "L'ho mangiato", che è la strada
//      veloce per chi la dieta la segue davvero.
//   3. IL PIANO. I pasti di oggi — scelti per tipo di giornata e giornata tipo,
//      come prima — dove quelli ANCORA DA FARE si riscrivono sui macro che
//      restano: mangiata una pizza a pranzo, la cena si alleggerisce da sola.
//
// ⚠️ I pasti già fatti NON si riscrivono e quelli riscritti lo dicono: una
// dieta che cambia i numeri alle spalle di chi la segue non è più una dieta.
// Il piano salvato non viene toccato mai — qui è tutto una lente, come già
// l'adattamento alle preferenze alimentari.
//
// SE NON C'È NESSUNA DIETA la pagina non si arrende: dai dati del profilo
// calcola il metabolismo basale, ci applica l'obiettivo e propone quelle
// calorie coi piatti per arrivarci. Se mancano i dati si dice cosa manca.
//
// LO SCHEMA SETTIMANALE (lib/schemaDieta), se la dieta ne ha uno, decide da
// quale versione di ogni pasto si parte: oggi è lunedì e lo schema dice
// "pranzo: legumi" → il pranzo proposto è quello coi legumi. Toccando un pasto
// si ENTRA nel pasto (`#/dieta/oggi/<id>`): lì ci sono tutte le alternative,
// prima quelle dello schema e in fondo, separate, quelle fuori schema — che
// restano sceglibili: se in casa non ci sono legumi, non si resta a digiuno.
function dataOggiLunga() {
  const s = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const arrotonda = (n) => Math.round(Number(n) || 0)

// Una barra "quanto ne ho preso di quanto ne dovevo prendere". Oltre il 100%
// resta piena e cambia colore: sforare è un'informazione, non un errore da
// nascondere.
function BarraMacro({ label, fatto, obiettivo, unita = 'g' }) {
  const perc = obiettivo > 0 ? Math.min(100, Math.round((fatto / obiettivo) * 100)) : 0
  const oltre = obiettivo > 0 && fatto > obiettivo * 1.05
  return (
    <div className="barra-macro">
      <div className="barra-macro-testa">
        <span className="barra-macro-lab">{label}</span>
        <span className={'barra-macro-num' + (oltre ? ' oltre' : '')}>
          {arrotonda(fatto)}<span className="faint"> / {arrotonda(obiettivo) || '—'}{unita}</span>
        </span>
      </div>
      <div className="barra-macro-pista">
        <div className={'barra-macro-riempi' + (oltre ? ' oltre' : '')} style={{ width: `${perc}%` }} />
      </div>
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
  const salvata = useMemo(() => diete.find((d) => dietaAttiva(d)) || null, [diete])
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
  // Il pannello "aggiungi quello che hai mangiato" è aperto.
  const [aggiungo, setAggiungo] = useState(false)
  // Mostrare i pasti com'erano scritti, invece che adattati a quanto resta.
  const [originale, setOriginale] = useState(false)

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
  const quote = percentualiMacro(mangiato)

  // Lo schema di oggi: la casella di ogni pasto per questo giorno della
  // settimana. Una dieta senza schema non ne ha nessuna, e tutto va come prima.
  const oggiSett = giornoSettimana()
  const schema = attiva?.schema || []
  const casellaPer = (p) => (p.slot ? casellaDi(schema, oggiSett, p.slot) : null)

  // Ogni pasto con le sue versioni nell'ordine dello schema (lib/schemaDieta):
  // prima quelle della categoria di oggi, in fondo quelle fuori schema. Il
  // pasto "visto" ha come testo la prima e come opzioni le altre, così tutto
  // quello che c'era prima (non ripetere, "l'ho mangiato") funziona uguale.
  const conSchema = new Map(
    (piano?.pasti || []).map((p) => {
      const casella = casellaPer(p)
      const cat = casella?.categoria
      const generata = cat && cat !== 'libero' ? pastoConCategoria(p.testo, cat, preferenze) : null
      const { versioni, nelloSchema } = versioniConSchema(p, casella, generata)
      const visto = { ...p, testo: versioni[0]?.testo || '', opzioni: versioni.slice(1).map((v) => v.testo) }
      return [p.id, { casella, versioni, nelloSchema, visto }]
    }),
  )
  // Si mostrano i pasti che hanno qualcosa dentro, o che lo schema nomina oggi.
  const pastiDelGiorno = (piano?.pasti || []).filter((p) => !pastoVuoto(conSchema.get(p.id).visto))

  // I pasti come si stanno guardando. ⚠️ Se non si è scelto niente a mano, si
  // parte dalla versione che NON ripete quello che si è già mangiato oggi:
  // avuto il pollo a pranzo, per cena la dieta propone da sola il pesce, se
  // fra le alternative c'è. È la stessa idea dell'adattamento dei grammi —
  // tenere conto della giornata, non solo del piano. ⚠️ Solo fra quelle dello
  // schema: non ripetere il pollo non è un buon motivo per uscirne.
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

  // Quelli che restano da fare, riscritti sui macro che restano. ⚠️ Si adatta
  // solo se si è già mangiato qualcosa: a stomaco vuoto il piano giusto è
  // quello che c'è scritto.
  const rimasti = pastiScelti.filter((p) => !fatti.has(p.id))
  const adattamento = mangiato.kcal > 0 ? adattaPastiRimasti(rimasti, resta) : null
  const adattatiPerId = new Map()
  if (adattamento?.attendibile) for (const p of adattamento.pasti) adattatiPerId.set(p.id, p.testo)

  const mangiaPasto = (pasto) => {
    const voci = vociDaPasto(pasto, cibiMiei)
    if (voci.length === 0) return
    aggiungiVociDiario(data, voci)
  }

  // ---- DENTRO UN PASTO: tutte le sue alternative ----
  const aperto = pastoId ? pastiDelGiorno.find((p) => p.id === pastoId) : null
  if (attiva && aperto) {
    const { casella, versioni: meta } = conSchema.get(aperto.id)
    const versioni = versioniPer.get(aperto.id) || []
    const scelta = versioneDi(aperto)
    const fatto = fatti.has(aperto.id)
    const cat = casella?.categoria
    const conVincolo = cat && cat !== 'libero'
    const dentro = versioni.filter((v) => !meta[v.i]?.fuoriSchema)
    const fuori = versioni.filter((v) => meta[v.i]?.fuoriSchema)

    const versione = (v) => {
      const macro = macroDelPasto(v.testo, cibiMiei)
      const m = meta[v.i] || {}
      const eScelta = v.i === scelta
      return (
        <div
          key={v.i}
          className={'card pasto-card' + (eScelta ? ' versione-scelta' : '') + (m.fuoriSchema ? ' versione-fuori' : '')}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {eScelta && <span className="badge badge-good">Scelta per oggi</span>}
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
          <div className="pasto-testo" style={{ marginTop: 6 }}>{v.testo}</div>
          {v.ripete.length > 0 && (
            <div className="vis-hint" style={{ marginTop: 6 }}>↺ Oggi hai già mangiato {v.ripete.join(', ')}.</div>
          )}
          {!fatto && (
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              {!eScelta && (
                <button
                  className="btn btn-sm grow"
                  onClick={() => {
                    scegli(aperto, v.testo)
                    goBack()
                  }}
                >
                  Scegli questa
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
                  scegli(aperto, v.testo)
                  mangiaPasto({ ...aperto, testo: v.testo })
                  goBack()
                }}
              >
                L'ho mangiata
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="app" style={{ paddingBottom: 40 }}>
        <div className="topbar">
          <button className="icon-btn" onClick={goBack} aria-label="Indietro">
            <IconBack />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17 }}>{aperto.nome || 'Pasto'}</h1>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {GIORNI_SETTIMANA[oggiSett].nome}
              {cat ? ` · schema: ${labelCategoria(cat).toLowerCase()}` : ''}
            </div>
          </div>
        </div>

        {conVincolo && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-titolo">
              <IconCalendar width={15} height={15} /> Lo schema di oggi
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              Di {GIORNI_SETTIMANA[oggiSett].nome.toLowerCase()} a {labelPasto(aperto.slot).toLowerCase()}:{' '}
              <strong>{labelCategoria(cat).toLowerCase()}</strong>. Qui sopra le alternative che lo
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
              mangi aggiungilo al diario, il conto lo faccio io.
            </p>
          </div>
        )}

        {fatto && (
          <div className="card" style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>Questo pasto oggi l'hai già segnato come mangiato.</p>
            <button
              className="btn btn-ghost btn-sm btn-block"
              style={{ marginTop: 8 }}
              onClick={() => togliPastoDiario(data, aperto.id)}
            >
              <IconCheck width={15} height={15} /> Mangiato — annulla
            </button>
          </div>
        )}

        <div className="section-title">
          {conVincolo ? `Nello schema · ${dentro.length}` : `Le alternative · ${dentro.length}`}
        </div>
        <div className="stack">
          {dentro.map(versione)}
        </div>

        {fuori.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 20 }}>
              Fuori schema · {fuori.length}
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 10px', lineHeight: 1.45 }}>
              Non sono {labelCategoria(cat).toLowerCase()}, quindi oggi non rispettano lo schema. Se ti
              servono, restano qui.
            </p>
            <div className="stack">
              {fuori.map(versione)}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17 }}>Dieta giornaliera</h1>
          <div className="muted" style={{ fontSize: 12.5 }}>{dataOggiLunga()}</div>
        </div>
      </div>

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
          {/* ---- 1. IL BILANCIO: la domanda vera, in cima ---- */}
          <div className="card bilancio">
            <div className="bilancio-kcal">
              <div className="kcal-big">
                {mangiato.kcal} <small>/ {piano?.kcal || '—'} kcal</small>
              </div>
              <div className={'bilancio-resta' + (resta.kcal < 0 ? ' oltre' : '')}>
                {piano?.kcal > 0
                  ? resta.kcal >= 0
                    ? `Ti restano ${resta.kcal} kcal`
                    : `${-resta.kcal} kcal oltre l'obiettivo`
                  : 'Nessun obiettivo di calorie impostato'}
              </div>
            </div>

            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              <BarraMacro label="Proteine" fatto={mangiato.proteine} obiettivo={piano?.proteine} />
              <BarraMacro label="Carboidrati" fatto={mangiato.carbo} obiettivo={piano?.carbo} />
              <BarraMacro label="Grassi" fatto={mangiato.grassi} obiettivo={piano?.grassi} />
            </div>

            {mangiato.kcal > 0 && (
              <div className="vis-hint" style={{ marginTop: 10 }}>
                Finora: {quote.proteine}% proteine · {quote.carbo}% carboidrati · {quote.grassi}% grassi.
              </div>
            )}
          </div>

          {/* ---- 2. IL DIARIO ---- */}
          <div className="section-title" style={{ marginTop: 18 }}>
            Cosa ho mangiato
          </div>

          {giorno.voci.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 10px', lineHeight: 1.45 }}>
              Ancora niente. Scrivi quello che mangi — anche solo «120g di pane e 2 uova» — e i
              macro li conto io.
            </p>
          ) : (
            <div className="stack" style={{ gap: 6, marginBottom: 10 }}>
              {giorno.voci.map((v) => (
                <div key={v.id} className="voce-diario">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="voce-diario-nome">
                      {v.nome}
                      {/* Riscritta com'era stata detta: chi ha inserito due
                          biscotti si rilegge "2 pezzi", e accanto i grammi
                          che ne sono usciti — l'unico modo per accorgersi che
                          il peso di un pezzo e' finito storto. */}
                      {v.grammi ? <span className="faint"> · {descriviQuantita(v)}</span> : null}
                      {v.stimata && <span className="badge badge-warn">stimato</span>}
                    </div>
                    <div className="voce-diario-macro">
                      {v.kcal} kcal · P {v.proteine} · C {v.carbo} · G {v.grassi}
                      {v.pasto ? ` · ${v.pasto}` : ''}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => eliminaVoceDiario(data, v.id)}
                    aria-label={`Togli ${v.nome}`}
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {aggiungo ? (
            <AggiungiMangiato
              cibiMiei={cibiMiei}
              onRicorda={ricordaCibo}
              onChiudi={() => setAggiungo(false)}
              onAggiungi={(voci) => {
                aggiungiVociDiario(data, voci)
                setAggiungo(false)
              }}
            />
          ) : (
            <button className="btn btn-accent btn-block" onClick={() => setAggiungo(true)}>
              <IconPlus width={17} height={17} /> Aggiungi quello che hai mangiato
            </button>
          )}

          {/* ---- 3. IL PIANO ---- */}
          {/* La dieta calcolata al volo: si dice che è una proposta, da dove
              vengono i numeri e come renderla definitiva. */}
          {!salvata && (
            <div className="card proposta-dieta" style={{ marginTop: 18 }}>
              <div className="card-titolo">Dieta consigliata dai tuoi dati</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                Non hai ancora una dieta scritta. Questa è calcolata dal tuo metabolismo basale
                ({metabolismoBasale(utenteCorrente?.dati)} kcal) e dall'obiettivo «
                {labelObiettivo(utenteCorrente?.dati?.obiettivo)}». Non è salvata: cambia da sola
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
          </div>

          {/* Oggi allenamento o riposo? */}
          <div className="muted" style={{ fontSize: 13, margin: '14px 2px 8px', lineHeight: 1.4 }}>
            {info.noto
              ? info.allenamento
                ? 'Oggi è un giorno di allenamento: ecco il piano più ricco.'
                : 'Oggi è un giorno di riposo: piano con meno carboidrati.'
              : 'Imposta i giorni di allenamento nelle tue schede per scegliere il piano in automatico.'}
          </div>

          {/* Toggle allenamento / riposo */}
          <div className="segmented" role="tablist" aria-label="Tipo di giornata">
            <button
              role="tab"
              aria-selected={tipo === 'allenamento'}
              className={'seg-btn' + (tipo === 'allenamento' ? ' on' : '')}
              onClick={() => {
                setTipo('allenamento')
                setGiornataId(null)
              }}
            >
              Allenamento
            </button>
            <button
              role="tab"
              aria-selected={tipo === 'riposo'}
              className={'seg-btn' + (tipo === 'riposo' ? ' on' : '')}
              onClick={() => {
                setTipo('riposo')
                setGiornataId(null)
              }}
            >
              Riposo
            </button>
          </div>

          {/* Le giornate tipo disponibili per oggi */}
          {giornate.length > 0 && (
            <>
              <div className="muted" style={{ fontSize: 12.5, margin: '12px 2px 6px', lineHeight: 1.4 }}>
                {giornate.length === 1
                  ? 'Giornata tipo per oggi:'
                  : `${giornate.length} giornate tipo per questo tipo di giorno — oggi tocca a «${giornata?.nome}».`}
              </div>
              {giornate.length > 1 && (
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
              )}
            </>
          )}

          <div className="section-title" style={{ marginTop: 16 }}>
            {giornata?.nome ? `Pasti · ${giornata.nome}` : 'Pasti di oggi'}
          </div>

          {/* Lo schema del giorno in una riga: è la ragione per cui a pranzo
              c'è quel piatto e non un altro. */}
          {schema.length > 0 && (
            <div className="vis-hint schema-oggi" style={{ margin: '0 2px 10px' }}>
              <IconCalendar width={13} height={13} /> Schema di {GIORNI_SETTIMANA[oggiSett].nome.toLowerCase()}:{' '}
              {schema.filter((c) => c.giorno === oggiSett).length === 0
                ? 'niente di fissato, vale il piano.'
                : schema
                    .filter((c) => c.giorno === oggiSett)
                    .map((c) => `${labelPasto(c.pasto).toLowerCase()} ${(labelCategoria(c.categoria) || 'come scritto').toLowerCase()}`)
                    .join(' · ')}
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

          {adattamento?.attendibile && (
            <div className="row" style={{ gap: 8, alignItems: 'center', margin: '0 2px 10px' }}>
              <span className="vis-hint grow" style={{ margin: 0 }}>
                I pasti che restano sono ricalcolati su quello che ti rimane da mangiare.
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setOriginale((o) => !o)}>
                {originale ? 'Vedi adattati' : 'Vedi originali'}
              </button>
            </div>
          )}

          {pastiScelti.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px' }}>
              Nessun pasto impostato per questo piano.
            </p>
          ) : (
            <div className="stack">
              {pastiScelti.map((p) => {
                const fatto = fatti.has(p.id)
                const riscritto = !fatto && !originale && adattatiPerId.get(p.id)
                const testo = riscritto || p.testo
                const macro = macroDelPasto(testo, cibiMiei)
                const versioni = versioniPer.get(p.id) || []
                const scelta = versioneDi(p)
                const { casella, versioni: meta } = conSchema.get(p.id)
                const fuori = meta[scelta]?.fuoriSchema
                return (
                  <div key={p.id} className={'card pasto-card' + (fatto ? ' pasto-fatto' : '')}>
                    <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                      <div className="pasto-nome grow">{p.nome || 'Pasto'}</div>
                      {casella?.categoria && (
                        <span className={'badge' + (fuori ? ' badge-warn' : ' badge-accent')}>
                          {labelCategoria(casella.categoria)}
                        </span>
                      )}
                      {macro.totale.kcal > 0 && (
                        <span className="badge">
                          {macro.completo ? '' : '≥ '}
                          {macro.totale.kcal} kcal
                        </span>
                      )}
                    </div>
                    {testo && <div className="pasto-testo">{testo}</div>}
                    {riscritto && riscritto !== p.testo && (
                      <div className="vis-hint" style={{ marginTop: 6 }}>
                        Grammi ricalcolati su quanto ti resta oggi.
                      </div>
                    )}
                    {fuori && (
                      <div className="vis-hint" style={{ marginTop: 6 }}>
                        Fuori schema: oggi sarebbe {labelCategoria(casella.categoria).toLowerCase()}.
                      </div>
                    )}
                    {versioni[scelta]?.ripete.length > 0 && !fatto && (
                      <div className="vis-hint" style={{ marginTop: 6 }}>
                        ↺ Oggi hai già mangiato {versioni[scelta].ripete.join(', ')}.
                      </div>
                    )}
                    {/* Il piatto è cambiato da solo: si dice perché, se no
                        sembra che la dieta si sia scritta diversa. */}
                    {!fatto && !opzionePer[p.id] && scelta > 0 && versioni[0]?.ripete.length > 0 && (
                      <div className="vis-hint" style={{ marginTop: 6 }}>
                        Oggi hai già mangiato {versioni[0].ripete.join(', ')}: ti propongo un’alternativa.
                      </div>
                    )}

                    {/* Le alternative stanno DENTRO il pasto: si entra, si
                        guardano tutte (quelle fuori schema in fondo) e se ne
                        sceglie una. */}
                    {versioni.length > 1 && !fatto && (
                      <button
                        className="btn btn-ghost btn-sm btn-block pasto-alternative"
                        style={{ marginTop: 8 }}
                        onClick={() => navigate(routes.dietaOggi(p.id))}
                      >
                        {versioni.length - 1 === 1 ? '1 alternativa' : `${versioni.length - 1} alternative`}
                        <IconChevron width={15} height={15} />
                      </button>
                    )}

                    {fatto ? (
                      <button
                        className="btn btn-ghost btn-sm btn-block"
                        style={{ marginTop: 10 }}
                        onClick={() => togliPastoDiario(data, p.id)}
                      >
                        <IconCheck width={15} height={15} /> Mangiato — annulla
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-block"
                        style={{ marginTop: 10 }}
                        disabled={macro.totale.kcal <= 0}
                        onClick={() => {
                          // ⚠️ La versione mangiata si fissa: se no, appena il
                          // latte è nel diario, "non ripetere" farebbe cambiare
                          // piatto alla colazione appena mangiata.
                          scegli(p, p.testo)
                          mangiaPasto({ ...p, testo })
                        }}
                        title={
                          macro.totale.kcal <= 0
                            ? 'Di questo pasto non riconosco nessun alimento con i grammi: aggiungilo a mano'
                            : undefined
                        }
                      >
                        L'ho mangiato
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Cosa è stato cambiato per le tue preferenze */}
          {adattato && adattato.sostituzioni.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
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

          <p className="muted" style={{ fontSize: 12, margin: '16px 2px 0', lineHeight: 1.45 }}>
            I macro degli alimenti sono valori medi da tabella: servono a tenere il conto, non a
            pesare un farmaco.
          </p>

          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-ghost btn-sm grow"
              onClick={() => navigate(routes.dietaPreferenze())}
            >
              Cosa non mangio
            </button>
            {salvata && (
              <button
                className="btn btn-ghost btn-sm grow"
                onClick={() => navigate(routes.dietaEditor(attiva.id))}
              >
                Modifica dieta
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}


