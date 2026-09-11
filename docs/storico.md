# Palestra — Storico delle tornate

> Cosa è stato fatto, quando e **perché**. Non serve per capire dove mettere le mani:
> per quello basta [context.md](../context.md). Serve quando una scelta sembra strana e
> vuoi sapere contro cosa è stata presa — quasi sempre contro un problema vero.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

**Ultima tornata (2026-09-11, 21ª) — IL CORPO DEL RECAP RIFATTO, CANCELLARE UN ALLENAMENTO, E
L'APP CHE SI APRE SENZA RETE.**

**1. Da manichino a tavola anatomica.** L'utente ha chiesto un corpo "molto più realistico, dove si
vedono i muscoli". Prima la sagoma era fatta di segmenti spessi arrotondati — braccia e gambe erano
letteralmente linee con uno spessore — e i muscoli erano ellissi. Adesso il contorno è un profilo
umano chiuso e ogni muscolo è il suo ventre: pettorali, deltoide con le tre teste, bicipite,
tricipite a ferro di cavallo, tartaruga a sei quadretti separati con gli obliqui, trapezio,
dorsali, lombari, glutei, femorali, quadricipiti, polpacci, più i `solchi` che li separano.

⚠️ **La struttura di `lib/corpoForme.js` non è cambiata**, ed è tutto il motivo per cui quel file
esiste: il disegno nuovo è arrivato insieme all'SVG della pagina e alla canvas 1080×1350 della card
condivisibile, senza toccare né l'uno né l'altra.

Niente occhi né bocca: una tavola anatomica non ha una faccia, e due puntini con un sorriso
facevano scivolare tutto verso il fumetto. `specchia()` costruisce la metà destra dalla sinistra e
⚠️ **rifiuta i comandi relativi** invece di restituire un path storto — un `h-5.6` specchiato a
numeri darebbe 105.6, cioè un muscolo fuori dal corpo, un difetto che si vede a occhio ma non si
capisce leggendo il codice. Due cose corrette disegnando: il tronco arrivava più in fuori di dove
comincia il deltoide e il suo angolo sbucava come uno scalino grigio; i pettorali scendevano sotto
l'ascella e leggevano come un seno.

**2. Cancellare un allenamento svolto**, dai tre posti da cui uno se ne pente: il riepilogo di fine
allenamento, il recap del giorno nel calendario, e lo Storico — lì solo in "I miei", perché
l'allenamento di un altro non si cancella. La chiave è la `data`, l'istante esatto in cui è finito:
è l'unica cosa che hanno in mano tutti e tre, perché lo Storico legge dal server e non sa in quale
scheda stia la riga.

⚠️ Due cose senza le quali il tasto **non funzionava davvero**, e nessuna delle due si vedeva dal
codice. Lo Storico non legge le proprie schede ma il collettivo, che è tenuto da parte: cancellando,
la riga spariva dai dati veri e restava a schermo, e chi guarda pensa che il tasto sia rotto
(rileggere subito dal server non risolve — la cancellazione ci sta ancora arrivando). E toccando
OGGI nel calendario si finiva **sempre** sulla scheda: il recap del giorno stava per ultimo nella
catena, quindi con un programma attivo all'allenamento appena fatto non ci si arrivava mai.

⚠️ **La prova che mancava**: cancellare e poi RICARICARE. Senza quella non si sa se la cancellazione
è arrivata al server o è rimasta sul telefono — ed è l'unica cosa che conta.

**3. Senza rete l'app si apre — prima no.** `salvaProfiloInCache` e `profiloInCache` erano chiamate
in **sei punti** di `AccountContext` e definite in **nessuno**. Quindi la copia locale del profilo
non veniva mai scritta, e la riga che doveva usarla quando il server non risponde era essa stessa un
ReferenceError: il ripiego per la palestra sottoterra non è che non funzionasse, era la prima cosa a
rompersi proprio quando serviva. Senza rete si finiva al "Benvenuto", chiusi fuori dai propri
allenamenti che intanto erano lì sul telefono.

