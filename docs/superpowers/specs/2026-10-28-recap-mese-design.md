# Recap del mese — design

> Data: 2026-10-28 · Stato: da rivedere · Ramo: `main`
>
> Un riepilogo del mese "alla Spotify Wrapped": una storia a schermo intero, una slide per
> argomento, che finisce su una card da condividere. **Passo 1** (questo documento): solo
> l'immagine da condividere. **Passo 2** (dopo, documento suo): il recap del mese come post nel
> feed, che riusa la card finale.

## 0. Vincoli

- **Nessuna modifica al database** e nessuna colonna nuova. L'unica scrittura è una chiave nelle
  preferenze del profilo (`preferenze.avvisi`, già esistente) per ricordare che la card della Home
  è stata vista.
- I numeri si calcolano **sul telefono**, dagli allenamenti che l'app ha già in memoria (quelli
  che usa il calendario). Niente traffico in più.
- Vale la regola del recap: **quello che non si sa non si mostra** (lib/recap). Una cifra senza
  dato è `null` e la sua slide (o casella) sparisce.
- Le definizioni sono quelle del recap dell'allenamento: il mese **somma** quello che
  `statisticheRecap` dà per ogni allenamento. Nessuna nuova definizione di volume, record, durata.

## 1. Dati — `src/lib/recapMese.js` (nuovo)

Funzioni pure, senza rete.

- `recapDelMese(allenamenti, { anno, mese, schede, diete, dati })` → l'oggetto con i dati di ogni
  slide, o `null` se nel mese non c'è nessun allenamento.
  - Un allenamento è del mese della sua `data`, **in ora locale**, come nel calendario.
  - Per ogni allenamento `statisticheRecap(...)` (lib/recap); i record da `conRecord` sulla storia
    intera, poi si tengono quelli del mese.
  - Il confronto col mese prima (`+N allenamenti`) c'è solo se il mese prima ne ha almeno uno, e
    solo se N > 0 (un calo non si mostra).
- `slideDelMese(recap)` → l'elenco delle slide da mostrare, nell'ordine di §2, già filtrato.
- `caselleCard(recap)` → le caselle della card finale (§4), nell'ordine, solo quelle con un dato.
- `avanzaStoria(stato, evento)` → la logica del visore (§3).
- `meseDaPercorso('2026-10')` → `{ anno, mese }` o `null` se il testo non è un mese valido.

## 2. Le slide

Ognuna c'è solo se ha il suo dato.

| # | Slide | Cosa mostra | Sparisce se |
|---|---|---|---|
| 1 | Intro | "Il tuo ottobre", avatar e @username | mai |
| 2 | Allenamenti | numero di allenamenti; il calendario del mese che si riempie; "+3 rispetto a settembre" | mai (un mese vuoto non ha recap) |
| 3 | Tempo | ore e minuti in tutto; l'allenamento più lungo (nome e data) | nessun allenamento ha una durata |
| 4 | Volume | kg sollevati in tutto; il peso più alto del mese col suo esercizio | nessuna serie con peso e ripetizioni numerici |
| 5 | Muscoli | il disegno del corpo colorato per intensità sul mese ("poco … tanto"); i 3 gruppi più allenati | nessun esercizio con muscoli noti |
| 6 | Sforzo | serie facili / medie / dure in una barra; l'allenamento più duro | nessuna serie col pallino |
| 7 | Record | i record del mese, al massimo 5, i più recenti per primi | nessun record |
| 8 | Abitudini | l'esercizio più fatto; il giorno della settimana preferito; la serie più lunga di settimane di fila | meno di 3 allenamenti |
| 9 | Cardio | minuti di cardio in tutto | 0 minuti |
| 10 | Canzone del mese | la polaroid della canzone scelta più volte (a pari merito la più recente) | nessun allenamento ha una canzone |
| 11 | Riepilogo | la card finale (§4) con Condividi e Rivedi | mai |

- **Calorie no**: ci sono solo se scritte a mano dall'orologio, il totale sommerebbe i buchi.
- **Testi senza genere** dove il profilo non lo dice ("6 allenamenti fatti"), come gli amici
  dalla 117ª.

