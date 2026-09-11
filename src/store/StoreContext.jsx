import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { normalizzaScheda, nuovaScheda, nuovoGiorno } from '../data/model'
import { normalizzaDieta } from '../lib/dieta'
import { normalizzaPreferenze, preferenzeVuote } from '../lib/preferenzeCibo'
import { creaSessione, riepilogoSessione } from '../lib/session'
import { chiaviUtente } from '../lib/utenti'
import { scadeCollettivo } from '../lib/collettivo'
import { riprovaMediaInSospeso } from '../lib/media'
import {
  alRitornoDellaRete,
  leggiCollezione,
  leggiSingolo,
  riprovaCoda,
  sincronizzaCollezione,
  sincronizzaSingolo,
} from '../lib/sync'

// ---------------------------------------------------------------------------
// Store dell'app: schede, diete, preferenze alimentari e allenamento in corso
// della persona che ha fatto il login.
//
// DOVE STANNO I DATI (dalla fase 2b): **su Supabase**, e in copia sul
// dispositivo. Il localStorage non è più il posto dove vivono i dati, è la
// copia che permette all'app di aprirsi subito e di funzionare senza rete —
// perché in palestra la rete spesso non c'è, e un'app ferma su "caricamento…"
// mentre uno ha il bilanciere in mano non serve a niente.
//
// Come si comporta, in ordine:
//   1. all'apertura mostra SUBITO quello che ha in locale (sincrono, come prima);
//   2. poi chiede al server e sostituisce: il server è la verità;
//   3. ogni modifica va prima in locale (quindi non si perde mai) e poi su;
//   4. se non si riesce a mandarla, resta in coda e riparte quando torna la rete.
// Il meccanismo vero sta in lib/sync — qui c'è solo il collegamento con React.
//
// ⚠️ L'ISTANTANEA (`istantanea*`) NON È UN'OTTIMIZZAZIONE, È CIÒ CHE EVITA UN
// GIRO INFINITO. L'effetto che salva scatta a ogni cambiamento di stato, e i
// dati arrivati dal server SONO un cambiamento di stato: senza il confronto con
// l'ultima istantanea sincronizzata, ogni caricamento rispedirebbe al server
// esattamente quello che ne era appena arrivato.
// ---------------------------------------------------------------------------

// Il dispositivo. Non decide più niente: conserva l'ultima copia vista.
function carica(keys) {
  try {
    const raw = localStorage.getItem(keys.schede)
    if (raw) return JSON.parse(raw).map(normalizzaScheda)
  } catch (e) {
    console.warn('Lettura schede fallita', e)
  }
  return []
}

// id -> JSON del documento com'era l'ultima volta che è stato mandato su.
function istantaneaDi(documenti) {
  return new Map(documenti.map((d) => [d.id, JSON.stringify(d)]))
}

function salva(keys, schede) {
  try {
    localStorage.setItem(keys.schede, JSON.stringify(schede))
    localStorage.setItem(keys.seed, '1')
  } catch (e) {
    // ⚠️ Qui ci si finisce davvero: localStorage ha ~5MB e le schede di anni di
    // allenamenti ci arrivano. Non è grave come una volta — la copia che conta
    // è sul server — ma va detto, se no si perde solo il funzionamento offline
    // senza che nessuno se ne accorga.
    console.warn('Copia locale delle schede non salvata (spazio esaurito?)', e)
  }
}

function caricaDiete(keys) {
  try {
    const raw = localStorage.getItem(keys.diete)
    if (raw) return JSON.parse(raw).map(normalizzaDieta)
  } catch (e) {
    console.warn('Lettura diete fallita', e)
  }
  return []
}

function salvaDiete(keys, diete) {
  try {
    localStorage.setItem(keys.diete, JSON.stringify(diete))
  } catch (e) {
    console.warn('Salvataggio diete fallito', e)
  }
}

function caricaPreferenze(keys) {
  try {
    const raw = localStorage.getItem(keys.preferenze)
    if (raw) return normalizzaPreferenze(JSON.parse(raw))
  } catch (e) {
    console.warn('Lettura preferenze alimentari fallita', e)
  }
  return preferenzeVuote()
}

