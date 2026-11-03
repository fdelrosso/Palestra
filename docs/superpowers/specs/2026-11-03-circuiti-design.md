# Circuiti — design

> Data: 2026-11-03 · Stato: da rivedere · Ramo: `main` (non pushato: l'EMOM aspetta questo)
>
> "+ EMOM" diventa **"+ Circuito"**, con cinque tipi: **A giri**, **EMOM**, **Tabata**, **AMRAP**,
> **For time**. Tutti riusano quello che l'EMOM ha già messo in piedi (spec
> `2026-11-03-emom-design.md`): il blocco è una superserie con le impostazioni sul primo
> esercizio, il riquadro nell'editor, la card di sempre in allenamento con l'orologio in cima,
> la testata in recap, storico ed esportazione. Cambiano, tipo per tipo, solo le impostazioni,
> l'orologio e cosa si registra.

## 0. Vincoli

- **Nessuna modifica al database**: tutto sta nel JSON della scheda e dell'allenamento.
- **L'EMOM non si pusha prima di questo**: il campo cambia nome (`emom` → `circuito`), e va
  fatto finché nessuno, oltre all'utente in locale, ha dati salvati col nome vecchio.
- **Le superserie di oggi non cambiano**: "A giri" è una superserie, senza campo nuovo. Le schede
  salvate restano come sono.
- Si parte da quello che c'è: lib/emom, FoglioEmom, CardEmom (OrologioEmom, MotoreEmom,
  TestaEmom), GiornoEditor `onLista`, lib/session `serieEmomFinoA`/`chiudiEmom`, parser
  `emomDa`, recap `titoloEmom`, schedaExcel. Si generalizzano, non si rifanno.

## 1. Il dato

Sul **primo** esercizio del blocco, al posto di `emom`:

```js
circuito: { tipo: 'emom',    ogniSec: 60, minuti: 12 }            // minuti null = finché ce la faccio
circuito: { tipo: 'tabata',  lavoroSec: 20, riposoSec: 10, giri: 8 }
circuito: { tipo: 'amrap',   minuti: 12 }
circuito: { tipo: 'fortime', giri: 3, capMinuti: 20 }            // capMinuti null = senza limite
```

