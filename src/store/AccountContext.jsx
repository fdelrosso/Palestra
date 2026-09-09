import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  caricaUtenti,
  eliminaDatiUtente,
  migraSeNecessario,
  nuovoId,
  salvaUtenti,
} from '../lib/utenti'
import { creaHashPassword, verificaPassword } from '../lib/password'
import { normalizzaDatiFisici } from '../lib/datiFisici'
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

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [utenti, setUtenti] = useState(() => {
    migraSeNecessario()
    return caricaUtenti()
  })
  const [relazioni, setRelazioni] = useState(() => caricaRelazioni())
  const [condivisioni, setCondivisioni] = useState(() => caricaCondivisioni())
  const [effimeri, setEffimeri] = useState(() => caricaEffimeri())
  // Nessun utente selezionato al primo avvio: mostra "Chi sei?".
  const [utenteCorrenteId, setUtenteCorrenteId] = useState(null)

  useEffect(() => {
    salvaUtenti(utenti)
  }, [utenti])

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

  // Crea un profilo con password (hash + salt) ed entra. Async per l'hashing.
  // `opzioni`: { ruolo: 'atleta'|'pt', codicePt (se PT), codiceInserito (se
  // atleta che conosce già il codice del suo PT), dati (i dati fisici) }.
  const creaUtente = useCallback(
    async (nome, password, opzioni = {}) => {
      const cred = await creaHashPassword(password)
      const ruolo = opzioni.ruolo === 'pt' ? 'pt' : 'atleta'
      const creatoIl = new Date().toISOString()
      const u = {
        id: nuovoId(),
        nome: nome.trim(),
        creatoIl,
        ruolo,
        codicePt: ruolo === 'pt' ? normalizzaCodice(opzioni.codicePt) : '',
        ptId: null,
        associatoIl: null,
        dati: normalizzaDatiFisici({ ...opzioni.dati, aggiornatiIl: creatoIl }),
        ...cred,
      }
      // Atleta che ha inserito subito il codice del suo PT: parte la RICHIESTA
      // di lavoro, che il PT dovrà accettare. Si entra comunque: il profilo
      // esiste e funziona anche prima della risposta.
      if (ruolo !== 'pt' && opzioni.codiceInserito) {
        const pt = trovaPtDaCodice(opzioni.codiceInserito, utenti)
        if (pt) {
          setRelazioni((prev) => [
            ...prev,
            nuovaRelazione({ tipo: TIPO.LAVORO, daId: u.id, aId: pt.id }),
          ])
        }
      }
      setUtenti((prev) => [...prev, u])
      setUtenteCorrenteId(u.id)
      return u
    },
    [utenti],
  )

  // Verifica la password del profilo e, se corretta, entra. Ritorna true/false.
  // Un profilo senza password (legacy) entra direttamente.
  const accedi = useCallback(
    async (id, password) => {
      const u = utenti.find((x) => x.id === id)
      if (!u) return false
      const ok = await verificaPassword(password, u)
      if (ok) setUtenteCorrenteId(id)
      return ok
    },
    [utenti],
  )

  const selezionaUtente = useCallback((id) => setUtenteCorrenteId(id), [])

  // Torna alla schermata "Chi sei?" senza toccare i dati.
  const cambiaUtente = useCallback(() => setUtenteCorrenteId(null), [])

  const eliminaUtente = useCallback(
    (id) => {
      // Prima di cancellare i dati: conserva gli allenamenti nello Storico
      // globale, così restano visibili anche dopo l'eliminazione del profilo.
      const u = utenti.find((x) => x.id === id)
      if (u) archiviaAllenamentiUtente(u)
      eliminaDatiUtente(id)
      // Se era un PT, i suoi atleti restano senza: meglio azzerare il legame
      // che lasciarne uno che punta a un profilo che non c'è più.
      setUtenti((prev) =>
        prev
          .filter((x) => x.id !== id)
          .map((x) => (x.ptId === id ? { ...x, ptId: null, associatoIl: null } : x)),
      )
      // Via anche amicizie e richieste: non hanno più due lati.
      setRelazioni((prev) => senzaUtente(prev, id))
      // E via quello che aveva mandato o ricevuto (i blob compresi).
      setCondivisioni((prev) => condivisioniSenzaUtente(prev, id))
      effimeriSenzaUtente(effimeri, id).then(setEffimeri)
      setUtenteCorrenteId((cur) => (cur === id ? null : cur))
    },
    [utenti, effimeri],
  )

  const utenteCorrente = useMemo(
    () => utenti.find((u) => u.id === utenteCorrenteId) || null,
    [utenti, utenteCorrenteId],
  )

  // Ritocca il profilo attivo (usato da tutte le operazioni sul PT).
  const patchCorrente = useCallback(
    (patch) =>
      setUtenti((prev) => prev.map((u) => (u.id === utenteCorrenteId ? { ...u, ...patch } : u))),
    [utenteCorrenteId],
  )

  // I dati fisici del profilo attivo (sesso, età, peso, altezza, movimento,
  // obiettivo). Si scrivono da "I miei dati" e li leggono il recap e la dieta
  // consigliata: è l'unico posto in cui vivono, così cambiare peso li aggiorna
  // ovunque insieme.
  const aggiornaDatiFisici = useCallback(
    (patch) =>
      setUtenti((prev) =>
        prev.map((u) =>
          u.id !== utenteCorrenteId
            ? u
            : {
                ...u,
                dati: normalizzaDatiFisici({
                  ...u.dati,
                  ...patch,
                  aggiornatiIl: new Date().toISOString(),
                }),
              },
        ),
      ),
    [utenteCorrenteId],
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
    patchCorrente({ ptId: null, associatoIl: null })
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
    (codice) => {
      if (!utenteCorrente) return { ok: false, errore: 'Nessun profilo attivo.' }
      const c = normalizzaCodice(codice)
      if (c.length < 4) return { ok: false, errore: 'Il codice deve avere almeno 4 caratteri.' }
      const gia = trovaPtDaCodice(c, utenti)
      if (gia && gia.id !== utenteCorrente.id)
        return { ok: false, errore: 'Codice già usato da un altro PT. Scegline un altro.' }
      patchCorrente({ ruolo: 'pt', codicePt: c, ptId: null, associatoIl: null })
      return { ok: true }
    },
    [utenti, utenteCorrente, patchCorrente],
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
      if (r.tipo === TIPO.LAVORO) {
        // r.daId = l'atleta che ha chiesto, r.aId = il PT (cioè io).
        setUtenti((prev) =>
          prev.map((u) => (u.id === r.daId ? { ...u, ptId: r.aId, associatoIl: ora } : u)),
        )
      }
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
      setUtenti((prev) =>
        prev.map((u) =>
          u.id === atletaId && u.ptId === utenteCorrenteId
            ? { ...u, ptId: null, associatoIl: null }
            : u,
        ),
      )
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
      creaUtente,
      accedi,
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
      creaUtente,
      accedi,
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
