---
name: ProgettoPalestra1.0
description: Schede di allenamento, timer di recupero e dieta, dal telefono.
colors:
  celeste-piscina: "#5cc8f5"
  celeste-piscina-vivo: "#7ad4f8"
  inchiostro-piscina: "#04202e"
  blu-piscina: "#0a72ad"
  blu-piscina-fondo: "#095c8c"
  nero-vasca: "#000000"
  ardesia: "#121317"
  ardesia-chiara: "#1c1e24"
  gesso: "#f3f5f9"
  grigio-nota: "#98a2b3"
  grigio-sbiadito: "#6b7484"
  piastrella: "#f4f5f7"
  bianco-asciugamano: "#ffffff"
  piastrella-ombra: "#eef0f3"
  inchiostro: "#10141c"
  grigio-nota-chiaro: "#5b6472"
  verde-fatto: "#34d399"
  verde-fatto-chiaro: "#10b981"
  giallo-sforzo: "#f5c542"
  rosso-fallito: "#f26d6d"
  rosso-pericolo: "#f87171"
  rosso-pericolo-chiaro: "#d92d20"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  sm: "10px"
  field: "11px"
  md: "14px"
  lg: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  card: "18px"
  section: "28px"
components:
  button:
    backgroundColor: "{colors.ardesia-chiara}"
    textColor: "{colors.gesso}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-accent:
    backgroundColor: "{colors.celeste-piscina}"
    textColor: "{colors.inchiostro-piscina}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-accent-hover:
    backgroundColor: "{colors.celeste-piscina-vivo}"
  button-lg:
    rounded: "15px"
    padding: "16px 18px"
  button-sm:
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.ardesia}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  chip:
    backgroundColor: "{colors.ardesia-chiara}"
    textColor: "{colors.gesso}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  input:
    backgroundColor: "{colors.nero-vasca}"
    textColor: "{colors.gesso}"
    rounded: "{rounded.field}"
    padding: "12px 13px"
  segmented:
    backgroundColor: "{colors.ardesia-chiara}"
    rounded: "{rounded.md}"
    padding: "4px"
  bottom-bar:
    rounded: "{rounded.pill}"
    height: "58px"
  set-dot:
    rounded: "{rounded.pill}"
    size: "28px"
---

# Design System: ProgettoPalestra1.0

## Overview

**Creative North Star: "Lo Spogliatoio Pulito"**

Uno spogliatoio appena lavato: piastrelle chiare o nere, una sola nota d'acqua (il celeste), tanto spazio e niente di appeso ai muri. L'app è calma quando la si usa a casa e diventa netta solo dove serve agire: il timer, i pallini di sforzo, il tasto pieno che dice "tocca qui". La calma è il fondo, l'energia è un'eccezione che si guadagna.

Le superfici sono morbide e ariose: card grandi con angoli larghi (22px), staccate dal fondo con un'ombra appena percepibile sul chiaro e con un tono più chiaro e un filo sul nero. La densità è bassa: un'informazione per riga, numeri grandi, etichette piccole e grigie. Il colore dell'accento è dell'utente (si sceglie dal Profilo, per dispositivo); il sistema garantisce solo che resti leggibile, scurendolo o schiarendolo finché non supera il contrasto.

Rifiuti confermati: niente estetica da **app fitness motivazionale** (gradienti neon, foto di corpi scolpiti, frasi da poster, gamification urlata) e niente **gestionale grigio** (tabelle fitte, moduli, aspetto da software aziendale).

**Key Characteristics:**
- Due temi pari, default nero con accento celeste; il tema si legge da `data-tema`, non da `prefers-color-scheme`.
- Una sola tinta d'accento per schermata; verde, giallo e rosso parlano solo di sforzo ed esito.
- Font di sistema, pesi alti (700–800) per titoli e numeri, cifre tabulari per tutto ciò che scorre.
- Card bianche (chiaro) o ardesia (scuro), angoli da 22px, imbottitura 18px.
- Navigazione principale in una pillola che galleggia in basso, sfocata.
- Mobile-first, colonna unica larga al massimo 720px.

## Colors

Una piastrella neutra, chiara o nera, con una sola nota d'acqua; i colori caldi esistono solo per dire com'è andata una serie.

### Primary
- **Celeste Piscina** (celeste-piscina): l'accento sul tema scuro. Tasti pieni, linguetta accesa della barra, chip di filtro attivo, bordo del campo in focus, serie in corso. Sopra ci va **Inchiostro Piscina**, mai il bianco.
- **Celeste Piscina Vivo** (celeste-piscina-vivo): lo stesso celeste un passo più luminoso, per hover/pressione e per i link dentro una frase sul scuro.
- **Blu Piscina** (blu-piscina): lo stesso accento sul tema chiaro, abbassato di luminosità perché il celeste su bianco sarebbe 1.9:1. Sopra ci va il bianco. **Blu Piscina Fondo** (blu-piscina-fondo) per hover e link.

