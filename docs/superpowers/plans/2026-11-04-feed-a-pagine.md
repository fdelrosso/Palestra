# Feed e profilo a pagine — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed e profilo smettono di scaricare "tutto di tutti" (`useCollettivo`) e leggono dal server pagine di 20 allenamenti.

**Architecture:** Una funzione SQL di pagina (`feed_allenamenti`, per chiave `(data, id)`) con le regole di visibilità in un posto solo (`vedo_allenamento`); un modulo client `lib/feedServer.js` che rifà le voci come oggi (`voceStorico`); FeedPage e UtentePage tengono la lista delle voci lette e chiedono la pagina dopo quando il fondo entra a schermo. I propri allenamenti vengono dallo store, senza rete.

**Tech Stack:** Postgres (Supabase, funzioni `security definer`), React 19, `node --test`, Playwright headless per la prova finale.

**Spec:** `docs/superpowers/specs/2026-11-04-feed-a-pagine-design.md`

## Global Constraints

- Database **solo aggiunte**; `allenamenti_visibili` e `schede_visibili` non si toccano.
- Le funzioni nuove: `security definer`, `stable`, `set search_path = public`, `revoke all … from public, anon`, `grant execute … to authenticated`. File rilanciabile.
- Pagina = 20 righe; massimo 5 pagine lette in automatico per i filtri secondari; soglia 10 voci.
- Nel feed (linguette `tutti`/`amici`/`palestra`) e nel profilo di un altro escono **solo i `pubblica`** degli altri (oggi `visibileA` senza `comePt`); `atleti` anche `solo-pt`, da `associato_il`.
- `.env` punta a **dev** (`xfdzhiolqpcqekhvtpyw`): controllarlo prima di ogni `npm run db`. Mai produzione in questo piano.
- `context.md` e `docs/*.md` non si toccano su questo ramo (CLAUDE.md).
- Commenti e nomi in italiano, nello stile dei file intorno.

---

### Task 1: Migrazione `feed_a_pagine` + verifica di equivalenza su dev

**Files:**
- Create: `supabase/migrations/20261104180000_feed_a_pagine.sql`
- Create (fuori dal repo): `$CLAUDE_JOB_DIR/tmp/equivalenza-feed.sql`

**Interfaces:**
- Produces (SQL, tutte per `authenticated`):
  - `vedo_allenamento(p_persona uuid, p_visibilita text) → boolean`
  - `feed_allenamenti(p_chi text, p_prima_di timestamptz default null, p_prima_di_id text default null, p_quanti int default 20, p_modo text default null, p_km double precision default 5, p_utente uuid default null) → table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)`; `p_chi` ∈ `tutti | amici | palestra | atleti | utente`
  - `allenamenti_di(p_utente uuid, p_prima_di timestamptz default null, p_prima_di_id text default null, p_quanti int default 20)` → stesse colonne
  - `conta_allenamenti_di(p_utente uuid) → bigint`
  - `schede_di(p_utente uuid)` → colonne di `schede_visibili`
  - `allenamento_per_chiave(p_chiave text)` → colonne di `feed_allenamenti`

- [ ] **Step 1: Scrivere la migrazione**

