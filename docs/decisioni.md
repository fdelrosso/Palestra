# Palestra — Decisioni e caveat

> Le regole concordate con l'utente (§1) e i limiti veri del codice (§2).
> `context.md` ne tiene un elenco corto: qui c'è il perché per esteso.
> **Leggi questo prima di cambiare un comportamento che sembra sbagliato**: è quasi
> sempre voluto, e qui c'è scritto contro cosa.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

## 1. Decisioni chiave (concordate con l'utente)

- **PWA installabile**, non app nativa. Niente App Store (99 $/anno), confermato.
- **Account con password**, utente attivo non ricordato (si riparte dal "Benvenuto" ad ogni
  apertura). Dalla 13ª tornata **l'elenco dei profili non si mostra**: si scrive il proprio nome.
- **Storico condiviso** tra tutti i profili, scelta esplicita "per prendere spunto".
- **Sync PC↔iPhone via Supabase**, da fare ([roadmap.md](roadmap.md), fase 2b).
- **`8x3` = serie × ripetizioni.** Ripetizioni e recuperi sono **testo libero** (`15/12`, `1,15min`,
  `30" tra gli arti`): non si forzano in numeri, per rispettare la notazione del PT.
- **Icona: manubrio blu (#2563EB) su fondo bianco**, diversa dall'arancione dell'interfaccia.
- **Calorie e battiti si inseriscono a mano** a fine allenamento (la PWA non legge HealthKit).
  Se non li si inserisce, le calorie si STIMANO dal peso del profilo (MET × peso × durata).
- **Quello che non si sa non si mostra.** Nel recap una cifra che non si può calcolare non diventa
  un trattino: la sua casella non viene disegnata. Vale per calorie (serve il peso), volume e peso
  massimo (servono i carichi scritti). Niente valori di ripiego travestiti da stime.
- **I dati fisici stanno sul PROFILO, non sulla dieta**, e si chiedono creando l'account: sono la
  stessa persona in due posti, e il peso serve tanto alle calorie bruciate quanto a quelle da
  mangiare. Modificabili sempre da "I miei dati".
- **Il livello si DICHIARA, non si deduce.** Si sarebbe potuto indovinarlo dallo storico, ma chi si
  iscrive oggi non ne ha uno e il livello serve proprio lì. Nessuna voce è preselezionata: sceglierla
  noi vorrebbe dire dare uno stacco a un principiante perché non ha risposto.
- **Il livello filtra ma non vieta**: tocca solo quello che l'app propone da sola. Un esercizio
  scelto a mano entra sempre, e nella lista resta visibile con la freccia ↑ accanto. E i tetti sui
  giorni si alzano cambiando livello, non sono un muro dell'app.
- **Video: massimo 10 secondi**, deciso prima del deploy per non riempire il piano gratuito. Vale
  anche per i video mandati a un amico, che in più si cancellano da soli.
- **Le foto/video tra amici sono momentanei per la MEMORIA, non per la privacy.** Si cancellano
  all'apertura e comunque dopo 24 ore; lo screenshot resta possibile e nel modale lo si dice.
- **Del recap si condividono i numeri, non l'immagine**: la card (1080x1350) si ridisegna sul
  dispositivo di chi guarda. Un PNG del genere in localStorage lo saturerebbe da solo.
- **Le sostituzioni della dieta tengono i macro, non le abitudini**: cambiano i grammi, non le
  calorie. Il criterio è la densità simile (vedi [storico.md](storico.md), 13ª tornata, punto 4).
- **Master password `PippoN1`**: si tiene per ora (scelta dell'utente), da ripensare con l'auth vera.

⚠️ **Limite iOS:** una PWA su iPhone **non può** tenere un cronometro sulla lockscreen (le Live
Activity sono solo per app native). Soluzione adottata: wake-lock + timer basato sull'orario reale
(regge il background) + beep in primo piano.

---

## 2. Caveat che contano

- **La password è protezione d'ACCESSO, non cifratura.** I dati in localStorage restano in chiaro:
  chi ha il dispositivo può leggerli. Non promettere di più finché non c'è l'auth di Supabase.
- ⚠️ **I dati locali possono sparire.** Safari cancella i dati dei siti non usati da un po', e sotto
  pressione di spazio il telefono può svuotare localStorage/IndexedDB anche di una PWA installata.
  È l'argomento più forte per fare il cloud prima di far entrare gli amici. Detto all'utente.
- **PT, amicizie e condivisioni soffrono il "per dispositivo":** oggi le due persone devono stare
  sullo **stesso browser**, cosa quasi sempre falsa. Complete e dimostrabili, davvero utili solo col
  cloud. Vale anche per le foto/video momentanei.
- **Visibilità: oggi è un filtro JavaScript**, non una regola d'accesso. Con Supabase va applicata
  lato server (RLS). E il filtro dei media privati confronta il **nome** dell'autore → passare all'id.
- **Blob orfani in IndexedDB** quando si elimina un profilo (leak innocuo, cleanup futuro).
- **parseRecuperoSec** euristica: `1,15` = 1min15s (2 cifre), `1,5` = 90s (decimi), `30"` = 30s.
- **Parser superset:** una riga "… super set 4 giri … curl martello …" viene troncata. Si corregge
  nell'editor. Idea futura: riconoscere il superset e creare due esercizi collegati.
- **La difficoltà di un esercizio è indovinata dal NOME**, con le stesse regole (e gli stessi
  rischi) di `gruppoDaNome`: sottostringhe, le specifiche prima delle generiche. Un nome che non
  riconosce è `base`, cioè non si mette di mezzo — quindi una scrittura strana di un PT può far
  passare un esercizio pesante a un principiante. Il caso già gestito è l'attrezzo ("Panca piana
  manubri" ≠ "Panca piana"); gli altri si scoprono guardando `scratchpad`-style le schede vere.
- **Un principiante può restare senza femorali** in un giorno di gambe: con `max` −1 il leg curl
  esce dopo squat/affondi/leg extension. Non è colpa del livello — succede già oggi a chiunque
  scelga 45 minuti — ma il livello lo rende più frequente. La radice è che l'ordine dentro un gruppo
  è la classifica, e non sa che tre esercizi di quadricipiti sono tre esercizi di quadricipiti.
- **L'età è un numero, non una data di nascita**: invecchia solo se uno la aggiorna. Sul
  metabolismo basale un anno vale ~5 kcal, dentro l'errore della formula: scelta di semplicità.
- **Il peso di una dieta già salvata non si aggiorna** quando si cambia quello del profilo: è la
  fotografia di quando la dieta è stata scritta. Si rigenera a mano dall'editor.
- **La dieta proposta dai dati del profilo NON è salvata**: cambia da sola se cambiano i dati, e
  diventa una dieta vera solo col tasto "Salva". Da quel momento non la tocca più nessuno.
- **Il corpo del recap è schematico**: dice quali gruppi hai lavorato e quanto, non l'anatomia. Il
  rosso è una proporzione INTERNA all'allenamento (quota sul gruppo più lavorato di quella
  giornata), non un giudizio sul volume assoluto.
- **La dieta è una stima indicativa, non un consiglio medico.** Le sostituzioni per allergie e
  intolleranze usano densità medie da tabella: servono a tenere in piedi i macro, non a curare
  nessuno, e sulle allergie serie si leggono comunque le etichette (lo dice anche la schermata).
- **`lib/pdfTesto.js` è best effort, per scelta.** Legge i PDF *scritti al computer* (stream Flate +
  font con codifica normale). NON legge le scansioni (dentro non c'è testo: servirebbe un OCR) né i
  font CID/Identity-H (i caratteri sono indici di glifi). In quei casi torna `ok:false` con la frase
  da mostrare e resta il **copia-incolla**, che funziona sempre: per questo il campo di testo è
  sempre visibile e non nascosto dietro l'errore. Serve `DecompressionStream` (Safari 16.4+).
- **Il parser della dieta indovina l'80%**, come quello delle schede: le giornate e i pasti si
  correggono nell'editor. Riconosce i titoli che cominciano con giorno/giornata/day/opzione, i nomi
  di pasto noti e le righe di soli macro.
- **I metadati degli invii momentanei restano 24h anche dopo la visione** (il blob no): serve al
  mittente per vedere "l'ha aperta". Nessun timer di sfondo: la pulizia gira all'avvio dell'app e
  all'apertura di Condivisi.
- **I disegni degli esercizi sono schematici, non un manuale di tecnica.** Fanno capire il gesto e
  che attrezzo serve; le finezze (posizione delle scapole, respirazione) stanno nella riga di
  tecnica scritta, non nel disegno. Il manichino ha proporzioni fisse: alcune pose chiedono alla
  mano di arrivare più lontano della lunghezza del braccio, e in quel caso l'arto resta **teso a
  puntare** verso il bersaglio — di solito è quello che si vuole (braccia lungo i fianchi), a volte
  no. Per distinguere i due casi c'è `scratchpad/controlla-pose.mjs`: **da rilanciare dopo aver
  toccato le pose**, elenca gli sforamenti oltre 2 unità (oggi ne restano 8, tutti voluti).
- **Le animazioni SMIL si fermano quando la pagina non viene disegnata** (scheda in secondo piano,
  anteprima nascosta): `getCurrentTime()` avanza lo stesso, ma i valori si aggiornano solo al
  ridisegno. Se sembrano ferme mentre si prova, è questo, non un bug.
- **StrictMode** in dev salva due volte (innocuo). Nessun service worker in dev.
- **Icone PWA**: i PNG in `public/` li genera `scratchpad/genera-icone.mjs` (nessuna dipendenza);
  per cambiarle si modificano le forme lì e si rilancia `node genera-icone.mjs public`.

---