Le due funzioni ora stanno in `lib/utenti.js`. Una copia sola e non un elenco (se no tornerebbe il
vecchio "chi c'è su questo dispositivo" che l'app ha smesso apposta di mostrare), legata all'**ID**
di chi l'ha scritta, e cancellata **uscendo**.

E l'app adesso lo **dice**: `statoCloud` esisteva già in `StoreContext` e non lo leggeva nessuno.
Ora lo mostra `components/BarraOffline`, una striscia gialla e non rossa — non c'è niente di rotto,
le modifiche si accodano e partono da sole. Quello che mancava era saperlo: senza dirlo uno chiude
l'app convinto che sia tutto al sicuro sul server.

⚠️ **Una prova falsa, buttata via**: per rendere il server irraggiungibile avevo cambiato
`VITE_SUPABASE_URL`, ma così cambia anche la chiave con cui Supabase salva la sessione — si
simulava "altro progetto", non "senza rete". La prova vera è un gancio temporaneo in `lib/supabase`
che fa fallire le sole chiamate al database, e la copia locale marcata con un nome diverso: l'app
entra mostrando **quel** nome, che è la prova che parte davvero da lì.

⚠️ **Due limiti che restano**: al primo accesso su un telefono la rete serve (senza copia non si sa
chi sei, e non ci si inventa un profilo), e dopo molte ore offline il token della sessione non si
rinnova più — lì si torna al "Benvenuto". Il secondo non è stato provato, e non si dà per risolto.

**E una lezione sul metodo.** Il primo rapporto dell'utente è stato "la cancellazione non funziona".
Non era vero: il codice era completo e provato. Non era mai stato **pubblicato** — ci si era fermati
prima del `git push`, e sul telefono c'era ancora la versione del giorno prima, dove il tasto non
esiste. ⚠️ Finché non si pubblica, quello che l'utente prova non è quello che si è scritto.

---

**(2026-09-10, 20ª) — LA SESSIONE DI ALLENAMENTO RIFATTA A CARD ORIZZONTALI, e
quattro cose chieste provando l'app.**

Prima tornata fatta "a caldo": l'utente prova, trova, si sistema. Quattro richieste, in ordine.

**1. "Condivisi" era in tutti e due i menu.** Stessa pagina raggiungibile dal menu laterale e dal
menu del profilo — e con lei **due pallini rossi che contavano le stesse cose**. Tolta dal laterale:
è roba che arriva a TE, non una funzionalità trasversale. Adesso il pallino sull'avatar conta le
condivisioni e le foto da guardare, quello sull'handle le richieste di amicizia, e nessuno dei due
annuncia roba che da lì non si raggiunge.

**2. Il "+" sul calendario.** Via la scritta "Calendario" (che questa sia la pagina del calendario
si vede dal calendario), e al suo posto il tasto per costruire a mano l'allenamento di oggi:
esercizi, serie, ripetizioni, carico, recupero. ⚠️ **Non è una scheda**, ed è la differenza che
regge il resto: una scheda è un programma che dura settimane, questo è una cosa sola da fare adesso.
Si appoggia alla scheda-contenitore `libera:true` che c'era già per l'allenamento consigliato.

Due cose nascoste apposta in quella pagina: le settimane (non esistono in un allenamento singolo) e
gli allegati. ⚠️ Le foto no per un motivo che conta: una foto ha bisogno della scheda in cui sta,
perché è la visibilità della scheda a decidere chi può scaricarla (`posso_scaricare_media`), e lì la
scheda-contenitore non esiste ancora. Si aggiungono durante l'allenamento, quando c'è.

**3. "Le mie schede" → "Schede e allenamenti", e la scelta a fine allenamento.** La pagina tiene due
cose diverse e adesso lo dice: *Schede* (i programmi) e *Allenamenti* (i singoli tenuti). Nel
riepilogo, per i soli allenamenti liberi, compare **"Salvalo" / "Solo per oggi"** (`Giorno.salvato`).
⚠️ "Solo per oggi" **non cancella niente**: il completamento resta in calendario e nello storico,
l'unica differenza è se compare tra le cose da poter rifare. E la scelta si scrive subito, non al
"Fatto": chi chiude l'app ha comunque scelto — di no.
⚠️ "Rifai questo allenamento" avvia un giorno NUOVO con gli stessi esercizi, e non riusa quello
salvato: `terminaSessione` sostituisce il completamento con la stessa coppia settimana+giornoId, e
riusarlo cancellerebbe la volta prima dallo storico.

Lo **Storico** è stato diviso in "I miei" e "Degli altri": mescolati, chi si allena tre volte a
settimana e ha venti amici non ritrovava più i suoi. ⚠️ La seconda scheda si chiama "Degli altri" e
non "Amici" anche se l'utente aveva detto amici: lì arriva chiunque abbia reso PUBBLICO un
allenamento, e scrivere "Amici" sarebbe stata una bugia a schermo.

**4. La sessione a card orizzontali — il pezzo grosso.** Gli esercizi non sono più uno alla volta
che si sostituisce: sono **card affiancate che si scorrono di lato**, tutte montate insieme.

⚠️ **Cosa si perdeva davvero, andando avanti e indietro.** Non i pallini: quelli vivono nella
sessione e non si sono mai persi. Si perdeva **la serie selezionata**, perché ce n'era UNA sola per
tutta la sessione e un effetto la riportava d'ufficio alla prima non fatta a ogni cambio di
esercizio. Ora è per esercizio (`selPerEs`, chiave = esercizioId). Provato: due serie segnate sul
settimo esercizio, giro sul primo e sul quarto, ritorno — verde, rosso e "Serie 3 di 4" dov'erano.

Tre cose che si vedono, e il perché:

- **Le card non attive sono `inert`.** Hanno tasti veri e durante lo scorrimento se ne intravede un
  pezzo: `aria-hidden` da solo lascerebbe tasti premibili e invisibili a chi non vede.
- **Commenti e foto si montano SOLO sulla card attiva.** Ogni miniatura va a prendersi il file:
  montarle tutte vorrebbe dire, aprendo l'allenamento, scaricare i video di otto esercizi.
- **`overscroll-behavior-x: contain`**, se no su iPhone arrivare in fondo scorrendo fa scattare il
  "torna indietro" di Safari e si esce dall'allenamento con una scrollata.

⚠️ **I due sensi di sincronizzazione si davano battaglia**: scorri → cambia l'indice, cambia
l'indice → scorre. Uno scorrimento morbido verso il terzo esercizio passa davanti al secondo, che si
prendeva il fuoco e riportava indietro. `scrollDaCodice` è la finestra in cui lo scorrimento partito
dal codice ha la precedenza.
⚠️ E **a pagina nascosta lo scorrimento morbido non parte proprio** (il browser sospende le
animazioni): scoperto provando in una scheda in secondo piano, dove l'indice cambiava e la card
restava ferma. Lì si salta di netto — se no la card resta disallineata dall'esercizio che l'app
crede di mostrare.

**Due cose trovate per strada, non chieste.**

⚠️ **`salvaProfiloInCache` e `profiloInCache` non esistono**: chiamate in 6 punti di
`AccountContext`, definite in nessuno. La copia locale del profilo non è mai stata salvata, e il
ripiego "se il server non risponde uso l'ultima copia vista" è la riga stessa che va in errore —
cioè il caso della palestra sottoterra, che è tutto il motivo per cui la copia locale esiste.
**Non ancora sistemato**, segnalato all'utente.

⚠️ **La documentazione diceva il contrario del codice sulla sessione.** `decisioni.md` e `context.md`
riportavano ancora "utente attivo non ricordato, si riparte dal Benvenuto a ogni apertura": regola
vera fino al cloud e ribaltata con gli account veri (`persistSession: true`, col suo perché scritto
accanto in `lib/supabase.js`). È saltata fuori perché l'utente ha chiuso l'app col dito su iPhone e
si è ritrovato dentro, sospettando un errore. Corretta in tutti e due, scrivendo *quando* è stata
ribaltata: è il tipo di riga stantia che prima o poi fa "sistemare" a qualcuno un comportamento
giusto.

---

**(2026-09-10, 19ª) — LE VISTE 3D DI PETTO E SCHIENA (lavoro di Nico), e come
sono state integrate.**

Primo contributo di qualcun altro sul progetto: ramo `Nico`, un commit, un fast-forward pulito
sopra `main`. Nella pagina Esercizi, dove esiste una scena 3D, il manichino piatto lascia il posto
a un modello che si gira con le dita; nell'elenco compare un badge **3D**. Dodici moduli nuovi
(cataloghi, scene, geometrie, pose), tre componenti, e **42 test** col runner di Node.

Fatto bene di suo: i componenti 3D sono caricati in `lazy`, quindi Three.js (~560KB) non entra nel
primo avvio, e i cataloghi sono file leggeri separati dalle scene — così `EserciziPage` sa se
mostrare il badge senza caricare niente di pesante.

Due cose sistemate integrandolo:

- ⚠️ **Il service worker precaricava Three.js**, annullando il lavoro del `lazy`. Il caricamento
  pigro lo tiene fuori dal bundle iniziale, ma `vite-plugin-pwa` mette in precache tutto quello che
  trova: l'installazione dell'app era passata da **801 KiB a 1384 KiB**, scaricati anche da chi non
  aprirà mai un esercizio 3D — e riscaricati a ogni aggiornamento. Adesso `three` è escluso dal
  precache e si scarica alla prima vista 3D aperta, restando poi in cache: **839 KiB**.
  ⚠️ Perché la regola non si rompa in silenzio, Three.js ora finisce in un pezzo con un nome
  STABILE (`manualChunks`): senza, il pezzo si chiamava come il primo modulo che ci finiva dentro
  (`torace3d-…`), e sarebbe bastato rinominare un file per rimetterlo nel precache senza che
  nessuno se ne accorgesse.
- **I 42 test non erano agganciati a niente**: nessuno script, quindi nessuno li avrebbe lanciati
  per abitudine. Adesso `npm test`.

**Poi, nella stessa giornata — LA BARRA "C'È UNA VERSIONE NUOVA".**

Serviva da quando l'app non è più solo sul telefono dell'utente: una correzione pubblicata non
raggiungeva nessuno finché quella persona non chiudeva l'app davvero e la riapriva, e non c'era
modo di saperlo. Il service worker è passato da `autoUpdate` a `prompt`.

- ⚠️ **Non si aggiorna da soli perché aggiornare vuol dire ricaricare**, e ricaricare al momento
  sbagliato vuol dire farlo in faccia a chi ha il bilanciere in mano. Durante l'allenamento la
  barra non compare affatto (la sessione sopravvivrebbe — è salvata e il timer va sull'orario
  reale — ma il tasto non deve stare lì). Appena finisce, la barra c'è.
- **"Più tardi" non è "mai":** sparisce e torna alla prossima apertura. Nessuno resta indietro per
  sempre, nessuno viene tampinato.
- ⚠️ **Provata davvero, e la prima prova era falsa.** Per far comparire la barra serve un build
  DIVERSO dal precedente: la prima modifica di prova era un commento CSS, che il minificatore
  cancella — file identico, nessun aggiornamento da rilevare, e per un momento è sembrato che la
  barra non funzionasse. Con una modifica vera: rilevato → barra → tasto → la pagina si ricarica
  col CSS nuovo e la barra sparisce. Tutto il giro.

**E infine — PARLARE COL DATABASE DA QUI (`npm run db`), e cosa si è scoperto appena fatto.**

Fino a quel momento ogni domanda sul database tornava indietro all'utente sotto forma di "incolla
questa query nel SQL Editor". Scelta sua, presa sapendo cosa costa: accesso in **lettura e
scrittura** tramite `scratchpad/db.mjs`, che legge la connessione da un `.env` fuori dal repo.

Cautele messe nel codice invece che nelle buone intenzioni: la connessione non viene mai stampata
(nemmeno dentro gli errori di `pg`, che a volte se la portano dietro), le istruzioni distruttive
vengono annunciate in testa all'output, e un `.sql` intero gira dentro una transazione — o passa
tutto o non passa niente.

Tre trappole, tutte incontrate davvero, tutte scritte in [context.md](../context.md) §3:

- ⚠️ **`.gitignore` non copriva i file `.env`**, e in questo progetto si lavora spesso con
  `git add -A`. Sistemato PRIMA di chiedere qualunque credenziale: era il modo più probabile in
  cui quella password sarebbe finita su GitHub.
- ⚠️ **`.env.example` è tracciato** (è il modello, deve starci), e l'utente ha compilato quello
  invece del `.env`. Presa in tempo, mai committata — ma la password era stata letta nel
  frattempo, quindi si cambia comunque. È il tipo di errore che il file stesso invita a fare, e
  ora c'è scritto sopra.
- **Esplora risorse di Windows non crea file che iniziano con un punto**: il `.env` sembrava fatto
  e non esisteva.

**E poi la scoperta, che da sola vale tutto il giro.** La prima verifica ha detto: 4 funzioni su 6,
zero bucket, e `default_nascosto = 0`. Cioè: **il database aveva ancora le regole vecchie** mentre
il codice pubblicato credeva fossero cambiate. In concreto, un amico che avesse finito un
allenamento senza toccare il selettore l'avrebbe pubblicato a tutti — con l'app che gli mostrava il
contrario. Lo schema era stato lanciato una volta sola, settimane di modifiche prima.

⚠️ **È il tipo di disallineamento che provando l'app non si vede.** L'interfaccia era corretta; a
essere indietro era il server, che è quello che decide davvero. Si vede solo chiedendolo al
database — che è esattamente la cosa che fino a quel momento non si poteva fare.
Schema applicato per intero e riverificato: 6 funzioni, 2 bucket, 10 regole sui file, default
nascosto attivo.

**Tornata precedente (2026-09-10, 18ª) — CHIUDERE IL RAMO: via la master password, e le tre viste
"di tutti" che smettono di guardare il telefono.**

Sempre sul ramo `cloud-supabase`. Tre cose, e una quarta che è saltata fuori facendo la prima.

**1. La master password `PippoN1` non c'è più**, e con lei tutto `lib/password.js`. L'utente aveva
scelto di tenerla il giorno prima, e la scelta era ragionevole: apriva i profili di quel telefono,
e il telefono era suo. Con gli account veri apriva l'account di chiunque, da qualunque parte del
mondo, e stava nel bundle pubblico.

- ⚠️ **Togliendola è venuto fuori che la conferma per eliminare il profilo non controllava più
  niente.** Il profilo cloud non ha più `pwHash`, e `verificaPassword` senza hash rispondeva "sì" a
  qualsiasi cosa — password vuota compresa. Cioè: da settimane il tasto più irreversibile dell'app
  aveva davanti una porta finta. Adesso la password si ricontrolla contro Supabase
  (`verificaPasswordAttuale`), e **senza rete si dice che non si è potuto controllare** invece di
  lasciar passare.

**2. `storico` / `schedeGenerali` / `comunita` non leggono più niente da sole.** Erano rimaste a
frugare nel localStorage di tutti i profili del dispositivo: nel cloud quella roba non esiste, e
comunque rispondeva "chi c'è su questo telefono" a una domanda che era "chi usa l'app". Adesso
ricevono un **collettivo** (`lib/collettivo.js`, `hooks/useCollettivo.js`) e si limitano a contare.

- ⚠️ **Il filtro è stato spostato nel database, non copiato.** Lasciar passare la scheda intera e
  nascondere il resto a schermo non è nascondere: chi guarda la rete se li leggerebbe tutti,
  compresi quelli marcati "non farlo vedere a nessuno". La regola che lasciava leggere le schede
  pubbliche **direttamente dalla tabella** è stata richiusa.
- ⚠️ **Prima versione sbagliata, corretta dall'utente:** avevo fatto della visibilità della scheda
  un *tetto* per quella dei suoi allenamenti — nascondi la scheda, spariscono anche gli
  allenamenti fatti dentro. Comodo da scrivere (una riga di regola sulla riga della tabella) ma
  falso: nascondere una scheda vuol dire "non far vedere il mio programma", pubblicare un
  allenamento vuol dire "ho fatto questo, guardate", e uno può volerle dire tutte e due insieme.
  Da lì **due funzioni invece di una**: `schede_visibili()` manda i programmi **senza** i
  completamenti, `allenamenti_visibili()` manda i completamenti uno per riga presi da **qualsiasi**
  scheda, anche nascosta, filtrati uno per uno. Della scheda nascosta non esce niente — nemmeno il
  nome: quello che si vede dell'allenamento (nome scheda e giorno) ce l'ha dentro il completamento,
  congelato a fine allenamento da `lib/session.js`. Nel browser diventano due liste, e il conto dei
  "pianificati" e quello degli "svolti" partono da liste diverse.
- ⚠️ **Lo schema NON era idempotente come diceva di essere**, ed è saltato fuori solo lanciandolo
  la seconda volta: `ERROR 42710: policy "profilo: il mio e quelli legati a me" already exists`.
  La tappa 2 rinominava una policy della tappa 1, e sopra il `create` c'era il `drop` del nome
  VECCHIO — quindi funzionava al primo giro e si rompeva al secondo, cioè proprio quando serve
  (quando si rilancia il file dopo averlo corretto). Servono DUE drop. C'era anche una policy
  creata nella tappa 2 e tolta in fondo allo stesso file: adesso non si crea più. La regola sta
  scritta in testa a [schema.sql](../supabase/schema.sql), che è dove la legge chi lo tocca.
- ⚠️ **`nomi_di()` andava allargata di conseguenza:** diceva il nome di chi ha almeno una scheda
  pubblica. Chi tiene per sé il programma e pubblica gli allenamenti non ne ha nessuna, e sarebbe
  finito nello Storico come "qualcuno".
- ⚠️ **Due cose il browser non può calcolarsele**, e arrivano dal server insieme alle schede: se
  l'autore è un PT, e se la scheda è del MIO PT (2) o di un altro suo atleta (1). Ricavarle qui
  vorrebbe dire leggere il profilo di uno sconosciuto, che è esattamente ciò che il database
  impedisce.
- **Un comportamento è cambiato apposta** (in [decisioni.md](decisioni.md)): per chi NON ha un PT
  il segnale dei personal trainer conta solo le loro cose, non più anche quelle dei loro atleti —
  di chi sia atleta l'autore di una scheda pubblica non lo si può sapere senza leggerne il profilo,
  e chi pubblica una scheda ha deciso di mostrare quella, non con chi si allena.
- **Una lettura sola per apertura dell'app**, tenuta da parte: le pagine che la usano sono sette e
  si aprono e chiudono di continuo. Si butta via quando cambiano le PROPRIE schede — finito un
  allenamento lo si deve ritrovare nello Storico senza riavviare. ⚠️ Una lettura *andata male* non
  si tiene: sarebbe una schermata vuota che non si ripara più.

**3. Il campo "codice del tuo PT" è tornato in registrazione**, tolto nella tappa 1 perché non
poteva funzionare.

- ⚠️ **Lì il codice non si può controllare**: per chiedere al database di chi è bisogna essere già
  entrati, e in quella schermata l'account non esiste ancora. Quindi si controlla la forma, e il
  resto lo fa `AccountContext` appena la sessione c'è.
- ⚠️ **E l'avviso non si può mostrare lì**: quella schermata sparisce nello stesso istante in cui
  l'account nasce (c'è la sessione → l'app prende il suo posto). Quindi l'avviso si lascia in
  `sessionStorage` e lo raccoglie il menu del profilo, che apre il pannello "Personal trainer" col
  codice già scritto — dire "il codice era sbagliato" senza dare il posto dove rimediare non
  servirebbe a niente.

**4. Foto e video degli esercizi sul cloud** (prima metà della tappa 3). Bucket privato, tabella
`media` con quello che serve alle regole, e il file che va su Storage **tenendo** la copia locale —
che non è un'ottimizzazione: è ciò che fa comparire la miniatura nell'istante in cui scegli la foto,
e ciò che te la fa vedere in palestra dove la rete non c'è.

- ⚠️ **La proprietà di un media si decideva confrontando i NOMI** (`m.autore === utenteCorrente.nome`).
  Reggeva quando i profili stavano su un dispositivo e lì i nomi erano unici; ma la schermata di
  registrazione ora dice il contrario — *"Può ripetersi: a distinguervi è l'email"*. Due persone
  che si chiamano uguale si sarebbero viste elencate le foto private l'una dell'altra. Era latente
  finché i file erano locali (il blob non c'era, la miniatura restava vuota): mettere i file sul
  cloud lo avrebbe reso vero. Adesso il `MediaRef` porta `autoreId`, che è anche quello che dice in
  quale cartella dello Storage sta il file.
- ⚠️ **"Pubblica" non poteva voler dire "chiunque conosca l'id".** La regola sul bucket ripete le
  stesse condizioni di `schede_visibili()`: la foto la vede chi può vedere la scheda in cui sta.
- ⚠️ **La visibilità di un media è scritta in due posti** — la riga sul database (su cui decide la
  regola) e il `MediaRef` nel json (che disegna il lucchetto). È l'unico punto dell'app in cui lo
  stesso fatto sta due volte, ed è segnalato in tutti e due i file: comanda la riga, e se divergono
  il file semplicemente non si scarica.
- **Gli effimeri sono rimasti locali, apposta.** Per metterli sul cloud serve che a cancellarli sia
  il SERVER a scadenza: oggi il blob lo cancella il client che guarda, e "sparisce dopo 24 ore"
  diventerebbe una promessa che mantiene il telefono di chi guarda, cioè nessuno. Finché non c'è
  quel pezzo, `lib/media.js` gli presta le sole primitive locali, con un nome che lo dice.

**Provato:** `node scratchpad/prova-collettivo.mjs` (21 controlli sulle funzioni pure: chi vede
cosa, l'ordine, il segnale del PT con e senza PT, cosa succede senza collettivo — e due apposta sul
caso *scheda nascosta + allenamento pubblico*, che è quello che aveva fatto correggere il tiro) ·
build e lint puliti (i soliti 4 warning preesistenti) · la registrazione a schermo, col campo del
codice PT che compare per chi si allena e diventa "Il tuo codice PT" per chi è un PT.
**5. Gli invii momentanei sul cloud** (seconda metà della tappa 3), e con loro la fase 2b è chiusa.

- ⚠️ **La domanda vera era "cosa vuol dire sparisce".** Sul telefono voleva dire "cancello il blob
  da IndexedDB". Sul cloud non si può promettere altrettanto — cancellare una riga di
  `storage.objects` non garantisce che i byte spariscano dal disco di qualcun altro. Quindi si
  promette quello che si può mantenere: **il file non si scarica più**, e lo dice la regola, che
  guarda la riga a ogni richiesta. I byte li cancella davvero chi guarda, chiudendo il visore. È
  la stessa onestà della decisione di allora: momentanei per la MEMORIA, non per la privacy.
- ⚠️ **La prima versione della pulizia non poteva funzionare, e l'ha scoperto l'utente** provando
  ad azzerare gli account: `pulisci_effimeri_scaduti()` cancellava i file con
  `delete from storage.objects`, che Supabase VIETA con un trigger — anche a chi lancia il SQL
  Editor. È una protezione giusta (la riga cancellata lascerebbe il file vero dov'è, invisibile e
  irrecuperabile). I file si tolgono solo dalla Storage API, quindi la pulizia l'ha presa in
  carico l'app. ⚠️ Nel sistemarla è saltato fuori un **secondo** bug nello stesso pezzo: l'effetto
  che la chiamava le passava la lista degli invii, ma a quel punto era ancora vuota — gli invii li
  stava leggendo `ricaricaSociale`, che parte nello stesso istante. Girava sempre su niente.
  Adesso le righe scadute se le chiede lei al server. ⚠️ E l'ordine è obbligato: **prima il file,
  poi la riga**, perché la regola che permette di cancellare un file va a cercare la sua riga.
- ⚠️ **Niente cron**, che sembrava obbligatorio e non lo era: `pulisci_effimeri_scaduti()` la
  chiama l'app all'accesso, esattamente dove la chiamava prima. Un cron avrebbe aggiunto pezzi da
  tenere in piedi senza aggiungere garanzie, perché nel frattempo la regola dice già di no.
- **Un file per destinatario**, non uno condiviso: "l'ha guardata" è di ciascuno. Conseguenza da
  raccontare a schermo: un invio può riuscire per due amici su tre, e il modale adesso dice
  "Mandato a 2 di 3" invece di "mandato" e basta.
- **Conseguenza accettata:** senza rete un invio non si apre più (prima il blob era sul telefono).
  Non si accoda: una cosa che scade fra 24 ore in coda non ha senso.

**6. Chi non sceglie non pubblica** — trovato controllando cosa sarebbe successo con persone vere
dentro, subito prima di aprire l'app agli amici.

- ⚠️ **Il codice e la documentazione dicevano il contrario.** `decisioni.md` diceva "le schede
  nascono `nascosta`", ma `VISIBILITA_DEFAULT` era `PUBBLICA` e `visibilitaDi()` trattava il campo
  assente come pubblico — una retro-compatibilità con dati salvati prima che il campo esistesse,
  che col cloud non esistono più. Anche la colonna `schede.visibilita` aveva `default 'nascosta'`,
  che però non entrava mai in gioco perché l'app manda sempre un valore.
- **Cosa sarebbe successo:** un amico si iscrive, importa la scheda del suo PT, fa il primo
  allenamento — e senza aver toccato niente, carichi, ripetizioni e cronologia finiscono nelle
  Schede Generali e nello Storico di tutti, col suo nome. Una scelta che si subisce non è una
  scelta, e cambiarla dopo sarebbe stato peggio: avrebbe voluto dire nascondere retroattivamente
  roba che nel frattempo avevano già visto tutti.
- ⚠️ **Andava cambiato in DUE posti**, o non serviva a niente: `lib/visibilita.js` e le funzioni
  `allenamenti_visibili()` / `nomi_di()` nello schema, che avevano lo stesso `'pubblica'` scritto
  nel `coalesce`. Il filtro che conta è quello del database: cambiando solo l'app, il server
  avrebbe continuato a pubblicare roba che l'app considerava nascosta.
- **Prezzo accettato:** all'inizio Storico e Schede Generali sono vuoti e il motore dei consigli
  ricade sul catalogo, finché qualcuno non pubblica qualcosa.

**Provato dall'utente:** lo schema lanciato nel SQL Editor (dopo aver sistemato due punti in cui il
file NON era idempotente come dichiarava), e le tre viste con due account veri — Storico, Schede
Generali e il caso scheda-nascosta/allenamento-pubblico tornano tutti.
⚠️ **NON PROVATO DA NESSUNO, ed è la cosa da fare per prima:** tutta la tappa 3. Media ed effimeri
compilano e le regole ci sono, ma nessuno ha ancora caricato un file — serve un login, che da qui
non si fa, e l'utente non aveva modo di provare quel giorno. **Non dare per funzionante quella
parte finché qualcuno non l'ha vista funzionare.**

---

**Tornata (2026-09-10, 17ª) — IL CLOUD: telefono e PC si parlano.**

Ramo `cloud-supabase`, non ancora unito a `main`. Progetto Supabase `nmnsdyutsjrxcvjvwvog`.

**Tappa 1 — account veri e dati sincronizzati.** Login con email e password, profilo creato da un
trigger, schede/diete/preferenze/sessione sul database. Provato con un dispositivo dalla memoria
completamente vuota: fa login e ritrova tutto.

- **Il dispositivo resta la copia che si legge, il server quella che dura.** L'app si apre subito
  con quello che ha in locale, poi il server ha l'ultima parola; ogni modifica va prima in locale
  e poi su, e se non parte resta in coda (`lib/sync.js`).
- ⚠️ **Due bug trovati PROVANDO l'app senza rete, non leggendone il codice.** All'avvio offline si
  tornava al "Benvenuto" pur essendo già dentro: la sessione c'era, ma il nome arrivava solo dal
  server. E peggio: una modifica fatta offline veniva **annullata in silenzio** mentre la schermata
  diceva "Dati salvati". Da lì la distinzione che regge tutto il resto — *rete caduta* e *rifiuto
  del server* sono cose opposte (`erroreDiRete` in `lib/supabase.js`).
- ⚠️ `schede.id` doveva essere `text` e non `uuid`: `nuovoId()` ha un ripiego non-UUID, e con una
  colonna `uuid` ogni salvataggio sarebbe fallito il giorno che `crypto.randomUUID` non c'è.

**Tappa 2 — gli amici, finalmente veri.** Amicizie e condivisioni sul database: prima esistevano
solo se le due persone usavano lo stesso browser, cioè quasi mai.

- **Ci si trova per codice amico o per nome esatto**, mai per pezzi. Verificato con tre account:
  `alf` non trova `Alfa`, il codice `ALFADVN` sì.
- **Amici suggeriti** solo per legame reale (amici in comune, stesso PT). L'utente li aveva chiesti
  "stile Instagram", ma suggerimenti e ricerca non-sfogliabile tirano in direzioni opposte: un
  suggerimento è un nome che nessuno ha cercato. La riconciliazione è il legame obbligatorio.
- **Accettare un atleta** scrive sul profilo di un altro, e lo fa il database
  (`accetta_relazione`) dopo aver verificato che la richiesta sia davvero per chi accetta.
- ⚠️ **C'erano DUE funzioni che traducevano una riga profilo** e sono divergite alla prima colonna
  nuova: il codice amico arrivava per gli amici e non per sé stessi, e la card "Il tuo codice"
  restava vuota. Ora è una sola (`profiloDaRiga`).

**Cosa NON era ancora fatto a fine tappa 2:** foto e video su Storage (tappa 3), la master password
da togliere, e `storico`/`schedeGenerali`/`comunita` che leggevano ancora il localStorage. Le ultime
due sono la tornata qui sopra; l'elenco aggiornato è in [roadmap.md](roadmap.md).

**Tornata precedente (2026-09-09, 16ª) — il LIVELLO di chi si allena.**

Chiesto dall'utente prima del deploy: all'iscrizione l'atleta dichiara se è **principiante,
intermedio o avanzato** (obbligatorio come gli altri dati, facoltativo per un PT), lo cambia da
**"I miei dati"**, e da lì in poi le schede e gli allenamenti generati si adattano. Ogni voce ha
sotto la riga che spiega cosa vuol dire, e si vedono tutte e tre insieme: è una scelta che si fa
una volta e va capita, non indovinata dal nome.

- **`Utente.dati.livello`** (campo nuovo in `lib/datiFisici.js`, vuoto = non dichiarato).
  **`lib/livello.js`** è il file nuovo: LIVELLI (label + `descrizione` + `effetto`),
  `difficoltaEsercizio()`, `regoleLivello()`, `livelloAmmette()`, `giorniPerLivello()`.
- **Cosa cambia, in concreto.** *Quali esercizi*: ogni esercizio ha una difficoltà di ESECUZIONE
  (`base` = macchine/cavi/manubri/corpo libero · `medio` = bilanciere libero e fondamentali ·
  `avanzato` = stacco da terra, squat frontale, Pendlay, sprint, ab wheel), e un livello prende
  fino alla sua e non oltre. *Quanto volume*: il principiante ha una serie in meno per esercizio,
  ripetizioni mai sotto 8, un esercizio in meno per gruppo e **max 6 esercizi a seduta**.
  *La settimana*: max 4 / 5 / 6 allenamenti e full body proposto per primo ai principianti.
  *Avanzato*: **due multiarticolari pesanti nella stessa seduta** (trazioni E stacco).
- ⚠️ **Il tetto di 6 esercizi non è ridondante.** Senza, il livello si ritorceva contro: con una
  serie in meno ogni esercizio costa meno tempo, quindi nella stessa ora ne entravano **di più** —
  un full body da 7 esercizi a chi ha appena cominciato.
- ⚠️ **Senza `fondamentaliMax: 2` intermedio e avanzato generavano la STESSA scheda.** Il tetto di
  un fondamentale per gruppo (che resta giusto per tutti gli altri) li appiattiva: era l'unica
  differenza che mancava.
- ⚠️ **Il filtro vale anche sugli esercizi che uno ha già nelle sue schede.** La prima versione li
  lasciava passare ("se lo fai, lo sai fare") e non reggeva: **ogni profilo nuovo nasce con la
  scheda d'esempio del PT** (`data/seed.js`), quindi un principiante appena iscritto aveva già
  stacchi e panche tra i suoi esercizi "noti" e si ritrovava esattamente la scheda che il livello
  doveva evitargli. Ora filtra sempre; chi vuole un esercizio lo **sceglie a mano** e entra
  comunque (in ConsigliatoPage quelli fuori livello restano in elenco, marcati **↑**).
- ⚠️ **L'ATTREZZO conta più del movimento** (`SEMPRE_BASE`): "Panca piana manubri" è `base`, "Panca
  piana" (come la scrive un PT, cioè col bilanciere) è `medio`. Nella stessa lista ci sono i
  monoarticolari, se no *"Curl panca inclinata"* diventava una distensione su panca — lo stesso
  inciampo che `lib/eserciziLibreria` segnala per i gruppi.
- **Chi non ha dichiarato un livello non ha nessun limite** (`regoleLivello('')` → `null`): i
  profili nati prima si comportano come prima. Non si mette qualcuno tra i principianti perché non
  ha risposto.
- Toccati: `lib/livello.js` (nuovo) · `datiFisici` (campo + validazione) · `programmazione`
  (`FONDAMENTALI` ora esportato, `prescrizione(modo,tipo,livello)`, `volumeGruppo(g,focus,livello)`,
  `quoteEsercizi` col tetto) · `consiglio` (`generaAllenamento({livello})`) · `schedePrefatte`
  (`splitPerGiorni(g,ob,livello)`, `generaSchedaPrefatta({livello})`, riga nella nota) ·
  `DatiFisiciForm` · `UserGate` · `DatiFisiciPage` · `ProfiloMenu` · `Consigliato/SchedePrefatte` ·
  `index.css` (`.link-inline`, `.ex-pick-oltre`).

**Tornata precedente (2026-09-09, 15ª) — il recap dice solo quello che sa.**

1. **Il corpo coi muscoli allenati nel recap** (`components/CorpoAllenato.jsx`). Due sagome, davanti
   e dietro, con TUTTA la muscolatura disegnata: i gruppi lavorati oggi si accendono di **rosso**,
   più intenso dove sono andate più serie (la quota è sul gruppo più lavorato della giornata). Sta
   sia nella card da condividere (disegnata su canvas) sia nel riepilogo a schermo. Il cardio non è
   un muscolo: si accende il cuore.
   ⚠️ Le FORME sono uscite da `CorpoMuscoli.jsx` e vivono in **`lib/corpoForme.js`** come stringhe
   di path: le usano l'SVG di React (`<path d>`) e la canvas (`new Path2D(d)`). Erano l'unico modo
   di non avere due disegni dello stesso corpo destinati a divergere.

2. **Niente più commenti sui calcoli nella card.** Via "serie × ripetizioni × peso" sotto al volume
   e "stima su 75 kg di peso" sotto alle calorie: è una figurina da mandare agli amici, non un
   referto.

3. **Quello che non si sa NON si mostra.** `statisticheRecap` restituisce `null` (non `'—'`) per
   volume, peso massimo e calorie quando manca l'ingrediente, e `grigliaTessere` disegna solo le
   caselle rimaste — due per riga, e se sono dispari l'ultima prende tutta la larghezza. Idem per
   "N esercizi · N serie", per l'etichetta di intensità e per la firma in fondo.

4. **I dati fisici stanno sul PROFILO** (`lib/datiFisici.js` + `Utente.dati`): sesso, età, peso,
   altezza, movimento e obiettivo. Si chiedono creando l'account (obbligatori per un atleta,
   facoltativi per un PT) e si cambiano da **"I miei dati"** nel menu del profilo
   (`pages/DatiFisiciPage.jsx`, rotta `#/dati`). Le calorie del recap ora si stimano sul peso VERO;
   senza peso la casella sparisce. Prima esistevano solo dentro la Dieta, e chi non ne aveva una si
   vedeva "stima su 75 kg", cioè su una persona che non era lui.