```sql
-- ---------------------------------------------------------------------------
-- Il feed e il profilo A PAGINE (2026-11-04, ramo `egress`, spec
-- docs/superpowers/specs/2026-11-04-feed-a-pagine-design.md).
--
-- Prima feed e profilo scaricavano `allenamenti_visibili()`: TUTTI gli
-- allenamenti che si possono vedere, di tutti, col json intero, a ogni
-- apertura. Qui pagine di 20, dal più recente, per chiave (data, id): un
-- allenamento nuovo mentre si scorre non sposta le pagine.
--
-- ⚠️ LE REGOLE DI VISIBILITA' sono in `vedo_allenamento`, una volta. Le stesse
-- stanno ancora scritte in `allenamenti_visibili` (20261104120000), che serve
-- finché Schede generali, Consigliato e Atleti non passano di qui: chi ne
-- cambia una cambia anche l'altra.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

create or replace function public.vedo_allenamento(p_persona uuid, p_visibilita text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not public.bloccato_con(p_persona)
     and (p_persona = auth.uid()
          or (p_visibilita = 'pubblica' and not public.pubblicazione_bloccata(p_persona))
          or (p_visibilita = 'solo-pt' and public.e_mio_atleta(p_persona)));
$$;
revoke all on function public.vedo_allenamento(uuid, text) from public, anon;
grant execute on function public.vedo_allenamento(uuid, text) to authenticated;

-- Le linguette del feed (pages/FeedPage), e 'utente' per il profilo di un
-- altro. Come il client di prima: degli ALTRI solo i pubblici (visibileA senza
-- comePt); 'atleti' anche i "solo al PT", da quando li si segue; i propri mai
-- (il feed li toglieva comunque, e il proprio profilo li prende dal telefono).
create or replace function public.feed_allenamenti(
  p_chi         text,
  p_prima_di    timestamptz default null,
  p_prima_di_id text default null,
  p_quanti      int default 20,
  p_modo        text default null,
  p_km          double precision default 5,
  p_utente      uuid default null
)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  ),
  zona as (
    select z::text as palestra_id
      from public.palestre_della_mia_zona(p_modo, p_km) z
     where p_chi = 'palestra'
  )
  select
    a.id,
    a.user_id,
    a.scheda_id,
    a.data,
    case
      when a.user_id = io.me then 0
      when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end as relazione_pt,
    public.dati_allenamento_per_me(a.user_id, a.dati)
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where public.vedo_allenamento(a.user_id, a.visibilita)
    and (p_prima_di is null or (a.data, a.id) < (p_prima_di, p_prima_di_id))
    and case p_chi
      when 'atleti' then
        autore.pt_id = io.me
        and a.visibilita in ('pubblica', 'solo-pt')
        and (autore.associato_il is null or a.data >= autore.associato_il)
      when 'utente' then
        a.user_id = p_utente and a.user_id <> io.me and a.visibilita = 'pubblica'
      else
        a.user_id <> io.me and a.visibilita = 'pubblica'
        and (
          p_chi = 'tutti'
          or (p_chi = 'amici' and exists (
                select 1 from public.relazioni r
                 where r.tipo = 'amicizia' and r.stato = 'accettata'
                   and ((r.da_id = io.me and r.a_id = a.user_id)
                     or (r.a_id = io.me and r.da_id = a.user_id))))
          -- La palestra conta solo se a me la si mostra (152ª): come
          -- dati_allenamento_per_me, che altrimenti la toglie dal json.
          or (p_chi = 'palestra'
              and public.vedo_palestra_di(a.user_id)
              and a.dati->>'palestraId' in (select palestra_id from zona))
        )
    end
  order by a.data desc, a.id desc
  limit least(greatest(coalesce(p_quanti, 20), 1), 50);
$$;
revoke all on function public.feed_allenamenti(text, timestamptz, text, int, text, double precision, uuid) from public, anon;
grant execute on function public.feed_allenamenti(text, timestamptz, text, int, text, double precision, uuid) to authenticated;

create or replace function public.allenamenti_di(
  p_utente uuid, p_prima_di timestamptz default null, p_prima_di_id text default null, p_quanti int default 20
)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  select * from public.feed_allenamenti('utente', p_prima_di, p_prima_di_id, p_quanti, null, 5, p_utente);
$$;
revoke all on function public.allenamenti_di(uuid, timestamptz, text, int) from public, anon;
grant execute on function public.allenamenti_di(uuid, timestamptz, text, int) to authenticated;

create or replace function public.conta_allenamenti_di(p_utente uuid)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*)
    from public.allenamenti a
   where a.user_id = p_utente
     and a.user_id <> auth.uid()
     and a.visibilita = 'pubblica'
     and public.vedo_allenamento(a.user_id, a.visibilita);
$$;
revoke all on function public.conta_allenamenti_di(uuid) from public, anon;
grant execute on function public.conta_allenamenti_di(uuid) to authenticated;

-- ponytail: rilegge schede_visibili() intera e filtra (una funzione security
-- definer non si "apre" nella query); le schede sono poche. Da riscrivere col
-- pezzo "Schede generali", quando schede_visibili se ne va.
create or replace function public.schede_di(p_utente uuid)
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean, dati jsonb)
language sql stable security definer set search_path = public as $$
  select * from public.schede_visibili() s where s.user_id = p_utente;
$$;
revoke all on function public.schede_di(uuid) from public, anon;
grant execute on function public.schede_di(uuid) to authenticated;

-- Il post aperto da un link o da una notifica: per id, o per la chiave di
-- prima della 106ª (id_allenamento). Gli altri solo pubblici, come nel feed.
create or replace function public.allenamento_per_chiave(p_chiave text)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select a.id, a.user_id, a.scheda_id, a.data,
    case
      when a.user_id = io.me then 0
      when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end,
    public.dati_allenamento_per_me(a.user_id, a.dati)
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where a.id = public.id_allenamento(p_chiave)
    and public.vedo_allenamento(a.user_id, a.visibilita)
    and (a.user_id = io.me or a.visibilita = 'pubblica');
$$;
revoke all on function public.allenamento_per_chiave(text) from public, anon;
grant execute on function public.allenamento_per_chiave(text) to authenticated;

create index if not exists allenamenti_data_id_idx on public.allenamenti (data desc, id desc);
create index if not exists allenamenti_utente_data_idx on public.allenamenti (user_id, data desc);
```

