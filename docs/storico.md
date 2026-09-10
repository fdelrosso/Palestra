# Palestra — Storico delle tornate

> Cosa è stato fatto, quando e **perché**. Non serve per capire dove mettere le mani:
> per quello basta [context.md](../context.md). Serve quando una scelta sembra strana e
> vuoi sapere contro cosa è stata presa — quasi sempre contro un problema vero.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

**Ultima tornata (2026-09-10, 19ª) — LE VISTE 3D DI PETTO E SCHIENA (lavoro di Nico), e come
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