5. **La dieta si calcola anche se non c'è.** Senza nessuna dieta scritta, `dietaDaDatiFisici()`
   parte dal metabolismo basale, applica l'obiettivo e propone calorie, macro e piatti: si vede in
   "Dieta" e in "cosa mangiare oggi", marcata come **proposta non salvata**, con un tasto che la
   salva davvero. Una dieta nuova nasce già compilata coi dati del profilo. Se i dati mancano non si
   inventa niente: si dice cosa manca e si manda a "I miei dati".
   ⚠️ `MOVIMENTI`, `OBIETTIVI` e `SESSI` si sono spostati da `lib/dieta.js` a `lib/datiFisici.js`
   (dieta li ri-esporta, quindi gli import esistenti reggono) e agli obiettivi si è aggiunto
   **`massa`** (Aumento di massa). `dimagrimento` ora si chiama "Perdita di peso".
   Il peso di una dieta GIÀ SALVATA non si aggiorna da solo: è la fotografia di quando è stata
   scritta, si rigenera dall'editor.

**14ª tornata — far VEDERE gli esercizi.** Nella sezione Esercizi i nomi da
soli non bastano a chi comincia: "dorsali" o "pulley basso" non dicono niente. Ora:

1. **Il corpo umano col muscolo acceso** (`components/CorpoMuscoli.jsx`). Ogni gruppo si presenta con
   una sagoma in cui quel gruppo è colorato del colore del gruppo: piccola nella card dell'elenco,
   grande nella testata quando si entra, e lì con **due viste** (davanti e dietro) dove servono —
   gambe (quadricipiti davanti, glutei/femorali/polpacci dietro) e spalle. Il **cardio** non è un
   muscolo: si accende tutto il corpo e batte un cuore.