## 3. Il visore — `src/pages/RecapMesePage.jsx` (nuova)

- **Rotta `/recap-mese/AAAA-MM`** (lib/router), a schermo intero, senza la barra in basso. Indietro,
  il tasto indietro di Android (`history.back`, lib/nativo) e la ✕ chiudono e tornano da dove si
  veniva.
- Si apre un **mese finito con almeno un allenamento**. Il mese in corso si apre **solo in locale**
  (`import.meta.env.DEV`), per provarlo. Mese in corso, vuoto o non valido → si torna al calendario.
- Su desktop la slide sta al centro in 9:16, con lo sfondo intorno.

**Avanzamento**
- Una **barretta per slide** in alto: piene le passate, quella attuale che si riempie, vuote le
  prossime.
- **~6 secondi per slide**; l'ultima (Riepilogo) **non va avanti da sola**.
- Il tempo è quello **passato davvero** (`requestAnimationFrame` + `performance.now`), non
  un'animazione CSS: barretta e slide non si sfasano. Pagina o app in secondo piano
  (`visibilitychange`) = pausa.

**Comandi**
- Tocco sul **terzo destro** → avanti; sul **terzo sinistro** → indietro (sulla prima slide la
  ricomincia).
- **Tenere premuto** ovunque → pausa; lasciare → riprende. Un gestore suo: `useTieniPremuto` è
  fatto per svelare la foto dopo un ritardo e qui non va.
- Desktop: ← / →, spazio per la pausa, Esc chiude.
- Niente "trascina giù per chiudere" nella prima versione.

**Stato e test**
- `avanzaStoria(stato, evento)` in lib/recapMese, con `stato = { indice, trascorso, inPausa, totale }`
  ed eventi `tempo(ms)`, `avanti`, `indietro`, `pausa`, `riprendi`, `rivedi`. Il componente mostra
  lo stato e passa gli eventi.

**Accessibilità**
- Con **"riduci movimento"** (`prefers-reduced-motion`) le slide **non vanno avanti da sole** e non
  hanno animazioni d'entrata.
- Ogni slide ha un titolo e testo vero (lo legge uno screen reader: "6 allenamenti a ottobre"); le
  barrette dicono "Slide 3 di 9".
- Le animazioni (numeri che contano, calendario che si riempie) sono CSS e partono solo quando la
  slide diventa quella attuale.

## 4. La card finale e la condivisione

- **1080×1920 (9:16)**, il formato della storia di Instagram. Un formato solo; il 4:5 per il feed
  arriva col passo 2.
- **Come nel recap dell'allenamento, l'anteprima È l'immagine che si esporta**: si disegna su
  canvas e si mostra come `<img>`.
- **Contenuto**: in alto "Ottobre 2026", avatar e @username; le caselle (`caselleCard`):
  allenamenti, ore, kg sollevati, record, solo quelle con un dato, e la griglia si ricompone senza
  buchi; il calendario del mese coi giorni allenati; il disegno del corpo coi muscoli del mese; la
  polaroid della canzone se c'è; in fondo logo e nome dell'app.
- **Sfondo**: i colori dei muscoli principali del mese (`sfondoGruppi`, lib/recap), come il recap
  di base. Niente foto né video nella prima versione.

**Codice**
- **`src/lib/recapMeseImmagine.js` (nuovo)**: `disegnaRecapMese(recap, { avatar, copertina })` →
  canvas.
- Riusa i pezzi di disegno di `lib/recapImmagine` (font, riquadri, sfondo, corpo, barra dello
  sforzo, polaroid), che oggi sono privati: si **esportano** senza cambiarli, la card
  dell'allenamento resta identica. Copiarli farebbe due versioni che si allontanano.
- **La condivisione** (`condividi` / `scarica` di `RecapCondivisibile`) passa in una funzione
  comune, `condividiImmagine(canvas, { nomeFile, titolo })` in `lib/recapImmagine`, usata da tutti e
  due. Stesso ordine di sempre: foglio di condivisione (`navigator.canShare({ files })`), se no
  download, e tenere premuta l'anteprima resta valido.
