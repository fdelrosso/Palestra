# Palestra — Prossimi passi

> Roadmap concordata. La 2a è fatta (l'app è online) e la 2b è a buon punto sul ramo
> `cloud-supabase`: account veri e amicizie funzionano. Restano la tappa 3 (foto e video) e
> l'elenco di cose da fare prima di unire il ramo.

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

## Le fasi

### Fase 2a — METTERLA ONLINE. ✅ FATTA (2026-09-10)
**L'app è online e installata sull'iPhone dell'utente, e funziona.**
Strada scelta: **GitHub privato + Vercel**. I dati restano in localStorage, per dispositivo.
1. ✅ **Fatto** — `git init` (branch `main`), `.gitattributes` (LF: il builder di Vercel è Linux),
   README riscritto, `engines.node >=20` in package.json, primo commit `d74db8e` (117 file).
   ✅ Build di produzione verificata servita davvero (`npm run preview`): service worker
   registrato, 10 file in precache, `crypto.subtle` presente, zero errori in console.
2. ✅ **Fatto (2026-09-10)** — repo privato `github.com/fdelrosso/Palestra` (branch `main`,
   remote `origin`) + Vercel collegato al repo, impostazioni tutte di default (preset Vite).
   **L'app è online: https://palestra-bice.vercel.app**
   Da qui in poi ogni `git push` su `main` ripubblica da solo, in circa un minuto.
   ⚠️ Il `git push` da questa sessione lo blocca il classificatore della modalità automatica:
   lo lancia l'utente, oppure serve una regola `Bash(git push:*)` nei permessi.
   Alternative scartate: Vercel CLI senza GitHub, Netlify Drop.
3. ✅ **Fatto** — aggiunta alla schermata Home da Safari, confermata funzionante dall'utente.
4. ✅ **Verificato in produzione** (non solo "la pagina carica"): service worker registrato,
   10 file in precache, `crypto.subtle` presente — quindi le password usano **PBKDF2 vero** e non
   il fallback debole (profilo di prova: `pwAlgo: 'pbkdf2'`, hash da 64 caratteri) · manifest,
   icone e apple-touch-icon servite · zero errori in console · il motore dei livelli si comporta
   come in locale. **Atteso e confermato**: i profili del PC non compaiono sul telefono.
   ⚠️ **Su iOS l'app aggiunta alla Home ha uno storage SUO, separato da Safari.** Un profilo creato
   provando il sito in Safari NON si ritrova dentro l'app installata: va creato dopo averla
   aggiunta alla schermata Home. È la stessa causa del punto sopra, ma sorprende molto di più.
5. **Master password `PippoN1`: l'utente ha scelto di tenerla** (2026-09-10), sapendo che online
   finisce nel bundle pubblico. Regge finché i dati sono per dispositivo; va tolta in 2b.

### Fase 2b — CLOUD (Supabase). ⏳ TAPPE 1 E 2 FATTE, sul ramo `cloud-supabase`
Progetto Supabase `nmnsdyutsjrxcvjvwvog`. Schema e regole: [supabase/schema.sql](../supabase/schema.sql),
**idempotente**: si rilancia intero nel SQL Editor ogni volta che cambia.

⚠️ **Il ramo non è ancora unito a `main`**, e non va unito prima di aver fatto le cose in fondo.

**✅ Tappa 1 — account veri e dati sincronizzati** (provata: un dispositivo con memoria vuota fa
login e ritrova tutto).
- Login **email + password** (Supabase Auth), conferma email disattivata: il servizio di posta
  gratuito manda poche mail all'ora, e il terzo amico che si iscrive resterebbe fuori senza capire.
- `profili` creato da un trigger alla registrazione. Schede e diete sono **documenti jsonb**: l'app
  le tratta già come documenti interi, spezzarle in tabelle vorrebbe dire riscrivere mezza app per
  query che qui non servono. Fuori dal json solo ciò che serve a filtrare: `user_id`, `visibilita`.
- ⚠️ `schede.id` e `diete.id` sono **`text` e non `uuid`**: `nuovoId()` ha un ripiego non-UUID
  quando manca `crypto.randomUUID`, e con colonne `uuid` avrebbe fatto fallire ogni salvataggio.
- Sincronizzazione in `lib/sync.js`: locale subito, server poi, coda per ciò che non parte.
  **Niente merge**: due dispositivi che toccano la stessa scheda → vince l'ultimo che scrive.

**✅ Tappa 2 — gli amici** (provata con tre account veri).
- `relazioni` e `condivisioni` sul database. Ci si trova per **codice amico** o **nome esatto**
  (verificato: `alf` non trova `Alfa`, il codice sì). **Amici suggeriti** solo per legame reale.
- Accettare un atleta passa da `accetta_relazione()` nel database: scrive `pt_id` sul profilo
  dell'ATLETA, cioè nella riga di un altro — l'unica deroga, e concessa solo dopo aver verificato
  che la richiesta esista, sia per chi accetta e sia in attesa.

**⏳ Tappa 3 — foto e video (`media` ed effimeri).** Non iniziata.
- I `MediaRef` diventano URL su Supabase Storage; `lib/media.js` e `EsercizioAllegati` sono già
  l'astrazione giusta da riscrivere.
- ⚠️ Per gli **effimeri** serve la cancellazione **lato server** (cron o scadenza sull'oggetto):
  oggi il blob lo cancella il client che guarda, e nel cloud sarebbe una promessa che il server non
  mantiene.

**⏳ Da fare prima di unire il ramo a `main`:**
1. **Togliere la master password `PippoN1`** (`lib/password.js`): con account veri è una chiave che
   apre tutto, e sta nel bundle pubblico. L'utente aveva scelto di tenerla quando i dati erano per
   dispositivo — quella condizione non c'è più.
2. **`lib/storico.js`, `lib/schedeGenerali.js`, `lib/comunita.js`** leggono ancora il localStorage
   di tutti i profili del dispositivo → vanno riscritti come query. Finché non lo sono, lo Storico
   mostra solo i propri allenamenti e il motore dei consigli perde il segnale "comunità" (non si
   rompe: ricade sul catalogo). Le regole sul database ci sono già, e c'è `nomi_di()` per i nomi.
3. **Rimettere il campo "codice del tuo PT" nella registrazione**: tolto nella tappa 1 perché non
   poteva funzionare, ora può (`cerca_persona` + `accetta_relazione`).
4. **`lib/effimeri.js` e `lib/media.js`**: sono ancora locali, quindi le foto/video tra amici
   funzionano solo sullo stesso browser. È la tappa 3.
5. Provare l'app **installata sull'iPhone** contro il ramo, non solo in locale.
6. Cancellare gli account di prova rimasti in **Authentication → Users** (`alfa.*`, `prova.cloud.*`).

### Fase 2c — GLI AMICI ✅ assorbita nella tappa 2 della fase 2b
Quello che restava è nell'elenco "prima di unire" qui sopra. Resta da decidere:
una **notifica push** quando arriva qualcosa (in PWA da iOS 16.4, solo dopo l'aggiunta alla Home).

### Rifiniture decise ma non fatte (buone come primo lavoro di una sessione)
- **Calorie/battiti modificabili anche dopo**: montare `components/DatiOrologio.jsx` nel modale del
  recap di `CalendarPage` con lo stesso `aggiornaCompletamento`.
- **Foto di sfondo del recap non persistita**: vive finché la schermata è aperta, andrebbe in IndexedDB.
- **Banner "nuova versione disponibile"** (con `autoUpdate` l'aggiornamento si vede alla riapertura).
- **Cleanup dei blob orfani** in `eliminaDatiUtente`.

### Idee future (non richieste)
Peso corporeo che si ricorda nel tempo (un grafico invece di un numero solo) ·
Log dei pesi effettivi + grafici · riordino drag&drop · superset nel parser · export/import di backup ·
il **manichino anche durante l'allenamento** (`EsercizioCard`/`WorkoutSession`) e nell'editor: il
componente è pronto, basta montarlo dove serve ·
il **focus anche nell'allenamento consigliato singolo** (`ConsigliatoPage`): il motore lo supporta già,
basta il selettore — oggi il focus c'è solo nelle schede prefatte ·
il **livello che si accorge da solo di essere vecchio**: dopo mesi di allenamenti registrati, un
"principiante" con cento sedute alle spalle si potrebbe proporgli di passare a intermedio (proporre,
non cambiare da soli: resta una sua dichiarazione).

---

