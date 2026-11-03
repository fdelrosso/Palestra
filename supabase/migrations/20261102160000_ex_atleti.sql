-- ===========================================================================
-- 2026-11-02 — Gli ex atleti del PT.
--
-- Finito il legame il PT non vede piu' niente: `e_mio_atleta` guarda il
-- `pt_id` di adesso. Da qui resta un periodo in `ex_atleti` (dal, al), e da
-- quel periodo il PT rilegge schede, allenamenti e diario con
-- `ex_atleta_dati`. Fuori dal periodo non esce niente.
--
-- ⚠️ Niente copie: si legge dai dati dell'atleta, con le regole di quando lo
-- seguiva (mai i nascosti, mai le giornate private). Se l'atleta cancella
-- qualcosa, o l'account, sparisce anche qui.
--
-- Il PT puo' togliere un ex atleta quando vuole: spariscono solo i suoi periodi.
-- `legami_pt_finiti` resta com'e': serve ai 3 mesi e alle notifiche.
-- Tornati insieme entro 3 mesi il periodo si riattacca al legame e lascia gli
-- ex; dopo resta li', accanto a quello nuovo.
--
-- Additivo e rilanciabile, dopo 20261102150000.
-- ===========================================================================

create table if not exists public.ex_atleti (
  id         uuid primary key default gen_random_uuid(),
  pt_id      uuid not null references auth.users(id) on delete cascade,
  atleta_id  uuid not null references auth.users(id) on delete cascade,
  dal        timestamptz,
  al         timestamptz not null default now()
);
create index if not exists ex_atleti_pt_idx on public.ex_atleti (pt_id, atleta_id);
-- Niente regole: la scrive il trigger, la leggono le funzioni qui sotto.
alter table public.ex_atleti enable row level security;

-- I legami gia' finiti.
insert into public.ex_atleti (pt_id, atleta_id, dal, al)
select f.pt_id, f.atleta_id, f.dal, f.finito_il
  from public.legami_pt_finiti f
 where not exists (select 1 from public.ex_atleti e
                    where e.pt_id = f.pt_id and e.atleta_id = f.atleta_id and e.al = f.finito_il);

-- Come 20261102140000, in piu' `ex_atleti`.
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
    insert into public.ex_atleti (pt_id, atleta_id, dal, al)
    values (old.pt_id, new.id, old.associato_il, now());
  end if;
  if new.pt_id is not null then
    new.legato_il := now();
    delete from public.legami_pt_finiti
     where atleta_id = new.id and pt_id = new.pt_id
    returning dal, finito_il into v_dal, v_finito;
    if v_dal is not null and v_finito > now() - interval '3 months' then
      new.associato_il := v_dal;
      delete from public.ex_atleti
       where atleta_id = new.id and pt_id = new.pt_id and al = v_finito;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.ex_atleti_miei()
returns table (
  atleta_id uuid,
  nome      text,
  username  text,
  dal       timestamptz,
  al        timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.username, min(e.dal), max(e.al)
    from public.ex_atleti e
    join public.profili a on a.id = e.atleta_id
   where e.pt_id = auth.uid()
     and not public.bloccato_con(a.id)
   group by a.id, a.nome, a.username
   order by max(e.al) desc;
$$;
revoke all on function public.ex_atleti_miei() from public, anon;
grant execute on function public.ex_atleti_miei() to authenticated;

-- Schede: quelle mandate da questo PT, e quelle dell'atleta nate nel periodo o
-- con un allenamento nel periodo. Le stesse forme di `schede_visibili` e
-- `allenamenti_visibili`, cosi' l'app le legge allo stesso modo.
create or replace function public.ex_atleta_dati(p_atleta uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with periodi as (
    select e.dal, e.al from public.ex_atleti e
     where e.pt_id = auth.uid() and e.atleta_id = p_atleta and e.dal is not null
       and not public.bloccato_con(p_atleta)
  ),
  fatti as (
    select a.scheda_id, a.dati
      from public.allenamenti a
     where a.user_id = p_atleta
       and not a.da_salvare
       and a.visibilita in ('pubblica', 'solo-pt')
       and exists (select 1 from periodi p where a.data between p.dal and p.al)
  )
  select jsonb_build_object(
    'schede', coalesce((
      select jsonb_agg(s.dati - 'completamenti')
        from public.schede s
       where s.user_id = p_atleta
         and not s.libera
         and exists (select 1 from periodi)
         and (s.dati -> 'daPt' ->> 'id' = auth.uid()::text
              or (s.visibilita in ('pubblica', 'solo-pt')
                  and (s.id in (select f.scheda_id from fatti f)
                       or exists (select 1 from periodi p
                                   where (s.dati ->> 'creataIl')::timestamptz between p.dal and p.al))))
    ), '[]'::jsonb),
    'allenamenti', coalesce((
      select jsonb_agg(jsonb_build_object('scheda_id', f.scheda_id, 'dati', f.dati)) from fatti f
    ), '[]'::jsonb),
    'diario', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'dati', d.dati))
        from public.diario d
       where d.user_id = p_atleta
         and coalesce(d.dati ->> 'privato', 'false') <> 'true'
         and exists (select 1 from periodi p
                      where (d.dati ->> 'data')::date between p.dal::date and p.al::date)
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.ex_atleta_dati(uuid) from public, anon;
grant execute on function public.ex_atleta_dati(uuid) to authenticated;

create or replace function public.togli_ex_atleta(p_atleta uuid)
returns void
language sql security definer set search_path = public as $$
  delete from public.ex_atleti where pt_id = auth.uid() and atleta_id = p_atleta;
$$;
revoke all on function public.togli_ex_atleta(uuid) from public, anon;
grant execute on function public.togli_ex_atleta(uuid) to authenticated;