- [ ] **Step 2: Applicarla su dev**

Run: `grep '^DATABASE_URL=' .env | grep -o xfdzhiolqpcqekhvtpyw && npm run db -- --file supabase/migrations/20261104180000_feed_a_pagine.sql`
Expected: `xfdzhiolqpcqekhvtpyw` e `✅ … applicato`.

- [ ] **Step 3: Scrivere la verifica di equivalenza**

`$CLAUDE_JOB_DIR/tmp/equivalenza-feed.sql` — per ogni utente e linguetta, le pagine di 7 (per attraversare più pagine) messe in fila contro `allenamenti_visibili()` filtrata come faceva il client:

```sql
create temp table esito (uid uuid, chi text, nuovo text[], vecchio text[]);
do $$
declare u uuid; c text; pag text[]; dopo_d timestamptz; dopo_id text; r record; n int;
begin
  for u in select id from public.profili loop
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    foreach c in array array['tutti', 'amici', 'atleti', 'palestra'] loop
      pag := '{}'; dopo_d := null; dopo_id := null;
      loop
        n := 0;
        for r in select * from public.feed_allenamenti(c, dopo_d, dopo_id, 7, 'km', 50) loop
          pag := pag || r.id; dopo_d := r.data; dopo_id := r.id; n := n + 1;
        end loop;
        exit when n < 7;
      end loop;
      insert into esito values (u, c, pag, array(
        select v.dati->>'id' from public.allenamenti_visibili() v
          join public.allenamenti a on a.id = v.dati->>'id'
          join public.profili autore on autore.id = v.user_id
         where case c
           when 'atleti' then autore.pt_id = u and a.visibilita in ('pubblica', 'solo-pt')
                 and (autore.associato_il is null or a.data >= autore.associato_il)
           else v.user_id <> u and a.visibilita = 'pubblica' and (
             c = 'tutti'
             or (c = 'amici' and exists (select 1 from public.relazioni r2 where r2.tipo = 'amicizia' and r2.stato = 'accettata'
                   and ((r2.da_id = u and r2.a_id = v.user_id) or (r2.a_id = u and r2.da_id = v.user_id))))
             or (c = 'palestra' and v.dati->>'palestraId' in (select z::text from public.palestre_della_mia_zona('km', 50) z)))
           end
         order by a.data desc, a.id desc));
    end loop;
    insert into esito values (u, 'conta', array[(select count(*) from public.allenamenti_di((select id from public.profili where id <> u limit 1), null, null, 50))::text],
      array[public.conta_allenamenti_di((select id from public.profili where id <> u limit 1))::text]);
  end loop;
end $$;
select chi, count(*) casi, count(*) filter (where nuovo = vecchio) uguali,
       sum(cardinality(nuovo)) righe_nuove, sum(cardinality(vecchio)) righe_vecchie
  from esito group by chi order by chi;
```

Nota: si confronta col vecchio filtrato **in SQL** come lo faceva `filtraFeed`/`allenamentiDiUtente`; il filtro del client sulla palestra guardava `v.palestraId` del json, che `dati_allenamento_per_me` ha già tolto a chi non la vede — per questo il vecchio legge `v.dati` (già passato di lì).

- [ ] **Step 4: Lanciarla in transazione annullata**