### Secondary
- **Verde Fatto** (verde-fatto / verde-fatto-chiaro): serie riuscita, esercizio completato, tasto "fatto". Solo esito, mai decorazione.
- **Giallo Sforzo** (giallo-sforzo): il pallino giallo della serie al limite; nel diario alimentare segna "questo numero l'ha messo l'app, non tu".
- **Rosso Fallito** (rosso-fallito): il pallino rosso della serie non chiusa.

### Neutral
- **Nero Vasca** (nero-vasca): fondo del tema scuro, ed è il default di tutti.
- **Ardesia** (ardesia): card e superfici sopra il nero.
- **Ardesia Chiara** (ardesia-chiara): tasti normali, chip, controllo a linguette, campi in rilievo.
- **Gesso** (gesso): testo sul scuro. **Grigio Nota** (grigio-nota): testo secondario, etichette. **Grigio Sbiadito** (grigio-sbiadito): icone spente, terzo livello.
- **Piastrella** (piastrella): fondo del tema chiaro. **Bianco Asciugamano** (bianco-asciugamano): card sul chiaro. **Piastrella Ombra** (piastrella-ombra): tasti e chip sul chiaro.
- **Inchiostro** (inchiostro): testo sul chiaro. **Grigio Nota Chiaro** (grigio-nota-chiaro): testo secondario sul chiaro.
- **Rosso Pericolo** (rosso-pericolo / rosso-pericolo-chiaro): solo azioni senza ritorno ed errori, usato come testo o come tinta al 18% con bordo al 45%, mai come tasto pieno.

### Named Rules
**The Una Sola Tinta Rule.** L'accento è uno per tutta l'app, e lo sceglie l'utente. Mai un secondo colore "di marchio" accanto: tutto ciò che non è azione o stato è neutro.

**The Contrasto Prima del Gusto Rule.** Un colore d'accento non si usa così com'è se non si stacca dal fondo: lo si scurisce o schiarisce finché testo e inchiostro superano 4.5:1 (lib/tema.js). Si progetta con le variabili `--accent` / `--accent-ink`, mai con un esadecimale scritto a mano.

**The Semaforo Solo per lo Sforzo Rule.** Verde, giallo e rosso significano esito di una serie (o, il rosso, pericolo). Non si usano per categorie, grafici decorativi o abbellimenti.

## Typography

**Display Font:** font di sistema (-apple-system, Segoe UI, Roboto, fallback Helvetica/Arial)
**Body Font:** lo stesso

**Character:** Un solo carattere, quello del telefono, così l'app sembra di casa su iPhone e Android. La gerarchia la fanno peso e dimensione, non il cambio di famiglia: titoli e numeri pesanti e un po' stretti (tracking negativo), testo di servizio piccolo, grigio e medio.

### Hierarchy
- **Display** (800, 56px, 1, -0.02em, cifre tabulari): il numero del recupero in cima all'allenamento, da leggere a un braccio di distanza. Varianti da 30–44px per i titoli dei post a schermo intero (900, maiuscolo, unico punto in cui il maiuscolo è ammesso).
- **Headline** (800, 30px, -0.03em): titolo delle pagine-sezione (Allenamento, Dieta, Social, Altro) e il saluto della pagina iniziale.
- **Title** (750, 17px, -0.01em): titoli di blocco dentro la pagina, nomi delle schede. Le serie×ripetizioni salgono a 20px/800.
- **Body** (400–600, 15px, 1.4): testo e tasti. I campi stanno a 16px per non far zoomare iOS.
- **Label** (600, 13px, grigio nota): etichette dei campi, chip, metadati. Scende a 12–12.5px per le note secondarie, mai sotto gli 11px.

### Named Rules
**The Numero Grande Rule.** Il dato che serve fra una serie e l'altra (secondi, kg, ripetizioni) è il testo più grande dello schermo, in cifre tabulari così non balla mentre cambia.

**The Niente Maiuscolo Rule.** Titoli ed etichette in maiuscolo/minuscolo normale. Il maiuscolo esiste solo nei titoli dei post a schermo intero.

## Layout

Mobile-first, una colonna sola centrata, larga al massimo 720px, con 16px di margine ai lati. Le sezioni sono separate da aria (28px sopra il titolo di sezione, 12px sotto), non da linee. Dentro le pile il ritmo è 12px fra card, 8–10px fra elementi in riga, 4–6px fra etichetta e valore. Le card imbottiscono a 18px.

