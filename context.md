# Palestra — Contesto del progetto

> **Leggi questo per capire dove mettere le mani.** È corto apposta: cos'è l'app, come si
> avvia, la mappa dei file, il modello dati e le rotte. Nella grande maggioranza dei casi
> basta questo.
>
> **Se da qui non capisci dove intervenire — o *perché* una cosa è fatta così — allora sei
> costretto ad aprire uno di questi, ma solo allora:**
>
> | file | quando aprirlo |
> |---|---|
> | [docs/decisioni.md](docs/decisioni.md) | prima di cambiare un comportamento che ti sembra sbagliato: quasi sempre è voluto, e lì c'è scritto contro cosa |
> | [docs/storico.md](docs/storico.md) | cosa è stato fatto nelle 16 tornate e contro quale problema vero |
> | [docs/roadmap.md](docs/roadmap.md) | cosa viene dopo, e cosa è già stato deciso di non fare adesso |
> | [docs/risposte-utente.md](docs/risposte-utente.md) | l'utente ha già chiesto qualcosa di simile: la risposta deve tornare **uguale** |
>
> Ultimo aggiornamento: 2026-09-10 (fase 2b: cloud Supabase, tappe 1 e 2).

---

## 1. Cos'è

App per tracciare gli allenamenti in palestra, **multi-profilo** (l'utente la fa usare anche agli
amici, ognuno con profilo protetto da password). Il proprietario ha un personal trainer che gli manda
le schede via **messaggio WhatsApp**, da cui l'import da testo.

- **PWA installabile** su iPhone (Safari → "Aggiungi alla schermata Home"), funziona anche su PC.
  Niente App Store.
- All'apertura si vede **"Benvenuto"** con "Accedi" / "Crea un account": l'elenco dei profili del
  dispositivo **non si mostra più** (§7).
- Pagina iniziale = **Calendario**. "Le mie schede" e le altre sezioni stanno nei menu.
- Persistenza: su `main` **localStorage** (per dispositivo); sul ramo `cloud-supabase`
  **Supabase**, con la copia locale che serve a partire subito e a funzionare senza rete.

---

## 2. Stato in una riga

**Online:** https://palestra-bice.vercel.app — repo privato `github.com/fdelrosso/Palestra`,
ogni `git push` su `main` ripubblica da solo in un minuto.

⚠️ **Il cloud sta sul ramo `cloud-supabase`, NON ancora su `main`.** Su `main` gira la versione
con i dati per dispositivo; sul ramo ci sono account veri su Supabase, dati sincronizzati e
amicizie che funzionano tra telefoni diversi. Tappe 1 e 2 fatte e provate, **tappa 3 (foto e
video) e alcune riscritture da fare** prima di unire — vedi [docs/roadmap.md](docs/roadmap.md).

Fatto: account con password · import da testo (parser WhatsApp) · sessione guidata con timer e
pallini di sforzo · calendario come home · storico globale · schede generali · commenti/foto/video
sugli esercizi con visibilità · dieta (piani, giornate tipo, import da PDF, preferenze alimentari) ·
consiglio sul carico · recap condivisibile su canvas · icone PWA · account PT con codice · amicizie ·
disegno del corpo col muscolo acceso e animazione di ogni esercizio · condivisioni e foto/video
momentanei tra amici · **allenamento consigliato e schede prefatte da un motore vero, che tiene
conto di obiettivo, focus e livello di esperienza**.

L'ultima cosa fatta e il perché: [docs/storico.md](docs/storico.md).

**Supabase** (sul ramo `cloud-supabase`): progetto `nmnsdyutsjrxcvjvwvog`, schema e regole di
accesso in [supabase/schema.sql](supabase/schema.sql) — è idempotente, si rilancia intero nel SQL
Editor a ogni modifica. La chiave nel codice è quella **pubblica**, ed è giusto così: a proteggere
i dati sono le regole nel database, non il segreto della chiave.

---

## 3. Stack e avvio

**React 19 + Vite 8** + `vite-plugin-pwa`. Nessuna libreria di routing/stato (fatti a mano).
Cartella: `C:\Users\lucon\Desktop\Palestra`. Node 24, npm 11. Lint: `oxlint` (4 warning preesistenti).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

