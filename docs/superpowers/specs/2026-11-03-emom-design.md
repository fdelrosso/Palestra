# EMOM — design

> Data: 2026-11-03 · Stato: da rivedere · Ramo: `main`
>
> L'EMOM ("every minute on the minute"): a ogni intervallo si parte con una serie, e quello che
> resta dell'intervallo è il recupero. Più esercizi si alternano un intervallo per uno (min 1 A,
> min 2 B, min 3 A…); uno solo è il caso di un esercizio. L'intervallo è qualsiasi (60", 90",
> 2'…), la durata è in minuti o **"finché ce la faccio"**.
> In questa versione: editor, allenamento, import, recap/storico, esportazione.
> **Dopo** (non qui): l'EMOM diverso per settimana.

## 0. Vincoli

- **Nessuna modifica al database.** Gli allenamenti svolti tengono gli esercizi nel JSON
  (`allenamenti.dati`): l'EMOM ci viaggia dentro.
- **L'EMOM è una superserie con le impostazioni.** Il giro (lib/superserie `giro`: A1 B1 A2 B2),
  il trascinamento del blocco, il togliere e l'allenamento lo sanno già fare: si riusano.
- **Le serie si calcolano, non si scrivono**, ma si SALVANO nello schema di ogni esercizio:
  recap, volume, record, storico ed esportazione le leggono come serie normali.

## 1. Il dato

Sul **primo** esercizio del blocco:

```js
emom: { ogniSec: 60, minuti: 12 }   // minuti: null = "finché ce la faccio"
```

Gli altri esercizi del blocco hanno `insiemeAlPrecedente: true`, come in una superserie.

- **Intervalli** = `minuti * 60 / ogniSec` (arrotondato per difetto; il sotto-intervallo che
  avanza non si fa). Con N esercizi, l'esercizio k (da 0) ha `ceil((intervalli - k) / N)` serie:
  12 intervalli e 2 esercizi = 6 e 6; 10 e 3 = 4, 3, 3 (chi ne ha meno salta il giro, come già fa
  `giro`).
- **Ogni esercizio** tiene le sue ripetizioni e il suo carico nello schema; `schema.fasi` ha una
  fase sola con `serie` = quelle calcolate; `recuperoSec` = null.
- **"Finché ce la faccio"**: `serie` = null nel piano. In allenamento le serie si aggiungono un
  giro alla volta finché l'orologio va.
- **L'allenamento svolto** copia `emom` col suo esercizio e aggiunge `minutiFatti` (per tutti:
  per il fisso con "Ferma" e per quello a oltranza).

### `src/lib/emom.js` (nuovo, funzioni pure)

- `intervalli(emom)` → numero, o null se a oltranza.
- `serieEmom(emom, n, k)` → le serie dell'esercizio k su n.
- `allineaEmom(esercizi)` → la lista con le serie riscritte in ogni blocco EMOM (e `emom` tolto da
  chi non è più primo di un blocco, passato al nuovo primo). Idempotente.
- `esercizioDelMinuto(blocco, m)` → { i, j }: chi tocca all'intervallo m (da 0) e quale serie.
- `statoOrologio(inizio, emom, adesso)` → { minuto, restanteSec, finito }.
- `minutiDi(emom, n, k)` → gli intervalli dell'esercizio k (1·3·5…), per editor ed esportazione.
- `testoEmom(emom)` → "EMOM 12' · ogni 1'" / "EMOM · ogni 1' · finché ce la faccio".

Prove: `tests/emom.test.js`.

`allineaEmom` gira in `normalizzaScheda` (data/model) e al salvataggio degli editor: una serie
fuori conto non resta mai.

## 2. Editor (GiornoEditor, `aCard`)

- **"+ EMOM"** sotto "Aggiungi esercizio" apre un foglietto (`Foglio`):
  - **Ogni**: 30", 45", 1', 90", 2', 3' più una casella libera.
  - **Per**: contatore dei minuti (1…60), o l'interruttore **"Finché ce la faccio"**.
  - "Crea" apre la ricerca; l'esercizio scelto è il primo del blocco, con `emom`.
- **Il riquadro**: come quello della superserie, con un colore suo e la testata
  **"EMOM · ogni 1' · 12'"**. Toccandola si riapre il foglietto, che ha anche **"Sciogli"**
  (via `emom` e i legami: esercizi normali, `recuperoSec` vuoto). In fondo
  **"+ Esercizio nell'EMOM"** aggiunge dopo l'ultimo del blocco, legato.
- **Le card nel riquadro**: **Serie** mostra il conto ("6×10", a oltranza "×10") e toccata apre
  solo le ripetizioni (niente contatore delle serie, niente "+ Altra fase"); **Peso** come
  sempre; al posto di **Recupero** la colonna **Minuti** (1·3·5…), non toccabile. In "Altro" niente
  "Cambia per settimana" né l'interruttore della superserie.
- **Accanto al riquadro** niente catena "superserie": dall'esterno non ci si lega.
- Togliere il primo passa `emom` al successivo; togliere l'ultimo toglie il riquadro. Ogni
  modifica della lista passa da `allineaEmom`.
