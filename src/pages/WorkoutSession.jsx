import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { prossimoSet, totaliSessione, numeroSet, COLORI } from '../lib/session'
import { storicoCarichi, consiglioCarico } from '../lib/carico'
import { nuovoEsercizio, nuovoId, schemaPerSettimana } from '../data/model'
import { LIBRERIA, gruppoDaNome } from '../lib/eserciziLibreria'
import { parseRecuperoSec, formatSec } from '../lib/parseRecupero'
import { formatSerieRip } from '../lib/format'
import { gruppoDi } from '../lib/muscoli'
import { numeroPositivo } from '../lib/recap'
import { useRestTimer, useWakeLock } from '../hooks/useRestTimer'
import { navigate, routes } from '../lib/router'
import { blocchi, bloccoDi, eSuperserie, giro, recuperoBlocco } from '../lib/superserie'
import { IconCatena, IconCheck, IconClock, IconWeight, IconEdit } from '../components/icons'
import RiepilogoDettaglio from '../components/RiepilogoDettaglio'
import EsercizioAllegati, { VisibilitaMedia } from '../components/EsercizioAllegati'
import ConsiglioCarico from '../components/ConsiglioCarico'
import ModalePeso from '../components/ModalePeso'
import RecapCondivisibile from '../components/RecapCondivisibile'
import VisibilitaPicker from '../components/VisibilitaPicker'
import TastoConferma from '../components/TastoConferma'
import TimerRecupero from '../components/TimerRecupero'
import FotoAllenamento from '../components/FotoAllenamento'
import {
  chiaveAllenamento,
  eliminaFotoDiAllenamento,
  spostaFotoAllenamento,
} from '../lib/fotoAllenamento'
import { spostaInterazioni } from '../lib/interazioni'
import { VISIBILITA, visibilitaDi } from '../lib/visibilita'
import { useAccount } from '../store/AccountContext'

const ORDINE_COLORI = ['verde', 'giallo', 'rosso']
const EMOJI = { verde: '🟢', giallo: '🟡', rosso: '🔴' }