- File `recap-ottobre-2026.png`, titolo "Il mio ottobre".

**Tasti sull'ultima slide**: **Condividi** (o **Scarica** dove non si può condividere), **Rivedi**
(dalla prima slide). "Manda a un amico" no: vorrebbe un tipo di messaggio nuovo in chat, va col
passo 2.

## 5. Da dove si apre

**La card della Home** — `src/components/CardRecapMese.jsx` (nuovo)
- Dal **giorno 1 al 7** del mese, se il mese prima ha almeno un allenamento e
  `preferenze.avvisi['recapMese:AAAA-MM']` non c'è.
- **Card in cima alla Home**, non una finestra: le finestre all'apertura sono già una catena
  (`AvvisoMuscoli` → `AvvisoCanzone`).
- "Il tuo ottobre è pronto", un'anteprima ("6 allenamenti · 4 h 20 min"), **Apri** e ✕.
- Apri → `/recap-mese/2026-10`. Apri e ✕ scrivono `avvisi['recapMese:2026-10'] = 'visto'` con
  `aggiornaPreferenze` (vale su tutti i telefoni). Una chiave per mese.
- Non sulla Home del PT (`LavoroPage`) nella prima versione.

**Il tasto del calendario** — `src/pages/CalendarPage.jsx`
- Guardando un **mese finito con almeno un allenamento** (`nelMese > 0`), nella testata c'è
  **"Recap di ottobre"**. Sempre, anche per i mesi vecchi.
- In locale anche sul mese in corso.

**Non nella prima versione**: notifica push, link dal profilo, mini-guida.

## 6. Prove

- **`tests/recapMese.test.js`** con allenamenti scritti a mano: mese vuoto (`null`), un allenamento
  solo, serie senza peso (niente volume, non 0), allenamento a cavallo della mezzanotte di fine
  mese, record dentro e fuori dal mese, confronto col mese prima (anche il calo, che non si mostra),
  canzone più scelta a pari merito, slide che spariscono, `caselleCard` con 2, 3 e 4 caselle,
  `avanzaStoria` (avanti dall'ultima, indietro dalla prima, pausa che ferma il tempo, rivedi),
  `meseDaPercorso` con testi sbagliati.
- **In locale sul database di produzione**, col proprio account: il recap scrive solo la chiave
  della card della Home nelle proprie preferenze. `/recap-mese/2026-10` apre ottobre anche se non è
  finito (solo in locale). Su produzione `baggianis` ha 6 allenamenti, tutti a ottobre 2026.
- **La card finale con Chrome headless**: i PNG di ottobre e di un mese scarso e uno pieno (dalle
  prove), da guardare prima di provarla nell'app.
- La card dell'allenamento va riguardata dopo aver esportato i pezzi di `recapImmagine` e spostato
  la condivisione: deve restare identica.

## 7. File toccati

| File | Cosa |
|---|---|
| `src/lib/recapMese.js` | nuovo: dati, slide, caselle, `avanzaStoria`, `meseDaPercorso` |
| `src/lib/recapMeseImmagine.js` | nuovo: la card 1080×1920 |
| `src/pages/RecapMesePage.jsx` | nuovo: il visore |
| `src/components/CardRecapMese.jsx` | nuovo: la card della Home |
| `src/lib/recapImmagine.js` | esporta i pezzi di disegno; `condividiImmagine` |
| `src/components/RecapCondivisibile.jsx` | usa `condividiImmagine` |
| `src/lib/router.js`, `src/App.jsx` | la rotta `recap-mese` |
| `src/pages/CalendarPage.jsx` | il tasto "Recap di …" |
| `src/pages/HomePage.jsx` | monta `CardRecapMese` |
| `src/index.css` | stili del visore e delle slide |
| `tests/recapMese.test.js` | nuovo |

## 8. Passo 2 (fuori da questo documento)

Il recap del mese nel feed: un tipo di post nuovo, con mi piace e commenti legati a lui, la card in
4:5, "Manda a un amico". Avrà il suo design; per provarlo si copieranno i propri allenamenti da
produzione al database di sviluppo.