Run: `npm run db -- "begin; $(cat $CLAUDE_JOB_DIR/tmp/equivalenza-feed.sql) rollback;"`
Expected: per ogni `chi` (`amici`, `atleti`, `conta`, `palestra`, `tutti`) `casi` = numero di profili (37) e `uguali` = `casi`. Se una riga ha `uguali < casi`, guardare quelle righe (`select * from esito where nuovo <> vecchio`) prima di andare avanti.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261104180000_feed_a_pagine.sql
git commit -m "Feed a pagine, il database: feed_allenamenti per chiave (data, id) e vedo_allenamento"
```

---

### Task 2: `src/lib/feedServer.js` e le sue prove

**Files:**
- Create: `src/lib/feedServer.js`
- Test: `src/lib/feedServer.test.js`

**Interfaces:**
- Consumes: le RPC del Task 1; `voceStorico` (src/lib/storico.js:122), `cancellatiDiRecente` (lib/storico, se esportata — altrimenti la funzione che la legge), `chiaveAllenamento` (src/lib/fotoAllenamento.js:48), `normalizzaScheda` (src/data/model), `messaggioErrore`, `supabase` (src/lib/supabase).
- Produces:
  - `PAGINA = 20`, `SOGLIA = 10`, `MAX_PAGINE = 5`
  - `vociDaRighe(righe, nomi: Map, usernames: Map) → voce[]` (pura)
  - `serveAltraPagina({ visibili: number, pagineLette: number, ancora: boolean }) → boolean` (pura)
  - `vociProprie(schede, { id, nome, username }) → voce[]` (pura: i propri allenamenti dallo store, nascosti compresi, dal più recente)
  - `leggiPaginaFeed({ chi, dopo = null, zona = null }) → Promise<{ ok, errore, voci, ancora, dopo }>`
  - `leggiPaginaUtente(utenteId, dopo = null)` → stessa forma
  - `contaAllenamentiDi(utenteId) → Promise<number|null>`
  - `schedeDi(utenteId) → Promise<Scheda[]>` (normalizzate, `!libera && visibileA`, dalla più nuova: come `schedeDiUtente`)
  - `allenamentoPerChiave(chiave) → Promise<voce|null>`
  - `dopo` = `{ data: string, id: string }` dell'ultima riga, o `null`

- [ ] **Step 1: Leggere prima cosa offre lib/storico**

Run: `grep -n "cancellatiDiRecente\|^export" src/lib/storico.js`
Serve a sapere come escludere gli allenamenti appena cancellati (oggi `allenamentiDiUtente`/`storicoGlobale` saltano `cancellatiDiRecente.has(c.data)`): se il Set non è esportato, esportarlo (`export const cancellatiDiRecente`) — è l'unica modifica a lib/storico.

- [ ] **Step 2: Scrivere le prove che falliscono**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serveAltraPagina, vociDaRighe, vociProprie } from './feedServer.js'

const riga = (id, data, user_id = 'u1', extra = {}) => ({
  id, user_id, scheda_id: 's1', data, relazione_pt: 0,
  dati: { id, data, nomeGiorno: 'Giorno A', esercizi: [], ...extra },
})

test('vociDaRighe: nomi, username e chiave come voceStorico', () => {
  const voci = vociDaRighe(
    [riga('a1', '2026-11-03T10:00:00Z'), riga('a2', '2026-11-02T10:00:00Z', 'u2')],
    new Map([['u1', 'Uno'], ['u2', 'Due']]),
    new Map([['u1', 'uno']]),
  )
  assert.equal(voci.length, 2)
  assert.equal(voci[0].utenteNome, 'Uno')
  assert.equal(voci[0].utenteUsername, 'uno')
  assert.equal(voci[1].utenteUsername, '')
  assert.equal(voci[0].schedaId, 's1')
  assert.equal(voci[0].id, 'a1')
})

test('serveAltraPagina: sotto soglia, con pagine e sotto il massimo', () => {
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 1, ancora: true }), true)
  assert.equal(serveAltraPagina({ visibili: 10, pagineLette: 1, ancora: true }), false)
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 1, ancora: false }), false)
  assert.equal(serveAltraPagina({ visibili: 3, pagineLette: 5, ancora: true }), false)
})

test('vociProprie: tutte le schede, nascosti compresi, dal più recente', () => {
  const schede = [
    { id: 's1', completamenti: [{ data: '2026-11-01T10:00:00Z', visibilita: 'nascosta' }] },
    { id: 's2', completamenti: [{ data: '2026-11-03T10:00:00Z', visibilita: 'pubblica' }] },
  ]
  const voci = vociProprie(schede, { id: 'me', nome: 'Io', username: 'io' })
  assert.deepEqual(voci.map((v) => v.schedaId), ['s2', 's1'])
  assert.equal(voci[0].utenteId, 'me')
  assert.ok(voci[1].id, 'ogni voce ha la sua chiave')
})
```

- [ ] **Step 3: Vedere che falliscono**

Run: `node --test src/lib/feedServer.test.js`
Expected: FAIL, `Cannot find module` / export mancante.

- [ ] **Step 4: Scrivere `src/lib/feedServer.js`**