2. **Ogni esercizio ha un manichino che ripete il gesto**, in miniatura nella riga e in grande
   quando la riga si apre, con una riga di tecnica sotto (`components/EsercizioAnimato.jsx`).
   Coperti **tutti i 110 esercizi** del catalogo con ~80 movimenti (`lib/animazioniEsercizi.js`).

⚠️ **Perché disegni e non gif/video.** Le gif belle che si trovano in giro sono quasi tutte protette
da copyright, e 110 file da qualche centinaio di KB sarebbero decine di MB da scaricare e da tenere
nella cache di una PWA che deve funzionare offline (e che ha ~1GB di storage gratuito, vedi [risposte-utente.md](risposte-utente.md) punto 5). Qui un
esercizio sono **due pose = una ventina di numeri**: pesa nulla, funziona offline, si tinge del
colore del gruppo e resta nitido a ogni dimensione.

**Come è fatto** (i tre file hanno commenti lunghi in testa, questo è il riassunto):
- `lib/figura.js` è il manichino: una catena di segmenti di lunghezza fissa, una POSA sono gli
  angoli di quei segmenti più la posizione del bacino. Da posa `a` e posa `b` genera i fotogrammi
  **interpolando gli angoli, non i punti** — interpolando i punti a metà corsa un avambraccio
  piegato si accorcerebbe a vista d'occhio. Una posa può anche dire solo **dove finisce la mano o il
  piede** (`mano: [x,y]`): gli angoli li trova la cinematica inversa `ik()`. È ciò che tiene la mano
  *sulla sbarra*, sul bilanciere, per terra.