- Il riquadro si trascina intero, come una superserie.

## 3. Allenamento (WorkoutSession)

Un blocco con `emom` si mostra con **CardEmom** al posto di CardSuperserie/CardEsercizio.

- **Prima**: il piano (testata, esercizi con ripetizioni e carico) e **"Avvia EMOM"** → 10" di
  "Pronti… 3, 2, 1", poi il minuto 1.
- **Durante**:
  - in alto **"Minuto 4 di 12"** (a oltranza "Minuto 4") e il conto del minuto, **0:38**;
  - l'esercizio del minuto con ripetizioni e carico, sotto più piccolo **"Poi: Burpee ×8"**;
  - una **fila di pallini**, uno per intervallo: vuoto finché non lo si dà, poi del colore dello
    sforzo; quello in corso evidenziato;
  - a ogni nuovo intervallo: il bip (se acceso, quello di useRestTimer), una vibrazione corta, e
    la card passa all'esercizio dopo; negli ultimi 3" i numeri pulsano;
  - il recupero normale è nascosto.
- **Lo sforzo**: si tocca il pallino dell'esercizio in corso → la domanda di sempre (e "Duro"
  chiede le ripetizioni). **L'orologio non si ferma mai.** Un intervallo non dato resta in
  sospeso e si dà toccando il suo pallino quando si vuole, anche dopo. A EMOM finito, quelle
  ancora vuote valgono fatte come da piano, senza colore.
- **Fine**:
  - fisso: finito l'ultimo intervallo, **"EMOM finito ✓"** e l'allenamento passa al blocco dopo;
  - **"Ferma"** (fisso) chiede conferma: valgono gli intervalli fatti, gli altri si tolgono;
  - a oltranza: **"Non ce la faccio più"** sempre in vista; l'intervallo in cui si è non conta.
    Le serie si aggiungono all'esercizio quando inizia il suo intervallo.
  - Niente pausa: un EMOM in pausa non è un EMOM.
- **Telefono in tasca, "Esci" → "Riprendi"**: l'orologio è calcolato dall'istante di partenza
  (`emomInizio` nella sessione), come il recupero. Gli intervalli passati fuori sono in sospeso.
  Quello a oltranza non finisce da solo stando fuori.

## 4. Import (lib/parser, lib/formatoScheda, api/riscrivi)

```
EMOM 12':
Kettlebell swing 10 24kg
+ Burpee 8

EMOM 10' ogni 90s: Trazioni 5
E2MOM 16': Squat 5 100kg
EMOM finché ce la fai: Push up 10
```

- La riga di testata: `EMOM <minuti>'`, `ogni <tempo>` facoltativo (default 1'); `E2MOM`/`E3MOM`
  = ogni 2'/3'; "finché ce la fai", "a cedimento", "max" = a oltranza.
- Esercizi: dopo i due punti sulla stessa riga (uno solo), o sotto, col `+` dal secondo.
- Le serie non si scrivono. Scritte e uguali al conto si ignorano; diverse, la riga va in
  `problemi` (in cima all'editor), senza scegliere a caso.
- REGOLE_FORMATO, ESEMPIO_FORMATO e PROMPT_AI con l'EMOM: l'AI riscrive "ogni minuto per 10
  minuti…" nel formato. `tests/parser.test.js` legge l'esempio.

## 5. Recap e storico (lib/recap, RecapCondivisibile, storico esercizio)

- **Card del recap**: un blocco con la testata **"EMOM 12' · ogni 1'"** e una riga per esercizio
  (**"6×10 · 24kg"**); a oltranza la testata dice **"EMOM · fino al 9° minuto"** (`minutiFatti`).
- **Storico dell'esercizio e dettaglio dell'allenamento**: le serie come sempre, con una
  targhetta **EMOM** sul giorno.
- **Record, volume, ripetizioni**: le serie contano come serie normali.

## 6. Esportazione (lib/schedaPdf, lib/schedaExcel)

- **PDF**: il blocco incorniciato con la testata, gli esercizi con le serie calcolate, la colonna
  **Minuti** al posto del recupero.
- **Excel**: una riga per esercizio; Serie = il conto; Recupero = "EMOM"; nelle note
  **"EMOM 12' ogni 1' · minuti 1·3·5…"**, come oggi "Superserie con…".

## 7. Prove

- `tests/emom.test.js`: conti delle serie (12/2, 10/3, ogni 90"), `allineaEmom` (togliere il
  primo, l'ultimo, idempotenza), minuto → esercizio, stato dell'orologio (prima, durante, a
  cavallo, finito).
- `tests/parser.test.js`: le quattro forme sopra e quella col conto sbagliato.
- `tests/recap.test.js`: le righe e la testata, fisso e a oltranza.
- L'orologio a mano su localhost; un allenamento vero dal telefono (schermo spento, bip).

## 8. Fuori da qui

- L'EMOM diverso per settimana (oggi in "Altro" non c'è "Cambia per settimana" per l'EMOM).
- Più esercizi nello stesso intervallo ("ogni minuto: 5 trazioni + 10 push up").
- AMRAP, Tabata e altri formati a tempo.
