import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { navigate, routes } from '../lib/router'
import { statoScheda } from '../lib/progression'
import { schemaPerSettimana } from '../data/model'
import { formatCarico, formatSerieRip } from '../lib/schema'
import { dietaDaDatiFisici, dietaDiOggi, oggiISO } from '../lib/dieta'
import { totaliGiorno } from '../lib/diario'
import { oggiEAllenamento } from '../lib/consiglio'
import { chiaveDiOggi, cosaOggi, raccogliCompletamenti, settimanaDi } from '../lib/oggi'
import { ceAvvisoPt } from '../lib/pt'
import useMessaggiNonLetti from '../hooks/useMessaggiNonLetti'
import ModoPtSwitch from '../components/ModoPtSwitch'
import { IconAbbraccio, IconApple, IconChevron, IconEdit } from '../components/icons'

// ---------------------------------------------------------------------------
// La HOME: la prima cosa dopo l'accesso.
//
// Fino alla 39ª era il calendario, con sopra due riquadri e intorno tre menu:
// tanta roba, e la cosa che si cerca aprendo l'app — cosa faccio oggi — era
// una riga fra le altre. Adesso in cima c'è la SETTIMANA (si vede subito se si
// è in pari), poi l'allenamento di oggi, l'unico con un tasto pieno perché è
// il motivo per cui si apre l'app, e sotto dieta e social come righe.
//
//   L  M  M  G  V  S  D        ← tocca: Storico
//   2 di 4 allenamenti questa settimana
//   [ Giorno C ....................................... ]
//   [ ················· Vai › ······················· ]
//   Dieta   1240 di 2200 kcal ▬▬▬▬▬───── ›
//   Social  2 messaggi ······················· ›
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
  scheda: { kicker: 'Allenamento di oggi', cta: 'Vai', vai: (o) => navigate(routes.scheda(o.schedaId)) },
  consigliato: { kicker: 'Consigliato per oggi', cta: 'Crea', vai: () => navigate(routes.consigliato()) },
}