```js
import { normalizzaScheda } from '../data/model'
import { cancellatiDiRecente, voceStorico } from './storico'
import { chiaveAllenamento } from './fotoAllenamento'
import { visibileA } from './visibilita'
import { messaggioErrore, supabase } from './supabase'

// ---------------------------------------------------------------------------
// Il feed e il profilo A PAGINE (spec 2026-11-04-feed-a-pagine-design.md).
//
// Prima feed e profilo partivano da lib/collettivo: TUTTI gli allenamenti che
// si possono vedere, di tutti, a ogni apertura. Cresceva con utenti × storia.
// Qui il server dà 20 allenamenti alla volta, dal più recente
// (`feed_allenamenti`, migrazione 20261104180000), e la pagina chiede la
// successiva quando il fondo arriva a schermo. Le voci sono quelle di sempre
// (`voceStorico`): le card non se ne accorgono.
//
// ⚠️ I filtri "chi" (amici, palestra, atleti) li fa il database; gruppi,
// durata ed esercizio restano nel browser (lib/feed) sulle voci lette, e se ne
// lasciano poche si legge da soli fino a MAX_PAGINE. Un filtro raro guarda
// quindi solo gli ultimi 100 allenamenti: scelta dell'utente (2026-11-04).
// ---------------------------------------------------------------------------

export const PAGINA = 20
export const SOGLIA = 10
export const MAX_PAGINE = 5

/** Righe del server + nomi → le voci dello storico, saltando le appena cancellate. */
export function vociDaRighe(righe, nomi, usernames) {
  return (righe || [])
    .filter((r) => r.dati?.data && !cancellatiDiRecente.has(r.dati.data))
    .map((r) =>
      voceStorico({
        utenteId: r.user_id,
        utenteNome: nomi.get(r.user_id) || '',
        utenteUsername: usernames.get(r.user_id) || '',
        schedaId: r.scheda_id,
        relazionePt: r.relazione_pt || 0,
        completamento: r.dati,
      }),
    )
}

/** Con i filtri del browser, servono altre voci? */
export function serveAltraPagina({ visibili, pagineLette, ancora }) {
  return ancora && visibili < SOGLIA && pagineLette < MAX_PAGINE
}

/** I propri allenamenti, dalle proprie schede (lo store): nascosti compresi. */
export function vociProprie(schede, io) {
  const voci = []
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (!c?.data || cancellatiDiRecente.has(c.data)) continue
      voci.push(
        voceStorico({
          utenteId: io.id,
          utenteNome: io.nome || '',
          utenteUsername: io.username || '',
          schedaId: s.id,
          completamento: { ...c, id: c.id || chiaveAllenamento({ ...c, schedaId: s.id }) },
        }),
      )
    }
  }
  return voci.sort((a, b) => new Date(b.data) - new Date(a.data))
}

// I nomi solo di chi c'è nella pagina (`nomi_di` e `username_di`, come
// lib/collettivo): le regole sui profili restano quelle del database.
async function conNomi(righe) {
  const ids = [...new Set(righe.map((r) => r.user_id))]
  const nomi = new Map()
  const usernames = new Map()
  if (ids.length) {
    const [rn, ru] = await Promise.all([supabase.rpc('nomi_di', { ids }), supabase.rpc('username_di', { ids })])
    for (const r of rn.data || []) nomi.set(r.id, r.nome)
    for (const r of ru.data || []) if (r.username) usernames.set(r.id, r.username)
  }
  return vociDaRighe(righe, nomi, usernames)
}

async function pagina(rpc, argomenti) {
  const { data, error } = await supabase.rpc(rpc, { ...argomenti, p_quanti: PAGINA })
  if (error) {
    console.warn(`Lettura di ${rpc} fallita`, error.message)
    return { ok: false, errore: messaggioErrore(error), voci: [], ancora: false, dopo: null }
  }
  const righe = data || []
  const ultima = righe.at(-1)
  return {
    ok: true,
    errore: '',
    voci: await conNomi(righe),
    ancora: righe.length === PAGINA,
    dopo: ultima ? { data: ultima.data, id: ultima.id } : null,
  }
}

/** Una pagina del feed. `zona` = { modo, km } per la linguetta palestra. */
export function leggiPaginaFeed({ chi, dopo = null, zona = null }) {
  return pagina('feed_allenamenti', {
    p_chi: chi,
    p_prima_di: dopo?.data ?? null,
    p_prima_di_id: dopo?.id ?? null,
    p_modo: zona?.modo ?? null,
    p_km: zona?.km ?? 5,
  })
}

/** Una pagina degli allenamenti pubblici di un altro (il suo profilo). */
export function leggiPaginaUtente(utenteId, dopo = null) {
  return pagina('allenamenti_di', {
    p_utente: utenteId,
    p_prima_di: dopo?.data ?? null,
    p_prima_di_id: dopo?.id ?? null,
  })
}

/** Quanti allenamenti di un altro vedo: il numero in cima al profilo. */
export async function contaAllenamentiDi(utenteId) {
  const { data, error } = await supabase.rpc('conta_allenamenti_di', { p_utente: utenteId })
  if (error) {
    console.warn('Conto degli allenamenti non riuscito', error.message)
    return null
  }
  return Number(data) || 0
}

/** Le schede di un altro che si vedono sul profilo (come schedeDiUtente). */
export async function schedeDi(utenteId) {
  const { data, error } = await supabase.rpc('schede_di', { p_utente: utenteId })
  if (error) {
    console.warn('Lettura delle schede non riuscita', error.message)
    return []
  }
  return (data || [])
    .map((r) => normalizzaScheda(r.dati))
    .filter((s) => !s.libera && visibileA(s))
    .sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0))
}

/** Un allenamento solo, per chiave (link o notifica), o null. */
export async function allenamentoPerChiave(chiave) {
  const { data, error } = await supabase.rpc('allenamento_per_chiave', { p_chiave: chiave })
  if (error || !data?.length) return null
  return (await conNomi(data))[0] || null
}
```

