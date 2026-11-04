# Atleti del PT e Schede generali dal server — design

> Data: 2026-11-04 · Stato: approvato in chat · Ramo: `egress`
>
> Secondo pezzo dopo il feed a pagine (2026-11-04-feed-a-pagine-design.md). Atleti e Schede
> generali smettono di usare `useCollettivo` ("tutto di tutti"). Resta solo Consigliato, che ha
> la sua spec; poi via `allenamenti_visibili`/`schede_visibili`.

## 0. Vincoli

- **Database: solo aggiunte**, migrazione rilanciabile `20261104200000_atleti_schede_generali.sql`.
- Visibilità degli allenamenti: `vedo_allenamento` (migrazione del feed), non riscritta.
- Le pagine non cambiano aspetto.

## 1. Atleti del PT

**Lista** (`useAndamenti`, AtletiPage):

- `ritmo_atleti()` → `table (user_id uuid, ultimo timestamptz, ultimi7 int)`: per ogni mio atleta
  (`profili.pt_id = me`) la data dell'ultimo allenamento e quanti negli ultimi 7 giorni
  (`data > now() - 7 days`), solo `pubblica`/`solo-pt`, con `vedo_allenamento`, da
  `associato_il` in poi (null = da sempre). Un atleta senza allenamenti esce con `ultimo` null e 0.
- `schede_atleti()` → stesse colonne di `schede_visibili`, solo dei miei atleti, `pubblica`/`solo-pt`,
  senza completamenti.
- `andamentoAtleta({ schede, allenamenti, ritmo })`: con `ritmo = { ultimo, ultimi7 }` usa quelli
  invece di contarli da `allenamenti`. Il resto del calcolo non cambia.

**Dettaglio** (`useAtleta`, un atleta):

- `atleta_dati(p_atleta uuid)` → `jsonb { schede: [...], allenamenti: [{id, scheda_id, data, dati}] }`,
  come `ex_atleta_dati`: solo se `p_atleta` è un mio atleta, altrimenti vuoto. Allenamenti
  `pubblica`/`solo-pt`, `dati_allenamento_per_me`, da `associato_il`; schede come `schede_atleti`.
- Tutti insieme, non a pagine: il conto e i progressi per scheda li vogliono tutti. Cresce con la
  storia di UN atleta, non con gli utenti. Un commento `ponytail:` lo segna.

## 2. Schede generali

`schede_pubbliche(p_chi text, p_giorni int, p_settimane int, p_q text, p_dopo_rel int,
p_dopo_il timestamptz, p_dopo_id text, p_quanti int default 20)` → colonne di `schede_visibili` più
`creata_il timestamptz`.

- Non `libera`, non bloccati fra noi (`bloccato_con`).
- `tutti` = le mie (qualsiasi visibilità) + le `pubblica` degli altri. `amici` = le `pubblica` di chi
  ha un'amicizia accettata con me (come il feed). Le mie non stanno in `amici`.
- Filtri, come `normalizzaScheda` li vede: giorni = giorni con `tipo` `workout` (assente =
  workout); settimane = `numeroSettimane`, 0/assente = 5; `p_q` = un esercizio il cui nome contiene
  il testo, maiuscole indifferenti. Null = filtro spento.
- Ordine: `relazione_pt desc, creata_il desc, id desc` (`creata_il` = `dati->>'creataIl'`, assente =
  1970). Pagine per chiave su quella tupla.
- `filtri_schede_pubbliche(p_chi)` → `table (giorni int[], settimane int[])`: i valori distinti dei
  due menu, ordinati, sulle stesse schede.

Client: `leggiPaginaSchede({ chi, giorni, settimane, q, dopo })` → `{ ok, errore, voci, ancora, dopo }`
con le voci di `schedeGenerali` di oggi (nomi da `nomi_di` per pagina). La pagina: lista azzerata a
ogni cambio di sezione o filtro, ricerca con 300 ms di attesa, segnaposto in fondo come il feed.

## 3. Verifiche

1. **Database su dev**, transazione annullata, per ognuno dei 37 utenti: `schede_pubbliche` messe in
   fila (tutti e amici, senza filtri e con un filtro per tipo) = `schede_visibili` filtrata come
   `schedeGenerali`; `ritmo_atleti`/`atleta_dati` = `allenamenti_visibili` filtrata come
   `useAtleta` (per i PT che hanno atleti).
2. `npm run lint`, `npm run test`, `npm run build`.
3. Browser su dev (`cccc`): Schede generali, sezioni, un filtro, la ricerca, scorrimento; byte prima
   e dopo; nessun errore.

## Fuori da qui

Consigliato; via `allenamenti_visibili`/`schede_visibili`/`useCollettivo`; il problema 2.
