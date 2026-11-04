# Feed e profilo a pagine — design

> Data: 2026-11-04 · Stato: approvato in chat, da rivedere scritto · Ramo: `egress`
>
> Primo dei cinque pezzi che tolgono `useCollettivo` ("tutto di tutti", lib/collettivo) dalle
> pagine. Oggi ogni apertura del feed scarica **tutti** gli allenamenti e **tutte** le schede
> visibili, col json intero (`allenamenti_visibili`, `schede_visibili`): su dev ~435 KB, e cresce
> con utenti × storia — a 1000 utenti attivi, dopo un anno, ~420 MB a lettura per persona. Qui
> **feed** e **profilo** smettono di usarlo: arrivano a pagine di 20 dal server.
>
> Gli altri quattro pezzi, ognuno con la sua spec: Schede generali, Consigliato (conti fatti dal
> database), Atleti del PT, e alla fine via `allenamenti_visibili`/`schede_visibili`.

## 0. Vincoli

- **Database: solo aggiunte** (CLAUDE.md). `allenamenti_visibili` e `schede_visibili` restano
  come sono finché le usano Schede generali, Consigliato e Atleti.
- **Le regole di visibilità non si copiano a mano in tre posti**: una funzione sola
  (`vedo_allenamento`) usata da tutte le funzioni nuove. `allenamenti_visibili` ha ancora le sue
  finché non se ne va; un commento in tutte e due rimanda all'altra.
- **Il feed non cambia aspetto**: stesse card, stesse linguette, stessi filtri. Cambia da dove
  arrivano le voci.
- Restano nel browser, come oggi: l'archivio dei profili eliminati (`caricaArchivio`) e gli
  allenamenti appena cancellati (`cancellatiDiRecente`, lib/storico).

## 1. Database — migrazione `20261104180000_feed_a_pagine.sql`

**`vedo_allenamento(p_persona uuid, p_visibilita text) → boolean`** — la regola di
`allenamenti_visibili`, una volta: non bloccati fra noi (`bloccato_con`); miei sempre; pubblici
se la persona non ha la pubblicazione bloccata (`pubblicazione_bloccata`); "solo al PT" se è un mio
atleta (`e_mio_atleta`).

**`feed_allenamenti(p_chi text, p_prima_di timestamptz, p_prima_di_id text, p_quanti int default 20, p_modo text default null, p_km double precision default 5)`**
→ `table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)`,
dal più recente:

| `p_chi` | quali |
|---|---|
| `tutti` | quelli degli altri che `vedo_allenamento` lascia vedere |
| `amici` | come `tutti`, solo di chi ha un'amicizia **accettata** con me (`relazioni`, tipo `amicizia`, in tutti e due i versi) |
| `palestra` | come `tutti`, con `dati.palestraId` fra `palestre_della_mia_zona(p_modo, p_km)` — **dopo** `dati_allenamento_per_me`: chi nasconde la palestra non c'è (152ª) |
| `atleti` | dei miei atleti (`profili.pt_id = me`), pubblici e "solo al PT", da `associato_il` in poi |

- I miei non escono (il feed li toglie già: `filtraFeed`, `ioId`).
- **Pagine per chiave, non per posizione**: `where (data, id) < (p_prima_di, p_prima_di_id)
  order by data desc, id desc limit p_quanti`. Un allenamento nuovo mentre si scorre non sposta
  le pagine. `p_prima_di` null = prima pagina.
- `dati` passa da `dati_allenamento_per_me`, come in `allenamenti_visibili`.

**`allenamenti_di(p_utente uuid, p_prima_di, p_prima_di_id, p_quanti int default 20)`** — stesse
colonne, solo di `p_utente`, con `vedo_allenamento` (il profilo di un altro).

**`conta_allenamenti_di(p_utente uuid) → bigint`** — quanti ne vedo io: il numero in cima al
profilo, senza scaricarli.

**`schede_di(p_utente uuid)`** — le schede di `p_utente` che vedo, colonne come `schede_visibili`.

**`allenamento_per_chiave(p_chiave text)`** — un allenamento solo, stesse colonne, se lo vedo; per
id o per chiave vecchia (`chiave_vecchia`, come `posso_vedere_allenamento`). È il post aperto da un
link o da una notifica.

**Indici**: `allenamenti (data desc, id desc)` e `allenamenti (user_id, data desc)`.

