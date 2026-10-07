# Palestra — Decisioni e caveat

> Le regole concordate con l'utente (§1) e i limiti veri del codice (§2).
> `context.md` ne tiene un elenco corto: qui c'è il perché per esteso.
> **Leggi questo prima di cambiare un comportamento che sembra sbagliato**: è quasi
> sempre voluto, e qui c'è scritto contro cosa.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

## 1. Decisioni chiave (concordate con l'utente)

- **PWA installabile**, non app nativa. Niente App Store (99 $/anno), confermato.
- **Account con password.** Dalla 13ª tornata **l'elenco dei profili non si mostra**: si scrive il
  proprio nome. ⚠️ **Fino al cloud l'utente attivo NON era ricordato** (si ripartiva dal
  "Benvenuto" a ogni apertura); col cloud la scelta è stata ribaltata — `persistSession: true`,
  la sessione resta in localStorage e si rinnova da sola. Il motivo: su un telefono che apre l'app
  una volta al giorno, il contrario vuol dire rifare il login ogni volta. Conseguenza da sapere:
  chiudere l'app con lo swipe su iPhone **non** disconnette; per uscire c'è "Disconnetti".
- **Storico condiviso** tra tutti i profili, scelta esplicita "per prendere spunto".
- **Sync PC↔iPhone via Supabase**, da fare ([roadmap.md](roadmap.md), fase 2b).
- **`8x3` = serie × ripetizioni.** Fino alla 36ª ripetizioni e recuperi erano **testo libero**
  (`15/12`, `1,15min`, `30" tra gli arti`), per rispettare la notazione del PT. **Dalla 37ª (lavoro
  di Ciusbe, su `main` il 2026-10-07) lo schema è in numeri** (`lib/schema`): editor a campi
  numerici, serie che registrano rip e kg fatti, volume e consiglio sul carico che fanno i conti
  senza rileggere il testo. Quello che la notazione del PT diceva in più non si perde: ciò che
  non diventa un numero ("30\" tra gli arti", "elastico rosso") finisce nella nota.
  ⚠️ **I dati di prima non si migrano** nel database: si convertono quando si leggono
  (`normalizzaSchema`). Il perché non sta nel commit; ricostruito: una migrazione tocca le schede di tutti, quelle degli amici
  e lo storico in un colpo solo, e se sbaglia una conversione la sbaglia per sempre; così il
  testo originale resta lì finché la scheda non viene risalvata.
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
  ⚠️ **Superata il 2026-09-29 (30ª tornata).** Le mail ora partono dall'SMTP di Register.it
  (noreply@progettopalestra.it), quindi il limite che la motivava non c'è più, e l'app è pronta ad
  averla accesa (vedi context.md). E il recupero password, in realtà, **non funzionava**: il link
  riportava all'app con un token che nessuno leggeva (`detectSessionInUrl: false`). Sistemato
  nella stessa tornata con `lib/linkEmail`.
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
- **Il nome è UNICO** (2026-09-18, decisione dell'utente) — ribalta la regola precedente ("può
  ripetersi, a distinguervi è l'email"). Da quando si entra anche col nome, il nome dice *chi sei*:
  con due "Marco" l'accesso sarebbe ambiguo. Uguale = uguale senza maiuscole e spazi ai lati. Lo
  garantisce il database (indice `profili_nome_unico`); la registrazione lo chiede prima
  (`nome_disponibile`) solo per poterlo dire in italiano. Il prezzo, accettato: chiunque può sapere
  se un nome ESATTO è già preso — è inevitabile con nomi unici, ed è la stessa cosa che già dice
  `cerca_persona`. ⚠️ "È mio" continua a decidersi sull'ID: i nomi copiati dentro le cose
  (`autore`, `daNome`) sono fotografie, e l'ID è quello che controllano le regole del database.
  ⚠️ Il nome con la `@` non è ammesso: all'accesso sembrerebbe un'email.
- **Il codice del proprio PT si può scrivere di nuovo in registrazione**, ma lì si controlla solo
  la FORMA: per chiedere al database di chi è quel codice bisogna essere già entrati, e in quella
  schermata l'account non esiste ancora. Il controllo vero arriva un istante dopo; se il codice non
  risulta a nessuno l'account resta valido e l'avviso lo raccoglie il menu del profilo, che apre il
  pannello "Personal trainer" col codice già scritto. ⚠️ Un avviso mostrato nella schermata di
  registrazione non lo leggerebbe nessuno: quella schermata sparisce nello stesso istante in cui
  l'account nasce.
- **Il nome si cambia** (dal 2026-09-29, da "I miei dati"), con le regole della registrazione.
  Dopo, si entra col NUOVO: `email_per_accesso` legge `profili.nome`, quindi il database non
  cambia. I commenti già scritti tengono il nome di allora: sono fotografie (vedi sopra).
- ⚠️ **Superata dalla 37ª** (2026-10-07): le fasi ora sono un campo vero, `schema.fasi`
  (`lib/schema`, che ha assorbito `lib/fasi`). Il prezzo scritto qui sotto per le app vecchie è
  quello che si paga adesso: un telefono non aggiornato trova schemi nella forma nuova.
  Com'era: **le fasi di un esercizio ("3×5 poi 2×2") non hanno un campo loro** (2026-09-29): stanno nella
  notazione serie per serie col `/` che l'app capiva già, e si ricavano rileggendola (`lib/fasi`).
  Contro cosa: un campo nuovo andava insegnato a una trentina di posti che leggono lo schema, al
  database, all'Excel e alle versioni vecchie dell'app sui telefoni non aggiornati; così il volume
  del recap era già giusto e un'app vecchia vede un esercizio da 5 serie con le ripetizioni una per
  una, non un dato rotto. Il prezzo: "3×5 a 80kg" + "2×5 a 80kg" si rilegge come 5×5 a 80kg (è la
  stessa cosa), e una piramide "12/10/8" resta scritta come piramide, non come tre fasi da una.
- **La coda di sincronizzazione si scrive PRIMA di mandare, una voce per riga** (2026-09-29).
  Prima ci finiva solo ciò che falliva, e le versioni si accumulavano: una serie rimasta in coda
  veniva rimandata al riavvio DOPO il "Termina" già arrivato, e l'allenamento si riapriva; un invio
  mai tornato (app chiusa a metà) non era né sul server né in coda. Ora vince l'ultima versione di
  ogni riga, una voce esce solo quando il server l'ha presa, e le letture tengono conto di ciò che
  è ancora in coda.

**Decisioni della dieta, 2026-09-30 (concordate con l'utente):**

- **I pasti sono cinque: colazione, spuntino, pranzo, merenda, cena**, sempre con questi nomi e in
  quest'ordine, **più eventuali pasti in più** (il pre-workout), che l'utente ha voluto tenere
  invece di ricondurli a forza al più vicino. I nomi dei nutrizionisti ("Spuntino del pomeriggio",
  "Seconda colazione") si riconducono ai cinque; un pasto che cadrebbe su uno slot già preso
  diventa un extra, non si perde.
- **Lo schema settimanale ordina le alternative, non le nasconde.** Se lunedì a pranzo dice
  "legumi", quelle di un'altra categoria stanno in fondo, sotto "Fuori schema", e si scelgono lo
  stesso. Contro cosa: una dieta che il giorno in cui in casa non ci sono legumi non ti lascia
  mangiare niente non la segue nessuno.
- **La dieta calcolata dai dati del profilo resta**, come terza strada di "Nuova dieta" accanto al
  PDF e a calorie/macro: chi non ha un nutrizionista deve poter partire lo stesso.
- **Lo schema si aggiunge DOPO la dieta**, non è una quarta strada: dice quale pasto fare quale
  giorno, quindi presuppone che i pasti ci siano.
- **"Dieta giornaliera": prima si scrive, poi i consigli** (33ª, chiesto dall'utente). La
  schermata principale è l'obiettivo di oggi che si riempie e i cinque pasti in cui scrivere
  quello che si è mangiato; il piano (cosa mangiare, alternative, "L'ho mangiata") sta dentro ogni
  pasto. Contro cosa: il piano occupava la pagina e il diario era una sezione in mezzo, e chi la
  dieta non la segue alla lettera scorreva piatti che non avrebbe mangiato per arrivare a scrivere
  i suoi.
- **Nella dieta da calorie e macro, allenamento e riposo hanno numeri propri** (33ª, chiesto
  dall'utente). Il vecchio "calorie in più, tutte in carboidrati" non bastava a ricopiare un
  nutrizionista che dà due tabelle diverse (cambiano anche proteine e grassi).
- **Il "~N kcal" di un pasto del piano si mostra solo se il conto è completo.** Un pasto scritto
  "una porzione di secondo piatto" non ha grammi: sommare il resto dava "~140 kcal" a una
  colazione da 350, un numero sbagliato con l'aria di essere giusto (§7: quello che non si sa non
  si mostra).
- **Il diario legge "con" come un separatore** (33ª). "Pane con 50g di prosciutto" sono due cose;
  tenerle insieme faceva sparire il pane, e "latte 200 ml con 40g di fiocchi" diventava 200g di
  fiocchi (710 kcal invece di 280). Un numero secco ≤ 4 senza unità non sono grammi ("pane 2"),
  e per i grassi il "pezzo" è un cucchiaio ma "olio 10" sono grammi. Sono stati questi, non i
  valori per 100g, gli errori nei conti: per questo un'API di valori nutrizionali (USDA, Edamam…)
  non era la risposta, e per i prodotti confezionati resta Open Food Facts.

**Navigazione, 2026-09-30:**

- **La freccia di un editor esce dal flusso, non torna di un passo.** `lib/router` tiene la pila
  delle pagine (la posizione sta in `history.state.pos`) ed `esci()` torna alla prima pagina
  dietro che non fa parte del flusso. Contro cosa: salvare una scheda portava AVANTI alla scheda,
  e da lì la freccia riapriva l'editor — dopo tre modifiche per uscire si ripassava da sei pagine;
  nella dieta si ripassava dal modulo vuoto dei macro e da "Nuova dieta". Le pagine che hanno
  finito il loro lavoro (modulo dei macro, import) si **sostituiscono** in cronologia invece di
  restare dietro. `navigate` usa pushState/replaceState perché sono sincroni: con
  `location.replace` il timbro della posizione finiva sulla voce vecchia e la freccia saltava una
  pagina di troppo (visto nel banco).

- **Indirizzi senza `#`** (34ª), chiesto per far entrare le pagine nella sitemap. In cambio il
  server deve sapere quali percorsi sono dell'app: li elenca `vercel.json`, e **solo quelli**
  aprono l'app. È voluto che `/ciaociao` dia 404 e non la home: è stato chiesto esplicitamente
  ("non voglio che qualsiasi cosa finisca sulla nostra app"). Il service worker legge la stessa
  lista invece di averne una sua: due liste divergono senza che nessuno se ne accorga.
- **"Calorie e macro" è solo il limite** (34ª, chiesto): chi scrive i propri numeri non vuole
  cinque pasti generati, vuole sapere quanto gli resta. I consigli si **chiedono**, pasto per
  pasto, e sono fatti sulla parte di quello che manca che tocca a quel pasto — non su tutto
  quello che manca, se no a colazione si spenderebbe la cena. I pasti saltati PRIMA non si
  tengono niente: chi chiede il pranzo alle 13 la colazione non la fa più.
- **La dieta attiva la sceglie la persona** (34ª): vince l'ultima resa attiva, e una dieta appena
  creata nasce attiva (chi ne fa una nuova lo fa per seguirla). Il periodo resta: una dieta
  scelta smette di valere quando il suo periodo finisce, e rendere attiva una dieta scaduta la fa
  ripartire da oggi — detto sotto il tasto, prima di toccarlo.
- **Il bip di fine recupero è spento di base, e acceso suona anche col silenzioso** (34ª,
  deciso con l'utente dopo averlo provato sul telefono). Su iPhone una pagina web ha due strade
  sole: audio `ambient` (si mescola alla musica, ma il silenzioso lo spegne, anche in cuffia) o
  `playback` (suona col silenzioso, ma ferma la musica). La musica fermata **non riparte da sola**:
  WebKit rilascia l'audio con `setActive:NO withOptions:0`, senza avvisare le altre app
  (AudioSessionCocoa.mm), e un'opzione per abbassarla (`duckOthers`) non la imposta per nessun
  tipo (AudioSessionIOS.mm). E la pagina non sa se il silenzioso è inserito, quindi non può
  scegliere lei. L'utente ha voluto: si sente sempre (`playback`), ma solo se lo si accende — il
  tasto "Bip a fine recupero" nella card del recupero, con un avviso che lo dice prima. Niente
  interruttori "silenzioso sì/no": chiesti esplicitamente di non metterne. L'audio si prende SOLO
  per il bip e si rilascia subito: tenuto acceso, fermerebbe la musica per tutto il recupero.
  Per il bip sopra la musica, muto col silenzioso, basta `TIPO_BIP = 'ambient'`.
- **"Duro" chiede le ripetizioni fatte** (34ª, chiesto): per chi si allena il pallino rosso vuol
  dire "non ce l'ho fatta", e il colore da solo non dice di quanto. Si parte dalle ripetizioni
  previste, così chi le ha fatte tutte (dure) chiude con un tocco.
- **Privacy e termini stanno fuori dall'app** (35ª): pagine statiche in `public/`, come il 404,
  perché devono leggerle anche chi non ha un account e Google. Dall'app si aprono in un'altra
  scheda: dove stanno le caselle c'è un modulo di registrazione mezzo compilato da non perdere.
- **Il consenso sui dati sulla salute è obbligatorio** (35ª, scelto dall'utente il 2026-10-05).
  Casella a parte, come vuole il GDPR, ma senza non si entra: peso, dieta, diario e foto dei
  progressi sono il motivo per cui l'app esiste, e renderlo facoltativo vorrebbe dire spegnere
  tutto quello che li usa. Età minima 14 anni (la legge italiana per il consenso online). Prima
  di aprire al pubblico è da far guardare a un legale.
- **I consensi stanno nei metadati dell'account, non in una tabella** (35ª): il database è uno
  solo e condiviso, e così `schema.sql` non cambia; la registrazione li scrive insieme al resto.
  Hanno la versione dei testi, così un cambio sostanziale li richiede a tutti.
- **I dati fisici li leggono solo il titolare e il suo PT** (36ª, chiesto dall'utente il
  2026-10-07): sono dati sulla salute, e "amico" non vuol dire "può sapere quanto pesi". Agli
  amici, e a chi ha una richiesta in sospeso, il profilo arriva senza dati fisici. Il PT li legge
  anche se oggi nessuna schermata glieli mostra: è il suo mestiere, e l'informativa lo dice.
  Lo fa una **funzione** (`profili_collegati`) e non una regola, perché una regola decide le
  righe, non le colonne — era già scritto in testa alla tappa 2 di `schema.sql`.
- **Un legame nasce solo se l'altro accetta** (36ª): il PT si ha solo con una richiesta di
  lavoro accettata, e un'amicizia non si può girare a nome di un altro. Con **trigger**, non
  stringendo le regole: le regole dicono chi può scrivere una riga, non cosa ci scrive, e
  cambiarle avrebbe toccato le strade che l'app usa davvero.

⚠️ **Limite iOS:** una PWA su iPhone **non può** tenere un cronometro sulla lockscreen (le Live
Activity sono solo per app native). Soluzione adottata: wake-lock + timer basato sull'orario reale
(regge il background) + bip in primo piano, se acceso (vedi sopra).

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
- **`lib/pdfTesto.js` è ancora fatto a mano, senza pdf.js** (~1MB in una PWA che deve installarsi
  al volo). Dalla 32ª legge davvero i PDF *scritti al computer*: segue oggetti e pagine, usa la
  ToUnicode dei font (anche i CID/Identity-H che Word usa di continuo, e che prima uscivano come
  glifi a caso) e le larghezze per mettere gli spazi, e ricompone le righe per **coordinate**: il
  PDF vero di una dietista aveva il contenuto della colazione scritto dopo l'intestazione, e letto
  in ordine di file finiva sotto la merenda. NON legge le scansioni (dentro non c'è testo: servirebbe
  un OCR), i PDF cifrati e i filtri diversi da Flate. In quei casi torna `ok:false` con la frase da
  mostrare e resta il **copia-incolla**, che funziona sempre: per questo il campo di testo è sempre
  visibile e non nascosto dietro l'errore. Serve `DecompressionStream` (Safari 16.4+).
- **Le tabelle dei PDF (lo schema settimanale) si leggono in ordine di scrittura**, le colonne per
  posizione. Le righe di una tabella non si possono ricavare dall'altezza: l'etichetta ("PRANZO",
  spesso scritta in verticale) sta a metà della riga, e una riga può andare a cavallo di due pagine.
  I programmi però scrivono le tabelle riga per riga, cella per cella: basta seguirli.
- **Il parser della dieta indovina l'80%**, come quello delle schede: le giornate e i pasti si
  correggono nell'editor. Riconosce i titoli che cominciano con giorno/giornata/day/opzione, i nomi
  di pasto noti e le righe di soli macro, e dalla 32ª gli elenchi puntati dei PDF ("In
  alternativa… è possibile consumare:", "Esempi:"). La fine di un elenco si capisce da una frase
  lunga che comincia maiuscola, da "N.B." o da un titolo: da lì è **nota**, non cena.
- **Le categorie dello schema si riconoscono a parole intere**, da un elenco scritto a mano
  (`CATEGORIE` in lib/schemaDieta): "fagiolini" non sono legumi, "fettine di carne" non dicono di
  che carne e restano senza categoria (vanno bene sempre). Un piatto nuovo che non nomina niente
  di noto finisce fra quelli "neutri", mai fuori schema per sbaglio.
- **Rifare un pasto per lo schema ha un tetto di porzione** (`porzioneMax`): 150g di pollo
  "valgono" 6 uova o 180g di lenticchie secche, e nessun nutrizionista li scrive. Si prendono le
  porzioni dei nutrizionisti (3 uova, 80g di legumi secchi, 150g di formaggio fresco) e si accetta
  qualche grammo di proteine in meno; i carboidrati e i grassi che il nuovo alimento porta si tolgono
  dal riso e dall'olio, così il pasto resta vicino ai suoi macro.
- **"L'ho mangiata" resta spento sui piatti senza grammi** ("Tagliata di pollo con peperoni +
  riso"): i macro non si inventano, e quel pasto si scrive nel diario. È il caso della maggior parte
  degli esempi dei PDF.
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
- **Il bip col silenzioso vuole iOS 16.4** (Audio Session API): prima suona solo a silenzioso
  spento. E acceso ferma la musica, che non riparte da sola (vedi §1): un'app nativa potrebbe
  mescolarlo o abbassarla, una pagina web su iPhone no.
- **Le pagine dell'app stanno dietro il login**: Google ci vedrebbe solo la schermata d'accesso,
  quindi dalla 35ª non sono in sitemap e il server le manda con `X-Robots-Tag: noindex`. Con
  questi contenuti il sito esce cercando "progettopalestra"; per ricerche generiche ("scheda
  palestra") servirebbe una pagina pubblica con del testo vero.
- **StrictMode** in dev salva due volte (innocuo). Nessun service worker in dev.
- **Icone PWA**: i PNG in `public/` li genera `scratchpad/genera-icone.mjs` (nessuna dipendenza);
  per cambiarle si modificano le forme lì e si rilancia `node genera-icone.mjs public`.

---

