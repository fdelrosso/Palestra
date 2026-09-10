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
- **Master password `PippoN1`: TOLTA** (2026-09-10, ramo cloud). Era stata tenuta finché i dati
  erano per dispositivo, sapendo che finiva nel bundle pubblico: apriva i profili di quel telefono,
  e il telefono era già dell'utente. Con gli account veri apriva l'account di chiunque, da
  qualunque parte del mondo — e la condizione che la reggeva non c'era più. Con lei se n'è andato
  tutto `lib/password.js`: gli hash delle password non li tiene più l'app, li tiene Supabase Auth.

**Decisioni della fase 2b (cloud), 2026-09-10:**

- **Si entra con email e password**, non col solo nome. L'email non è burocrazia: è l'unica cosa che
  permette di recuperare l'accesso. Finché i dati stavano nel browser chi restava fuori poteva
  svuotarlo e ricominciare; adesso i suoi allenamenti sono sul server e li perderebbe davvero.
- **Conferma email disattivata.** Il servizio di posta gratuito di Supabase manda poche mail
  all'ora: con la conferma attiva, il terzo amico che si iscrive non riceve niente e resta fuori
  senza capire perché. Il recupero password continua a funzionare (è raro).
- **Si è ripartiti da zero coi dati** (scelta dell'utente): niente migrazione da localStorage.
  ⚠️ **Riconfermato il 2026-09-10, e stavolta sapendo cosa costa**: unendo il ramo, le schede e gli
  allenamenti che stanno nel localStorage del telefono dell'utente restano lì, fisicamente, ma
  irraggiungibili — nessuna schermata li legge più. Gli era stato proposto un import una-tantum al
  primo accesso col nuovo account, e ha detto di no. Quindi **non si scriva**: se un domani
  qualcuno pensa "manca la migrazione", la risposta è che è stata offerta e rifiutata.
- **La chiave Supabase sta nel codice ed è giusto così.** È la publishable key, che Supabase
  documenta come sicura nel sorgente: dice "sono l'app Palestra", non "sono Filippo". A proteggere
  i dati sono le regole nel database, che il browser non può falsificare.
- **Il dispositivo è la copia che si legge, il server quella che dura.** L'app si apre con quello
  che ha in locale e funziona senza rete — in palestra la rete spesso non c'è, e un'app ferma su
  "caricamento…" mentre uno ha il bilanciere in mano non serve a niente.
- **Rete caduta ≠ rifiuto del server**, e vanno trattati all'opposto: la prima si accoda e si
  riprova, il secondo si annulla e si dice. Vedi il caveat qui sotto.
- **Ci si trova per codice amico o per nome ESATTO**, mai per pezzi di nome: la ricerca parziale
  permetterebbe a chiunque si registri di ricavarsi l'elenco di chi usa l'app.
- **Si viene suggeriti solo a chi ha un legame reale** (amici in comune, stesso PT). Un
  suggerimento è un nome che nessuno ha cercato: proporre sconosciuti sarebbe la ricerca parziale
  rimessa in piedi da un'altra porta. ⚠️ Dire "2 amici in comune" rivela un pezzo della rete di
  amicizie di qualcun altro — è come funziona ovunque, ma è una scelta.
- **Lo Storico resta aperto a tutti quelli che hanno un account** (scelta dell'utente), ma solo per
  ciò che è stato reso pubblico apposta: **chi non sceglie non pubblica** — schede, allenamenti e
  foto nascono nascosti. ⚠️ Fino al 2026-09-10 il codice diceva il contrario (`VISIBILITA_DEFAULT`
  era `pubblica` e "campo assente" voleva dire pubblico, per retro-compatibilità con dati che col
  cloud non esistono più): un amico che si iscriveva, importava la scheda del suo PT e faceva il
  primo allenamento pubblicava carichi, ripetizioni e cronologia senza aver scelto niente. Corretto
  prima di far entrare altre persone — una scelta che si subisce non è una scelta. ⚠️ Il default è
  scritto in **due posti** che devono dire la stessa frase: `src/lib/visibilita.js` e le funzioni
  `allenamenti_visibili()` / `nomi_di()` in `supabase/schema.sql`. Vince il database.
  ⚠️ Prezzo accettato: all'inizio Storico e Schede Generali sono vuoti, e il motore dei consigli
  ricade sul catalogo finché qualcuno non pubblica qualcosa. ⚠️ Conseguenza: chiunque
  vedrà i nomi di chi ha allenamenti pubblici, il che ammorbidisce la scelta sulla ricerca.
- **Nessuno scrive nella riga di un altro.** L'unica deroga è accettare un atleta, e la fa il
  database dopo aver verificato tutto.
- **Il filtro di chi-vede-cosa sta nel DATABASE, non nel browser.** Le tre viste che guardano i
  dati di più persone (Storico, Schede Generali, il segnale "comunità" dei consigli) passano da
  `schede_visibili()`, che manda il json già ripulito dei completamenti che non si devono vedere.
  Mandare tutto e nascondere il resto a schermo non è nascondere: chi guarda la rete se lo legge
  lo stesso. Il filtro in `lib/visibilita` resta, ma come cortesia, non come difesa.
- **La visibilità della scheda e quella dei suoi allenamenti sono INDIPENDENTI** (scelta
  dell'utente, 2026-09-10, contro una prima versione che aveva fatto della scheda un tetto).
  Nascondere una scheda vuol dire "non far vedere il mio programma"; pubblicare un allenamento
  vuol dire "ho fatto questo, guardate". Sono due frasi diverse e uno può volerle dire tutte e due
  insieme — ed è come funzionava prima del cloud. ⚠️ Conseguenza sul come, non sul cosa: schede e
  allenamenti escono dal database da **due funzioni diverse** (`schede_visibili()` senza i
  completamenti, `allenamenti_visibili()` che li prende da qualsiasi scheda, anche nascosta), e
  nel browser viaggiano in due liste. Della scheda nascosta non esce niente: dell'allenamento
  pubblicato escono i nomi di scheda e giorno, che il completamento si porta dietro congelati da
  fine allenamento (`lib/session.js`) — cioè esattamente ciò che chi pubblica sta pubblicando.
- **Per chi NON ha un personal trainer, il segnale dei PT si è ristretto**: contano le schede
  scritte dai PT stessi, pesate per quanti atleti seguono, e non più anche quelle dei loro atleti.
  Per sapere di chi è atleta l'autore di una scheda pubblica bisognerebbe leggerne il profilo, e
  chi pubblica una scheda ha deciso di mostrare quella, non con chi si allena. Chi un PT ce l'ha
  non perde niente: il suo PT e i compagni di allenamento sono un legame vero, e il database li
  segnala riga per riga.
- **Claude ha accesso al database in lettura E scrittura** (scelta dell'utente, 2026-09-10), tramite
  `npm run db` e un `.env` fuori dal repo. L'alternativa proposta era un ruolo di sola lettura;
  l'utente ha scelto l'accesso pieno per non dover più fare da tramite. ⚠️ Conseguenza: le
  modifiche allo schema non passano più da nessuno che le rilegga prima. Resta la regola di sempre
  — niente di distruttivo senza dirlo e aspettare conferma — e le istruzioni che cancellano
  vengono annunciate dallo script stesso.
- **I file di Storage si cancellano solo dalla Storage API, mai da SQL** — e non è una preferenza:
  Supabase lo vieta con un trigger (`Direct deletion from storage tables is not allowed`), perché
  una riga di `storage.objects` cancellata lascerebbe il file vero dov'è, invisibile e
  irrecuperabile. Conseguenza: la pulizia degli invii scaduti la fa **l'app** a ogni accesso, non
  il database. ⚠️ E l'ordine è obbligato: **prima il file, poi la riga**, perché la regola che
  permette di cancellare un file va a cercare la sua riga — tolta quella, il file non lo cancella
  più nessuno.
- **Una foto "pubblica" la vede chi può vedere la SCHEDA in cui sta**, non chiunque abbia un
  account. Senza quella seconda metà, "pubblica" vorrebbe dire "chiunque conosca l'id del file", e
  a proteggerlo resterebbe solo il fatto che l'id è difficile da indovinare — che non è
  proteggerlo. La regola sta sul bucket (`posso_scaricare_media`), e ripete le stesse condizioni
  di `schede_visibili()`.
- **"Questa foto è mia" si decide sull'ID, non sul nome** (2026-09-10). Il codice confrontava
  `m.autore === utenteCorrente.nome`: reggeva quando i profili stavano su un dispositivo e lì i
  nomi erano unici, ma la schermata di registrazione ora dice l'opposto — *"Può ripetersi: a
  distinguervi è l'email"*. Due persone con lo stesso nome si sarebbero viste elencate le foto
  private l'una dell'altra. Il `MediaRef` porta `autoreId`, ed è anche quello che dice in quale
  cartella dello Storage sta il file.
- **Il codice del proprio PT si può scrivere di nuovo in registrazione**, ma lì si controlla solo
  la FORMA: per chiedere al database di chi è quel codice bisogna essere già entrati, e in quella
  schermata l'account non esiste ancora. Il controllo vero arriva un istante dopo; se il codice non
  risulta a nessuno l'account resta valido e l'avviso lo raccoglie il menu del profilo, che apre il
  pannello "Personal trainer" col codice già scritto. ⚠️ Un avviso mostrato nella schermata di
  registrazione non lo leggerebbe nessuno: quella schermata sparisce nello stesso istante in cui
  l'account nasce.

⚠️ **Limite iOS:** una PWA su iPhone **non può** tenere un cronometro sulla lockscreen (le Live
Activity sono solo per app native). Soluzione adottata: wake-lock + timer basato sull'orario reale
(regge il background) + beep in primo piano.

---

## 2. Caveat che contano

- ⚠️ **Sul cloud non c'è merge dei conflitti**: se modifichi la stessa scheda su due dispositivi
  mentre uno è offline, **vince l'ultimo che riesce a scrivere sul server**. Per una persona sola su
  due suoi dispositivi è la scelta giusta; un merge vero costerebbe molto e servirebbe quasi mai.
- ⚠️ **Le due funzioni che traducono una riga profilo erano due, e sono divergite** alla prima
  colonna nuova (il codice amico arrivava per gli amici e non per sé stessi). Ora `profiloDaRiga`
  in `lib/social.js` è l'unica: se aggiungi una colonna al profilo, si tocca solo lì.
- ⚠️ **Provare l'app SENZA RETE, non solo leggerne il codice.** Due bug della fase 2b sono usciti
  solo così: all'avvio offline si tornava al "Benvenuto" pur essendo dentro (il profilo non era in
  copia locale), e una modifica fatta offline veniva annullata in silenzio mentre la schermata
  diceva "Dati salvati".
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