Se `voceStorico` non accetta `relazionePt` (controllare src/lib/storico.js:122): lasciarlo fuori — oggi le voci del feed non lo hanno.

- [ ] **Step 5: Vedere che passano, poi tutto**

Run: `node --test src/lib/feedServer.test.js && npm run test && npx oxlint src/lib/feedServer.js src/lib/storico.js`
Expected: PASS, `fail 0`, nessun errore di lint.

Se `node --test` non riesce a importare `./supabase` (usa `import.meta.env`): spostare le tre funzioni pure in `src/lib/feedVoci.js` (senza import di supabase), riesportarle da feedServer, e far puntare il test lì.

- [ ] **Step 6: Commit**

```bash
git add src/lib/feedServer.js src/lib/feedServer.test.js src/lib/storico.js
git commit -m "Feed a pagine: lib/feedServer (pagine, nomi della pagina, voci proprie dallo store)"
```

---

### Task 3: FeedPage a pagine

**Files:**
- Modify: `src/pages/FeedPage.jsx` (import righe 4-9; dati 114-235; lista 402-456)

**Interfaces:**
- Consumes: `leggiPaginaFeed`, `serveAltraPagina`, `vociProprie`, `allenamentoPerChiave` (Task 2); `useStore().schede`; `filtraFeed` (lib/feed) come oggi.

- [ ] **Step 1: Sostituire la sorgente dei dati**

Via `useCollettivo`, `storicoGlobale`, `allenamentiDiUtente`, `palestreDellaMiaZona` e lo stato della zona (`zonaRisposta`, `zonaPronta`, `palestraIds`). Al loro posto:

```jsx
const { schede } = useStore()
// Le voci lette dal server, pagina dopo pagina (lib/feedServer). Si riparte da
// capo a ogni linguetta, a ogni zona e a ogni tocco (`vaiA`).
const [lettura, setLettura] = useState({ voci: [], dopo: null, ancora: false, pagine: 0, caricando: true, errore: '' })
const [giro, setGiro] = useState(0)
const zona = ZONE.find((z) => z.id === zonaId).zona
const senzaPalestra = chi === 'palestra' && !miaPalestraId

const leggiAltra = useCallback(
  async (daCapo) => {
    if (soloChiave || senzaPalestra) return
    setLettura((l) => ({ ...l, caricando: true, errore: '' }))
    const esito = await leggiPaginaFeed({ chi, dopo: daCapo ? null : lettura.dopo, zona })
    setLettura((l) => {
      const prima = daCapo ? [] : l.voci
      if (!esito.ok) return { ...l, caricando: false, errore: esito.errore }
      return { voci: [...prima, ...esito.voci], dopo: esito.dopo, ancora: esito.ancora, pagine: (daCapo ? 0 : l.pagine) + 1, caricando: false, errore: '' }
    })
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [chi, zonaId, soloChiave, senzaPalestra, lettura.dopo],
)
useEffect(() => {
  leggiAltra(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [chi, zonaId, giro, soloChiave, senzaPalestra])
```

`vaiA` chiama `setGiro((g) => g + 1)` al posto di `ricarica()`; l'effetto che riporta in cima ascolta `lettura.voci` al posto di `dati`.

- [ ] **Step 2: Le voci**

```jsx
const mieiPost = useMemo(
  () => (soloChiave && ioId ? vociProprie(schede, { id: ioId, nome: utenteCorrente?.nome, username: utenteCorrente?.username }) : []),
  [soloChiave, ioId, schede, utenteCorrente?.nome, utenteCorrente?.username],
)
const [postAltrui, setPostAltrui] = useState(null)
useEffect(() => {
  if (!soloChiave || mieiPost.some(eQuello)) return undefined
  let vivo = true
  allenamentoPerChiave(soloChiave).then((v) => vivo && setPostAltrui(v))
  return () => {
    vivo = false
  }
}, [soloChiave, mieiPost, eQuello])

const voci = useMemo(
  () =>
    soloChiave
      ? mieiPost.some(eQuello)
        ? mieiPost
        : postAltrui ? [postAltrui] : []
      : filtraFeed(lettura.voci, { chi: 'tutti', ioId, gruppi, durate, esercizio }),
  [soloChiave, mieiPost, eQuello, postAltrui, lettura.voci, ioId, gruppi, durate, esercizio],
)
```

(`chi`, amici e palestra li ha già fatti il server: a `filtraFeed` resta `'tutti'`.)

