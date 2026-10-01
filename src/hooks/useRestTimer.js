import { useCallback, useEffect, useRef, useState } from 'react'

// ---- IL BIP DI FINE RECUPERO -----------------------------------------------
//
// ⚠️ L'audio si sblocca al tocco di "Start" (avvia): su iPhone un
// AudioContext nato fuori da un tocco resta sospeso e non suona niente, e
// all'inizio il bip se ne creava uno al momento — sull'iPhone non si è mai
// sentito. Un contesto NUOVO a ogni Start, nato dentro il tocco: quello di
// prima può essere rimasto "interrotto" (la musica rimessa a mano dopo un bip
// che l'aveva fermata), e da interrotto iOS non lo lascia ripartire finché
// l'altra app suona — il bip spariva.
//
// ⚠️ IL BIP E LA MUSICA, su iPhone (navigator.audioSession, Safari 16.4+). Le
// strade per una pagina web sono DUE, e nessuna fa tutto:
//   - 'ambient': il bip si mescola alla musica, che non si ferma. Ma il
//     silenzioso lo spegne, anche in cuffia;
//   - 'playback': il bip suona anche col silenzioso. Ma ferma la musica, e
//     la musica NON riparte da sola: rilasciando l'audio WebKit non avvisa le
//     altre app (`setActive:NO withOptions:0`, AudioSessionCocoa.mm). Abbassare
//     un po' la musica ("duck") Safari non lo fa fare a nessuna pagina, e se il
//     silenzioso è inserito la pagina non lo sa, quindi non può scegliere lei.
// Deciso con l'utente (2026-10-01): quando suona, il bip si deve SENTIRE,
// anche col silenzioso — quindi 'playback'. Il prezzo: se c'è musica, al bip
// si ferma e va rimessa a mano. Per questo il bip è SPENTO di base: si accende
// dal tasto nella card del recupero (components/TimerRecupero), che prima di
// accenderlo dice cosa costa e chiede conferma. Spento, la pagina non tocca
// mai l'audio e la musica non si ferma mai. Per avere invece il bip sopra la
// musica, muto col silenzioso, basta TIPO_BIP = 'ambient'.
//
// ⚠️ L'audio si tiene SOLO il tempo che serve: allo Start si sblocca come
// 'ambient' (così lo Start non ferma la musica) e si sospende subito; al bip
// si riprende e dopo FINE_BIP_MS si risospende, e la pagina torna ad 'auto' —
// che è quello che vale per i video degli esercizi.
// Dove l'Audio Session non c'è (Android, computer) non cambia niente: lì il
// silenzioso non tocca il volume dei contenuti.
let contesto = null
// Quanto si tiene l'audio dall'inizio del bip: tre toni in 0,5s, più il
// margine perché l'ultimo esca davvero dalle casse.
const FINE_BIP_MS = 900
let rilascio = null

// Il tipo di sessione audio del bip: vedi sopra.
const TIPO_BIP = 'playback'

// Il bip acceso, per telefono. Assente = spento: è il default. La variabile
// è la verità (vale anche senza storage, finché l'app è aperta); lo storage
// la ricorda per la volta dopo.
const CHIAVE_BIP = 'palestra:bip:v1'
let bipAcceso = (() => {
  try {
    return localStorage.getItem(CHIAVE_BIP) === '1'
  } catch {
    return false
  }
})()

/** Il bip qui può fermare la musica degli altri (iPhone: vedi sopra). */
export const bipFermaLaMusica = () => typeof navigator !== 'undefined' && !!navigator.audioSession

function sessioneAudio(tipo) {
  try {
    if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = tipo
  } catch {
    /* Audio Session non supportata: ignora */
  }
}

// L'audio torna a chi c'era prima: contesto sospeso, pagina di nuovo 'auto'.
function rilasciaAudio() {
  rilascio = null
  const torna = () => sessioneAudio('auto')
  if (contesto?.state === 'running') contesto.suspend().then(torna, torna)
  else torna()
}