⚠️ **Gotcha dev:** dopo modifiche il browser può servire moduli in cache. Se vedi comportamenti
"vecchi": hard reload e/o riavvia il dev server. Stessa cosa per l'errore HMR "Identifier … already
declared" quando sposti un componente in un altro file.

---

## 4. Mappa dei file (`src/`)

Navigazione via **hash routing** fatto a mano, così funziona su hosting statico.

```
main.jsx / App.jsx        AccountProvider → se nessun profilo attivo <UserGate/>, altrimenti
                          <StoreProvider key={userId}/> + AppShell (route.name → pagina).
index.css                 TUTTO lo stile (design system, tema scuro+chiaro, mobile-first).

store/AccountContext.jsx  Profili: creaUtente/accedi/cambiaUtente/eliminaUtente + PT (associaPt,
                          diventaPt) + amicizie + condivisioni + invii momentanei.
                          Utente attivo NON persistito.
store/StoreContext.jsx    Dati del profilo attivo: schede, diete, preferenze alimentari, sessione.
                          Sul ramo cloud: legge dalla copia locale (subito), poi dal server
                          (che ha l'ultima parola), e scrive in locale + su. ⚠️ Le
                          `istantanea*` non sono un'ottimizzazione: senza, i dati appena
                          arrivati dal server verrebbero rispediti al server.

data/model.js             Fabbriche + JSDoc dei tipi, schemaPerSettimana(), GIORNI_SETTIMANA.
data/seed.js              La scheda REALE del PT come esempio.

-- il motore dei consigli (il cuore della roba recente) --
lib/muscoli.js            GRUPPI (id+label+colore+vista/dueViste per il disegno del corpo).
                          Il colore va alla UI via CSS var `--g`.
lib/eserciziLibreria.js   Catalogo per gruppo + gruppoDaNome() (deduce il gruppo dal nome).
                          ⚠️ cerca SOTTOSTRINGHE: una chiave corta pesca dentro altre parole
                          ("chin" stava dentro "maCHINe"). Nomi inequivocabili prima dei generici.
lib/programmazione.js     COME si allena: tipoEsercizio (fondamentale/composto/isolamento/core/
                          cardio), PRESCRIZIONI[modo][tipo], VOLUME_GRUPPO, famigliaEsercizio,
                          quoteEsercizi (quanti esercizi stanno nella durata), ordinaSeduta,
                          modoDaStile. volumeGruppo(gruppo, focus, livello) e
                          prescrizione(modo, tipo, livello) applicano focus e livello.
lib/livello.js            CON COSA e QUANTO si può lavorare: LIVELLI (label+descrizione+effetto),
                          difficoltaEsercizio() (base/medio/avanzato, l'ATTREZZO batte il
                          movimento), regoleLivello() (null = nessun limite), livelloAmmette(),
                          giorniPerLivello(), spiegazioneLivello(). Commento lungo in testa.
                          ⚠️ importa FONDAMENTALI da programmazione, non il contrario: le regole
                          viaggiano come NUMERI, così programmazione non deve importare questo file.
lib/focus.js              DOVE va il lavoro in più: FOCUS (le voci proposte), focusSuMisura(),
                          risolviFocus(), boostGruppo/gruppiFocus/etichettaFocus,
                          maxStessaFamiglia(), gruppiConFocus() (in quali giornate infilare il
                          muscolo). Vedi il commento in testa al file.
lib/consiglio.js          Motore: analizzaStorico(schede), splitConsigliato, gruppiConsigliati,
                          candidatiGruppo (classifica: personale ×3 + tuo PT ×2,5 / PT famosi ×0,5
                          + comunità ×2 + catalogo ×1, normalizzati 0..1), stileEffettivo,
                          generaAllenamento({gruppi,durataMin,analisi,comunita,pt,modo,focus,
                          livello,evita}).
lib/schedePrefatte.js     OBIETTIVI (forza/massa/dimagrimento/tonificazione) + SPLIT (le strutture
                          per numero di giorni) + gruppiPerGiorno() +
                          splitPerGiorni(giorni, obiettivo, livello) +
                          generaSchedaPrefatta({...,livello}).
lib/comunita.js           popolaritaEsercizi() (cosa fanno gli altri) e influenzaPt() (cosa dà il
                          tuo PT agli altri suoi atleti). È ciò che regge i consigli senza storico.
lib/carico.js             Consiglio sul peso dai pallini: storicoCarichi, consiglioCarico
                          (sali/tieni/scendi + caricoSuggerito), GUIDA_CARICO se non sappiamo nulla.

-- far vedere gli esercizi (14ª-15ª tornata) --
lib/corpoForme.js         Le FORME del corpo (sagoma + muscoli per gruppo e per vista) come path
                          SVG: le usano CorpoMuscoli, CorpoAllenato e la canvas del recap
                          (`new Path2D`). Anche rossoMuscolo() (il rosso per quota di serie).
lib/figura.js             Il manichino: MISURE, ik() (cinematica inversa), normalizza(), punti(),
                          fotogrammi(a,b,n), serie*() (i `values` per SMIL), riquadro() (il ritaglio
                          stretto per le miniature). Solo geometria, niente JSX.
lib/animazioniEsercizi.js MOVIMENTI (~80: pose a/b, attrezzo, scena, tecnica) + la mappa
                          nome esercizio -> movimento + RISERVA per gruppo + movimentoDi().

-- il resto --
-- amici: cosa ci si manda --
lib/condivisioni.js       Schede/allenamenti/recap mandati a un amico: copia congelata, tipi,
                          liste ricevute/inviate, copiaSchedaRicevuta().
lib/effimeri.js           Foto e video momentanei: riga in localStorage, blob in IndexedDB,
                          creaEffimero/consumaEffimero/pulisciScaduti. ORE_SCADENZA=24.

-- dieta: da fuori e su misura --
lib/alimenti.js           Catalogo (macro + densità `per` + tag) · ESCLUSIONI e REGIMI ·
                          alternativaPer() · adattaTestoPasto()/adattaPiano(): sostituisce gli
                          alimenti vietati tenendo i macro. Vedi il commento in testa.
lib/preferenzeCibo.js     Il modello delle preferenze del profilo + riassuntoPreferenze().
lib/parserDieta.js        Testo → giornate tipo (titoli, pasti, kcal/macro).
lib/pdfTesto.js           PDF → testo senza librerie (DecompressionStream). Best effort: vedi docs/decisioni.md.

-- il cloud (ramo cloud-supabase) --
lib/supabase.js           Il client, la chiave pubblica, messaggioErrore() (errori in italiano) e
                          ⚠️ erroreDiRete(): distingue "il server ha detto no" da "non sono
                          riuscito a parlargli". È la distinzione più importante di tutto il
                          codice di sincronizzazione, e i due casi vanno trattati all'opposto.
lib/sync.js               Coda delle modifiche non partite (localStorage), diff delle collezioni,
                          riprovaCoda(), alRitornoDellaRete(). ⚠️ Niente merge: se modifichi la
                          stessa scheda su due dispositivi, vince l'ultimo che scrive.
lib/social.js             Amicizie, condivisioni e ricerca su Supabase: leggiProfiliCollegati()
                          (il database decide chi torna), cercaPersona() (codice o nome ESATTO),
                          amiciSuggeriti(), accettaRelazione(). profiloDaRiga() è l'UNICA
                          traduzione riga↔profilo: ce n'erano due e sono divergite.

lib/datiFisici.js         Sesso/età/peso/altezza/movimento/obiettivo/LIVELLO del PROFILO + SESSI,
                          MOVIMENTI, OBIETTIVI + metabolismoBasale/mantenimento/kcalConsigliate +
                          datiMancanti() (che cosa non si può calcolare). Commento lungo in testa.
                          ⚠️ `livello` NON sta in datiMancanti(): non serve a calcolare calorie ma
                          al motore, e UserGate lo controlla a parte. Le regole: lib/livello.
lib/utenti.js             Profili su localStorage + chiaviUtente(id) (namespacing) + migrazione.
lib/pt.js                 Ruoli, codice PT, famaPt(). lib/relazioni.js  Amicizie e richieste.
lib/visibilita.js         pubblica / solo-pt / nascosta + visibileA(): l'unica regola di filtro.
lib/storico.js            allenamentiDiUtente(), storicoGlobale() (legge TUTTI i profili del device).
lib/schedeGenerali.js     Come sopra ma per le schede. lib/media.js  Blob in IndexedDB.
lib/dieta.js              calcolaDieta() (BMR da lib/datiFisici) + dietaDaDatiFisici() (la dieta
                          proposta quando non ce n'è una) + periodo/dietaAttiva + FONTE +
                          giornate tipo (giornataDelGiorno/giornatePerTipo) + adattaDieta().
lib/recap.js / recapImmagine.js  Statistiche di fine allenamento + card 1080×1350 su canvas.
lib/parser.js             parseSchedaTesto() (il messaggio del PT). lib/router.js  useRoute/navigate.
lib/session.js · progression.js · format.js · parseRecupero.js · password.js (PBKDF2+salt)

components/               CorpoMuscoli (la sagoma con UN muscolo acceso, col colore del gruppo),
                          CorpoAllenato (davanti+dietro, i gruppi di oggi in rosso: sta nel recap),
                          DatiFisiciForm (sesso/età/peso/altezza/movimento/obiettivo + LIVELLO),
                          EsercizioAnimato (il manichino che esegue l'esercizio),
                          EsercizioCard, GiornoEditor, EsercizioAllegati (commenti+media),
                          ConsiglioCarico, StoricoEsercizio, ModalePeso, RecapCondivisibile,
                          ListaAllenamenti, MenuLaterale, ProfiloMenu, PtPannello, ModoPtSwitch,
                          RichiesteLavoro, VisibilitaPicker, DatiOrologio, icons,
                          CondividiConAmici (il modale "manda a un amico"),
                          InviaMediaEffimero, VisoreEffimero (si apre una volta sola).

pages/                    UserGate ("Benvenuto") · DatiFisiciPage ("I miei dati") ·
                          CalendarPage (home) · HomePage ("Le mie schede") ·
                          SchedaPage · EditorPage · NewSchedaPage · ImportPage · WorkoutSession ·
                          StoricoPage · SchedeGeneraliPage · ConsigliatoPage · SchedePrefattePage ·
                          EserciziPage · AmiciPage · LavoroPage · AtletiPage · CondivisiPage ·
                          Dieta{,Editor,Oggi,Import}Page · PreferenzeCiboPage
```

