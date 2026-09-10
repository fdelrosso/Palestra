# Palestra — Prossimi passi

> Roadmap concordata. La 2a è fatta (l'app è online). **Il prossimo blocco è la fase 2b:
> il cloud con Supabase**, l'unica cosa che fa parlare telefono e PC.

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

### Fase 2b — CLOUD (Supabase). Il blocco grosso.
⚠️ **Serve l'utente**: deve creare il progetto e passare **URL + anon key**.
1. **Auth**: i profili diventano utenti veri. Decidere la migrazione dei dati di "Fede" (unico
   profilo reale) o ripartire puliti — da chiedere.
2. **Tabelle** con `user_id` + RLS. Riguarda schede, diete e sessione: passano tutte da
   `store/StoreContext.jsx`, l'unico posto da riscrivere. Il resto dell'app non si tocca.
3. **Viste globali**: `lib/storico.js`, `lib/schedeGenerali.js` e `lib/comunita.js` oggi leggono il
   localStorage di tutti i profili del dispositivo → diventano query. `codicePt` va reso unico a
   livello di database; `palestra:relazioni:v1`, `palestra:condivisioni:v1` e `palestra:effimeri:v1`
   sono già modellate come tabelle (due colonne di id + payload jsonb).
4. **La visibilità va applicata lato server (RLS)**, non solo nella UI.
5. **Media su Supabase Storage**: i `MediaRef` diventano URL. L'astrazione è già isolata in
   `lib/media.js` + `EsercizioAllegati`. Per gli **effimeri** serve anche la cancellazione lato
   server (un cron o una scadenza sull'oggetto): oggi il blob lo cancella il client che guarda, e
   nel cloud questo non basta più — sarebbe una promessa che il server non mantiene.
6. **Master password `PippoN1`**: con account veri è un buco di sicurezza, va tolta o ristretta.

### Fase 2c — GLI AMICI
Amicizie, richieste, visibilità, condivisioni e invii momentanei **esistono già**: manca solo che
funzionino tra dispositivi, cioè la 2b. Poi: visibilità media per id invece che per nome; decidere
se lo Storico resta aperto a tutti; una notifica push quando arriva qualcosa (in PWA da iOS 16.4,
solo dopo l'aggiunta alla Home).

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