- `components/EsercizioAnimato.jsx` disegna e anima con **SMIL** (`<animate>` dentro l'SVG), non con
  JavaScript: l'animazione la manda avanti il browser, senza timer né re-render di React, e in una
  lista con venti esercizi che si muovono insieme la differenza si sente. Ogni pezzo del corpo è UNA
  polyline con UN solo animate su `points`. Chi ha `prefers-reduced-motion` vede la figura ferma nel
  punto di massimo sforzo.
- `lib/animazioniEsercizi.js` è il catalogo: due pose, l'attrezzo in mano, la "scena" (panca, sbarra,
  cavo, tapis roulant…) e la riga di tecnica. Un movimento serve più esercizi (panca piana e
  multipower sono lo stesso gesto), e chi non è in elenco prende il movimento di riserva del suo
  gruppo.

**13ª tornata — quattro cose chieste dall'utente.**

1. **Benvenuto invece di "Chi sei?"** (`pages/UserGate.jsx`). Prima la schermata iniziale elencava
   i profili del dispositivo: comodo, ma raccontava a chiunque quanti account ci sono e come si
   chiamano. Ora si scrive nome e password. Chi sbaglia il nome e chi sbaglia la password ricevono
   **lo stesso messaggio** ("Nome o password non corretti"): dire "questo nome non esiste"
   rimetterebbe in piedi l'elenco un tentativo alla volta. L'**eliminazione del profilo** è passata
   nel menu del profilo (ProfiloMenu), che è l'unico posto da cui si può ancora raggiungere.