La testata è appiccicata in alto, semitrasparente (fondo all'82%) con sfocatura, e rispetta la tacca (`safe-area-inset-top`). In basso galleggia la barra di navigazione: tutto ciò che deve stare in fondo (tasto "+", barra della chat, barra d'azione) sale sopra di lei usando `--spazio-barra`. Un solo punto di rottura significativo (380px) stringe le cose sui telefoni piccoli; sopra i 720px l'app resta una colonna, non si allarga.

## Elevation & Depth

Ibrido, diverso per tema e deciso apposta. Sul chiaro le card si staccano con un'ombra ambientale doppia, quasi invisibile; sul nero un'ombra grigia non si vede, quindi le card salgono di tono (ardesia) e prendono un filo di bordo. Le ombre vere, dense, sono riservate a ciò che galleggia sopra la pagina.

### Shadow Vocabulary
- **Ombra card** (`box-shadow: 0 1px 2px rgba(16,20,28,0.04), 0 6px 22px rgba(16,20,28,0.06)`): card e schede, solo tema chiaro. Sul scuro è `none` e la sostituisce un bordo `rgba(255,255,255,0.1)`.
- **Ombra galleggiante** (`box-shadow: 0 8px 24px rgba(20,24,34,0.12)`; sul scuro `rgba(0,0,0,0.6)`): barra in basso, fogli dal basso, menu, tutto ciò che sta sopra il contenuto.

### Named Rules
**The Galleggia Solo Chi Si Muove Rule.** L'ombra densa è per gli elementi sopra il flusso (barra, fogli, modali). Una card ferma non la prende mai, in nessun tema.

**The Tono Sul Nero Rule.** Sul fondo nero la profondità si fa con il grigio più chiaro e un filo, non con ombre o bagliori.

## Shapes

Angoli morbidi e larghi, scalati con la dimensione: 22px per le card, 14px per tasti e controlli a linguette, 11px per i campi, 10px per chip e tasti piccoli. Ciò che è un oggetto unico e toccabile è tondo: pallini di sforzo, avatar, tasto "+", e la barra di navigazione stessa (una pillola). Bordi sempre da 1px, sottili e trasparenti (8–18% del colore del testo); il tratteggio segnala un chip che si può toccare per cambiare il valore.

## Components

### Buttons
Morbidi e pieni, si schiacciano al tocco.
- **Shape:** angoli medi (14px); grande 15px, piccolo 10px.
- **Normale:** fondo ardesia chiara (piastrella ombra sul chiaro), testo pieno, bordo da 1px, 12px×16px, 15px/600.
- **Accento:** fondo `--accent`, testo `--accent-ink`, niente bordo. Uno per schermata: l'azione principale.
- **Pressione:** `scale(0.98)` in 50ms; hover dell'accento passa a `--accent-strong`. Disabilitato a opacità 0.5.
- **Ghost:** trasparente, per azioni secondarie in testata. **Link:** testo accento sottolineato, per "— Cambia" dentro una frase.
- **Pericolo:** testo rosso, oppure (il "Sì" di TastoConferma) tinta rossa al 18% con bordo al 45%. Mai `confirm()` del browser.
- **Icona:** 40×40, angoli 11px, trasparente; la versione piena (il "+" di sezione) è un cerchio d'accento.

### Chips
- **Style:** fondo ardesia chiara, bordo 1px, angoli 10px, 13px/600, icona grigia.
- **State:** acceso = bordo d'accento; toccabile per cambiare un valore (il peso in allenamento) = bordo tratteggiato più marcato; nota = testo grigio a peso 500.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** bianco asciugamano (chiaro), ardesia (scuro).
- **Shadow Strategy:** ombra card sul chiaro, bordo sottile sul scuro (vedi Elevation).
- **Internal Padding:** 18px. Le card toccabili si schiacciano a `scale(0.99)`.

### Inputs / Fields
- **Style:** fondo uguale al fondo pagina (incassato nella card), bordo 1px marcato, angoli 11px, 12×13px, testo 16px.
- **Focus:** il bordo diventa d'accento; niente bagliore.
- **Etichetta:** sopra il campo, 13px/600 grigio, 6px di distanza.

