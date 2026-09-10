import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { eliminaDatiUtente } from '../lib/utenti'
import { normalizzaDatiFisici } from '../lib/datiFisici'
import { normalizzaScheda } from '../data/model'
import { schedaEsempio } from '../data/seed'
import { erroreDiRete, messaggioErrore, supabase } from '../lib/supabase'
import { accodaProfilo } from '../lib/sync'
import { archiviaAllenamentiUtente } from '../lib/storico'
import { atletiDiPt, isPt, normalizzaCodice, ptDi } from '../lib/pt'
import {
  condivisioniInviate,
  condivisioniRicevute,
  daVedere,
  nuovaCondivisione,
} from '../lib/condivisioni'
import {
  profiloDaRiga,
  accettaRelazione as accettaSuServer,
  amiciSuggeriti as leggiSuggeriti,
  cercaPersona as cercaSuServer,
  cercaPersonaEsito,
  creaCondivisione,
  creaRelazione,
  eliminaCondivisione as eliminaCondivisioneSuServer,
  eliminaRelazione,
  leggiCondivisioni,
  leggiProfiliCollegati,
  leggiRelazioni,
  segnaCondivisione,
} from '../lib/social'
import {
  blobEffimero,
  consumaEffimero as consumaEffimeroSuServer,
  creaEffimero,
  effimeriInviati,
  effimeriRicevuti,
  effimeriSenzaUtente,
  leggiEffimeri,
  pulisciScaduti,
} from '../lib/effimeri'
import {
  STATO,
  TIPO,
  amiciDi,
  nuovaRelazione,
  richiesteInviate,
  richiesteRicevute,
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

// Il profilo di chi ha fatto il login: la stessa traduzione che usa lib/social
// per tutti gli altri, piu' l'email — che e' l'unica cosa che si sa di se' e
// non degli altri.
//
// ⚠️ Una funzione sola apposta. Prima ce n'erano due che facevano lo stesso
// lavoro, e sono divergite alla prima colonna nuova: il codice amico arrivava
// per gli amici e non per se' stessi, e la card "Il tuo codice" restava vuota.
function daRiga(r, email) {
  return { ...profiloDaRiga(r), email: email || '' }
}

// Manda la richiesta al personal trainer di cui si e' scritto il codice in
// registrazione. Torna '' se e' andata (o se non c'era niente da fare), e il
// messaggio da far leggere se non e' andata.
//
// ⚠️ Collegarsi a un PT e' una RICHIESTA, non un fatto compiuto: `pt_id` sul
// profilo dell'atleta lo scrive il database quando il PT accetta. Quindi qui,
// anche quando tutto va bene, non c'e' ancora nessun PT — e infatti non si
// dice che c'e'.
async function collegaAlPt(codice, mioId, ruolo) {
  const q = normalizzaCodice(codice)
  if (!q || ruolo === 'pt') return ''
  const { ok, trovati } = await cercaPersonaEsito(q)
  if (!ok) {
    return `Account creato. Il codice ${q} pero' non l'ho potuto controllare: senza rete non si puo'. Riprova da "Personal trainer" nel menu del profilo.`
  }
  const pt = trovati.find((t) => t.come === 'codice')
  if (!pt) {
    return `Account creato. Il codice ${q} pero' non risulta a nessuno: controllalo e riprova da "Personal trainer" nel menu del profilo.`
  }
  const esito = await creaRelazione(
    nuovaRelazione({ tipo: TIPO.LAVORO, daId: mioId, aId: pt.id }),
  )
  if (!esito.ok) {
    return `Account creato, ma la richiesta a ${pt.nome} non e' partita: ${esito.errore} Riprova da "Personal trainer" nel menu del profilo.`
  }
  return ''
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

  // ⚠️ Amicizie e condivisioni ora vivono sul database, non piu' in
  // localStorage: e' l'unico modo perche' due persone su due telefoni diversi
  // siano davvero amiche. Partono vuote e si riempiono al login.
  const [relazioni, setRelazioni] = useState([])
  const [condivisioni, setCondivisioni] = useState([])
  // `collegati` sono i profili che il database mi lascia vedere: il mio e
  // quelli delle persone a cui sono legato. E' cio' che l'app chiamava `utenti`.
  const [collegati, setCollegati] = useState([])
  const [effimeri, setEffimeri] = useState([])

  // ⚠️ Il profilo vale solo se e' di CHI E' ENTRATO ADESSO. Ricavarlo invece
  // di azzerarlo a mano evita l'istante — piccolo ma reale — in cui, appena
  // usciti o cambiato account, a schermo c'e' ancora il nome di prima.
  const utenteAuthId = sessioneAuth?.user?.id || null
  const profilo = profiloRiga && profiloRiga.id === utenteAuthId ? profiloRiga : null
  const utenteCorrenteId = profilo?.id || null
  // Il profilo mio arriva sempre da `profilo` (che ha anche l'email e la copia
  // locale); gli altri da `collegati`. Cosi' `utenti` torna a voler dire quello
  // che voleva dire prima del cloud, e mezza app funziona senza modifiche.
  const utenti = useMemo(() => {
    const altri = collegati.filter((u) => u.id !== profilo?.id)
    return profilo ? [profilo, ...altri] : []
  }, [profilo, collegati])
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

  // ---- Il sociale: amicizie, richieste, condivisioni -----------------------
  // ⚠️ Una funzione sola per rileggere tutto, richiamata dopo ogni azione. Non
  // si aggiorna lo stato "a mano" indovinando cosa ha fatto il server: le
  // regole di accesso possono aver deciso diversamente (una richiesta accettata
  // fa comparire un profilo che prima non si poteva leggere), e l'unico modo di
  // saperlo e' richiedere. Sono tre query piccole.
  const ricaricaSociale = useCallback(async () => {
    if (!utenteCorrenteId) return
    const [rel, cond, prof, eff] = await Promise.all([
      leggiRelazioni(),
      leggiCondivisioni(),
      leggiProfiliCollegati(),
      leggiEffimeri(),
    ])
    if (rel) setRelazioni(rel)
    if (cond) setCondivisioni(cond)
    if (prof) setCollegati(prof)
    if (eff) setEffimeri(eff)
  }, [utenteCorrenteId])

  // Il primo caricamento ha la sua guardia: se si cambia account mentre le tre
  // query sono in volo, le risposte della persona precedente non devono finire
  // a schermo addosso a quella nuova.
  useEffect(() => {
    if (!utenteCorrenteId) return undefined
    let vivo = true
    ;(async () => {
      const [rel, cond, prof] = await Promise.all([
        leggiRelazioni(),
        leggiCondivisioni(),
        leggiProfiliCollegati(),
      ])
      if (!vivo) return
      if (rel) setRelazioni(rel)
      if (cond) setCondivisioni(cond)
      if (prof) setCollegati(prof)
    })()
    return () => {
      vivo = false
    }
  }, [utenteCorrenteId])

  // Appena si è dentro: via dal server le foto/video scaduti. È l'unico
  // "orologio" che serve — nessun timer di sfondo, perché a impedire che
  // qualcuno li apra dopo la scadenza ci pensa la regola, a ogni richiesta.
  // ⚠️ Dopo il login e non al montaggio: senza sessione la chiamata non
  // passerebbe, ed è giusto che non passi.
  useEffect(() => {
    if (!utenteCorrenteId) return undefined
    let vivo = true
    pulisciScaduti(effimeri).then((vive) => {
      if (vivo) setEffimeri((prev) => (prev.length === vive.length ? prev : vive))
    })
    return () => {
      vivo = false
    }
    // Una volta per accesso: `effimeri` si legge, non si osserva — se no la
    // pulizia ripartirebbe a ogni invio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteCorrenteId])

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
    codiceDelMioPt,
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

    // Il codice del PROPRIO PT, se e' stato scritto in registrazione.
    //
    // ⚠️ Si fa QUI e non nella pagina perche' qui c'e' l'id della sessione
    // appena nata: la pagina, a quel punto, sta gia' sparendo per lasciare
    // posto all'app, e chiamare `associaPt` da li' troverebbe il profilo non
    // ancora caricato ("Nessun profilo attivo").
    //
    // ⚠️ Un codice sbagliato NON fa fallire la registrazione: l'account c'e' ed
    // e' valido, manca solo il collegamento — che si rifa' in dieci secondi dal
    // menu del profilo. Ma non si tace nemmeno: torna un `avvisoPt` che chi
    // chiama fa vedere.
    const avvisoPt = await collegaAlPt(codiceDelMioPt, data.session.user.id, ruolo)

    return { ok: true, avvisoPt }
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

  // Ricontrolla la password di chi e' GIA' dentro, prima di un'azione senza
  // ritorno (oggi: eliminare l'account).
  //
  // ⚠️ Supabase non ha un "controlla e basta": si rifa' il login con le stesse
  // credenziali. Se la password e' giusta la sessione si rinnova — stesso
  // utente, nessun effetto visibile; se e' sbagliata torna un errore e la
  // sessione in corso resta com'era.
  //
  // ⚠️ Senza rete NON si finge di aver controllato: si dice che il controllo
  // non si e' potuto fare. Rete caduta e password sbagliata sono cose opposte,
  // e questa e' l'azione dove confonderle costa di piu'.
  const verificaPasswordAttuale = useCallback(
    async (password) => {
      const email = String(sessioneAuth?.user?.email || profilo?.email || '').trim()
      if (!email) return { ok: false, errore: 'Nessun profilo attivo.' }
      if (!password) return { ok: false, errore: 'Scrivi la password.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) return { ok: true }
      if (erroreDiRete(error)) {
        return { ok: false, errore: 'Nessuna connessione: senza rete non posso controllare la password.' }
      }
      return { ok: false, errore: messaggioErrore(error) }
    },
    [sessioneAuth, profilo],
  )

  // Non esiste piu' "seleziona un profilo dall'elenco": si entra con le proprie
  // credenziali. Resta esposto perche' qualche schermata lo chiama ancora.
  const selezionaUtente = useCallback(() => {}, [])

  // ---- Uscita -------------------------------------------------------------
  const cambiaUtente = useCallback(async () => {
    await supabase.auth.signOut()
    // ⚠️ Via anche la copia locale E quello che si ha in memoria: su un telefono
    // prestato a un amico, i propri allenamenti e le proprie amicizie non devono
    // restare leggibili dopo essere usciti, nemmeno per il tempo di un
    // caricamento.
    setRelazioni([])
    setCondivisioni([])
    setCollegati([])
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
    setEffimeri(effimeriSenzaUtente(effimeri, profilo.id))
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
    async (codice) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      // ⚠️ Il PT si cerca sul SERVER: prima si guardava nella lista dei profili
      // del dispositivo, che ora contiene solo le persone a cui si è già
      // legati — e un PT che non si conosce ancora, per definizione, non c'è.
      const trovati = await cercaSuServer(codice)
      const pt = trovati.find((t) => t.come === 'codice')
      if (!pt) return { ok: false, errore: 'Codice non riconosciuto. Fattelo ridare dal tuo PT.' }
      if (pt.id === utenteCorrente.id) return { ok: false, errore: 'Questo è il tuo codice.' }
      if (utenteCorrente.ptId === pt.id) return { ok: false, errore: 'Ti segue già.' }
      const gia = trovaRelazione(relazioni, TIPO.LAVORO, utenteCorrente.id, pt.id)
      if (gia && gia.stato === STATO.ATTESA)
        return { ok: false, errore: 'Richiesta già mandata: aspetta che risponda.' }
      const esito = await creaRelazione(
        nuovaRelazione({ tipo: TIPO.LAVORO, daId: utenteCorrente.id, aId: pt.id }),
      )
      await ricaricaSociale()
      return esito.ok ? { ok: true, pt } : esito
    },
    [utenteCorrente, relazioni, ricaricaSociale],
  )

  // Toglie l'associazione al PT (i dati dell'atleta restano suoi) e con essa la
  // relazione: se un domani si ricambia idea, si rimanda la richiesta.
  const dissociaPt = useCallback(async () => {
    const ptId = utenteCorrente?.ptId
    // Il legame sta in due posti: `pt_id` sul MIO profilo (che posso togliere
    // io) e la relazione (che posso cancellare da entrambi i lati).
    await patchCorrente({ ptId: null, associatoIl: null }, { pt_id: null, associato_il: null })
    if (ptId) {
      const r = trovaRelazione(relazioni, TIPO.LAVORO, utenteCorrente.id, ptId)
      if (r) await eliminaRelazione(r.id)
    }
    await ricaricaSociale()
    return { ok: true }
  }, [utenteCorrente, patchCorrente, relazioni, ricaricaSociale])

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
    async (altroId) => {
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
      const esito = await creaRelazione(
        nuovaRelazione({ tipo: TIPO.AMICIZIA, daId: utenteCorrente.id, aId: altroId }),
      )
      await ricaricaSociale()
      return esito
    },
    [relazioni, utenteCorrente, ricaricaSociale],
  )

  // ---- Trovare qualcuno che non e' ancora un amico ------------------------
  // ⚠️ Passano dal database e non da `utenti`: `utenti` contiene solo le persone
  // a cui sono gia' legato, e cercare vuol dire per definizione guardare fuori
  // da li'. Che cosa esce e che cosa no lo decide supabase/schema.sql.
  const cercaPersona = useCallback((chiave) => cercaSuServer(chiave), [])
  const amiciSuggeriti = useCallback((limite) => leggiSuggeriti(limite), [])

  /**
   * Risponde a una richiesta ricevuta. Rifiutare CANCELLA la riga (così più
   * avanti si può richiedere di nuovo). Accettando una richiesta di lavoro si
   * scrive anche il `ptId` sul profilo dell'atleta: è lì che l'associazione
   * diventa vera per il resto dell'app.
   */
  const rispondiRichiesta = useCallback(
    async (relId, accetta) => {
      const r = relazioni.find((x) => x.id === relId)
      if (!r || r.aId !== utenteCorrenteId) return { ok: false, errore: 'Richiesta non trovata.' }
      // Rifiutare = cancellare la riga: se un domani si cambia idea, si rimanda
      // la richiesta. E' la scelta di sempre, ora fatta sul database.
      const esito = accetta ? await accettaSuServer(relId) : await eliminaRelazione(relId)
      await ricaricaSociale()
      // ⚠️ Accettare un ATLETA scrive `pt_id` sul profilo DELL'ATLETA, cioè
      // nella riga di un altro. Non lo fa questa funzione e non potrebbe: lo fa
      // `accetta_relazione` dentro il database, dopo aver verificato che la
      // richiesta esista, sia indirizzata a chi sta accettando e sia in attesa.
      // È l'unico modo di concedere quella singola scrittura senza aprire tutte
      // le altre.
      return esito
    },
    [relazioni, utenteCorrenteId, ricaricaSociale],
  )

  // Ritira una richiesta che hai mandato tu e a cui non hanno ancora risposto.
  const annullaRichiesta = useCallback(
    async (relId) => {
      const esito = await eliminaRelazione(relId)
      await ricaricaSociale()
      return esito
    },
    [ricaricaSociale],
  )

  // Toglie un'amicizia (da entrambe le parti: è una relazione sola).
  const rimuoviAmico = useCallback(
    async (altroId) => {
      const r = trovaRelazione(relazioni, TIPO.AMICIZIA, utenteCorrenteId, altroId)
      if (!r) return { ok: true }
      const esito = await eliminaRelazione(r.id)
      await ricaricaSociale()
      return esito
    },
    [relazioni, utenteCorrenteId, ricaricaSociale],
  )

  // Un PT smette di seguire un atleta: via il ptId e via la relazione.
  // Un PT smette di seguire un atleta: via la relazione. Il `pt_id` sul profilo
  // dell'atleta lo toglie lui - non si scrive nella riga di un altro (l'unica
  // deroga e' accettare, e la fa il database dopo aver verificato tutto).
  const rimuoviAtleta = useCallback(
    async (atletaId) => {
      const r = trovaRelazione(relazioni, TIPO.LAVORO, utenteCorrenteId, atletaId)
      if (!r) return { ok: true }
      const esito = await eliminaRelazione(r.id)
      await ricaricaSociale()
      return esito
    },
    [relazioni, utenteCorrenteId, ricaricaSociale],
  )

  // ---- Cosa ci si manda tra amici ----------------------------------------

  /**
   * Manda una scheda / un allenamento / un recap a uno o più amici. Ognuno
   * riceve la SUA copia: quello che mando resta com'era anche se domani lo
   * cambio o lo cancello (vedi lib/condivisioni).
   * @returns {{ok:boolean, quanti?:number, errore?:string}}
   */
  const condividiConAmici = useCallback(
    async (destinatariIds, { tipo, titolo, sottotitolo, payload }) => {
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
      // Una per volta: se una non parte si sa QUALE, e le altre sono partite
      // davvero. Un "ok" complessivo che nasconde un destinatario mancato
      // sarebbe peggio di un errore.
      const falliti = []
      for (const riga of righe) {
        const esito = await creaCondivisione(riga)
        if (!esito.ok) falliti.push(esito.errore)
      }
      await ricaricaSociale()
      if (falliti.length === righe.length) return { ok: false, errore: falliti[0] }
      return { ok: true, quanti: righe.length - falliti.length, nonPartite: falliti.length }
    },
    [utenteCorrente, ricaricaSociale],
  )

  // Aperta: serve a spegnere il pallino delle novita'.
  // Lo stato si aggiorna subito e la scrittura parte dietro: segnare "vista" e'
  // la meno importante delle operazioni, e non deve far aspettare nessuno.
  const segnaCondivisioneVista = useCallback(
    (id) => {
      const ora = new Date().toISOString()
      setCondivisioni((prev) =>
        prev.map((c) => (c.id === id && !c.vistaIl ? { ...c, vistaIl: ora } : c)),
      )
      segnaCondivisione(id, 'vista')
    },
    [],
  )

  // Salvata tra le proprie schede: si segna per non farlo due volte per sbaglio.
  const segnaCondivisioneSalvata = useCallback((id) => {
    const ora = new Date().toISOString()
    setCondivisioni((prev) => prev.map((c) => (c.id === id ? { ...c, salvataIl: ora } : c)))
    segnaCondivisione(id, 'salvata')
  }, [])

  // La butta via chi l'ha ricevuta (o chi l'ha mandata, se ci ripensa).
  const eliminaCondivisione = useCallback(
    async (id) => {
      const esito = await eliminaCondivisioneSuServer(id)
      await ricaricaSociale()
      return esito
    },
    [ricaricaSociale],
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
      // ⚠️ Un file per destinatario, e ogni invio può andare per conto suo:
      // se la foto parte per due amici su tre, si dice quanti — non si finge
      // che siano tre e non si buttano via i due riusciti.
      const righe = []
      let errore = ''
      for (const aId of ids) {
        const esito = await creaEffimero({
          daId: utenteCorrente.id,
          daNome: utenteCorrente.nome,
          aId,
          tipo,
          nome,
          blob,
        })
        if (esito.ok) righe.push(esito.riga)
        else errore = errore || esito.errore
      }
      if (righe.length === 0) return { ok: false, errore: errore || 'Invio non riuscito.' }
      setEffimeri((prev) => [...prev, ...righe])
      return { ok: true, quanti: righe.length, errore }
    },
    [utenteCorrente],
  )

  /** Il file da mostrare nel visore (null se nel frattempo è sparito). */
  const apriEffimero = useCallback((riga) => blobEffimero(riga), [])

  /** L'ha guardato: il blob si cancella subito, la riga resta finché non scade. */
  const consumaEffimero = useCallback(async (riga) => {
    const aggiornata = await consumaEffimeroSuServer(riga)
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
      verificaPasswordAttuale,
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
      cercaPersona,
      amiciSuggeriti,
      ricaricaSociale,
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
      verificaPasswordAttuale,
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
      cercaPersona,
      amiciSuggeriti,
      ricaricaSociale,
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
