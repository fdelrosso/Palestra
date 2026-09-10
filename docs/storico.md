# Palestra — Storico delle tornate

> Cosa è stato fatto, quando e **perché**. Non serve per capire dove mettere le mani:
> per quello basta [context.md](../context.md). Serve quando una scelta sembra strana e
> vuoi sapere contro cosa è stata presa — quasi sempre contro un problema vero.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

**Ultima tornata (2026-09-10, 17ª) — IL CLOUD: telefono e PC si parlano.**

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

**Cosa NON è ancora fatto:** foto e video su Storage (tappa 3), la master password da togliere, e
`storico`/`schedeGenerali`/`comunita` che leggono ancora il localStorage. Elenco completo e ordinato
in [roadmap.md](roadmap.md).

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

