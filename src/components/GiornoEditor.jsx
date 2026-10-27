import { useId, useState } from 'react'
import { schemaPerSettimana } from '../data/model'
import {
  gruppiEsercizio,
  gruppiScritti,
  inLibreria,
  muscoliMancanti,
  nomeInLibreria,
  patchGruppi,
  parametriProposti,
  patchMuscoli,
  schemaIniziale,
  sottogruppiEsercizio,
  TIPI,
  tipoEsercizio,
} from '../lib/eserciziLibreria'
import {
  aTempo,
  faseVuota,
  formatCarico,
  formatSerieRip,
  formattaSecondi,
  MAX_SERIE,
  normalizzaSchema,
  PARAMETRI,
  ripDiTipo,
  testoTempo,
  tipoRip,
} from '../lib/schema'
import { blocchi, eSuperserie, spostaBlocco, spostaNelBlocco, togliEsercizio } from '../lib/superserie'
import SceltaGruppi from './SceltaGruppi'
import { IconCatena, IconCheck, IconChevron, IconPlus, IconSearch, IconTrash } from './icons'
import EsercizioAllegati from './EsercizioAllegati'
import SchemaFasi, { CaricoEditor, NumInput, RecuperoEditor, RipEditor } from './SchemaFasi'
import CercaEsercizio from './CercaEsercizio'
import { diRiscaldamento, RISCALDAMENTO, riscaldamentoInTesta, STRETCHING } from '../lib/preparazione'

