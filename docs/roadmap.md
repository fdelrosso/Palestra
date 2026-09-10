# Palestra — Prossimi passi

> Roadmap concordata. La 2a è fatta (l'app è online) e la 2b è quasi chiusa sul ramo
> `cloud-supabase`: account veri, amicizie, e da oggi anche Storico, Schede Generali e consigli
> che leggono dal database. Resta la tappa 3 (foto e video), e due prove che tocca fare
> all'utente prima di unire il ramo.

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
   provando il sito in Safari NON si ritrovava dentro l'app installata: andava creato dopo averla
   aggiunta alla schermata Home. Era la stessa causa del punto sopra, ma sorprendeva molto di più.
   ✅ **Col cloud non fa più danni**: i dati stanno sul server, quindi l'app installata chiede solo
   di rifare l'accesso e ritrova tutto. Resta da sapere, perché il secondo login sorprende lo
   stesso — ma non si perde più niente.
5. **Master password `PippoN1`: l'utente ha scelto di tenerla** (2026-09-10), sapendo che online
   finisce nel bundle pubblico. Reggeva finché i dati erano per dispositivo. ✅ **Tolta nella 2b**,
   quando quella condizione è venuta meno.

### Fase 2b — CLOUD (Supabase). ✅ TUTTE E TRE LE TAPPE, sul ramo `cloud-supabase`
⚠️ **Fatte ma non ancora provate tutte**: media ed effimeri sono scritti e compilano, ma il
caricamento di un file richiede un login e non è stato ancora eseguito da nessuno (l'utente non
aveva modo di provare, 2026-09-10). Le tappe 1 e 2 e le tre viste "di tutti" sì, con account veri.
Progetto Supabase `nmnsdyutsjrxcvjvwvog`. Schema e regole: [supabase/schema.sql](../supabase/schema.sql),
**idempotente**: si rilancia intero nel SQL Editor ogni volta che cambia.

⚠️ **Il ramo non è ancora unito a `main`**, e non va unito prima di aver fatto le cose in fondo
(che adesso sono quattro, e due tocca farle all'utente).

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

**✅ Tappa 3 — foto e video.** Fatta tutta: i media degli esercizi e gli invii momentanei.

**✅ Media degli esercizi (2026-09-10).** Bucket privato `media`, tabella `media` con quello che
serve alle regole, tre policy sul bucket. Il file va su Storage **e** resta in IndexedDB come copia
locale: la miniatura compare nell'istante in cui scegli la foto, e si vede anche senza rete.
- **Chi può scaricare** lo dice `posso_scaricare_media()`: mia sempre; altrui solo se è marcata
  'pubblica' **e** posso vedere la scheda in cui sta. Stesse condizioni di `schede_visibili()`.
- ⚠️ Se il caricamento non parte il media **non si annulla**: resta locale, la miniatura dice
  "Solo su questo dispositivo", e si riprova quando torna la rete (`riprovaMediaInSospeso`,
  agganciata ad `alRitornoDellaRete` in StoreContext).
- ⚠️ La visibilità di un media sta in **due posti** (la riga sul database e il `MediaRef` nel
  json): la riga è quella su cui decide la regola, il json è quello che disegna il lucchetto. È
  l'unico punto dell'app in cui lo stesso fatto è scritto due volte — `aggiornaVisibilitaMedia()`
  li tocca tutti e due.
- Trovato e sistemato strada facendo: **la proprietà di un media si decideva col NOME** (vedi
  [decisioni.md](decisioni.md)).

**✅ Effimeri (foto/video momentanei tra amici) — 2026-09-10.** Bucket privato `effimeri`, tabella
`effimeri`, e il file che si può scaricare **solo finché la riga lo permette**.
- ⚠️ **"Sparisce" vuol dire "non si scarica più".** La regola sul bucket guarda la riga (consumato?
  scaduto?) a **ogni** richiesta, quindi la scadenza è vera anche se nessuno ha ancora fatto
  pulizia. I byte veri li cancella chi guarda, chiudendo il visore. Non si promette la distruzione
  dei byte — e infatti l'app non l'ha mai promessa (è la decisione "momentanei per la MEMORIA, non
  per la privacy").
- ⚠️ **Niente cron.** `pulisci_effimeri_scaduti()` la chiama l'app all'accesso, cioè dove la
  chiamava prima quando gli invii stavano sul telefono. Un cron farebbe la stessa cosa con più
  pezzi da tenere in piedi, e non aggiungerebbe niente: nel frattempo la regola dice già di no.
- ⚠️ **Una copia per destinatario.** Mandare la stessa foto a tre amici carica tre file, ed è
  voluto: "l'ha guardata" è di ciascuno, e con un file solo non si potrebbe cancellare finché
  l'ultimo non l'ha aperto — cioè mai, se uno se ne dimentica. Conseguenza: un invio può riuscire
  per un amico e fallire per un altro, e il modale lo dice ("Mandato a 2 di 3").
- ⚠️ **Conseguenza accettata: senza rete un invio non si apre.** Prima il blob era su questo
  telefono; adesso è sul server, e per guardarlo bisogna raggiungerlo. Non si accoda: un invio che
  scade fra 24 ore non ha senso metterlo in coda.

**✅ Fatto prima di unire (2026-09-10):**
1. ✅ **Master password `PippoN1` tolta.** Con lei se n'è andato tutto `lib/password.js`: gli hash
   li tiene Supabase Auth. ⚠️ Nel togliere la master password è saltato fuori che la conferma per
   **eliminare il profilo** non controllava più niente (il profilo cloud non ha `pwHash`, e
   `verificaPassword` senza hash diceva sempre di sì): adesso la password si ricontrolla contro
   Supabase, e senza rete si dice che non si può controllare invece di lasciar passare.
2. ✅ **`lib/storico.js`, `lib/schedeGenerali.js`, `lib/comunita.js` non leggono più niente da
   soli**: ricevono il "collettivo" (`lib/collettivo.js` + `hooks/useCollettivo.js`), che viene da
   `schede_visibili()` sul database. Il json esce già ripulito dei completamenti che non si devono
   vedere, e porta con sé le due cose che il browser non può calcolarsi (chi è un PT, e quali
   schede sono del MIO PT o dei suoi atleti). La regola che lasciava leggere le schede pubbliche
   direttamente dalla tabella è stata **richiusa**: adesso l'unica strada è la funzione.
   Schede e allenamenti svolti arrivano da **due funzioni diverse**, perché le loro visibilità
   sono indipendenti: una scheda nascosta con dentro allenamenti pubblici li pubblica lo stesso, e
   di quella scheda non esce niente (`allenamenti_visibili()`).
   ⚠️ Un comportamento è cambiato apposta — vedi [decisioni.md](decisioni.md): per chi non ha un
   PT il segnale dei personal trainer conta solo le schede e gli allenamenti loro, non più anche
   quelli dei loro atleti.
3. ✅ **Campo "codice del tuo PT" rimesso in registrazione.** In quella schermata si controlla solo
   la forma del codice; il resto lo fa AccountContext appena la sessione esiste, e se il codice non
   risulta a nessuno l'avviso lo raccoglie il menu del profilo aprendo il pannello "Personal
   trainer" col codice già scritto.

**⏳ Da fare prima di unire il ramo a `main`:**
1. ✅ **Lanciato** il 2026-09-10, e le tre viste sono state provate con due account veri: funzionano.
   ⚠️ Va **rilanciato** dopo l'aggiunta del bucket e della tabella `media` (tappa 3). È idempotente:
   si rilancia intero, sempre.
2. ✅ Fatto: la tappa 3 è chiusa, e con lei la fase 2b.
3. Provare l'app **installata sull'iPhone** contro il ramo, non solo in locale.
4. Cancellare gli account di prova rimasti in **Authentication → Users** (`alfa.*`, `prova.cloud.*`).

### Fase 2c — GLI AMICI ✅ assorbita nella tappa 2 della fase 2b
Quello che restava è nell'elenco "prima di unire" qui sopra. Resta da decidere:
una **notifica push** quando arriva qualcosa (in PWA da iOS 16.4, solo dopo l'aggiunta alla Home).

### Rifiniture decise ma non fatte (buone come primo lavoro di una sessione)
- **Calorie/battiti modificabili anche dopo**: montare `components/DatiOrologio.jsx` nel modale del
  recap di `CalendarPage` con lo stesso `aggiornaCompletamento`.
- **Foto di sfondo del recap non persistita**: vive finché la schermata è aperta, andrebbe in IndexedDB.
- ✅ **Banner "nuova versione disponibile"** (2026-09-10). Il service worker e' passato da
  `autoUpdate` a `prompt`: la versione nuova non si installa piu' da sola, si chiede.
  ⚠️ Durante l'allenamento la barra non compare — la sessione sopravvive a un ricaricamento, ma
  chi ha il bilanciere in mano non deve avere un tasto "Aggiorna" a portata di pollice.
  ⚠️ "Piu' tardi" non e' "mai": la barra torna alla prossima apertura.
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