## 5. Rotte, menu e chiavi

**Rotte:** `#/` calendario (home) · `#/schede` · `#/scheda/:id` · `#/scheda/:id/edit` · `#/crea` ·
`#/nuova` · `#/importa` · `#/allenamento` · `#/storico` · `#/schede-generali` · `#/amici` ·
`#/condivisi` · `#/schede-prefatte` · `#/consigliato` · `#/esercizi[/:gruppo]` · `#/lavoro[/atleti]` ·
`#/dati` · `#/dieta[/oggi|/nuova|/:id|/preferenze|/importa]`. Rotte ignote → calendario.
**Menu laterale** (handle a destra): Allenamento consigliato, Schede prefatte, Esercizi, Amici,
Condivisi, Storico, Schede Generali. **Menu profilo** (avatar in alto a sinistra): **I miei
dati** (peso, obiettivo e **livello**), Le mie schede, Dieta, Condivisi, Personal trainer,
Disconnetti, Elimina profilo. Il pallino rosso su avatar e
handle conta le condivisioni non aperte + le foto/video da guardare.

**Chiavi localStorage.** Globali: `palestra:utenti:v1` · `palestra:storico-archiviato:v1` (storico
dei profili eliminati) · `palestra:relazioni:v1` · `palestra:condivisioni:v1` ·
`palestra:effimeri:v1` (solo i metadati). Per profilo: `palestra:u:<id>:{schede,seed,sessione,
diete,preferenze}:v1`. Le vecchie chiavi globali esistono solo per la migrazione one-shot.
**Media**: NON in localStorage ma in **IndexedDB** (db `palestra-media`), store unico per
dispositivo — ci finiscono anche i blob dei media momentanei, che però si cancellano da soli.