### Navigation
- **Barra in basso ("liquid navigation"):** una barra che galleggia (alta 62px, larga al massimo 420px, angoli 20px, fondo card pieno, bordo marcato, ombra galleggiante), cinque sezioni. La sezione accesa esce dal bordo di sopra dentro un **cerchio d'accento** da 54px, con l'icona in `--accent-ink` e il nome sotto; intorno al cerchio una tacca del colore della pagina (bordo di 6px) finge il buco nella barra. Il cerchio scivola da una sezione all'altra (0,42s, ease-out). Le altre sezioni sono solo l'icona, grigia.
- **Icone delle sezioni:** un set a parte (`IconaSezione`): a filo da 1,8px quando spente, piene quando accese. Casa con porta ad arco, manubrio inclinato, mela con foglia, due persone, tre quadrati e un cerchio.
- **Testata dell'app:** in cima a ogni pagina (tranne l'allenamento), appiccicata: logo a sinistra (sul tema scuro su una piastrina bianca), al centro dello schermo il nome come marchio — "Progetto" pieno e "Palestra" con un gradiente blu (#5cc8f5 → #2563eb), attaccati, 19px/800 — e l'avatar del profilo a destra. Le testate delle pagine si appiccicano sotto di lei. **L'unico testo a gradiente dell'app**: è il marchio, non un modo di dare enfasi.
- **Testata di sezione:** titolo headline a sinistra, azioni a destra, sotto un controllo a linguette.
- **Linguette (segmented):** binario ardesia chiara con 4px di imbottitura e angoli 14px; voce attiva in rilievo, le altre grigie 14px/700. Cambiare linguetta sostituisce la pagina in cronologia.

### Profilo (finestra di vetro)
L'unico vetro dell'app, chiesto apposta: il profilo sale dal basso sopra la Home come una lastra smerigliata (fondo card al 58%, sfocatura 28px con saturazione, filo chiaro in alto, angoli 28px in alto, maniglia). Dietro, la Home scurita e sfocata. Le voci dentro sono lastre più chiare, non card piene. Si chiude con la ✕, toccando fuori, con Esc o col tasto indietro. Il vetro resta un'eccezione di questa finestra, non uno stile da spargere.

### Pallini di sforzo (signature)
Il cuore della sessione guidata: una fila di cerchi da 28px, uno per serie. Vuoto = bordo 2px grigio; in corso = bordo e numero d'accento; finito = pieno verde, giallo o rosso secondo lo sforzo, col numero scuro sopra. Sono l'unico punto dove il semaforo compare a colori pieni.

### Timer di recupero (signature)
Una card in cima all'allenamento: il numero più grande dell'app (56px/800, cifre tabulari) al centro, il menu dei tempi sotto, e "Start" pieno col colore d'accento accanto a Reset e al bip. Chiusa una serie il recupero parte da solo (si spegne dal menu ⋯). Oltre il tempo il numero diventa del colore d'accento, non rosso.

### Card dell'esercizio in allenamento (signature)
Nome, schema e peso, poi i pallini delle serie e subito sotto, dopo il titolo "Com'è andata questa serie?", i tre tasti dello sforzo (alti 64px), così la serie si segna dove la si guarda. Ogni tasto ha la **batteria** (icona a filo, tacche piene): piena = Facile, una tacca = Medio, vuota = Duro. È quanto era rimasto dopo la serie; niente emoji. Il consiglio sul peso sta chiuso dietro "Peso consigliato". La testata della sessione ha "‹ Esci" a sinistra, il nome del giorno al centro con tempo e serie fatte, e "Termina" neutro a destra.

## Do's and Don'ts

### Do:
- **Do** usare sempre le variabili (`--accent`, `--accent-ink`, `--bg-elev`, `--text`, `--muted`…): il tema e l'accento cambiano per dispositivo, un esadecimale scritto a mano si rompe sull'altro tema.
- **Do** dare a ogni schermata una sola azione d'accento e lasciare il resto neutro.
- **Do** tenere i bersagli da toccare a 40px minimo (48px nella barra in basso) e il feedback di pressione (`scale` 0.94–0.99).
- **Do** mettere cifre tabulari su tutti i numeri che cambiano sotto gli occhi (timer, kg, ripetizioni).
- **Do** far salire sopra la barra in basso tutto ciò che sta in fondo, con `--spazio-barra`.
- **Do** separare le sezioni con lo spazio (28px), non con linee.

### Don't:
- **Don't** usare gradienti neon, foto di corpi scolpiti, frasi motivazionali o badge e punteggi urlati: niente estetica da app fitness motivazionale.
- **Don't** riempire uno schermo di tabelle fitte, griglie di campi o grigi da gestionale.
- **Don't** usare verde, giallo o rosso per decorare: sono esito dello sforzo e pericolo, nient'altro.
- **Don't** mettere ombre su una card sul tema scuro, né un'ombra densa su qualcosa che non galleggia.
- **Don't** mettere il bianco sopra il celeste chiaro (1.9:1): sopra l'accento va `--accent-ink`.
- **Don't** leggere il tema da `prefers-color-scheme`: lo decide `data-tema`.
- **Don't** scendere sotto i 16px nei campi di testo (iOS zooma) né sotto gli 11px per qualsiasi testo.
