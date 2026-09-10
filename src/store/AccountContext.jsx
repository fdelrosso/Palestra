import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { eliminaDatiUtente } from '../lib/utenti'
import { normalizzaDatiFisici } from '../lib/datiFisici'
import { normalizzaScheda } from '../data/model'
import { schedaEsempio } from '../data/seed'
import { erroreDiRete, messaggioErrore, supabase } from '../lib/supabase'
import { accodaProfilo } from '../lib/sync'
import { archiviaAllenamentiUtente } from '../lib/storico'
import { atletiDiPt, isPt, normalizzaCodice, ptDi, trovaPtDaCodice } from '../lib/pt'
import {
  caricaCondivisioni,
  condivisioniInviate,
  condivisioniRicevute,
  condivisioniSenzaUtente,
  daVedere,
  nuovaCondivisione,
  salvaCondivisioni,
} from '../lib/condivisioni'
import {
  blobEffimero,
  caricaEffimeri,
  consumaEffimero as consumaEffimeroBlob,
  creaEffimero,
  effimeriInviati,
  effimeriRicevuti,
  effimeriSenzaUtente,
  pulisciScaduti,
  salvaEffimeri,
} from '../lib/effimeri'
import {
  STATO,
  TIPO,
  amiciDi,
  caricaRelazioni,
  nuovaRelazione,
  richiesteInviate,
  richiesteRicevute,
  salvaRelazioni,
  senzaUtente,
  trovaRelazione,
} from '../lib/relazioni'

// ---------------------------------------------------------------------------
// Account: gestisce la lista dei profili e chi è l'utente attivo.
//
// L'utente attivo NON è persistito: ad ogni apertura dell'app si riparte dalla
// schermata "Chi sei?". La lista dei profili, invece, è persistita, così come
// le schede e gli allenamenti di ciascuno (ognuno nel proprio namespace).
//
// Qui passa anche tutto ciò che riguarda i PERSONAL TRAINER (ruolo, codice,
// richiesta di lavoro), le AMICIZIE e ciò che tra amici ci si manda: le
// CONDIVISIONI (schede, allenamenti, recap — restano finché non si cancellano)
// e gli INVII MOMENTANEI di foto e video (spariscono appena guardati, vedi
// lib/effimeri).
//
// Amicizie e rapporti di lavoro sono la stessa cosa — una richiesta che l'altro
// deve accettare — quindi vivono in una lista sola (lib/relazioni).
// L'associazione a un PT diventa vera, cioè scrive `ptId` sul profilo
// dell'atleta, SOLO quando il PT accetta.
// ---------------------------------------------------------------------------

// Il database parla snake_case (codice_pt), l'app camelCase (codicePt). La
// traduzione sta in due funzioni sole: da nessun'altra parte si deve sapere
// come si chiamano le colonne.
function daRiga(r, email) {
  return {
    id: r.id,
    nome: r.nome || '',
    email: email || '',
    ruolo: r.ruolo === 'pt' ? 'pt' : 'atleta',
    codicePt: r.codice_pt || '',
    ptId: r.pt_id || null,
    associatoIl: r.associato_il || null,
    dati: normalizzaDatiFisici(r.dati),
    creatoIl: r.creato_il || '',
  }
}

// ⚠️ COPIA LOCALE DEL PROFILO. Senza, l'app aperta senza rete rimandava alla
// schermata "Benvenuto" chi era gia' dentro: la sessione c'era (Supabase la
// tiene in locale), ma il NOME arrivava solo dal server, e senza nome l'app
// non sa chi ha davanti. Chi apre l'app in un seminterrato non deve credere di
// essere stato buttato fuori.
const CHIAVE_PROFILO = 'palestra:profilo:v1'

function profiloInCache(id) {
  try {
    const p = JSON.parse(localStorage.getItem(CHIAVE_PROFILO) || 'null')
    return p && p.id === id ? p : null
  } catch {
    return null
  }
}

