# Palestra — Storico delle tornate

> Cosa è stato fatto, quando e **perché**. Non serve per capire dove mettere le mani:
> per quello basta [context.md](../context.md). Serve quando una scelta sembra strana e
> vuoi sapere contro cosa è stata presa — quasi sempre contro un problema vero.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

**Tornata 73ª** (2026-10-20, `ciusbe`, su `main` su richiesta dell'utente — "pulla il main,
controlla che non ci siano conflitti e pusha su main" — con lint, build e 493 test verdi; merge di
main senza conflitti). Il riepilogo e il recap, ritoccati guardando l'app dal telefono.

*Il riepilogo si salva.* Prima ogni ritocco si salvava da solo, e il tasto indietro "pubblicava"
senza chiedere: in realtà l'allenamento era già scritto (nascosto) al "Termina". Ora è una bozza
fino a "Salva", e indietro chiede (una voce guardia in cronologia; `esci` la salta). Non bastava:
su Android Chrome salta le voci di cronologia nate senza un tocco, e uscito dal riepilogo
l'allenamento restava appeso senza modo di salvarlo. Da qui `daSalvare` sul completamento e
l'avviso che lo riapre: il foglio dell'indietro offre "Salva più tardi", non più "butta via".

*Solo il fatto.* Un esercizio della scheda saltato accendeva il suo gruppo e poteva dare il peso
max (dal piano). Ora sul recap conta solo ciò che ha almeno una serie chiusa.

*La canzone.* Da pillola in fondo al post a polaroid sul recap: provate tre forme (pulita, su
vetro, polaroid) e due posti (in cima, in mezzo); scelta la polaroid, poi spostata accanto ai
muscoli senza la scritta "La canzone dell'allenamento". Nel feed, coi tasti a destra, accanto ai
muscoli c'era posto per una pastiglia per riga: le pastiglie le scorrono intorno. Il colore
della cornice si sceglie (un selettore libero provato e tolto, al suo posto "Vetro" come gli
sticker di Instagram, senza sfocatura perché la canvas non la sa fare).

*Provato e tolto.* Il feed con la card del profilo (9:14, stesse misure): su fondo nero staccava,
col vetro sembrava appiccicata, senza cornice lo spazio era gestito male. Il feed resta com'era;
le due viste differiscono solo per lo spazio che hanno.

**Tornata 72ª** (2026-10-20, `pippo`, preparata su `main` su richiesta dell'utente — con lint,
build e 488 test verdi). La scheda importata da testo nello stesso editor di quella scritta a
mano. L'utente: "voglio lo stesso editor anche quando importo da testo". La schermata "Controlla
la scheda" teneva tutti i giorni impilati, con una card grande per esercizio e le pastiglie dei
muscoli sempre aperte: era un secondo editor, diverso dal primo.