---

## 6. Modello dati

```
Utente { id, nome, email, creatoIl, ruolo:'atleta'|'pt',
         codicePt, codiceAmico, ptId, associatoIl, dati: DatiFisici }
         // ptId si scrive SOLO quando il PT accetta la richiesta, e lo scrive il
         // DATABASE (accetta_relazione): nessuno scrive nella riga di un altro.
         // ⚠️ Sul ramo cloud la password non è più un campo: la tiene Supabase Auth.
         // `utenti` contiene me + le persone a cui sono legato, non tutti.
DatiFisici { sesso:'m'|'f'|'', eta, peso, altezza,    // stringhe: vengono da <input>
             movimento, obiettivo, aggiornatiIl,      // vuoto = non si mostra e non si inventa
             livello:'principiante'|'intermedio'|'avanzato'|'' }  // '' = nessun limite nel motore
Relazione { id, tipo:'amicizia'|'lavoro', daId, aId, stato:'attesa'|'accettata', creataIl, rispostaIl }
         // il RIFIUTO cancella la riga (si può richiedere di nuovo)
Condivisione { id, tipo:'scheda'|'allenamento'|'recap', daId, daNome, aId, titolo, sottotitolo,
               payload, creataIl, vistaIl, salvataIl }
         // payload = COPIA congelata. Per 'recap': { riep, stat, utente, commento }
Effimero { id, daId, daNome, aId, tipo:'foto'|'video', nome, peso, inviatoIl, scadeIl,
           apertoIl, consumato }
         // `id` = chiave del blob in IndexedDB; consumato:true = il blob non c'è più

Scheda { id, nome, nota, numeroSettimane, settimanaCorrente,
         giorniSettimana: number[],        // 0..6 lunedì-first
         giorni: Giorno[], completamenti: Completamento[],
         libera?: boolean,                 // contenitore degli allenamenti liberi/consigliati
         visibilita: 'pubblica'|'solo-pt'|'nascosta', creataIl }
Giorno { id, tipo:'workout'|'rest', nome, nota, esercizi: Esercizio[] }
Esercizio { id, nome, nota, gruppo, variaPerSettimana,
            schemaBase: Schema, settimane: Schema[], commenti: [], media: MediaRef[] }
Schema { serie, ripetizioni, carico, recupero, nota }   // TUTTE stringhe libere
Completamento { schedaId?, settimana, giornoId, data, durataSec?, esercizi?, visibilita? }
            // esercizi[] = {nome, gruppo, schema, sets} — il `gruppo` serve al motore dei consigli
MediaRef { id, tipo:'foto'|'video', nome, autore, visibilita:'privata'|'pubblica', creatoIl }

Dieta { id, nome, obiettivo, fonte:'calcolata'|'esterna', fonteNota,
        peso, altezza, eta, sesso, giorniAllenamento, movimento,
        dataInizio, dataFine, allenamento: PianoGiorno, riposo: PianoGiorno,
        giornate: GiornataTipo[], creataIl }
PianoGiorno { kcal, proteine, carbo, grassi, pasti: [{id,nome,testo}] }
GiornataTipo { id, nome, tipo:'allenamento'|'riposo'|'qualsiasi', kcal, proteine, carbo, grassi,
               pasti }        // macro a 0 = eredita quelli del piano base del giorno

PreferenzeCibo { regime:'onnivoro'|'vegetariano'|'vegano', esclusioni:[id], evito:[testo],
                 preferisco:[testo], note, aggiornateIl }   // per PROFILO, non per dieta

Sessione { id, schedaId, giornoId, settimana, nomeScheda, nomeGiorno, inizio,
           esercizi: [{esercizioId, nome, nota, gruppo, schema, sets:[{colore}]}] }
           // schema "congelato" dalla settimana corrente: lo storico resta corretto
```

