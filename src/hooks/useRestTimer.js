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
// - `imposta(sec)` fissa la durata iniziale (dal recupero della scheda) quando è fermo e non avviato.
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

  // Fissa la durata iniziale (solo se il timer è fermo e mai avviato dall'ultimo reset).
  const imposta = useCallback((sec) => {
    const nd = Math.max(1, Math.round(sec || 0))
    setDurata(nd)
    if (!attivoRef.current && !avviatoRef.current) setRimanente(nd)
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
    setRimanente(durata)
  }, [durata])

  return { durata, rimanente, attivo, avviato, imposta, avvia, pausa, aggiungi, reset }
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
