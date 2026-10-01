import { useCallback, useEffect, useRef, useState } from 'react'

// ---- IL BIP DI FINE RECUPERO -----------------------------------------------
//
// ⚠️ Un contesto audio SOLO, creato e sbloccato al tocco di "Start" (avvia).
// Su iPhone un AudioContext nato fuori da un tocco resta sospeso e non suona
// niente: prima il bip se ne creava uno nuovo al momento, dentro il conto
// alla rovescia, e sull'iPhone non si è mai sentito. Sbloccato una volta, lo
// stesso contesto riparte anche dopo, senza tocchi — per questo non si chiude
// mai: chiuso, andrebbe risbloccato.
//
// ⚠️ IL SILENZIOSO. Su iPhone il Web Audio segue l'interruttore del
// silenzioso, e in palestra il telefono sta quasi sempre in silenzioso. È
// stato chiesto che il bip suoni LO STESSO, e che la musica di chi si allena
// con le cuffie si fermi solo per il tempo del suono. Lo fa la "sessione
// audio" della pagina (navigator.audioSession, Safari da iOS 16.4):
//   - fra un bip e l'altro è 'auto' e il contesto è SOSPESO: la pagina non
//     tiene l'audio e la musica va avanti — anche al tocco di Start, dove
//     l'audio si sblocca e si sospende subito;
//   - per il bip diventa 'playback', l'unico tipo che suona col silenzioso
//     inserito: iOS ferma la musica degli altri;
//   - finito il bip (FINE_BIP_MS) il contesto si sospende e si torna ad
//     'auto': iOS si riprende l'audio della pagina e avvisa l'app della
//     musica, che riparte. ⚠️ Ripartire è una scelta di quell'app (Musica e
//     Spotify lo fanno): da qui si può solo restituire l'audio.
// Dove l'Audio Session non c'è (Android, computer) non cambia niente: lì il
// silenzioso non tocca il volume dei contenuti, e il bip suonava già.
let contesto = null
// Quanto si tiene l'audio dall'inizio del bip: due toni da 0,28s a 0,3s di
// distanza, più il margine perché l'ultimo esca davvero dalle casse.
const FINE_BIP_MS = 900
let rilascio = null

function contestoAudio() {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) return null
  if (!contesto || contesto.state === 'closed') contesto = new Ctx()
  return contesto
}

function sessioneAudio(tipo) {
  try {
    if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = tipo
  } catch {
    /* Audio Session non supportata: ignora */
  }
}

// L'audio torna a chi c'era prima: contesto sospeso, sessione di nuovo 'auto'.
function rilasciaAudio() {
  rilascio = null
  const torna = () => sessioneAudio('auto')
  if (contesto?.state === 'running') contesto.suspend().then(torna, torna)
  else torna()
}

/** Da chiamare DENTRO un tocco: prepara l'audio perché il bip suoni dopo. */
function sbloccaAudio() {
  try {
    const ctx = contestoAudio()
    if (!ctx) return
    // 'auto' per lo sblocco: così il tocco di Start non ferma la musica.
    if (!rilascio) sessioneAudio('auto')
    const sblocco = ctx.state === 'running' ? Promise.resolve() : ctx.resume()
    // Suonare qualcosa dentro il tocco è quello che sblocca iOS: un campione
    // solo, muto.
    const sorgente = ctx.createBufferSource()
    sorgente.buffer = ctx.createBuffer(1, 1, 22050)
    sorgente.connect(ctx.destination)
    sorgente.start(0)
    // Sbloccato, si sospende: acceso, terrebbe l'audio per tutto il recupero.
    // ⚠️ Non se nel frattempo sta suonando un bip: ci pensa il suo rilascio.
    sblocco.then(
      () => {
        if (!rilascio) ctx.suspend()
      },
      () => {},
    )
  } catch {
    /* audio non disponibile: ignora */
  }
}

function beep() {
  try {
    const ctx = contestoAudio()
    if (ctx) {
      const suonaTutto = () => {
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
        clearTimeout(rilascio)
        rilascio = setTimeout(rilasciaAudio, FINE_BIP_MS)
      }
      // Prima il tipo, poi l'audio: la sessione si apre già come 'playback'.
      sessioneAudio('playback')
      // Di solito qui il contesto è sospeso (vedi sopra) e riparte senza
      // tocchi, perché è già stato sbloccato. Se iOS non lo lascia ripartire
      // (una telefonata in mezzo), si torna ad 'auto' e il prossimo Start lo
      // risblocca.
      if (ctx.state === 'running') suonaTutto()
      else ctx.resume().then(suonaTutto, () => sessioneAudio('auto'))
    }
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
    // Siamo dentro il tocco di Start: è adesso o mai più, per il bip (vedi
    // sbloccaAudio).
    sbloccaAudio()
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
