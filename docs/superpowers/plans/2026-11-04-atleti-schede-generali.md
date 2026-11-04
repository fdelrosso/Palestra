# Atleti del PT e Schede generali dal server — piano

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** AtletiPage e SchedeGeneraliPage smettono di usare `useCollettivo`; i dati arrivano dalle
funzioni della migrazione `20261104200000_atleti_schede_generali.sql` (già scritta, applicata su dev
e verificata: stesse righe di prima per tutti i 37 utenti).

**Spec:** `docs/superpowers/specs/2026-11-04-atleti-schede-generali-design.md`

## Global Constraints

- Le pagine non cambiano aspetto né testi.
- Non toccare la migrazione, `context.md`, `docs/*.md`.
- `useCollettivo`, `lib/collettivo`, `schedeGenerali`, `schedeDiUtente`, `allenamentiDiUtente` restano
  (li usano ancora Consigliato ed exAtleti): si smette solo di chiamarli da qui.
- Stile del repo: commenti in italiano, nomi italiani, densità di commento come i file vicini.
- `npm run lint` e `npm run test` puliti a ogni commit. Commit con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Le funzioni del server (firme)

- `schede_atleti()` → righe `{ id, user_id, autore_pt, relazione_pt, visibilita, libera, dati }`
  (schede dei miei atleti, pubbliche/solo-pt, non libere, senza completamenti).
- `ritmo_atleti()` → righe `{ user_id, ultimo (timestamptz|null), ultimi7 (int) }`, una per atleta.
- `atleta_dati(p_atleta)` → `{ schede: [dati...], allenamenti: [{ id, scheda_id, data, dati }] }`,
  allenamenti dal più recente, già filtrati da quando lo seguo.
- `schede_pubbliche(p_chi 'tutti'|'amici', p_giorni, p_settimane, p_q, p_dopo_rel, p_dopo_il,
  p_dopo_id, p_quanti)` → righe come `schede_atleti` più `creata_il`; ordine
  `relazione_pt desc, creata_il desc, id desc`; il cursore è `(relazione_pt, creata_il, id)`
  dell'ultima riga.
- `filtri_schede_pubbliche(p_chi)` → una riga `{ giorni: int[], settimane: int[] }`.

---

### Task 1: Atleti del PT

**Files:** `src/lib/lavoro.js`, `src/hooks/useAtleta.js`, nuovo `src/lib/atletiServer.js`,
`tests/lavoro.test.js`, nuovo `tests/atletiServer.test.js`.

- [ ] `andamentoAtleta({ schede, allenamenti, ritmo, adesso })`: se c'è `ritmo = { ultimo, ultimi7 }`
  usa quelli per `ultimo` e `ultimi7` invece di contarli da `allenamenti`; il resto uguale. Test in
  `lavoro.test.js`: con `ritmo` e `allenamenti: []` escono `ultimo`, `giorniDallUltimo`, `ultimi7` e
  l'avviso "fermo"/"mai" giusti.
- [ ] `src/lib/atletiServer.js` (stampo di `lib/feedServer.js` e `lib/exAtleti.js`):
  - `leggiAndamentiAtleti()` → `{ schede: Map<atletaId, Scheda[]>, ritmo: Map<atletaId, {ultimo, ultimi7}> }`
    da `schede_atleti` + `ritmo_atleti` in parallelo; schede `normalizzaScheda(r.dati)`, ognuna
    filtrata `visibileA(s, { comePt: true })` e ordinata dalla più recente (`creataIl`), come
    `schedeDiUtente`. Errore → mappe vuote e `console.warn`.
  - `leggiAtleta(atleta)` → `{ schede, allenamenti }` o `null` su errore, da `atleta_dati`: schede come
    sopra; allenamenti = `allenamentiDiUtente(atleta, { collettivo, comePt: true })` con un collettivo
    finto fatto dalle righe, come `leggiExAtleta` (utenteNome/username dall'atleta, `relazionePt: 0`,
    `completamento: r.dati`).
  - Una funzione pura esportata `schedeDaRighe(righe)` (raggruppa per `user_id`, normalizza, filtra,
    ordina) con il suo test in `tests/atletiServer.test.js` (stub-loader come `feedServer.test.js`).