// Editor di un singolo giorno (nome/tipo + esercizi con schema per settimana).
// Componente controllato: lo stato vive nel genitore, qui solo la UI + callback.
//
// `soloEsercizi`: nasconde l'intestazione del giorno (nome, tipo, elimina) e
// lascia solo l'elenco esercizi + "Aggiungi esercizio". Usato nella modifica
// in-place dall'anteprima allenamento, dove si toccano solo gli esercizi.
//
// `senzaSettimane` e `senzaAllegati` servono all'allenamento costruito al volo
// (NuovoAllenamentoPage), che non è una scheda ma una cosa sola da fare adesso:
// - le settimane non esistono, quindi "Cambia per settimana" è una domanda
//   senza senso e lo schema è sempre e solo `schemaBase`;
// - ⚠️ gli allegati NO: una foto vuole la scheda in cui sta, perché è la sua
//   visibilità a dire chi può scaricarla (posso_scaricare_media), e qui la
//   scheda-contenitore non esiste ancora. Foto e commenti si aggiungono
//   durante l'allenamento, quando c'è.
//
// GLI ESERCIZI SONO UNA LISTA COMPATTA: una riga per esercizio, col nome e lo
// schema in breve ("4×8 · 1'30""), così la giornata si legge tutta insieme.
// Toccando una riga si apre il FOGLIO dal basso (FoglioEsercizio) con le sole
// cose di tutti i giorni: gruppi e muscoli, carico, serie, ripetizioni,
// recupero. Il resto (fasi, settimane, nota, allegati) sta chiuso
// sotto "Altro".
//
// SUPERSERIE (lib/superserie): un riquadro intorno alle sue righe — ognuno
// col suo schema, la superserie è solo il legame. Tra due blocchi c'è il tasto
// catena per unirli; nel foglio, l'interruttore "Superserie con <quello
// prima>" per scioglierla. Le frecce accanto alla riga muovono il blocco
// INTERO (la superserie resta insieme); dentro la superserie cambiano chi va
// per primo.
//
// `onEsercizi(fn)` riceve una funzione vecchia-lista → nuova-lista: spostare e
// togliere toccano più di un esercizio alla volta (chi resta primo di una
// superserie perde il legame), e farlo con due callback separate vorrebbe dire
// perdere la prima modifica nei genitori che non usano l'aggiornamento
// funzionale. Senza `onEsercizi` le frecce non ci sono e si toglie come prima.
//
// AGGIUNGERE un esercizio passa dalla RICERCA (components/CercaEsercizio):
// `onAddEsercizio(patch)` riceve nome, gruppi e lo schema — dell'ultima volta
// per un esercizio già fatto, se no SCHEMA_INIZIALE: nessuna casella vuota da
// riempire, si ritocca solo quello che è diverso. Il foglio si apre da solo.
// `cercaSubito` apre la ricerca appena si entra, se non c'è ancora nessun
// esercizio.
//
// `conPreparazione`: il riscaldamento/mobilità sopra gli esercizi e lo
// stretching sotto (lib/preparazione), tutti e due facoltativi — chiusi sono
// un tasto "+", e solo chi li vuole li apre. Li vogliono l'editor della scheda
// e "Modifica esercizi" del giorno (che allora deve passare `onPatch`); non
// l'allenamento costruito al volo, che è una cosa da fare adesso.
// ⚠️ Il cardio NON è riscaldamento: è un esercizio (a tempo) della lista, e
// chi lo vuole all'inizio ce lo mette per primo.
export function GiornoEditor({
  giorno,
  numeroSettimane,
  // Non serve a questo componente: lo passa a EsercizioAllegati, perché la
  // regola d'accesso ai file deve sapere in quale scheda sta la foto.
  schedaId = null,
  soloEsercizi = false,
  senzaSettimane = false,
  senzaAllegati = false,
  onPatch,
  onRemove,
  onAddEsercizio,
  onRemoveEsercizio,
  onPatchEsercizio,
  onToggleVaria,
  onPatchSchema,
  onEsercizi = null,
  conPreparazione = false,
  cercaSubito = false,
  // Gli esercizi coi gruppi indovinati da un testo (ImportPage): la riga lo
  // dice, e `onApri(id)` avvisa chi li tiene quando li si apre.
  daControllare = null,
  // Import con l'AI: nome scritto → l'esercizio della libreria che ha
  // riconosciuto (api/riscrivi), da proporre nel foglio.
  nomiLibreria = null,
  onApri = null,
}) {
  const soloRiposo = !soloEsercizi && giorno.tipo === 'rest'
  const lista = giorno.esercizi || []
  // La ricerca aperta: per aggiungere, o per cambiare l'esercizio `id`.
  const [cerca, setCerca] = useState(() => (cercaSubito && !lista.length ? { modo: 'aggiungi' } : null))
  const scelto = ({ nome, gruppi, sottogruppi, schema }) => {
    // I sottogruppi solo se si sanno (libreria o ultima volta): un esercizio
    // nuovo fuori dalla libreria li sceglie chi lo scrive, nel foglio.
    const sotto = Array.isArray(sottogruppi) ? { sottogruppi } : {}
    if (cerca?.modo === 'cambia') {
      // Cambiare esercizio tiene lo schema scritto: si cambia il nome, e i
      // gruppi solo se si sanno.
      onPatchEsercizio(cerca.id, { nome, ...(gruppi.length ? { ...patchGruppi(gruppi), ...sotto } : {}) })
    } else {
      onAddEsercizio({
        nome,
        ...patchGruppi(gruppi),
        ...sotto,
        schemaBase: schema || schemaIniziale({ nome, gruppo: gruppi[0] }),
      })
    }
    setCerca(null)
  }
  const bs = blocchi(lista)

  // Il foglio aperto: l'id dell'esercizio (non l'indice: spostando o unendo
  // l'indice cambia, l'esercizio no). Tolto l'esercizio, il foglio si chiude.
  const [apertoId, setApertoId] = useState(null)
  const iAperto = lista.findIndex((e) => e.id === apertoId)

  // Un esercizio aggiunto (finisce in fondo) apre il suo foglio: lo si è
  // appena scelto, adesso si dicono serie e ripetizioni. ⚠️ Si confronta
  // durante il render, non in un effetto: è il modo di React di adeguare lo
  // stato a una prop che cambia, senza un giro di disegno in più.
  const [lunghezza, setLunghezza] = useState(lista.length)
  if (lista.length !== lunghezza) {
    if (lista.length > lunghezza) setApertoId(lista[lista.length - 1].id)
    setLunghezza(lista.length)
  }

  // Un cardio segnato di riscaldamento va in testa al giorno (lib/preparazione).
  const segnaRiscaldamento = (id, si) => {
    const segna = (e) => {
      if (e.id !== id) return e
      const { riscaldamento: _, ...resto } = e
      return si ? { ...resto, riscaldamento: true, insiemeAlPrecedente: false } : resto
    }
    if (onEsercizi) onEsercizi((l) => riscaldamentoInTesta(l.map(segna)))
    else onPatchEsercizio(id, { riscaldamento: si || undefined, ...(si ? { insiemeAlPrecedente: false } : {}) })
  }

  const togli = (id) => (onEsercizi ? onEsercizi((l) => togliEsercizio(l, id)) : onRemoveEsercizio(id))
  const spostaCard = onEsercizi ? (id, verso) => onEsercizi((l) => spostaBlocco(l, id, verso)) : null
  const spostaDentro = onEsercizi ? (id, verso) => onEsercizi((l) => spostaNelBlocco(l, id, verso)) : null

  const frecce = (id, primo, ultimo, dentro = false) => {
    const sposta = dentro ? spostaDentro : spostaCard
    if (!sposta) return null
    return (
      <>
        <button
          className="icon-btn sposta-btn"
          onClick={() => sposta(id, -1)}
          disabled={primo}
          aria-label={dentro ? 'Prima nella superserie' : 'Sposta prima'}
        >
          <IconChevron width={17} height={17} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button
          className="icon-btn sposta-btn"
          onClick={() => sposta(id, 1)}
          disabled={ultimo}
          aria-label={dentro ? 'Dopo nella superserie' : 'Sposta dopo'}
        >
          <IconChevron width={17} height={17} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </>
    )
  }

  const riga = (i, etichetta) => {
    const e = lista[i]
    const sintesi = muscoliMancanti(e) ? '' : sintesiEsercizio(e, senzaSettimane)
    const vuota = muscoliMancanti(e) ? 'scegli gruppo e muscolo' : 'da compilare'
    const bottone = (
      <button
        className="ex-mini ordine-voce riga-esercizio"
        onClick={() => {
          setApertoId(e.id)
          onApri?.(e.id)
        }}
      >
        <span className="ordine-num">{etichetta}</span>
        <span className="riga-testo">
          <span className="nm">{e.nome?.trim() || 'Senza nome'}</span>
          <span className={'riga-schema' + (sintesi ? '' : ' da-fare')}>{sintesi || vuota}</span>
        </span>
        {sintesi && daControllare?.has(e.id) && <span className="badge badge-warn">da controllare</span>}
      </button>
    )
    // Un cardio si segna di riscaldamento da qui, senza aprirlo: un tasto
    // sotto la riga, giallo quando è acceso. Sotto e non di fianco: accanto
    // alle frecce, su un telefono stretto, al nome non resterebbe spazio.
    if (tipoEsercizio(e) !== 'cardio') return bottone
    const risc = diRiscaldamento(e)
    return (
      <div className="riga-cardio">
        {bottone}
        <button
          type="button"
          className={'chip-riscaldamento' + (risc ? ' on' : '')}
          aria-pressed={risc}
          onClick={() => segnaRiscaldamento(e.id, !risc)}
        >
          {risc ? <IconCheck width={13} height={13} /> : <IconPlus width={13} height={13} />} Riscaldamento
        </button>
      </div>
    )
  }

  // Tra un blocco e il successivo: la catena che li unisce in superserie.
  const unisci = (b) => {
    const id = lista[b.inizio].id
    return (
      <button
        key={'unisci-' + id}
        className="unisci-btn"
        onClick={() => onPatchEsercizio(id, { insiemeAlPrecedente: true })}
        aria-label={`Superserie con ${lista[b.inizio - 1]?.nome?.trim() || 'l’esercizio prima'}`}
      >
        <IconCatena width={13} height={13} /> superserie
      </button>
    )
  }

  const aperto = iAperto !== -1 ? lista[iAperto] : null
  const bloccoAperto = aperto ? bs.findIndex((b) => b.indici.includes(iAperto)) : -1
  const etichettaAperto =
    bloccoAperto === -1
      ? ''
      : eSuperserie(bs[bloccoAperto])
        ? `${bloccoAperto + 1}${String.fromCharCode(65 + bs[bloccoAperto].indici.indexOf(iAperto))}`
        : `${bloccoAperto + 1}`

  return (
    <div className="card" style={{ marginTop: soloEsercizi ? 6 : 14 }}>
      {!soloEsercizi && (
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            value={giorno.nome}
            placeholder="Nome giorno"
            onChange={(e) => onPatch({ nome: e.target.value })}
            style={{ flex: 1 }}
          />
          {onRemove && (
            <button className="icon-btn" onClick={onRemove} aria-label="Elimina giorno">
              <IconTrash />
            </button>
          )}
        </div>
      )}

      {soloRiposo ? (
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>Nota riposo (facoltativa)</label>
          <input
            className="input"
            value={giorno.nota}
            placeholder="Es. bici"
            onChange={(e) => onPatch({ nota: e.target.value })}
          />
        </div>
      ) : (
        <>
          {!soloEsercizi && <div className="divider" />}
          {conPreparazione && (
            <CampoPreparazione
              info={RISCALDAMENTO}
              valore={giorno.riscaldamento}
              onChange={(v) => onPatch({ riscaldamento: v })}
              stile={{ marginBottom: 12 }}
            />
          )}
          {lista.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 0' }}>
              Nessun esercizio. Aggiungine uno qui sotto.
            </p>
          ) : (
            <div className="stack lista-esercizi">
              {bs.map((b, bi) => {
                const primo = bi === 0
                const ultimo = bi === bs.length - 1
                const id = lista[b.inizio].id
                const blocco = eSuperserie(b) ? (
                  <div key={id} className="superserie-blocco stretto">
                    <div className="ordine-riga">
                      <span className="superserie-titolo" style={{ flex: 1, margin: '0 4px' }}>
                        <IconCatena width={14} height={14} /> Superserie
                        <span className="superserie-sub">recupero a fine giro</span>
                      </span>
                      {frecce(id, primo, ultimo)}
                    </div>
                    <div className="stack" style={{ gap: 6, marginTop: 4 }}>
                      {b.indici.map((i, k) => (
                        <div key={lista[i].id} className="ordine-riga">
                          {riga(i, `${bi + 1}${String.fromCharCode(65 + k)}`)}
                          {frecce(lista[i].id, k === 0, k === b.indici.length - 1, true)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={id} className="ordine-riga">
                    {riga(b.inizio, `${bi + 1}`)}
                    {frecce(id, primo, ultimo)}
                  </div>
                )
                // Il cardio di riscaldamento non va in superserie con niente.
                const slegato = diRiscaldamento(lista[b.inizio]) || diRiscaldamento(lista[b.inizio - 1])
                return primo || slegato ? blocco : [unisci(b), blocco]
              })}
            </div>
          )}
          <button className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => setCerca({ modo: 'aggiungi' })}>
            <IconPlus width={16} height={16} /> Aggiungi esercizio
          </button>
          {conPreparazione && (
            <CampoPreparazione
              info={STRETCHING}
              valore={giorno.stretching}
              onChange={(v) => onPatch({ stretching: v })}
              stile={{ marginTop: 12 }}
            />
          )}
        </>
      )}
      {aperto && !cerca && (
        <FoglioEsercizio
          key={aperto.id}
          esercizio={aperto}
          nomeLibreria={nomiLibreria?.[aperto.nome]}
          etichetta={etichettaAperto}
          precedente={iAperto > 0 ? lista[iAperto - 1] : null}
          primo={iAperto === 0}
          schedaId={schedaId}
          numeroSettimane={numeroSettimane}
          senzaSettimane={senzaSettimane}
          senzaAllegati={senzaAllegati}
          onPatch={(p) => onPatchEsercizio(aperto.id, p)}
          onRiscaldamento={(si) => segnaRiscaldamento(aperto.id, si)}
          onRemove={() => togli(aperto.id)}
          onCerca={() => setCerca({ modo: 'cambia', id: aperto.id })}
          onToggleVaria={() => onToggleVaria(aperto.id)}
          onPatchSchema={(weekIdx, p) => onPatchSchema(aperto.id, weekIdx, p)}
          onChiudi={() => setApertoId(null)}
        />
      )}
      {cerca && (
        <CercaEsercizio
          titolo={cerca.modo === 'cambia' ? 'Cambia esercizio' : 'Aggiungi un esercizio'}
          onScegli={scelto}
          onChiudi={() => setCerca(null)}
        />
      )}
    </div>
  )
}

// La riga in breve: "4×8-10 · 80kg · 1'30""; a tempo "10 min · liv 8".
// Con lo schema che cambia per settimana non c'è UNA riga da mostrare, e lo si dice.
function sintesiEsercizio(e, senzaSettimane) {
  if (e.variaPerSettimana && !senzaSettimane) return 'cambia per settimana'
  const s = normalizzaSchema(e.schemaBase)
  if (aTempo(s)) return testoTempo(s)
  return [formatSerieRip(s), formatCarico(s), formattaSecondi(s.recuperoSec)].filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------- Preparazione
// Riscaldamento o stretching del giorno. Vuoto e chiuso è un tasto tratteggiato
// "+ …": facoltativo, e si vede che lo è. Aperto, una casella con una voce per
// riga. "Togli" svuota e richiude: un campo vuoto non lascia traccia nella
// scheda (vuoto = non c'è, lib/preparazione).
function CampoPreparazione({ info, valore, onChange, stile }) {
  const [aperto, setAperto] = useState(false)
  // Un id per giorno: nell'editor della scheda i giorni sono tanti.
  const id = useId()
  if (!aperto && !valore) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-block btn-ghost preparazione-aggiungi"
        style={stile}
        onClick={() => setAperto(true)}
      >
        <IconPlus width={16} height={16} /> {info.aggiungi}
        <span className="faint" style={{ fontWeight: 500 }}>· facoltativo</span>
      </button>
    )
  }
  return (
    <div className="field" style={{ marginBottom: 0, ...stile }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <label htmlFor={id} style={{ margin: 0 }}>
          {info.titolo}
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onChange('')
            setAperto(false)
          }}
        >
          Togli
        </button>
      </div>
      <textarea
        id={id}
        className="textarea"
        rows={3}
        value={valore || ''}
        placeholder={info.esempio}
        // Appena aperto si scrive: si è appena detto di volerlo.
        autoFocus={!valore}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

const TIPI_RIP_FOGLIO = [
  ['num', 'Numero'],
  ['range', 'Da-a'],
  ['max', 'Max'],
  ['serie', 'Una per serie'],
]

// ---------------------------------------------------------------- Contatore
// Un numero grande con − e +, che si può anche scrivere. Vuoto, il primo
// tocco mette `partenza`.
function Contatore({ label, valore, onChange, max = 999, partenza }) {
  const cambia = (d) => onChange(Math.min(max, Math.max(1, valore == null ? partenza : valore + d)))
  return (
    <div className="contatore">
      <button type="button" className="btn" onClick={() => cambia(-1)} aria-label={`${label}: una in meno`}>
        −
      </button>
      <NumInput
        intero
        label={label}
        placeholder="–"
        value={valore}
        onChange={(v) => onChange(v == null ? null : Math.min(max, v))}
      />
      <button type="button" className="btn" onClick={() => cambia(1)} aria-label={`${label}: una in più`}>
        +
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- Foglio
// Il dettaglio di un esercizio, dal basso. In cima nome, cerca e cestino; poi
// gruppi e muscoli, e le cose di tutti i giorni: carico, serie, ripetizioni,
// recupero. "Altro"
// tiene chiuso il resto.
//
// Lo schema "semplice" (una fase, uguale tutte le settimane) si scrive coi
// contatori. Con più fasi o per settimana i contatori non bastano: al loro
// posto c'è SchemaFasi intero, e "Altro" parte aperto.
function FoglioEsercizio({
  esercizio,
  nomeLibreria,
  etichetta,
  precedente,
  primo,
  schedaId,
  numeroSettimane,
  senzaSettimane,
  senzaAllegati,
  onPatch,
  onRiscaldamento,
  onRemove,
  onCerca,
  onToggleVaria,
  onPatchSchema,
  onChiudi,
}) {
  const varia = !senzaSettimane && esercizio.variaPerSettimana
  // Gruppi e muscoli stanno in vista (non sotto "Altro"), per tutti: più
  // gruppi per esercizio (i dip sono petto e tricipiti), e sotto i sottogruppi
  // di gambe, spalle e schiena. Della libreria arrivano già scelti; fuori dalla
  // libreria li deve dire chi l'ha scritto, e il foglio non si chiude finché
  // mancano (muscoliMancanti). I gruppi accesi sono solo quelli SCRITTI, non
  // l'ipotesi dal nome: un gruppo acceso che nel salvataggio non c'è sarebbe
  // una bugia.
  const fuori = !inLibreria(esercizio.nome)
  // Un nome scritto a modo suo ("Push down corda") che somiglia a uno della
  // libreria: lo si propone. Prendendolo, i gruppi diventano i suoi se quelli
  // scritti erano solo l'ipotesi dal nome (quelli scelti a mano restano).
  // Prima quello che ha riconosciuto l'AI all'import, che va oltre le parole
  // ("Lat pull" → "Lat machine avanti").
  const suggerito = fuori ? nomeLibreria || nomeInLibreria(esercizio.nome) : null
  const usaSuggerito = () => {
    const scritti = gruppiScritti(esercizio)
    const ipotesi = gruppiEsercizio({ nome: esercizio.nome })
    const aMano = scritti.length > 0 && scritti.join() !== ipotesi.join()
    onPatch({
      nome: suggerito,
      ...(aMano ? {} : { ...patchGruppi(gruppiEsercizio({ nome: suggerito })), sottogruppi: undefined }),
    })
  }
  const manca = muscoliMancanti(esercizio)
  const muscoli = (
    <div className="stack" style={{ gap: 6 }}>
      <span className={fuori && manca ? 'muscoli-manca' : 'muted'} style={{ fontSize: 13 }}>
        {fuori
          ? manca === 'gruppo'
            ? 'Non è nell’elenco: scegli il gruppo muscolare e il muscolo'
            : manca === 'sottogruppo'
              ? 'Non è nell’elenco: scegli anche il muscolo'
              : 'Gruppi muscolari e muscoli'
          : 'Gruppi muscolari e muscoli'}
        {gruppiScritti(esercizio).length > 1 ? ' · ★ il principale' : ''}
      </span>
      <SceltaGruppi
        compatto
        valori={gruppiScritti(esercizio)}
        onChange={(g) => onPatch(patchMuscoli(esercizio, g, { suggerisci: !fuori }))}
        sottogruppi={fuori ? esercizio.sottogruppi || [] : sottogruppiEsercizio(esercizio)}
        onSottogruppi={(sg) => onPatch({ sottogruppi: sg })}
        mancaSotto={fuori}
      />
    </div>
  )
  const s = normalizzaSchema(esercizio.schemaBase)
  const semplice = !varia && s.fasi.length === 1
  const [altro, setAltro] = useState(!semplice)
  const unito = !primo && !!esercizio.insiemeAlPrecedente

  const fase = s.fasi[0]
  const patchFase = (p) => onPatchSchema(null, { fasi: [{ ...fase, ...p }] })
  const tipo = tipoRip(fase.rip)
  const tipoEs = tipoEsercizio(esercizio)
  // A tempo (116ª): la durata al posto delle ripetizioni, e i parametri della
  // macchina al posto del carico (il carico resta per le tenute zavorrate).
  const conTempo = tipo === 'tempo'
  const cambiaMisura = (m) => {
    if (m === 'tempo') {
      const sec = tipoEs === 'cardio' ? 600 : 30
      patchFase({ rip: { sec }, ...(tipoEs === 'forza' ? {} : { serie: fase.serie ?? 1 }) })
    } else patchFase({ rip: 10 })
  }

  return (
    <div className="modal-backdrop" onClick={manca ? undefined : onChiudi}>
      <div
        className="modal foglio-esercizio"
        role="dialog"
        aria-label={`Esercizio ${etichetta}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ gap: 4 }}>
          <span className="ordine-num">{etichetta}</span>
          <input
            className="input"
            value={esercizio.nome}
            placeholder="Nome esercizio"
            aria-label="Nome esercizio"
            onChange={(e) => onPatch({ nome: e.target.value })}
            style={{ flex: 1, fontWeight: 700 }}
          />
          <button className="icon-btn" onClick={onCerca} aria-label="Cerca un altro esercizio">
            <IconSearch width={18} height={18} />
          </button>
          <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
            <IconTrash width={18} height={18} />
          </button>
        </div>
        {suggerito && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={usaSuggerito}>
            Usa il nome della libreria: «{suggerito}»
          </button>
        )}

        {/* Il tipo: quello della libreria è già scelto (tipoEsercizio);
            scriverlo vale per questo esercizio. */}
        <div className="scelte-righe">
          <Scelte label="Tipo" opzioni={TIPI} valore={tipoEs} onChange={(t) => onPatch({ tipo: t })} />
        </div>

        {/* Il cardio può essere di riscaldamento: va in testa al giorno, e
            nell'allenamento sta nella parte gialla con le voci di testo. */}
        {tipoEs === 'cardio' && (
          <div className="toggle-row">
            <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
              Fa parte del <strong style={{ color: 'var(--text)' }}>riscaldamento</strong>
            </span>
            <button
              className={'switch' + (diRiscaldamento(esercizio) ? ' on' : '')}
              onClick={() => onRiscaldamento(!diRiscaldamento(esercizio))}
              role="switch"
              aria-checked={diRiscaldamento(esercizio)}
              aria-label="Fa parte del riscaldamento"
            >
              <span className="knob" />
            </button>
          </div>
        )}

        {/* Gruppi e muscoli sempre in vista: è da qui che si colorano i
            disegni del corpo. Della libreria arrivano già scelti e si possono
            cambiare; fuori dalla libreria li sceglie chi l'ha scritto. */}
        <div style={{ marginTop: 10 }}>{muscoli}</div>

        {/* La superserie col precedente. Il primo esercizio non ce l'ha: non
            ha nessuno prima a cui legarsi. */}
        {!primo && !diRiscaldamento(esercizio) && (
          <div className="toggle-row">
            <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
              Superserie con{' '}
              <strong style={{ color: 'var(--text)' }}>{precedente?.nome?.trim() || 'l’esercizio prima'}</strong>
            </span>
            <button
              className={'switch' + (unito ? ' on' : '')}
              onClick={() => onPatch({ insiemeAlPrecedente: !unito })}
              role="switch"
              aria-checked={unito}
              aria-label="Superserie con l’esercizio prima"
            >
              <span className="knob" />
            </button>
          </div>
        )}

        {semplice && (
          <div style={{ marginTop: 12 }}>
            <Scelte
              label="Misura"
              opzioni={[
                { id: 'rip', label: 'Ripetizioni' },
                { id: 'tempo', label: 'A tempo' },
              ]}
              valore={conTempo ? 'tempo' : 'rip'}
              onChange={cambiaMisura}
            />
          </div>
        )}

        {semplice && conTempo ? (
          <EditorTempo
            fase={fase}
            esercizio={esercizio}
            conCarico={tipoEs === 'forza'}
            recuperoSec={s.recuperoSec}
            onPatchFase={patchFase}
            onRecupero={(sec) => onPatchSchema(null, { recuperoSec: sec })}
          />
        ) : semplice ? (
          <div className="stack foglio-numeri">
            <div className="foglio-riga">
              <span className="foglio-label">Carico</span>
              <CaricoEditor fase={fase} onPatch={patchFase} />
            </div>

            <div className="foglio-riga">
              <span className="foglio-label">Serie</span>
              <Contatore
                label="Serie"
                valore={fase.serie}
                max={MAX_SERIE}
                partenza={3}
                onChange={(v) => patchFase({ serie: v })}
              />
            </div>

            <div className="foglio-riga">
              <span className="foglio-label">Ripetizioni</span>
              {tipo === 'num' ? (
                <Contatore label="Ripetizioni" valore={fase.rip} partenza={10} onChange={(v) => patchFase({ rip: v })} />
              ) : (
                <RipEditor fase={fase} onPatch={patchFase} />
              )}
            </div>
            {/* Gli altri tipi di ripetizioni, a portata ma piccoli: il numero
                secco è il caso di tutti i giorni. */}
            <div className="tipi-rip" role="group" aria-label="Tipo di ripetizioni">
              {TIPI_RIP_FOGLIO.map(([t, nome]) => (
                <button
                  key={t}
                  type="button"
                  className={'chip chip-scelta' + (tipo === t ? ' on' : '')}
                  aria-pressed={tipo === t}
                  onClick={() => tipo !== t && patchFase({ rip: ripDiTipo(fase, t) })}
                >
                  {nome}
                </button>
              ))}
            </div>

            <RecuperoEditor sec={s.recuperoSec} onChange={(sec) => onPatchSchema(null, { recuperoSec: sec })} />
          </div>
        ) : varia ? (
          Array.from({ length: numeroSettimane }, (_, i) => (
            <SchemaFasi
              key={i}
              settimana={i + 1}
              schema={schemaPerSettimana(esercizio, i + 1)}
              onChange={(p) => onPatchSchema(i, p)}
            />
          ))
        ) : (
          <SchemaFasi schema={esercizio.schemaBase} onChange={(p) => onPatchSchema(null, p)} />
        )}

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-block foglio-altro"
          aria-expanded={altro}
          onClick={() => setAltro(!altro)}
        >
          <IconChevron width={16} height={16} style={{ transform: `rotate(${altro ? -90 : 90}deg)` }} />
          {altro ? 'Meno' : 'Nota e altro'}
        </button>

        {altro && (
          <div className="stack foglio-altro-corpo">
            {semplice && (
              <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <label className="per-lato">
                  <input
                    type="checkbox"
                    checked={!!fase.perLato}
                    onChange={(e) => {
                      // Tolto e non `false`: lo schema resta come l'avrebbe scritto il parser.
                      const { perLato: _, ...resto } = fase
                      onPatchSchema(null, { fasi: [e.target.checked ? { ...resto, perLato: true } : resto] })
                    }}
                  />
                  per lato
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    onPatchSchema(null, {
                      fasi: [...s.fasi, faseVuota({ rip: Array.isArray(fase.rip) ? null : fase.rip })],
                    })
                  }
                >
                  <IconPlus width={14} height={14} /> Poi un’altra fase (3×5 poi 2×2)
                </button>
              </div>
            )}

            <input
              className="input"
              value={esercizio.nota}
              placeholder="Nota (es. lento in discesa, fermo al petto…)"
              aria-label="Nota"
              onChange={(e) => onPatch({ nota: e.target.value })}
            />

            {!senzaSettimane && (
              <div className="toggle-row">
                <span className="muted" style={{ fontSize: 13.5 }}>
                  Cambia per settimana
                </span>
                <button
                  className={'switch' + (esercizio.variaPerSettimana ? ' on' : '')}
                  onClick={onToggleVaria}
                  role="switch"
                  aria-checked={!!esercizio.variaPerSettimana}
                  aria-label="Cambia per settimana"
                >
                  <span className="knob" />
                </button>
              </div>
            )}

            {!senzaAllegati && (
              <EsercizioAllegati
                esercizio={esercizio}
                schedaId={schedaId}
                onChange={(upd) => onPatch({ commenti: upd.commenti, media: upd.media })}
              />
            )}
          </div>
        )}

        <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} disabled={!!manca} onClick={onChiudi}>
          Fatto
        </button>
        {manca && (
          <p className="muscoli-manca" style={{ fontSize: 12.5, textAlign: 'center', margin: '6px 0 0' }}>
            {manca === 'gruppo' ? 'Scegli il gruppo muscolare' : 'Scegli il muscolo'} per chiudere, o elimina l’esercizio.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Scelte
// Una fila di chip, uno acceso: tipo, misura.
function Scelte({ label, opzioni, valore, onChange }) {
  return (
    <div className="scelte" role="group" aria-label={label}>
      <span className="scelte-label">{label}</span>
      {opzioni.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'chip chip-scelta' + (valore === o.id ? ' on' : '')}
          aria-pressed={valore === o.id}
          onClick={() => valore !== o.id && onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- A tempo
// Un esercizio a tempo: serie, durata (minuti e secondi), i parametri della
// macchina proposti per quella macchina (lib/eserciziLibreria,
// parametriProposti) più quelli già scritti, e gli altri dietro "+". Il
// carico solo per la forza (il plank zavorrato), il recupero solo con più
// serie (gli intervalli).
function EditorTempo({ fase, esercizio, conCarico, recuperoSec, onPatchFase, onRecupero }) {
  const sec = fase.rip?.sec ?? null
  const min = sec == null ? null : Math.floor(sec / 60)
  const resto = sec == null ? null : sec % 60
  const durata = (m, r) => onPatchFase({ rip: { sec: (m || 0) * 60 + (r || 0) || null } })
  const par = fase.parametri || {}
  const [aggiunti, setAggiunti] = useState([])
  const visibili = PARAMETRI.filter(
    (p) => parametriProposti(esercizio).includes(p.id) || par[p.id] != null || aggiunti.includes(p.id),
  )
  const altri = PARAMETRI.filter((p) => !visibili.includes(p))
  const patchPar = (id, v) => {
    const { [id]: _, ...senza } = par
    const nuovi = v == null ? senza : { ...senza, [id]: v }
    onPatchFase({ parametri: Object.keys(nuovi).length ? nuovi : undefined })
  }
  return (
    <div className="stack foglio-numeri">
      <div className="foglio-riga">
        <span className="foglio-label">Serie</span>
        <Contatore label="Serie" valore={fase.serie} max={MAX_SERIE} partenza={1} onChange={(v) => onPatchFase({ serie: v })} />
      </div>
      <div className="foglio-riga">
        <span className="foglio-label">Durata</span>
        <span className="durata-editor">
          <NumInput intero label="Minuti" placeholder="0" value={min || null} onChange={(v) => durata(v, resto)} />
          <span className="faint">min</span>
          <NumInput intero label="Secondi" placeholder="0" value={resto || null} onChange={(v) => durata(min, v)} />
          <span className="faint">sec</span>
        </span>
      </div>
      {conCarico && (
        <div className="foglio-riga">
          <span className="foglio-label">Carico</span>
          <CaricoEditor fase={fase} onPatch={onPatchFase} />
        </div>
      )}
      {visibili.map((p) => (
        <div key={p.id} className="foglio-riga">
          <span className="foglio-label">{p.label}</span>
          <span className="durata-editor">
            <NumInput
              intero={p.id === 'zona' || p.id === 'bpm' || p.id === 'distanza'}
              label={p.label}
              placeholder="–"
              value={par[p.id] ?? null}
              onChange={(v) => patchPar(p.id, p.id === 'zona' && v != null ? Math.min(5, Math.max(1, v)) : v)}
            />
            {p.unita && <span className="faint">{p.unita}</span>}
          </span>
        </div>
      ))}
      {altri.length > 0 && (
        <div className="tipi-rip" role="group" aria-label="Altri parametri">
          {altri.map((p) => (
            <button key={p.id} type="button" className="chip chip-scelta" onClick={() => setAggiunti([...aggiunti, p.id])}>
              <IconPlus width={12} height={12} /> {p.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {(fase.serie || 1) > 1 && <RecuperoEditor sec={recuperoSec} onChange={onRecupero} />}
    </div>
  )
}
