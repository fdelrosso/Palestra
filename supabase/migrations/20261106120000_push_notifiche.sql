-- ===========================================================================
-- LE NOTIFICHE PUSH: mi piace e commenti sui miei allenamenti, ad app chiusa.
--
--   mi piace o commento → trigger → Edge Function invia-push → Firebase → telefono
--
-- Le regole stanno tutte qui, in `push_da_inviare`, e sono quelle del cuoricino
-- (`notifiche_interazioni`): niente per i miei gesti, per chi è bloccato con me
-- o per i commenti nascosti in attesa di un moderatore.
--
-- ⚠️ Senza una riga in `push_config` il trigger non fa niente: lanciare questo file
-- non accende le notifiche. Si accendono scrivendo lì indirizzo e segreto della
-- funzione, per ogni database a parte. Il segreto NON sta in questo file.
-- ===========================================================================
create extension if not exists pg_net;

-- I telefoni di ognuno. Un token è di un solo account: su un telefono passato a
-- un altro account (registra_push_token) cambia padrone.
create table if not exists public.push_token (
  token         text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  aggiornato_il timestamptz not null default now()
);
create index if not exists push_token_user_idx on public.push_token (user_id);
-- Nessuna regola: dall'app si passa solo dalle due funzioni qui sotto.
alter table public.push_token enable row level security;

create or replace function public.registra_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  insert into public.push_token (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = auth.uid(), aggiornato_il = now();
end;
$$;
revoke all on function public.registra_push_token(text) from public, anon;
grant execute on function public.registra_push_token(text) to authenticated;

create or replace function public.togli_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_token where token = p_token and user_id = auth.uid();
$$;
revoke all on function public.togli_push_token(text) from public, anon;
grant execute on function public.togli_push_token(text) to authenticated;

-- Cosa ricevere (Profilo). Nessuna riga = tutto acceso.
create table if not exists public.push_preferenze (
  user_id  uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  mi_piace boolean not null default true,
  commento boolean not null default true
);
alter table public.push_preferenze enable row level security;
drop policy if exists "push preferenze: solo le mie" on public.push_preferenze;
create policy "push preferenze: solo le mie" on public.push_preferenze
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Dove sta la funzione, e il segreto per chiamarla. Una riga sola, per database.
create table if not exists public.push_config (
  unica   boolean primary key default true check (unica),
  url     text not null,
  segreto text not null
);
alter table public.push_config enable row level security;

-- Togliere e rimettere un mi piace non deve far suonare il telefono ogni volta.
create table if not exists public.push_gia_avvisato (
  allenamento_key text not null,
  autore          uuid not null references auth.users(id) on delete cascade,
  primary key (allenamento_key, autore)
);
alter table public.push_gia_avvisato enable row level security;

-- A chi va e cosa dire. Vuoto = niente da mandare.
create or replace function public.push_da_inviare(p_key text, p_tipo text, p_autore uuid)
returns table (tokens text[], nomi text[], persone bigint, quanti bigint, ultimo_testo text)
language plpgsql security definer set search_path = public as $$
declare
  dest uuid;
begin
  select a.user_id into dest from public.allenamenti a where a.id::text = p_key;
  if dest is null or dest = p_autore then return; end if;
  if exists (select 1 from public.blocchi b
              where (b.da_id = dest and b.a_id = p_autore) or (b.a_id = dest and b.da_id = p_autore)) then
    return;
  end if;
  if exists (select 1 from public.push_preferenze x
              where x.user_id = dest and not (case when p_tipo = 'mi_piace' then x.mi_piace else x.commento end)) then
    return;
  end if;
  if p_tipo = 'mi_piace' then
    insert into public.push_gia_avvisato (allenamento_key, autore) values (p_key, p_autore)
    on conflict do nothing;
    if not found then return; end if;
  end if;

  return query
  with eventi as (
    select m.user_id, m.creato_il, null::text as testo
      from public.allenamento_mi_piace m
     where p_tipo = 'mi_piace' and m.allenamento_key = p_key
    union all
    select c.user_id, c.creato_il, c.testo
      from public.allenamento_commenti c
     where p_tipo = 'commento' and c.allenamento_key = p_key and not public.in_attesa('commento', c.id)
  ),
  validi as (
    select e.*, p.nome
      from eventi e
      join public.profili p on p.id = e.user_id
     where e.user_id <> dest
       and not exists (select 1 from public.blocchi b
                        where (b.da_id = dest and b.a_id = e.user_id) or (b.a_id = dest and b.da_id = e.user_id))
  ),
  per_persona as (
    select v.nome, v.user_id, max(v.creato_il) as quando from validi v group by v.user_id, v.nome
  )
  select (select array_agg(t.token) from public.push_token t where t.user_id = dest),
         (select array_agg(pp.nome order by pp.quando desc)
            from (select * from per_persona order by quando desc limit 3) pp),
         (select count(*) from per_persona),
         (select count(*) from validi),
         (select v.testo from validi v order by v.creato_il desc limit 1)
   where exists (select 1 from validi)
     and exists (select 1 from public.push_token t where t.user_id = dest);
end;
$$;
revoke all on function public.push_da_inviare(text, text, uuid) from public, anon, authenticated;
grant execute on function public.push_da_inviare(text, text, uuid) to service_role;

-- ⚠️ Non deve MAI impedire un mi piace o un commento: se qualcosa non va, niente
-- notifica e si va avanti.
create or replace function public.push_su_interazione()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg public.push_config;
begin
  select * into cfg from public.push_config limit 1;
  if cfg.url is null then return new; end if;
  perform net.http_post(
    url := cfg.url,
    body := jsonb_build_object('tipo', tg_argv[0], 'allenamento_key', new.allenamento_key, 'autore', new.user_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segreto', cfg.segreto)
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_su_interazione() from public, anon, authenticated;

drop trigger if exists push_mi_piace on public.allenamento_mi_piace;
create trigger push_mi_piace after insert on public.allenamento_mi_piace
  for each row execute function public.push_su_interazione('mi_piace');
drop trigger if exists push_commento on public.allenamento_commenti;
create trigger push_commento after insert on public.allenamento_commenti
  for each row execute function public.push_su_interazione('commento');