/** Da chiamare DENTRO un tocco: prepara l'audio perché il bip suoni dopo. */
function sbloccaAudio() {
  try {
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!Ctx) return
    // Mentre suona un bip si tiene quello che c'è: ci pensa il suo rilascio.
    if (rilascio && contesto) return
    // 'ambient' per lo sblocco: si mescola alla musica, che non si ferma.
    sessioneAudio('ambient')
    try {
      if (contesto && contesto.state !== 'closed') contesto.close()
    } catch {
      /* già chiuso: niente da fare */
    }
    const ctx = new Ctx()
    contesto = ctx
    const sblocco = ctx.state === 'running' ? Promise.resolve() : ctx.resume()
    // Suonare qualcosa dentro il tocco è quello che sblocca iOS: un campione
    // solo, muto.
    const sorgente = ctx.createBufferSource()
    sorgente.buffer = ctx.createBuffer(1, 1, 22050)
    sorgente.connect(ctx.destination)
    sorgente.start(0)
    // Sbloccato, si sospende: acceso, terrebbe l'audio per tutto il recupero.
    sblocco.then(
      () => {
        if (!rilascio && contesto === ctx) ctx.suspend().then(() => sessioneAudio('auto'), () => {})
      },
      () => {},
    )
  } catch {
    /* audio non disponibile: ignora */
  }
}

function beep() {
  try {
    const ctx = contesto
    if (bipAcceso && ctx && ctx.state !== 'closed') {
      const suonaTutto = () => {
        const now = ctx.currentTime
        // Tre toni corti e acuti, "bip-bip-bip": sopra la musica si
        // distinguono meglio di due note morbide. L'onda quadra ha più
        // armoniche alte, che sono quelle che passano in mezzo alle canzoni.
        const suona = (t, freq) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.value = freq
          osc.type = 'square'
          gain.gain.setValueAtTime(0.0001, now + t)
          gain.gain.exponentialRampToValueAtTime(0.3, now + t + 0.01)
          gain.gain.setValueAtTime(0.3, now + t + 0.1)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.14)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + t)
          osc.stop(now + t + 0.15)
        }
        suona(0, 1568)
        suona(0.18, 1568)
        suona(0.36, 2093)
        clearTimeout(rilascio)
        rilascio = setTimeout(rilasciaAudio, FINE_BIP_MS)
      }
      // Prima il tipo, poi l'audio: la sessione si apre già come 'playback'.
      sessioneAudio(TIPO_BIP)
      // Il contesto qui è sospeso (vedi sopra) e riparte senza tocchi, perché
      // è nato dentro lo Start. Se iOS non lo lascia ripartire, si torna ad
      // 'auto' e il prossimo Start ne fa uno nuovo.
      if (ctx.state === 'running') suonaTutto()
      else ctx.resume().then(suonaTutto, () => sessioneAudio('auto'))
    }
  } catch {
    /* audio non disponibile: ignora */
  }
  // Vibrare non è il bip e non ferma la musica di nessuno: anche a bip spento.
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
  // Il bip di fine recupero: spento di base, vedi sopra.
  const [bip, setBip] = useState(bipAcceso)
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
    // sbloccaAudio). A bip spento l'audio non si tocca nemmeno.
    if (bipAcceso) sbloccaAudio()
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

  // ⚠️ Va chiamato DENTRO il tocco di conferma: acceso a recupero già
  // partito, l'audio si sblocca qui, perché lo Start è già passato.
  const impostaBip = useCallback((acceso) => {
    bipAcceso = acceso
    try {
      if (acceso) localStorage.setItem(CHIAVE_BIP, '1')
      else localStorage.removeItem(CHIAVE_BIP)
    } catch {
      /* senza storage vale finché l'app è aperta */
    }
    setBip(acceso)
    if (acceso) sbloccaAudio()
  }, [])

  return { durata, rimanente, attivo, avviato, imposta, scegli, avvia, pausa, aggiungi, reset, bip, impostaBip }
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