function salvaProfiloInCache(p) {
  try {
    if (p) localStorage.setItem(CHIAVE_PROFILO, JSON.stringify(p))
    else localStorage.removeItem(CHIAVE_PROFILO)
  } catch {
    /* la copia locale e' un di piu': se non entra, pazienza */
  }
}

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  // ⚠️ `profilo` è la riga di `profili` su Supabase, non un profilo locale.
  // `utenti` resta esposto perché mezza app lo legge, ma dalla fase 2b contiene
  // al massimo UNA persona: quella che ha fatto il login. Il database, per
  // scelta, non lascia leggere i profili altrui (vedi supabase/schema.sql), e
  // quindi amicizie, PT e condivisioni restano fermi finché non arriva la
  // tappa 2 con le regole di accesso pensate apposta.
  const [profiloRiga, setProfiloRiga] = useState(null)
  // undefined = non si sa ancora se c'è una sessione (si sta chiedendo).
  // null = nessuna sessione. Serve a non far lampeggiare la schermata di
  // benvenuto in faccia a chi è già dentro.
  const [sessioneAuth, setSessioneAuth] = useState(undefined)

  const [relazioni, setRelazioni] = useState(() => caricaRelazioni())
  const [condivisioni, setCondivisioni] = useState(() => caricaCondivisioni())
  const [effimeri, setEffimeri] = useState(() => caricaEffimeri())

  // ⚠️ Il profilo vale solo se e' di CHI E' ENTRATO ADESSO. Ricavarlo invece
  // di azzerarlo a mano evita l'istante — piccolo ma reale — in cui, appena
  // usciti o cambiato account, a schermo c'e' ancora il nome di prima.
  const utenteAuthId = sessioneAuth?.user?.id || null
  const profilo = profiloRiga && profiloRiga.id === utenteAuthId ? profiloRiga : null
  const utenteCorrenteId = profilo?.id || null
  const utenti = useMemo(() => (profilo ? [profilo] : []), [profilo])
  // undefined = si sta ancora chiedendo a Supabase se c'e' una sessione.
  const caricandoSessione = sessioneAuth === undefined

  // ---- La sessione: chi è entrato, e per quanto ----------------------------
  // Supabase la tiene in localStorage e rinnova il token da sola; qui si
  // ascolta e basta. `onAuthStateChange` scatta anche al login, al logout e al
  // rinnovo, quindi è l'unico posto da cui passa il "chi sei".
  useEffect(() => {
    let vivo = true
    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setSessioneAuth(data?.session || null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sess) => {
      setSessioneAuth(sess || null)
    })
    return () => {
      vivo = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  // ---- Il profilo della persona entrata -----------------------------------
  useEffect(() => {
    if (!utenteAuthId) return undefined
    let vivo = true
    ;(async () => {
      const { data, error } = await supabase
        .from('profili')
        .select('*')
        .eq('id', utenteAuthId)
        .maybeSingle()
      if (!vivo) return
      if (error) {
        // Non si è potuto CHIEDERE: si usa l'ultima copia vista, così l'app si
        // apre lo stesso. È il caso della palestra sottoterra.
        console.warn('Lettura del profilo fallita, uso la copia locale', error.message)
        setProfiloRiga(profiloInCache(utenteAuthId))
        return
      }
      // Il profilo lo crea un trigger del database al momento della
      // registrazione. Se il server risponde e dice che non c'è, non si inventa
      // un profilo vuoto: chi guarda resta fuori invece di entrare in un'app
      // che non sa come si chiama.
      const p = data ? daRiga(data, sessioneAuth.user.email) : null
      setProfiloRiga(p)
      salvaProfiloInCache(p)
    })()
    return () => {
      vivo = false
    }
  }, [utenteAuthId, sessioneAuth])

  useEffect(() => {
    salvaRelazioni(relazioni)
  }, [relazioni])

  useEffect(() => {
    salvaCondivisioni(condivisioni)
  }, [condivisioni])

  useEffect(() => {
    salvaEffimeri(effimeri)
  }, [effimeri])

  // All'avvio: via i blob delle foto/video scaduti. È l'unico "orologio" che
  // serve — nessun timer di sfondo, basta che nessuno possa aprirli dopo.
  useEffect(() => {
    let vivo = true
    pulisciScaduti(caricaEffimeri()).then((vive) => {
      if (vivo) setEffimeri((prev) => (prev.length === vive.length ? prev : vive))
    })
    return () => {
      vivo = false
    }
  }, [])

  // ---- Registrazione ------------------------------------------------------
  // Crea un account VERO su Supabase (email + password) ed entra.
  //
  // Nome, ruolo, codice PT e dati fisici viaggiano come "metadati" della
  // registrazione: e' un trigger del database a copiarli in `profili` (vedi
  // supabase/schema.sql). Lo fa il database e non questa funzione perche' se
  // l'app si chiudesse tra la registrazione e la scrittura del profilo,
  // resterebbe un account senza nome che nessuno potrebbe piu' riparare.
  //
  // Ritorna { ok } oppure { ok:false, errore } gia' in italiano: chi chiama
  // deve poter mostrare l'errore, non interpretarlo.
  const creaUtente = useCallback(async ({
    email,
    password,
    nome,
    ruolo: ruoloScelto,
    codicePt,
    dati,
  }) => {
    const ruolo = ruoloScelto === 'pt' ? 'pt' : 'atleta'
    const creatoIl = new Date().toISOString()
    const { data, error } = await supabase.auth.signUp({
      email: String(email || '').trim(),
      password,
      options: {
        data: {
          nome: String(nome || '').trim(),
          ruolo,
          codice_pt: ruolo === 'pt' ? normalizzaCodice(codicePt) : '',
          dati: normalizzaDatiFisici({ ...dati, aggiornatiIl: creatoIl }),
        },
      },
    })
    if (error) return { ok: false, errore: messaggioErrore(error) }

    // Senza conferma via email la sessione arriva subito. Se un domani la
    // conferma venisse riattivata, `session` sarebbe null: meglio dirlo che
    // lasciare qualcuno davanti a una schermata che non si muove.
    if (!data.session) {
      return { ok: false, errore: 'Controlla la posta e conferma l’email, poi accedi.' }
    }

    // La scheda d'esempio del PT: e' un regalo di benvenuto, quindi si da' una
    // volta sola alla nascita dell'account. Prima la metteva chi leggeva le
    // schede quando non ne trovava — e cosi' sarebbe tornata a ogni nuovo
    // dispositivo, e anche a chi le aveva cancellate tutte apposta.
    if (ruolo !== 'pt') {
      const scheda = normalizzaScheda(schedaEsempio())
      const { error: e2 } = await supabase.from('schede').insert({
        id: scheda.id,
        user_id: data.session.user.id,
        visibilita: scheda.visibilita || 'nascosta',
        libera: !!scheda.libera,
        dati: scheda,
      })
      // Non e' un motivo per fallire la registrazione: l'account c'e' e
      // funziona, semplicemente parte vuoto.
      if (e2) console.warn('Scheda di esempio non inserita', e2.message)
    }

    return { ok: true }
  }, [])

  // ---- Accesso ------------------------------------------------------------
  const accedi = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    })
    return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
  }, [])

  // Manda l'email per reimpostare la password dimenticata.
  const recuperaPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(email || '').trim(),
      { redirectTo: window.location.origin },
    )
    return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
  }, [])

  // Cambia la password di chi e' gia' dentro.
  const cambiaPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { ok: false, errore: messaggioErrore(error) } : { ok: true }
  }, [])

  // Non esiste piu' "seleziona un profilo dall'elenco": si entra con le proprie
  // credenziali. Resta esposto perche' qualche schermata lo chiama ancora.
  const selezionaUtente = useCallback(() => {}, [])

  // ---- Uscita -------------------------------------------------------------
  const cambiaUtente = useCallback(async () => {
    await supabase.auth.signOut()
    // ⚠️ Via anche la copia locale: su un telefono prestato a un amico, i propri
    // allenamenti non devono restare leggibili dopo essere usciti.
    salvaProfiloInCache(null)
    if (utenteCorrenteId) eliminaDatiUtente(utenteCorrenteId)
  }, [utenteCorrenteId])

  // ---- Eliminazione dell'account ------------------------------------------
  // ⚠️ Cancellare un utente e' un'operazione da amministratore: dal browser non
  // si puo' e non si deve poter fare. Lo fa una funzione dentro il database che
  // sa cancellare una cosa sola — chi l'ha chiamata (vedi schema.sql). Il resto
  // (profilo, schede, diete, preferenze, sessione) se ne va a cascata.
  const eliminaUtente = useCallback(async () => {
    if (!profilo) return { ok: false, errore: 'Nessun profilo attivo.' }
    // Gli allenamenti restano nello Storico locale del dispositivo, come prima.
    archiviaAllenamentiUtente(profilo)
    const { error } = await supabase.rpc('elimina_mio_account')
    if (error) return { ok: false, errore: messaggioErrore(error) }
    salvaProfiloInCache(null)
    eliminaDatiUtente(profilo.id)
    setRelazioni((prev) => senzaUtente(prev, profilo.id))
    setCondivisioni((prev) => condivisioniSenzaUtente(prev, profilo.id))
    effimeriSenzaUtente(effimeri, profilo.id).then(setEffimeri)
    await supabase.auth.signOut()
    return { ok: true }
  }, [profilo, effimeri])

  const utenteCorrente = profilo

  // Ritocca il profilo attivo: PRIMA a schermo, POI sul database.
  //
  // ⚠️ L'ordine e' voluto. Cambiare peso o obiettivo deve rispondere subito al
  // dito, non dopo un giro di rete: chi scrive vede il valore nuovo mentre la
  // scrittura e' ancora in volo. Se il database rifiuta, si torna indietro e lo
  // si dice — un valore rimasto a schermo ma non salvato sarebbe la bugia
  // peggiore, perche' nessuno andrebbe a ricontrollarlo.
  const patchCorrente = useCallback(
    async (patch, colonne) => {
      if (!utenteCorrenteId) return { ok: false, errore: 'Nessun profilo attivo.' }
      const precedente = profiloRiga
      const aggiornato = profiloRiga ? { ...profiloRiga, ...patch } : profiloRiga
      setProfiloRiga(aggiornato)
      salvaProfiloInCache(aggiornato)

      const { error } = await supabase
        .from('profili')
        .update(colonne)
        .eq('id', utenteCorrenteId)
      if (!error) return { ok: true }

      // ⚠️ Rete caduta ≠ rifiuto del server, e vanno trattati all'opposto.
      // Se non si è riusciti a PARLARE col server, la modifica è valida e resta:
      // si mette in coda e riparte da sola. Annullarla — come faceva la prima
      // versione — voleva dire far sparire in silenzio il peso che uno aveva
      // appena scritto, mentre la schermata diceva "Dati salvati".
      if (erroreDiRete(error)) {
        accodaProfilo(utenteCorrenteId, colonne)
        return { ok: true, differito: true }
      }
      // Il server ha detto di no: qui sì che si torna indietro, e si dice.
      setProfiloRiga(precedente)
      salvaProfiloInCache(precedente)
      return { ok: false, errore: messaggioErrore(error) }
    },
    [utenteCorrenteId, profiloRiga],
  )

  // I dati fisici del profilo attivo (sesso, età, peso, altezza, movimento,
  // obiettivo). Si scrivono da "I miei dati" e li leggono il recap e la dieta
  // consigliata: è l'unico posto in cui vivono, così cambiare peso li aggiorna
  // ovunque insieme.
  const aggiornaDatiFisici = useCallback(
    (patch) => {
      const dati = normalizzaDatiFisici({
        ...(profilo?.dati || {}),
        ...patch,
        aggiornatiIl: new Date().toISOString(),
      })
      return patchCorrente({ dati }, { dati })
    },
    [profilo, patchCorrente],
  )

  // Chiede a un PT di essere seguiti, col codice che ti ha dato. NON associa
  // subito: manda una richiesta che il PT deve accettare (vedi rispondiRichiesta).
  // Ritorna { ok, errore?, pt? }: l'errore è già il testo da mostrare.
  const associaPt = useCallback(
    (codice) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      const pt = trovaPtDaCodice(codice, utenti)
      if (!pt) return { ok: false, errore: 'Codice non riconosciuto. Fattelo ridare dal tuo PT.' }
      if (pt.id === utenteCorrente.id) return { ok: false, errore: 'Questo è il tuo codice.' }
      if (utenteCorrente.ptId === pt.id) return { ok: false, errore: 'Ti segue già.' }
      const gia = trovaRelazione(relazioni, TIPO.LAVORO, utenteCorrente.id, pt.id)
      if (gia && gia.stato === STATO.ATTESA)
        return { ok: false, errore: 'Richiesta già mandata: aspetta che risponda.' }
      setRelazioni((prev) => [
        ...prev.filter((r) => r.id !== gia?.id),
        nuovaRelazione({ tipo: TIPO.LAVORO, daId: utenteCorrente.id, aId: pt.id }),
      ])
      return { ok: true, pt }
    },
    [utenti, utenteCorrente, relazioni],
  )

  // Toglie l'associazione al PT (i dati dell'atleta restano suoi) e con essa la
  // relazione: se un domani si ricambia idea, si rimanda la richiesta.
  const dissociaPt = useCallback(() => {
    const ptId = utenteCorrente?.ptId
    patchCorrente({ ptId: null, associatoIl: null }, { pt_id: null, associato_il: null })
    if (ptId) {
      setRelazioni((prev) =>
        prev.filter(
          (r) =>
            !(r.tipo === TIPO.LAVORO && (r.daId === utenteCorrente.id || r.aId === utenteCorrente.id) &&
              (r.daId === ptId || r.aId === ptId)),
        ),
      )
    }
  }, [utenteCorrente, patchCorrente])

  // Un atleta diventa PT (utile ai profili nati prima di questa funzione).
  // Non si porta dietro il proprio PT: da qui in poi è lui ad averne altri.
  const diventaPt = useCallback(
    async (codice) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      const c = normalizzaCodice(codice)
      if (c.length < 4) return { ok: false, errore: 'Il codice deve avere almeno 4 caratteri.' }
      // ⚠️ L'unicità del codice NON la controlla più l'app: la garantisce il
      // database (`codice_pt text unique`). Prima si guardavano i profili del
      // dispositivo, che con più dispositivi non vuol dire niente — due PT su
      // due telefoni diversi si sarebbero presi lo stesso codice senza
      // accorgersene. Qui si prova a scrivere e si legge la risposta.
      const esito = await patchCorrente(
        { ruolo: 'pt', codicePt: c, ptId: null, associatoIl: null },
        { ruolo: 'pt', codice_pt: c, pt_id: null, associato_il: null },
      )
      if (!esito.ok && /duplicate key|unique/i.test(esito.errore || '')) {
        return { ok: false, errore: 'Codice già usato da un altro PT. Scegline un altro.' }
      }
      return esito
    },
    [utenteCorrente, patchCorrente],
  )

  // ---- Amicizie e richieste di lavoro ------------------------------------

  // Manda una richiesta di amicizia. Ritorna { ok, errore? }.
  const inviaRichiestaAmicizia = useCallback(
    (altroId) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      if (altroId === utenteCorrente.id) return { ok: false, errore: 'Sei tu.' }
      const gia = trovaRelazione(relazioni, TIPO.AMICIZIA, utenteCorrente.id, altroId)
      if (gia) {
        return {
          ok: false,
          errore:
            gia.stato === STATO.ACCETTATA
              ? 'Siete già amici.'
              : gia.daId === utenteCorrente.id
                ? 'Richiesta già mandata.'
                : 'Ti ha già mandato lui una richiesta: accettala.',
        }
      }
      setRelazioni((prev) => [
        ...prev,
        nuovaRelazione({ tipo: TIPO.AMICIZIA, daId: utenteCorrente.id, aId: altroId }),
      ])
      return { ok: true }
    },
    [relazioni, utenteCorrente],
  )

  /**
   * Risponde a una richiesta ricevuta. Rifiutare CANCELLA la riga (così più
   * avanti si può richiedere di nuovo). Accettando una richiesta di lavoro si
   * scrive anche il `ptId` sul profilo dell'atleta: è lì che l'associazione
   * diventa vera per il resto dell'app.
   */
  const rispondiRichiesta = useCallback(
    (relId, accetta) => {
      const r = relazioni.find((x) => x.id === relId)
      if (!r || r.aId !== utenteCorrenteId) return
      if (!accetta) {
        setRelazioni((prev) => prev.filter((x) => x.id !== relId))
        return
      }
      const ora = new Date().toISOString()
      setRelazioni((prev) =>
        prev.map((x) => (x.id === relId ? { ...x, stato: STATO.ACCETTATA, rispostaIl: ora } : x)),
      )
      // ⚠️ TAPPA 2. Prima, accettare un atleta scriveva `ptId` sul profilo
      // DELL'ATLETA. Con account veri non si puo' e non si deve: nessuno scrive
      // nella riga di un altro — e le regole del database lo impediscono anche
      // se qualcuno ci provasse. Il legame dovra' diventare una tabella sua
      // (una riga con i due id, scrivibile da entrambe le parti), oppure una
      // funzione nel database che accetta la richiesta e aggiorna il profilo
      // dell'atleta con i permessi giusti. Fino ad allora la relazione resta
      // accettata solo sul dispositivo, come tutto il resto del sociale.
    },
    [relazioni, utenteCorrenteId],
  )

  // Ritira una richiesta che hai mandato tu e a cui non hanno ancora risposto.
  const annullaRichiesta = useCallback(
    (relId) =>
      setRelazioni((prev) => prev.filter((x) => !(x.id === relId && x.daId === utenteCorrenteId))),
    [utenteCorrenteId],
  )

  // Toglie un'amicizia (da entrambe le parti: è una relazione sola).
  const rimuoviAmico = useCallback(
    (altroId) =>
      setRelazioni((prev) =>
        prev.filter(
          (r) =>
            !(
              r.tipo === TIPO.AMICIZIA &&
              ((r.daId === utenteCorrenteId && r.aId === altroId) ||
                (r.daId === altroId && r.aId === utenteCorrenteId))
            ),
        ),
      ),
    [utenteCorrenteId],
  )

  // Un PT smette di seguire un atleta: via il ptId e via la relazione.
  const rimuoviAtleta = useCallback(
    (atletaId) => {
      // Come sopra: il `ptId` sta sul profilo dell'atleta e lo togliera' lui,
      // o una funzione del database nella tappa 2. Qui si toglie la relazione.
      setRelazioni((prev) =>
        prev.filter(
          (r) =>
            !(
              r.tipo === TIPO.LAVORO &&
              ((r.daId === atletaId && r.aId === utenteCorrenteId) ||
                (r.daId === utenteCorrenteId && r.aId === atletaId))
            ),
        ),
      )
    },
    [utenteCorrenteId],
  )

  // ---- Cosa ci si manda tra amici ----------------------------------------

  /**
   * Manda una scheda / un allenamento / un recap a uno o più amici. Ognuno
   * riceve la SUA copia: quello che mando resta com'era anche se domani lo
   * cambio o lo cancello (vedi lib/condivisioni).
   * @returns {{ok:boolean, quanti?:number, errore?:string}}
   */
  const condividiConAmici = useCallback(
    (destinatariIds, { tipo, titolo, sottotitolo, payload }) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      const ids = [...new Set(destinatariIds || [])].filter((id) => id && id !== utenteCorrente.id)
      if (ids.length === 0) return { ok: false, errore: 'Scegli almeno un amico.' }
      const righe = ids.map((aId) =>
        nuovaCondivisione({
          tipo,
          daId: utenteCorrente.id,
          daNome: utenteCorrente.nome,
          aId,
          titolo,
          sottotitolo,
          payload,
        }),
      )
      setCondivisioni((prev) => [...prev, ...righe])
      return { ok: true, quanti: righe.length }
    },
    [utenteCorrente],
  )

  // Aperta: serve a spegnere il pallino delle novità.
  const segnaCondivisioneVista = useCallback((id) => {
    const ora = new Date().toISOString()
    setCondivisioni((prev) =>
      prev.map((c) => (c.id === id && !c.vistaIl ? { ...c, vistaIl: ora } : c)),
    )
  }, [])

  // Salvata tra le proprie schede: si segna per non farlo due volte per sbaglio.
  const segnaCondivisioneSalvata = useCallback((id) => {
    const ora = new Date().toISOString()
    setCondivisioni((prev) => prev.map((c) => (c.id === id ? { ...c, salvataIl: ora } : c)))
  }, [])

  // La butta via chi l'ha ricevuta (o chi l'ha mandata, se ci ripensa).
  const eliminaCondivisione = useCallback(
    (id) =>
      setCondivisioni((prev) =>
        prev.filter(
          (c) => !(c.id === id && (c.aId === utenteCorrenteId || c.daId === utenteCorrenteId)),
        ),
      ),
    [utenteCorrenteId],
  )

  /**
   * Manda una foto o un video MOMENTANEO. Ogni destinatario riceve una copia
   * separata del blob: così quando uno la guarda (e sparisce) gli altri ce
   * l'hanno ancora.
   * @returns {Promise<{ok:boolean, quanti?:number, errore?:string}>}
   */
  const inviaEffimero = useCallback(
    async (destinatariIds, { tipo, nome, blob }) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      const ids = [...new Set(destinatariIds || [])].filter((id) => id && id !== utenteCorrente.id)
      if (ids.length === 0) return { ok: false, errore: 'Scegli almeno un amico.' }
      if (!blob) return { ok: false, errore: 'Nessun file da mandare.' }
      const righe = []
      for (const aId of ids) {
        righe.push(
          await creaEffimero({
            daId: utenteCorrente.id,
            daNome: utenteCorrente.nome,
            aId,
            tipo,
            nome,
            blob,
          }),
        )
      }
      setEffimeri((prev) => [...prev, ...righe])
      return { ok: true, quanti: righe.length }
    },
    [utenteCorrente],
  )

  /** Il blob da mostrare nel visore (null se nel frattempo è sparito). */
  const apriEffimero = useCallback((riga) => blobEffimero(riga.id), [])

  /** L'ha guardato: il blob si cancella subito, la riga resta finché non scade. */
  const consumaEffimero = useCallback(async (riga) => {
    const aggiornata = await consumaEffimeroBlob(riga)
    setEffimeri((prev) => prev.map((r) => (r.id === aggiornata.id ? aggiornata : r)))
  }, [])

  const condivisioniMie = useMemo(
    () => ({
      ricevute: condivisioniRicevute(condivisioni, utenteCorrenteId),
      inviate: condivisioniInviate(condivisioni, utenteCorrenteId),
      daVedere: daVedere(condivisioni, utenteCorrenteId),
    }),
    [condivisioni, utenteCorrenteId],
  )

  const effimeriMiei = useMemo(
    () => ({
      ricevuti: effimeriRicevuti(effimeri, utenteCorrenteId),
      inviati: effimeriInviati(effimeri, utenteCorrenteId),
    }),
    [effimeri, utenteCorrenteId],
  )

  // Da id a profilo, saltando quelli che non esistono più.
  const risolvi = useCallback(
    (ids) => [...ids].map((id) => utenti.find((u) => u.id === id)).filter(Boolean),
    [utenti],
  )

  const amici = useMemo(
    () => (utenteCorrenteId ? risolvi(amiciDi(relazioni, utenteCorrenteId)) : []),
    [relazioni, utenteCorrenteId, risolvi],
  )

  // Ogni richiesta viene fuori già accoppiata al profilo dell'altra persona:
  // le pagine non devono rifare la ricerca ogni volta.
  const conUtente = useCallback(
    (righe, campo) =>
      righe
        .map((r) => ({ rel: r, utente: utenti.find((u) => u.id === r[campo]) }))
        .filter((x) => x.utente),
    [utenti],
  )

  const richiesteAmicizia = useMemo(
    () => ({
      ricevute: conUtente(richiesteRicevute(relazioni, utenteCorrenteId, TIPO.AMICIZIA), 'daId'),
      inviate: conUtente(richiesteInviate(relazioni, utenteCorrenteId, TIPO.AMICIZIA), 'aId'),
    }),
    [relazioni, utenteCorrenteId, conUtente],
  )

  // Lavoro: un PT riceve le richieste degli atleti, un atleta ne ha al massimo
  // una in giro (quella al PT di cui ha inserito il codice).
  const richiesteLavoro = useMemo(
    () => ({
      ricevute: conUtente(richiesteRicevute(relazioni, utenteCorrenteId, TIPO.LAVORO), 'daId'),
      inviate: conUtente(richiesteInviate(relazioni, utenteCorrenteId, TIPO.LAVORO), 'aId'),
    }),
    [relazioni, utenteCorrenteId, conUtente],
  )

  // Il PT del profilo attivo (null se autodidatta o se è lui stesso un PT).
  const mioPt = useMemo(() => ptDi(utenteCorrente, utenti), [utenteCorrente, utenti])
  // Gli atleti seguiti, se il profilo attivo è un PT.
  const mieiAtleti = useMemo(
    () => (isPt(utenteCorrente) ? atletiDiPt(utenteCorrente.id, utenti) : []),
    [utenteCorrente, utenti],
  )

  const value = useMemo(
    () => ({
      utenti,
      utenteCorrente,
      caricandoSessione,
      creaUtente,
      accedi,
      recuperaPassword,
      cambiaPassword,
      selezionaUtente,
      cambiaUtente,
      eliminaUtente,
      aggiornaDatiFisici,
      associaPt,
      dissociaPt,
      diventaPt,
      mioPt,
      mieiAtleti,
      relazioni,
      amici,
      richiesteAmicizia,
      richiesteLavoro,
      inviaRichiestaAmicizia,
      rispondiRichiesta,
      annullaRichiesta,
      rimuoviAmico,
      rimuoviAtleta,
      condivisioni: condivisioniMie,
      condividiConAmici,
      segnaCondivisioneVista,
      segnaCondivisioneSalvata,
      eliminaCondivisione,
      effimeri: effimeriMiei,
      inviaEffimero,
      apriEffimero,
      consumaEffimero,
    }),
    [
      utenti,
      utenteCorrente,
      caricandoSessione,
      creaUtente,
      accedi,
      recuperaPassword,
      cambiaPassword,
      selezionaUtente,
      cambiaUtente,
      eliminaUtente,
      aggiornaDatiFisici,
      associaPt,
      dissociaPt,
      diventaPt,
      mioPt,
      mieiAtleti,
      relazioni,
      amici,
      richiesteAmicizia,
      richiesteLavoro,
      inviaRichiestaAmicizia,
      rispondiRichiesta,
      annullaRichiesta,
      rimuoviAmico,
      rimuoviAtleta,
      condivisioniMie,
      condividiConAmici,
      segnaCondivisioneVista,
      segnaCondivisioneSalvata,
      eliminaCondivisione,
      effimeriMiei,
      inviaEffimero,
      apriEffimero,
      consumaEffimero,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount deve stare dentro <AccountProvider>')
  return ctx
}
