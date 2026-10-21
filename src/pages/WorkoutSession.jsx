import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useStore } from '../store/StoreContext'
import { prossimoSet, totaliSessione, numeroSet, serieChiusa, COLORI } from '../lib/session'
import { storicoCarichi, consiglioCarico, coloreUltimaVolta } from '../lib/carico'
import { nuovoEsercizio, nuovoId, schemaPerSettimana } from '../data/model'
import {
  LIBRERIA,
  eserciziPropri,
  gruppiDaNome,
  gruppiEsercizio,
  gruppoDaNome,
  inLibreria,
  muscoliMancanti,
  normalizzaNome,
  patchGruppi,
  patchMuscoli,
  sottogruppiDaNome,
  sottogruppiEsercizio,
} from '../lib/eserciziLibreria'
import SceltaGruppi from '../components/SceltaGruppi'
import { formatSec } from '../lib/parseRecupero'
import { formatSerieRip } from '../lib/format'
import {
  caricoDellaFase,
  conCarico,
  conCaricoFase,
  faseDiSerie,
  fasiDi,
  formattaCarico,
  formattaRip,
  formattaSecondi,
  haFasi,
  normalizzaSchema,
  obiettivoSerie,
  ripNumero,
  schemaVuoto,
} from '../lib/schema'
import { gruppoDi } from '../lib/muscoli'
import { useRestTimer, useWakeLock } from '../hooks/useRestTimer'
import { navigate, routes, esciDallAllenamento } from '../lib/router'
import { blocchi, bloccoDi, eSuperserie, giro, recuperoBlocco, togliEsercizio } from '../lib/superserie'
import {
  IconBack,
  IconBatteria,
  IconCatena,
  IconCheck,
  IconChevron,
  IconClose,
  IconDots,
  IconMusica,
  IconEdit,
  IconClock,
} from '../components/icons'
import ConsiglioCarico from '../components/ConsiglioCarico'
import { CorpoEsercizio } from '../components/CorpoAllenato'
import ModalePeso from '../components/ModalePeso'
import ModaleRipetizioni from '../components/ModaleRipetizioni'
import Riepilogo from '../components/Riepilogo'
import TastoConferma from '../components/TastoConferma'
import TimerRecupero from '../components/TimerRecupero'
import SchemaFasi from '../components/SchemaFasi'
import { RISCALDAMENTO, STRETCHING, vociDi } from '../lib/preparazione'
import { chiaveAllenamento, eliminaFotoDiAllenamento, spostaFotoAllenamento } from '../lib/fotoAllenamento'
import { spostaInterazioni } from '../lib/interazioni'
import { useAccount } from '../store/AccountContext'
import ComandiMusica from '../components/ComandiMusica'
import MediaSessione from '../components/MediaSessione'
import { caricaAllegatiSessione, fileMediaSessione, scartaMedia } from '../lib/mediaSessione'

// Il suggerimento sulla musica si vede una volta sola per telefono. ⚠️ Nel
// browser e non sul profilo: dipende dal telefono (ognuno ha i suoi comandi
// sulla schermata di blocco), e perderlo costa al massimo rivederlo.
const CHIAVE_SUGGERIMENTO_MUSICA = 'palestra:suggerimento-musica:v1'
function suggerimentoMusicaVisto() {
  try {
    return localStorage.getItem(CHIAVE_SUGGERIMENTO_MUSICA) === '1'
  } catch {
    return true
  }
}

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']

// Le ripetizioni previste per la serie `j`, se lo schema le dice con un
// numero ("10", "8-10" → 8, "12/10/8" → quella della serie). null per "max",
// il tempo e simili: lì il numero lo scrive chi si allena.
function ripetizioniPreviste(schema, j) {
  return ripNumero(obiettivoSerie(schema, j).rip)
}

// Cosa c'è dentro un pallino: il numero della serie da fare, la spunta di una
// fatta, e per una serie dura le ripetizioni a cui si è arrivati.
function dentroIlPallino(s, j) {
  if (!s.colore) return j + 1
  if (s.colore === 'rosso' && s.rip != null) return s.rip
  return <IconCheck width={15} height={15} />
}

// Adatta l'array dei set a un nuovo numero di serie mantenendo i colori esistenti.
function riconcilia(sets, n) {
  const out = sets.slice(0, n)
  while (out.length < n) out.push({ colore: null })
  return out
}

const CHIAVE_PIP = 'palestra:pip:v1'