- [ ] **Step 3: Altre pagine, da sole o in fondo**

```jsx
// Filtri del browser che lasciano poco: si legge la pagina dopo da soli.
useEffect(() => {
  if (soloChiave || lettura.caricando || lettura.errore) return
  if (serveAltraPagina({ visibili: voci.length, pagineLette: lettura.pagine, ancora: lettura.ancora })) leggiAltra(false)
}, [soloChiave, voci.length, lettura, leggiAltra])

// In fondo alla lista: quando entra a schermo, la pagina dopo.
const fondo = useRef(null)
useEffect(() => {
  const el = fondo.current
  if (!el || soloChiave || !lettura.ancora) return undefined
  const guarda = new IntersectionObserver((e) => e[0].isIntersecting && !lettura.caricando && leggiAltra(false), { root: schermo.current, rootMargin: '600px' })
  guarda.observe(el)
  return () => guarda.disconnect()
}, [soloChiave, lettura.ancora, lettura.caricando, leggiAltra])
```

Nella lista, dopo `voci.map(...)`:

```jsx
{!soloChiave && voci.length > 0 && (
  <div ref={fondo} className="feed-fondo">
    {lettura.errore && voci.length > 0 ? (
      <button type="button" className="btn btn-ghost" onClick={() => leggiAltra(false)}>
        Non sono riuscito a caricare gli altri · Riprova
      </button>
    ) : lettura.caricando ? (
      <p className="muted">Un attimo…</p>
    ) : null}
  </div>
)}
```

- [ ] **Step 4: Stati vuoti e attesa**