2. **Condivisioni tra amici** (`lib/condivisioni.js`, `components/CondividiConAmici.jsx`,
   `pages/CondivisiPage.jsx`). Si mandano **schede**, **allenamenti svolti** e **recap**. Ogni
   condivisione è una COPIA congelata: se domani cancello la scheda, chi l'ha ricevuta ce l'ha
   ancora. Una scheda ricevuta si salva tra le proprie (id nuovi, storico azzerato, nasce
   *nascosta*). Del **recap non viaggia l'immagine** ma i numeri (`riep` + `stat`, ~3KB contro
   ~1MB): la card la ridisegna il dispositivo di chi guarda. Tasti: topbar della scheda, modale del
   giorno in calendario, fine allenamento.

3. **Foto e video momentanei** (`lib/effimeri.js`, `components/VisoreEffimero.jsx`,
   `InviaMediaEffimero.jsx`). Il blob sta in IndexedDB e si cancella **all'apertura** del visore
   (non alla chiusura: se l'app muore di colpo il file è già andato) e comunque **dopo 24 ore**.
   Resta la riga di metadati, così il mittente per un giorno vede "l'ha aperta". La foto si chiude
   da sola dopo 10 secondi, il video quando finisce. Non è privacy — è memoria: un video di 10"
   pesa ~15MB, e lo diciamo nel modale insieme al fatto che uno screenshot può sempre farlo.

4. **Dieta da fuori + preferenze alimentari.** Tre pezzi nuovi:
   - `Dieta.fonte` = `calcolata` | `esterna`: nel secondo caso l'app **non ricalcola niente**, tiene
     i numeri del nutrizionista e sa solo riempire i piatti (`pastiDaMacro`).
   - **Giornate tipo** (`Dieta.giornate`): menu alternativi marcati allenamento / riposo / sempre.
     In "cosa mangiare oggi" **ruotano per data** (stessa data → stessa risposta). Si scrivono a
     mano o si **importano da PDF o testo** (`lib/parserDieta.js` + `lib/pdfTesto.js`).
   - **Preferenze alimentari** sul profilo (`lib/preferenzeCibo.js`): regime, allergie/intolleranze,
     cose che non mangio, cose che mi piacciono. `lib/alimenti.js` sostituisce gli alimenti vietati
     con altri dello **stesso macro**, ricalcolando i grammi dalla densità: i macro non cambiano.
     In "cosa mangiare oggi" l'adattamento è **solo una lente** (la dieta salvata non si tocca) e le
     sostituzioni fatte sono elencate in fondo; nell'editor c'è il tasto che le scrive davvero.

   ⚠️ Il criterio di sostituzione è **densità simile**, non "alimento più comune": provato, senza
   quella regola a un celiaco 120g di riso diventavano **720g di frutta** (giusto sui carboidrati,
   impossibile nel piatto) e lo yogurt della colazione diventava petto di pollo. Miele, cioccolato
   e integratori hanno `peso: 0` = si riconoscono ma non si propongono mai.

Tornate ancora prima: **12ª** il FOCUS nelle schede prefatte (`lib/focus.js`: il muscolo scelto prende
un esercizio in più, ha la precedenza quando si taglia per durata, ammette 2-3 varianti della stessa
famiglia ed entra nelle giornate che lavorano la sua metà del corpo). ⚠️ Lì la costante `FOCUS` di
`lib/schedePrefatte.js` è stata rinominata `OBIETTIVI`/`obiettivoDi()`. **11ª**: programmazione vera
negli allenamenti generati (`lib/programmazione.js`) e la sezione "Schede prefatte".

---