// Adatta l'array dei set a un nuovo numero di serie mantenendo i colori esistenti.
function riconcilia(sets, n) {
  const out = sets.slice(0, n)
  while (out.length < n) out.push({ colore: null })
  return out
}

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
  // La chiave dell'allenamento appena ripreso: al prossimo "Termina" cambia
  // (la data è quella nuova), e le foto aggiunte nel riepilogo — con mi piace
  // e commenti, se era già pubblico — lo devono seguire.
  const chiaveRipresa = useRef(null)
  const [now, setNow] = useState(Date.now())
  // ⚠️ Il fuoco è su un BLOCCO, non su un esercizio: una superserie (jumpset)
  // è una card sola con dentro i suoi esercizi, e da solo un esercizio è un
  // blocco di uno — che si comporta esattamente come prima (lib/superserie).
  const [focusB, setFocusB] = useState(() =>
    sessione ? bloccoDi(sessione.esercizi, prossimoSet(sessione)?.ei ?? 0) : 0,
  )
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
  // Peso da cambiare: null = modale chiuso, altrimenti { i, valore } — l'indice
  // dell'esercizio e il valore di partenza (già quello consigliato se si arriva
  // dal riquadro del consiglio).
  const [peso, setPeso] = useState(null)
  const timer = useRestTimer()
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
  // Privata o pubblica per le foto/video aggiunti DURANTE questo allenamento.
  // ⚠️ Una volta per tutte, in fondo alla pagina: la stessa domanda ripetuta
  // sotto ogni esercizio era rumore, e rumore su una domanda che riguarda la
  // privacy è peggio che inutile — la si smette di leggere.
  const [visibilitaMedia, setVisibilitaMedia] = useState('privata')

  useWakeLock(!riep && !!sessione)

  // Tempo totale.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Al cambio di esercizio si imposta il recupero di quell'esercizio. ⚠️ NON si
  // tocca più la serie selezionata: quella è di ogni esercizio e resta dov'era.
  // `imposta` di suo non disturba un recupero già partito (vedi useRestTimer).
  // In una superserie è il recupero di FINE GIRO (recuperoBlocco): fra un
  // esercizio e l'altro del blocco non si recupera.
  useEffect(() => {
    const lista = sessioneRef.current?.esercizi
    const b = lista ? blocchi(lista)[focusB] : null
    if (!b) return
    timer.imposta(parseRecuperoSec(recuperoBlocco(lista, b)) || 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusB])

  // Indice → scroll: porta in vista la card quando il fuoco cambia da FUORI
  // (‹ Prec / Succ ›, il tocco sul mini-elenco, l'avanzamento automatico a
  // serie finite). Se la card è già al suo posto non si fa niente, se no il
  // gesto dell'utente combatterebbe con questo effetto a ogni scorrimento.
  useEffect(() => {
    const pista = pistaRef.current
    const card = pista?.children[focusB]
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
  }, [focusB])

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
  }

  if (riep) {
    // Gli allenamenti "liberi" (consigliati) non hanno una pagina scheda propria
    // da mostrare: al termine si torna al calendario.
    const s = getScheda(riep.schedaId)
    const dest = s?.libera ? routes.calendario() : routes.scheda(riep.schedaId)
    // Solo gli allenamenti LIBERI si possono tenere o buttare: quelli di una
    // scheda vera stanno già nella scheda, e la domanda non avrebbe senso.
    const giornoLibero = s?.libera ? s.giorni.find((g) => g.id === riep.giornoId) || null : null
    return (
      <Riepilogo
        riep={riep}
        dest={dest}
        giornoLibero={giornoLibero}
        onRiprendi={sospesa ? riprendi : null}
        onSalvaAllenamento={(v) => salvaAllenamento(riep.schedaId, riep.giornoId, v)}
        onElimina={() => {
          eliminaCompletamento(riep.data, riep.schedaId)
          // Le sue foto non devono restare nello Storage appese al niente.
          eliminaFotoDiAllenamento(chiaveAllenamento(riep))
          navigate(dest || routes.calendario())
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
        onSalvaVisibilita={(v) => aggiornaCompletamento(riep.schedaId, riep.data, { visibilita: v })}
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
  const fb = Math.max(0, Math.min(focusB, bs.length - 1))
  const bloccoCorr = bs[fb] || null
  // Il recupero che dice la scheda per il blocco su cui si è: è il default del
  // timer (lo rimette l'effetto qui sopra a ogni cambio di esercizio) ed è il
  // valore che nei preimpostati non deve mancare mai.
  const recuperoScheda = bloccoCorr
    ? parseRecuperoSec(recuperoBlocco(esercizi, bloccoCorr)) || 90
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
    if (vicino !== focusB) setFocusB(vicino)
  }
  // Dove tornare uscendo dalla sessione: la scheda, o il calendario se è un
  // allenamento "libero" (consigliato, senza pagina scheda visibile).
  const tornaDaSessione = schedaCorr?.libera ? routes.calendario() : routes.scheda(sessione.schedaId)
  const { tot, fatti } = totaliSessione(sessione)
  const overall = prossimoSet(sessione)
  const durataSec = Math.round((now - new Date(sessione.inizio).getTime()) / 1000)

  // Il colore va alla serie su cui si è, e poi si va avanti nel GIRO: in una
  // superserie dopo A1 viene B1 (subito, senza recupero), dopo B1 viene A2.
  const completaSet = (bi, colore) => {
    const b = bs[bi]
    const p = b && puntatoreDi(b)
    if (!p) return
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== p.i ? e : { ...e, sets: e.sets.map((s, j) => (j !== p.j ? s : { colore })) },
      ),
    }))
    const g = giro(esercizi, b)
    const k = g.findIndex((x) => x.i === p.i && x.j === p.j)
    const dopo = g.find((x, n) => n > k && !esercizi[x.i].sets[x.j].colore)
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
    if (nextB !== -1) setFocusB(nextB)
  }

  // Si disfa l'ultima serie segnata del blocco, nell'ordine del giro.
  const annullaUltima = (bi) => {
    const b = bs[bi]
    if (!b) return
    const last = [...giro(esercizi, b)].reverse().find((x) => esercizi[x.i].sets[x.j].colore)
    if (!last) return
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== last.i ? e : { ...e, sets: e.sets.map((s, j) => (j !== last.j ? s : { colore: null })) },
      ),
    }))
    scegli(b, last.i, last.j)
  }

  const applicaSchema = (idx, nuovo, perSempre) => {
    const ex = esercizi[idx]
    const nuovoNum = numeroSet({ ...ex.schema, ...nuovo })
    aggiornaSessione((prev) => ({
      ...prev,
      esercizi: prev.esercizi.map((e, i) =>
        i !== idx ? e : { ...e, schema: { ...e.schema, ...nuovo }, sets: riconcilia(e.sets, nuovoNum) },
      ),
    }))
    if (perSempre) {
      aggiornaSchemaEsercizio(sessione.schedaId, sessione.giornoId, ex.esercizioId, sessione.settimana, nuovo)
    }
    // Meno serie di prima: una selezione rimasta fuori dall'elenco la scarta
    // puntatoreDi da solo, e si riparte dalla prima non fatta.
    // Il recupero: quello del BLOCCO dopo la modifica (in una superserie conta
    // quello di fine giro, non per forza quello dell'esercizio toccato).
    const aggiornati = esercizi.map((e, i) =>
      i !== idx ? e : { ...e, schema: { ...e.schema, ...nuovo } },
    )
    const bMod = blocchi(aggiornati)[bloccoDi(aggiornati, idx)]
    timer.imposta(parseRecuperoSec(recuperoBlocco(aggiornati, bMod)) || 90)
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
  const aggiungiEsercizio = ({ nome, nota, schema }, { inFondo, anchInScheda }) => {
    const id = nuovoId()
    const gruppo = gruppoDaNome(nome)
    const fineBlocco = bloccoCorr ? bloccoCorr.fine : esercizi.length - 1
    const indice = inFondo ? esercizi.length : fineBlocco + 1
    aggiornaSessione((prev) => {
      const lista = [...prev.esercizi]
      lista.splice(Math.min(indice, lista.length), 0, {
        esercizioId: id,
        nome,
        nota,
        gruppo,
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
        lista.splice(k === -1 ? lista.length : k + 1, 0, nuovoEsercizio({ id, nome, nota, gruppo, schemaBase: schema }))
        return { esercizi: lista }
      })
    }
    // Il nuovo è un blocco da solo: subito dopo quello corrente, o l'ultimo.
    setFocusB(inFondo ? bs.length : fb + 1)
    setAggiungi(false)
  }

  const termina = () => {
    const inCorso = sessione
    const r = terminaSessione()
    if (chiaveRipresa.current) {
      const nuova = chiaveAllenamento(r)
      spostaFotoAllenamento(utenteCorrente?.id, chiaveRipresa.current, nuova)
      spostaInterazioni(chiaveRipresa.current, nuova)
      chiaveRipresa.current = null
    }
    setSospesa(inCorso)
    setRiep(r)
  }

  return (
    <div className="app">
      <div className="topbar">
        <button
          className="icon-btn"
          onClick={() => navigate(tornaDaSessione)}
          aria-label="Riduci"
        >
          <IconClock />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="timer-total">⏱ {formatSec(durataSec)}</div>
          <div className="faint" style={{ fontSize: 12 }}>
            {sessione.nomeGiorno} · Sett {sessione.settimana} · {fatti}/{tot} serie
          </div>
        </div>
        <button className="btn btn-sm btn-danger" onClick={termina}>
          Termina
        </button>
      </div>

      {/* Il recupero: numerone, preimpostati di 15" in 15", start/pausa/reset.
          ⚠️ Sta in un componente suo perché lì si può aprire in un browser e
          provarlo con le dita, fuori dal login (vedi components/TimerRecupero). */}
      <TimerRecupero timer={timer} recuperoScheda={recuperoScheda} />

      {/* Navigazione esercizi: i tasti restano perché sono precisi (e
          funzionano da tastiera); il gesto naturale è scorrere la pista. */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <button className="btn btn-sm" disabled={fb === 0} onClick={() => setFocusB(fb - 1)}>
          ‹ Prec
        </button>
        {/* Una superserie conta come UN esercizio: è una cosa sola da fare. */}
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          Esercizio {fb + 1}/{bs.length}
        </span>
        <button
          className="btn btn-sm"
          disabled={fb >= bs.length - 1}
          onClick={() => setFocusB(fb + 1)}
        >
          Succ ›
        </button>
      </div>

      {/* La pista: una card per esercizio, in fila, si scorre di lato.
          ⚠️ Ci sono TUTTE, sempre montate: i pallini delle serie vivono nella
          sessione, quindi andare avanti a sbirciare e tornare indietro non
          perde niente — né i colori, né la serie a cui si era arrivati. */}
      <div className="pista-esercizi" ref={pistaRef} onScroll={alloScroll}>
        {bs.map((b, bi) => {
          const p = puntatoreDi(b) || { i: b.inizio, j: 0 }
          const allegatiDi = (ex) => (upd) =>
            aggiornaEsercizio(sessione.schedaId, sessione.giornoId, esInSchedaDi(ex).id, {
              commenti: upd.commenti,
              media: upd.media,
            })
          if (!eSuperserie(b)) {
            const i = b.inizio
            const ex = esercizi[i]
            return (
              <CardEsercizio
                key={ex.esercizioId}
                ex={ex}
                attiva={bi === fb}
                sel={p.j}
                carichi={carichi}
                esInScheda={esInSchedaDi(ex)}
                schedaId={sessione.schedaId}
                visibilitaMedia={visibilitaMedia}
                onVisibilitaMedia={setVisibilitaMedia}
                onSerie={(j) => scegli(b, i, j)}
                onColore={(c) => completaSet(bi, c)}
                onAnnullaUltima={() => annullaUltima(bi)}
                onModifica={() => setEditing(i)}
                onPeso={(valore) => setPeso({ i, valore })}
                onAllegati={allegatiDi(ex)}
              />
            )
          }
          return (
            <CardSuperserie
              key={esercizi[b.inizio].esercizioId}
              esercizi={esercizi}
              blocco={b}
              attiva={bi === fb}
              puntatore={p}
              recupero={recuperoBlocco(esercizi, b)}
              carichi={carichi}
              esInSchedaDi={esInSchedaDi}
              schedaId={sessione.schedaId}
              visibilitaMedia={visibilitaMedia}
              onVisibilitaMedia={setVisibilitaMedia}
              onScegli={(i, j) => scegli(b, i, j)}
              onColore={(c) => completaSet(bi, c)}
              onAnnullaUltima={() => annullaUltima(bi)}
              onModifica={(i) => setEditing(i)}
              onPeso={(i, valore) => setPeso({ i, valore })}
              onAllegati={allegatiDi}
            />
          )
        })}
      </div>

      {!overall && (
        <div className="hero" style={{ marginTop: 12, textAlign: 'center' }}>
          <div className="titolo">Tutte le serie fatte! 💪</div>
          <button className="btn btn-good btn-lg btn-block" style={{ marginTop: 16 }} onClick={termina}>
            <IconCheck width={20} height={20} />
            Termina e vedi riepilogo
          </button>
        </div>
      )}

      {/* Panoramica esercizi (tocca per andarci) */}
      <div className="section-title">Esercizi</div>
      <div className="stack" style={{ gap: 8 }}>
        {bs.map((b, bi) => {
          const riga = (i) => {
            const e = esercizi[i]
            const done = e.sets.every((s) => s.colore)
            const gr = gruppoDi(e.gruppo)
            return (
              <button
                key={e.esercizioId}
                className={
                  'ex-mini' + (bi === fb ? ' active' : done ? ' done' : '') + (gr ? ' has-gruppo' : '')
                }
                style={gr ? { '--g': gr.colore } : undefined}
                onClick={() => setFocusB(bi)}
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
      </div>
      <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => setAggiungi(true)}>
        + Aggiungi un esercizio
      </button>

      {/* In fondo, una volta per tutte: com'è andato l'allenamento e chi vede
          le foto. Sono due domande sulla SESSIONE, non su un esercizio, e
          ripeterle sotto ognuno voleva dire non farle leggere a nessuno. */}
      <div className="section-title">Questo allenamento</div>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="commento-allenamento">Commento sull'allenamento</label>
          <textarea
            id="commento-allenamento"
            className="textarea"
            rows={2}
            value={sessione.nota || ''}
            placeholder="Aggiungi un commento…"
            onChange={(e) => aggiornaSessione((prev) => ({ ...prev, nota: e.target.value }))}
          />
        </div>
        <div className="vis-hint" style={{ marginTop: 6 }}>
          Lo ritrovi nel riepilogo a fine allenamento, dove puoi ancora correggerlo.
        </div>

        <div className="divider" />

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Foto e video che aggiungi oggi</label>
          <VisibilitaMedia valore={visibilitaMedia} onChange={setVisibilitaMedia} />
        </div>
        <div className="vis-hint" style={{ marginTop: 6 }}>
          {visibilitaMedia === 'privata'
            ? 'Visibili solo a te.'
            : 'Visibili a chi guarda la scheda.'}
        </div>
      </div>

      <TastoConferma
        style={{ marginTop: 20 }}
        etichetta="Annulla allenamento"
        domanda="Annullare l’allenamento? I dati di questa sessione andranno persi."
        si="Sì, annulla"
        no="No, continuo"
        onConferma={() => {
          annullaSessione()
          navigate(tornaDaSessione)
        }}
      />

      {/* ⚠️ I modali stanno FUORI dalla pista e sanno su quale esercizio
          lavorano (l'indice): dentro una card che si scorre di lato un modale
          si porterebbe dietro lo scorrimento. */}
      {editing !== null && esercizi[editing] && (
        <ModaleModifica
          nome={esercizi[editing].nome}
          schema={esercizi[editing].schema}
          settimana={sessione.settimana}
          // Un esercizio aggiunto solo per oggi nella scheda non c'è: "per
          // sempre" non avrebbe dove scrivere, e non farebbe niente senza dirlo.
          permettiPerSempre={!!esInSchedaDi(esercizi[editing])}
          onChiudi={() => setEditing(null)}
          onSalva={(nuovo, perSempre) => applicaSchema(editing, nuovo, perSempre)}
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

      {peso !== null && esercizi[peso.i] && (
        <ModalePeso
          nome={esercizi[peso.i].nome}
          iniziale={peso.valore}
          caricoAttuale={esercizi[peso.i].schema.carico || ''}
          caricoScheda={(() => {
            const inScheda = esInSchedaDi(esercizi[peso.i])
            return inScheda ? schemaPerSettimana(inScheda, sessione.settimana).carico || '' : ''
          })()}
          settimana={sessione.settimana}
          // Negli allenamenti liberi la scheda è nascosta e usa e getta:
          // "per sempre" non avrebbe un posto dove valere.
          permettiPerSempre={!schedaCorr?.libera && !!esInSchedaDi(esercizi[peso.i])}
          suggerimento={consiglioCarico(esercizi[peso.i].nome, carichi)?.testo || ''}
          onChiudi={() => setPeso(null)}
          onSalva={(carico, perSempre) => {
            applicaSchema(peso.i, { carico }, perSempre)
            setPeso(null)
          }}
        />
      )}
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
function CardEsercizio({
  ex,
  attiva,
  sel,
  carichi,
  esInScheda,
  schedaId,
  visibilitaMedia,
  onVisibilitaMedia,
  onSerie,
  onColore,
  onAnnullaUltima,
  onModifica,
  onPeso,
  onAllegati,
}) {
  const gruppo = gruppoDi(ex.gruppo)
  return (
    <div
      className={'card' + (gruppo ? ' has-gruppo' : '') + (attiva ? '' : ' non-attiva')}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
      // ⚠️ `inert` e non `aria-hidden`: le card vicine hanno dei tasti veri, e
      // durante lo scorrimento se ne intravede un pezzo. Inert le toglie
      // insieme dal tocco, dal tab e da chi legge lo schermo — aria-hidden da
      // solo lascerebbe dei tasti premibili ma invisibili a chi non vede.
      inert={!attiva}
    >
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

      <div className="ex-scheme" style={{ marginTop: 12 }}>
        {formatSerieRip(ex.schema) && <span className="serie-rip">{formatSerieRip(ex.schema)}</span>}
        {/* Il peso si cambia da qui: si sceglie poi se vale solo per oggi
            o anche in scheda (ModalePeso). */}
        <button
          className="chip chip-azione"
          onClick={() => onPeso(ex.schema.carico || '')}
          aria-label="Cambia il peso"
        >
          <IconWeight width={15} height={15} />
          {ex.schema.carico || 'Imposta peso'}
        </button>
        {ex.schema.recupero && (
          <span className="chip">
            <IconClock width={15} height={15} />
            {ex.schema.recupero}
          </span>
        )}
      </div>

      {/* Cosa dicono i pallini della volta scorsa (o come scegliere il peso). */}
      <ConsiglioCarico
        nome={ex.nome}
        carichi={carichi}
        caricoAttuale={ex.schema.carico || ''}
        guidaSeVuoto={!ex.schema.carico}
        onUsa={(carico) => onPeso(carico)}
      />

      <div className="section-title" style={{ margin: '16px 0 8px' }}>
        Serie {sel + 1} di {ex.sets.length}
      </div>
      <div className="set-dots">
        {ex.sets.map((s, j) => (
          <button
            key={j}
            className={'set-dot' + (s.colore ? ' ' + s.colore : j === sel ? ' current' : '')}
            onClick={() => onSerie(j)}
            aria-label={`Serie ${j + 1}`}
          >
            {s.colore ? <IconCheck width={15} height={15} /> : j + 1}
          </button>
        ))}
      </div>

      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        Com'è andata questa serie?
      </div>
      <div className="effort-buttons">
        {ORDINE_COLORI.map((c) => (
          <button key={c} className={'effort ' + c} onClick={() => onColore(c)}>
            <span className="em">{EMOJI[c]}</span>
            {COLORI[c].label}
          </button>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm btn-block"
        style={{ marginTop: 8 }}
        onClick={onAnnullaUltima}
      >
        ↶ Annulla ultima serie di questo esercizio
      </button>

      {attiva && esInScheda && (
        <EsercizioAllegati
          esercizio={esInScheda}
          schedaId={schedaId}
          onChange={onAllegati}
          // Qui si scrive di QUESTO esercizio; il commento sull'allenamento
          // intero, e la scelta privata/pubblica, stanno in fondo alla pagina.
          placeholderCommento="Precisazioni esercizio…"
          visibilitaMedia={visibilitaMedia}
          onVisibilitaMedia={onVisibilitaMedia}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Card superserie
// Una SUPERSERIE (jumpset): due o più esercizi fatti di fila, recupero solo a
// fine giro. In allenamento è UNA card — è una cosa sola da fare — ma ogni
// esercizio tiene il suo nome, il suo schema, il suo peso e i SUOI pallini:
// sono esercizi diversi, e "com'è andata" vale per ciascuno.
// I tre tasti dello sforzo sono uno solo e seguono il giro: segnano la serie su
// cui si è (evidenziata) e passano alla prossima, A1 → B1 → A2 → B2. Toccando
// un pallino qualunque ci si sposta lì, come nella card di un esercizio solo.
function CardSuperserie({
  esercizi,
  blocco,
  attiva,
  puntatore,
  recupero,
  carichi,
  esInSchedaDi,
  schedaId,
  visibilitaMedia,
  onVisibilitaMedia,
  onScegli,
  onColore,
  onAnnullaUltima,
  onModifica,
  onPeso,
  onAllegati,
}) {
  const corrente = esercizi[puntatore.i]
  const esInScheda = esInSchedaDi(corrente)
  // Cosa viene dopo la serie su cui si è: il prossimo esercizio del blocco che
  // ha quella serie, subito; se non c'è, il giro è finito e si recupera.
  const poi = blocco.indici.find((k) => k > puntatore.i && puntatore.j < esercizi[k].sets.length)
  return (
    <div className={'card superserie-card' + (attiva ? '' : ' non-attiva')} inert={!attiva}>
      <div className="superserie-titolo">
        <IconCatena width={15} height={15} />
        {blocco.indici.length === 2 ? 'Superserie' : `Superserie da ${blocco.indici.length}`}
        <span className="superserie-sub">
          di fila{recupero ? `, poi recupero ${recupero}` : ', recupero a fine giro'}
        </span>
      </div>

      {blocco.indici.map((i) => {
        const ex = esercizi[i]
        const gr = gruppoDi(ex.gruppo)
        const qui = i === puntatore.i
        return (
          <div
            key={ex.esercizioId}
            className={'superserie-voce' + (qui ? ' corrente' : '') + (gr ? ' has-gruppo' : '')}
            style={gr ? { '--g': gr.colore } : undefined}
          >
            <div className="ex-head">
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{ex.nome}</div>
                {gr && <span className="gruppo-tag">{gr.label}</span>}
                {ex.nota && <div className="ex-nota">{ex.nota}</div>}
              </div>
              <button
                className="icon-btn"
                onClick={() => onModifica(i)}
                aria-label={`Modifica ${ex.nome}`}
              >
                <IconEdit />
              </button>
            </div>
            <div className="ex-scheme" style={{ marginTop: 8 }}>
              {formatSerieRip(ex.schema) && (
                <span className="serie-rip">{formatSerieRip(ex.schema)}</span>
              )}
              <button
                className="chip chip-azione"
                onClick={() => onPeso(i, ex.schema.carico || '')}
                aria-label={`Cambia il peso di ${ex.nome}`}
              >
                <IconWeight width={15} height={15} />
                {ex.schema.carico || 'Imposta peso'}
              </button>
            </div>
            <ConsiglioCarico
              nome={ex.nome}
              carichi={carichi}
              caricoAttuale={ex.schema.carico || ''}
              guidaSeVuoto={!ex.schema.carico}
              onUsa={(carico) => onPeso(i, carico)}
            />
            <div className="set-dots" style={{ marginTop: 10 }}>
              {ex.sets.map((s, j) => (
                <button
                  key={j}
                  className={
                    'set-dot' + (s.colore ? ' ' + s.colore : qui && j === puntatore.j ? ' current' : '')
                  }
                  onClick={() => onScegli(i, j)}
                  aria-label={`${ex.nome}, serie ${j + 1}`}
                >
                  {s.colore ? <IconCheck width={15} height={15} /> : j + 1}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <div className="section-title" style={{ margin: '16px 0 4px' }}>
        Serie {puntatore.j + 1} · {corrente.nome}
      </div>
      <div className="superserie-poi">
        {poi !== undefined
          ? `Poi subito ${esercizi[poi].nome}, senza recuperare`
          : `Poi recupero${recupero ? ` ${recupero}` : ''}`}
      </div>
      <div className="effort-buttons" style={{ marginTop: 10 }}>
        {ORDINE_COLORI.map((c) => (
          <button key={c} className={'effort ' + c} onClick={() => onColore(c)}>
            <span className="em">{EMOJI[c]}</span>
            {COLORI[c].label}
          </button>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm btn-block"
        style={{ marginTop: 8 }}
        onClick={onAnnullaUltima}
      >
        ↶ Annulla ultima serie della superserie
      </button>

      {/* Commenti e foto: quelli dell'esercizio su cui si è. */}
      {attiva && esInScheda && (
        <EsercizioAllegati
          esercizio={esInScheda}
          schedaId={schedaId}
          onChange={onAllegati(corrente)}
          placeholderCommento={`Precisazioni su ${corrente.nome}…`}
          visibilitaMedia={visibilitaMedia}
          onVisibilitaMedia={onVisibilitaMedia}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Modale modifica
function ModaleModifica({ nome, schema, settimana, permettiPerSempre = true, onChiudi, onSalva }) {
  const [s, setS] = useState({
    serie: schema.serie || '',
    ripetizioni: schema.ripetizioni || '',
    carico: schema.carico || '',
    recupero: schema.recupero || '',
    nota: schema.nota || '',
  })
  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Modifica · {nome}</h3>
        <div className="grid-4" style={{ marginBottom: 10 }}>
          <input className="input" placeholder="Serie" value={s.serie} onChange={set('serie')} />
          <input className="input" placeholder="Rip." value={s.ripetizioni} onChange={set('ripetizioni')} />
          <input className="input" placeholder="Carico" value={s.carico} onChange={set('carico')} />
          <input className="input" placeholder="Recupero" value={s.recupero} onChange={set('recupero')} />
        </div>
        <input
          className="input"
          placeholder="Nota (facoltativa)"
          value={s.nota}
          onChange={set('nota')}
          style={{ marginBottom: 16 }}
        />

        <button
          className={'btn btn-block btn-lg' + (permettiPerSempre ? '' : ' btn-accent')}
          onClick={() => onSalva(s, false)}
        >
          Salva solo per questa sessione
        </button>
        {permettiPerSempre && (
          <button
            className="btn btn-accent btn-block btn-lg"
            style={{ marginTop: 8 }}
            onClick={() => onSalva(s, true)}
          >
            Salva per sempre (settimana {settimana})
          </button>
        )}
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Modale aggiungi
// Tutti i nomi del catalogo, per i suggerimenti mentre si scrive: si può
// comunque scrivere quello che si vuole (è testo libero, come nelle schede).
const NOMI_CATALOGO = [...new Set(Object.values(LIBRERIA).flat())].sort((a, b) => a.localeCompare(b, 'it'))

function ModaleAggiungi({ dopoNome, libera, nomeGiorno, onChiudi, onAggiungi }) {
  const [nome, setNome] = useState('')
  const [nota, setNota] = useState('')
  const [s, setS] = useState({ serie: '', ripetizioni: '', carico: '', recupero: '', nota: '' })
  const [inFondo, setInFondo] = useState(false)
  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: e.target.value }))
  const pronto = nome.trim() !== ''
  const aggiungi = (anchInScheda) =>
    onAggiungi({ nome: nome.trim(), nota: nota.trim(), schema: s }, { inFondo, anchInScheda })

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
        <div className="grid-4" style={{ marginBottom: 10 }}>
          <input className="input" placeholder="Serie" aria-label="Serie" value={s.serie} onChange={set('serie')} />
          <input className="input" placeholder="Rip." aria-label="Ripetizioni" value={s.ripetizioni} onChange={set('ripetizioni')} />
          <input className="input" placeholder="Carico" aria-label="Carico" value={s.carico} onChange={set('carico')} />
          <input className="input" placeholder="Recupero" aria-label="Recupero" value={s.recupero} onChange={set('recupero')} />
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

// ---------------------------------------------------------------- Riepilogo
// Due viste dello stesso allenamento: la CARD da condividere (quella che si
// apre per prima, è il momento in cui uno ha voglia di raccontarlo) e il
// DETTAGLIO serie per serie di sempre.
function Riepilogo({
  riep,
  dest,
  giornoLibero,
  onRiprendi,
  onSalvaAllenamento,
  onElimina,
  schede,
  diete,
  dati,
  utente,
  onSalvaCommento,
  onSalvaNome,
  onSalvaOrologio,
  onSalvaVisibilita,
  ioId,
}) {
  const [vista, setVista] = useState('card')
  // Il nome dell'allenamento, che si può cambiare nel recap. Vuoto non si
  // salva: la card e il calendario tengono quello di prima.
  const [nome, setNome] = useState(riep?.nomeGiorno || '')
  // Tenerlo o no (solo per gli allenamenti liberi). Si scrive subito, non al
  // "Fatto": chi chiude l'app senza toccare niente ha comunque scelto — di no.
  const [salvato, setSalvato] = useState(() => !!giornoLibero?.salvato)
  const [commento, setCommento] = useState(riep?.nota || '')
  // Chi lo vede. Nasce pubblico (vedi lib/visibilita) e si cambia qui: è il
  // momento in cui uno sa se quell'allenamento vuole farlo vedere o no.
  const [visibilita, setVisibilita] = useState(() => visibilitaDi(riep))
  // Calorie e battiti copiati dall'orologio: campi di testo finché si scrive,
  // numeri (o null) quando si salvano.
  const [orologio, setOrologio] = useState(() => ({
    calorieReali: riep?.calorieReali ?? '',
    fcMedia: riep?.fcMedia ?? '',
    fcMax: riep?.fcMax ?? '',
  }))
  const orologioIniziale = useRef(orologio)

  // Il commento finisce nella card e viene salvato sull'allenamento, così non
  // si perde uscendo. Debounce: non riscriviamo localStorage a ogni tasto.
  useEffect(() => {
    if (commento === (riep?.nota || '')) return
    const id = setTimeout(() => onSalvaCommento?.(commento), 500)
    return () => clearTimeout(id)
  }, [commento, riep, onSalvaCommento])

  // ⚠️ Il confronto è con l'ULTIMO nome salvato, non con quello di partenza:
  // la pagina si ridisegna ogni secondo (il cronometro), e confrontando con
  // `riep` il salvataggio ripartirebbe a ogni giro.
  const nomeSalvato = useRef(riep?.nomeGiorno || '')
  useEffect(() => {
    const pulito = nome.trim()
    if (!pulito || pulito === nomeSalvato.current) return
    const id = setTimeout(() => {
      nomeSalvato.current = pulito
      onSalvaNome?.(pulito)
    }, 500)
    return () => clearTimeout(id)
  }, [nome, onSalvaNome])

  const orologioNumeri = useMemo(
    () => ({
      calorieReali: numeroPositivo(orologio.calorieReali),
      fcMedia: numeroPositivo(orologio.fcMedia),
      fcMax: numeroPositivo(orologio.fcMax),
    }),
    [orologio],
  )

  // Stesso trattamento del commento. `setOrologio` crea sempre un oggetto
  // nuovo, quindi il confronto per identità basta a non salvare al montaggio.
  useEffect(() => {
    if (orologio === orologioIniziale.current) return
    const id = setTimeout(() => onSalvaOrologio?.(orologioNumeri), 500)
    return () => clearTimeout(id)
  }, [orologio, orologioNumeri, onSalvaOrologio])

  return (
    <div className="app">
      <div className="topbar">
        <h1>Riepilogo</h1>
      </div>

      <div className="row" style={{ gap: 8, margin: '4px 0 14px' }}>
        <button
          className={'btn grow' + (vista === 'card' ? ' btn-accent' : '')}
          onClick={() => setVista('card')}
          aria-pressed={vista === 'card'}
        >
          Card
        </button>
        <button
          className={'btn grow' + (vista === 'dettaglio' ? ' btn-accent' : '')}
          onClick={() => setVista('dettaglio')}
          aria-pressed={vista === 'dettaglio'}
        >
          Dettaglio
        </button>
      </div>

      {vista === 'card' ? (
        <RecapCondivisibile
          riep={riep}
          schede={schede}
          diete={diete}
          dati={dati}
          utente={utente}
          nome={nome}
          onNome={setNome}
          commento={commento}
          onCommento={setCommento}
          orologio={orologio}
          onOrologio={(patch) => setOrologio((prev) => ({ ...prev, ...patch }))}
        />
      ) : (
        // Il dettaglio vede subito quello che si sta scrivendo nella card.
        <RiepilogoDettaglio
          riep={{
            ...riep,
            ...orologioNumeri,
            nota: commento,
            nomeGiorno: nome.trim() || riep?.nomeGiorno,
          }}
        />
      )}

      {/* L'allenamento costruito al volo: tenerlo o lasciarlo com'è. In
          calendario e nello storico ci resta in tutti e due i casi — l'unica
          differenza è se compare tra le cose che puoi rifare. */}
      {giornoLibero && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="kicker">Questo allenamento</div>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
            Puoi tenerlo tra i tuoi allenamenti, per ritrovarlo e rifarlo quando vuoi. In
            calendario e nello storico ci resta comunque.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button
              className={'btn grow' + (salvato ? ' btn-accent' : '')}
              aria-pressed={salvato}
              onClick={() => {
                setSalvato(true)
                onSalvaAllenamento?.(true)
              }}
            >
              Salvalo
            </button>
            <button
              className={'btn grow' + (!salvato ? ' btn-accent' : '')}
              aria-pressed={!salvato}
              onClick={() => {
                setSalvato(false)
                onSalvaAllenamento?.(false)
              }}
            >
              Solo per oggi
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <VisibilitaPicker
          valore={visibilita}
          onChange={(v) => {
            setVisibilita(v)
            onSalvaVisibilita?.(v)
          }}
        />
      </div>

      {/* Le foto e i video di oggi: è ADESSO che si hanno in mano. Nel feed si
          sfogliano col recap, e seguono la visibilità scelta qui sopra. Dopo
          si aggiungono dal recap del calendario. */}
      <FotoAllenamento
        chiave={chiaveAllenamento(riep)}
        userId={ioId}
        pubblica={visibilita === VISIBILITA.PUBBLICA}
      />

      {/* ⚠️ SOPRA il "Fatto", non in fondo con le cose pericolose: chi ha
          sfiorato "Termina" per sbaglio arriva qui spaesato e deve vederlo
          subito, senza scorrere. Sbagliare QUESTO tasto invece non costa
          niente — si preme "Termina" un'altra volta e il riepilogo torna
          identico — quindi conviene che si veda. */}
      {onRiprendi && (
        <>
          <button
            className="btn btn-block btn-lg"
            style={{ marginTop: 22 }}
            onClick={() => onRiprendi(commento)}
          >
            ↩ Riprendi l’allenamento
          </button>
          <div className="vis-hint" style={{ marginTop: 6 }}>
            Non era finito? Torni dentro com’eri: serie, pallini e commento restano.
          </div>
        </>
      )}

      <button
        className="btn btn-accent btn-block btn-lg"
        style={{ marginTop: onRiprendi ? 10 : 22 }}
        onClick={() => navigate(dest || routes.scheda(riep.schedaId))}
      >
        Fatto
      </button>

      {/* ⚠️ Un allenamento si puo' buttare via anche subito: una prova, una
          sessione che non conta. Sta in fondo e in sordina — sopra c'e' il
          tasto giusto per il 99% dei casi — e chiede conferma, perche' non si
          torna indietro. ⚠️ NON e' piu' il rimedio al "Termina" premuto per
          sbaglio: per quello c'e' "Riprendi l'allenamento" qui sopra, che
          rimette dentro invece di buttare via. Lo stesso tasto c'e' nel
          calendario e nello Storico, per quando ci si pente dopo. */}
      <TastoConferma
        style={{ marginTop: 10 }}
        etichetta="Cancella questo allenamento"
        domanda="Cancellare questo allenamento? Sparisce dal calendario e dallo storico, e non si torna indietro."
        onConferma={() => onElimina?.()}
      />
      <div style={{ height: 20 }} />
    </div>
  )
}