Tre modi di scrivere un esercizio, tutti supportati: uguale per tutte le settimane
(`variaPerSettimana:false`), diverso ogni settimana (`settimane[]`), o a gruppi (settimane uguali).

---

## 7. Regole da non rompere

Elenco corto per riconoscerle a colpo d'occhio. **Il perché per esteso è in
[docs/decisioni.md](docs/decisioni.md)**: se stai per cambiare una di queste, leggilo prima.

- **Quello che non si sa non si mostra**, e non si sostituisce con un trattino o una media.
- **Ripetizioni e recuperi sono testo libero** (`15/12`, `1,15min`, `30" tra gli arti`): non si
  forzano in numeri, si rispetta la notazione del PT.
- **I dati fisici — livello compreso — stanno sul PROFILO**, non sulla dieta né sulla scheda.
- **Il livello si dichiara, non si deduce**, e *filtra ma non vieta*: tocca solo quello che l'app
  propone da sola, la scelta a mano entra sempre.
- **PWA installabile, non app nativa.** Niente App Store.
- **L'utente attivo non è persistito** e **l'elenco dei profili non si mostra**: si scrive il nome.
- **Del recap si condividono i numeri, non l'immagine.** **Video: massimo 10 secondi.**
- **Foto/video tra amici sono momentanei per la MEMORIA, non per la privacy** — e lo si dice.
- **Master password `PippoN1`**: ⚠️ da TOGLIERE prima di unire il ramo cloud. Reggeva finché i
  dati erano per dispositivo; con account veri è una chiave che apre tutto (vedi roadmap).