Tutte `security definer`, `stable`, `revoke` da `public, anon`, `grant` ad `authenticated`.
Rilanciabile.

## 2. Client — `src/lib/feedServer.js`

- `leggiPaginaFeed({ chi, dopo, zona }) → { ok, errore, voci, ancora, dopo }`: chiama
  `feed_allenamenti`, poi `nomi_di` e `username_di` **solo per chi è nella pagina**, e rifà le voci
  come oggi (`voceStorico` di lib/storico, `relazionePt` compreso). `ancora` = la pagina era piena;
  `dopo` = `{ data, id }` dell'ultima riga.
- `leggiPaginaUtente(utenteId, dopo)`, `contaAllenamentiDi(utenteId)`, `schedeDi(utenteId)`,
  `allenamentoPerChiave(chiave)`: stesso stampo.
- **Pura e provata** (`feedServer.test.js`): da righe + nomi a voci, e `serveAltraPagina({ visibili,
  pagineLette, ancora })` → true se i filtri lasciano meno di 10 voci, ci sono altre pagine e se ne
  sono lette meno di 5.

## 3. Feed — `src/pages/FeedPage.jsx`

- Niente più `useCollettivo`. La pagina tiene `{ voci, dopo, ancora, pagine, caricando, errore }`.
- Prima pagina all'apertura e a ogni tocco di linguetta (oggi `ricarica`): si riparte da capo.
- In fondo alla lista un segnaposto invisibile (`IntersectionObserver`): quando entra a schermo e
  `ancora`, si legge la pagina dopo.
- **Filtri secondari** (gruppi, durata, esercizio): `filtraFeed` di sempre sulle voci lette. Se
  `serveAltraPagina` dice sì, si legge la pagina dopo da sola. Il limite di 5 pagine (100
  allenamenti) vuol dire che un filtro raro guarda solo gli ultimi 100: scelta dell'utente.
- `palestra`: il modo e i km della zona (`ZONE`, `leggiZona`) passano al server; la chiamata a parte
  `palestreDellaMiaZona` dalla pagina non serve più.
- **I miei post** (`soloChiave` fra i miei): dalle proprie schede (`useStore`, i completamenti),
  rifatti con `voceStorico`, anche i nascosti. Zero download.
- **Il post di un altro** aperto per chiave: `allenamentoPerChiave`.
- Mi piace, commenti e foto: come oggi, per le chiavi a schermo.

## 4. Profilo — `src/pages/UtentePage.jsx`

- **Il mio**: allenamenti e schede da `useStore`, nascosti compresi, come oggi li fa
  `allenamentiDiUtente(..., { tutti: io })`. Zero download.
- **Di un altro**: `leggiPaginaUtente` a pagine di 20 col segnaposto in fondo, `contaAllenamentiDi`
  per "N allenamenti", `schedeDi` per le schede (poche: tutte insieme).

## 5. Errori

- Prima pagina fallita: il messaggio di oggi (`errore` di `useCollettivo`).
- Pagina dopo fallita: le voci lette restano, in fondo "Non sono riuscito a caricare gli altri ·
  Riprova".
- Database non ancora aggiornato (funzione che non c'è): come una lettura fallita. Per questo la
  migrazione va in produzione **prima** del merge su `main`.

## 6. Verifiche

1. **Database, su dev**, in transazione annullata: per ognuno dei 37 utenti e per `tutti`,
   `amici`, `atleti` (e `palestra` per chi ha una palestra), le pagine di `feed_allenamenti`
   messe in fila = `allenamenti_visibili()` filtrata come fa oggi il client (stesse righe, stesso
   ordine). Lo stesso per `allenamenti_di` e `conta_allenamenti_di` contro
   `allenamentiDiUtente`.
2. **`npm run test`**: `feedServer.test.js` (righe → voci, `serveAltraPagina`).
3. **Browser su dev** (headless, utente `cccc`): feed, scorrimento con seconda pagina, linguette,
   un filtro, profilo mio e di un altro, nessun errore; byte scaricati aprendo il feed prima e dopo.

## Fuori da qui

Schede generali, Consigliato, Atleti del PT (usano ancora `useCollettivo`); il
rimettersi al passo dei propri dati (rilettura a ogni ritorno: problema 2 dell'egress); la cache
fra un'apertura e l'altra del feed.