- [ ] `src/hooks/useAtleta.js`: niente `useCollettivo`.
  - `useAndamenti(atleti)`: legge `leggiAndamentiAtleti()` in un effetto (all'apertura e quando
    cambia l'elenco degli id degli atleti), poi come oggi: `andamentoAtleta({ schede: schede.get(id) || [],
    ritmo: ritmo.get(id) || { ultimo: null, ultimi7: 0 } })`, stesso ordinamento. Finché non è
    arrivato: stessa forma con schede vuote e ritmo vuoto (niente crash, AtletiPage non cambia).
  - `useAtleta(atleta)`: legge `leggiAtleta(atleta)` in un effetto per `atleta.id` (con guardia
    contro risposte vecchie, `vivo`), ritorna `{ schede, allenamenti, andamento }` con
    `andamento = andamentoAtleta({ schede, allenamenti })`. Prima della risposta: liste vuote.
  - ⚠️ `useAtleta` è chiamato anche per OGNI riga della lista (AtletiPage.jsx:326, `RigaAtleta` o
    simile) solo per `andamento.corrente`: lì non deve fare una chiamata per riga. Far passare a
    quella riga l'andamento già calcolato da `useAndamenti` (AtletiPage già ce l'ha: `andamenti`)
    invece di chiamare `useAtleta`. Leggere AtletiPage.jsx 40-200 e 320-350 per capire.
- [ ] lint + test, commit "Atleti del PT dal server: ritmo per la lista, i dati di uno per il dettaglio".

### Task 2: Schede generali a pagine

**Files:** nuovo `src/lib/schedeServer.js`, `src/lib/schedeGenerali.js`, `src/pages/SchedeGeneraliPage.jsx`,
nuovo `tests/schedeServer.test.js`.

- [ ] In `lib/schedeGenerali.js` estrarre da `schedeGenerali()` la costruzione di UNA voce in
  `export function voceSchedaGenerale(v)` (v = `{ utenteId, utenteNome, autoreEPt, relazionePt, scheda }`)
  e farla usare da `schedeGenerali()` (che resta per gli altri).
- [ ] `src/lib/schedeServer.js`:
  - `PAGINA = 20`.
  - `vociDaRigheSchede(righe, nomi)` pura: `voceSchedaGenerale({ utenteId: r.user_id, utenteNome:
    nomi.get(r.user_id) || '', autoreEPt: !!r.autore_pt, relazionePt: r.relazione_pt || 0,
    scheda: normalizzaScheda(r.dati) })`, nell'ordine del server (non riordinare).
  - `leggiPaginaSchede({ chi, giorni, settimane, q, dopo })` → `{ ok, errore, voci, ancora, dopo }`
    come `pagina()` di feedServer: `p_giorni`/`p_settimane` numero o null, `p_q` testo trim o null,
    cursore `dopo = { rel, il, id }` dall'ultima riga (`relazione_pt`, `creata_il`, `id`); nomi da
    `nomi_di` solo per gli id della pagina. `ancora = righe.length === PAGINA`.
  - `leggiFiltriSchede(chi)` → `{ giorni: number[], settimane: number[] }` (vuoti su errore).
  - Test `tests/schedeServer.test.js`: `vociDaRigheSchede` (nome, relazionePt, numAllenamenti,
    ordine mantenuto).
- [ ] `SchedeGeneraliPage.jsx`: niente `useCollettivo` né `schedeGenerali`.
  - Stato `lettura = { voci, dopo, ancora, caricando, errore }` come FeedPage; si riparte da capo
    (voci svuotate subito) a ogni cambio di `sezione`, `filtroAll`, `filtroSett` o della ricerca
    "assestata" (`q` dopo 300 ms senza battute: un `useEffect` con `setTimeout`).
  - `opzAll`/`opzSett` da `leggiFiltriSchede(sezione)` (a ogni cambio di sezione), non più dalle voci.
    Se il valore scelto non è fra le opzioni resta lo stesso (lo azzera già il cambio di sezione).
  - Le voci a schermo sono `lettura.voci` (nessun filtro nel browser). `match` (gli esercizi
    evidenziati) resta calcolato nel browser su `s.eserciziNomi` col `ql` di oggi.
  - Segnaposto in fondo con `IntersectionObserver` come FeedPage.jsx:292-303 (deps
    `[lettura.ancora, lettura.voci.length, leggiAltra]`, `root` = il contenitore che scorre di questa
    pagina se non è la finestra: controllare come scorre `.app` qui, altrimenti `root: null`),
    classe `feed-fondo` già in index.css.
  - Testi vuoti: `caricando && voci vuote` → 'Sto leggendo…'; errore → errore; nessuna voce e nessun
    filtro/ricerca → i testi "nessuna scheda" di oggi (amici/tutti); con filtri → 'Nessuna scheda
    corrisponde ai filtri.'. Pagina dopo fallita: le voci restano, in fondo "Non sono riuscito a
    caricare le altre · Riprova".
  - `DettaglioScheda` e il resto invariati.
- [ ] lint + test + `npm run build`, commit "Schede generali a pagine: filtri e ricerca sul server".
