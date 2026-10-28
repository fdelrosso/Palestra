import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { statoScheda } from '../lib/progression'
import { schedaAttiva, schemaPerSettimana } from '../data/model'
import { aTempo, caricoDellaFase, fasiDi, formatDurata, formattaCarico, serieRipDiUna } from '../lib/schema'
import { consiglioCarico, storicoCarichi, versoConsiglio } from '../lib/carico'
import { chiaveDiOggi, classeGiorno, cosaOggi, raccogliCompletamenti, settimanaDi } from '../lib/oggi'
import { pianoScheda, schedaAttivaOra, schedaInCorso, storicoProgramma } from '../lib/pianoScheda'
import { conScelta, saltatiPersi } from '../lib/saltati'
import { ceAvvisoPt } from '../lib/pt'
import { diRiscaldamento, riscaldamentoInTesta, vociDi } from '../lib/preparazione'
import { dietaDaDatiFisici, oggiISO } from '../lib/dieta'
import { oggiEAllenamento } from '../lib/consiglio'
import { settimanaFinQui } from '../lib/andamentoDieta'
import ModoPtSwitch from '../components/ModoPtSwitch'
import SchedeDalPt from '../components/SchedeDalPt'
import CardAppAndroid from '../components/CardAppAndroid'
import CardAppIphone from '../components/CardAppIphone'
import TastoConferma from '../components/TastoConferma'
import StradeInizio from '../components/StradeInizio'
import { IconCheck, IconChevron, IconClose, IconEdit } from '../components/icons'

// ---------------------------------------------------------------------------
// La HOME: la prima cosa dopo l'accesso.
//
// Fino alla 39ª era il calendario, con sopra due riquadri e intorno tre menu:
// tanta roba, e la cosa che si cerca aprendo l'app — cosa faccio oggi — era
// una riga fra le altre. Adesso in cima c'è la SETTIMANA (si vede subito se si
// è in pari), poi l'allenamento di oggi, l'unico con un tasto pieno perché è
// il motivo per cui si apre l'app. Dieta e Social hanno la loro linguetta
// nella barra in basso, e il numero di cose da vedere sta sull'icona.
//
//   L  M  M  G  V  S  D        ← tocca: Storico
//   2 di 4 allenamenti questa settimana
//   [ Giorno C ....................................... ]
//   [ ················· Vai › ······················· ]
//
// Il calendario è nello Storico della sezione Allenamento; il profilo si apre
// dall'avatar qui in cima.
// ---------------------------------------------------------------------------

