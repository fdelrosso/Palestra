import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { normalizzaScheda, nuovaScheda, nuovoGiorno } from '../data/model'
import { normalizzaDieta } from '../lib/dieta'
import { normalizzaPreferenze, preferenzeVuote } from '../lib/preferenzeCibo'
import { schedaEsempio } from '../data/seed'
import { creaSessione, riepilogoSessione } from '../lib/session'
import { chiaviUtente } from '../lib/utenti'

// ---------------------------------------------------------------------------
// Store dell'app: tiene le schede dell'utente attivo in memoria e le persiste.
//
// Le chiavi localStorage sono "namespacizzate" per utente (vedi lib/utenti):
// ogni profilo ha schede, seed e sessione separati. Il provider va montato con
// `key={userId}` così che al cambio utente lo stato si reinizializzi dai dati
// giusti. La persistenza è tutta isolata dietro `carica`/`salva`: per passare
// alla sync cloud (Supabase) basterà sostituire queste funzioni.
// ---------------------------------------------------------------------------

function carica(keys) {
  try {
    const raw = localStorage.getItem(keys.schede)
    if (raw) return JSON.parse(raw).map(normalizzaScheda)
  } catch (e) {
    console.warn('Lettura schede fallita', e)
  }
  // Primo avvio del profilo: inserisce la scheda di esempio una sola volta.
  if (!localStorage.getItem(keys.seed)) {
    return [schedaEsempio()].map(normalizzaScheda)
  }
  return []
}

function salva(keys, schede) {
  try {
    localStorage.setItem(keys.schede, JSON.stringify(schede))
    localStorage.setItem(keys.seed, '1')
  } catch (e) {
    console.warn('Salvataggio schede fallito', e)
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

  // Persiste le schede dell'utente attivo ad ogni cambiamento.
  useEffect(() => {
    salva(keys, schede)
  }, [keys, schede])

  // Persiste le diete dell'utente attivo.
  useEffect(() => {
    salvaDiete(keys, diete)
  }, [keys, diete])

  // Persiste le preferenze alimentari (allergie, intolleranze, gusti).
  useEffect(() => {
    salvaPreferenze(keys, preferenze)
  }, [keys, preferenze])

  // Persiste la sessione attiva.
  useEffect(() => {
    salvaSessione(keys, sessione)
  }, [keys, sessione])

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
      sessione,
      iniziaSessione,
      iniziaAllenamentoLibero,
      aggiornaSessione,
      annullaSessione,
      terminaSessione,
    }),
    [
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
      sessione,
      iniziaSessione,
      iniziaAllenamentoLibero,
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