Ora ImportPage è solo il testo. Letta, la scheda va nell'editor a passi come una bozza (la
stessa strada delle bozze del PT), e quello che faceva il controllo sta lì: le righe che non si
sono capite in un riquadro in cima, gli esercizi coi gruppi indovinati dal nome segnati "da
controllare" finché non li si apre, il nome della libreria proposto nel foglio dell'esercizio
(prendendolo, i gruppi diventano i suoi se erano solo l'ipotesi). La regola dei muscoli resta:
fuori dalla libreria non si salva senza gruppo e muscolo, e adesso vale per ogni scheda, non solo
per quelle importate — come già il foglio, che senza non si chiude. Prima la scheda importata si
salvava subito e poi si apriva l'editor; ora si salva alla fine, e la freccia dal primo passo
torna al testo (ritrovato com'era) per correggerlo. "Allenamenti diversi" in una scheda importata
non si sceglie: quanti sono lo dice il testo, e cambiarlo vorrebbe dire buttare un giorno
scritto (chiesto dall'utente: "o bloccato o niente").

**Tornata 71ª** (2026-10-20, `pippo`, preparata su `main` su richiesta dell'utente — con lint,
build e 487 test verdi). Il seguito della 69ª, chiesto subito dopo.

*Ogni scheda a passi.* Nella 69ª i passi erano solo per "Crea manualmente": modificare una
scheda, importarla, o scriverla da PT (per un atleta o di lavoro) dava ancora la pagina coi
giorni impilati. L'utente: "la pagina unica è orribile", quindi tutte passano dai passi. Una
scheda già scritta entra coi suoi allenamenti e "Avanti" li tiene (`ricomponiGiorni`), chiedendo
prima di togliere quelli in più; le copie tengono i loro id, perché hanno completamenti. Per il
PT l'ultimo tasto è "Invia a …" (con "Salva senza inviare" sotto), per la scheda di lavoro
"Salva". Le schede senza giorni scelti tengono i loro Rest: lì il calendario li segue in ordine.

*Più allenamenti che giorni.* Chi si allena due volte a settimana girando su A B C D. Niente
copie: il calendario fa già girare gli allenamenti sui giorni scelti (A B, la settimana dopo C D;
ora c'è una prova). Il prezzo è il conto: una "settimana" della scheda è il giro di tutti gli
allenamenti, quindi dura due settimane di calendario, e "Cambia per settimana" cambia a ogni giro.
L'editor lo dice sotto l'anteprima ("5 settimane della scheda sono circa 10 di calendario").
Contare le settimane di calendario vorrebbe dire rifare progressione, saltati ed esportazioni:
scelto di no, per ora.

**Tornata 70ª** (2026-10-20, `ciusbe`, su `main` su richiesta dell'utente — "pulla main e
assicurati che non ci siano conflitti, quindi pusha su main" — con lint, build e 483 test verdi,
provata sul banco e dal telefono sulla rete di casa). Il riepilogo di un allenamento, rifatto e
reso uno solo.

*I campi facoltativi a pillole.* A fine allenamento sotto la card c'era tutto aperto: nome,
"Modifica", spiegazioni, i tre campi dell'orologio, il commento, lo sfondo, cinque tasti per
condividere, salvalo, note sugli esercizi, Riprendi, Fatto, Cancella. Chi voleva solo condividere
doveva scorrerci in mezzo. Due proposte messe a confronto sul banco (una lista di righe, una fila
di pillole): l'utente ha scelto le pillole. Ognuna apre un foglio dal basso e, piena, dice cosa
c'è già ("✓ 412 kcal · 138 bpm"). Il nome si cambia a parte, sopra la card: è dell'allenamento
(calendario, storico), non della card, dove è spento di base.

*La condivisione.* Provato un tasto grande "Storie Instagram" che preparava la card in 9:16: una
web app non può aprire l'editor delle storie con l'immagine dentro (servono gli appunti con la
chiave di Instagram su iPhone o un intent su Android, cioè un'app nativa), quindi apriva lo stesso
foglio di Condividi. Tolto, su decisione dell'utente. Resta **Condividi** — il foglio del telefono
con tutte le app, come in produzione; sul PC "Scarica" — e "Manda a un amico". ⚠️ Provando dal
telefono su `http://192.168…` il foglio non compare (solo `https`): non è un errore dell'app.

*"Scegli cosa mostrare"* al posto di "Modifica" (sembrava che cambiasse l'allenamento). In
modifica il "Fatto" sta in fondo e Riprendi/Fatto del riepilogo spariscono: sembravano della
modifica, e quel "Fatto" chiudeva il riepilogo. *Foto e video*: dentro il foglio il modale
"Scatta / Galleria" di TastoFoto finiva sotto (z 50 contro 60); ora sono due tasti in linea.

*Un riepilogo solo.* Riaprire un allenamento dal calendario o dallo Storico dava tutt'altra
schermata (il dettaglio, poi "Apri il recap" in un secondo modale, sei tasti, "Correggi" aperto in
mezzo). Ora è la stessa pagina di fine allenamento, a pagina intera (`/svolto/:chiave`).
Decisioni dell'utente: "Chi lo vede" in una riga sotto la condivisione, "Correggi" solo sui
vecchi dentro "Altro", condivisione identica (via "Manda l'allenamento", le serie da rifare). Sui
vecchi ora si cambiano anche nome, commento e orologio dalle pillole; per questo "Correggi" non
chiede più la nota, e `patchDaValori` senza `nota` non la tocca (se no un commento appena scritto
tornava quello di prima). Lo Storico ricordava cancellati e spostati in uno stato suo: andando su
un'altra pagina si perdeva, quindi le due liste stanno in lib/storico.

*La musica di Nico* (68ª, poi gli artisti) è entrata in due merge da `main` ed è una pillola
come le altre; nel calendario il riquadro di Nico è diventato la stessa pillola.

**Tornata 69ª** (2026-10-20, `pippo`, su `main` su richiesta dell'utente — "prepare the commits
to push on main" — con lint, build e 482 test verdi). L'editor della scheda nuova e due
correzioni dell'allenamento.

*Scheda nuova a passi.* Con "Crea manualmente" i giorni si impilavano uno sotto l'altro in una
pagina lunghissima. Ora la prima pagina resta com'era (nome, note, settimane, giorni, chi la
vede) e "Avanti" porta a un allenamento alla volta, con le linguette in cima. Il "+ Rest" e il
menu Allenamento/Rest sono spariti: un giorno senza allenamento è già riposo. Le schede
importate coi loro Rest restano come sono.

*Meno allenamenti che giorni.* Chi fa A e B quattro volte a settimana. Il calendario già girava
A B A B sui giorni scelti, ma la scheda contava la settimana finita dopo A e B: 5 settimane
sarebbero durate due e mezzo. Cambiare quel conto voleva dire toccare completamenti, giri,
saltati, calendario ed esportazioni, tutti legati a (settimana, giorno). Scelta invece: i giorni
in più sono COPIE (`copiaDi`), giorni veri con id e completamenti loro — così il resto dell'app
li conta senza saperlo — ma con il contenuto sempre dell'originale, e ogni modifica fatta su una
copia (in allenamento, dall'anteprima) finisce sull'originale. Nella scheda si vedono quattro
giorni, due "Giorno A" e due "Giorno B": è quello che si fa davvero. Per ora si sceglie solo
creando la scheda, non modificandola.

*Foglio dell'esercizio.* Il carico stava nascosto sotto "Carico, nota e altro": ora sta sopra le
serie, al posto dei preset Forza/Ipertrofia/Resistenza, che si usavano poco.

*Correzioni.* La matita accanto al nome dell'esercizio in allenamento dava lo schermo nero:
nella d400fa4 il blocco dei muscoli di "Aggiungi" era finito anche in "Modifica", dove le sue
variabili non esistono. E dopo "Esci" → "Riprendi allenamento" il recupero ripartiva da capo:
viveva solo nella pagina; ora si salva per sessione e, se correva, ha continuato a correre.
Provato con test e build, non a mano sul telefono.

**Tornata 68ª** (2026-10-20, `Nico`, su `main` su richiesta dell'utente — "commit and push and
then update main" — con lint, build e 475 test verdi). La canzone dell'allenamento, come la musica
nei post di Instagram, senza audio. Si cerca per titolo o artista nel catalogo di iTunes: è l'API
pubblica di Apple, senza chiave né account, e risponde direttamente dal browser, quindi il limite
di ricerche è per persona. Nel post del feed compare una pillola con copertina, titolo e artista;
toccandola si sceglie dove ascoltarla. Sulla card da condividere c'è la stessa pillola, non
cliccabile perché è un'immagine.

*Perché non Spotify.* La prima idea era cercare su Spotify. Dal 2025 la sua API fuori dalla
modalità sviluppo è riservata ad aziende con un servizio avviato (si parla di 250mila utenti al
mese); in sviluppo funziona per 5 utenti messi a mano. Poi song.link (Odesli), per dare a chi
guarda il link della sua app: le API pubbliche rispondono `PUBLIC_API_ACCESS_DEPRECATED`, e le
pagine costruite dall'id di Apple non elencano più Spotify né YouTube. Quindi: Apple Music apre il
brano esatto, Spotify e YouTube Music la ricerca di "titolo artista", che di solito dà la canzone
giusta per prima.

*Diritti.* Far suonare canzoni nell'app vorrebbe le licenze di etichette e SIAE: per questo
niente audio, solo il cartellino e i link alle app che le licenze le hanno. La copertina sulla card
viene dal server di Apple, che permette di usarla dentro l'immagine senza bloccarne
l'esportazione. Su Instagram la musica vera la aggiunge chi pubblica, con l'adesivo di Instagram.

Provato sui banchi (`prova-ui.html?p=feed&musica=1`, calendario) con ricerche vere su iTunes, non
con un allenamento pubblicato.

**Tornata 67ª** (2026-10-20, `pippo`, su `main` su richiesta dell'utente — "pusha su main" —
con lint e build verdi). Tre segnalazioni da telefoni veri. Nel feed, ingrandito il corpo del recap
e tornati indietro, la pagina restava storta su iPhone: Safari prendeva per sé doppio tocco e
pizzico e ingrandiva tutta la pagina; ora, col corpo aperto, non può e chiudendo torna alla scala
giusta. Un amico su iPhone non arrivava al tasto per confermare la modifica di un allenamento: i
modali alti 90vh finivano con la testa sotto le barre di Safari, ora 90dvh, e il "Fatto" della
modifica del recap resta fisso in cima. Su un Oppo i tasti del recupero coprivano il numero: ora
vanno a capo se non ci stanno. Provati sui banchi a misura di telefono, non sui telefoni veri.

**Tornata 66ª** (2026-10-20, `pippo`, su `main` su richiesta dell'utente — "pusha tutto su main"
— con lint, build e 467 test verdi). Il lato PT, rimasto indietro, più alcune correzioni.

*Il PT e le schede.* Il PT scrive una scheda per un atleta (da zero, incollata o da una sua scheda
di lavoro) e la manda come PROPOSTA: l'atleta la trova in Home e Programmi, e accettata entra fra
le sue schede NON attiva (la attiva lui). Le "Schede di lavoro" tengono quelle da inviare e quelle
inviate (si possono ritirare finché sono in attesa); quelle con cui il PT si allena restano nel
suo profilo da atleta. In Atleti c'è a che punto è ognuno (fermo da 7 giorni, mai allenato, scheda
che scade, senza scheda) e il conto "da guardare", tolto dalla home del Lavoro. La vetrina del PT
(presentazione, specializzazioni, dove, tariffe) si vede sulla sua pagina. Un atleta può dire che
una scheda vecchia è del suo PT: il PT conferma e la scheda prende `daPt`.

*I muscoli.* Il corpo del recap accendeva le gambe intere per nomi non riconosciuti ("Leg ext").
Ora gruppi e sottogruppi si scrivono nell'esercizio al salvataggio, sono sempre in vista
nell'editor, e un avviso all'apertura fa completare gli esercizi già salvati che li indovinavano.

*Il feed su iPhone.* I post con foto restavano col solo sfondo: probabile memoria grafica esaurita
da foto intere. Ora si caricano a 2048px e il feed ne mostra una copia da 1280px. Non provato su
un iPhone vero.

*Cerca e allenamento.* I consigli d'amicizia si cambiano con "Altri consigli" finché ce ne sono.
La visibilità dell'allenamento è l'ultimo passo dopo "Fatto": in tanti pubblicavano o tenevano
privato senza essersi accorti della scelta.

**Tornata 65ª** (2026-10-19, `pippo`, su `main` su richiesta dell'utente — "pusha su main" —
con lint, build e 458 test verdi). Due lavori.

*L'editor del giorno.* La costruzione della scheda era poco chiara: una card per esercizio da
scorrere di lato, con una decina di caselle una sotto l'altra. Fra tre proposte (lista + foglio,
una riga scritta come sul quaderno, prima gli esercizi poi i numeri) l'utente ha scelto la prima
con i preset della terza. Ora GiornoEditor è una lista compatta (nome e "4×8 · 1'30"") e un foglio
dal basso con preset, contatori e recupero; il resto sotto "Altro". Un esercizio scelto dalla
ricerca entra già 3×10 · 1'30" (o con lo schema dell'ultima volta) e apre il suo foglio.

*Gruppi e sottogruppi.* L'utente ha ripassato la libreria su una lista (scratchpad, fuori dai
commit): più gruppi per esercizio (dip petto e tricipiti, chin-up e lat inversa coi bicipiti,
stacchi gambe + schiena + glutei, squat coi glutei), stacchi e good morning in gambe,
hyperextension in glutei, face pull solo spalle, scrollate in schiena (trapezio), la pressa
orizzontale. Poi i sottogruppi: le gambe in quadricipiti/femorali/adduttori, le spalle nei tre
deltoidi, la schiena in dorsali/trapezio/romboidi/lombari. Le maschere sono ritagliate da quelle
dei gruppi (i romboidi nel disegno non si vedono: sono la fascia del trapezio fra le scapole più
l'infraspinato). Il recap conta per gruppo e accende per muscolo, anche per i nomi scritti a mano
("Leg curl" → femorali). Nella sezione Esercizi i chip filtrano per sottogruppo. I sottogruppi si
scelgono in editor, import e "Aggiungi" in allenamento; fuori elenco sono obbligatori.

⚠️ All'inizio i gruppi nuovi si applicavano da soli anche agli esercizi salvati (e nel feed, in
lettura): l'utente non ha voluto. Ora restano come sono e `AvvisoSottogruppi`, all'apertura, li
propone a chi ne ha: "Modifica" mostra l'elenco di cosa cambia e applica (schede e allenamenti
fatti, così arrivano giusti anche nel feed degli amici), "Più tardi" lo ripropone alla prossima
apertura, "Rifiuta" non lo chiede più (`preferenze.avvisi.sottogruppi`, su ogni telefono). Uno
stacco rumeno di un amico salvato "schiena" resta schiena finché lui non accetta. Provato sui
banchi (`prova-superserie`, `prova-sottogruppi`, `prova-avviso`), non su un telefono vero.

**Tornata 64ª** (2026-10-19, `pippo`, su `main` su richiesta dell'utente — "pusha anche su
main" — con lint, build e 451 test verdi). Dopo la 63ª, scorrendo il feed, i post con una foto
allegata restavano ancora a volte col solo sfondo colorato, senza recap (l'utente: succede
scorrendo, senza toccare il post). Ogni post del feed teneva montate tutte le sue foto e i suoi
video (allegati di lato e sfondo del recap), anche lontano dallo schermo: foto decodificate e
decoder dei video bastavano a finire la memoria grafica del telefono. Ora `FotoSfogliata` ha
`disegna` (falso = niente `<img>`/`<video>`, l'URL firmato resta e al ritorno la foto arriva
dalla cache) e lo sfondo `.post-sfondo` si monta solo con `vicino`. Diagnosi probabile, non
riprodotta su un telefono vero; sul banco (`prova-feed-social.html`) controllato solo che foto
e recap ci siano, perché col pannello del browser nascosto gli IntersectionObserver non
scattano.

**Tornata 63ª** (2026-10-14, `pippo`, su `main` su richiesta dell'utente — "pusha tutto su
main" — con lint, build e 451 test verdi). Scorrendo il feed, a volte un post restava col solo
sfondo colorato: niente foto e niente recap. Il feed monta tutti i post insieme, e ognuno
animava all'infinito `.post-fondo`, uno strato del 160% della pagina con `will-change`, anche
fuori schermo. Sul telefono la memoria grafica finisce e il browser smette di disegnare gli
strati non animati (foto e recap): resta il colore. Diagnosi probabile, non riprodotta su un
telefono vero. Ora l'animazione parte solo nei post vicini allo schermo (classe `vicino`) e
quelli lontani non si disegnano (`content-visibility: auto`). Si era provato prima con
`content-visibility: hidden` legato a `vicino`, ma con un salto lungo usciva un fotogramma nero.
Provato sul banco con `prova-ui.html?p=feed&molti=15` (nuovo parametro): 3 post attivi alla
volta, il post d'arrivo intero.

**Tornata 62ª** (2026-10-14, `pippo`, su `main` su richiesta dell'utente — "pusha su main" —
con build e 451 test verdi). La scheda di un amico, generata dall'IA e incollata in "Importa",
finiva tutta in "Giorno 1". Lo stesso testo con a capo normali si leggeva giusto: gli a capo
arrivati dal telefono/dalla chat erano altri caratteri (`\r`, U+2028, U+0085), e il parser
tagliava solo su `\n`. Ora `righeDi` li normalizza; se gli a capo mancano del tutto prova a
ricostruire le righe (inizio giorno, fine titolo del giorno, fine recupero). Su una riga sola
resta un limite: un esercizio scritto dopo una "nota:" finisce nella nota. Restano da fare,
anche col testo giusto: "4x3+3" (il "+3" va in nota) e "rec" scritto dopo "nota:" (resta nella
nota). Test in `tests/parser.test.js`.

**Tornata 61ª** (2026-10-14, `pippo`, su `main` su richiesta dell'utente — "pusha tutto su
main" — con lint, build e 450 test verdi). Due ritocchi, provati sul banco (`prova-ui.html?p=amici&
mio=1&commenti=1` e `?p=schede`, con `scratchpad/finto-social.js` per il profilo pubblico).

**Segnalare sui propri allenamenti.** La bandierina dei commenti c'era solo nel Feed; aprendo i
commenti di un proprio allenamento dal profilo (anche da una notifica) si poteva solo togliere.
Ora c'è anche la segnalazione, che va al moderatore. Il trigger `segnalazione_valida` vieta solo
di segnalare una cosa PROPRIA, quindi il commento di un altro sul proprio post era già ammesso.

**Allenamenti salvati.** La card era una `card` semplice, diversa dalle schede: ora è la stessa
(`scheda-card`: nome, badge, "Ultima volta", freccia) e si apre con gli esercizi, "Rifai" ed
"Elimina allenamento" (TastoConferma). Eliminare toglie solo `salvato`: lo Storico resta.

**Tornata 60ª** (2026-10-14, il branch `pippo`, portato su `main` su richiesta dell'utente —
"su main pusha" — con lint, build e 450 test verdi). Una sessione lunga con Claude, provata sul
banco (`scratchpad/prova-ui.html`, `prova-chat-scambi.html`, `prova-esercizi.html`,
`prova-3d.html`), mai con account veri. L'SQL nuovo l'ha lanciato l'utente a mano.

**Gli invii nella chat.** "Ricevuti e inviati" nel profilo era un posto in più da sapere: schede,
allenamenti e foto mandati a qualcuno ora stanno nella chat con lui (`lib/scambi` li mette in fila
coi messaggi), e APERTI — l'allenamento intero (poi reso più compatto), la foto visibile, non
"Giorno A" o "foto". Prima di mandare una scheda o un allenamento si chiede conferma.

**Momentanei di default.** La prima idea era scegliere all'invio fra una volta sola e
permanente; l'utente ha corretto: di default si vede una volta sola (come WhatsApp), e
nell'anteprima c'è "Rendi permanente" (`effimeri.permanente`: resta nella chat).

**Allenamenti saltati.** Si salta C, si fa D, la settimana dopo il consiglio tornava ad A e C
spariva. Adesso la Home lo dice; "Recuperalo dopo" lo ricorda agli allenamenti seguenti (farlo è
un recupero: non sposta il giro in corso), "Lascialo perdere" toglie QUEL saltato dai
suggerimenti (non il giorno dalla scheda). Solo giri chiusi da poco: uno storico vecchio non deve
tirare fuori decine di saltati.

**Notifiche col cuore.** Accanto al nome nel Profilo di Social (prima in una barra nera, che
l'utente ha voluto via insieme a @nome, ripetuto sotto il nome). Mi piace e commenti si sommano in
una riga per post; il tocco porta al post nel profilo; il numero rosso sulla voce Profilo conta
quelli dopo l'ultima apertura. Chi aveva già interazioni non le perde: niente limite di 60 giorni
in `notifiche_interazioni` (ne tiene 300).

**PT e feed.** Gli allenamenti degli atleti escono da Lavoro e diventano la terza linguetta del
feed, "Atleti", accanto a Per te e Amici. Un post si condivide: "Manda a un amico" oppure fuori
dall'app con un LINK (non un'immagine: l'utente l'ha voluto così) a `/post/<chiave>`. Chi non ha
mai fatto l'accesso lo apre e vede solo quel post (`post_pubblico`, l'unica funzione concessa ad
`anon`); per il resto deve entrare davvero.

**Esercizi.** La libreria passa a 243 (varianti e gruppi nuovi). Ognuno ha il movimento che lo
rappresenta (55 nuovi, 152 in tutto; il cavo anche alla caviglia, `cavoSolo` per le rotazioni) e
una descrizione sua (`lib/descrizioniEsercizi`): prima le varianti ripetevano la frase del
movimento. Limiti del manichino piatto: fire hydrant e clamshell sono un'approssimazione. In cima
alla sezione, una barra di ricerca: il tocco apre il gruppo con l'esercizio già aperto
(`/esercizi/<gruppo>?e=<slug>`).

**Il petto in 3D, rifatto.** Il manichino a cilindri diventa un corpo con proporzioni vere e
muscoli (`lib/umano3d`), gli attrezzi sono quelli veri (`lib/attrezzi3d`), e il petto ha la vista
3D per tutti i 28 esercizi (erano 16): panche col rack, multipower con le guide, cavi coi pacchi
che salgono, chest press, Hammer coi dischi sulle leve, pec deck, parallele, piegamenti anche con
la panca, svend press, landmine. Le prove controllano che il bilanciere arrivi al petto senza
entrarci, che la floor press si fermi coi gomiti a terra, che piedi e gomiti non bucano il
pavimento. Due errori trovati guardando: il busto aveva le facce girate (si vedeva l'interno della
schiena), e i pettorali prima "a palla" e poi "a pettorina" prima della forma a ventaglio. Il
prossimo passo naturale: gli altri gruppi sul corpo nuovo.

**Tornata 59ª** (2026-10-13, il branch `pippo`, portato su `main` su richiesta dell'utente —
"pusha tutto su main" — dopo aver fuso la 58ª, con lint, build e 415 test verdi). Una sessione con
Claude. Provata sul banco (`scratchpad/prova-ui.html?p=profilo`, `&pt=1` per partire da PT, col
finto store che ora ha `diventaPt`/`smettiPt`), mai con account veri: attivare il PT sul proprio
account avrebbe cambiato il database di produzione.

**Il punto di partenza.** Chiesto "cosa succede se un utente si registra come PT": oggi un PT è un
atleta con in più Lavoro, ma **può solo guardare** (non manda schede), il lato PT delle Foto non è
mai stato provato e non c'è una pagina profilo del PT. Annotati per dopo; l'utente ha preferito
partire da idee sue.

**Attivare e disattivare.** Nel Profilo, sotto la testata, "Attiva account PT": il codice si genera
da solo (se è preso se ne prova un altro). Il primo giro aveva anche "Passa a modalità PT/Atleta"
lì e un tasto rosso in fondo: l'utente li ha voluti via. La modalità si cambia solo
dall'interruttore Personale | Lavoro della Home; "Disattiva modalità PT" è una voce come
Disconnetti, e apre una finestra di conferma (la prima versione con `window.confirm` era
"istantanea"). `smettiPt` scioglie prima i legami di lavoro dove si è il PT (il trigger
`lavoro_tolto` toglie `pt_id` agli atleti), poi ruolo e codice: al contrario resterebbero atleti
legati a un PT che non c'è più.

**La modalità PT** è per dispositivo, come i colori (`hooks/useModalitaPt`): niente database. In
modalità PT la Home è Lavoro. Prima "Personale | Lavoro" navigava fra due pagine; adesso muove la
modalità, così i due comandi non si contraddicono.

**Un PT è anche un atleta.** Prima un PT non poteva avere un PT da nessuna parte: in registrazione
il campo spariva, `diventaPt` cancellava il proprio PT, il pannello mostrava solo il lato PT e il
database rifiutava `contatta_pt` ("Solo un atleta contatta un PT"). Tutto aperto; nel database resta
solo "non contattare te stesso". Due persone possono ora seguirsi a vicenda, e `trovaRelazione`, che
il verso non lo guarda, avrebbe preso il legame sbagliato in "Non seguire più" / "Non farti più
seguire": nuovo `trovaLavoro(atleta, pt)`. Trovato anche un bug vecchio: nel pannello "Personal
trainer" il codice sbagliato non dava errore (`associaPt` senza `await`).

**Il codice PT** si legge in Social → Profilo, sotto il codice amico, col tasto WhatsApp (messaggio
con codice, dove inserirlo e link al profilo).

**Video a 30".** Il limite era già in un posto solo (`DURATA_VIDEO_MAX`). Il bucket `effimeri` era
a 50MB "per i 10"": portato a 200MB come gli altri. Poi l'utente ha controllato su Supabase il
limite del PROGETTO (Storage → Settings): 50MB, il piano gratuito, che vale sopra ai bucket. Quindi
un controllo sul peso prima di caricare, uguale nei quattro posti (`fileTroppoPesante`,
`messaggioTroppoPesante`: "pesa 75MB: il massimo è 50MB… giralo in 720p"), al posto dei limiti
sparsi (200MB in tre posti, 60MB negli invii momentanei: tutti sopra il tetto vero). Un 30" in
720p (~45MB) passa, in 1080p no.

**Database**, lanciato dall'utente il 2026-10-13:
`contatta_pt` senza il blocco sui PT, `effimeri` a 200MB.

**Lasciato aperto:** chi disattiva il PT non chiude i "Contatta il PT" ancora aperti verso di lui,
e le chat nate da quei contatti potrebbero non funzionare più.

**Tornata 58ª** (2026-10-12, il branch `ciusbe`, portato su `main` su richiesta dell'utente —
"fai il merge delle modifiche su main così vanno live" — dopo lint, build e 413 test verdi).
Provata disegnando una card d'esempio in Chrome headless, non sul telefono.

**Il recap da condividere.** L'utente: "il recap da condividere deve avere la stessa struttura del
recap sul social, identico". L'immagine era rimasta quella di prima della 54ª: tessere in due
colonne, commento nel blocco, firma "ProgettoPalestra1.0", sfondo blu fisso, e quello che non ci
stava si tagliava. Ora la canvas ricopia il feed: striscia dei numeri, in fondo avatar e nome con la
linea e sotto il commento, riga data | serie · durata, sfondo coi colori dei gruppi (fermo) o la
foto velata, e se c'è troppo si rimpicciolisce tutto. Il nome di chi l'ha fatto torna sulla card
(era stato tolto il 2026-09-18): nel feed c'è. Differenze rimaste, perché un'immagine non si
tocca: commento fino a 4 righe invece di 2 + tocco, niente cuore/commenti/pillole dei media. Il
recap ricevuto da un amico ha l'iniziale al posto della foto profilo.

**Una regola sola.** I blocchi li decideva `pezziCard` nella canvas e una copia in RecapPost:
ora `pezziRecap` in lib/recap per tutti e due; `sfondoGruppi` si appoggia a `macchieGruppi`,
che dà i numeri anche alla canvas (che non sa leggere color-mix).

**Tornata 57ª** (2026-10-12, il branch `pippo`, portato su `main` su richiesta dell'utente —
"pusha tutto su main" — dopo lint, build e 413 test verdi). Una sessione con Claude, dopo aver
allineato `pippo` alla 56ª. Provata su banchi in scratchpad (alcuni provvisori, poi tolti) a
misura di telefono, non sul telefono né con account veri.

**Colori.** La scelta del colore (pallini, colore libero, automatico) toglieva identità all'app e
dava combinazioni brutte: ora sfondo nero di base o bianco, accento sempre celeste. Chi aveva
"automatico" o un colore suo riparte da nero e celeste; chi aveva scelto il bianco lo ritrova.

**Social.** La voce "Amici" aveva quasi solo il codice e i suggeriti: diventa "Profilo", il proprio
profilo come lo vedono gli altri, con sopra la card del codice. Restano lì, solo quando ci sono, le
richieste da accettare e le cose ricevute (non avrebbero un altro posto); la lista degli amici si
apre dal numero degli amici. "Forse li conosci" è andato in Cerca, a casella vuota. In Messaggi un
"+" apre la lista degli amici per scrivere a qualcuno (prima un tasto "Nuovo", bocciato).

**Chat.** Sotto il campo c'era una fascia nera (lo spazio per la barra in basso). Tre proposte
(capsula flottante, chat a tutto schermo, campo fuso col menu): scelta la chat a tutto schermo,
come WhatsApp. Poi anche la fascia rimasta "stonava sul celeste": un velo trasparente e sfocato.

**Recap.** Nel profilo di Alessio la foto allegata non si vedeva: le cartoline mostravano solo lo
sfondo. Ora gli allegati si sfogliano di lato come nel feed. Trovato anche un pezzo di
ListaAllenamenti rimasto storto dalla fusione della 56ª (il recap aperto non seguiva le
correzioni). L'ordine dei pezzi del recap non si sceglie più: resta quello impostato.

**Superserie.** Un tocco colorava tutto il giro uguale. Tre proposte; l'utente ha chiesto di non
cambiare la card e di fare come per un esercizio da solo: il pallino al primo esercizio, poi al
secondo, a giro finito il pallino del giro (combinazione dei colori, primo a sinistra), il recupero
e il giro dopo. Il pallino vuoto di ogni esercizio si vede da subito, davanti al nome: messo
accanto spezzava i nomi lunghi.

**Il banco di prova** del feed e delle superserie non partiva più dalla 56ª: al finto delle foto
mancavano `percorsoFotoAllenamento` e `cambiaSfondoAllenamento`. Aggiunti.

**Tornata 56ª** (2026-10-12, il branch `ciusbe`, portato su `main` su richiesta dell'utente —
"pulla il main e poi effettua un merge di queste modifiche su main" — dopo lint, build e 416 test
verdi). Una sessione con Claude, provata nel banco del feed (scratchpad/prova-feed-social) a misura
di iPhone con Playwright, non sul telefono; la finestra del recap aperto dallo Storico non è stata
vista a schermo.

**Il commento nel post.** Era un fumetto celeste dentro il recap: sembrava un dato fra gli altri,
staccato dal nome. Tre proposte (sotto il nome, come copertina, didascalia in fondo stile Reels);
l'utente ha scelto la didascalia in fondo, ma senza spostare cuore e commenti. Il primo tentativo
(il commento in fondo DENTRO il recap) l'ha bocciato: "non si vedeva che il commento non era parte
della scheda". Ora nome, commento e media sono una sezione di PostSchermo sotto il recap; la
separa una linea leggera che passa a metà dell'avatar (scelta fra tre varianti: a sinistra,
al centro, un velo), più bassa del bordo netto di prima.

**I muscoli più allenati.** Il corpo variava già con le serie, ma solo di trasparenza (52–100%):
fra colori diversi non si legge. Provati i tre livelli con l'alone: l'utente li ha tolti. È
rimasta la vista "dal bianco al blu" (una scala sola), che sceglie chi pubblica come opzione del
recap e che chi guarda cambia nel recap aperto.

**Lo sfondo coi colori dei gruppi.** Prima il colore del gruppo più allenato solo nell'alone
("non è cambiato niente"), poi in tutto il gradiente, poi una macchia per ogni gruppo, pastello,
animata. Due errori trovati dall'utente: (1) 11 serie di schiena contro 8 di petto davano uno
sfondo quasi tutto giallo — il fondo prendeva solo il primo gruppo, il giallo pesa a occhio quasi
il triplo del rosso e le macchie andavano col rapporto sul più lavorato; ora contano quota sulle
serie totali, superficie (raggio ∝ √quota) e luminanza del colore, e il fondo mischia i due
principali; (2) sul telefono un angolo del post restava nero: lo strato animato, ruotando e
spostandosi, si scopriva. Rotazioni e spostamenti ridotti, controllati con un conto per
fotogramma su cinque misure di schermo. Già prima le macchie degli angoli erano finite fuori
dallo schermo (posizioni sulla pagina usate su uno strato più grande): ora si riportano
(`nelloStrato`). Nessun gruppo è più blu, se no lo sfondo si confondeva con l'app.

**Tornata 55ª** (2026-10-12, il branch `pippo`, portato su `main` su richiesta dell'utente —
"Pusha su main" — dopo lint, build e 414 test verdi). Una sessione con Claude; provata con le
prove (tests/pianoScheda.test.js) e aprendo Home e calendario coi dati veri, senza toccarli.

**Il giorno saltato e lasciato perdere.** L'utente: salto C, faccio D, la volta dopo ricomincia la
settimana e faccio A — da lì la scheda deve andare avanti normale, come se C fosse perso. Prima il
"da fare" era il primo giorno non fatto della settimana: C, per sempre, e il calendario lo metteva
in programma e diceva "potresti riprendere da C" anche dopo aver ricominciato. Ora la settimana si
legge a GIRI (`giroInCorso` in lib/progression): in ordine di data, un allenamento che rifà un
giorno già fatto apre un giro nuovo solo se nel giro c'era un buco. Così A B D → A è un giro
nuovo (tocca B), A B D → C è il recupero, A B → A è una ripetizione (tocca sempre C). Anche
`fattiSettimana` e `settimanaCompletata` contano il giro: se no, nel giro nuovo la settimana
sarebbe risultata completa già dopo C (ogni giorno aveva un "fatto"), e una scheda a termine si
sarebbe chiusa prima di D. In SchedaPage i segni di "fatto" e "Completato" seguono il giro; segnare
a mano un giorno del giro di prima aggiunge un completamento invece di annullare quello vecchio.
⚠️ Il numero della settimana non avanza da solo al giro nuovo: come prima, a settimana completata
o col tasto.

**Tornata 54ª** (2026-10-12, il branch `pippo`, portato su `main` su richiesta dell'utente —
"Pusha su main" — dopo lint, build e 411 test verdi). Una sessione con Claude, provata nel browser
del computer a misura di telefono, non sul telefono.

**Sfondo e allegati.** L'utente: la sbirciata di lato solo con foto/video allegati, non per lo
sfondo; e "se metti un allegato non sempre viene mostrato in Social, non è chiaro perché". Le
cause: la "Foto di sfondo" del recap da condividere non si salvava (esisteva solo nell'immagine
esportata); nel feed la PRIMA foto allegata diventava da sola lo sfondo, velata, visibile solo
tenendo premuto, e la sbirciata partiva prima che lo sfondo si caricasse (le pagine di lato
dipendevano da quel caricamento); un cambio di visibilità fallito senza rete non si riprovava. Ora
lo sfondo è una riga di `allenamento_foto` con l'id in `sfondo` sul completamento (niente colonna
nuova: decide il completamento), gli allegati sono tutto il resto e stanno sempre di lato.
⚠️ I post vecchi con la prima foto come sfondo ora la mostrano di lato, senza sfondo. ⚠️ Con
"Riprendi l'allenamento" dal riepilogo lo sfondo già scelto torna un allegato normale.

**Il recap completo.** Prima si tagliavano il commento (3 righe), gli esercizi in più (andavano a
capo in una colonna fuori schermo), il fondo (commento, firma) e, sui telefoni bassi, note e firma:
chi scriveva poco si vedeva intero, chi scriveva tanto no. Ora il recap si dispone alla sua altezza
e si rimpicciolisce tutto insieme (`transform: scale` e larghezza 1/s, rifatto il conto finché si
ferma). Con tanti esercizi le scritte diventano piccole: è il prezzo, accettato.

**Il disegno.** Tre proposte per i numeri (striscia, numero protagonista, tabellino; il file è
rimasto in `scratchpad/proposte-recap.html`, non nel repo): scelta la striscia, solo nel feed.
Poi: titolo spento di base (con `accesi` per non riaccenderlo nei layout salvati prima), commento
come fumetto e in alto nell'ordine di partenza, data in basso a sinistra con l'orario inizio–fine
(fine = `data`, inizio = fine − durata; senza durata niente orario), via "ProgettoPalestra1.0" dal
feed (resta sulla card che esce dall'app) e l'ora sotto il nome del post.

**Tornata 53ª** (2026-10-12, il branch `pip-cronometro-modellino`, portato su `main` su
richiesta dell'utente — "mergia le modifiche di questo branch su main" — dopo lint, build e 401
test verdi). Una sessione con Claude, provata su un banco con lo store finto
(`scratchpad/prova-sforzo`); l'utente ha visto le versioni intermedie sul telefono col server di
sviluppo, ma `useGradino` (la correzione finale dello scorrimento) solo sul banco.

**Il corpo in immagini.** Il modellino era una tavola anatomica in path SVG scritti a mano
(lib/corpoForme, ~650 righe). Ora sono due figure e una maschera per gruppo in `public/corpo`,
ritagliate da originali grandi che restano in `risorse/`, fuori dal repo: all'app non servono e
avrebbero pesato per sempre nella storia di git. Riscaldamento e stretching hanno gli esercizi
disegnati che ruotano in dissolvenza nello spazio vuoto della card.

**Il vuoto sopra i tasti dello sforzo.** Con l'allenamento alto quanto lo schermo (49ª) fra la
serie e i tasti restava un buco. Provate e scartate dall'utente: tutto in basso, il modellino a
riempire, la serie al centro, la barra fissa fuori dalla card. Scelti i **tasti a righe**, larghi,
con cosa vuol dire ogni colore. Poi **"ultima volta"** sul tasto del colore dato alla stessa
serie la volta prima: si decide sapendo com'era.

**Niente scorrimento, in qualsiasi modalità.** Col PiP la fascia del video si prende ~200px e la
card scorreva. Prima soluzione: soglie d'altezza fisse (container query sulla card) — tarate sul
banco, sbagliavano col contenuto vero: con il peso consigliato di DUE esercizi la superserie
scorreva anche senza PiP. Sostituite da `useGradino`: la card misura se scorre e si stringe un
gradino alla volta (spazi, poi il consiglio, poi titolo e note) prima di essere disegnata. Ordine
voluto dall'utente: righe → barra in fila → più stretto → solo alla fine lo scorrimento. Con due
esercizi non scorre fino a 375×580 col PiP.

**La superserie come un giro solo.** La prima versione la trattava come due esercizi da segnare
a turno (A1, B1, A2…): "illeggibile", e sbagliata nel concetto — la superserie si fa di fila, e il
giro conta come UNA serie. Fra tre design (riquadro, affiancati, percorso) l'utente ha scelto il
**percorso**: gli esercizi uniti da una linea che finisce nel recupero. Un tocco chiude il giro
intero; nei dati ogni esercizio tiene i suoi pallini, così storico e peso consigliato non
cambiano. "Duro" non chiede le ripetizioni (sarebbero di più esercizi): si correggono dopo,
esercizio per esercizio. **In sospeso**: correggere il COLORE di un solo esercizio del giro.

**Tornata 52ª** (2026-10-12, il branch `pippo`, portato su `main` su richiesta dell'utente —
"Pusha su main" — dopo lint, build e 400 test verdi). Una sessione con Claude, provata nel
browser del computer, non sul telefono.

**Segnala un problema.** Richiesta: accanto alla foto del profilo, in qualsiasi sezione, un
riquadro con una casella di testo per errori, incongruenze e migliorie, che arrivi a
`info@progettopalestra.it`. Sta nella testata (TestataApp) perché è l'unica cosa presente
ovunque; non c'è durante l'allenamento, dove la testata non c'è. La finestra va in un portale sul
body: dentro la testata appiccicata resterebbe sotto la pagina.

**Perché una funzione di Vercel.** L'app non aveva un server: per mandare una mail serve. Scartati
il `mailto:` (apre il programma di posta di chi scrive, e spesso sul telefono non c'è) e i servizi
di moduli esterni (un terzo che riceve i messaggi, da citare in privacy). `api/segnala.js` usa lo
stesso SMTP di Register.it delle mail di Supabase, con le credenziali nelle variabili di Vercel,
mai nel repo. Accetta solo chi ha un token valido (chiesto a `/auth/v1/user` di Supabase), così
info@ non diventa un bersaglio di spam; `replyTo` è l'email dell'account. In fondo alla mail:
tipo, nome, id, pagina e dispositivo. Il client considera riuscito solo un `{ ok: true }`: in
locale Vite risponde ma non è la funzione.

⚠️ **Da fare a mano**: creare la casella `info@` su Register.it (era già in sospeso dalla 35ª) e
mettere `SMTP_USER`/`SMTP_PASS` su Vercel (Production e Preview), poi un deploy. Provati a
schermo la finestra e l'errore in locale, e la funzione con richieste finte (405, 401); la
spedizione vera no.

**Tornata 51ª** (2026-10-10, il branch `pippo`, portato su `main` su richiesta dell'utente —
"Pusha su main" — dopo lint e 400 test verdi). Una sessione con Claude, provata nel browser
del computer, non sul telefono.

**Il consiglio sul peso.** Un amico dell'utente: rosso/giallo/rosso su 3 serie, e la volta dopo
"tieni il peso". Sullo stesso schema il consiglio era già "scendi"; sbagliava a schema cambiato
(la settimana dopo della scheda: 4×10 o 3×12 dopo un 3×10), dove i pallini non decidevano più il
verso e la stima, a un passo dal peso in scheda, diceva "va bene" — sui pesi leggeri quasi sempre
(a 10 kg la tolleranza è 1 kg, il 10%). Ora, se oggi non è più leggero (ripetizioni e serie non
meno, stessa tecnica), dopo un "troppo" si scende sempre; simmetrico dopo un "facile". Lasciato
com'è il caso opposto: 3×8 dopo un 3×10 duro resta "va bene", è in linea con la stima.

**Home ↔ Social.** Entrare in Social cambia anche la barra: la pagina arriva da destra entrando e da
sinistra tornando a Home, e le voci della barra salgono una dopo l'altra. Prima versione sbagliata:
la classe dell'animazione restava e animava ogni pagina dopo — l'utente voleva solo quel passaggio.
L'involucro `.vista` è `display: contents`, se no il feed (`position: fixed`) durante l'animazione si
sarebbe schiacciato. Tolto anche il **<** in alto da Amici, Messaggi e Cerca: la casa basta.

**Cerca.** Via la spiegazione sul nome esatto; i risultati compaiono mentre si scrive. Provati e
tolti gli "Utenti consigliati" (doppione di "Forse li conosci" in Amici, dove "è corretto che
sia"); al loro posto le **ricerche recenti**, solo sul telefono e per account (sono affari di chi
cerca), e una lente quando non ce ne sono. La frase sotto: prima "Trova i tuoi compagni di
palestra", scartata ("non tutti sono compagni di palestra"). Sotto chi non è amico, **gli amici in
comune** con le facce, come Instagram: `amici_in_comune(ids)` risponde solo sugli id appena trovati
(max 50) e i nomi sono sempre di propri amici. Resta voluto che il nome non si cerchi a pezzi.

**Il profilo su WhatsApp.** In Amici, al posto di "Copia", un tasto tondo col fumetto (il bottone
verde pieno con la scritta era "brutto") che manda il link a `/utente/:id` e il codice. Chi non ha
l'account passa dalla conferma della mail, che riporta alla radice: il profilo si ricorda
all'apertura (localStorage, una settimana) e si apre appena dentro — non provato con un account
nuovo, e non funziona se link e mail si aprono in browser diversi.

**"Forse li conosci" coi più collegati.** Un nuovo iscritto senza amici né PT trovava la lista
vuota. Ora, dopo amici di amici e stesso PT, le 30 persone con più amici nell'app (prima proposta
con una soglia di 3 amici, tolta dall'utente). È una scelta che ribalta il "senza legame non si
propone nessuno": resta lontana dalla ricerca a pezzi perché è un elenco corto e fisso. Chi ha 0
amici non compare a nessuno, ma vede i più collegati e si fa trovare mandando la richiesta.
Database: `amici_in_comune` nuova e `amici_suggeriti` cambiata, lanciate a mano dall'utente.

**Tornata 50ª** (2026-10-10, il branch `refactor`, portato su `main` su richiesta dell'utente —
"i want to push on both refactor and main" — dopo lint e 399 test verdi). Una sessione con
Claude, a ritocchi successivi guardando screenshot del telefono.

**La foto di un commento.** Toccarla apriva una pagina esterna con l'indirizzo firmato dello
storage. Pericoloso no (l'indirizzo lo genera il nostro codice, punta solo a Supabase e scade in
un'ora), ma si usciva dall'app e si vedeva un link strano. Ora si apre in una modale. Prima prova
scartata: il visore nero a tutto schermo di VisoreEffimero, "non in linea con l'app"; poi il foglio
dal basso, con "Foto" come titolo e il testo sotto, "awful": il testo del commento fa da titolo, e
senza testo resta solo "di …".

**Scatta o galleria.** Dare per scontato che il selettore del telefono offra la fotocamera era
sbagliato: sul telefono dell'utente (Android) c'erano solo Foto, Raccolte e Google Foto. Prima
prova: un tasto fotocamera accanto a ogni tasto galleria (`capture`), scartata dall'utente per un
tasto solo che chiede. Ora `TastoFoto` apre un foglio con le due voci, in tutti i sette punti
(commenti, profilo, check, invii momentanei, sfondo del recap, foto dell'allenamento, allegati
degli esercizi). La fotocamera prende solo foto; video solo dalla galleria. Su computer `capture`
non fa niente, quindi lì niente domanda.

**I video del feed.** Due problemi dopo la sbirciata (46ª): il play dei comandi del browser
restava a sinistra entrando nella pagina, e il video continuava a suonare scorrendo a un altro
post. Il play: i comandi venivano impaginati mentre la pagina era ancora spostata; poi la barra del
browser è sparita del tutto su richiesta. Ora, come TikTok: parte da solo in loop, si ferma e
torna all'inizio scorrendo via (prima pausa e basta: l'utente lo voleva da capo), il post uscito di
vista torna al recap, un tocco ferma e mostra play al centro e l'audio sotto, più piccolo, senza
cerchio, semitrasparenti. L'audio: se il browser lo nega (nessun tocco prima) parte muto, e si alza
fermando il video.

**Il riquadro dei giorni.** Era il nome del giorno ("Push · spinta"), che non ci stava mai: veniva
da quando i giorni si chiamavano "Giorno 1" e restava il numero. Fra quattro proposte (numero del
giorno, colore del gruppo, iniziale, niente riquadro) l'utente ha scelto il **colore del gruppo**:
un manubrio tinto col gruppo più lavorato, lo stesso colore della figura accanto; oggi pieno,
completato resta la spunta verde.

Nessuna modifica al database. **Non provata sul telefono.**

**Tornata 49ª** (2026-10-10, ancora `pip-cronometro-modellino`, portata su `main` con un merge
su richiesta dell'utente — "mergiamo tutte le nostre modifiche su main" — dopo lint, 399 test
verdi e build). Una sessione con Claude, guardando screenshot della pagina di prova.

**L'allenamento alto quanto lo schermo.** Lavoro che era già sul branch, non salvato, quando la
sessione è cominciata; portato su `main` insieme, per scelta dell'utente: la pagina non scorre, la
pista delle card prende lo spazio che resta e ogni card scorre dentro di sé; i tasti dello sforzo
in fondo alla card, sempre nello stesso punto; "Annulla l'ultima" sulla riga del titolo; il
recupero su una riga; il nome del giorno in cima apre l'elenco dell'allenamento.

**Il peso consigliato.** Partito da una domanda: "Peso consigliato" sembrava non cliccabile e, con
un peso già impostato, si apriva vuoto. Due cause: il `<details>` col `summary` in `display:flex`
perdeva la freccia, e al primo allenamento con un peso impostato `ConsiglioCarico` non ha niente
da dire. Ora: la riga c'è solo se c'è un consiglio, porta il peso ("Peso consigliato · 62,5 kg ›")
e apre una **modale al centro** (non il solito foglio dal basso: variante `.al-centro`). Fra tre
stili confrontati in `scratchpad/prova-consiglio` (fascia colorata, numero grande, discreto)
l'utente ha scelto il **numero grande**: peso al centro, chip con la differenza ("+2,5 kg", "come
l'ultima volta", "−2,5 kg"), colore del verso (sali accento, tieni verde, scendi ambra — mai
rosso, che in allenamento è la serie non chiusa). Neutra quando lo schema cambia e non c'è un
peso da confrontare: lì "tieni" vuol dire solo "nessun verso".

**Il bug dello storico.** "Le volte precedenti" apriva lo storico dentro la card, sotto la modale:
dentro la pista dell'allenamento un `position: fixed` resta chiuso nella card. StoricoEsercizio e
la modale del consiglio ora vanno in un portale sul body.

Nessuna modifica al database. **Non provata sul telefono.**

**A parte, nella stessa sessione:** un primo allenamento finito per sbaglio alla settimana 5 di
una scheda. Nessun tasto lo sposta (cambiare settimana sposta solo `settimanaCorrente`, togliere
"fatto" cancella il completamento): si corregge nel SQL Editor riscrivendo `settimanaCorrente` e
la `settimana` del completamento in `schede.dati`.

**Tornata 48ª** (2026-10-10, il branch `pip-cronometro-modellino`, portato su `main` con un merge
su richiesta dell'utente — "effettua il merge su main di queste funzionalità" — dopo lint, 399
test verdi e build). Una sessione con Claude, a ritocchi successivi guardando anteprime.

**Lo spazio per il video in PiP.** L'utente si allena con YouTube nel riquadro PiP, che copre
l'app. Prima prova scartata: allargare i margini di sicurezza (una striscia vuota in alto o in
basso in tutta l'app); l'utente voleva uno SLOT dentro il disegno. Il PiP lo mette il sistema in
un punto fisso dello schermo, quindi lo slot non può scorrere con la pagina: fascia fissa in fondo
all'allenamento (solo lì), recupero a sinistra e riquadro 16:9 tratteggiato a destra; la card del
recupero in cima sparisce, così la pagina comincia dall'esercizio. Si accende dal menu ⋯
dell'allenamento (prima stava in Profilo → Aspetto, spostato su richiesta), resta sul telefono.

**Il recupero.** Cifre a 7 segmenti, da cronometro: scelte fra otto font a confronto, DSEG7 Classic
(OFL). Ridotto alle cifre e rinominato "Cifre Cronometro" (la licenza riserva il nome "DSEG" alle
versioni non modificate); il `+` del recupero sforato non c'era e cadeva sul font di sistema, ora
è disegnato coi segmenti del `-`. Il `<select>` a pillola accanto al numero non stava nella fascia
stretta: il tempo si cambia toccando il numero (foglio coi preimpostati; scartati − / + ai lati e
pillole rapide). Start/Reset diventano icone, nell'ordine bip · play · reset con play al centro;
sopra "RECUPERO", sotto "Tocca per cambiare". Allineamento misurato sui pixel: il numero è
centrato sulle caselle delle cifre e non sull'inchiostro, voluto (vedi context.md).

**Il modellino sulle card.** Le card degli esercizi non prendono più la tinta del gruppo: c'è il
modellino del corpo (`CorpoEsercizio`, sopra CorpoAllenato) con TUTTI i gruppi dell'esercizio
accesi, ognuno del suo colore (i dip sono petto e tricipiti), davanti e/o dietro secondo dove si
vedono. Nella scheda è la colonna di destra della card, larga sempre uguale perché i nomi partano
tutti dallo stesso punto (a sinistra li sfalsava); nell'allenamento sta sotto la matita, accanto a
gruppo e serie (fra nome e matita rubava spazio al nome e spingeva giù le serie). La tinta resta
solo sulle righe strette dell'elenco "tutti gli esercizi".

Nessuna modifica al database. **Non provata sul telefono**: da guardare il foglio dei tempi sopra
la fascia e se lo slot combacia col PiP alla misura minima.

**Da `refactor`, subito dopo la 47ª** (2026-10-09, `d93990e` di filippo-baglini, portato su
`main` con un merge su richiesta dell'utente, dopo lint, 399 test verdi e build). La barra in basso
salta a Home e poi alla sezione tornando indietro nella cronologia; se intanto la pagina si era
ricaricata (un aggiornamento dell'app, l'iPhone che la riapre) il salto si perdeva, perché le voci
dietro erano di un documento vecchio e non arrivava `popstate`. Il salto in sospeso ora sta anche
in sessionStorage e lo finisce l'avvio (`rimanda` / `finisciIlSalto` in lib/router).

**Tornata 47ª** (2026-10-09, il branch `profilo-pubblico`, portato su `main` con un merge su
richiesta dell'utente — "fai il merge su main e pusha" — dopo lint, 398 test verdi e build). Una
sessione con Claude: prima un giro di domande per decidere la pagina di una persona, poi tre fasi,
poi ritocchi al feed su richiesta.

**La pagina di una persona** (`/utente/:id`, pages/UtentePage). Si apre per CHIUNQUE toccando
avatar e nomi: post e recap del feed, commenti, mi piace, Amici (lista, richieste, risultati,
suggeriti), Cerca, testata della chat. Di uno sconosciuto si vede solo il pubblico: testata da
`profilo_pubblico` (foto, nome, @username, PT, "su ProgettoPalestra da", amici), allenamenti come
recap del feed e schede pubbliche. **Il cognome solo a sé, agli amici accettati e fra PT e
atleta**: è il dato che rende una persona rintracciabile fuori dall'app, e una richiesta in attesa
non basta (se no basterebbe mandarla). La propria pagina è la stessa, con "Modifica profilo". Ha
preso il posto delle due viste persona di prima (ProfiloAmico in Amici, ProfiloPubblico in Cerca).

**Segnala e blocca.** Le segnalazioni accettano il tipo `utente`; il moderatore può togliere la
FOTO PROFILO (nome e username li cambia la persona), e conta come un contenuto tolto. Il blocco:
chi blocca e chi è bloccato **spariscono a vicenda, in silenzio**. Il filtro sta nel database
(`bloccato_con` in ricerca, suggeriti, feed, schede, commenti, mi piace, nomi, profilo, foto,
chat, richieste), non nell'app: un blocco fatto nel browser sarebbe una cortesia. Il proprio PT o
un proprio atleta non si blocca: prima ci si scollega. Sbloccare non rimette l'amicizia.

**"Contatta il PT".** Dalla pagina di un PT un atleta (anche se ne ha già uno, senza limite al
numero) apre la chat anche senza amicizia (`contatti_pt`, `contatto_pt_con` nella regola dei
messaggi). Il PT sceglie "Prendo l'incarico" o "Rifiuta"; poi **conferma sempre l'atleta** ("Passa
a… / Resta con…" se ha già un PT). Resta un PT alla volta (`profili.pt_id`). Ogni mossa scrive anche
un messaggio in chat: è così che arriva all'altro, col pallino dei non letti, senza un sistema di
avvisi in più. La chat resta aperta anche dopo un rifiuto; la chiude solo un blocco.

**Social e feed.** Dentro Social la barra in basso cambia voci: Home · Amici · Social · Messaggi ·
Cerca (prima erano tre icone in alto a destra nel feed). Nel feed: "Per te | Amici" al centro in
alto, chi ha pubblicato in alto a sinistra, cuore e commenti in colonna sul bordo destro, il post
fino in fondo con la barra di vetro sopra (prima finiva sopra la barra, e sotto restava una fascia
piena). Icone nuove: commenti (fumetto quadrato con due righe) e Social (il globo di Phosphor, MIT:
semplice da spento, coi continenti da acceso).

**Benvenuto.** Il video della presentazione (`public/trailer-palestra.mp4`, 12MB): anteprima in
alto a sinistra su schermo largo, sotto i tasti sul telefono; si apre a schermo pieno. Sta in
`public` e non entra nella precache del service worker.

**Database.** Tutto `schema.sql` va rilanciato: le modifiche sono dentro le funzioni esistenti.
Provato su un Postgres vuoto (con `auth` e `storage` finti): il file passa due volte di fila, e
blocco, sblocco, segnalazione e il giro completo del contatto col PT fanno quello che devono. Tolti
anche due inciampi della 44ª: il controllo dei nomi doppi (il nome non è più unico, e il file non
si rilanciava più) e la colonna `foto` usata prima di essere creata. `conversazioni()` cambia forma
(il nome dell'altro), quindi si cancella e si ricrea. **Non provata sul telefono.**

**Tornata 46ª** (2026-10-09, il branch `refactor` di filippo-baglini, un commit, `9085b3c`; portato
su `main` in fast-forward su richiesta dell'utente, dopo lint, 398 test verdi e build).

**La scheda attiva.** Prima la Home proponeva "la scheda usata per ultima", e chi ne aveva due non
sceglieva niente. Ora c'è `attiva: true`, una sola (`rendiAttiva` spegne le altre): la mette
"Rendi attiva" nella pagina della scheda, e la prende da sola una scheda nuova (scritta,
importata, prefatta), come le diete. Una copiata dalle Schede Generali o ricevuta da un amico no:
la si prende per guardarla. Se l'attiva viene archiviata non ne subentra un'altra di nascosto:
sarebbe decidere al posto di chi si allena. Gli account di prima, che non ne hanno scelta
nessuna, continuano con la usata per ultima. L'attiva finita la Home la dice ("scegli la
prossima") invece di proporre altro.

**Archiviare, eliminare, senza fine.** Gli allenamenti fatti stanno DENTRO la scheda: eliminarla li
cancella da calendario, storico e progressi, foto comprese. Per questo `EliminaScheda` dice il
numero per esteso, tiene spento il tasto rosso fino alla spunta e mette accanto "Archivia", che
toglie la scheda dall'elenco (in fondo, chiusa) e dai consigli tenendo tutto. "Senza fine": la
settimana completata passa da sola alla successiva (`avanzaSeFinita`, anche a fine allenamento),
la scheda non è mai completata e il programma non finisce.

**Navigazione.** La barra rifà la cronologia Home → sezione (`vaiASezione`): prima ogni linguetta
si impilava e indietro ripercorreva tutte le sezioni toccate. Uscire dall'allenamento lo toglie
dalla cronologia (prima indietro portava a "Nessun allenamento in corso"). `goBack` non guarda più
`history.length`, che conta anche voci in avanti e di altri siti: dalla prima pagina la freccia
usciva dall'app. Home al centro della barra.

**Il resto.** Home senza righe Dieta e Social, il pallino di Social col numero. ⚠️ La riga Dieta
coi macro era una richiesta dell'utente nella 45ª, fatta in parallelo: con questo merge è sparita.
Chip della scheda (`NomeScheda`) sugli allenamenti di calendario e storico. Kg con virgola o
punto; un campo svuotato resta vuoto invece di tornare 0 o 1; le settimane si applicano uscendo
dal campo (svuotarle le cancellava). La pista delle card alta quanto quella guardata
(`useAltezzaPista`). Nel feed la sbirciata sui media di lato e la pillola "2 foto ›" toccabile.
Niente "—" nei testi dell'app.

**Database:** nessuna modifica; `attiva`, `archiviata` e `senzaFine` stanno dentro `dati`. Un
telefono non aggiornato non li conosce: vede le archiviate come normali e una "senza fine" con le
sue settimane. **Non provata sul telefono.**

---

**Tornata 45ª** (2026-10-08, su `main`, chiesto dall'utente: "pusha su main"). Richieste
successive in una sessione con Claude, dopo il merge della 44ª in `pippo`.

**Il post con la foto scorreva di lato.** Un nome d'esercizio lungo (una riga sola, coi puntini)
allargava la pagina del post: `.post-pagina` è un elemento flex e senza `min-width: 0` non si
stringeva sotto il suo contenuto (423px su 375). Con la foto di sfondo si vedeva di più perché la
foto si allargava con lei. Ora `min-width: 0; overflow: hidden`.

**Il feed senza i propri.** `filtraFeed` toglie sempre gli allenamenti di `ioId`: "Per te" sono
tutti gli altri, "Amici" solo gli amici. Prima i propri restavano apposta sotto "Amici" (una
schermata vuota al primo avvio sembrava un guasto): l'utente li vuole fuori, e il vuoto lo dice a
parole. Il messaggio di "Per te" vuoto non dice più "il primo può essere il tuo".

**Lo Storico "I miei".** Ogni allenamento è una card col recap del feed (`RecapCartolina`: RecapPost,
la foto di sfondo velata, il badge di visibilità), alta 9:14 perché in 4:5 la lista degli esercizi
non ci stava. Aperto, sotto il recap ci sono gli stessi tasti del giorno nel calendario: il blocco
è uscito da CalendarPage ed è `AzioniAllenamento`, usato da tutti e due. ⚠️ Lo Storico legge il
collettivo (la risposta del server tenuta da parte), che non sa delle correzioni appena fatte: dei
propri fa fede la copia LOCALE trovata per scheda e data, e se Correggi cambia la data la pagina
ricorda dove è finito l'allenamento (`spostati`). Quelli dei profili eliminati (l'archivio) non
stanno fra le schede: si possono solo cancellare. "Degli altri" resta una lista di righe.

**La riga Dieta della Home.** Calorie e tre macro mangiati oggi; "x / y" con la barra solo con una
dieta ATTIVA. Prima, senza dieta salvata, l'obiettivo veniva da quella calcolata dai dati del
profilo: ora quella resta un suggerimento della pagina Dieta. Su un telefono stretto "/ 250 g" va a
capo sotto il numero.

**Database:** nessuna modifica. Provato nel browser (telefono emulato) senza salvare niente; il
caso con una dieta attiva solo con numeri finti nella pagina. **Non provata sul telefono.**

**Tornata 44ª** (2026-10-08, su `main`, chiesto dall'utente: "pusha su main"). Richieste
successive in una sessione con Claude.

**Nome, cognome e username.** La registrazione chiede nome, cognome e username al posto del solo
nome. Si entra con lo **username** (o l'email): `email_per_accesso` cerca per username, con la
stessa firma. Il nome torna a essere solo come ti chiami, quindi **via `profili_nome_unico`**:
modifica non additiva, concordata. `username_disponibile` si può chiamare anche senza account
(la registrazione lo chiede prima di esistere), e usa `is distinct from auth.uid()`: con `<>`, senza
sessione avrebbe detto "libero" a tutto. Il trigger salva anche `cognome`. Chi era già registrato
ha lo username generato a suo tempo, e lo vede in "I miei dati".

**Foto del profilo.** Si tocca l'avatar nel Profilo; la foto si rimpicciolisce a 512px e va nel
bucket `avatar`, **pubblico in lettura** (una foto profilo è fatta per essere vista), in
`<user_id>/<ora>.jpg`: un nome nuovo a ogni cambio, se no il browser mostrerebbe la vecchia dalla
cache. `components/Avatar` la mostra ovunque ci sia un pallino; le foto degli altri le chiede
`lib/fotoProfili` per id, tutte insieme (`foto_profili`). Quella cambiata da un amico si vede alla
riapertura dell'app.

**Home e Programmi.** "Inizia allenamento" è in alto a destra nel riquadro di oggi, e c'è anche
nei giorni di riposo: lì apre un foglio per scegliere quale giorno della scheda fare. Nei
Programmi vuoti un "+" grande al centro apre lo stesso menu del "+" in testata.

**Database:** due blocchi in fondo a schema.sql ("NOME, COGNOME E USERNAME…" e "FOTO DEL
PROFILO"). **Non provata sul telefono.**

**Tornata 43ª** (2026-10-08, su `main`, chiesto dall'utente: "pusha tutto", confermato su
`main`). Dopo il merge della 42ª, a richieste successive in una sessione con Claude.

**Il Benvenuto.** Pagina nuova (components/Benvenuto), sempre scura: il logo col suo battito (una
linea piatta attraversa lo schermo, un impulso ci corre sopra ed entra nel logo, dove diventa
l'onda del disegno), "ProgettoPalestra" nel carattere della testata, "Il fitness a un click." e lo
slogan; sotto, l'app raccontata in cinque riquadri con piccoli schermi animati. **Accedi e Crea
account non cambiano pagina**: i campi entrano al posto dei tasti. La registrazione chiede prima
email, nome e password, poi **una domanda alla volta** (ruolo, codice PT, sesso, età/peso/altezza,
movimento, obiettivo, livello, consensi) con la barra di avanzamento; le regole sono quelle di
prima e `crea` le ricontrolla tutte in fondo. ⚠️ Il nome già preso lo dice il database solo
all'ultimo passo. Il quadrato bianco dietro al logo nel tema scuro è sparito (logo nuovo).

**In tutta l'app.** Uno **sfondo vivo**: due luci sfocate che vagano piano, col colore
dell'accento (body::before/after). Le testate sono vetri che sfumano invece di fasce con un bordo.
I **tasti sono quelli del benvenuto**: pillole, quello d'accento in gradiente con un alone, gli
altri di vetro; mai da bordo a bordo (`.btn-block` al massimo 280px). La barra d'azione in fondo
(Inizia allenamento) non ha più il riquadro. La settimana della Home ha i giorni del calendario
(`classeGiorno`, `anelloDi` in lib/oggi, usati da tutti e due).

**Il post del feed.** Tre tentativi prima di quello giusto: la card condivisibile come immagine al
centro ("brutto"), la stessa disegnata a tutto schermo ("ancora no"), la cartolina vecchia. Quello
voluto: **il formato del recap condivisibile, ma non un'immagine** (components/RecapPost) — gli
stessi blocchi, nell'ordine scelto da chi si è allenato, fatti di elementi veri. La prima foto
dell'allenamento fa da sfondo velato e **tenendo premuto** il recap sparisce e la si vede; di lato
solo gli altri media; pillole in alto ("Tieni premuto", "+N") perché si capisca che ci sono. Il
feed finisce sopra la barra in basso; foto e video stanno fra la testata e la riga di chi l'ha
fatto (i comandi del video ci finivano sotto). Il recap aperto toccando il post è un foglio nel
body (dentro `.feed-schermo`, che è `fixed`, la barra gli stava sopra).

⚠️ La foto di sfondo scelta condividendo il recap NON arriva nel feed: non si salva da nessuna
parte. Nel feed fa da sfondo la prima foto attaccata all'allenamento.

Provato con le prove (389) e su un banco con Chrome senza schermo (temi chiaro e scuro, tre misure
di telefono). Nessuna modifica al database. **Non provata sul telefono.**

---

**Tornata 42ª** (2026-10-08, da `ui-rework`, portata su `main` lo stesso giorno, chiesto
dall'utente: "merge with main so I test the live app"). Il rifacimento dell'interfaccia, in buona
parte fatto dall'utente sul suo ramo e finito in questa sessione con Claude, a richieste successive.

**Dove si va.** Il menu laterale e il menu del profilo non ci sono più: la navigazione è la
**barra in basso** a cinque sezioni (Home · Allenamento · Dieta · Social · Altro), "liquid": la
sezione accesa sale in un cerchio col suo nome sotto, e il cerchio scivola. In cima a ogni pagina
(tranne l'allenamento) la **testata dell'app**: logo, "ProgettoPalestra" (il gradiente blu su
"Palestra" l'ha chiesto l'utente: è l'unico testo a gradiente) e l'avatar, che apre il **profilo
come finestra di vetro** sopra la Home. "Altro" raccoglie quello che stava nel menu laterale.

**La Home** (`/`, InizioPage) non è più il calendario: la settimana in cima, l'allenamento di oggi
con i suoi esercizi e il tasto "Inizia allenamento" (dritti nella sessione), dieta e social come
righe. Il calendario è lo "Storico" della sezione Allenamento.

**L'allenamento.** Il recupero è grande in cima e **parte da solo** quando si segna una serie
(non fra gli esercizi dello stesso giro di una superserie, né dopo l'ultima serie); si spegne dal
menu ⋯, per telefono. Era il problema più grosso di una critica fatta sulla sessione: lo Start
stava in cima e i tasti dello sforzo in fondo, due gesti lontani a ogni serie. I tasti dello
sforzo hanno la **batteria** (piena / una tacca / vuota) al posto delle emoji; il consiglio sul
peso sta chiuso dietro "Peso consigliato"; "‹ Esci" al posto dell'orologio; "Termina" non più
rosso; in "Modifica" e nel peso il tasto pieno è "Solo per oggi" (quello che non tocca la scheda
del PT). Provata una variante col pannello fisso in fondo: l'utente ha preferito il recupero in
cima.

**Il corpo e i colori dei muscoli.** Il corpo (recap, feed, card condivisa) accende ogni gruppo
col **colore del suo gruppo** (lib/muscoli) invece di un rosso solo: dice cosa, non solo quanto.
Nella scheda, al posto dei pallini colorati, un corpo in miniatura accanto a ogni giorno e una
legenda; nel calendario ogni giorno allenato è un anello coi colori dei muscoli.

**Altro.** "I miei dati" rifatto (il conto delle calorie in cima, unità dentro i campi, livello a
scelta); le pagine non scorrono più a vuoto (l'altezza minima toglie la testata, `overflow-x: clip`,
niente rimbalzo); PRODUCT.md e DESIGN.md descrivono chi usa l'app e il sistema visivo
("Lo Spogliatoio Pulito").

**Il merge con `main` (40ª e 41ª).** Il ramo aveva tolto `MenuLaterale` e `SchedaRecap`, dove la
40ª aveva messo moderazione e segnalazioni: la segnalazione delle foto è passata al post a schermo
intero (`PostSchermo`), la voce "Segnalazioni" dei moderatori in "Altro". Il programma della
scheda (41ª) è entrato nel calendario nuovo, e la card di oggi della Home lo segue (`lib/oggi`
usa `schedaInCorso`/`pianoScheda`/`messaggioOggi`, con `giornoId` per andare dritti).

Provato con le prove (389) e, per la grafica, su un banco con Chrome senza schermo (temi chiaro e
scuro). Nessuna modifica al database. **Non provata sul telefono.**

---

**Tornata 41ª** (2026-10-07, da `pippo`, portata su `main` lo stesso giorno, chiesto "su main").
Due richieste dell'utente sul calendario.

**Il programma della scheda nei prossimi giorni, con i riposi, e l'allenamento saltato da
recuperare** (`lib/pianoScheda`). Con i chip "Giorni di allenamento" gli allenamenti cadono in
ordine su quei giorni e gli altri sono riposo; senza, vale l'elenco dei giorni della scheda coi
suoi Rest. Il programma riparte dall'ultimo allenamento fatto, non da una data fissa: con una data
fissa chi si allena un giorno diverso sarebbe rimasto "indietro" per sempre. Saltato = c'era un
allenamento in programma fra l'ultimo fatto e oggi; da recuperare è `giornoCorrente`, come nel
resto dell'app. La card di oggi lo dice con le frasi chieste dall'utente. Scelte nostre, dette
all'utente: una scheda mai cominciata parte oggi (una creata la sera non segna "saltato"); conta una
scheda sola, quella usata per ultima (prima la card prendeva la più vecchia); il programma finisce
con le settimane della scheda; la dieta (allenamento/riposo) guarda ancora solo i chip.

**Dal calendario dritti all'allenamento, e il programma modificabile.** Rotta nuova
`/scheda/:id/giorno/:giornoId` (anche in `vercel.json`: se ne è accorto `tests/percorsi`), la
freccia da lì torna al calendario. Un riposo non porta da nessuna parte. Ogni giorno da oggi in poi
si cambia: un altro allenamento della scheda, riposo, uno salvato o di un'altra scheda, o qualcosa
scritto a mano ("Calcetto"). Sta in `Scheda.programma` (dentro `dati`, niente database).
L'allenamento che c'era scivola al prossimo giorno di allenamento invece di perdersi; un riposo
sostituito si consuma.

Provato sul banco (`scratchpad/prova-programma.html`, `?riposo` per il caso di riposo) e con 12
prove in `tests/pianoScheda.test.js`. **Non provata sul telefono.**

---

**Tornata 40ª** (2026-10-07, da `pippo`, portata su `main` lo stesso giorno, chiesto "su main").
Tre richieste dell'utente, una dopo l'altra.

**Niente parolacce, bestemmie o parole sgradevoli, "in tutte le parti dove un utente può inserire
del testo"** (`lib/linguaggio`). Un ascoltatore solo sul documento (`main.jsx`) copre la parola
appena finita, e in ogni caso prima che il testo parta (perdita del fuoco, Invio, tocco su
qualsiasi tasto: su iPhone toccare "Invia" non toglie il fuoco al campo), con un avviso in basso.
I campi controllati da React si aggiornano col setter nativo + evento `input`. Riconosce numeri al
posto delle lettere, lettere ripetute o staccate, bestemmie in due parole o attaccate. Nome e
username si rifiutano; commenti e chat si ricontrollano prima dell'invio. Una prima versione
prendeva "fagioli", "indicazioni", "tonificazione" (le doppie erano facoltative): ora una doppia
resta doppia, e la prova passa tutti i testi dell'app.

**Segnalare commenti e foto del Feed, col motivo.** Bandierina sulle cose degli altri; motivo
obbligatorio (e due righe con "Altro"); chi segnala non le vede più, l'autore non sa chi è stato.

**La moderazione**, con le regole decise dall'utente: per ora controlla lui (account "Filippo").
Con tre persone diverse la cosa si nasconde a tutti tranne all'autore finché il moderatore non
decide. 1° e 2° contenuto tolto = rimozione + avviso; 3° = niente pubblicazione nel Feed
(commenti, foto pubbliche, allenamenti pubblici: chat e resto dell'app restano); 4° = account
bloccato (nemmeno la chat). Si sblocca su richiesta dall'app, a discrezione del moderatore; il
conto non si azzera. Ogni decisione lascia una NOTIFICA all'autore con cosa era e il motivo
(scelto dal moderatore, proposto il più segnalato). I contenuti già esistenti restano com'erano.
Termini (nuovo punto 7) e privacy aggiornati, VERSIONE_TESTI 2026-10-07: tutti riaccettano.
Aggiunta di nostra iniziativa, segnalata all'utente: per contenuti gravi o illegali si può
bloccare subito (oggi solo da SQL).

✅ Database: lo schema l'ha lanciato l'utente dal SQL Editor il 2026-10-07 (prima l'`insert` in
`moderatori` falliva perché lo schema non era ancora stato lanciato), e si è nominato moderatore.
Le regole erano state provate prima in un Postgres locale (PGlite) con RLS vere: i quattro
gradini, nascosto a 3 persone, chat bloccata, richieste solo da bloccati e una sola aperta.
Provata nei banchi `scratchpad/prova-moderazione` (anche `?modo=avvisi|pubblicazione|account`) e
`prova-feed-social`. **Non provata sul telefono.** ⚠️ Chi elimina l'account e se ne rifà uno
riparte da zero.

---

**Tornata 39ª** (2026-10-07, da `pippo`, portata su `main` lo stesso giorno, chiesto "su main").
L'utente se n'è accorto allenandosi: il consiglio sul peso guardava solo il peso e i pallini della
volta scorsa, ma nella scheda serie, ripetizioni e tecniche cambiano di settimana in settimana.
Il suo esempio: 5×5 a 100 kg tutto verde, la settimana dopo 2×10 — il consiglio diceva 105 kg.

**Il peso per lo schema di oggi** (`lib/carico`). I pallini passano da un massimale stimato: il
colore dice quante ripetizioni c'erano ancora in canna (verde ~4, giallo ~2, rosso ~0, zero tondo
se le ripetizioni non sono arrivate), e peso × (1 + ripetizioni a cedimento / 30) è il massimale
(Epley), in media sulle serie della volta scorsa. All'indietro, il peso di oggi è quello che con
le ripetizioni di oggi ne lascia 2 nell'ultima serie: 0 a cedimento, col drop set e in
rest-pause; quante dicono RPE e RIR; l'RM e la % del massimale come sono. −1% per serie in più
(fino a 4), il 10% in meno col fermo o la discesa lenta; col drop il testo dice anche di quanto
scendere. RPE/RIR/RM/% diventano un peso in kg da mettere sul bilanciere. L'esempio dell'utente
ora dà 92,5 kg. A schema uguale i conti tornano quelli di prima (tutto verde ≈ +5%, qualche
giallo un passo, metà rosse giù), e il verso lo decidono ancora i pallini.
Il peso della scheda per quel giorno (chiesto: "prendendo anche come riferimento il peso, se
esistente") è il riferimento: vicino alla stima si tiene, lontano vince la stima e il testo dice
tutte e due ("prova 92,5kg, 100kg sono tanti"; "resta su 60kg, non 65kg"). Il perché della
banda, e non di una media, in decisioni.md. Lo schema di oggi arriva al consiglio in allenamento
(riquadro e modale del peso), nella scheda e nel consigliato, che ora sceglie il peso di partenza
per le SUE serie e ripetizioni.

**Lo storico dell'esercizio con "le ultime N"** (`components/StoricoEsercizio`). Chiesto: vedere
solo l'ultima volta, le ultime 3 o quante si vuole, di base 5. −/+ tra "Solo l'ultima" e
"Tutte e N", più un tasto "Tutte"; si riparte da 5 ogni volta che si apre.

⚠️ Nessuna modifica a `schema.sql` né al modello dati: le ripetizioni fatte in ogni serie c'erano
già dalla 37ª. Provata con tests/carico.test.js (anche: il consiglio non cambia dopo "Usa") e nel
banco `scratchpad/prova-carico` (la sessione vera, settimana 2, "Usa → Solo per oggi", il −/+).
**Non provata sul telefono.**

---

**Tornata 38ª** (2026-10-07, da `pippo`, portata su `main` lo stesso giorno). Tre richieste
dell'utente, una dopo l'altra.

**Riscaldamento/mobilità e stretching finale, facoltativi, per GIORNO** (`lib/preparazione`,
`components/Preparazione`). Chiesto "al momento della creazione della scheda, non obbligatori";
alla domanda "uno per la scheda o uno per giorno?" l'utente ha scelto per giorno (il riscaldamento
del giorno gambe non è quello della spinta). Due campi di testo sul `Giorno`, una voce per riga;
vuoti non compaiono da nessuna parte. Nell'editor sono due tasti tratteggiati "+ … · facoltativo"
sopra e sotto gli esercizi; "+ Giorno" li copia dal giorno prima, così se sono sempre uguali si
scrivono una volta. Si modificano anche da "Modifica esercizi" del giorno. Si vedono
nell'anteprima del giorno e in allenamento come voci da spuntare (le spunte nella sessione): il
riscaldamento aperto finché non si chiude la prima serie, lo stretching quando le serie sono
finite, prima di "Termina". L'import legge "Riscaldamento: a, b" e "Stretching: …" (o il titolo da
solo e l'elenco sotto fino alla riga vuota; prima del primo giorno vale per tutti i giorni senza il
loro); "Mobilità spalle: 2x10 rotazioni" è una voce sola, "Stretching pettorali 2x30s" resta un
esercizio. Nell'Excel, una riga sopra e una sotto la tabella del giorno.

**Glutei e polpacci gruppi muscolari a sé** ("non considerarli come gambe in generale"). Nuovi in
GRUPPI (vista da dietro), nella libreria (hip thrust, ponte, abductor, kickback; i calf raise), tra
le parole chiave (prima delle gambe: "Calf raise alla leg press" è polpacci), nel disegno del corpo
(il grande gluteo e i gemelli staccati da "gambe", che ora sono le cosce), nella pagina Esercizi (il
3D di calf raise e abductor resta), nel motore (focus "Glutei", volumi, giornate di gambe).
Gli esercizi scritti "gambe" prima che i due gruppi esistessero si spostano quando la scheda si
carica (`gruppiAggiornati`), anche negli allenamenti fatti: recap e consigli si correggono
all'indietro. Perché solo "gambe" da solo e perché i polpacci non sono nel consigliato: in
decisioni.md.

**"Esporta la scheda" / "Esporta i progressi", in PDF o Excel.** Chiesto: in qualsiasi momento,
la scheda col peso e il colore del pallino di ogni esercizio, settimana per settimana — i progressi
se è in corso, il recap se è finita. `foglioRisultati` (lib/schedaExcel) tiene la struttura della
scheda: ogni esercizio una riga per settimana (e per volta, se rifatto), una casella per serie
"8 × 82,5kg" colorata come il pallino, le settimane non fatte col previsto. I completamenti salvano
da ora l'`esercizioId`, così un esercizio rinominato dopo resta al suo posto; gli allenamenti di
prima si ritrovano per nome, e quello che non si ritrova va in fondo "(fuori scheda)". Poi
l'utente ha chiesto anche il PDF, e i tasti con i soli nomi "Esporta i progressi" ed "Esporta la
scheda": il tasto apre la scelta PDF / Excel. Il PDF è scritto a mano (`lib/pdf`, come l'xlsx)
e disegna gli stessi fogli. Il tasto c'è anche nella scheda di un atleta, per il PT, con gli
allenamenti che lui può vedere.

⚠️ Nessuna modifica a `schema.sql`: riscaldamento, stretching e `esercizioId` stanno nel json. Un
telefono non aggiornato ignora riscaldamento e stretching (e non li cancella salvando: si
spargono); vede glutei e polpacci come pallino vuoto. Provati: test (353), lint, banchi
`scratchpad/prova-preparazione`, `prova-gruppi`, `prova-risultati` (il PDF aperto nel lettore di
Chromium), l'editor nell'app in locale dall'utente ("tutto perfetto"). **Non provata sul
telefono**: in particolare la condivisione del PDF su iPhone.

---

**Tornata 37ª** (il lavoro di Ciusbe, branch `ciusbe`). Dal 2026-10-07 il racconto della tornata
sta solo qui, e context.md ne tiene una riga; questo è il testo che era in cima a context.md:

Ultimo aggiornamento: 2026-10-07 (37ª tornata): il lavoro di **Ciusbe** (branch `ciusbe`, quattro
commit del 2026-10-05), unito in `pippo` e portato su `main` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**Lo schema di un esercizio è in numeri** (`lib/schema`, che assorbe `lib/fasi`):
`{ fasi: [{ serie, rip, carico, perLato? }], recuperoSec, nota }` (§6). Prima serie,
ripetizioni, carico e recupero erano testo libero. ⚠️ **I dati vecchi non si migrano**: schede,
storico e schede degli amici restano di testo nel database e diventano numeri quando si leggono
(`normalizzaSchema`, chiamata da `normalizzaScheda` e `schemaPerSettimana`); quello che non
diventa un numero ("elastico rosso") finisce nella nota. Una scheda risalvata va su nella forma
nuova. Ogni funzione di `lib/schema` accetta tutte e due le forme. L'editor (`SchemaFasi`) ha
campi numerici, i tipi di ripetizioni (numero, intervallo, max, tempo) e di carico (kg, RM, %,
RPE, RIR) e i preimpostati del recupero.

**Import: un formato documentato e un parser che regge i testi veri** (`lib/parser`,
`lib/formatoScheda`). Una riga per esercizio, `+` davanti = superserie col precedente (prima
l'import le perdeva), righe `S1-2:` sotto un esercizio per le settimane; legge anche elenchi,
inglese, "4 serie da 10", A1/A2 e il dialetto del PT di prima. Quello che non capisce lo
restituisce riga per riga (`problemi`). `ImportPage` mostra la guida, copia un prompt per farlo
riscrivere a un'AI, e prima di salvare fa ricontrollare righe non capite, schema letto, nome
della libreria e gruppi. ⚠️ `tests/parser.test.js` legge l'esempio della guida: cambiando le
regole si cambia anche lui.

**"Aggiungi esercizio" apre una ricerca** (`components/CercaEsercizio`; `cercaEsercizi`,
`eserciziPropri` e `nomeInLibreria` in `lib/eserciziLibreria`): prima gli esercizi già fatti,
con lo schema dell'ultima volta, poi la libreria; senza scrivere si sfoglia per gruppo; se non
c'è si aggiunge col nome scritto. Il gruppo arriva con l'esercizio, e dal nome di un esercizio
se ne cerca un altro al suo posto. `/nuovo-allenamento` si apre con la ricerca.

**Ogni serie chiusa registra ripetizioni e kg fatti**: `sets: [{ colore, rip?, kg? }]`
(`serieChiusa` in `lib/session`). Senza dire altro sono quelli del piano, così chiudere resta un
tocco solo; una serie già chiusa si corregge sotto i pallini. Volume, record e consiglio sul
carico usano quello che si è fatto; gli allenamenti di prima, che non li hanno, usano il piano.
`kg` è il peso scritto: due manubri da 20 sono 20 (lo schema dice `coppia`, il volume conta 40).

⚠️ Nessuna modifica a `schema.sql`, e nessuna funzione del database legge lo schema. Ma **cambia
la forma dei dati scritti**: un telefono con l'app vecchia, finché non aggiorna, trova schemi e
serie nella forma nuova, che non conosce (cosa mostra non è provato). Provati: test (336) e lint
dopo il merge con la 36ª. **Non provata sul telefono né con account veri.**

---

**Tornata 36ª** (spostata qui da context.md il 2026-10-07, com'era scritta lì; la regola su
`profili` poi l'utente l'ha lanciata dopo il deploy, lo stesso giorno):

Ultimo aggiornamento: 2026-10-07 (36ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**I dati fisici li leggono solo il titolare e il suo PT.** Prima la regola su `profili` dava la
riga INTERA a chiunque avesse un legame — bastava una richiesta d'amicizia mandata e non ancora
accettata — e peso ed età si leggevano via API, anche se l'app non li mostrava. Ora i profili
degli altri arrivano da **`profili_collegati()`** (`leggiProfiliCollegati` in `lib/social`):
le stesse persone di prima, ma `dati`, `codice_amico`, `associato_il` e `creato_il` sono
pieni solo per sé e per i propri atleti. Agli altri arrivano nome, **username** (prima non
arrivava: la @ degli amici non compariva mai), ruolo, codice PT e `pt_id`. La regola di lettura
su `profili` diventa **"il mio e quelli dei miei atleti"**. `public/privacy.html`, punto 4, dice
la stessa cosa (data invariata: il cambio toglie, non aggiunge, e i testi erano di due giorni prima).

**Un legame nasce solo se l'altro accetta.** Tre trigger in fondo a `schema.sql`: `pt_id` si
scrive solo con una richiesta di lavoro accettata (prima chiunque poteva mettersi come PT
chiunque); cancellata quella relazione, **il database toglie il `pt_id`** all'atleta (prima "Non
seguire più" del PT non staccava niente: l'atleta restava suo, dati compresi); una relazione non
cambia persone né tipo (prima chi riceveva una richiesta poteva girarla a nome di un altro e
falsificare un'amicizia). L'app non scrive niente di tutto questo: per lei non cambia nulla.
⚠️ **Database:** funzione e trigger lanciati dall'utente il 2026-10-07, prima del merge; la query
di controllo dei `pt_id` senza richiesta accettata (nel commento della sezione) non ha trovato
nessuno. **La nuova regola su `profili` si lancia DOPO il deploy**: lanciata prima, l'app online
non vedrebbe più amici e PT; non lanciata, via API gli amici leggono ancora i dati fisici. Si
controlla con `select policyname from pg_policies where tablename = 'profili' and cmd =
'SELECT'`: una riga sola. ⚠️ Provati: test, lint e l'SQL vero di `schema.sql` su un Postgres in
memoria (PGlite), prima e dopo. Non provato nell'app con account veri.

---

**Tornata 35ª** (spostata qui da context.md il 2026-10-07, com'era scritta lì):

Ultimo aggiornamento: 2026-10-05 (35ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**Privacy e termini.** I testi stanno FUORI dall'app, come il 404: `public/privacy.html` e
`public/termini.html` (stile in `public/legale.css`), serviti a `/privacy` e `/termini` da due
rewrite di `vercel.json` che non vanno a `index.html`. Così si leggono senza account, senza
JavaScript e da Google; dall'app ci si arriva da benvenuto, registrazione e menu del profilo
(`components/Legale`: i link aprono un'altra scheda). Titolare Filippo Del Rosso, contatto
**`info@progettopalestra.it`** ⚠️ **che è ancora da creare su Register.it**. ⚠️ L'informativa
racconta chi legge cosa come lo dicono le regole di `schema.sql` (amici: il profilo intero, dati
fisici compresi; tutti: schede e allenamenti pubblici; il diario nessuno): se cambiano le regole,
si rilegge.

**Consensi.** Alla registrazione **due caselle separate**, nessuna già spuntata: Termini (con la
presa visione dell'Informativa) e **dati sulla salute** (GDPR art. 9). Senza tutte e due niente
account. Chi l'account l'aveva già li trova al primo accesso (`pages/Consensi`, prima dell'app in
`Root` di App.jsx): può solo accettare o uscire, e serve la rete. Stanno nei **metadati
dell'account Supabase** (`user_metadata.consensi`: versione dei testi e momento), non in una
tabella: `schema.sql` non cambia. ⚠️ `VERSIONE_TESTI` di `lib/consensi` è la data in cima alle due
pagine (`tests/consensi.test.js`): si cambia solo se i testi cambiano nella sostanza, e allora
l'app richiede il consenso a tutti. Età minima 14 anni, consenso sulla salute obbligatorio.

**Google.** Nella sitemap ci sono solo `/`, `/privacy` e `/termini`: Google non fa l'accesso, e le
37 pagine dell'app per lui erano 37 volte la schermata "Benvenuto". Le pagine dell'app il server
le manda con **`X-Robots-Tag: noindex`** (sezione `headers` di `vercel.json`, una riga per ogni
rewrite che va all'app). `index.html` ha un titolo pensato per i risultati di ricerca, la
description, il canonical su `https://progettopalestra.it/` e i tag Open Graph per l'anteprima dei
link. ⚠️ **Una pagina nuova dell'app va in tre posti**: `routes` di `lib/router` e DUE volte in
`vercel.json` (`rewrites` e `headers`); nella sitemap no. `tests/percorsi.test.js` controlla.
⚠️ Provati: test, build e, nel browser, il benvenuto, il modulo con le caselle e le due pagine.
**Non provata la schermata dei consensi per chi ha già l'account** (serve un account vero): la
vedranno tutti al primo accesso dopo il rilascio. Nessuna modifica a `schema.sql`.

---

**Tornata 34ª** (spostata qui da context.md il 2026-10-05, com'era scritta lì):

Ultimo aggiornamento: 2026-10-01 (34ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**Indirizzi senza `#`.** Le pagine stanno su percorsi veri (`/dieta/oggi`, non più
`/#/dieta/oggi`), perché entrino nella sitemap. `lib/router` legge `location.pathname`;
**`vercel.json` elenca le pagine dell'app** e il server manda a `index.html` solo quelle, il resto
resta 404 (`public/404.html`). Il service worker legge LA STESSA lista (`lib/percorsi`, usato da
`vite.config.js`). I vecchi indirizzi col `#` (segnalibri, link delle mail) si riscrivono
all'avvio senza perdere il token della mail. ⚠️ **Una pagina nuova va in tre posti**: `routes`
di `lib/router`, `vercel.json` e, se non ha un id nel percorso, `public/sitemap.xml`
(`tests/percorsi.test.js` controlla che combacino).

**Dieta.** **"Rendi attiva"** dall'elenco: segue la dieta giornaliera quella resa attiva per
ultima (`attivataIl`, `dietaDiOggi`) finché il suo periodo comprende oggi; una dieta appena
creata nasce attiva; senza scelte decide il periodo come prima. **"Calorie e macro" salva solo
il LIMITE** (`dietaDaMacro({…, conPasti: false})`): niente pasti generati. Dentro un pasto che
la dieta non ha c'è **"Consigliami"** (`consiglioPerPasto`): un piatto sulla parte di quello che
manca che tocca a QUEL pasto, divisa con quelli che vengono dopo e sono da fare. **I pasti
generati contano tutti e tre i macro di ogni alimento** (`grammiDelPasto`): prima una giornata
generata valeva il 30% in più dell'obiettivo, il 70-90% per vegetariani e vegani. I sostituti di
un alimento vietato si scelgono per calorie simili (`costoDelMacro`), prima fra le alternative
del pasto, e un secondo resta un secondo (il pollo diventa seitan, non parmigiano). "Cosa non
mangi" riporta dove si era (`paginaDietro`) e il modulo dei macro non si svuota andandoci.

**Allenamento.** Il **bip di fine recupero è SPENTO di base**: si accende dal tasto "Bip a fine
recupero" nella card del recupero, che prima chiede conferma dicendo il prezzo. Acceso, suona
anche col silenzioso (sessione audio `playback`), ma **se c'è musica la ferma e la musica non
riparte da sola**: WebKit rilascia l'audio senza avvisare le altre app, e abbassarla ("duck")
una pagina non può (verificato nel sorgente di WebKit, vedi docs/decisioni.md). Spento, l'audio
non si tocca mai. Prima su iPhone non suonava affatto (l'audio nasceva fuori da un tocco); lo
Start non ferma più la musica e il bip non sparisce più dopo averla rimessa (`hooks/useRestTimer`).
**"Duro" (🔴) chiede a quante ripetizioni si è arrivati** (`components/ModaleRipetizioni`): il
numero sta nella serie (`rip`, §6) e si legge nel pallino rosso, nel riepilogo, nello storico e in
"Correggi". ⚠️ Provato nel browser (banchi in `scratchpad/`) e in Node; del bip sul telefono
l'utente ha provato solo la prima versione (da lì il tasto). Nessuna modifica a `schema.sql`.

---

**Tornata 33ª** (spostata qui da context.md il 2026-10-01, com'era scritta lì):

Ultimo aggiornamento: 2026-09-30 (33ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**"Dieta giornaliera" rifatta: in cima l'obiettivo, i pasti li riempie la persona.** In alto le
calorie e i tre macro da raggiungere oggi, con quanto manca, che si riempiono man mano; sotto i
cinque pasti più **"Extra"**, ognuno con quello che ci si è scritto dentro e **Aggiungi**
(`AggiungiMangiato` col pasto già deciso: niente più "a che pasto?"). I **consigli** — il piano
coi grammi ricalcolati su quanto resta, le alternative, lo schema, "L'ho mangiata" — stanno
**dentro il pasto** (`#/dieta/oggi/:slot`, cioè colazione…cena o `extra`), e ci si entra solo se
si vuole. Le voci del diario hanno `slot` (§6); quelle scritte prima lo ricavano dal pasto del
piano, dal nome scritto a mano o dall'ora (`slotDellaVoce`). Accanto al pasto il "~N kcal" della
dieta compare **solo se il conto è completo** (vedi §5).

**Calorie e macro diversi fra allenamento e riposo** (`#/dieta/macro`: "Uguale tutti i giorni /
Allenamento / riposo"; passando a "diversi" i numeri già scritti si copiano nel giorno di
allenamento). `dietaDaMacro({…, allenamento: {kcal, proteine, carbo, grassi}})`; il vecchio
"calorie in più" resta solo come parametro (`extraAllenamento`).

**La freccia degli editor esce dal flusso.** `lib/router` tiene la pila delle pagine
(`history.state.pos` + sessionStorage) ed `esci({salta, poi, riserva})` torna alla prima pagina
dietro che non fa parte del flusso. Prima salvare una scheda portava AVANTI alla scheda e da lì la
freccia riapriva l'editor: tre modifiche, sei pagine per uscire. Il modulo dei macro e l'import si
lasciano al posto dell'editor (`navigate(…, {sostituisci: true})`), lo schema salvato torna
all'editor che c'era, e salvare una dieta torna dove si era (l'elenco, o la dieta giornaliera).

**Conti del diario corretti** — errori di lettura, non di valori: "con" separa gli alimenti
("latte 200 ml con 40g di fiocchi" erano 200g di fiocchi, 710 kcal) · scatoletta e lattina ·
"mezzo/mezza" · un numero secco ≤ 4 non sono grammi · per i grassi "olio 10" sono grammi, non
dieci cucchiai · "biscotti" e "fette biscottate" a pezzi (prima 2 g di cereali) · latte
parzialmente scremato e scremato · "cereali" da soli · porzione stimata piccola per grassi e
marmellata. Prove in `tests/diario.test.js` e `tests/router.test.js`.
⚠️ Provato nel banco `scratchpad/prova-dieta-schema.html` (§3) e in Node, **non sul telefono**.
Nessuna modifica a `schema.sql`: `slot` sta nel JSON della voce.

---

**Tornata 32ª** (spostata qui da context.md il 2026-09-30, com'era scritta lì):

Ultimo aggiornamento: 2026-09-30 (32ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**La dieta del nutrizionista si importa davvero dal suo PDF.** Provato col PDF vero di una
dietista (Word 365): prima uscivano glifi a caso ("H[WUDYHUJLQH" per "extravergine") e pasti
mescolati (la colazione finiva sotto la merenda). `lib/pdfTesto` è riscritto, sempre senza
librerie: legge gli oggetti (anche dentro gli object stream), i font con ToUnicode e larghezze, e
rimette le righe in ordine per **coordinate**, non per ordine nel file; toglie intestazioni e
numeri di pagina ripetuti. `lib/parserDieta` capisce gli elenchi puntati: sotto "In
alternativa… è possibile consumare:" e sotto "Esempi:" ogni punto è un'alternativa, un "oppure"
senza pallino resta dentro il suo punto ("100g di pasta / oppure 120g di pane"), e quello che
viene dopo i pasti (porzioni dei secondi, sostituzioni, consigli) va in `Dieta.note`, non in coda
alla cena.

**Cinque pasti, sempre quelli**: colazione, spuntino, pranzo, merenda, cena (`lib/pastiBase`,
`slot` del pasto, §6). I nomi dei nutrizionisti si riconducono lì ("Spuntino del pomeriggio" →
Merenda, e così il secondo "Spuntino" scritto dopo il pranzo); pre/post workout restano pasti **in
più**, col loro nome. Nell'editor i cinque non si rinominano né si tolgono; "Pasto in più"
aggiunge gli altri.

**Schema settimanale** (`lib/schemaDieta`, `#/dieta/:id/schema`): per ogni giorno e pasto il tipo
di piatto (legumi, uova, carne bianca/rossa, pesce, formaggio, affettati, pasto libero), con
composizione ed esempi facoltativi. Si legge dalla tabella del PDF (colonne = giorni, trovate dalla
riga coi loro nomi; le etichette di riga anche scritte in verticale) o si scrive a mano.
**Dieta giornaliera** lo segue: ogni pasto parte dalla versione dello schema di oggi, e toccando
"N alternative" si **entra nel pasto** (`#/dieta/oggi/:pastoId`): prima quelle dello schema, poi
quelle che non nominano niente, in fondo e separate quelle **fuori schema**, sceglibili lo stesso.
A una dieta generata dai macro che non ha un'alternativa della categoria del giorno se ne rifà
una (`pastoConCategoria`), con porzioni vere (tetto: 3 uova, 80g di legumi secchi…).

**"Nuova dieta"** (`#/dieta/crea`) sceglie la strada: PDF del nutrizionista · calorie e macro
(scritti solo i macro, le kcal si contano 4/4/9 e si vedono subito) · dai dati del profilo.

Poi: il `+` separa gli alimenti di un pasto (prima "latte e caffè + 2 fette biscottate" era un
alimento solo da 913 kcal) · le alternative si adattano anche loro alle preferenze · una giornata
tipo chiamata "Lunedì" esce di lunedì (la rotazione la mandava al giovedì) · il pasto segnato
mangiato non cambia più piatto da solo.
⚠️ Provato coi due PDF veri in Node, nel banco `scratchpad/prova-dieta-schema.html` (§3) e con
`tests/dieta.test.js`, **non sul telefono** né contro il database vero. Nessuna modifica a
`schema.sql`: `schema` e `note` stanno nel JSON della dieta. Limiti noti: gli esempi dei PDF non
hanno grammi, quindi lì "L'ho mangiata" resta spento; il catalogo non conosce "cereali da
colazione" né "fette biscottate" (kcal per difetto).

**Tornata 31ª** (spostata qui da context.md il 2026-09-30, com'era scritta lì):

Ultimo aggiornamento: 2026-09-29 (31ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**Un allenamento terminato non si riapre più.** Riaprendo l'app tornava "in corso": una serie
segnata senza rete restava in coda, il "Termina" arrivava, e al riavvio la coda rimandava la serie
vecchia sopra il "finito". `lib/sync` ora: **una voce per riga, vince l'ultima**; ogni modifica
entra in coda **prima** di partire e ne esce solo quando il server la conferma; col server si
parla **uno alla volta**; le letture dell'avvio rimettono sopra quello che è ancora in coda. In
StoreContext le istantanee partono dalla copia locale, così va su anche ciò che si tocca prima di
aver sentito il server (prima si perdeva). Prove: `tests/sync.test.js`.

**Fasi dentro un esercizio: "Military press 3×5 poi 2×2"**, ognuna col suo peso. ⚠️ Nessun
campo nuovo: stanno nella notazione serie per serie che c'era già (`ripetizioni` "5/5/5/2/2",
`carico` "80kg/80kg/80kg/90kg/90kg") e si ricavano rileggendola (`lib/fasi`, §6). Si scrivono con
"+ Poi un'altra fase" nell'editor (anche per settimana) e nel modale Modifica (`SchemaFasi`); in
allenamento peso, consiglio sul carico e "Cambia il peso" sono della fase della serie su cui si è;
il parser legge "3x5 poi 2x2" dal messaggio del PT; ovunque si legge "3×5 + 2×2" · "80kg + 90kg"
(`formatSerieRip`, `formatCarico`), anche in Excel. Le piramidi "12/10/8" restano come prima.

**Recap per gruppo muscolare.** Nel feed toccare un gruppo (pastiglia o muscolo acceso) apre il
recap di quella persona coi soli esercizi di quel gruppo; nel recap i gruppi si scelgono (anche
più d'uno, "Mostra tutti" per tornare) e **"Ingrandisci"** apre il corpo a tutto schermo
(`CorpoZoom`: una sagoma alla volta, tre livelli con + / − o due dita) per prendere col dito anche
i muscoli piccoli. Stessa regola delle pastiglie (`eserciziDeiGruppi`): i dip stanno sotto petto
E tricipiti. Vale ovunque ci sia il recap: feed, calendario, fine allenamento.

Poi: in allenamento il modale Modifica **rinomina ed elimina** l'esercizio (solo oggi o anche dalla
scheda) · il **nome** del profilo si cambia da "I miei dati" (si entra col nuovo) · lo
**username** cambiato si vede subito (prima la conferma diceva quello vecchio).
⚠️ Provato nei banchi (§3) e con le prove in Node, **non sul telefono** né contro il database
vero. Da guardare lì: il pizzico nello zoom, e la coda con la rete che va e viene. Nessuna
modifica a `schema.sql`.

La 30ª (su `main` dal 2026-09-29), da ricordare: card del recap a blocchi (`lib/recapLayout`) ·
i link delle mail funzionano (`lib/linkEmail`). ⚠️ La **conferma dell'email è pronta ma
spenta**: prima Site URL, Redirect URLs e template in Supabase (i passi in docs/storico.md,
30ª), solo dopo **Providers → Email → Confirm email** su ON.

**In corso: renderla pubblica.** Titolare del trattamento: **Filippo Del Rosso** (Pisa). Comprato
un dominio proprio, da collegare a Vercel al posto di `palestra-bice.vercel.app` (poi Site URL e
Redirect URLs su Supabase). Da fare: informativa privacy e termini, consensi alla registrazione
(anche quello a parte per i dati sulla salute), "scarica i miei dati", "segnala", indirizzo per
contatti e reclami. ✅ Mail dal dominio (SMTP) fatte il 2026-09-29; la conferma è da accendere
(vedi sopra).

⚠️ Ancora non provati da nessuno: l'import di un PDF vero di una nutrizionista, la
sincronizzazione fra due dispositivi. L'import da testo non riconosce le superserie.

---

**Tornata 30ª** (spostata qui da context.md il 2026-09-29, com'era scritta lì):

Ultimo aggiornamento: 2026-09-29 (30ª tornata), portata su `main` da `pippo` lo stesso giorno.
Le tornate prima stanno in [docs/storico.md](docs/storico.md).

**La card del recap è a blocchi.** "Modifica" sopra l'anteprima: ogni pezzo (data, titolo,
tessere, conteggi, battito, muscoli, sforzo, record, esercizi, commento) si spegne o si sposta con
↑ ↓, più tre opzioni (pallini, schema degli esercizi, firma). Il layout si salva sull'allenamento
(`Completamento.recap`) e viaggia col recap mandato agli amici; null = la card di sempre
(`lib/recapLayout`, §4). **Dal calendario** "Apri il recap da condividere" apre la stessa card,
e c'è il tasto **WhatsApp** (foglio di condivisione dal telefono; dal computer scarica l'immagine
e apre WhatsApp col testo). ⚠️ Provato nel banco `scratchpad/prova-recap.html` (§3), non sul
telefono.

**I link delle mail funzionano: conferma dell'email e recupero password.** Il recupero NON
funzionava da sempre: `detectSessionInUrl: false` (per non litigare col router a hash) faceva
ignorare il token del link, e chi cliccava finiva sul Benvenuto. Ora il link lo legge a mano
`lib/linkEmail` all'avvio (sia `?token_hash=…&type=…` sia il vecchio `#access_token=…`), e
l'app mostra `NuovaPassword` (si sceglie la password, poi si entra) o `ConfermaEmail`
("Email confermata" → Entra; link scaduto → le strade giuste). **La conferma dell'email alla
registrazione è pronta ma SPENTA**: dopo "Crea account" c'è "Controlla la posta", che fa entrare
da solo quando si torna sull'app e rimanda il link; scheda d'esempio e richiesta al PT non si
fanno più in `creaUtente` ma al **primo accesso** (`accogli` in AccountContext, col segnale
`benvenuto_da_fare` nei metadati), così la strada è una sola con la conferma accesa o spenta.
Le mail partono da **noreply@progettopalestra.it** (SMTP di Register.it,
`authsmtp.securemail.pro`:465; SPF, DKIM e DMARC dal pannello Register.it), con template in
italiano col logo. ⚠️ Provati a schermo solo i link finti e scaduti; il giro vero (mail → link →
password nuova / conferma) no, perché passa da mail vere e dal database di produzione.
**Da fare in Supabase**, in quest'ordine: Site URL `https://progettopalestra.it` (senza `/`) e
tra i Redirect URLs anche `http://localhost:5173` · nei template il link
`{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery` (reset) e `…&type=email`
(conferma) · solo allora **Providers → Email → Confirm email** su ON.

La 29ª (su `main` dal 2026-09-26), da ricordare: "Ripeti allenamento" in una scheda **aggiunge**
un completamento con la stessa coppia settimana+giornoId, non sostituisce più il primo
(`completamentoDi` dà l'ultimo; "Annulla" toglie una volta sola) · "Correggi l'allenamento"
cambia anche carico e pallini.

---

**Tornate 23ª–29ª** (spostate qui da context.md il 2026-09-29, com'erano scritte lì):

Ultimo aggiornamento: 2026-09-26 (29ª tornata), portata su `main` da `pippo` lo stesso giorno.
**"Ripeti allenamento" non cancella più la volta prima.** Rifare un giorno di una scheda già fatto
in settimana riusa la stessa coppia settimana+giornoId, e `terminaSessione` toglieva ogni
completamento di quella coppia: un "Ripeti" chiuso a metà sostituiva l'allenamento completo. Ora
toglie solo il "fatto" segnato a mano (senza `esercizi`); le volte vere restano e la nuova si
aggiunge. `completamentoDi` dà l'**ultima**. Nell'anteprima del giorno, se è stato fatto più volte,
c'è l'elenco "Fatto N volte" con un **"Annulla" per ognuna** (per `data`, foto comprese); con una
volta sola resta "Annulla completamento". **"Correggi l'allenamento"** nel recap del calendario
cambia anche **carico e pallini** di ogni esercizio (un tocco gira vuoto → facile → medio → duro),
non più solo giorno, ora, durata e nota: nomi, numero di serie e superserie restano quelli
registrati (§4). ⚠️ Provato con test e build, non a schermo.

Prima, la 28ª tornata (portata su `main` il 2026-09-25):
**Costruendo o modificando un allenamento gli esercizi sono card affiancate**, come durante
l'allenamento: una "finestra" per esercizio, si scorrono di lato con ‹ Prec / Succ ›, e una
superserie è una card sola. **L'ordine si cambia** dalla card (‹ ›, si sposta la card intera,
superserie compresa) o dall'elenco **Ordine** sotto la pista (1, 2A, 2B, 3…: un tocco ci va, le
frecce spostano); dentro una superserie ↑↓ cambiano chi va per primo nel giro. Vale nei tre posti
che usano `GiornoEditor`: l'editor della scheda, "Modifica esercizi" di un giorno e il "+" del
calendario (§4). ⚠️ Provato nel banco con la pagina vera di "Modifica esercizi"; l'editor completo
della scheda e il "+" usano lo stesso componente ma non sono stati guardati a schermo.

Prima ancora, la 27ª tornata (portata su `main` il 2026-09-25 dopo che Filippo l'ha provata):

**La pagina Amici si rifà**, ed è dove finisce quello che prima stava sparso:
- **In alto a destra un tasto con il numero degli amici** apre la loro lista (in ordine
  alfabetico, col fumetto per scrivere); in pagina restano il codice amico **in cima**, le
  richieste da accettare, le **chat in un riquadro compatto** (le 4 più recenti, poi "Vedi
  tutte"), "Ricevuti e inviati" e, in fondo, la ricerca. "Togli dagli amici" non è più una X su
  ogni riga: sta nel profilo dell'amico, con `TastoConferma` (§5).
- **"Condivisi" non è più una pagina**: ricevuti e inviati stanno dentro Amici
  (`components/Scambiati`), e nel profilo di un amico solo quelli scambiati con lui. `#/condivisi`
  porta ad Amici. **Si manda da Amici**: "Manda" nel profilo di un amico e il "+" nella chat
  (`components/MandaAdAmico`) — una scheda, un allenamento fatto, una foto o un video.
- **Ogni cosa ricevuta si salva sul dispositivo** (`lib/esporta`): la scheda come Excel,
  allenamento e recap come immagine, foto e video dal visore mentre li si guarda. ⚠️ Cambia la
  promessa degli effimeri: chi guarda può tenerli, e chi manda lo legge prima di mandare (§7).
- **Chat: cancellare chiede conferma**, e si sceglie **"per me"** (all'altro resta) o **"per
  tutti"** (solo sui propri). "Per me" vive in una tabella nuova, `messaggi_nascosti`: ✅
  `schema.sql` **lanciato il 2026-09-25**, solo additivo (§2).

**Le superserie (jumpset)**: nella scheda restano due esercizi separati, ognuno col suo schema
(serie, ripetizioni, carico), legati dall'interruttore "Superserie con <quello prima>"
nell'editor (dalla 28ª a card affiancate, vedi sopra). In allenamento diventano **una card sola**
coi pallini di ciascuno, e i tasti dello sforzo seguono il giro — A1 → B1 → A2 → B2 — con
"Poi subito B, senza recuperare" / "Poi recupero 1,30min"; il timer prende il recupero di **fine
giro**. Si vedono anche nell'anteprima del giorno, nel riepilogo e nell'Excel (`lib/superserie`,
§4 e §6). ⚠️ **L'import da testo NON le riconosce ancora**: il testo vero del giorno C non si è
potuto leggere, e insegnare al parser una forma tirata a indovinare è peggio che niente. Una
scheda già importata si sistema dall'editor.

Trovati provando, e sistemati: **"Modifica esercizi" dall'anteprima di un giorno mandava la
pagina in errore** (schermo nero) — leggeva `scheda.id` dove `scheda` non esiste; su `main` dal
2026-09-10 · **la pista dell'allenamento a volte tornava indietro** passando all'ultima card o a
fine esercizio: aspettava 600ms fissi lo scorrimento, ora aspetta che arrivi (tetto 2,5s) · la
matita di un esercizio dal nome corto non stava a destra.

Poi, per tutta l'app: **i colori si scelgono** — sfondo e colore dei tasti, dal menu
"Funzionalità", per dispositivo; il default è **nero e celeste per tutti** (prima si seguiva il
tema del telefono, §5) · la **barra in basso è una pillola** che galleggia staccata dai bordi,
come quella di Instagram, e sta **sotto** i modali (prima li copriva, e copriva anche il "+" di
Home e Dieta e le barre d'azione) · **l'icona del manubrio** (linguetta Allenamenti e liste) è
ridisegnata in orizzontale, come nel logo.

⚠️ **Il nome e l'icona sulla Home dell'iPhone** sono già "ProgettoPalestra1.0" e il logo dal
22/09, ma iOS li legge **una volta sola**, quando si fa "Aggiungi alla schermata Home": chi l'ha
aggiunta prima vede ancora "Palestra" e l'icona vecchia, e deve toglierla e rimetterla (§1).

⚠️ **Niente della 27ª è stato visto dentro l'app loggata**: il login passa da Supabase vero.
Provati con 222 prove (223 dalla 28ª), e a schermo con copie montate sopra la schermata di benvenuto (barra,
elenco chat, pannello dei colori, file esportati). Le superserie invece sono state provate con
le pagine VERE (scheda, editor, allenamento, riepilogo) nel banco
`scratchpad/prova-superserie.html`, con uno store finto (§3). Da guardare sul telefono prima di
dirlo fatto.

Prima, la 26ª tornata, tre ritocchi nati usando la 25ª:
**un allenamento già svolto si corregge** — giorno, ora di fine e durata, dal recap del
calendario; oltre le 4 ore il modulo si apre da solo, perché è il caso "Termina premuto il giorno
dopo" (§5). ⚠️ La data è l'identità dell'allenamento e la chiave delle sue foto: se cambia, le
foto si spostano con lui (`spostaFotoAllenamento`). · **Nel feed la scheda elenca gli
esercizi**, con un pallino per serie: senza, sembrava vuota. · **Un esercizio lavora più
gruppi** (i dip sono petto E tricipiti), e **all'import si dice quali**: un passaggio
obbligatorio prima di salvare, con l'ipotesi dal nome segnata "da controllare" (§6).

Prima, la 25ª tornata: **l'app cambia struttura.** In fondo c'è una
**barra con quattro linguette** — casa, allenamenti, amici, cerca — e le sezioni smettono di
stare dietro un menu a tendina che bisognava sapere che c'era. Dal menu a tre pallini se ne
vanno "Amici" e "Storico Allenamenti", che adesso sono linguette (§5).

Il **Feed** non è più una lista di righe da aprire: è uno scorrimento di **schede di recap**
vere, col corpo e i muscoli accesi, filtrabili per gruppo, durata ed esercizio, con la scelta
fra tutti e amici. Ci sono anche gli allenamenti **segnati a mano**, se pubblici. Ogni scheda
si **sfoglia di lato**: recap, poi le foto di quella giornata, e sui propri la pagina per
aggiungerne (§5, §6).

**Chat** fra amici, solo testo e in tempo reale — le foto fra amici restano gli effimeri, che
scadono. E l'**username**: si cerca a pezzi, il nome no (§6, §7).

⚠️ `schema.sql` è stato rilanciato: `allenamento_foto`, `messaggi` e la colonna `username`
sono **applicati e verificati sul database** (§2).

Prima, la 24ª tornata: la sezione **Foto**, il check del fisico
periodico. Si sceglie il giorno, si carica, e gli scatti si raggruppano per data. Ogni scatto
nasce **privato** e si apre al proprio PT **uno per uno**, col lucchetto sulla miniatura: qui più
che altrove si può voler mostrare il check di marzo e non quello di agosto. Per il PT, **"Foto
Atleti"** dentro Lavoro — una cartella per atleta, con dentro solo ciò che quell'atleta gli ha
aperto; può aggiungere scatti suoi, che nascono già visibili a lui, ma il padrone resta l'atleta,
che li nasconde e li cancella (§5, §6). ⚠️ `schema.sql` è stato rilanciato: bucket e tabella
`progressi` sono **applicati e verificati sul database** (§2).

⚠️ Insieme, un baco che c'era da mesi: **i file degli allegati non salivano**. Lo Storage
rifiutava ogni caricamento fatto con `upsert: true` — quel flag chiede un insert-or-update su
`storage.objects`, che pretende una policy di UPDATE che nessun bucket ha — e il rifiuto parlava
di righe mentre il problema era il file. Restava la copia locale, quindi sul telefono di chi
caricava sembrava tutto a posto. Ora il file si manda senza upsert e "percorso già occupato" vale
come riuscito: `caricaFile()` in `lib/media.js`, un posto solo per tutti i bucket.

Prima, la 23ª tornata (tre lavori committati lo stesso giorno):
**un esercizio in più durante l'allenamento** senza toccare la scheda del PT · **"Termina" si
può disfare** (si rientra nell'allenamento com'era, §5) · la **dieta giornaliera col diario**:
si scrive cosa si è mangiato, i macro li conta l'app e i pasti che restano si riadattano su
quelli che avanzano (§5). ⚠️ Per il diario `schema.sql` è stato rilanciato, ed è già applicato
e verificato sul database (§2).

Subito dopo, **il diario alla Lifesum**: si cerca un prodotto per nome o **col codice a barre**
e i valori compaiono dentro l'app; quello che si trova **resta** fra "i miei cibi" e la volta
dopo si riconosce senza rete; il catalogo è passato da 64 a **159 alimenti**; e quando si sfora
l'obiettivo **il pasto resta un pasto** — si alleggerisce fin dove ha senso e lo sforamento si
dice, invece di proporre 30g di pasta a cena (§5).

Poi **la quantità detta come viene**: accanto al numero c'è l'unità (g, ml, pezzi, cucchiai),
perché dopo aver inquadrato un pacco di biscotti nessuno sa dire "sedici grammi" — sa dire "due
biscotti". Quanto pesa un pezzo, se non si sa, si chiede una volta sola e si ricorda (§5).

⚠️ **Provato fin dove si poteva.** I conti hanno 43 prove in `tests/diario.test.js`, diciotto
schermate si disegnano davvero in `scratchpad/prova-dieta.mjs`, e il pannello "cosa hai
mangiato" si tocca con le dita in `scratchpad/prova-quantita.html`. **Sul telefono vero** il
diario e **lo scanner del codice a barre** sono stati provati e funzionano (22/09/2026).
Restano non provati da nessuno: **l'import di un PDF vero** di una nutrizionista e la
**sincronizzazione fra due dispositivi**. Non darli per funzionanti finché qualcuno non li ha
visti funzionare.

---

**Ultima tornata (2026-09-18, 22ª) — LE VISTE 3D ANCHE PER GAMBE E SPALLE.**

L'utente ha chiesto di fare per gambe e spalle quello che Nico aveva fatto per petto e schiena,
"in modo da essere più accurate nei movimenti". Sono 31 esercizi: tutti i 18 delle gambe e i 13
delle spalle del catalogo hanno il badge **3D**.

**Stesso impianto di Nico**: catalogo leggero per il badge, scena caricata in `lazy`, visore
condiviso (`VisoreEsercizio3D` non è stato toccato). In `EserciziPage` il doppio `if` petto/schiena
è diventato una tabella per gruppo (`VISTE_3D`).

**Cosa c'è di nuovo sotto.** Un manichino con i **muscoli degli arti** (quadricipiti, femorali,
glutei, polpacci, adduttori, medio gluteo, i tre capi del deltoide, trapezio): i principali si
accendono in rosso, quelli che aiutano in rosa. Poi una cinematica in cui il movimento nasce dai
**vincoli dell'esercizio**, non da una sagoma che oscilla:
- i piedi a terra non scivolano, e le ginocchia si trovano da sole tra anca e caviglia;
- nello squat il bilanciere resta sopra il centro del piede, e per questo il frontale tiene il
  busto più dritto del back squat senza che nessuno glielo dica;
- sulle macchine gira la leva attorno al ginocchio (leg extension, leg curl) o al suo perno
  (shoulder press), e il pacco pesi sale con lei;
- nelle spinte coi manubri l'avambraccio resta verticale e i manubri si avvicinano solo in cima;
- nelle alzate posteriori, nel face pull e nel reverse pec deck le scapole si stringono.

⚠️ **Le ossa non si stirano**: se una posa chiede a un arto di arrivare dove non arriva,
`articolazione` lancia un errore invece di allungarlo. È così che si è trovato lo step up in cui la
gamba dietro restava a terra mentre il corpo era già salito.

**Trovati guardando, non leggendo il codice:**
- la maniglia della shoulder press faceva il giro dalla parte sbagliata: l'angolo della leva
  passava per ±180° e l'interpolazione tagliava dall'altra parte. Ora si misura dal davanti;
- nelle spinte coi manubri gli avambracci si piegavano di 40° a metà corsa, perché le mani
  convergevano presto. Ora il braccio si costruisce dagli angoli: l'avambraccio è verticale per
  costruzione;
- il reverse pec deck aveva uno schienale dietro la schiena, ma su quella macchina ci si siede al
  contrario, col petto sul cuscino;
- i montanti davanti del rack coprivano lo squat: ora è un mezzo rack coi bracci di sicurezza;
- nell'Arnold press i due manubri, in partenza, si compenetravano davanti al viso.

**Provato:** `npm test` → **88 prove**, tutte verdi: le 42 di Nico più 46 nuove (ossa rigide fase
per fase, piedi che non scivolano, niente sotto il pavimento, bilanciere dello squat sopra il
piede, bilanciere del lento avanti che non attraversa la testa, leve che non si allungano, muscoli
giusti accesi). Ogni scena guardata a occhio a inizio e fine ripetizione, e il componente vero
(rotazione, pausa, didascalia) montato da solo nel browser. Build: le due viste sono pezzi a parte
di 15 e 9 KB, Three.js resta fuori dal precache.

⚠️ **Non provato**: dentro la pagina Esercizi con un account (chiede il login, e la password non
la inserisce Claude) e sul telefono. E **non è pubblicato**: niente commit né push.

⚠️ **Un limite che resta**: il manichino ha il busto lungo e le braccia corte rispetto a una
persona. Negli stacchi (gambe tese, sumo) per portare il bilanciere in basso l'anca deve andare più
indietro del vero, e nello stacco a gambe tese il bilanciere si ferma sotto il ginocchio. È la
proporzione del modello di Nico: cambiarla vorrebbe dire rifare anche petto e schiena.

---

**(2026-09-11, 21ª) — IL CORPO DEL RECAP RIFATTO, CANCELLARE UN ALLENAMENTO, E
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

---

## Spostato da context.md quando è stato accorciato (2026-10-07)

Cronaca e verifiche datate che stavano in context.md, com'erano scritte. Lì resta quello che serve
per lavorare; qui il racconto.

**Le verifiche sul database (da §2, "Stato in una riga"):**

⚠️ **Provato fin dove si poteva**: tappe 1 e 2 e le tre viste "di tutti", con account veri.
✅ **Media, effimeri e Foto provati contro il database vero il 2026-09-22**: file caricato, riga
scritta, rilettura col link firmato, cancellazione che toglie riga **e** file. Fino a quel giorno i
media degli esercizi non erano MAI saliti, per il baco dell'`upsert` (in `lib/media.js`, racconto in docs/storico.md, 24ª): è il tipo
di guasto che non si vede provando l'app da un telefono solo, perché la copia locale copre tutto.
✅ **Chat e ricerca provate contro il database il 2026-09-23**: un messaggio a un amico passa, a un
non amico lo rifiuta la regola, un estraneo non vede la conversazione, e la chiave di
conversazione calcolata dall'app combacia con quella generata dal database.
⚠️ **NIENTE DELLA 25ª TORNATA È STATO VISTO A SCHERMO.** Barra, feed, schede sfogliabili, chat e
username sono verificati al livello del database e con l'harness `scratchpad/prova-feed.mjs`, che
monta la scheda di recap e guarda cosa finisce nell'HTML. Il colpo d'occhio, le proporzioni delle
foto, lo **scorrimento col dito** e il **tempo reale della chat** (che si vede solo con due
sessioni aperte) non li ha ancora guardati nessuno.
⚠️ Resta non provato il **lato PT delle Foto**: nel database non esiste ancora nessun profilo PT,
quindi le cartelle, il "vede solo ciò che gli è stato aperto" e il caricamento fatto dal PT sono
codice e regole che reggono sulla carta e nient'altro. Resta non provato anche il ramo **video**.
⚠️ **Ogni volta che [supabase/schema.sql](supabase/schema.sql) cambia va rilanciato** — è
idempotente, si rilancia intero: `npm run db -- --file supabase/schema.sql` (o copia-incolla nel
SQL Editor). Senza, le funzioni nuove non esistono e le viste che ci stanno sopra restano vuote —
e, peggio, le regole di visibilità restano quelle vecchie mentre l'app crede siano cambiate.
✅ **Applicato per intero e verificato il 2026-09-10**: 6 funzioni su 6, i 2 bucket, 10 regole sui
file, e `allenamenti_visibili` con il default "nascosto". ⚠️ Fino a quel momento il database aveva
ancora la regola vecchia (campo assente = pubblico) mentre il codice diceva il contrario: un
allenamento finito senza toccare il selettore sarebbe stato pubblicato a tutti. È il tipo di
disallineamento che non si vede provando l'app — si vede solo chiedendolo al database.
⚠️ **I file di Storage non si cancellano da SQL**: Supabase lo vieta con un trigger, e la Storage
API è l'unica strada (vedi §7 e `lib/effimeri.js`).
⚠️ **Dal 2026-09-18 `schema.sql` ha in più**: l'indice `profili_nome_unico` + `nome_disponibile`
(nome unico) e `email_per_accesso` + la tabella `tentativi_accesso` (entrare col nome).
⚠️ **Dal 2026-09-24 ha in più la tabella `messaggi_nascosti`** ("cancella solo per me" nella
chat) e `conversazioni()` / `messaggi_non_letti()` che la guardano. Solo additivo: niente
rinominato né tolto. ✅ **Applicato il 2026-09-25**, col certificato (`PGSSLROOTCERT`): il file è
passato intero e `messaggi_nascosti` risponde (0 righe). ⚠️ Lanciarlo da PowerShell vuol dire
due righe — `$env:PGSSLROOTCERT = "…"` e poi `npm run db -- --file …` —: la forma
`PGSSLROOTCERT=… npm run db` è di bash, e PowerShell la rifiuta senza toccare niente.
⚠️ **Dal 2026-09-21 ha in più la tabella `diario`** (il diario alimentare) e la sua regola RLS.
✅ **Applicata e verificata il 2026-09-21**, e stavolta **col certificato** (`PGSSLROOTCERT`, senza
`PGSSL_INSECURE`): tabella `diario` con le sue 4 colonne, RLS accesa, regola "diario: solo il mio"
= `auth.uid() = user_id`. Ricontrollato che il rilancio non avesse rotto nient'altro: 11 tabelle,
18 funzioni, i 2 bucket. ⚠️ Se un domani ci si dimentica di rilanciarlo, il diario non si spegne —
resta su un telefono solo, perché la lettura dal server fallisce in silenzio come per ogni
collezione irraggiungibile e la copia locale fa il resto. È il caso peggiore, quello in cui
"sembra che funzioni": l'unico modo di accorgersene è aprire l'app su un secondo dispositivo.
✅ **Applicato e verificato il 2026-09-18** (con `PGSSL_INSECURE=1`, autorizzato dall'utente): nome
doppio rifiutato anche con maiuscole/spazi diversi, password sbagliata → "no", l'11° tentativo →
"troppi", tabella dei tentativi illeggibile da fuori, le due funzioni raggiungibili con la chiave
pubblica. Le password su `auth.users` sono bcrypt, che `extensions.crypt` legge. ⚠️ Se un giorno
ci fossero di nuovo due nomi uguali, il file si ferma e li elenca: se ne rinomina uno (a mano,
dicendoglielo) e si rilancia.

**`claude` e il login MCP su questa macchina (da §3):**

⚠️ **Su questa macchina `claude` NON è nel PATH**: l'app desktop si porta dietro il CLI ma non lo
espone, quindi il comando qui sopra "non viene riconosciuto". Sta in
`%APPDATA%\Claude\claude-code\<versione>\claude.exe`, e il numero di versione cambia a ogni
aggiornamento — questa riga PowerShell prende sempre l'ultima:

```powershell
& (Get-ChildItem "$env:APPDATA\Claude\claude-code\*\claude.exe" |
   Sort-Object { [version]$_.Directory.Name } -Descending |
   Select-Object -First 1).FullName mcp login supabase
```

⚠️ Su questa macchina, il 2026-09-10, **nemmeno col percorso pieno il comando è partito** dal
terminale dell'utente (`CommandNotFoundException` su un file che esiste, non è bloccato e da
un'altra shell si avvia). Non si è capito perché, e non si è indagato oltre: l'autorizzazione MCP
è comoda ma **facoltativa**, e non vale la pena spenderci tempo mentre c'è altro da fare. Le
domande sul database si continuano a fare con una query nel SQL Editor.

**Senza rete (da §7, regole):**

- **Senza rete l'app si apre lo stesso, e non si perde niente.** Il profilo arriva dalla copia
  locale (`profiloInCache`), le schede dalla copia locale, le modifiche si accodano (`lib/sync`) e
  partono da sole al ritorno della rete. La striscia gialla lo dice, perche' chi si allena deve
  sapere che quello che scrive e' ancora solo sul telefono. ⚠️ Al **primo** accesso su un telefono
  serve la rete: senza copia locale non si sa chi sei, e non ci si inventa un profilo.
  ⚠️ Fino all'11-09-2026 questo NON funzionava: `salvaProfiloInCache` e `profiloInCache` erano
  chiamate in 6 punti e definite in nessuno, quindi la copia non veniva mai scritta e la riga del
  ripiego era essa stessa un errore — senza rete si finiva al "Benvenuto", chiusi fuori dai propri
  allenamenti che erano li' sul telefono.
