-- ===========================================================================
-- 2026-11-01 — Da quando un PT segue un atleta: il legame si ricorda 3 mesi.
--
-- Il PT vede gli allenamenti dell'atleta da `profili.associato_il`. Finito il
-- legame quella data si perde: se i due si ritrovavano dopo poco, il PT non
-- vedeva piu' niente di prima. Ora resta da parte per 3 mesi: tornati insieme
-- entro quel tempo si riparte dalla data vecchia, dopo si ricomincia da zero.
--
-- `legato_il` e' invece il momento vero del legame, anche ripreso: serve alla
-- notifica "Nuovo atleta seguito", che con la data vecchia non arriverebbe.
--
-- `imposta_inizio_atleta`: i legami senza data se la fa scegliere il PT
-- (components/DateAtleti). Solo se manca: una data c'e' non si riscrive.
--
-- Additivo e rilanciabile, dopo 20261101120000.
-- ===========================================================================

alter table public.profili
  add column if not exists legato_il timestamptz;

create table if not exists public.legami_pt_finiti (
  atleta_id  uuid not null references auth.users(id) on delete cascade,
  pt_id      uuid not null references auth.users(id) on delete cascade,
  dal        timestamptz,
  finito_il  timestamptz not null default now(),
  primary key (atleta_id, pt_id)
);
-- Niente regole: la scrive e la legge solo il trigger qui sotto.
alter table public.legami_pt_finiti enable row level security;

create or replace function public.legame_pt_ricorda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dal timestamptz;
  v_finito timestamptz;
begin
  if new.pt_id is not distinct from old.pt_id then
    return new;
  end if;
  if old.pt_id is not null then
    insert into public.legami_pt_finiti (atleta_id, pt_id, dal, finito_il)
    values (new.id, old.pt_id, old.associato_il, now())
    on conflict (atleta_id, pt_id) do update
      set dal = excluded.dal, finito_il = excluded.finito_il;
  end if;
  if new.pt_id is not null then
    new.legato_il := now();
    delete from public.legami_pt_finiti
     where atleta_id = new.id and pt_id = new.pt_id
    returning dal, finito_il into v_dal, v_finito;
    if v_dal is not null and v_finito > now() - interval '3 months' then
      new.associato_il := v_dal;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists legame_pt_ricorda on public.profili;
create trigger legame_pt_ricorda
  before update of pt_id on public.profili
  for each row execute function public.legame_pt_ricorda();

-- Stessa forma di 20261101120000: il momento del legame, non la data da cui
-- il PT vede gli allenamenti.
create or replace function public.notifiche_nuovi_atleti()
returns table (
  atleta_id   uuid,
  atleta_nome text,
  quando      timestamptz,
  nuovo       boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select a.id, a.nome, coalesce(a.legato_il, a.associato_il),
         coalesce(a.legato_il, a.associato_il) > (select il from letto)
    from public.profili a
   where a.pt_id = auth.uid()
     and coalesce(a.legato_il, a.associato_il) is not null
     and not public.bloccato_con(a.id)
   order by 3 desc
   limit 100;
$$;
revoke all on function public.notifiche_nuovi_atleti() from public, anon;
grant execute on function public.notifiche_nuovi_atleti() to authenticated;

create or replace function public.imposta_inizio_atleta(p_atleta uuid, p_dal timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_dal is null or p_dal > now() then
    raise exception 'Data non valida' using errcode = '22023';
  end if;
  update public.profili set associato_il = p_dal
   where id = p_atleta and pt_id = auth.uid() and associato_il is null;
  if not found then
    raise exception 'Nessun atleta senza data' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.imposta_inizio_atleta(uuid, timestamptz) from public, anon;
grant execute on function public.imposta_inizio_atleta(uuid, timestamptz) to authenticated;