export default function WorkoutSession() {
  const {
    schede,
    diete,
    aggiornaCompletamento,
    eliminaCompletamento,
    salvaAllenamento,
    aggiornaGiorno,
    sessione,
    aggiornaSessione,
    terminaSessione,
    annullaSessione,
    aggiornaSchemaEsercizio,
    aggiornaEsercizio,
    getScheda,
  } = useStore()
  // Come sono andati gli esercizi le volte scorse (pallini + carico): la
  // sessione in corso non è ancora nei completamenti, quindi non si "vede".
  const carichi = useMemo(() => storicoCarichi(schede), [schede])
  const { utenteCorrente } = useAccount()
  const [riep, setRiep] = useState(null)
  // La sessione messa da parte quando si preme "Termina", per poterci rientrare
  // dal riepilogo (vedi `riprendi`). ⚠️ Va tenuta qui perché `terminaSessione`
  // azzera quella dello store: senza una copia, un "Termina" sfiorato per
  // sbaglio costerebbe pallini, tempo e commento, e non si tornerebbe indietro.
  const [sospesa, setSospesa] = useState(null)
  // Le foto e i video fatti durante l'allenamento (lib/mediaSessione): lo
  // sfondo da dare al riepilogo, e un numero che cambia quando gli allegati
  // sono stati caricati (il pannello delle foto li rilegge).
  const [sfondoSessione, setSfondoSessione] = useState(null)
  const [allegatiArrivati, setAllegatiArrivati] = useState(0)
  // Lo SLOT PER IL VIDEO IN PIP (si accende dal menu ⋯): una fascia fissa in
  // fondo, col recupero a sinistra e un riquadro vuoto a destra dove
  // parcheggiare YouTube a misura minima. Di base spento; resta acceso per i
  // prossimi allenamenti. Sta nel telefono: e' del dispositivo, non della persona.
  const [pip, setPip] = useState(() => {
    try {
      return localStorage.getItem(CHIAVE_PIP) === '1'
    } catch {
      return false
    }
  })
  const cambiaPip = (acceso) => {
    try {
      if (acceso) localStorage.setItem(CHIAVE_PIP, '1')
      else localStorage.removeItem(CHIAVE_PIP)
    } catch {
      // navigazione privata: vale per questo allenamento
    }
    setPip(acceso)
  }
  // La chiave dell'allenamento appena ripreso: al prossimo "Termina" cambia
  // (la data è quella nuova), e le foto aggiunte nel riepilogo — con mi piace
  // e commenti, se era già pubblico — lo devono seguire.
  const chiaveRipresa = useRef(null)
  const [now, setNow] = useState(Date.now())
  // ⚠️ Il fuoco è una POSIZIONE nella pista: prima la card del riscaldamento
  // (se il giorno ce l'ha), poi i BLOCCHI degli esercizi, poi la card dello
  // stretching. Un blocco non è un esercizio: una superserie (jumpset) è
  // una card sola con dentro i suoi esercizi, e da solo un esercizio è un
  // blocco di uno (lib/superserie). Blocco `b` = posizione `nRisc + b`.
  // Si parte dal riscaldamento se c'è, non è tutto spuntato e non si è ancora
  // chiusa una serie; se no dal blocco della prossima serie.
  const [posizione, setPosizione] = useState(() => {
    if (!sessione) return 0
    const risc = vociDi(sessione.riscaldamento)
    const fatte = sessione.spunte?.riscaldamento || []
    const daFare = risc.some((_, i) => !fatte.includes(i))
    if (daFare && totaliSessione(sessione).fatti === 0) return 0
    return (risc.length ? 1 : 0) + bloccoDi(sessione.esercizi, prossimoSet(sessione)?.ei ?? 0)
  })
  // ⚠️ La serie selezionata è PER BLOCCO, non una sola per tutta la sessione.
  // Con le card affiancate ognuna mostra le proprie serie, e soprattutto:
  // andare a vedere un altro esercizio e tornare indietro non deve spostare il
  // segno di dove si era rimasti. Chiave = esercizioId del PRIMO del blocco,
  // valore = { id, j }: quale esercizio del blocco e quale serie. Assente = "la
  // prima non ancora fatta nel giro", che è quello che serve la prima volta.
  const [puntatori, setPuntatori] = useState({})
  // Quale esercizio ha il modale aperto (indice), null = nessuno.
  const [editing, setEditing] = useState(null)
  // Il modale "Aggiungi esercizio" è aperto.
  const [aggiungi, setAggiungi] = useState(false)
  // Peso da cambiare: null = modale chiuso, altrimenti { i, valore, fase } —
  // l'indice dell'esercizio, il valore di partenza (già quello consigliato se
  // si arriva dal riquadro del consiglio) e, per un esercizio a fasi ("3×5 poi
  // 2×2", lib/fasi), la fase di cui si cambia il peso; null = tutto l'esercizio.
  const [peso, setPeso] = useState(null)
  // La serie chiusa "dura" di cui si stanno scrivendo le ripetizioni fatte:
  // { bi, i, j } (vedi chiudiSerie).
  const [ripetizioni, setRipetizioni] = useState(null)
  // Riscaldamento e stretching aperti o chiusi: null = decide il momento (il
  // riscaldamento aperto finché non si chiude la prima serie, lo stretching
  // quando le serie sono finite); un tocco sulla testata vince.
  const timer = useRestTimer(sessione?.id)
  const sessioneRef = useRef(sessione)
  sessioneRef.current = sessione
  // La pista orizzontale delle card e l'anti-rimbalzo fra i due sensi di
  // sincronizzazione (indice → scroll, scroll → indice): senza, uno scorrimento
  // "morbido" verso l'esercizio 3 passa davanti al 2, che si prenderebbe il
  // fuoco e lo riporterebbe indietro.
  const pistaRef = useRef(null)
  // { fino, meta }: fino a quando, e verso quale scrollLeft, lo scorrimento è
  // quello partito dal codice. null = nessuno in corso.
  const scrollDaCodice = useRef(null)
  // L'elenco degli esercizi (dal contatore) e il menu ⋯ della barra: aperti o no.
  const [elenco, setElenco] = useState(false)
  const [menu, setMenu] = useState(false)
  const [suggerimentoMusica, setSuggerimentoMusica] = useState(() => !suggerimentoMusicaVisto())
  const chiudiSuggerimentoMusica = () => {
    setSuggerimentoMusica(false)
    try {
      localStorage.setItem(CHIAVE_SUGGERIMENTO_MUSICA, '1')
    } catch {
      // Niente spazio o niente storage: lo si rivedra', pazienza.
    }
  }

  useWakeLock(!riep && !!sessione)

  // Tempo totale. Solo ad allenamento aperto: sul riepilogo il cronometro non
  // c'è, e ridisegnare ogni secondo una pagina con foto e campi è lavoro buttato.
  useEffect(() => {
    if (riep) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [riep])

  // Al cambio di esercizio si imposta il recupero di quell'esercizio. ⚠️ NON si
  // tocca più la serie selezionata: quella è di ogni esercizio e resta dov'era.
  // `imposta` di suo non disturba un recupero già partito (vedi useRestTimer).
  // In una superserie è il recupero di FINE GIRO (recuperoBlocco): fra un
  // esercizio e l'altro del blocco non si recupera.
  useEffect(() => {
    const lista = sessioneRef.current?.esercizi
    const nRisc = vociDi(sessioneRef.current?.riscaldamento).length ? 1 : 0
    const b = lista ? blocchi(lista)[posizione - nRisc] : null
    if (!b) return
    timer.imposta(recuperoBlocco(lista, b) || 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posizione])

  // Indice → scroll: porta in vista la card quando il fuoco cambia da FUORI
  // (‹ Prec / Succ ›, il tocco sul mini-elenco, l'avanzamento automatico a
  // serie finite). Se la card è già al suo posto non si fa niente, se no il
  // gesto dell'utente combatterebbe con questo effetto a ogni scorrimento.
  useEffect(() => {
    const pista = pistaRef.current
    const card = pista?.children[posizione]
    if (!pista || !card) return
    const delta = card.getBoundingClientRect().left - pista.getBoundingClientRect().left
    if (Math.abs(delta) < 4) return
    // ⚠️ A pagina nascosta lo scorrimento "morbido" non parte proprio (il
    // browser sospende le animazioni): si salta di netto, se no si torna e la
    // card resta disallineata dall'esercizio che l'app crede di mostrare.
    const morbido = document.visibilityState === 'visible'
    // ⚠️ La meta è dove la pista può ARRIVARE davvero: l'ultima card non si
    // allinea al bordo (dopo non c'è niente da scorrere), e aspettare un punto
    // irraggiungibile vorrebbe dire ignorare le dita fino al tetto.
    const meta = Math.max(0, Math.min(pista.scrollLeft + delta, pista.scrollWidth - pista.clientWidth))
    // ⚠️ Si aspetta che ARRIVI, non un tempo fisso: con 600ms fissi, su un
    // telefono lento (o affaticato) lo scorrimento morbido partiva dopo la
    // scadenza, la card di prima risultava ancora "la più vicina" e il fuoco
    // tornava indietro — succedeva soprattutto andando all'ultima card. Il
    // tetto dei 2,5s c'è perché uno scorrimento interrotto dal dito non arriva
    // mai alla meta, e non deve bloccare lo scorrimento a mano per sempre.
    scrollDaCodice.current = { fino: Date.now() + (morbido ? 2500 : 150), meta }
    pista.scrollTo({ left: meta, behavior: morbido ? 'smooth' : 'auto' })
  }, [posizione])
  // ⚠️ Niente useAltezzaPista qui: la pagina dell'allenamento è alta quanto lo
  // schermo e la pista prende lo spazio che resta (.app.sessione in index.css).

  // "Termina" premuto per sbaglio, o un esercizio che ci si accorge di aver
  // saltato: si rientra nell'allenamento com'era. Pallini, serie selezionate e
  // esercizio su cui si era stanno nello stato di questa pagina e non sono mai
  // stati buttati, quindi si ritrova tutto al suo posto.
  // ⚠️ Il completamento appena scritto si toglie: l'allenamento NON è finito, e
  // lasciarlo lì lo farebbe vedere in calendario e nello storico mentre lo si
  // sta ancora facendo. Al prossimo "Termina" viene riscritto (stessa coppia
  // settimana+giornoId), quindi non se ne accumulano due.
  // ⚠️ Il commento arriva da chi chiama — lo stato del riepilogo, che ha mezzo
  // secondo di ritardo prima di salvarsi — e torna nella sessione, da dove era
  // partito: leggerlo dal completamento vorrebbe dire perdere l'ultima riga
  // scritta.
  // ⚠️ `inizio` non si tocca: i minuti passati sul riepilogo finiscono
  // nell'allenamento. È tempo speso in palestra, e spostare l'ora di inizio per
  // toglierli vorrebbe dire raccontare una bugia al calendario.
  const riprendi = (nota) => {
    if (!sospesa || !riep) return
    chiaveRipresa.current = chiaveAllenamento(riep)
    eliminaCompletamento(riep.data, riep.schedaId)
    aggiornaSessione({ ...sospesa, nota: nota ?? sospesa.nota ?? '' })
    setSospesa(null)
    setRiep(null)
    setSfondoSessione(null)
  }

  if (riep) {
    // Gli allenamenti "liberi" (consigliati) non hanno una pagina scheda propria
    // da mostrare: al termine si torna al calendario.
    const s = getScheda(riep.schedaId)
    const dest = s?.libera ? routes.inizio() : routes.scheda(riep.schedaId)
    // Solo gli allenamenti LIBERI si possono tenere o buttare: quelli di una
    // scheda vera stanno già nella scheda, e la domanda non avrebbe senso.
    const giornoLibero = s?.libera ? s.giorni.find((g) => g.id === riep.giornoId) || null : null
    // Gli esercizi di oggi COME STANNO NELLA SCHEDA: note e foto si scrivono
    // lì. ⚠️ Gli id li ha la sessione messa da parte, non il riepilogo; e un
    // esercizio aggiunto solo per oggi in scheda non c'è, quindi qui non compare.
    const giornoInScheda = s?.giorni.find((g) => g.id === riep.giornoId)
    const eserciziInScheda = (sospesa?.esercizi || [])
      .map((e) => giornoInScheda?.esercizi.find((x) => x.id === e.esercizioId))
      .filter(Boolean)
    return (
      <Riepilogo
        // Uno per allenamento: scelte e testi non passano al prossimo.
        key={chiaveAllenamento(riep)}
        riep={riep}
        dest={dest}
        giornoLibero={giornoLibero}
        onRiprendi={sospesa ? riprendi : null}
        onSalvaAllenamento={(v) => salvaAllenamento(riep.schedaId, riep.giornoId, v)}
        eserciziInScheda={eserciziInScheda}
        onAllegati={(id, upd) =>
          aggiornaEsercizio(riep.schedaId, riep.giornoId, id, { commenti: upd.commenti, media: upd.media })
        }
        onElimina={() => {
          eliminaCompletamento(riep.data, riep.schedaId)
          // Le sue foto non devono restare nello Storage appese al niente.
          eliminaFotoDiAllenamento(chiaveAllenamento(riep))
          esciDallAllenamento(dest || routes.inizio())
        }}
        ioId={utenteCorrente?.id || null}
        schede={schede}
        diete={diete}
        dati={utenteCorrente?.dati}
        utente={utenteCorrente?.nome || ''}
        onSalvaCommento={(testo) => aggiornaCompletamento(riep.schedaId, riep.data, { nota: testo })}
        onSalvaNome={(nome) => {
          // Il nome di QUESTO allenamento: in calendario e nello storico si
          // legge dal completamento. Il giorno della scheda si rinomina solo se
          // l'allenamento è libero — lì il giorno È questo allenamento (ed è
          // il nome con cui lo ritrovi se l'hai salvato); in una scheda vera
          // il "Giorno A" del PT resta com'è.
          aggiornaCompletamento(riep.schedaId, riep.data, { nomeGiorno: nome })
          if (giornoLibero) aggiornaGiorno(riep.schedaId, riep.giornoId, { nome })
        }}
        onSalvaOrologio={(patch) => aggiornaCompletamento(riep.schedaId, riep.data, patch)}
        onSalvaVisibilita={(v) => aggiornaCompletamento(riep.schedaId, riep.data, { visibilita: v, daSalvare: false })}
        onSalvaLayout={(l) => aggiornaCompletamento(riep.schedaId, riep.data, { recap: l })}
        onSalvaSfondo={(id) => {
          aggiornaCompletamento(riep.schedaId, riep.data, { sfondo: id })
          // Lo sfondo fatto durante l'allenamento è salvato: la copia della
          // sessione non serve più (e "Riprendi" non lo riproporrebbe).
          const s = sospesa?.media?.filter((m) => m.uso === 'sfondo') || []
          if (s.length) {
            scartaMedia(s)
            setSospesa((x) => x && { ...x, media: (x.media || []).filter((m) => m.uso !== 'sfondo') })
          }
        }}
        sfondoIniziale={sfondoSessione}
        ricaricaFoto={allegatiArrivati}
        onSalvaMusica={(m) => aggiornaCompletamento(riep.schedaId, riep.data, { musica: m })}
        onSalvaColori={(c) => aggiornaCompletamento(riep.schedaId, riep.data, { colori: c })}
      />
    )
  }

  if (!sessione) {
    return (
      <div className="app">
        <div className="topbar">
          <h1>Allenamento</h1>
        </div>
        <div className="empty">
          <p>Nessun allenamento in corso.</p>
          <button className="btn btn-accent" onClick={() => navigate(routes.home())}>
            Torna alla home
          </button>
        </div>
      </div>
    )
  }

  const esercizi = sessione.esercizi
  const bs = blocchi(esercizi)
  // Riscaldamento e stretching: UNA card ciascuno, prima e dopo gli esercizi,
  // con le voci da spuntare (CardPreparazione). Congelati nella sessione.
  const vociRisc = vociDi(sessione.riscaldamento)
  const vociStretch = vociDi(sessione.stretching)
  const nRisc = vociRisc.length ? 1 : 0
  const posStretch = nRisc + bs.length
  const nPista = posStretch + (vociStretch.length ? 1 : 0)
  const vaiABlocco = (b) => setPosizione(nRisc + b)
  const spunteR = sessione.spunte?.riscaldamento || []
  const spunteS = sessione.spunte?.stretching || []
  const bloccoFatto = (b) => b.indici.every((i) => esercizi[i].sets.every((x) => x.colore))
  // Il blocco "di riferimento" (recupero, dove aggiungere un esercizio): quello
  // guardato, o il primo durante il riscaldamento e l'ultimo nello stretching.
  const fb = Math.max(0, Math.min(posizione - nRisc, bs.length - 1))
  const bloccoCorr = bs[fb] || null
  // Il recupero che dice la scheda per il blocco su cui si è: è il default del
  // timer (lo rimette l'effetto qui sopra a ogni cambio di esercizio) ed è il
  // valore che nei preimpostati non deve mancare mai.
  const recuperoScheda = bloccoCorr
    ? recuperoBlocco(esercizi, bloccoCorr) || 90
    : 90
  // Esercizio "vivo" nella scheda (per commenti/media, che stanno sulla scheda
  // e non nello snapshot congelato della sessione).
  const schedaCorr = getScheda(sessione.schedaId)
  const giornoInScheda = schedaCorr?.giorni.find((g) => g.id === sessione.giornoId) || null
  const esInSchedaDi = (ex) =>
    giornoInScheda?.esercizi.find((e) => e.id === ex.esercizioId) || null
  // Dove si è rimasti in un blocco: la scelta esplicita se c'è (e se esiste
  // ancora: le serie si possono togliere), se no la prima non ancora fatta nel
  // GIRO — in una superserie A1 B1 A2 B2…, da solo 1 2 3 come sempre.
  const puntatoreDi = (b) => {
    const g = giro(esercizi, b)
    if (!g.length) return null
    const scelta = puntatori[esercizi[b.inizio].esercizioId]
    if (scelta) {
      const i = b.indici.find((k) => esercizi[k].esercizioId === scelta.id)
      if (i !== undefined && scelta.j < esercizi[i].sets.length) return { i, j: scelta.j }
    }
    return g.find((p) => !esercizi[p.i].sets[p.j].colore) || g[g.length - 1]
  }
  const scegli = (b, i, j) =>
    setPuntatori((prev) => ({
      ...prev,
      [esercizi[b.inizio].esercizioId]: { id: esercizi[i].esercizioId, j },
    }))

  // Scroll → indice: la card più vicina al bordo sinistro della pista è quella
  // che si sta guardando. ⚠️ Si ignora mentre è in corso uno scorrimento
  // partito dal codice (vedi scrollDaCodice).
  const alloScroll = () => {
    const pista = pistaRef.current
    if (!pista) return
    const inCorso = scrollDaCodice.current
    if (inCorso) {
      const arrivato = Math.abs(pista.scrollLeft - inCorso.meta) < 2
      if (!arrivato && Date.now() < inCorso.fino) return
      scrollDaCodice.current = null
    }
    const sx = pista.getBoundingClientRect().left
    let vicino = 0
    let minimo = Infinity
    for (let i = 0; i < pista.children.length; i++) {
      const d = Math.abs(pista.children[i].getBoundingClientRect().left - sx)
      if (d < minimo) {
        minimo = d
        vicino = i
      }
    }
    if (vicino !== posizione) setPosizione(vicino)
  }
  // Dove tornare uscendo dalla sessione: la scheda, o il calendario se è un
  // allenamento "libero" (consigliato, senza pagina scheda visibile).
  const tornaDaSessione = schedaCorr?.libera ? routes.inizio() : routes.scheda(sessione.schedaId)
  const { tot, fatti } = totaliSessione(sessione)
  const overall = prossimoSet(sessione)
  // Una voce di riscaldamento o stretching spuntata o tolta: sta nella
  // sessione, così regge una ricarica come i pallini.
  const spunta = (campo, i) =>
    aggiornaSessione((prev) => {
      const prima = prev.spunte?.[campo] || []
      const dopo = prima.includes(i) ? prima.filter((x) => x !== i) : [...prima, i]
      return { ...prev, spunte: { ...prev.spunte, [campo]: dopo } }
    })

  const durataSec = Math.round((now - new Date(sessione.inizio).getTime()) / 1000)

  // Le serie che un tocco sullo sforzo chiude: quella su cui si è. Anche in
  // una SUPERSERIE (dalla 57ª): il pallino si da' a un esercizio per volta,
  // seguendo il giro — il primo, poi il secondo — e finito il giro parte il
  // recupero (completaSet). Prima un tocco colorava tutto il giro uguale.
  const serieDelTocco = (b, p) => [p]

  // Il colore va alle serie del tocco, e poi si va avanti nel GIRO: in una
  // superserie al giro dopo, da solo alla serie dopo.
  const completaSet = (bi, colore, rip = null) => {
    const b = bs[bi]
    const p = b && puntatoreDi(b)
    if (!p) return
    const chiuse = serieDelTocco(b, p)
    const chiusa = (i, j) => chiuse.some((x) => x.i === i && x.j === j)
    // Ripetizioni e kg fatti: quelli del piano, o le ripetizioni scritte su
    // una serie dura (lib/session serieChiusa).
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        !chiuse.some((x) => x.i === i)
          ? e
          : {
              ...e,
              sets: e.sets.map((s, j) =>
                !chiusa(i, j) ? s : serieChiusa(e.schema, j, colore, rip != null ? { rip } : {}),
              ),
            },
      ),
    }))
    const g = giro(esercizi, b)
    const k = g.findIndex((x) => x.i === p.i && x.j === p.j)
    const dopo = g.find((x, n) => n > k && !esercizi[x.i].sets[x.j].colore && !chiusa(x.i, x.j))
    // Il recupero parte da solo (se non lo si è spento dal menu ⋯), ma non
    // dopo l'ultima serie dell'allenamento, quando non c'è più niente da fare.
    const recupera = dopo
      ? dopo.j !== p.j
      : esercizi.some((e, i) => e.sets.some((s, j) => !s.colore && !chiusa(i, j)))
    if (recupera && timer.auto) timer.riparti()
    if (dopo) {
      scegli(b, dopo.i, dopo.j)
      return
    }
    // Finito questo blocco si passa al primo non ancora completo. ⚠️ Solo in
    // avanti, e solo qui: è l'unico punto in cui l'app decide da sola dove
    // guardare, e lo fa quando non c'è più niente da fare dov'eri.
    const nextB = bs.findIndex(
      (x, n) => n > bi && x.indici.some((i) => esercizi[i].sets.some((s) => !s.colore)),
    )
    if (nextB !== -1) vaiABlocco(nextB)
    // Finiti tutti gli esercizi, allo stretching (se c'è).
    else if (!esercizi.some((e, i) => !b.indici.includes(i) && e.sets.some((s) => !s.colore)) && vociStretch.length)
      vaiABlocco(bs.length)
  }

  // I tre tasti dello sforzo. "Duro" (🔴) prima chiede a quante ripetizioni
  // si è arrivati (components/ModaleRipetizioni), e chiude la serie col
  // numero; gli altri la chiudono subito, come sempre.
  // Anche in una superserie: il tocco e' di UN esercizio, le ripetizioni sono
  // le sue.
  const chiudiSerie = (bi, colore) => {
    if (colore !== 'rosso') {
      completaSet(bi, colore)
      return
    }
    const b = bs[bi]
    const p = b && puntatoreDi(b)
    if (p) setRipetizioni({ bi, i: p.i, j: p.j })
  }

  // Ripetizioni o kg di una serie GIÀ chiusa, corretti a mano (SerieFatta).
  // null toglie il dato: "non lo so" è meglio di un numero sbagliato.
  const modificaSerie = (i, j, patch) =>
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, k) =>
        k !== i
          ? e
          : {
              ...e,
              sets: e.sets.map((s, x) => {
                if (x !== j || !s.colore) return s
                const nuova = { ...s, ...patch }
                for (const c of ['rip', 'kg']) if (nuova[c] == null) delete nuova[c]
                return nuova
              }),
            },
      ),
    }))

  // Si disfa l'ultima serie segnata del blocco (in una superserie l'ultimo
  // esercizio segnato del giro).
  const annullaUltima = (bi) => {
    const b = bs[bi]
    if (!b) return
    const last = [...giro(esercizi, b)].reverse().find((x) => esercizi[x.i].sets[x.j].colore)
    if (!last) return
    const via = serieDelTocco(b, last)
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        !via.some((x) => x.i === i)
          ? e
          : { ...e, sets: e.sets.map((s, j) => (via.some((x) => x.i === i && x.j === j) ? { colore: null } : s)) },
      ),
    }))
    scegli(b, via[0].i, last.j)
  }

  // `perScheda`: cosa scrivere nella scheda con "per sempre", se non è lo
  // stesso `nuovo` (il peso di una fase si calcola sullo schema della scheda,
  // che può non essere quello di oggi).
  const applicaSchema = (idx, nuovo, perSempre, perScheda = nuovo) => {
    const ex = esercizi[idx]
    const nuovoNum = numeroSet({ ...ex.schema, ...nuovo })
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== idx ? e : { ...e, schema: { ...e.schema, ...nuovo }, sets: riconcilia(e.sets, nuovoNum) },
      ),
    }))
    if (perSempre) {
      aggiornaSchemaEsercizio(sessione.schedaId, sessione.giornoId, ex.esercizioId, sessione.settimana, perScheda)
    }
    // Meno serie di prima: una selezione rimasta fuori dall'elenco la scarta
    // puntatoreDi da solo, e si riparte dalla prima non fatta.
    // Il recupero: quello del BLOCCO dopo la modifica (in una superserie conta
    // quello di fine giro, non per forza quello dell'esercizio toccato).
    const aggiornati = esercizi.map((e, i) =>
      i !== idx ? e : { ...e, schema: { ...e.schema, ...nuovo } },
    )
    const bMod = blocchi(aggiornati)[bloccoDi(aggiornati, idx)]
    timer.imposta(recuperoBlocco(aggiornati, bMod) || 90)
    setEditing(null)
  }

  // Il modale "Modifica": lo schema come sempre, e in più il nome.
  // ⚠️ Il nome segue la stessa scelta dello schema (solo oggi / per sempre),
  // tranne negli allenamenti LIBERI: lì il giorno È questo allenamento, e
  // senza "Salvalo" e "Rifai" riporterebbero il nome vecchio (come per
  // aggiungiEsercizio). Gruppi e sottogruppi (`muscoli`, solo se toccati nel
  // modale) seguono la stessa regola, e passano davanti a quelli che il nome
  // nuovo si porterebbe dietro.
  const applicaModifica = (idx, { nome, muscoli, ...nuovo }, perSempre) => {
    const ex = esercizi[idx]
    const nuovoNome = (nome || '').trim()
    const rinominato = nuovoNome && nuovoNome !== ex.nome
    const patch = (e) => ({
      ...(rinominato ? rinomina(e, nuovoNome) : {}),
      ...(muscoli ? { ...patchGruppi(muscoli.gruppi), sottogruppi: muscoli.sottogruppi || [] } : {}),
    })
    if (rinominato || muscoli) {
      aggiornaSessione((prev) => ({
        ...prev,
        esercizi: prev.esercizi.map((e, i) => (i !== idx ? e : { ...e, ...patch(e) })),
      }))
      const inScheda = esInSchedaDi(ex)
      if (inScheda && (perSempre || schedaCorr?.libera)) {
        aggiornaEsercizio(sessione.schedaId, sessione.giornoId, inScheda.id, patch(inScheda))
      }
    }
    applicaSchema(idx, nuovo, perSempre)
  }

  // Un esercizio che oggi non si fa. Dalla scheda si toglie solo se lo si
  // chiede (il programma del PT non cambia da solo) — e sempre negli
  // allenamenti liberi, per lo stesso motivo del nome qui sopra.
  // ⚠️ Le serie già segnate se ne vanno con lui: non finiscono nel riepilogo.
  const eliminaEsercizio = (idx, anchInScheda) => {
    const ex = esercizi[idx]
    const lista = togliEsercizio(esercizi, ex.esercizioId, 'esercizioId')
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: togliEsercizio(prev.esercizi, ex.esercizioId, 'esercizioId'),
    }))
    const inScheda = esInSchedaDi(ex)
    if (inScheda && (anchInScheda || schedaCorr?.libera)) {
      aggiornaGiorno(sessione.schedaId, sessione.giornoId, (g) => ({
        esercizi: togliEsercizio(g.esercizi, inScheda.id),
      }))
    }
    // Si resta sull'esercizio che si stava guardando. Se era proprio quello
    // tolto, al suo posto arriva il successivo (o il precedente, se era
    // l'ultimo).
    const restaId = bloccoCorr?.indici
      .map((i) => esercizi[i].esercizioId)
      .find((id) => id !== ex.esercizioId)
    const nuoviBlocchi = blocchi(lista)
    const nuovoFb = restaId
      ? bloccoDi(lista, lista.findIndex((e) => e.esercizioId === restaId))
      : Math.min(fb, nuoviBlocchi.length - 1)
    vaiABlocco(Math.max(0, nuovoFb))
    const b = nuoviBlocchi[Math.max(0, nuovoFb)]
    if (b) timer.imposta(recuperoBlocco(lista, b) || 90)
    setEditing(null)
  }

  // Un esercizio in più, a allenamento in corso: subito DOPO quello su cui si
  // è (o in fondo), e ci si va sopra. Entra nella sessione, quindi nel
  // riepilogo, nel calendario e nello storico.
  // ⚠️ Nella scheda entra solo se lo si chiede (`anchInScheda`): il programma
  // del PT non cambia da solo perché un giorno si è fatto un esercizio in più.
  // Negli allenamenti LIBERI invece entra sempre nel giorno, perché il giorno
  // È questo allenamento: senza, "Salvalo" e "Rifai" lo perderebbero.
  // Stesso id nella sessione e nella scheda: è ciò che fa trovare commenti e
  // foto dell'esercizio (esInSchedaDi).
  // ⚠️ "Dopo quello su cui si è" vuol dire dopo il suo BLOCCO: infilato in
  // mezzo a una superserie la spezzerebbe, e il secondo esercizio finirebbe
  // legato a quello nuovo.
  const aggiungiEsercizio = ({ nome, nota, schema, gruppi, sottogruppi }, { inFondo, anchInScheda }) => {
    const id = nuovoId()
    // Gruppi e sottogruppi scelti nel modale (quelli della libreria, o a mano
    // per un esercizio fuori elenco): come nell'editor della scheda.
    const muscoli = { ...patchGruppi(gruppi?.length ? gruppi : [gruppoDaNome(nome)].filter(Boolean)), sottogruppi: sottogruppi || [] }
    const fineBlocco = bloccoCorr ? bloccoCorr.fine : esercizi.length - 1
    const indice = inFondo ? esercizi.length : fineBlocco + 1
    aggiornaSessione((prev) => {
      const lista = [...prev.esercizi]
      lista.splice(Math.min(indice, lista.length), 0, {
        esercizioId: id,
        nome,
        nota,
        ...muscoli,
        insiemeAlPrecedente: false,
        schema,
        sets: Array.from({ length: numeroSet(schema) }, () => ({ colore: null })),
      })
      return { ...prev, esercizi: lista }
    })
    if (anchInScheda || schedaCorr?.libera) {
      const dopoId = inFondo ? null : esercizi[fineBlocco]?.esercizioId
      aggiornaGiorno(sessione.schedaId, sessione.giornoId, (g) => {
        const lista = [...g.esercizi]
        const k = dopoId ? lista.findIndex((e) => e.id === dopoId) : -1
        lista.splice(k === -1 ? lista.length : k + 1, 0, nuovoEsercizio({ id, nome, nota, ...muscoli, schemaBase: schema }))
        return { esercizi: lista }
      })
    }
    // Il nuovo è un blocco da solo: subito dopo quello corrente, o l'ultimo.
    vaiABlocco(inFondo ? bs.length : fb + 1)
    setAggiungi(false)
  }

  const termina = async () => {
    const inCorso = sessione
    // Le foto e i video fatti durante l'allenamento (lib/mediaSessione). Lo
    // sfondo si legge PRIMA di aprire il riepilogo, che lo prende all'apertura.
    const media = inCorso?.media || []
    const voceSfondo = media.find((m) => m.uso === 'sfondo')
    const sfondo = voceSfondo ? await fileMediaSessione(voceSfondo) : null
    const r = terminaSessione()
    if (!r) return
    if (chiaveRipresa.current) {
      const nuova = chiaveAllenamento(r)
      spostaFotoAllenamento(utenteCorrente?.id, chiaveRipresa.current, nuova)
      spostaInterazioni(chiaveRipresa.current, nuova)
      chiaveRipresa.current = null
    }
    // Gli allegati partono adesso e non si rimettono in sessione: "Riprendi"
    // li ritrova già sull'allenamento (spostaFotoAllenamento). Lo sfondo resta
    // finché il riepilogo non lo salva.
    setSospesa({ ...inCorso, media: media.filter((m) => m.uso === 'sfondo') })
    setSfondoSessione(sfondo)
    setRiep(r)
    caricaAllegatiSessione(media, {
      userId: utenteCorrente?.id,
      chiave: chiaveAllenamento(r),
      onCaricati: () => setAllegatiArrivati((n) => n + 1),
    })
  }

  return (
    <div className={'app sessione' + (pip ? ' con-pip' : '')}>
      <div className="topbar">
        <button
          className="btn btn-ghost btn-sm sessione-esci"
          aria-label="Esci"
          onClick={() => esciDallAllenamento(tornaDaSessione)}
        >
          {/* Solo la freccia: con la fotocamera in testata, la parola "Esci"
              lasciava al nome del giorno 52px a 412 e niente a 360. */}
          <IconBack width={18} height={18} />
        </button>
        {/* Il nome del giorno apre l'elenco di tutto l'allenamento (prima lo
            apriva la riga "Esercizio 1 di 6" sopra le card, tolta per fare
            stare la pagina nello schermo). */}
        <button
          type="button"
          className="sessione-testa"
          aria-haspopup="dialog"
          aria-label={`${sessione.nomeGiorno}: elenco dell'allenamento`}
          onClick={() => setElenco(true)}
        >
          <span className="sessione-testa-nome">
            {sessione.nomeGiorno}
            <IconChevron width={14} height={14} className="sessione-testa-giu" aria-hidden="true" />
          </span>
          <span className="sessione-testa-sub">
            {formatSec(durataSec)} · {fatti} di {tot} serie
          </span>
        </button>
        <MediaSessione
          media={sessione.media}
          onCambia={(fn) => aggiornaSessione((s) => s && { ...s, media: fn(s.media || []) })}
        />
        {/* Nell'app Spotify si apre toccando il mini player (ComandiMusica). */}
        {!Capacitor.isPluginAvailable('Musica') && (
          <a className="icon-btn" href="spotify:" aria-label="Apri Spotify">
            <IconMusica />
          </a>
        )}
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Altre azioni">
          <IconDots />
        </button>
        <button className="btn btn-sm" onClick={termina}>
          Termina
        </button>
      </div>
      {!pip && (
        <div className="card timer-grande">
          <TimerRecupero timer={timer} recuperoScheda={recuperoScheda} />
        </div>
      )}
      {suggerimentoMusica && (
        <div className="card suggerimento-musica" role="note">
          <span>
            Per la musica non serve uscire: play, pausa e brano successivo sono nella schermata di
            blocco e nella tendina delle notifiche.
          </span>
          <button className="icon-btn" onClick={chiudiSuggerimentoMusica} aria-label="Chiudi il suggerimento">
            <IconClose width={18} height={18} />
          </button>
        </div>
      )}
      {/* LA BARRA DELL'ALLENAMENTO: un trattino per ogni voce di
          riscaldamento, ogni esercizio, ogni voce di stretching, pieni quando
          sono fatti; la parte dove si è ha il contorno. Dice a colpo d'occhio
          che il riscaldamento c'è anche quando si guarda un esercizio (la sua
          card sta fuori schermo a sinistra) e quanto manca. Sta fra le frecce
          ‹ ›, al posto della scritta "Esercizio 1 di 6". Il tocco porta a
          quella parte; per chi non vede ci sono frecce ed elenco. */}
      <div className="sessione-nav">
        <button
          className="icon-btn"
          disabled={posizione === 0}
          onClick={() => setPosizione(posizione - 1)}
          aria-label="Precedente"
        >
          <IconBack />
        </button>
        <div className="barra-allenamento" aria-hidden="true">
          {nRisc > 0 && (
            <button
              tabIndex={-1}
              className={'barra-parte riscaldamento' + (posizione === 0 ? ' qui' : '')}
              style={{ '--n': vociRisc.length }}
              onClick={() => setPosizione(0)}
            >
              <span className="barra-trattini">
                {vociRisc.map((_, k) => (
                  <i key={k} className={spunteR.includes(k) ? 'fatto' : ''} />
                ))}
              </span>
              <span className="barra-nome">Riscaldamento</span>
            </button>
          )}
          <span className="barra-parte esercizi" style={{ '--n': bs.length }}>
            <span className="barra-trattini">
              {bs.map((b, bi) => (
                <button
                  key={bi}
                  tabIndex={-1}
                  className={
                    'barra-pezzo' + (bloccoFatto(b) ? ' fatto' : '') + (posizione === nRisc + bi ? ' qui' : '')
                  }
                  onClick={() => vaiABlocco(bi)}
                >
                  <i />
                </button>
              ))}
            </span>
            <span className="barra-nome">Esercizi</span>
          </span>
          {vociStretch.length > 0 && (
            <button
              tabIndex={-1}
              className={'barra-parte stretching' + (posizione === posStretch ? ' qui' : '')}
              style={{ '--n': vociStretch.length }}
              onClick={() => setPosizione(posStretch)}
            >
              <span className="barra-trattini">
                {vociStretch.map((_, k) => (
                  <i key={k} className={spunteS.includes(k) ? 'fatto' : ''} />
                ))}
              </span>
              <span className="barra-nome">Stretching</span>
            </button>
          )}
        </div>
        <button
          className="icon-btn"
          disabled={posizione >= nPista - 1}
          onClick={() => setPosizione(posizione + 1)}
          aria-label="Successivo"
        >
          <IconBack style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>
      <div className="pista-esercizi" ref={pistaRef} onScroll={alloScroll}>
        {nRisc > 0 && (
          <CardPreparazione
            info={RISCALDAMENTO}
            voci={vociRisc}
            spuntate={spunteR}
            attiva={posizione === 0}
            onSpunta={(k) => spunta('riscaldamento', k)}
            avanti="Inizia gli esercizi"
            onAvanti={() => vaiABlocco(0)}
          />
        )}
        {bs.map((b, bi) => {
          const p = puntatoreDi(b) || { i: b.inizio, j: 0 }
          if (!eSuperserie(b)) {
            const i = b.inizio
            const ex = esercizi[i]
            return (
              <CardEsercizio
                key={ex.esercizioId}
                ex={ex}
                attiva={posizione === nRisc + bi}
                sel={p.j}
                carichi={carichi}
                onSerie={(j) => scegli(b, i, j)}
                onColore={(c) => chiudiSerie(bi, c)}
                onAnnullaUltima={() => annullaUltima(bi)}
                onModifica={() => setEditing(i)}
                onPeso={(valore, fase = null) => setPeso({ i, valore, fase })}
                onModificaSerie={(j, patch) => modificaSerie(i, j, patch)}
              />
            )
          }
          return (
            <CardSuperserie
              key={esercizi[b.inizio].esercizioId}
              esercizi={esercizi}
              blocco={b}
              attiva={posizione === nRisc + bi}
              puntatore={p}
              recupero={formattaSecondi(recuperoBlocco(esercizi, b))}
              carichi={carichi}
              onScegli={(i, j) => scegli(b, i, j)}
              onColore={(c) => chiudiSerie(bi, c)}
              onAnnullaUltima={() => annullaUltima(bi)}
              onModifica={(i) => setEditing(i)}
              onPeso={(i, valore, fase = null) => setPeso({ i, valore, fase })}
              onModificaSerie={modificaSerie}
            />
          )
        })}
        {vociStretch.length > 0 && (
          <CardPreparazione
            info={STRETCHING}
            voci={vociStretch}
            spuntate={spunteS}
            attiva={posizione === posStretch}
            onSpunta={(k) => spunta('stretching', k)}
          />
        )}
      </div>
      {!overall && (
        <button className="btn btn-good btn-lg btn-block" style={{ marginTop: 12 }} onClick={termina}>
          <IconCheck width={20} height={20} />
          Termina e vedi riepilogo
        </button>
      )}
      {/* L'elenco degli esercizi: tocca per andarci. In fondo, aggiungerne uno. */}
      {elenco && (
        <div className="modal-backdrop" onClick={() => setElenco(false)}>
          <div className="modal" role="dialog" aria-label="Esercizi" onClick={(e) => e.stopPropagation()}>
            <h3>L'allenamento</h3>
            <div className="stack" style={{ gap: 8 }}>
              {nRisc > 0 && <div className="elenco-sezione">{RISCALDAMENTO.titolo}</div>}
              {vociRisc.map((voce, k) => (
                <RigaPreparazione
                  key={'r' + k}
                  voce={voce}
                  fatta={spunteR.includes(k)}
                  attiva={posizione === 0}
                  onVai={() => {
                    setPosizione(0)
                    setElenco(false)
                  }}
                />
              ))}
              {nPista > bs.length && <div className="elenco-sezione">Esercizi</div>}
              {bs.map((b, bi) => {
                const riga = (i) => {
                  const e = esercizi[i]
                  const done = e.sets.every((s) => s.colore)
                  const gr = gruppoDi(e.gruppo)
                  return (
                    <button
                      key={e.esercizioId}
                      className={
                        'ex-mini' + (posizione === nRisc + bi ? ' active' : done ? ' done' : '') + (gr ? ' has-gruppo' : '')
                      }
                      style={gr ? { '--g': gr.colore } : undefined}
                      onClick={() => {
                        vaiABlocco(bi)
                        setElenco(false)
                      }}
                    >
                      <span className="nm">{e.nome}</span>
                      <span className="dots-mini">
                        {e.sets.map((s, j) => (
                          <span key={j} className={'dot-mini' + (s.colore ? ' ' + s.colore : '')} />
                        ))}
                      </span>
                    </button>
                  )
                }
                if (!eSuperserie(b)) return riga(b.inizio)
                return (
                  <div key={esercizi[b.inizio].esercizioId} className="superserie-blocco stretto">
                    <div className="superserie-titolo">
                      <IconCatena width={14} height={14} /> Superserie
                    </div>
                    <div className="stack" style={{ gap: 6 }}>{b.indici.map(riga)}</div>
                  </div>
                )
              })}
              {vociStretch.length > 0 && <div className="elenco-sezione">{STRETCHING.titolo}</div>}
              {vociStretch.map((voce, k) => (
                <RigaPreparazione
                  key={'s' + k}
                  voce={voce}
                  fatta={spunteS.includes(k)}
                  attiva={posizione === posStretch}
                  onVai={() => {
                    setPosizione(posStretch)
                    setElenco(false)
                  }}
                />
              ))}
            </div>
            <button
              className="btn btn-block"
              style={{ marginTop: 12 }}
              onClick={() => {
                setElenco(false)
                setAggiungi(true)
              }}
            >
              + Aggiungi un esercizio
            </button>
          </div>
        </div>
      )}

      {/* Il mini player, in fondo come in Spotify: solo nell'app, e solo con la musica. */}
      <ComandiMusica />

      {/* La fascia del PiP: il video lo mette il telefono in un punto fisso
          dello schermo, quindi lo slot non scorre con la pagina. A sinistra il
          recupero, che qui sostituisce la card grande in cima: la pagina
          comincia dall'esercizio. */}
      {pip && (
        <div className="pip-fascia">
          <TimerRecupero timer={timer} recuperoScheda={recuperoScheda} />
          <div className="pip-slot" aria-hidden="true">
            Video
          </div>
        </div>
      )}

      {/* Il menu ⋯: le cose che si fanno di rado, e una che non si torna indietro. */}
      {menu && (
        <div className="modal-backdrop" onClick={() => setMenu(false)}>
          <div className="modal" role="dialog" aria-label="Altre azioni" onClick={(e) => e.stopPropagation()}>
            <div className="toggle-row" style={{ marginBottom: 12 }}>
              <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
                Fai partire il recupero da solo quando segni una serie
              </span>
              <button
                className={'switch' + (timer.auto ? ' on' : '')}
                onClick={() => timer.impostaAuto(!timer.auto)}
                role="switch"
                aria-checked={timer.auto}
                aria-label="Recupero automatico"
              >
                <span className="knob" />
              </button>
            </div>
            <div className="toggle-row" style={{ marginBottom: 12 }}>
              <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
                Lascia uno spazio per il video in PiP (YouTube) in basso
              </span>
              <button
                className={'switch' + (pip ? ' on' : '')}
                onClick={() => cambiaPip(!pip)}
                role="switch"
                aria-checked={pip}
                aria-label="Spazio per il video in PiP"
              >
                <span className="knob" />
              </button>
            </div>
            <TastoConferma
              etichetta="Annulla allenamento"
              domanda="Annullare l’allenamento? I dati di questa sessione andranno persi."
              si="Sì, annulla"
              no="No, continuo"
              onConferma={() => {
                // Le foto e i video presi durante (lib/mediaSessione) se ne vanno con lei.
                scartaMedia(sessione.media)
                annullaSessione()
                esciDallAllenamento(tornaDaSessione)
              }}
            />
            <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMenu(false)}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ I modali stanno FUORI dalla pista e sanno su quale esercizio
          lavorano (l'indice): dentro una card che si scorre di lato un modale
          si porterebbe dietro lo scorrimento. */}
      {editing !== null && esercizi[editing] && (
        <ModaleModifica
          nome={esercizi[editing].nome}
          esercizio={esercizi[editing]}
          schema={esercizi[editing].schema}
          settimana={sessione.settimana}
          // Un esercizio aggiunto solo per oggi nella scheda non c'è: "per
          // sempre" non avrebbe dove scrivere, e non farebbe niente senza dirlo.
          permettiPerSempre={!!esInSchedaDi(esercizi[editing])}
          // Togliere l'ultimo rimasto lascerebbe un allenamento vuoto: per
          // quello c'è "Annulla allenamento".
          puoiEliminare={esercizi.length > 1}
          serieFatte={esercizi[editing].sets.filter((s) => s.colore).length}
          // La domanda "anche dalla scheda?" ha senso solo in una scheda vera
          // e per un esercizio che nella scheda c'è.
          chiediScheda={!schedaCorr?.libera && !!esInSchedaDi(esercizi[editing])}
          nomeGiorno={sessione.nomeGiorno}
          onChiudi={() => setEditing(null)}
          onSalva={(nuovo, perSempre) => applicaModifica(editing, nuovo, perSempre)}
          onElimina={(anchInScheda) => eliminaEsercizio(editing, anchInScheda)}
        />
      )}

      {aggiungi && (
        <ModaleAggiungi
          dopoNome={bloccoCorr ? esercizi[bloccoCorr.fine]?.nome || '' : ''}
          libera={!!schedaCorr?.libera}
          nomeGiorno={sessione.nomeGiorno}
          onChiudi={() => setAggiungi(false)}
          onAggiungi={aggiungiEsercizio}
        />
      )}

      {ripetizioni !== null && esercizi[ripetizioni.i] && (() => {
        const ex = esercizi[ripetizioni.i]
        const s = ex.sets[ripetizioni.j]
        return (
          <ModaleRipetizioni
            nome={ex.nome}
            serie={ripetizioni.j + 1}
            previste={ripetizioniPreviste(ex.schema, ripetizioni.j)}
            // Una serie già chiusa dura e riaperta: si riparte da quello scritto.
            iniziale={s?.colore === 'rosso' ? (s.rip ?? null) : null}
            onChiudi={() => setRipetizioni(null)}
            onSalva={(rip) => {
              completaSet(ripetizioni.bi, 'rosso', rip)
              setRipetizioni(null)
            }}
          />
        )
      })()}

      {peso !== null && esercizi[peso.i] && (() => {
        const ex = esercizi[peso.i]
        const inScheda = esInSchedaDi(ex)
        const schemaScheda = inScheda ? schemaPerSettimana(inScheda, sessione.settimana) : null
        // Con le fasi il peso è quello della fase su cui si è: il 2×2 pesante
        // di un "3×5 poi 2×2" non è il peso del 3×5.
        const f = peso.fase
        const fase = f != null ? fasiDi(ex.schema)[f] : null
        return (
          <ModalePeso
            nome={fase ? `${ex.nome} · ${formatSerieRip({ fasi: [fase] })}` : ex.nome}
            iniziale={peso.valore}
            caricoAttuale={caricoDellaFase(ex.schema, f ?? 0)}
            caricoScheda={schemaScheda ? caricoDellaFase(schemaScheda, f ?? 0) : null}
            settimana={sessione.settimana}
            // Negli allenamenti liberi la scheda è nascosta e usa e getta:
            // "per sempre" non avrebbe un posto dove valere.
            permettiPerSempre={!schedaCorr?.libera && !!inScheda}
            suggerimento={
              consiglioCarico(ex.nome, carichi, {
                fase: f,
                schemaOggi: ex.schema,
                caricoAttuale: caricoDellaFase(ex.schema, f ?? 0),
              })?.testo || ''
            }
            onChiudi={() => setPeso(null)}
            onSalva={(carico, perSempre) => {
              if (f == null) {
                applicaSchema(
                  peso.i,
                  conCarico(ex.schema, carico),
                  perSempre,
                  conCarico(schemaScheda || ex.schema, carico),
                )
              } else {
                applicaSchema(
                  peso.i,
                  conCaricoFase(ex.schema, f, carico),
                  perSempre,
                  conCaricoFase(schemaScheda || ex.schema, f, carico),
                )
              }
              setPeso(null)
            }}
          />
        )
      })()}
    </div>
  )
}

