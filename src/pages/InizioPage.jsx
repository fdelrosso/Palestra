import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { statoScheda } from '../lib/progression'
import { schedaAttiva, schemaPerSettimana } from '../data/model'
import { formatCarico, formatSerieRip } from '../lib/schema'
import { chiaveDiOggi, classeGiorno, cosaOggi, raccogliCompletamenti, settimanaDi } from '../lib/oggi'
import { pianoScheda, schedaInCorso } from '../lib/pianoScheda'
import { ceAvvisoPt } from '../lib/pt'
import ModoPtSwitch from '../components/ModoPtSwitch'
import { IconChevron, IconClose, IconEdit } from '../components/icons'

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
  consigliato: { kicker: 'Consigliato per oggi', cta: 'Crea', vai: () => navigate(routes.consigliato()) },
  finita: { kicker: 'Scheda finita 🎉', cta: 'Scegli la prossima', vai: () => navigate(routes.home()) },
}

export default function InizioPage() {
  const { schede, sessione, iniziaSessione } = useStore()
  const account = useAccount()
  const { utenteCorrente } = account

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
  // Solo con una scheda: per il consigliato gli esercizi non esistono ancora.
  // La scheda e il giorno da fare oggi, se c'è una scheda in corso: servono
  // sia all'elenco degli esercizi sia a "Inizia allenamento".
  const daFare = useMemo(() => {
    // Un giorno di riposo non ha niente da far partire.
    if (oggi.tipo !== 'scheda' || oggi.riposo) return null
    const sc = schede.find((s) => s.id === oggi.schedaId)
    const stato = sc && statoScheda(sc)
    return stato?.giornoCorrente ? { scheda: sc, giorno: stato.giornoCorrente, settimana: stato.settimana } : null
  }, [oggi, schede])
  const eserciziOggi = useMemo(
    () =>
      (daFare?.giorno.esercizi || []).map((e) => {
        const schema = schemaPerSettimana(e, daFare.settimana)
        return { id: e.id, nome: e.nome, dose: [formatSerieRip(schema), formatCarico(schema)].filter(Boolean).join(' · ') }
      }),
    [daFare],
  )
  // Dritti nella sessione, come "Inizia" nella scheda. Qui non c'è mai un
  // allenamento già aperto da sostituire: con una sessione in corso il
  // riquadro è "In corso · Riprendi" (lib/oggi), e questo tasto non c'è.
  const iniziaOggi = () => {
    iniziaSessione(daFare.scheda, daFare.giorno, daFare.settimana)
    navigate(routes.allenamento())
  }
  // Nel giorno di riposo "Inizia" c'è lo stesso: si sceglie quale giorno della
  // scheda fare, invece di decidere noi.
  const [scegliGiorno, setScegliGiorno] = useState(false)
  const schedaOggi = oggi.tipo === 'scheda' ? schede.find((s) => s.id === oggi.schedaId) : null
  const iniziaGiorno = (giorno) => {
    setScegliGiorno(false)
    iniziaSessione(schedaOggi, giorno, statoScheda(schedaOggi).settimana)
    navigate(routes.allenamento())
  }
  const MAX_ESERCIZI = 6

  // --- settimana ---
  // Gli stessi giorni del calendario (classeGiorno): l'anello coi colori dei
  // muscoli, oggi cerchiato, il programma della scheda tratteggiato.
  const settimana = useMemo(() => {
    const x = schedaInCorso(schede)
    const [a, m, g] = chiaveOggi.split('-').map(Number)
    return settimanaDi(perGiorno, new Date(), x ? pianoScheda(x.scheda, new Date(a, m, g, 12)) : null)
  }, [perGiorno, schede, chiaveOggi])
  const fattiSettimana = settimana.reduce((n, g) => n + g.fatti, 0)
  // L'obiettivo della settimana c'è solo con una scheda in corso: senza, si
  // conta e basta, invece di inventare un numero da raggiungere.
  // È quello della scheda attiva, la stessa del riquadro di oggi.
  const obiettivoSettimana = useMemo(() => schedaInCorso(schede)?.stato.totaliSettimana ?? null, [schede])
  // Nessuna scheda attiva (era archiviata) ma ce ne sono: si invita a sceglierne una.
  const daScegliere = oggi.tipo === 'consigliato' && schede.some(schedaAttiva)

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
      <p className="inizio-conta">
        <strong>
          {fattiSettimana}
          {obiettivoSettimana ? ` di ${obiettivoSettimana}` : ''}
        </strong>{' '}
        {fattiSettimana === 1 ? 'allenamento' : 'allenamenti'} questa settimana
      </p>
      <section className={'inizio-oggi tipo-' + oggi.tipo}>
        <div className="inizio-oggi-testa">
          <h2 className="inizio-oggi-titolo">{oggi.titolo}</h2>
          {schedaOggi && (
            <button
              className="inizio-inizia"
              onClick={daFare ? iniziaOggi : () => setScegliGiorno(true)}
            >
              Inizia allenamento
              <IconChevron width={16} height={16} />
            </button>
          )}
        </div>
        <p className="inizio-oggi-stato">
          {azione.kicker}
          {dettaglio ? ` · ${dettaglio}` : ''}
        </p>
        {eserciziOggi.length > 0 && (
          <ol className="inizio-esercizi">
            {eserciziOggi.slice(0, MAX_ESERCIZI).map((e) => (
              <li key={e.id}>
                <span className="inizio-esercizio-nome">{e.nome}</span>
                {e.dose && <span className="inizio-esercizio-dose">{e.dose}</span>}
              </li>
            ))}
            {eserciziOggi.length > MAX_ESERCIZI && (
              <li className="inizio-esercizi-altri">
                e altri {eserciziOggi.length - MAX_ESERCIZI}
              </li>
            )}
          </ol>
        )}
        {/* Con una scheda si AVVIA dal tasto in alto a destra; la scheda resta
            raggiungibile, ma come seconda scelta. Negli altri casi (in corso,
            fatto, consigliato) il tasto è quello di sempre. */}
        {schedaOggi ? (
          <button className="inizio-libero" onClick={() => azione.vai(oggi)}>
            Vedi la scheda
          </button>
        ) : (
          <button className="inizio-cta" onClick={() => azione.vai(oggi)}>
            {azione.cta}
            <IconChevron width={18} height={18} />
          </button>
        )}
        {daScegliere && (
          <button className="inizio-libero" onClick={() => navigate(routes.home())}>
            o scegli quale scheda seguire
          </button>
        )}
        {oggi.tipo !== 'sessione' && (
          <button className="inizio-libero" onClick={() => navigate(routes.nuovoAllenamento())}>
            <IconEdit width={15} height={15} /> o allenati a mano libera
          </button>
        )}
      </section>
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
                <h3>Oggi è riposo: quale giorno vuoi fare?</h3>
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
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