export default function InizioPage() {
  const { schede, sessione, diete, preferenze, giornoDiario, iniziaSessione } = useStore()
  const account = useAccount()
  const { utenteCorrente, richiesteAmicizia, condivisioni, effimeri } = account
  const nonLetti = useMessaggiNonLetti(utenteCorrente?.id, 'inizio')

  const perGiorno = useMemo(() => raccogliCompletamenti(schede), [schede])
  const chiaveOggi = chiaveDiOggi()
  const oggi = useMemo(
    () => cosaOggi({ schede, sessione, perGiorno, chiaveOggi }),
    [schede, sessione, perGiorno, chiaveOggi],
  )
  const azione = OGGI[oggi.tipo]

  // Sotto il titolo: il dettaglio che il titolo non dice.
  const dettaglio =
    oggi.tipo === 'scheda' ? oggi.sub.split(' · ').slice(1).join(' · ') : oggi.tipo === 'fatto' ? 'Bel lavoro.' : oggi.sub

  // Cosa c'e' da fare oggi, esercizio per esercizio, con serie e peso della
  // settimana in corso: e' quello che uno vuole sapere prima di toccare "Vai".
  // Solo con una scheda: per il consigliato gli esercizi non esistono ancora.
  // La scheda e il giorno da fare oggi, se c'è una scheda in corso: servono
  // sia all'elenco degli esercizi sia a "Inizia allenamento".
  const daFare = useMemo(() => {
    if (oggi.tipo !== 'scheda') return null
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
  const MAX_ESERCIZI = 6

  // --- dieta di oggi ---
  // ⚠️ Il numero grande è quello delle calorie ASSUNTE: è ciò che uno cerca
  // aprendo l'app a metà giornata, e l'obiettivo gli sta accanto per dargli
  // una misura. L'obiettivo arriva dalla dieta salvata o, se non c'è, da
  // quella calcolata dai dati del profilo; se mancano anche quelli non si
  // inventa niente e il riquadro dice cosa fare — è la porta per impostarla.
  const dieta = useMemo(
    () => dietaDiOggi(diete) || dietaDaDatiFisici(utenteCorrente?.dati, preferenze),
    [diete, utenteCorrente, preferenze],
  )
  const bilancio = useMemo(() => {
    const info = oggiEAllenamento(schede)
    const piano = dieta ? (info.allenamento ? dieta.allenamento : dieta.riposo) : null
    return { piano, mangiato: totaliGiorno(giornoDiario(oggiISO())) }
  }, [dieta, schede, giornoDiario])
  const quota = (fatto, obiettivo) => (obiettivo > 0 ? Math.min(100, Math.round((fatto / obiettivo) * 100)) : 0)

  // --- settimana ---
  const settimana = useMemo(() => settimanaDi(perGiorno), [perGiorno])
  const fattiSettimana = settimana.reduce((n, g) => n + g.fatti, 0)
  // L'obiettivo della settimana c'è solo con una scheda in corso: senza, si
  // conta e basta, invece di inventare un numero da raggiungere.
  const obiettivoSettimana = useMemo(() => {
    const sc = schede.find((s) => !s.libera && statoScheda(s).giornoCorrente)
    return sc ? statoScheda(sc).totaliSettimana : null
  }, [schede])

  // --- social ---
  const richieste = richiesteAmicizia.ricevute.length
  const ricevuti = condivisioni.daVedere + effimeri.ricevuti.length
  const righeSocial = [
    nonLetti > 0 && `${nonLetti} ${nonLetti === 1 ? 'messaggio' : 'messaggi'}`,
    richieste > 0 && `${richieste} ${richieste === 1 ? 'richiesta' : 'richieste'}`,
    ricevuti > 0 && `${ricevuti} ${ricevuti === 1 ? 'cosa ricevuta' : 'cose ricevute'}`,
  ].filter(Boolean)

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
          <span key={g.chiave} className={'inizio-giorno' + (g.oggi ? ' oggi' : '')} aria-hidden="true">
            <span className="inizio-lettera">{GIORNI_LETTERA[i]}</span>
            <span className={'inizio-pallino' + (g.fatti ? ' fatto' : '')} />
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
        <h2 className="inizio-oggi-titolo">{oggi.titolo}</h2>
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
        {/* Con una scheda il tasto pieno AVVIA l'allenamento; la scheda resta
            raggiungibile, ma come seconda scelta. Negli altri casi (in corso,
            fatto, consigliato) il tasto è quello di sempre. */}
        {daFare ? (
          <>
            <button className="inizio-cta" onClick={iniziaOggi}>
              Inizia allenamento
              <IconChevron width={18} height={18} />
            </button>
            <button className="inizio-libero" onClick={() => azione.vai(oggi)}>
              Vedi la scheda
            </button>
          </>
        ) : (
          <button className="inizio-cta" onClick={() => azione.vai(oggi)}>
            {azione.cta}
            <IconChevron width={18} height={18} />
          </button>
        )}
        {oggi.tipo !== 'sessione' && (
          <button className="inizio-libero" onClick={() => navigate(routes.nuovoAllenamento())}>
            <IconEdit width={15} height={15} /> o allenati a mano libera
          </button>
        )}
      </section>
      <div className="inizio-righe">
        <button className="inizio-riga" onClick={() => navigate(routes.dietaOggi())}>
          <span className="inizio-riga-nome"><IconApple width={16} height={16} /> Dieta</span>
          {bilancio.piano ? (
            <span className="inizio-riga-corpo">
              <span className="inizio-kcal">
                {Math.round(bilancio.mangiato.kcal)} <small>di {bilancio.piano.kcal || '—'} kcal</small>
              </span>
              <span className="inizio-barra" aria-hidden="true">
                <span style={{ width: `${quota(bilancio.mangiato.kcal, bilancio.piano.kcal)}%` }} />
              </span>
            </span>
          ) : (
            <span className="inizio-riga-corpo riquadro-vuoto">Imposta la tua dieta</span>
          )}
          <IconChevron className="faint" />
        </button>
        <button className="inizio-riga" onClick={() => navigate(routes.feed())}>
          <span className="inizio-riga-nome"><IconAbbraccio width={16} height={16} /> Social</span>
          <span className="inizio-riga-corpo inizio-testo">{righeSocial.length ? righeSocial.join(' · ') : 'Guarda cosa hanno fatto gli altri'}</span>
          {righeSocial.length > 0 && <span className="pallino-notifica">{nonLetti + richieste + ricevuti}</span>}
          <IconChevron className="faint" />
        </button>
      </div>
    </div>
  )
}