- `(caricando && tutte.length === 0) || (chi === 'palestra' && !zonaPronta && !soloChiave)` → `lettura.caricando && lettura.voci.length === 0 && !soloChiave`.
- `errore` in cima → `lettura.voci.length === 0 ? lettura.errore : ''`.
- Il messaggio della palestra senza risposta (`!zonaRisposta.ok`) → `lettura.errore || \`Nessuno ${descriviZona(zonaId)} ha ancora allenamenti pubblici. Prova una zona più larga nei Filtri.\``.
- `chi === 'atleti'` resta com'è.
- Il caso `soloChiave` con `postAltrui` ancora in arrivo mostra "Un attimo…" invece di "non c'è più": `soloChiave && !mieiPost.some(eQuello) && postAltrui === null` → attesa finché la richiesta non è tornata (tenere `postAltrui` a `undefined` finché non risponde, `null` = non c'è).

- [ ] **Step 5: Lint, prove, commit**

Run: `npx oxlint src/pages/FeedPage.jsx && npm run test`
Expected: nessun errore, `fail 0`.

```bash
git add src/pages/FeedPage.jsx
git commit -m "Feed a pagine: FeedPage legge 20 alla volta dal server, i miei post dallo store"
```

---

### Task 4: Profilo a pagine

**Files:**
- Modify: `src/pages/UtentePage.jsx` (import 5-6 e 18; righe 169-173; `ListaAllenamenti` 588-608; i conteggi 413-418 e 577-584)

**Interfaces:**
- Consumes: `vociProprie`, `leggiPaginaUtente`, `contaAllenamentiDi`, `schedeDi` (Task 2); `useStore().schede`.

- [ ] **Step 1: Sorgenti**

```jsx
const { schede: mieSchede } = useStore()
// Il MIO profilo dal telefono (nascosti compresi, col lucchetto); quello di un
// altro dal server, a pagine (lib/feedServer).
const [altrui, setAltrui] = useState({ per: null, voci: [], dopo: null, ancora: false, caricando: false, errore: '', quanti: null, schede: [] })
useEffect(() => {
  if (io || !id) return undefined
  let vivo = true
  setAltrui({ per: id, voci: [], dopo: null, ancora: false, caricando: true, errore: '', quanti: null, schede: [] })
  Promise.all([leggiPaginaUtente(id), contaAllenamentiDi(id), schedeDi(id)]).then(([p, quanti, schede]) => {
    if (!vivo) return
    setAltrui({ per: id, voci: p.voci, dopo: p.dopo, ancora: p.ancora, caricando: false, errore: p.errore, quanti, schede })
  })
  return () => {
    vivo = false
  }
}, [id, io])
const altre = useCallback(async () => {
  if (altrui.caricando || !altrui.ancora) return
  setAltrui((a) => ({ ...a, caricando: true }))
  const p = await leggiPaginaUtente(id, altrui.dopo)
  setAltrui((a) => (a.per !== id ? a : p.ok
    ? { ...a, voci: [...a.voci, ...p.voci], dopo: p.dopo, ancora: p.ancora, caricando: false, errore: '' }
    : { ...a, caricando: false, errore: p.errore }))
}, [id, altrui])

const allenamenti = useMemo(
  () => (io ? vociProprie(mieSchede, { id, nome: utenteCorrente?.nome, username: utenteCorrente?.username }) : altrui.voci),
  [io, mieSchede, id, utenteCorrente?.nome, utenteCorrente?.username, altrui.voci],
)
const schede = useMemo(
  () => (io ? mieSchede.filter((s) => !s.libera && visibileA(s)).sort((a, b) => new Date(b.creataIl || 0) - new Date(a.creataIl || 0)) : altrui.schede),
  [io, mieSchede, altrui.schede],
)
const quantiAllenamenti = io ? allenamenti.length : altrui.quanti ?? allenamenti.length
```

Via `useCollettivo`, `allenamentiDiUtente`, `schedeDiUtente` dagli import; aggiungere `useStore`, `visibileA` (lib/visibilita), le quattro da lib/feedServer.

- [ ] **Step 2: Numeri e fondo della lista**

- `<strong>{allenamenti.length}</strong>` (riga ~413) e `Allenamenti · {allenamenti.length}` (~577) → `quantiAllenamenti`.
- Dopo `<ListaAllenamenti …/>`, se `!io`:

```jsx
{!io && altrui.ancora && (
  <div className="feed-fondo">
    <button type="button" className="btn btn-ghost" disabled={altrui.caricando} onClick={altre}>
      {altrui.errore ? 'Non sono riuscito a caricare gli altri · Riprova' : altrui.caricando ? 'Un attimo…' : 'Mostra altri'}
    </button>
  </div>
)}
```

(Un bottone e non il segnaposto automatico: sul profilo la lista sta dentro una linguetta, sotto la testata, e un `IntersectionObserver` sullo scroll della pagina intera non aggiunge niente a un tocco.)

- [ ] **Step 3: Lint, prove, commit**

Run: `npx oxlint src/pages/UtentePage.jsx && npm run test`
Expected: nessun errore, `fail 0`.

```bash
git add src/pages/UtentePage.jsx
git commit -m "Profilo a pagine: il mio dal telefono, quello di un altro 20 alla volta col numero dal server"
```

---

### Task 5: Prova nel browser su dev

**Files:**
- Create (fuori dal repo): `$CLAUDE_JOB_DIR/tmp/prova-feed-pagine.mjs`

- [ ] **Step 1: Server su dev**

Run (in background): `npx vite --port 5180 --strictPort` — `.env` su dev (controllato nel Task 1).

- [ ] **Step 2: Lo script**

Stesso impianto di `$CLAUDE_JOB_DIR/tmp/prova-notifiche.mjs` (playwright-core in `$CLAUDE_JOB_DIR/tmp`, chrome-headless-shell-1243, accesso `cccc` / `prova123`). Conta richieste e **byte** delle risposte (`response.body()` lunghezza) per `/rest/v1/rpc/allenamenti_visibili`, `schede_visibili`, `feed_allenamenti`, `allenamenti_di`, `conta_allenamenti_di`, `schede_di`. Passi, con screenshot a ognuno:
1. Social → feed (`routes.feed()` o la voce della barra): numero di card `.post-schermo`, chiamate.
2. Scorrere in fondo (`schermo.scrollTo(…scrollHeight)`): arriva la seconda pagina se c'erano più di 20 pubblici (su dev 44 → sì).
3. Linguetta Amici, poi Per te: una `feed_allenamenti` per tocco.
4. Un filtro (Filtri → un gruppo): nessun errore, card coerenti.
5. Il proprio profilo: **zero** `feed_allenamenti`/`allenamenti_di`.
6. Il profilo dell'autore della prima card: `allenamenti_di` + `conta_allenamenti_di` + `schede_di`.
7. `pageerror` e `console.error`: devono essere vuoti.

- [ ] **Step 3: Confronto coi byte di prima**

`git stash` non basta (ci sono commit): `git worktree add $CLAUDE_JOB_DIR/tmp/prima main`, `npx vite --port 5181` da lì, stesso script sul passo 1 con `INDIRIZZO` sulla 5181. Annotare i byte scaricati aprendo il feed: prima (`allenamenti_visibili` + `schede_visibili`) contro dopo (`feed_allenamenti` + nomi). Poi `git worktree remove $CLAUDE_JOB_DIR/tmp/prima`.

- [ ] **Step 4: Spegnere i server**

---

## Dopo

- Prima del merge su `main`: lanciare `20261104160000_notifiche_nuove` e `20261104180000_feed_a_pagine` in produzione (`npm run db -- --schema` con `PROD_DATABASE_URL`), poi pushare.
- Pezzi successivi (spec loro): Schede generali, Consigliato, Atleti del PT, poi via `allenamenti_visibili`/`schede_visibili`.