function salvaPreferenze(keys, preferenze) {
  try {
    localStorage.setItem(keys.preferenze, JSON.stringify(preferenze))
  } catch (e) {
    console.warn('Salvataggio preferenze alimentari fallito', e)
  }
}

function caricaSessione(keys) {
  try {
    const raw = localStorage.getItem(keys.sessione)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function salvaSessione(keys, sessione) {
  try {
    if (sessione) localStorage.setItem(keys.sessione, JSON.stringify(sessione))
    else localStorage.removeItem(keys.sessione)
  } catch {
    /* ignora */
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ userId, children }) {
  const keys = useMemo(() => chiaviUtente(userId), [userId])
  const [schede, setSchede] = useState(() => carica(keys))
  const [diete, setDiete] = useState(() => caricaDiete(keys))
  const [preferenze, setPreferenze] = useState(() => caricaPreferenze(keys))
  const [sessione, setSessione] = useState(() => caricaSessione(keys))

  // 'caricamento' finché non si è sentito il server · 'sincronizzato' · 'locale'
  // (il server non risponde: si lavora lo stesso, e si manderà tutto dopo).
  const [statoCloud, setStatoCloud] = useState('caricamento')
  // ⚠️ Finché non si è sentito il server NON si scrive niente su di esso: la
  // copia locale può essere vecchia, e mandarla su cancellerebbe modifiche più
  // recenti fatte dall'altro dispositivo.
  const [idratato, setIdratato] = useState(false)

  const istantaneaSchede = useRef(new Map())
  const istantaneaDiete = useRef(new Map())
  const ultimoInviato = useRef({ preferenze: null, sessione: null })

  // ---- 1. Il server ha l'ultima parola --------------------------------------
  // ⚠️ Non c'è bisogno di rimettere a zero `idratato` e `statoCloud` all'inizio:
  // App.jsx monta questo provider con `key={utenteCorrente.id}`, quindi al
  // cambio di persona il componente si rimonta da capo e i due stati ripartono
  // già dal loro valore iniziale. Rimetterli a mano qui sarebbe un `setState`
  // dentro un effetto, cioè un render in più a ogni avvio, per niente.
  useEffect(() => {
    if (!userId) return undefined
    let vivo = true
    ;(async () => {
      // Prima si smaltisce quello che era rimasto indietro: se si leggesse
      // prima, il server risponderebbe con dati più vecchi delle modifiche che
      // stanno ancora in coda su questo telefono.
      await riprovaCoda()
      const [s, d, p, ss] = await Promise.all([
        leggiCollezione('schede', userId),
        leggiCollezione('diete', userId),
        leggiSingolo('preferenze', userId),
        leggiSingolo('sessione', userId),
      ])
      if (!vivo) return

      const raggiunto = s !== null && d !== null
      if (s) {
        const norm = s.map(normalizzaScheda)
        setSchede(norm)
        istantaneaSchede.current = istantaneaDi(norm)
      } else {
        istantaneaSchede.current = istantaneaDi(carica(keys))
      }
      if (d) {
        const norm = d.map(normalizzaDieta)
        setDiete(norm)
        istantaneaDiete.current = istantaneaDi(norm)
      } else {
        istantaneaDiete.current = istantaneaDi(caricaDiete(keys))
      }
      if (p !== undefined) {
        const norm = normalizzaPreferenze(p || {})
        setPreferenze(norm)
        ultimoInviato.current.preferenze = JSON.stringify(norm)
      }
      if (ss !== undefined) {
        setSessione(ss)
        ultimoInviato.current.sessione = JSON.stringify(ss ?? null)
      }

      setStatoCloud(raggiunto ? 'sincronizzato' : 'locale')
      // Da qui in poi si può scrivere: le istantanee dicono cosa il server ha
      // già, quindi il primo salvataggio non rispedirà tutto da capo.
      setIdratato(true)
    })()

    return () => {
      vivo = false
    }
  }, [userId, keys])

  // ---- 2. Quando torna la rete, riparte la coda ------------------------------
  useEffect(
    () =>
      alRitornoDellaRete(async () => {
        const rimaste = await riprovaCoda()
        // Anche le foto e i video che non erano partiti: il file ce l'ha il
        // telefono, quello che mancava era il viaggio.
        const mediaRimasti = await riprovaMediaInSospeso().catch(() => 0)
        setStatoCloud(rimaste || mediaRimasti ? 'locale' : 'sincronizzato')
      }),
    [],
  )

  // ---- 3. Ogni modifica: prima in locale, poi sul server ---------------------
  // Il locale si scrive SEMPRE e subito (è ciò che rende l'app utilizzabile
  // senza rete); il server solo dopo l'idratazione, e solo per ciò che è
  // davvero cambiato rispetto all'istantanea.
  useEffect(() => {
    salva(keys, schede)
    if (!idratato || !userId) return
    // ⚠️ Le proprie schede compaiono anche nelle viste che guardano TUTTI
    // (Storico, Schede Generali, consigli), e quelle tengono da parte una
    // lettura sola per non riscaricare tutto a ogni pagina. Toccando le
    // proprie, quella copia è vecchia: finito un allenamento, lo si deve
    // ritrovare nello Storico senza chiudere e riaprire l'app.
    scadeCollettivo()
    let vivo = true
    sincronizzaCollezione('schede', userId, schede, istantaneaSchede.current, (s) => ({
      visibilita: s.visibilita || 'nascosta',
      libera: !!s.libera,
    })).then((nuova) => {
      if (!vivo) return
      istantaneaSchede.current = nuova
    })
    return () => {
      vivo = false
    }
  }, [keys, schede, idratato, userId])

  useEffect(() => {
    salvaDiete(keys, diete)
    if (!idratato || !userId) return
    let vivo = true
    sincronizzaCollezione('diete', userId, diete, istantaneaDiete.current).then((nuova) => {
      if (!vivo) return
      istantaneaDiete.current = nuova
    })
    return () => {
      vivo = false
    }
  }, [keys, diete, idratato, userId])

  useEffect(() => {
    salvaPreferenze(keys, preferenze)
    if (!idratato || !userId) return
    const json = JSON.stringify(preferenze)
    if (json === ultimoInviato.current.preferenze) return
    ultimoInviato.current.preferenze = json
    sincronizzaSingolo('preferenze', userId, preferenze)
  }, [keys, preferenze, idratato, userId])

  useEffect(() => {
    salvaSessione(keys, sessione)
    if (!idratato || !userId) return
    const json = JSON.stringify(sessione ?? null)
    if (json === ultimoInviato.current.sessione) return
    ultimoInviato.current.sessione = json
    sincronizzaSingolo('sessione', userId, sessione)
  }, [keys, sessione, idratato, userId])

  const getScheda = useCallback((id) => schede.find((s) => s.id === id) || null, [schede])

  const aggiungiScheda = useCallback((scheda) => {
    const s = normalizzaScheda(scheda)
    setSchede((prev) => [...prev, s])
    return s
  }, [])

  const aggiornaScheda = useCallback((scheda) => {
    const s = normalizzaScheda(scheda)
    setSchede((prev) => prev.map((x) => (x.id === s.id ? s : x)))
    return s
  }, [])

  const eliminaScheda = useCallback((id) => {
    setSchede((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ---- Diete ----
  const getDieta = useCallback((id) => diete.find((d) => d.id === id) || null, [diete])

  const aggiungiDieta = useCallback((dieta) => {
    const d = normalizzaDieta(dieta)
    setDiete((prev) => [...prev, d])
    return d
  }, [])

  const aggiornaDieta = useCallback((dieta) => {
    const d = normalizzaDieta(dieta)
    setDiete((prev) => prev.map((x) => (x.id === d.id ? d : x)))
    return d
  }, [])

  const eliminaDieta = useCallback((id) => {
    setDiete((prev) => prev.filter((d) => d.id !== id))
  }, [])

  // ---- Preferenze alimentari ----
  // Valgono per tutte le diete del profilo: si aggiornano in un posto solo e
  // ogni piano le rispetta (lib/alimenti fa il lavoro sui pasti).
  const aggiornaPreferenze = useCallback((patch) => {
    setPreferenze((prev) =>
      normalizzaPreferenze({
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
        aggiornateIl: new Date().toISOString(),
      }),
    )
  }, [])

  // Aggiorna "per sempre" lo schema di un esercizio, per la settimana indicata
  // (se varia per settimana) oppure lo schema base.
  const aggiornaSchemaEsercizio = useCallback((schedaId, giornoId, esercizioId, settimana, schema) => {
    setSchede((prev) =>
      prev.map((s) => {
        if (s.id !== schedaId) return s
        return {
          ...s,
          giorni: s.giorni.map((g) =>
            g.id !== giornoId
              ? g
              : {
                  ...g,
                  esercizi: g.esercizi.map((e) => {
                    if (e.id !== esercizioId) return e
                    if (e.variaPerSettimana) {
                      return {
                        ...e,
                        settimane: e.settimane.map((sc, i) =>
                          i === settimana - 1 ? { ...sc, ...schema } : sc,
                        ),
                      }
                    }
                    return { ...e, schemaBase: { ...e.schemaBase, ...schema } }
                  }),
                },
          ),
        }
      }),
    )
  }, [])

  // Aggiorna (merge) i campi di un esercizio dentro una scheda. Usato per
  // commenti/media aggiunti durante l'allenamento (che non passano dall'editor).
  const aggiornaEsercizio = useCallback((schedaId, giornoId, esercizioId, patch) => {
    setSchede((prev) =>
      prev.map((s) => {
        if (s.id !== schedaId) return s
        return {
          ...s,
          giorni: s.giorni.map((g) =>
            g.id !== giornoId
              ? g
              : {
                  ...g,
                  esercizi: g.esercizi.map((e) =>
                    e.id !== esercizioId ? e : { ...e, ...patch },
                  ),
                },
          ),
        }
      }),
    )
  }, [])

  // ---- Sessione di allenamento ----
  const iniziaSessione = useCallback((scheda, giorno, settimana) => {
    const s = creaSessione(scheda, giorno, settimana)
    setSessione(s)
    return s
  }, [])

  // Avvia un allenamento "libero" (generato dal consiglio, non legato a una
  // scheda del PT). Lo appoggia a una scheda-contenitore nascosta `libera:true`
  // così il completamento finisce regolarmente in calendario/storico e alimenta
  // i futuri consigli. Ogni allenamento è un nuovo giorno (id unico) per non
  // sovrascrivere lo storico precedente.
  const iniziaAllenamentoLibero = useCallback(
    (giornoData) => {
      const giorno = nuovoGiorno({
        tipo: 'workout',
        nome: giornoData.nome || 'Allenamento consigliato',
        esercizi: giornoData.esercizi || [],
        // Chi non sceglie non tiene: la domanda si fa nel riepilogo, a fine
        // allenamento, quando si sa se valeva la pena rifarlo.
        salvato: false,
      })
      const esistente = schede.find((s) => s.libera)
      const scheda = esistente
        ? { ...esistente, giorni: [...esistente.giorni, giorno] }
        : normalizzaScheda(
            nuovaScheda({
              nome: 'Allenamenti consigliati',
              libera: true,
              numeroSettimane: 1,
              giorni: [giorno],
            }),
          )
      setSchede((prev) =>
        esistente ? prev.map((s) => (s.id === scheda.id ? scheda : s)) : [...prev, scheda],
      )
      const s = creaSessione(scheda, giorno, 1)
      setSessione(s)
      return s
    },
    [schede],
  )

  // Tenere o no un allenamento libero: la scelta del riepilogo. `salvato:true`
  // lo fa comparire in "Schede e allenamenti" come cosa da poter rifare; false
  // lo lascia dov'è — in calendario e nello storico — senza allungare un elenco
  // che deve restare leggibile. ⚠️ Non cancella niente in nessuno dei due casi.
  // Cancellare un allenamento gia' svolto. Si identifica con la sua `data`
  // (l'istante esatto in cui e' finito): e' unica, e soprattutto e' l'unica
  // cosa che hanno in mano tutti e tre i posti da cui si cancella — il
  // riepilogo, il calendario e lo storico, che legge dal server e non sa in
  // quale scheda stia la riga.
  // ⚠️ `schedaId` restringe la ricerca quando si sa dove guardare, ma non e'
  // obbligatorio: i completamenti piu' vecchi non ce l'hanno.
  // ⚠️ Sparisce per davvero e non si torna indietro. La conferma la chiede chi
  // preme il tasto: qui si esegue e basta.
  const eliminaCompletamento = useCallback((data, schedaId = null) => {
    if (!data) return
    setSchede((prev) =>
      prev.map((s) =>
        schedaId && s.id !== schedaId
          ? s
          : { ...s, completamenti: (s.completamenti || []).filter((c) => c.data !== data) },
      ),
    )
  }, [])

  const salvaAllenamento = useCallback((schedaId, giornoId, salvato) => {
    setSchede((prev) =>
      prev.map((s) =>
        s.id !== schedaId
          ? s
          : { ...s, giorni: s.giorni.map((g) => (g.id === giornoId ? { ...g, salvato } : g)) },
      ),
    )
  }, [])

  const aggiornaSessione = useCallback((next) => {
    setSessione((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  const annullaSessione = useCallback(() => setSessione(null), [])

  // Termina la sessione: salva il riepilogo come completamento della scheda e
  // ritorna il riepilogo per la schermata finale.
  // Ritocca un allenamento già completato (es. il commento scritto nel recap
  // di fine allenamento). Il completamento è identificato da scheda + data.
  const aggiornaCompletamento = useCallback((schedaId, data, patch) => {
    setSchede((prev) =>
      prev.map((s) =>
        s.id !== schedaId
          ? s
          : {
              ...s,
              completamenti: (s.completamenti || []).map((c) =>
                c.data === data ? { ...c, ...patch } : c,
              ),
            },
      ),
    )
  }, [])

  const terminaSessione = useCallback(() => {
    if (!sessione) return null
    const riep = riepilogoSessione(sessione, new Date().toISOString())
    setSchede((prev) =>
      prev.map((s) => {
        if (s.id !== sessione.schedaId) return s
        const completamenti = s.completamenti.filter(
          (c) => !(c.settimana === riep.settimana && c.giornoId === riep.giornoId),
        )
        return { ...s, completamenti: [...completamenti, riep] }
      }),
    )
    setSessione(null)
    return riep
  }, [sessione])

  const value = useMemo(
    () => ({
      statoCloud,
      schede,
      getScheda,
      aggiungiScheda,
      aggiornaScheda,
      eliminaScheda,
      aggiornaSchemaEsercizio,
      aggiornaEsercizio,
      diete,
      getDieta,
      aggiungiDieta,
      aggiornaDieta,
      eliminaDieta,
      preferenze,
      aggiornaPreferenze,
      aggiornaCompletamento,
      eliminaCompletamento,
      sessione,
      iniziaSessione,
      iniziaAllenamentoLibero,
      salvaAllenamento,
      aggiornaSessione,
      annullaSessione,
      terminaSessione,
    }),
    [
      statoCloud,
      schede,
      getScheda,
      aggiungiScheda,
      aggiornaScheda,
      eliminaScheda,
      aggiornaSchemaEsercizio,
      aggiornaEsercizio,
      diete,
      getDieta,
      aggiungiDieta,
      aggiornaDieta,
      eliminaDieta,
      preferenze,
      aggiornaPreferenze,
      aggiornaCompletamento,
      eliminaCompletamento,
      sessione,
      iniziaSessione,
      iniziaAllenamentoLibero,
      salvaAllenamento,
      aggiornaSessione,
      annullaSessione,
      terminaSessione,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve stare dentro <StoreProvider>')
  return ctx
}
