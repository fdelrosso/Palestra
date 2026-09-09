# Palestra

App per tracciare gli allenamenti in palestra. **PWA installabile**: si apre da Safari su iPhone e
si aggiunge alla schermata Home, senza App Store.

Multi-profilo (ogni profilo ha la sua password), pensata per chi riceve le schede dal personal
trainer via messaggio: c'è l'**import da testo** che le trasforma in schede vere.

## Cosa fa

- **Schede** con settimane, giorni e progressione; import da un messaggio del PT.
- **Sessione di allenamento** guidata: timer di recupero, pallini di sforzo serie per serie,
  consiglio sul carico (sali / tieni / scendi) dalle volte precedenti.
- **Calendario** come home, storico completo, recap di fine allenamento condivisibile come immagine.
- **Allenamento consigliato e schede prefatte** generati da un motore che tiene conto
  dell'obiettivo, del muscolo su cui vuoi insistere e del tuo **livello di esperienza**.
- **Esercizi** illustrati: il corpo col muscolo acceso e un manichino che esegue il movimento.
- **Dieta**: piani per giorni di allenamento e riposo, giornate tipo, import da PDF, sostituzioni
  per allergie e intolleranze che tengono i macro.
- **Amici e personal trainer**: schede e allenamenti condivisibili, foto e video momentanei.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # output in dist/
npm run lint
```

React 19 + Vite 8 + `vite-plugin-pwa`. Nessuna libreria di routing o di stato: sono fatti a mano
(hash routing, così funziona su qualsiasi hosting statico).

## Deploy

Hosting statico qualsiasi: build `npm run build`, cartella pubblicata `dist/`. Serve **HTTPS**, non
per formalità — senza, `crypto.subtle` non esiste e le password ricadono su un hash debole.

L'aggiornamento è automatico (`registerType: 'autoUpdate'`): si vede alla riapertura successiva.
⚠️ Arriva il codice nuovo, non i dati: attenzione ai cambi di struttura dei dati salvati.

## Dove stanno i dati

Per ora **solo sul dispositivo** (localStorage, e IndexedDB per foto e video). Non c'è ancora un
server: profili diversi sullo stesso browser si vedono, telefono e PC no. Il passaggio al cloud
(Supabase) è il prossimo blocco di lavoro.

⚠️ Di conseguenza: la password protegge l'**accesso**, non cifra niente, e i dati locali possono
essere cancellati dal browser se l'app resta inutilizzata a lungo.

## Documentazione

Tutto il contesto del progetto — mappa dei file, modello dati, decisioni prese e perché — sta in
[context.md](context.md) e nella cartella [docs/](docs/).
