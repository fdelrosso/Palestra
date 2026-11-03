-- ===========================================================================
-- 2026-10-28 — PT: "solo PT", Check e video, commenti col PT, agenda del PT.
--
-- Tutto ADDITIVO e rilanciabile: colonne nuove con default, tabelle nuove,
-- funzioni nuove. Nessuna rinomina, niente di cancellato.
-- ===========================================================================


-- --- 1. Solo PT ------------------------------------------------------------
-- `ruolo` resta 'atleta' | 'pt' (lo leggono tante funzioni con `ruolo = 'pt'`,
-- e un terzo valore le avrebbe rotte). Quello che mancava e' dire se un PT si
-- allena anche lui: `si_allena = false` = solo PT, l'app gli toglie tutta la
-- parte personale. Per un atleta vale sempre true.
alter table public.profili
  add column if not exists si_allena boolean not null default true;


-- --- 2. Check e video ------------------------------------------------------
-- La sezione "Foto progressi" diventa "Check e video": dentro, il check del
-- fisico (come prima) e le ESECUZIONI, i video di un esercizio da far
-- correggere al PT. Stessa tabella, stesse regole di visibilita'.
alter table public.progressi
  add column if not exists categoria text not null default 'check'
    check (categoria in ('check', 'esecuzione'));
-- Il nome dell'esercizio, per le esecuzioni. Facoltativo.
alter table public.progressi
  add column if not exists esercizio text not null default ''
    check (char_length(esercizio) <= 80);
-- Quando l'atleta l'ha aperta al PT l'ultima volta: e' la notifica del PT.
-- La scrive il trigger qui sotto, mai l'app.
alter table public.progressi
  add column if not exists condivisa_il timestamptz;

create or replace function public.progressi_condivisa_il()
returns trigger language plpgsql as $$
begin
  if new.visibilita = 'pt'
     and (tg_op = 'INSERT' or old.visibilita is distinct from 'pt') then
    new.condivisa_il := now();
  elsif tg_op = 'UPDATE' then
    -- Nessuno la riscrive a mano: resta quella di prima.
    new.condivisa_il := old.condivisa_il;
  end if;
  return new;
end;
$$;

drop trigger if exists progressi_condivisa_il on public.progressi;
create trigger progressi_condivisa_il
  before insert or update on public.progressi
  for each row execute function public.progressi_condivisa_il();

-- Chi puo' vedere uno scatto: la stessa condizione della policy di lettura.
create or replace function public.posso_vedere_scatto(p_id text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.progressi p
     where p.id = p_id
       and (p.atleta_id = auth.uid()
            or (p.visibilita = 'pt' and public.e_mio_atleta(p.atleta_id)))
  );
$$;
revoke all on function public.posso_vedere_scatto(text) from public, anon;
grant execute on function public.posso_vedere_scatto(text) to authenticated;


-- --- 3. I commenti fra atleta e PT su uno scatto ---------------------------
-- Avanti e indietro: il PT corregge, l'atleta risponde. Solo sugli scatti
-- aperti al PT (su uno privato non c'e' nessuno con cui parlare).
create table if not exists public.progressi_commenti (
  id           uuid primary key default gen_random_uuid(),
  progresso_id text not null references public.progressi(id) on delete cascade,
  autore_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  testo        text not null check (char_length(btrim(testo)) between 1 and 2000),
  creato_il    timestamptz not null default now()
);
create index if not exists progressi_commenti_idx
  on public.progressi_commenti (progresso_id, creato_il);

alter table public.progressi_commenti enable row level security;

drop policy if exists "commenti scatto: li legge chi vede lo scatto" on public.progressi_commenti;
create policy "commenti scatto: li legge chi vede lo scatto" on public.progressi_commenti
  for select to authenticated using (public.posso_vedere_scatto(progresso_id));

drop policy if exists "commenti scatto: atleta e suo PT, se aperto" on public.progressi_commenti;
create policy "commenti scatto: atleta e suo PT, se aperto" on public.progressi_commenti
  for insert to authenticated with check (
    autore_id = auth.uid()
    and exists (
      select 1 from public.progressi p
       where p.id = progresso_id
         and p.visibilita = 'pt'
         and (p.atleta_id = auth.uid() or public.e_mio_atleta(p.atleta_id))
    )
  );

drop policy if exists "commenti scatto: cancello i miei" on public.progressi_commenti;
create policy "commenti scatto: cancello i miei" on public.progressi_commenti
  for delete to authenticated using (autore_id = auth.uid());


-- --- 4. Le notifiche di Check e video --------------------------------------
-- Al PT: "X ti ha mandato un video/una foto". A tutti e due: "Y ha commentato".
-- Il "letto" e' lo stesso del cuoricino (`notifiche_lette`): un numero rosso
-- solo, una pagina sola.
create or replace function public.notifiche_check()
returns table (
  progresso_id text,
  atleta_id    uuid,
  atleta_nome  text,
  categoria    text,
  tipo         text,
  chi_nome     text,
  quando       timestamptz,
  testo        text,
  nuovo        boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  ),
  visibili as (
    select p.*
      from public.progressi p
     where p.atleta_id = auth.uid()
        or (p.visibilita = 'pt' and public.e_mio_atleta(p.atleta_id))
  ),
  eventi as (
    -- Al PT: uno scatto che l'atleta gli ha aperto (non quelli caricati da lui).
    select v.id, v.atleta_id, v.categoria, 'condiviso'::text as tipo,
           v.atleta_id as chi, v.condivisa_il as quando, v.nota as testo
      from visibili v
     where v.atleta_id <> auth.uid()
       and v.caricato_da = v.atleta_id
       and v.visibilita = 'pt'
       and v.condivisa_il is not null
    union all
    select v.id, v.atleta_id, v.categoria, 'commento'::text,
           c.autore_id, c.creato_il, c.testo
      from public.progressi_commenti c
      join visibili v on v.id = c.progresso_id
     where c.autore_id <> auth.uid()
  )
  select e.id, e.atleta_id, pa.nome, e.categoria, e.tipo, pc.nome,
         e.quando, e.testo, e.quando > (select il from letto)
    from eventi e
    join public.profili pa on pa.id = e.atleta_id
    join public.profili pc on pc.id = e.chi
   where not public.bloccato_con(e.chi)
   order by e.quando desc
   limit 200;
$$;
revoke all on function public.notifiche_check() from public, anon;
grant execute on function public.notifiche_check() to authenticated;


-- --- 5. L'agenda del PT ----------------------------------------------------
-- Il calendario della Home di un PT: serve a PIANIFICARE (una lezione alle 18
-- con Marco, una valutazione), non a registrare allenamenti. Solo suo.
create table if not exists public.agenda_pt (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data       date not null,
  -- 'HH:MM' o vuota (tutto il giorno).
  ora        text not null default '' check (ora = '' or ora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  titolo     text not null check (char_length(btrim(titolo)) between 1 and 120),
  nota       text not null default '' check (char_length(nota) <= 500),
  -- Con chi, se e' con un atleta. Resta l'impegno se il legame si scioglie.
  atleta_id  uuid references auth.users(id) on delete set null,
  creato_il  timestamptz not null default now()
);
create index if not exists agenda_pt_idx on public.agenda_pt (user_id, data);

alter table public.agenda_pt enable row level security;

drop policy if exists "agenda pt: la mia" on public.agenda_pt;
create policy "agenda pt: la mia" on public.agenda_pt
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