- **La chiave Supabase nel codice è pubblica e va bene**: a proteggere i dati sono le regole nel
  database (`auth.uid() = user_id`), che il browser non può falsificare.
- **Ci si trova per codice amico o per nome ESATTO**, mai per pezzi: la ricerca parziale
  permetterebbe di ricavarsi l'elenco di chi usa l'app, tre lettere alla volta.
- **Si viene suggeriti solo a chi ha un legame reale** (amici in comune, stesso PT). Un
  suggerimento è un nome che nessuno ha cercato: senza legame sarebbe la ricerca parziale
  rimessa in piedi da un'altra porta.
- **Offline le modifiche si tengono e si accodano, non si annullano.** Rete caduta e rifiuto del
  server sono cose opposte: la prima si riprova, la seconda si dice.

⚠️ I tre limiti da non dimenticare mai: la password **protegge l'accesso, non cifra niente**; i dati
in localStorage **possono sparire** (Safari li cancella); PT, amicizie e condivisioni **funzionano
solo sullo stesso browser** finché non c'è il cloud. Dettagli e conseguenze in
[docs/decisioni.md](docs/decisioni.md).

---

## 8. Come riprendere

1. Leggi questo file. La scheda d'esempio in `src/data/seed.js` è roba reale dell'utente — ed è
   anche il motivo per cui un profilo NUOVO ha già esercizi "noti" (conta per il motore).
2. `npm run dev` → "Benvenuto" → "Crea un account" (nome **univoco** + password + dati fisici +
   **livello**: per un atleta sono tutti obbligatori) oppure "Accedi". Si atterra sul calendario.
   Se qualcosa sembra "vecchio": hard reload / riavvia dev.
3. Reset pulito, da console del browser:
   `Object.keys(localStorage).filter(k=>k.startsWith('palestra')).forEach(k=>localStorage.removeItem(k))`
4. **Provare il motore senza passare dalla UI** è molto più economico di uno screenshot: un harness
   `.mjs` che importa `lib/consiglio` e `lib/schedePrefatte` e stampa cosa esce ai vari livelli.
   ⚠️ Serve un loader che aggiunga `.js` agli import senza estensione (Vite li risolve, Node no).
5. Provare i **livelli** senza rifare l'account: "I miei dati" → cambia livello → Salva, poi Schede
   prefatte / Allenamento consigliato. Provare **condivisioni e invii momentanei**: servono due
   account amici sullo stesso browser — crea il secondo, cercalo per nome in Amici, manda la
   richiesta, rientra col primo e accetta.
6. Il prossimo passo concordato: [docs/roadmap.md](docs/roadmap.md), fase 2a.