- **A giri** non ha `circuito`: è la superserie di oggi (recupero sull'ultimo, a fine giro). Nel
  menu "+ Circuito" è la prima voce e crea un blocco legato come fa la catena "superserie".
- **Le serie di ogni esercizio** si calcolano e si scrivono nello schema (`allineaCircuiti`, il
  nome nuovo di `allineaEmom`), come oggi:
  - EMOM: come oggi (intervalli alternati fra gli esercizi);
  - Tabata: `giri` intervalli di lavoro alternati fra gli esercizi, come l'EMOM (8 giri e 2
    esercizi = 4 serie ciascuno); ripetizioni di base **"max"**;
  - For time: `giri` serie per esercizio;
  - AMRAP: `serie` null (come l'EMOM a oltranza): le serie nascono coi giri fatti.
  - Recupero `null` per tutti i tipi a tempo (il recupero lo dà l'orologio).
- **I nomi vecchi**: `normalizzaScheda` (e la sessione ripresa) convertono `emom: {…}` in
  `circuito: { tipo: 'emom', … }`. Costa una riga e salva le schede EMOM già provate in locale.
- **L'allenamento svolto** copia `circuito` sul primo, coi risultati:
  - EMOM e Tabata: `intervalliFatti` (oggi `minutiFatti`, stesso significato);
  - AMRAP: `giriFatti`, `ripExtra` (le ripetizioni del giro non finito);
  - For time: `tempoSec`, `giriFatti` (minore di `giri` se è scattato il cap).

### `src/lib/circuiti.js` (era lib/emom)

Funzioni pure, una tabella per tipo così che aggiungerne uno sia aggiungere una voce:

```js
TIPI_CIRCUITO = {
  emom:    { nome: 'EMOM',     … },
  tabata:  { nome: 'Tabata',   … },
  amrap:   { nome: 'AMRAP',    … },
  fortime: { nome: 'For time', … },
}
```

- `serieCircuito(c, n, k)` → le serie dell'esercizio k su n (null = nascono in allenamento).
- `statoOrologio(c, inizio, adesso, giriFatti)` → `{ fase, numero, intervallo, finito }`:
  - `fase`: `'pronti'` (i 5" iniziali), `'lavoro'`, `'riposo'` (Tabata), `'corre'` (AMRAP e For
    time), `'fine'`;
  - `numero`: i secondi da mostrare — alla rovescia (EMOM, Tabata, AMRAP, For time col cap) o in
    avanti (For time);
  - `intervallo`: l'intervallo in corso, per chi tocca (EMOM, Tabata).
- `testoCircuito(c)` → la testata: "EMOM 12' · ogni 1'", "Tabata 20"/10" × 8", "AMRAP 12'",
  "For time · 3 giri · cap 20'"; coi risultati: "AMRAP 12' · 7 giri + 5", "For time · 3 giri ·
  12'34"", "EMOM · ogni 1' · fino al 9° minuto".
- `allineaCircuiti`, `posizioneCircuito`, `sciogliCircuito`, `turnoCircuito`, `vistaCircuito`:
  quelle dell'EMOM, rinominate e col tipo.

## 2. Editor

- **"+ Circuito"** al posto di "+ EMOM". Il foglio (FoglioCircuito, era FoglioEmom) chiede prima
  il **tipo** (cinque pastiglie), poi i campi di quel tipo:
  - A giri: **Giri** (contatore) e **Recupero a fine giro** (i preimpostati del recupero);
  - EMOM: Ogni / Per / Finché ce la faccio (com'è oggi);
  - Tabata: **Lavoro** (20" di base), **Riposo** (10"), **Giri** (8);
  - AMRAP: **Per** (minuti);
  - For time: **Giri** e **Cap** (minuti, o "senza limite").
- **Il riquadro**: lo stesso, con la testata `testoCircuito` e un colore per tipo (A giri resta
  il riquadro della superserie di oggi). "+ Esercizio nel circuito" in fondo.
- **Le card nel riquadro**:
  - EMOM: come oggi ("Reps ogni 1'", Peso, Serie calcolate);
  - Tabata: "Reps" (di base "max"), Peso, Serie calcolate;
  - AMRAP e For time: **"Reps a giro"**, Peso, e nella terza colonna i **Giri** (For time) o
    niente (AMRAP);
  - A giri: la card di sempre, con le serie che seguono i giri del riquadro.
- Cambiare tipo dal foglio tiene gli esercizi e rifà le serie (`allineaCircuiti`). "Sciogli"
  come oggi.

## 3. Allenamento

Sempre la card di sempre sull'esercizio di turno, e in cima l'orologio (OrologioCircuito, era
OrologioEmom) al posto del recupero. Il motore (MotoreCircuito) fa bip e vibrazione a ogni cambio
di fase e chiude a tempo scaduto. 5" di "Pronti" per tutti i tipi a tempo. Niente pausa.

- **EMOM**: com'è oggi.
- **Tabata**: in cima **LAVORO 0:20** (accento) e **RIPOSO 0:10** (verde), "Giro 3 di 8" e
  "Poi: …". La card passa all'esercizio del giro dopo all'inizio del riposo, così lo sforzo si
  dà nei 10" di riposo; i pallini restano toccabili come nell'EMOM, e a fine Tabata quelli non
  dati valgono fatti (`'fatto'`).
- **AMRAP**: in cima il conto alla rovescia del blocco intero e "Giro 4". Nella card, al posto
  dei tasti dello sforzo, un tasto grande **"Giro fatto"**: aggiunge una serie a ogni esercizio
  (fatta come da piano). Scaduto il tempo, un foglio chiede **"Reps in più nel giro non
  finito"** (si può saltare) e poi **"Com'è andata?"** una volta sola: il colore va su tutte le
  serie del blocco.
- **For time**: in cima il cronometro **in avanti** (col cap, sotto "cap 20'") e "Giro 2 di 3".
  "Giro fatto" come l'AMRAP; all'ultimo giro il cronometro si ferma e si salva il tempo. Scattato
  il cap, finisce lì (`giriFatti` < `giri`). Poi "Com'è andata?" una volta sola, come l'AMRAP.
- **A giri**: la superserie di oggi, senza orologio nuovo (il recupero a fine giro).
- **"Termina" a circuito in corso**: chiude il circuito al punto in cui è (oggi l'EMOM resta
  senza `minutiFatti`: si sistema qui per tutti).

## 4. Import (parser, formatoScheda, api/riscrivi)

```
3 giri, rec 90s:
Push up 10
+ Squat 15

EMOM 12':
Swing 10 24kg
+ Burpee 8

Tabata: Squat
Tabata 30/15 x6: Burpee
AMRAP 12': Pull up 5 / + Push up 10 / + Squat 15
For time 3 giri (cap 20'): Thruster 21 40kg / + Pull up 21
```

- Testate: `N giri` / `N rounds` / `circuito N giri` (+ `rec …`) → A giri; `EMOM …` come oggi;
  `Tabata` (20/10 × 8 di base) o `Tabata L/R xN`; `AMRAP N'`; `For time` + `N giri`/`N rounds`
  + `cap N'` facoltativo.
- Esercizi: dopo i due punti (uno solo) o sotto col `+` (o A1/A2 dall'AI), come per l'EMOM; il
  numero in fondo al nome sono le ripetizioni.
- REGOLE_FORMATO, l'esempio e PROMPT_AI col circuito; `soloQuelloScritto` toglie un circuito
  copiato dall'esempio quando la scheda di partenza non ne ha (come oggi per l'EMOM).

## 5. Recap, storico, esportazione

- **Recap**: la testata `testoCircuito` coi risultati (es. "AMRAP 12' · 7 giri + 5") sopra gli
  esercizi del circuito; le righe degli esercizi come oggi.
- **Storico dell'esercizio**: la targhetta col nome del tipo (EMOM, Tabata, AMRAP, For time).
- **Dettaglio dell'allenamento**: la testata come oggi.
- **Excel/PDF**: Recupero = il nome del tipo (A giri: il recupero a fine giro, come oggi); nelle
  note `testoCircuito` e, con più esercizi, "a turno, 1° di 2" (EMOM, Tabata) o "in giro"
  (AMRAP, For time).
- **Volume e record**: le serie contano come serie normali. Le `ripExtra` dell'AMRAP stanno solo
  nella testata, non nel volume (non si sa di quale esercizio sono).

## 6. Prove

- `tests/circuiti.test.js` (era emom.test.js): serie per tipo; `statoOrologio` per tipo (pronti,
  lavoro/riposo a cavallo, AMRAP che scade, For time in avanti e col cap); `testoCircuito` coi
  risultati; conversione `emom` → `circuito`.
- `tests/session` (in circuiti.test.js): "Giro fatto" aggiunge una serie a ogni esercizio;
  chiusura AMRAP/For time con lo sforzo unico; Tabata come EMOM.
- Parser: le sei testate sopra.
- Recap ed Excel: una testata per tipo.
- A mano, in un allenamento vero: un Tabata (bip a ogni cambio, schermo spento), un AMRAP corto,
  un For time col cap.

## 7. Fuori da qui

- Più esercizi nello stesso intervallo ("ogni minuto: 5 trazioni + 10 push up").
- Circuiti diversi per settimana.
- Record dell'AMRAP e del For time (più giri, meno tempo) fra i record del recap.
- Death by, scale (ladder) e altri formati.
