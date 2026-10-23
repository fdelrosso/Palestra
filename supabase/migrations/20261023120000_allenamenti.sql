-- ===========================================================================
-- GLI ALLENAMENTI SVOLTI IN UNA TABELLA LORO (2026-10-23)
--
-- Si applica DOPO supabase/schema.sql, ed e' rilanciabile come lui.
--
-- Fino a oggi un allenamento svolto era un elemento di `schede.dati ->
-- 'completamenti'`. Ne venivano quattro guai:
--   · nessuna identita': lo si riconosceva da '<scheda_id>|<data ISO>', che
--     cambia quando si corregge la data (da qui `sposta_interazioni`);
--   · ogni salvataggio della scheda riscriveva tutta la cronologia;
--   · il feed srotolava il json di TUTTE le schede di TUTTI a ogni chiamata;
--   · fare un recap (del mese, dell'anno, di fine scheda) voleva dire fare
--     lo stesso, a mano, nell'app.
--
-- Qui nasce `allenamenti`: una riga per allenamento. `dati` e' il
-- completamento intero, come lo conosce l'app (src/data/model.js); fuori dal
-- json, ripetute, le colonne su cui si filtra (chi, quale scheda, quando, chi
-- lo vede). Le scrive chi scrive `dati`, dallo stesso oggetto.
--
-- `id` e' la chiave di sempre, '<scheda_id>|<data ISO>': mi piace, commenti,
-- foto, segnalazioni e link condivisi (/post/<chiave>) continuano a puntarlo.
-- ponytail: come prima, correggere la data cambia la chiave (e
-- `sposta_interazioni` porta dietro mi piace e commenti). Una chiave fissata
-- alla nascita, con le FK vere da mi piace e commenti, e' il passo dopo.
--
-- ⚠️ PERIODO DI PASSAGGIO. Finche' l'app scrive ancora `completamenti` dentro
-- la scheda, un trigger li specchia qui (inserisce, aggiorna, toglie). Il giorno
-- in cui l'app scrive direttamente qui, toglie la voce `completamenti` dal json
-- e il trigger smette da solo di fare qualcosa. Le funzioni del feed leggono
-- gia' da qui.
-- ===========================================================================

create table if not exists public.allenamenti (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Come prima: cancellare una scheda cancella i suoi allenamenti (archiviarla
  -- no). Se un giorno la cronologia dovesse sopravvivere, `on delete set null`.
  scheda_id   text references public.schede(id) on delete cascade,
  data        timestamptz not null,
  -- Campo assente = NASCOSTO, come in src/lib/visibilita.js.
  visibilita  text not null default 'nascosta'
              check (visibilita in ('pubblica', 'solo-pt', 'nascosta')),
  -- Finito ma non ancora salvato (components/Riepilogo).
  da_salvare  boolean not null default false,
  dati        jsonb not null default '{}'::jsonb,
  creato_il   timestamptz not null default now()
);
create index if not exists allenamenti_utente_data_idx on public.allenamenti (user_id, data desc);
create index if not exists allenamenti_scheda_idx on public.allenamenti (scheda_id);
create index if not exists allenamenti_pubblici_idx on public.allenamenti (data desc) where visibilita = 'pubblica';

alter table public.allenamenti enable row level security;

-- I propri e basta, come le schede: gli altri li leggono solo attraverso le
-- funzioni qui sotto, che sanno chi puo' vedere cosa.
-- ⚠️ Nessun controllo che `scheda_id` sia una MIA scheda. Un allenamento puo'
-- arrivare prima della sua scheda nuova (due righe, due invii): con la regola
-- qui sarebbe un "non hai il permesso", che la coda dell'app (lib/sync) butta
-- per sempre; senza, e' la FK a dire "non ancora", e la coda riprova. Agganciare
-- un allenamento proprio alla scheda di un altro non mostra niente di nessuno.
-- E una policy che nomina `schede.id` farebbe fallire l'`alter column id type
-- text` di schema.sql, cioe' rilanciarlo.
drop policy if exists "allenamenti: solo i miei" on public.allenamenti;
create policy "allenamenti: solo i miei" on public.allenamenti
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- --------------------------------------------------------------------------
-- IL TRIGGER DEL PASSAGGIO: `completamenti` di una scheda -> `allenamenti`.
--
-- Solo se la voce `completamenti` c'e': chi la scrive (l'app di oggi, o una
-- vecchia scheda aperta da qualche parte) la tiene completa, quindi la si
-- prende come la verita' su quella scheda. Senza la voce, non si tocca niente.
--
-- ponytail: una data corretta dall'app vecchia = riga tolta e riga nuova
-- (chiave nuova), come succedeva gia' alla chiave; mi piace e commenti li
-- sposta ancora `sposta_interazioni`. Sparisce col trigger.
-- --------------------------------------------------------------------------
create or replace function public.specchia_completamenti(p_scheda text, p_utente uuid, p_dati jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dati is null or not (p_dati ? 'completamenti') then
    return;
  end if;

  -- ⚠️ Solo righe con una chiave vecchia nell'id: quelle con un id vero
  -- (20261023180000_allenamenti_id.sql) un json non le conosce.
  delete from public.allenamenti a
   where a.scheda_id = p_scheda
     and position('|' in a.id) > 0
     and a.id not in (
       select p_scheda || '|' || (c ->> 'data')
         from jsonb_array_elements(coalesce(p_dati -> 'completamenti', '[]'::jsonb)) c
        where c ->> 'data' is not null);

  insert into public.allenamenti (id, user_id, scheda_id, data, visibilita, da_salvare, dati)
  select p_scheda || '|' || (c ->> 'data'),
         p_utente,
         p_scheda,
         (c ->> 'data')::timestamptz,
         coalesce(nullif(c ->> 'visibilita', ''), 'nascosta'),
         coalesce((c ->> 'daSalvare')::boolean, false),
         c || jsonb_build_object('schedaId', p_scheda)
    from jsonb_array_elements(coalesce(p_dati -> 'completamenti', '[]'::jsonb)) c
   where c ->> 'data' is not null
  on conflict (id) do update
     set data = excluded.data,
         visibilita = excluded.visibilita,
         da_salvare = excluded.da_salvare,
         dati = excluded.dati
   where (allenamenti.data, allenamenti.visibilita, allenamenti.da_salvare, allenamenti.dati)
         is distinct from (excluded.data, excluded.visibilita, excluded.da_salvare, excluded.dati);
end;
$$;

revoke all on function public.specchia_completamenti(text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.scheda_specchia_completamenti()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.specchia_completamenti(new.id, new.user_id, new.dati);
  return new;
end;
$$;

drop trigger if exists scheda_specchia_completamenti on public.schede;
create trigger scheda_specchia_completamenti after insert or update of dati on public.schede
  for each row execute function public.scheda_specchia_completamenti();

-- Quelli che ci sono gia'. ⚠️ Solo la prima volta (tabella vuota): rilanciata
-- dopo, la ricopia dai json riporterebbe indietro le correzioni fatte nell'app
-- nuova, che il json non conosce.
do $$ begin
  if not exists (select 1 from public.allenamenti) then
    perform public.specchia_completamenti(s.id, s.user_id, s.dati) from public.schede s;
  end if;
end $$;


-- --------------------------------------------------------------------------
-- LE SERIE FATTE, UNA PER RIGA: la base dei recap.
--
--   select esercizio, count(*) as serie, sum(kg * rip) as volume, max(kg)
--     from serie_svolte
--    where data >= '2026-10-01' and data < '2026-11-01' and not da_salvare
--    group by esercizio;
--
-- `security_invoker`: chi la interroga vede solo le righe che la RLS di
-- `allenamenti` gli lascia vedere, cioe' le proprie.
-- ponytail: e' una vista sul json; se i recap diventano lenti, la si fa
-- tabella riempita da un trigger, e le query restano uguali.
-- --------------------------------------------------------------------------
create or replace view public.serie_svolte with (security_invoker = on) as
select a.id as allenamento_id,
       a.user_id,
       a.scheda_id,
       a.data,
       a.da_salvare,
       e.n as esercizio_n,
       e.x ->> 'nome' as esercizio,
       e.x ->> 'esercizioId' as esercizio_id,
       nullif(e.x ->> 'gruppo', '') as gruppo,
       st.n as serie_n,
       st.x ->> 'colore' as colore,
       case when jsonb_typeof(st.x -> 'kg') = 'number' then (st.x ->> 'kg')::numeric end as kg,
       case when jsonb_typeof(st.x -> 'rip') = 'number' then (st.x ->> 'rip')::numeric end as rip
  from public.allenamenti a
  cross join lateral jsonb_array_elements(coalesce(a.dati -> 'esercizi', '[]'::jsonb)) with ordinality as e(x, n)
  cross join lateral jsonb_array_elements(coalesce(e.x -> 'sets', '[]'::jsonb)) with ordinality as st(x, n);

revoke all on public.serie_svolte from anon;


-- --------------------------------------------------------------------------
-- LE FUNZIONI CHE SROTOLAVANO IL JSON, ORA SULLA TABELLA.
-- Stesse regole, stesse colonne, stesse risposte (vedi i commenti originali in
-- schema.sql). ⚠️ Rilanciare schema.sql le riporta alla versione sul json: con
-- il trigger qui sopra rispondono uguale, solo piu' lente. Quindi dopo
-- schema.sql si rilancia sempre anche questa cartella.
-- --------------------------------------------------------------------------
create or replace function public.allenamenti_visibili()
returns table (
  user_id uuid,
  scheda_id text,
  relazione_pt int,
  dati jsonb
)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select
    a.user_id,
    a.scheda_id,
    case
      when a.user_id = io.me then 0
      when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end as relazione_pt,
    a.dati
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where not public.bloccato_con(a.user_id)
    and (a.user_id = io.me
     or (a.visibilita = 'pubblica' and not public.pubblicazione_bloccata(a.user_id))
     or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id)));
$$;

create or replace function public.posso_vedere_allenamento(chiave text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.allenamenti a
     where a.id = $1
       and not public.bloccato_con(a.user_id)
       and (
         a.user_id = auth.uid()
         or a.visibilita = 'pubblica'
         or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id))
       )
  );
$$;

create or replace function public.post_pubblico(chiave text)
returns table (
  user_id   uuid,
  nome      text,
  scheda_id text,
  dati      jsonb,
  mi_piace  bigint,
  commenti  bigint
)
language sql stable security definer set search_path = public as $$
  select a.user_id,
         p.nome,
         a.scheda_id,
         a.dati,
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = $1),
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = $1 and not public.in_attesa('commento', c.id))
    from public.allenamenti a
    join public.profili p on p.id = a.user_id
   where a.id = $1
     and a.visibilita = 'pubblica'
   limit 1;
$$;

create or replace function public.nomi_di(ids uuid[])
returns table (id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome
    from public.profili p
   where p.id = any(ids)
     and not public.bloccato_con(p.id)
     and (
       p.id = auth.uid()
       or public.ho_relazione_con(p.id)
       or exists (select 1 from public.schede s where s.user_id = p.id and s.visibilita = 'pubblica')
       or exists (select 1 from public.allenamenti a where a.user_id = p.id and a.visibilita = 'pubblica')
     );
$$;
