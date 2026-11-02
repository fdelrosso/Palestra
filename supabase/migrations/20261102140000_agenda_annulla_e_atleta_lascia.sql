-- ===========================================================================
-- 2026-11-02 — Due notifiche fra PT e atleta.
--
-- 1. Il PT che toglie dall'agenda un appuntamento fissato lo annulla davvero.
--    Prima spariva solo la riga di `agenda_pt`: per l'atleta restava fissato e
--    non arrivava niente. Da qui in poi passa per lo stesso stato di
--    `annulla_appuntamento`, quindi `notifiche_appuntamenti()` lo vede.
--
-- 2. Il PT sa quando un atleta ha smesso di farsi seguire. Il legame finito sta
--    gia' in `legami_pt_finiti`: serve solo sapere chi l'ha sciolto, perche' se
--    e' stato il PT non c'e' niente da dirgli.
--
-- Additivo e rilanciabile, dopo 20261102130000.
-- ===========================================================================

create or replace function public.agenda_tolta_annulla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appuntamenti
     set stato = 'annullato', turno = null, agenda_id = null,
         ultimo_da = coalesce(auth.uid(), ultimo_da), ultimo_tipo = 'annullato', ultimo_il = now()
   where agenda_id = old.id and stato = 'fissato';
  return old;
end;
$$;

-- BEFORE: dopo, la chiave esterna ha gia' svuotato `agenda_id`.
drop trigger if exists agenda_tolta_annulla on public.agenda_pt;
create trigger agenda_tolta_annulla
  before delete on public.agenda_pt
  for each row execute function public.agenda_tolta_annulla();

alter table public.legami_pt_finiti
  add column if not exists finito_da uuid references auth.users(id) on delete set null;

-- Come 20261101130000, in piu' `finito_da`.
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
    insert into public.legami_pt_finiti (atleta_id, pt_id, dal, finito_il, finito_da)
    values (new.id, old.pt_id, old.associato_il, now(), auth.uid())
    on conflict (atleta_id, pt_id) do update
      set dal = excluded.dal, finito_il = excluded.finito_il, finito_da = excluded.finito_da;
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

create or replace function public.notifiche_atleti_persi()
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
  select a.id, a.nome, f.finito_il, f.finito_il > (select il from letto)
    from public.legami_pt_finiti f
    join public.profili a on a.id = f.atleta_id
   where f.pt_id = auth.uid()
     and f.finito_da = f.atleta_id
     and not public.bloccato_con(a.id)
   order by f.finito_il desc
   limit 100;
$$;
revoke all on function public.notifiche_atleti_persi() from public, anon;
grant execute on function public.notifiche_atleti_persi() to authenticated;
