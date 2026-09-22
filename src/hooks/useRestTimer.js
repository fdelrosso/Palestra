import { useCallback, useEffect, useRef, useState } from 'react'

// Breve "beep" con la Web Audio API (funziona in primo piano).
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const suona = (t, freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.28)
    }
    suona(0, 880)
    suona(0.3, 1175)
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* audio non disponibile: ignora */
  }
  try {
    navigator.vibrate?.([120, 60, 120]) // no-op su iOS, utile su Android
  } catch {
    /* ignora */
  }
}

// Timer di recupero MANUALE e indipendente da serie/esercizi.
// - `imposta(sec)` è il recupero della scheda, che arriva da solo al cambio di esercizio:
//   entra subito se il timer è fermo, e se invece sta lavorando ASPETTA il prossimo reset.
// - `scegli(sec)` è un preimpostato premuto da una persona: vale SEMPRE, anche a timer acceso.
// - `avvia()` fa partire il conto alla rovescia; a 0 NON si ferma: prosegue in "overtime"
//   (rimanente diventa negativo) contando quanto tempo in più sei rimasto fermo. Beep una volta a 0.
// - `reset()` riporta il timer al valore iniziale, fermo.
// Usa un istante di fine assoluto (endAt) così regge il background.
export function useRestTimer() {
  const [durata, setDurata] = useState(90)
  const [rimanente, setRimanente] = useState(90)
  const [attivo, setAttivo] = useState(false)
  const [avviato, setAvviato] = useState(false)
  const endAtRef = useRef(0)
  const beepedRef = useRef(false)
  // Il recupero della scheda arrivato mentre il timer era occupato: vale dal
  // prossimo reset (vedi `imposta`).
  const inAttesaRef = useRef(null)
  const attivoRef = useRef(false)
  const avviatoRef = useRef(false)
  attivoRef.current = attivo
  avviatoRef.current = avviato

  useEffect(() => {
    if (!attivo) return
    const tick = () => {
      const rem = (endAtRef.current - Date.now()) / 1000
      if (rem <= 0 && !beepedRef.current) {
        beep()
        beepedRef.current = true
      }
      setRimanente(rem)
    }
    tick()
    const id = setInterval(tick, 250)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [attivo])

  // Il recupero della scheda: entra subito se il timer è fermo e mai avviato
  // dall'ultimo reset.
  //
  // ⚠️ SE IL TIMER STA LAVORANDO NON TOCCA NIENTE, nemmeno la durata. Succede
  // di continuo: si fa partire il recupero e intanto si scorre avanti a vedere
  // l'esercizio dopo. Il conto alla rovescia era già protetto; la durata no, e
  // il risultato era un timer che contava da 2:00 con scritto sotto 0:45 —
  // e adesso che i preimpostati si illuminano, un preimpostato illuminato che
  // non è quello che sta correndo. Il valore nuovo si mette da parte e tocca a
  // lui al prossimo reset, che è quando quel recupero è davvero finito.
  const imposta = useCallback((sec) => {
    const nd = Math.max(1, Math.round(sec || 0))
    if (attivoRef.current || avviatoRef.current) {
      inAttesaRef.current = nd
      return
    }
    inAttesaRef.current = null
    setDurata(nd)
    setRimanente(nd)
  }, [])

  // Scelta ESPLICITA di un recupero preimpostato: vale sempre.
  // ⚠️ È l'opposto di `imposta` qui sopra, e la differenza è tutta qui: quello
  // è il recupero della scheda, che arriva da solo al cambio di esercizio e
  // NON deve calpestare un recupero già partito; questo l'ha premuto una
  // persona, e quando una persona preme si obbedisce.
  // A timer fermo è un reset sul nuovo valore; a timer acceso riparte da lì,
  // perché chi cambia recupero mentre sta recuperando sta dicendo "no, questo".
  // ⚠️ NON cancella il recupero della scheda messo da parte: quello è
  // dell'esercizio in cui si è finiti, e il reset serve proprio a tornarci.
  const scegli = useCallback((sec) => {
    const nd = Math.max(1, Math.round(sec || 0))
    setDurata(nd)
    setRimanente(nd)
    beepedRef.current = false
    if (attivoRef.current) endAtRef.current = Date.now() + nd * 1000
    else setAvviato(false)
  }, [])

  const avvia = useCallback(() => {
    setRimanente((r) => {
      endAtRef.current = Date.now() + r * 1000
      return r
    })
    setAvviato(true)
    setAttivo(true)
  }, [])

  const pausa = useCallback(() => {
    setAttivo(false)
    setRimanente((endAtRef.current - Date.now()) / 1000)
  }, [])

  const aggiungi = useCallback((delta) => {
    if (attivoRef.current) {
      endAtRef.current += delta * 1000
      setRimanente((endAtRef.current - Date.now()) / 1000)
    } else {
      setRimanente((r) => r + delta)
    }
  }, [])

  const reset = useCallback(() => {
    setAttivo(false)
    setAvviato(false)
    beepedRef.current = false
    // Se nel frattempo si è cambiato esercizio, adesso tocca al recupero di
    // quello: è il momento giusto, perché il recupero di prima è finito.
    const inAttesa = inAttesaRef.current
    inAttesaRef.current = null
    setDurata(inAttesa ?? durata)
    setRimanente(inAttesa ?? durata)
  }, [durata])

  return { durata, rimanente, attivo, avviato, imposta, scegli, avvia, pausa, aggiungi, reset }
}

// Mantiene lo schermo acceso finché `attivo` è true (Screen Wake Lock API).
export function useWakeLock(attivo) {
  const lockRef = useRef(null)

  useEffect(() => {
    let annullato = false
    const richiedi = async () => {
      try {
        if (attivo && 'wakeLock' in navigator && document.visibilityState === 'visible') {
          lockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        /* wake lock non disponibile/negato: ignora */
      }
    }
    const rilascia = async () => {
      try {
        await lockRef.current?.release()
      } catch {
        /* ignora */
      }
      lockRef.current = null
    }

    if (attivo) {
      richiedi()
      const onVis = () => {
        if (document.visibilityState === 'visible' && attivo && !annullato) richiedi()
      }
      document.addEventListener('visibilitychange', onVis)
      return () => {
        annullato = true
        document.removeEventListener('visibilitychange', onVis)
        rilascia()
      }
    }
    rilascia()
  }, [attivo])
}