// IL GRADINO di una card dell'allenamento: 0 = com'e', 1-4 = le classi
// stretta-1..4 (index.css), cumulative. Il piu' basso a cui la card sta
// senza scorrere: dopo ogni disegno, prima che si veda (useLayoutEffect), se
// la card scorre si scende di uno. Lo decide il contenuto vero — note,
// consigli, fasi, nomi lunghi — che nessuna soglia d'altezza indovina.
// Quando cambia l'altezza della card (PiP acceso, telefono girato) o cosa
// mostra (`chiave`: un'altra serie, un altro giro) si riparte da 0.
const GRADINI = 4
function useGradino(chiave) {
  const ref = useRef(null)
  const [gradino, setGradino] = useState(0)
  const [chiavePrima, setChiavePrima] = useState(chiave)
  if (chiave !== chiavePrima) {
    setChiavePrima(chiave)
    setGradino(0)
  }
  // Senza dipendenze apposta: va misurato dopo OGNI disegno (il contenuto
  // cambia per mille motivi). Non gira all'infinito: si ferma a GRADINI.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current
    if (el && gradino < GRADINI && el.scrollHeight > el.clientHeight + 1) setGradino(gradino + 1)
  })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let altezza = el.clientHeight
    const ro = new ResizeObserver(() => {
      if (el.clientHeight === altezza) return
      altezza = el.clientHeight
      setGradino(0)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const classi = Array.from({ length: gradino }, (_, k) => ` stretta-${k + 1}`).join('')
  return [ref, classi]
}

// I tre tasti dello sforzo, subito sotto i pallini: la serie si segna dove la
// si guarda. Il recupero in cima parte da solo al tocco (completaSet).
// Le tacche della batteria per ogni colore: quanto era rimasto (icons).
const TACCHE = { verde: 3, giallo: 1, rosso: 0 }
// Cosa vuol dire ogni colore, scritto accanto al tasto quando i tasti sono a
// righe (`righe`): la card di un esercizio solo ha lo spazio per dirlo.
const COSA = { verde: 'avevo margine', giallo: 'giusto così', rosso: 'al limite' }

// `ultima`: il colore di questa serie l'ultima volta (lib/carico), segnato sul
// tasto di quel colore.
function SforzoNellaCard({ onColore, onAnnullaUltima, righe = false, ultima = null, titolo = 'Com’è andata?' }) {
  // `sforzo-fondo`: in fondo alla card, sempre nello stesso punto dello
  // schermo (la card è alta quanto lo spazio che resta, .app.sessione).
  return (
    <div className="sforzo-fondo">
      {/* "Annulla l'ultima serie" sta sulla riga del titolo, a destra: sotto
          i tasti era una riga intera, e la card deve stare nello schermo. */}
      <div className="sforzo-testa">
        <span className="section-title">{titolo}</span>
        <button className="btn-link sforzo-annulla" onClick={onAnnullaUltima}>
          Annulla l’ultima
        </button>
      </div>
      <div className={'effort-buttons' + (righe ? ' righe' : '')}>
        {ORDINE_COLORI.map((c) => (
          <button key={c} className={'effort ' + c + (c === ultima ? ' ultima' : '')} onClick={() => onColore(c)}>
            <IconBatteria tacche={TACCHE[c]} width={righe ? 34 : 28} height={righe ? 34 : 28} aria-hidden="true" />
            {COLORI[c].label}
            {c === ultima && <span className="effort-ultima">ultima volta</span>}
            {righe && <span className="effort-cosa">{COSA[c]}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Card esercizio
// Una card per esercizio: nome, schema, consiglio sul carico, i pallini delle
// serie e i tre tasti dello sforzo. Sono tutte montate insieme nella pista
// orizzontale, quindi qui dentro non si tiene stato: quello che conta (i colori
// delle serie) sta nella sessione, e la serie selezionata la passa il genitore.
//
// ⚠️ Commenti e foto si montano SOLO sulla card attiva. Ogni miniatura va a
// prendersi il file (IndexedDB o Storage): montarle tutte vorrebbe dire, aprendo
// l'allenamento, scaricare i video di otto esercizi che magari non si guardano.
// Il peso da mostrare (e da cambiare) per la serie `j`. Con le fasi ("3×5
// poi 2×2", lib/fasi) è quello della SUA fase, e sotto il numero della serie
// si dice cosa fare in quella serie: dalla quarta il 2×2 si fa più pesante, e
// in palestra non si va a rileggere la scheda. Senza fasi, tutto come prima.
function pesoDellaSerie(schema, j) {
  if (!haFasi(schema)) return { fase: null, carico: caricoDellaFase(schema, 0), obiettivo: null }
  const fase = faseDiSerie(schema, j)
  const { rip, carico: c } = obiettivoSerie(schema, j)
  const ripetizioni = formattaRip(rip, fasiDi(schema)[fase]?.perLato)
  const carico = formattaCarico(c)
  const obiettivo = (
    <div className="obiettivo-serie">
      Fase {fase + 1} di {fasiDi(schema).length}
      {ripetizioni && (
        <>
          {' · '}
          <strong>{ripetizioni} rip</strong>
        </>
      )}
      {carico && (
        <>
          {' a '}
          <strong>{carico}</strong>
        </>
      )}
    </div>
  )
  return { fase, carico: caricoDellaFase(schema, fase), obiettivo }
}

// IL RISCALDAMENTO (o lo STRETCHING) come card della pista: la prima prima
// degli esercizi, l'altra in fondo. Non sono esercizi (lib/preparazione):
// niente serie, sforzo o recupero, solo le voci da spuntare (sessione.spunte,
// come prima). Una card sola e non una per voce: sono cose da un minuto, e
// scorrere tre card per tre rotazioni di spalle era macchinoso. `avanti` = il
// tasto in fondo ("Inizia gli esercizi"), che si puo' premere anche senza aver
// spuntato tutto.
function CardPreparazione({ info, voci, spuntate, attiva, onSpunta, avanti, onAvanti }) {
  const fatte = voci.filter((_, k) => spuntate.includes(k)).length
  return (
    <div className={'card card-preparazione' + (attiva ? '' : ' non-attiva')} inert={!attiva}>
      {/* Testata come quella degli esercizi (nome grande), cosi' la card non
          sembra un elenco lasciato a meta'; sotto, quanto manca. */}
      <div style={{ fontSize: 20, fontWeight: 800 }}>{info.titolo}</div>
      <div className="card-preparazione-conto">
        {fatte === voci.length ? 'Fatto' : `${fatte} di ${voci.length} fatte`}
        <progress max={voci.length} value={fatte} />
      </div>
      <ul className="card-preparazione-voci serie-ora">
        {voci.map((v, k) => (
          <li key={k}>
            <button
              type="button"
              className={'card-preparazione-voce' + (spuntate.includes(k) ? ' fatta' : '')}
              onClick={() => onSpunta(k)}
              aria-pressed={spuntate.includes(k)}
            >
              <span className="card-preparazione-casella">
                {spuntate.includes(k) && <IconCheck width={16} height={16} />}
              </span>
              <span>{v}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* Nello spazio fra le voci e il tasto, quanto ce n'e'. */}
      {info.sfondo && <OminiInRotazione immagini={info.sfondo} />}
      {avanti && (
        <button className="btn btn-good btn-lg btn-block sforzo-fondo" onClick={onAvanti}>
          {avanti} →
        </button>
      )}
    </div>
  )
}

// Gli esercizi disegnati della card del riscaldamento (o dello stretching): uno
// alla volta, ogni qualche secondo il successivo in dissolvenza. Sono tutti
// nella pagina e si accende solo quello di turno, cosi' il cambio non aspetta
// il caricamento. Chi ha chiesto meno animazioni ne vede uno, fermo.
function OminiInRotazione({ immagini }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setK((x) => (x + 1) % immagini.length), 4500)
    return () => clearInterval(id)
  }, [immagini.length])
  return (
    <div className="card-preparazione-omino" aria-hidden="true">
      {immagini.map((src, i) => (
        <img key={src} src={src} alt="" className={i === k ? 'qui' : ''} />
      ))}
    </div>
  )
}

// Una voce di riscaldamento o stretching nell'elenco "tutti gli esercizi".
function RigaPreparazione({ voce, fatta, attiva, onVai }) {
  return (
    <button className={'ex-mini' + (attiva ? ' active' : fatta ? ' done' : '')} onClick={onVai}>
      <span className="nm">{voce}</span>
      {fatta && <IconCheck width={16} height={16} className="faint" aria-label="fatta" />}
    </button>
  )
}

// Cosa fare nella serie `j`: "5 rip × 40 kg", coi numeri grandi e le unità
// piccole. Il peso si tocca (ModalePeso: solo oggi o anche in scheda); senza
// peso c'e' "Imposta peso". Per una scheda a fasi sono le ripetizioni e il
// peso della fase di quella serie (lib/schema obiettivoSerie).
function ObiettivoSerie({ schema, j, carico, fase, onPeso }) {
  const o = obiettivoSerie(schema, j)
  const rip = formattaRip(o.rip, fasiDi(schema)[fase ?? 0]?.perLato)
  const peso = formattaCarico(o.carico) || formattaCarico(carico)
  // "40kg" → 40 grande e kg piccolo; il resto ("70%", "2×20kg") com'e'.
  const kg = /^(.*\d)kg$/.exec(peso)
  return (
    <div className="serie-ora-obiettivo">
      {rip && (
        <>
          <span>{rip}</span>
          {/^[\d–-]+$/.test(rip) && <small> rip</small>}
          <span className="serie-ora-per">×</span>
        </>
      )}
      <button
        className={'serie-ora-peso' + (peso ? '' : ' vuoto')}
        onClick={() => onPeso(carico, fase)}
        aria-label={fase == null ? 'Cambia il peso' : `Cambia il peso della fase ${fase + 1}`}
      >
        {kg ? (
          <>
            {kg[1]}
            <small> kg</small>
          </>
        ) : (
          peso || 'Imposta peso'
        )}
      </button>
    </div>
  )
}

function CardEsercizio({
  ex,
  attiva,
  sel,
  carichi,
  onSerie,
  onColore,
  onAnnullaUltima,
  onModifica,
  onPeso,
  onModificaSerie,
}) {
  const gruppo = gruppoDi(ex.gruppo)
  const { fase, carico } = pesoDellaSerie(ex.schema, sel)
  const [ref, stretta] = useGradino(sel)
  return (
    <div
      ref={ref}
      className={'card' + (attiva ? '' : ' non-attiva') + stretta}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
      // ⚠️ `inert` e non `aria-hidden`: le card vicine hanno dei tasti veri, e
      // durante lo scorrimento se ne intravede un pezzo. Inert le toglie
      // insieme dal tocco, dal tab e da chi legge lo schermo — aria-hidden da
      // solo lascerebbe dei tasti premibili ma invisibili a chi non vede.
      inert={!attiva}
    >
      {/* Il modellino coi muscoli che l'esercizio lavora, grande e in
          trasparenza DIETRO alla card (components/CorpoAllenato): dice il
          gruppo senza prendere spazio a nome, serie e tasti. */}
      <CorpoEsercizio esercizio={ex} altezza={226} className="ex-sfondo" />
      <div className="ex-head">
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{ex.nome}</div>
          {gruppo && <span className="gruppo-tag">{gruppo.label}</span>}
          {ex.nota && <div className="ex-nota">{ex.nota}</div>}
        </div>
        <button className="icon-btn" onClick={onModifica} aria-label="Modifica esercizio">
          <IconEdit />
        </button>
      </div>

      {/* Cosa dicono i pallini della volta scorsa (o come scegliere il peso). */}
      <ConsiglioCarico
        nome={ex.nome}
        carichi={carichi}
        schema={ex.schema}
        caricoAttuale={carico}
        guidaSeVuoto={!carico}
        fase={fase}
        onUsa={(c) => onPeso(c, fase)}
        chiudibile
      />

      {/* LA SERIE DI ADESSO, in un riquadro solo: quale serie, cosa fare
          (ripetizioni × peso di QUESTA serie, anche a fasi) e i pallini. Lo
          schema per intero ("5×5", il recupero) sotto il nome non c'e' piu':
          lo dicono i pallini, l'obiettivo e il timer del recupero. */}
      <div className="serie-ora">
        <div className="serie-ora-testa">
          Serie {sel + 1} di {ex.sets.length}
          {fase != null && ` · fase ${fase + 1} di ${fasiDi(ex.schema).length}`}
        </div>
        <ObiettivoSerie schema={ex.schema} j={sel} carico={carico} fase={fase} onPeso={onPeso} />
        <div className="set-dots">
          {ex.sets.map((s, j) => (
            <button
              key={j}
              className={'set-dot' + (s.colore ? ' ' + s.colore : j === sel ? ' current' : '')}
              onClick={() => onSerie(j)}
              aria-label={`Serie ${j + 1}${s.rip != null && s.colore === 'rosso' ? `, ${s.rip} ripetizioni` : ''}`}
            >
              {dentroIlPallino(s, j)}
            </button>
          ))}
        </div>
      </div>
      {ex.sets[sel]?.colore && (
        <SerieFatta key={sel} s={ex.sets[sel]} j={sel} onCambia={(patch) => onModificaSerie(sel, patch)} />
      )}
      <SforzoNellaCard
        onColore={onColore}
        onAnnullaUltima={onAnnullaUltima}
        righe
        ultima={coloreUltimaVolta(ex.nome, carichi, sel)}
      />

    </div>
  )
}

// ---------------------------------------------------------------- Serie fatta
// Toccando una serie già chiusa: le ripetizioni e i kg registrati, da
// correggere se non sono quelli del piano. Chiudere una serie resta un tocco
// solo (lib/session serieChiusa li prende dal piano); questo serve solo quando
// si è fatto diverso.
function SerieFatta({ s, j, onCambia }) {
  return (
    <div className="serie-fatta" role="group" aria-label={`Serie ${j + 1}, com'è stata fatta`}>
      <span className="muted">Serie {j + 1}:</span>
      <CampoNumero valore={s.rip} intero etichetta="Ripetizioni fatte" onCambia={(rip) => onCambia({ rip })} />
      <span className="muted">rip ×</span>
      <CampoNumero valore={s.kg} etichetta="Kg usati" onCambia={(kg) => onCambia({ kg })} />
      <span className="muted">kg</span>
    </div>
  )
}

// Un numero da scrivere: il testo resta com'è mentre si scrive ("42," non
// diventa "42"), il numero esce appena è un numero (null se vuoto).
function CampoNumero({ valore, intero = false, etichetta, onCambia }) {
  const [testo, setTesto] = useState(valore == null ? '' : String(valore).replace('.', ','))
  return (
    <input
      className="input num-input"
      inputMode={intero ? 'numeric' : 'decimal'}
      aria-label={etichetta}
      value={testo}
      onChange={(e) => {
        const t = e.target.value
        setTesto(t)
        const pulito = t.replace(',', '.').trim()
        if (!pulito) return onCambia(null)
        const n = intero ? parseInt(pulito, 10) : parseFloat(pulito)
        if (Number.isFinite(n) && n >= 0) onCambia(n)
      }}
    />
  )
}

// Il pallino di un esercizio nella superserie (CardSuperserie): vuoto finche'
// non lo si segna (acceso se e' di turno), poi col colore; toccato lo cambia
// (verde → giallo → rosso → verde).
const PROSSIMO_COLORE = { verde: 'giallo', giallo: 'rosso', rosso: 'verde' }
const TINTA_SFORZO = { verde: 'var(--good)', giallo: 'var(--sforzo-giallo)', rosso: 'var(--sforzo-rosso)' }

// ---------------------------------------------------------------- Card superserie
// Una SUPERSERIE (jumpset): due o più esercizi fatti di fila, recupero solo a
// fine giro. Il GIRO è UNA serie fatta di più esercizi: in allenamento è un
// PERCORSO, una linea dal primo esercizio al recupero, ognuno col suo peso e
// le sue ripetizioni. Così la regola (niente pausa in mezzo, recupero alla
// fine) è la forma stessa della card, senza doverla leggere.
// I tasti dello sforzo giudicano UN esercizio per volta, nell'ordine del
// percorso (quello di turno e' acceso): il primo, poi il secondo; finito il
// giro parte il recupero e si passa al giro dopo (completaSet). I pallini in
// cima sono i giri: a giro finito, la combinazione dei colori degli esercizi.
// Toccandone uno ci si sposta su quel giro, anche per correggerlo.
function CardSuperserie({
  esercizi,
  blocco,
  attiva,
  puntatore,
  recupero,
  carichi,
  onScegli,
  onColore,
  onAnnullaUltima,
  onModifica,
  onPeso,
  onModificaSerie,
}) {
  const j = puntatore.j
  // Con serie diverse (4 + 3) l'ultimo giro e' solo di chi ha ancora la serie.
  const nGiri = Math.max(...blocco.indici.map((i) => esercizi[i].sets.length))
  const nelGiro = (jj) => blocco.indici.filter((i) => jj < esercizi[i].sets.length)
  const passi = nelGiro(j)
  // Il colore di un giro: c'e' solo a giro FINITO (tutti gli esercizi col
  // loro pallino). Se gli esercizi hanno colori diversi il pallino del giro
  // si divide in spicchi, uno per esercizio.
  const coloriGiro = (jj) => nelGiro(jj).map((i) => esercizi[i].sets[jj].colore)
  const coloreGiro = (jj) => (coloriGiro(jj).every(Boolean) ? coloriGiro(jj)[0] : null)
  // L'esercizio di turno nel giro: quello a cui va il prossimo tocco.
  const diTurno = passi.find((i) => !esercizi[i].sets[j]?.colore)
  const spicchi = (jj) => {
    const cs = coloriGiro(jj)
    if (!cs.every(Boolean) || cs.every((c) => c === cs[0])) return undefined
    // Da sinistra a destra nell'ordine del giro: il primo esercizio a sinistra.
    const passo = 100 / cs.length
    const parti = cs.map((c, k) => `${TINTA_SFORZO[c]} ${k * passo}% ${(k + 1) * passo}%`)
    return { background: `linear-gradient(to right, ${parti.join(', ')})`, borderColor: 'transparent' }
  }
  const [ref, stretta] = useGradino(j)
  return (
    <div ref={ref} className={'card superserie-card' + (attiva ? '' : ' non-attiva') + stretta} inert={!attiva}>
      {/* Il modellino coi muscoli di TUTTO il giro (petto e schiena insieme),
          dietro alla card come negli esercizi da soli ma molto piu' tenue: qui
          sopra ci sono i numeri di ogni esercizio, e devono leggersi. */}
      <CorpoEsercizio
        esercizio={{ gruppi: [...new Set(passi.flatMap((i) => esercizi[i].gruppi?.length ? esercizi[i].gruppi : [esercizi[i].gruppo]))] }}
        altezza={226}
        className="ex-sfondo ss-sfondo"
      />
      <div className="ss-testa">
        <div style={{ minWidth: 0 }}>
          <div className="superserie-titolo">
            <IconCatena width={15} height={15} />
            {blocco.indici.length === 2 ? 'Superserie' : `Superserie da ${blocco.indici.length}`}
          </div>
          <div className="ss-giro">
            Giro {j + 1} di {nGiri}
          </div>
        </div>
        <div className="set-dots">
          {Array.from({ length: nGiri }, (_, jj) => {
            const c = coloreGiro(jj)
            return (
              <button
                key={jj}
                className={'set-dot' + (c ? ' ' + c : jj === j ? ' current' : '')}
                style={spicchi(jj)}
                onClick={() => onScegli(nelGiro(jj)[0], jj)}
                aria-label={`Giro ${jj + 1}`}
              >
                {c ? <IconCheck width={14} height={14} /> : jj + 1}
              </button>
            )
          })}
        </div>
      </div>

      <ol className="ss-percorso">
        {passi.map((i, k) => {
          const ex = esercizi[i]
          const gr = gruppoDi(ex.gruppo)
          const { fase, carico } = pesoDellaSerie(ex.schema, j)
          return (
            <li
              key={ex.esercizioId}
              className={'ss-passo' + (i === diTurno ? ' di-turno' : '')}
              style={gr ? { '--g': gr.colore } : undefined}
            >
              <span className="ss-pallino" aria-hidden="true">
                {k + 1}
              </span>
              <div className="ss-riga">
                <div className="ss-nome">
                  <button
                    type="button"
                    className={
                      'set-dot set-dot-piccolo' +
                      (ex.sets[j]?.colore ? ' ' + ex.sets[j].colore : i === diTurno ? ' current' : '')
                    }
                    disabled={!ex.sets[j]?.colore}
                    onClick={() => onModificaSerie(i, j, { colore: PROSSIMO_COLORE[ex.sets[j].colore] || 'verde' })}
                    aria-label={
                      ex.sets[j]?.colore
                        ? `${ex.nome}: ${ex.sets[j].colore}. Tocca per cambiarlo`
                        : `${ex.nome}: ancora da segnare`
                    }
                  />
                  {ex.nome}
                </div>
                <ObiettivoSerie
                  schema={ex.schema}
                  j={j}
                  carico={carico}
                  fase={fase}
                  onPeso={(c, f) => onPeso(i, c, f)}
                />
                <button className="icon-btn" onClick={() => onModifica(i)} aria-label={`Modifica ${ex.nome}`}>
                  <IconEdit />
                </button>
              </div>
              {ex.nota && <div className="ex-nota">{ex.nota}</div>}
              <ConsiglioCarico
                nome={ex.nome}
                carichi={carichi}
                schema={ex.schema}
                caricoAttuale={carico}
                guidaSeVuoto={false}
                fase={fase}
                onUsa={(c) => onPeso(i, c, fase)}
                chiudibile
              />
              {/* Un giro gia' fatto: ripetizioni e kg di ognuno, da correggere. */}
              {ex.sets[j]?.colore && (
                <SerieFatta key={j} s={ex.sets[j]} j={j} onCambia={(patch) => onModificaSerie(i, j, patch)} />
              )}
              {k < passi.length - 1 && <span className="ss-subito">subito, senza pausa</span>}
            </li>
          )
        })}
        <li className="ss-passo ss-fine">
          <span className="ss-pallino" aria-hidden="true">
            <IconClock width={15} height={15} />
          </span>
          <div className="ss-riga">
            <div className="ss-nome">{recupero ? `Recupero ${recupero}` : 'Recupero'}</div>
          </div>
        </li>
      </ol>

      <SforzoNellaCard
        onColore={onColore}
        onAnnullaUltima={onAnnullaUltima}
        righe
        titolo={diTurno !== undefined ? `${esercizi[diTurno].nome}: com’è andata?` : 'Com’è andato il giro?'}
        ultima={coloreUltimaVolta(esercizi[diTurno ?? passi[0]].nome, carichi, j)}
      />
    </div>
  )
}

// ---------------------------------------------------------------- Modale modifica
// Il nome nuovo. Il gruppo muscolare lo segue solo se era l'ipotesi fatta dal
// nome vecchio (un esercizio aggiunto oggi, o mai assegnato): quello scelto a
// mano nella scheda resta, come quando si rinomina dall'editor.
function rinomina(e, nome) {
  const indovinato = !e.gruppi?.length && (e.gruppo || '') === gruppoDaNome(e.nome)
  return indovinato ? { nome, gruppo: gruppoDaNome(nome) } : { nome }
}

function ModaleModifica({
  nome,
  esercizio,
  schema,
  settimana,
  permettiPerSempre = true,
  puoiEliminare = false,
  serieFatte = 0,
  chiediScheda = false,
  nomeGiorno = '',
  onChiudi,
  onSalva,
  onElimina,
}) {
  const [s, setS] = useState(() => ({ nome, ...normalizzaSchema(schema) }))
  // Gruppi e sottogruppi come in "Aggiungi": si parte da quelli che
  // l'esercizio conta oggi (scritti, o della libreria). Finché non li si tocca
  // non si salvano: il nome nuovo porta i suoi, come nell'editor (rinomina).
  const [scelti, setScelti] = useState(null)
  const n = s.nome.trim()
  const libreria = inLibreria(n)
  const muscoli = scelti || {
    gruppi: gruppiEsercizio(esercizio),
    sottogruppi: sottogruppiEsercizio(esercizio),
  }
  // Il tasto "Elimina" diventa la domanda, come TastoConferma: qui però le
  // risposte possono essere due (solo oggi / anche dalla scheda).
  const [elimina, setElimina] = useState(false)
  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: e.target.value }))
  const manca = scelti && n ? muscoliMancanti({ nome: n, ...muscoli }) : ''
  const pronto = n !== '' && !manca
  const salva = (perSempre) => onSalva({ ...s, ...(scelti ? { muscoli: scelti } : {}) }, perSempre)

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label={`Modifica ${nome}`} onClick={(e) => e.stopPropagation()}>
        <h3>Modifica · {nome}</h3>
        <div className="field">
          <label htmlFor="modifica-es-nome">Esercizio</label>
          <input
            id="modifica-es-nome"
            className="input"
            list="modifica-es-nomi"
            value={s.nome}
            onChange={set('nome')}
          />
          <datalist id="modifica-es-nomi">
            {NOMI_CATALOGO.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        {n && (
          <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
            <span className={manca ? 'muscoli-manca' : 'muted'} style={{ fontSize: 13 }}>
              {manca === 'gruppo'
                ? 'Non è nell’elenco: scegli il gruppo muscolare e il muscolo'
                : manca === 'sottogruppo'
                  ? 'Non è nell’elenco: scegli anche il muscolo'
                  : 'Gruppi muscolari e muscoli'}
            </span>
            <SceltaGruppi
              compatto
              valori={muscoli.gruppi}
              onChange={(g) => setScelti(patchMuscoli({ nome: n, ...muscoli }, g, { suggerisci: libreria }))}
              sottogruppi={muscoli.sottogruppi || []}
              onSottogruppi={(sg) => setScelti({ ...muscoli, sottogruppi: sg })}
              mancaSotto={!libreria}
            />
          </div>
        )}
        {/* Con le fasi: "3×5 poi 2×2", ognuna col suo peso (lib/schema). */}
        <div style={{ marginBottom: 10 }}>
          <SchemaFasi schema={s} onChange={(p) => setS((prev) => ({ ...prev, ...p }))} />
        </div>
        <input
          className="input"
          placeholder="Nota (facoltativa)"
          value={s.nota}
          onChange={set('nota')}
          style={{ marginBottom: 16 }}
        />

        {/* Il tasto pieno è quello che non tocca la scheda del PT: a metà
            allenamento si corregge per oggi, il programma si cambia apposta. */}
        <button className="btn btn-accent btn-block btn-lg" disabled={!pronto} onClick={() => salva(false)}>
          Solo per oggi
        </button>
        {permettiPerSempre && (
          <button
            className="btn btn-block btn-lg"
            style={{ marginTop: 8 }}
            disabled={!pronto}
            onClick={() => salva(true)}
          >
            Salva anche in scheda (settimana {settimana})
          </button>
        )}
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>

        {puoiEliminare && (
          <>
            <div className="divider" />
            {!elimina ? (
              <button type="button" className="btn btn-ghost btn-danger btn-block" onClick={() => setElimina(true)}>
                Elimina esercizio
              </button>
            ) : (
              <div className="conferma" role="group" aria-label="Eliminare l'esercizio?">
                <p className="conferma-domanda">
                  Togliere «{nome}» da questo allenamento?
                  {serieFatte > 0 &&
                    ` ${serieFatte === 1 ? 'La serie già segnata non finirà' : `Le ${serieFatte} serie già segnate non finiranno`} nel riepilogo.`}
                </p>
                {chiediScheda ? (
                  <div className="stack" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-sm btn-danger-pieno" onClick={() => onElimina(false)}>
                      Solo da questo allenamento
                    </button>
                    <button type="button" className="btn btn-sm btn-danger-pieno" onClick={() => onElimina(true)}>
                      Anche dalla scheda ({nomeGiorno})
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setElimina(false)} autoFocus>
                      No
                    </button>
                  </div>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-sm grow" onClick={() => setElimina(false)} autoFocus>
                      No
                    </button>
                    <button type="button" className="btn btn-sm btn-danger-pieno grow" onClick={() => onElimina(false)}>
                      Sì, elimina
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Modale aggiungi
// Tutti i nomi del catalogo, per i suggerimenti mentre si scrive: si può
// comunque scrivere quello che si vuole (è testo libero, come nelle schede).
const NOMI_CATALOGO = [...new Set(Object.values(LIBRERIA).flat())].sort((a, b) => a.localeCompare(b, 'it'))

// Gruppi e SOTTOGRUPPI come nel foglio dell'editor (GiornoEditor): per un
// esercizio della libreria quelli della libreria, per uno già usato quelli
// dell'ultima volta, per uno nuovo fuori elenco li sceglie chi lo scrive, e
// finché mancano non si aggiunge (muscoliMancanti). Toccati a mano, restano
// quelli anche se poi si ritocca il nome.
function ModaleAggiungi({ dopoNome, libera, nomeGiorno, onChiudi, onAggiungi }) {
  const { schede } = useStore()
  const [nome, setNome] = useState('')
  const [nota, setNota] = useState('')
  const [s, setS] = useState(() => schemaVuoto())
  const [inFondo, setInFondo] = useState(false)
  const [scelti, setScelti] = useState(null)
  const propri = useMemo(
    () => new Map(eserciziPropri(schede).map((p) => [normalizzaNome(p.nome), p.muscoli])),
    [schede],
  )
  const n = nome.trim()
  const libreria = inLibreria(n)
  const muscoli =
    scelti ||
    (libreria
      ? { gruppi: gruppiDaNome(n), sottogruppi: sottogruppiDaNome(n) }
      : propri.get(normalizzaNome(n)) || { gruppi: [] })
  const manca = n ? muscoliMancanti({ nome: n, ...muscoli }) : ''
  const pronto = n !== '' && !manca
  const aggiungi = (anchInScheda) =>
    onAggiungi(
      { nome: n, nota: nota.trim(), schema: s, gruppi: muscoli.gruppi, sottogruppi: muscoli.sottogruppi },
      { inFondo, anchInScheda },
    )

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" role="dialog" aria-label="Aggiungi un esercizio" onClick={(e) => e.stopPropagation()}>
        <h3>Aggiungi un esercizio</h3>
        <div className="field">
          <label htmlFor="nuovo-es-nome">Esercizio</label>
          <input
            id="nuovo-es-nome"
            className="input"
            list="nuovo-es-nomi"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="es. Alzate laterali manubri"
            autoFocus
          />
          <datalist id="nuovo-es-nomi">
            {NOMI_CATALOGO.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        {n && (
          <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
            <span className={manca ? 'muscoli-manca' : 'muted'} style={{ fontSize: 13 }}>
              {manca === 'gruppo'
                ? 'Non è nell’elenco: scegli il gruppo muscolare e il muscolo'
                : manca === 'sottogruppo'
                  ? 'Non è nell’elenco: scegli anche il muscolo'
                  : 'Gruppi muscolari e muscoli'}
            </span>
            <SceltaGruppi
              compatto
              valori={muscoli.gruppi}
              onChange={(g) => setScelti(patchMuscoli({ nome: n, ...muscoli }, g, { suggerisci: libreria }))}
              sottogruppi={muscoli.sottogruppi || []}
              onSottogruppi={(sg) => setScelti({ ...muscoli, sottogruppi: sg })}
              mancaSotto={!libreria}
            />
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <SchemaFasi schema={s} onChange={(p) => setS((prev) => ({ ...prev, ...p }))} />
        </div>
        <input
          className="input"
          placeholder="Nota (facoltativa)"
          aria-label="Nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {/* Dove: di solito subito dopo quello che si sta facendo. */}
        {dopoNome && (
          <div className="segmented" style={{ marginBottom: 14 }}>
            <button className={'seg-btn' + (!inFondo ? ' on' : '')} aria-pressed={!inFondo} onClick={() => setInFondo(false)}>
              Dopo «{dopoNome}»
            </button>
            <button className={'seg-btn' + (inFondo ? ' on' : '')} aria-pressed={inFondo} onClick={() => setInFondo(true)}>
              In fondo
            </button>
          </div>
        )}

        {libera ? (
          <button className="btn btn-accent btn-block btn-lg" disabled={!pronto} onClick={() => aggiungi(false)}>
            Aggiungi
          </button>
        ) : (
          <>
            <button className="btn btn-accent btn-block btn-lg" disabled={!pronto} onClick={() => aggiungi(false)}>
              Aggiungi solo a questo allenamento
            </button>
            <button className="btn btn-block btn-lg" style={{ marginTop: 8 }} disabled={!pronto} onClick={() => aggiungi(true)}>
              Aggiungi anche alla scheda ({nomeGiorno})
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