const GIORNI_LETTERA = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function dataDiOggi() {
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function saluto() {
  const h = new Date().getHours()
  return h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}

// Il riquadro grande: cosa dire e dove portare per ognuna delle quattro
// risposte di lib/oggi.
const OGGI = {
  sessione: { kicker: 'In corso', cta: 'Riprendi', vai: () => navigate(routes.allenamento()) },
  fatto: { kicker: 'Fatto oggi ✓', cta: 'Vedi il recap', vai: () => navigate(routes.calendario() + '?oggi') },
  scheda: {
    kicker: 'Allenamento di oggi',
    cta: 'Vai',
    // Dritti al giorno del programma quando è chiaro quale (lib/oggi), se no la
    // scheda: c'è da scegliere.
    vai: (o) => navigate(o.giornoId ? routes.giornoScheda(o.schedaId, o.giornoId) : routes.scheda(o.schedaId)),
  },
  finita: { kicker: 'Scheda finita 🎉', cta: 'Scegli la prossima', vai: () => navigate(routes.home()) },
}

export default function InizioPage() {
  const {
    schede,
    sessione,
    iniziaSessione,
    iniziaAllenamentoLibero,
    aggiornaScheda,
    diario,
    diete,
    preferenze,
    giornoDiario,
    aggiornaGiornoDiario,
  } = useStore()
  const account = useAccount()
  const { utenteCorrente } = account

  // --- la dieta della settimana ---
  // Come la riga degli allenamenti: quanti giorni nell'obiettivo fin qui
  // (lib/andamentoDieta, gli stessi conti di Dieta → Storico). Solo per chi la
  // dieta la usa: a chi non ne ha una, "0 giorni" non dice niente.
  const dietaSettimana = useMemo(
    () =>
      settimanaFinQui({
        diario,
        diete,
        proposta: diete.length ? null : dietaDaDatiFisici(utenteCorrente?.dati, preferenze),
        allenamentoIl: (d) => oggiEAllenamento(schede, d).allenamento,
      }),
    [diario, diete, schede, utenteCorrente, preferenze],
  )
  const mostraDieta = diete.length > 0 || dietaSettimana.segnati > 0
  // La sera, se oggi si è segnato qualcosa e la giornata è ancora aperta, la
  // si chiude da qui: da quel momento conta (lib/andamentoDieta).
  const giornoOggi = giornoDiario(oggiISO())
  const daCompletare = giornoOggi.voci.length > 0 && !giornoOggi.completata && new Date().getHours() >= 18

  const perGiorno = useMemo(() => raccogliCompletamenti(schede), [schede])
  const chiaveOggi = chiaveDiOggi()
  const oggi = useMemo(
    () => cosaOggi({ schede, sessione, perGiorno, chiaveOggi }),
    [schede, sessione, perGiorno, chiaveOggi],
  )
  const azione = OGGI[oggi.tipo]

  // Sotto il titolo: il dettaglio che il titolo non dice.
  // Col programma della scheda il sotto può essere una frase intera ("Oggi
  // sarebbe riposo, ma potresti recuperare B…"): quella si mostra com'è; solo
  // il solito "Nome · Sett 3 · Scheda" perde il nome, che è già il titolo.
  const dettaglio =
    oggi.tipo === 'scheda'
      ? oggi.sub.startsWith(oggi.titolo + ' · ')
        ? oggi.sub.slice(oggi.titolo.length + 3)
        : oggi.sub
      : oggi.tipo === 'fatto'
        ? 'Bel lavoro.'
        : oggi.sub

  // Cosa c'e' da fare oggi, esercizio per esercizio, con serie e peso della
  // settimana in corso: e' quello che uno vuole sapere prima di toccare "Vai".
  // Solo con una scheda: senza, la card è quella delle strade per cominciare.
  // La scheda e il giorno da fare oggi, se c'è una scheda in corso: servono
  // sia all'elenco degli esercizi sia a "Inizia allenamento".
  const daFare = useMemo(() => {
    // Un giorno di riposo non ha niente da far partire.
    if (oggi.tipo !== 'scheda' || oggi.riposo) return null
    const sc = schede.find((s) => s.id === oggi.schedaId)
    const stato = sc && statoScheda(sc)
    // Oggi un allenamento messo a mano nel calendario al posto di quello
    // della scheda (Scheda.programma: uno salvato, o di un'altra scheda): si
    // fa LUI, non il giorno corrente della scheda.
    const voce = sc && pianoScheda(sc)?.oggi?.modificato
    if (voce?.tipo === 'allenamento') {
      const altra = schede.find((s) => s.id === voce.schedaId)
      const g = altra?.giorni.find((x) => x.id === voce.giornoId)
      if (g) return { scheda: altra, giorno: g, settimana: altra.libera ? 1 : statoScheda(altra).settimana }
    }
    return stato?.giornoCorrente ? { scheda: sc, giorno: stato.giornoCorrente, settimana: stato.settimana } : null
  }, [oggi, schede])
  // Serie e peso in due colonne, come la card dell'esercizio nella scheda;
  // il peso col colore del consiglio (lib/carico). Senza intestazioni: col
  // cardio "Serie" e "Peso" non tornavano. Una riga per fase ("1×4 47,5kg",
  // sotto "3×4 52,5kg"): in fila con un "+" non ci stavano.
  const carichi = useMemo(() => storicoCarichi(schede), [schede])
  const eserciziOggi = useMemo(
    () =>
      riscaldamentoInTesta(daFare?.giorno.esercizi || []).map((e) => {
        const schema = schemaPerSettimana(e, daFare.settimana)
        const c = consiglioCarico(e.nome, carichi, { schemaOggi: schema, caricoAttuale: caricoDellaFase(schema, 0) })
        const risc = diRiscaldamento(e)
        // A tempo (cardio, plank) niente colonne: la durata sola ("10 min",
        // "6×1 min"), come serie e peso per gli altri; i dati della macchina no.
        if (aTempo(schema)) {
          const tempo = fasiDi(schema)
            .map((f) => (f.serie > 1 ? `${f.serie}×${formatDurata(f.rip?.sec)}` : formatDurata(f.rip?.sec)))
            .join(' + ')
          return { id: e.id, nome: e.nome, risc, tempo }
        }
        const fasi = fasiDi(schema).map((f) => ({ serie: serieRipDiUna(f), peso: formattaCarico(f.carico) }))
        return { id: e.id, nome: e.nome, risc, fasi, verso: versoConsiglio(c) }
      }),
    [daFare, carichi],
  )
  // Il riscaldamento in un riquadro giallo, come nell'anteprima del giorno:
  // le voci scritte in una riga, poi i cardio di riscaldamento.
  const vociRisc = vociDi(daFare?.giorno.riscaldamento)
  const eserciziRisc = eserciziOggi.filter((e) => e.risc)
  const eserciziResto = eserciziOggi.filter((e) => !e.risc)
  // Dritti nella sessione, come "Inizia" nella scheda. Qui non c'è mai un
  // allenamento già aperto da sostituire: con una sessione in corso il
  // riquadro è "In corso · Riprendi" (lib/oggi), e questo tasto non c'è.
  const iniziaOggi = () => {
    // Uno salvato si rifà come da Programmi: un giorno nuovo, stessi esercizi
    // (iniziaAllenamentoLibero), così le volte prima restano nello storico.
    const g = daFare.giorno
    if (daFare.scheda.libera) {
      iniziaAllenamentoLibero({ nome: g.nome, esercizi: g.esercizi, riscaldamento: g.riscaldamento, stretching: g.stretching })
    } else iniziaSessione(daFare.scheda, g, daFare.settimana)
    navigate(routes.allenamento())
  }
  // "Allenati lo stesso" (riposo) e "Fai un allenamento diverso": si sceglie
  // quale giorno della scheda fare, o uno a mano libera.
  const [scegliGiorno, setScegliGiorno] = useState(false)
  const schedaOggi = oggi.tipo === 'scheda' ? schede.find((s) => s.id === oggi.schedaId) : null
  const iniziaGiorno = (giorno) => {
    setScegliGiorno(false)
    iniziaSessione(schedaOggi, giorno, statoScheda(schedaOggi).settimana)
    navigate(routes.allenamento())
  }
  // Già allenato oggi: si può fare anche il prossimo della scheda.
  const iniziaAnche = () => {
    const sc = schede.find((s) => s.id === oggi.anche.schedaId)
    const stato = statoScheda(sc)
    iniziaSessione(sc, stato.giornoCorrente, stato.settimana)
    navigate(routes.allenamento())
  }
  const MAX_ESERCIZI = 6
  // Una riga: il nome, poi serie e peso (una riga per fase); a tempo, il tempo
  // al centro delle due.
  const rigaEsercizio = (e) => (
    <li key={e.id}>
      <span className="inizio-esercizio-nome">{e.nome}</span>
      {e.tempo ? (
        <span className="inizio-esercizio-dato inizio-esercizio-tempo">{e.tempo}</span>
      ) : (
        <>
          <span className="inizio-esercizio-dato">
            {e.fasi.map((f, i) => (
              <span key={i}>{f.serie}</span>
            ))}
          </span>
          <span className={'inizio-esercizio-dato ' + e.verso}>
            {e.fasi.map((f, i) => (
              <span key={i}>{f.peso || '\u00a0'}</span>
            ))}
          </span>
        </>
      )}
    </li>
  )

  // Gli allenamenti saltati e persi della scheda attiva (lib/saltati): quelli
  // ancora da decidere si chiedono sempre; quelli da recuperare si ricordano
  // nei giorni in cui ci si allena, non dopo aver già finito.
  const schedaSaltati = useMemo(() => schedaAttivaOra(schede), [schede])
  const saltati = useMemo(() => saltatiPersi(schedaSaltati), [schedaSaltati])
  const saltatiVisibili = saltati.filter(
    (x) => !x.stato || (oggi.tipo !== 'fatto' && oggi.tipo !== 'sessione'),
  )
  const scegliSaltato = (x, stato) => aggiornaScheda(conScelta(schedaSaltati, x.chiave, stato))
  const recupera = (x) => {
    iniziaSessione(schedaSaltati, x.giorno, x.settimana, { recupera: x.chiave })
    navigate(routes.allenamento())
  }

  // --- settimana ---
  // Gli stessi giorni del calendario (classeGiorno): l'anello coi colori dei
  // muscoli, oggi cerchiato, il programma della scheda tratteggiato, e i
  // giorni passati come lì: saltato, da recuperare, spostato, pausa.
  const settimana = useMemo(() => {
    const x = schedaInCorso(schede)
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    const oggiAMezzogiorno = new Date(a, m, g, 12)
    return settimanaDi(
      perGiorno,
      new Date(),
      x ? pianoScheda(x.scheda, oggiAMezzogiorno) : null,
      storicoProgramma(schedaAttivaOra(schede), oggiAMezzogiorno),
    )
  }, [perGiorno, schede, chiaveOggi])
  const fattiSettimana = settimana.reduce((n, g) => n + g.fatti, 0)
  // L'obiettivo della settimana c'è solo con una scheda in corso: senza, si
  // conta e basta, invece di inventare un numero da raggiungere.
  // È quello della scheda attiva, la stessa del riquadro di oggi.
  const obiettivoSettimana = useMemo(() => schedaInCorso(schede)?.stato.totaliSettimana ?? null, [schede])
  // Nessuna scheda attiva (era archiviata) ma ce ne sono: si invita a sceglierne una.
  const daScegliere = oggi.tipo === 'consigliato' && schede.some(schedaAttiva)

  // Nessuna scheda in corso: al posto del vecchio "Consigliato per oggi ·
  // Crea" (un "Petto + Tricipiti" tirato fuori dallo storico, che a chi non ha
  // una scheda non diceva cosa fare) le strade per cominciare (2026-10-23).
  // `maiAllenato`: l'account nuovo, a cui si dice "per cominciare".
  const senzaScheda = oggi.tipo === 'consigliato'
  const maiAllenato = perGiorno.size === 0

  const nome = utenteCorrente?.nome || ''
  const avvisoPt = ceAvvisoPt()

  return (
    <div className="app">
      <header className="inizio-testa">
        <div style={{ minWidth: 0 }}>
          <div className="inizio-data">{dataDiOggi()}</div>
          <h1 className="inizio-saluto">
            {saluto()}
            {nome ? `, ${nome.split(' ')[0]}` : ''}
          </h1>
        </div>
      </header>
      <ModoPtSwitch attivo="personale" />
      <SchedeDalPt />
      <CardAppAndroid />
      <CardAppIphone />
      {avvisoPt && (
        <button className="riquadro riquadro-avviso" onClick={() => navigate(routes.profilo())}>
          <span className="grow">Il collegamento col tuo personal trainer non è andato. Tocca per sistemarlo.</span>
          <IconChevron />
        </button>
      )}
      <button className="inizio-settimana" onClick={() => navigate(routes.calendario())} aria-label={`Settimana: ${fattiSettimana} ${fattiSettimana === 1 ? 'allenamento' : 'allenamenti'}`}>
        {settimana.map((g, i) => (
          <span key={g.chiave} className="inizio-giorno" aria-hidden="true">
            <span className="inizio-lettera">{GIORNI_LETTERA[i]}</span>
            <span
              className={classeGiorno({ fatto: g.fatti > 0, oggi: g.oggi, previsto: g.previsto, passato: g.passato })}
              style={g.anello ? { '--anello': g.anello } : undefined}
            >
              {g.giorno}
            </span>
          </span>
        ))}
      </button>
      <p className="inizio-conta" style={mostraDieta ? { marginBottom: 2 } : undefined}>
        <strong>
          {fattiSettimana}
          {obiettivoSettimana ? ` di ${obiettivoSettimana}` : ''}
        </strong>{' '}
        {fattiSettimana === 1 ? 'allenamento' : 'allenamenti'} questa settimana
      </p>
      {mostraDieta && (
        <button className="inizio-conta inizio-conta-dieta" onClick={() => navigate(routes.dietaStorico())}>
          {dietaSettimana.conObiettivo && dietaSettimana.completate > 0 ? (
            <>
              <strong>
                {dietaSettimana.dentro} di {dietaSettimana.completate}
              </strong>{' '}
              {dietaSettimana.completate === 1 ? 'giornata' : 'giornate'} nell’obiettivo della dieta
            </>
          ) : (
            <>
              <strong>{dietaSettimana.segnati}</strong>{' '}
              {dietaSettimana.segnati === 1 ? 'giorno segnato' : 'giorni segnati'} nella dieta
            </>
          )}
          <IconChevron width={14} height={14} />
        </button>
      )}
      {daCompletare && (
        <button
          className="btn btn-sm inizio-completa"
          onClick={() => aggiornaGiornoDiario(oggiISO(), { completata: true, completataIl: new Date().toISOString() })}
        >
          <IconCheck width={15} height={15} /> Giornata completata
        </button>
      )}
      {senzaScheda ? (
        <StradeInizio
          kicker={maiAllenato ? 'Per cominciare' : 'Nessuna scheda in corso'}
          titolo={maiAllenato ? 'Da dove parti?' : 'Come ti alleni?'}
          riprendi={daScegliere}
        />
      ) : (
      <section className={'inizio-oggi tipo-' + oggi.tipo}>
        <div className="inizio-oggi-testa">
          <h2 className="inizio-oggi-titolo">{oggi.titolo}</h2>
          {/* Gli esercizi si vedono già qui sotto: la scheda è solo una freccia. */}
          {schedaOggi && !oggi.riposo && (
            <button className="inizio-freccia" aria-label="Vedi la scheda" onClick={() => azione.vai(oggi)}>
              <IconChevron width={22} height={22} />
            </button>
          )}
          {oggi.riposo && oggi.prossimo && (
            <p className="inizio-prossimo">
              prossimo: <b>{oggi.prossimo.nome}</b>
              <br />
              {oggi.prossimo.quando}
            </p>
          )}
        </div>
        {!oggi.riposo && (
          <p className="inizio-oggi-stato">
            {azione.kicker}
            {dettaglio ? ` · ${dettaglio}` : ''}
          </p>
        )}
        {eserciziOggi.length + vociRisc.length > 0 && (
          <ol className="inizio-esercizi">
            {(vociRisc.length > 0 || eserciziRisc.length > 0) && (
              <li className="inizio-riscaldamento">
                <span className="inizio-riscaldamento-titolo">Riscaldamento</span>
                <ol className="inizio-esercizi">
                  {vociRisc.length > 0 && (
                    <li>
                      <span className="inizio-esercizio-nome inizio-voci">{vociRisc.join(' · ')}</span>
                    </li>
                  )}
                  {eserciziRisc.map(rigaEsercizio)}
                </ol>
              </li>
            )}
            {eserciziResto.slice(0, MAX_ESERCIZI).map(rigaEsercizio)}
            {eserciziResto.length > MAX_ESERCIZI && (
              <li className="inizio-esercizi-altri">
                e altri {eserciziResto.length - MAX_ESERCIZI}
              </li>
            )}
          </ol>
        )}
        {/* Nel riposo la scheda è la cosa da guardare, e allenarsi lo stesso
            viene dopo; negli altri giorni si parte da "Inizia allenamento". */}
        {oggi.riposo ? (
          <>
            <button className="inizio-cta inizio-largo" onClick={() => azione.vai(oggi)}>
              Vedi la scheda
              <IconChevron width={18} height={18} />
            </button>
            <button className="inizio-secondario" onClick={() => setScegliGiorno(true)}>
              Allenati lo stesso
            </button>
          </>
        ) : schedaOggi ? (
          <>
            {/* Prima il tasto per cui si apre l'app, sotto l'alternativa: come nel riposo. */}
            <button className="inizio-cta inizio-largo" onClick={daFare ? iniziaOggi : () => setScegliGiorno(true)}>
              Inizia allenamento
              <IconChevron width={18} height={18} />
            </button>
            <button className="inizio-secondario" onClick={() => setScegliGiorno(true)}>
              Fai un allenamento diverso
            </button>
          </>
        ) : (
          <button className="inizio-cta" onClick={() => azione.vai(oggi)}>
            {azione.cta}
            <IconChevron width={18} height={18} />
          </button>
        )}
        {oggi.tipo === 'fatto' && oggi.anche && (
          <button className="inizio-cta inizio-anche" onClick={iniziaAnche}>
            Fai anche {oggi.anche.nome}
            <IconChevron width={16} height={16} />
          </button>
        )}
        {/* Con la scheda "a mano libera" è fra le scelte di "diverso"/"lo stesso". */}
        {oggi.tipo !== 'sessione' && !schedaOggi && (
          <button className="inizio-libero" onClick={() => navigate(routes.allenamentoLibero())}>
            <IconEdit width={15} height={15} /> o allenati a mano libera
          </button>
        )}
      </section>
      )}
      {saltatiVisibili.length > 0 && (
        <section className="inizio-saltati" aria-label="Allenamenti saltati">
          {saltatiVisibili.map((x) => (
            <div key={x.chiave} className="inizio-saltato">
              <p className="inizio-saltato-testo">
                {x.stato === 'posticipato' ? (
                  <>
                    Da recuperare: <strong>{x.giorno.nome}</strong> · settimana {x.settimana}
                  </>
                ) : (
                  <>
                    Hai saltato <strong>{x.giorno.nome}</strong> della settimana {x.settimana}. Vuoi
                    recuperarlo?
                  </>
                )}
              </p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {x.stato === 'posticipato' ? (
                  <button className="btn btn-accent btn-sm grow" onClick={() => recupera(x)}>
                    Recuperalo ora
                  </button>
                ) : (
                  <>
                    <button className="btn btn-accent btn-sm grow" onClick={() => recupera(x)}>
                      Ora
                    </button>
                    <button className="btn btn-sm grow" onClick={() => scegliSaltato(x, 'posticipato')}>
                      Più avanti
                    </button>
                  </>
                )}
              </div>
              <TastoConferma
                etichetta="Lascialo perdere"
                domanda={`Non ti ricorderò più ${x.giorno.nome} della settimana ${x.settimana}.`}
                si="Sì, lascia perdere"
                className="btn btn-ghost btn-sm btn-block"
                onConferma={() => scegliSaltato(x, 'tolto')}
              />
            </div>
          ))}
        </section>
      )}
      {scegliGiorno &&
        schedaOggi &&
        createPortal(
          <div className="foglio-backdrop" onClick={() => setScegliGiorno(false)}>
            <div
              className="foglio"
              role="dialog"
              aria-label="Quale giorno vuoi fare"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="foglio-maniglia" aria-hidden="true" />
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <h3>{oggi.riposo ? 'Oggi è riposo: quale giorno vuoi fare?' : 'Quale allenamento vuoi fare?'}</h3>
                <button className="icon-btn" aria-label="Chiudi" onClick={() => setScegliGiorno(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {schedaOggi.giorni.map((g) => (
                  <button key={g.id} className="menu-voce" onClick={() => iniziaGiorno(g)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="menu-voce-nome">{g.nome}</span>
                      <span className="menu-voce-desc">
                        {g.esercizi.length} {g.esercizi.length === 1 ? 'esercizio' : 'esercizi'}
                      </span>
                    </span>
                    <IconChevron className="faint" />
                  </button>
                ))}
                {/* "A mano libera" sta qui, fra le scelte, non sotto la card. */}
                <button className="menu-voce" onClick={() => navigate(routes.allenamentoLibero())}>
                  <IconEdit width={18} height={18} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="menu-voce-nome">A mano libera</span>
                    <span className="menu-voce-desc">Scegli tu gli esercizi, fuori dalla scheda</span>
                  </span>
                  <IconChevron className="faint" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
