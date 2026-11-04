-- ===========================================================================
-- LE PALESTRE DOVE LAVORA UN PT (2026-11-04)
--
-- Si applica dopo 20261104120000_feed_vicino_per_allenamento.sql, ed e'
-- rilanciabile. Solo aggiunte: una tabella, quattro funzioni.
--
-- `profili.palestra_id` e' dove ci si allena, e lo vede chi la persona sceglie
-- (`vedo_palestra_di`). Queste sono le palestre dove un PT segue gli atleti:
-- una PRINCIPALE (ci lavora di solito) e quante altre vuole (ci puo' seguire
-- qualcuno, ma non ci va sempre). Sono pubblicita': le vedono tutti tranne i
-- bloccati, e solo approvate (la propria anche da approvare).
-- Si scrivono da VetrinaPtPage (Lavoro → "Il tuo profilo da PT") e da
-- PalestraPage ("Lavoro qui"); si leggono su PalestraPage (linguetta PT) e
-- nella vetrina del PT (components/VetrinaPt).
-- ===========================================================================

create table if not exists public.palestre_pt (
  pt_id       uuid not null references public.profili(id) on delete cascade,
  palestra_id uuid not null references public.palestre(id) on delete cascade,
  principale  boolean not null default false,
  creata_il   timestamptz not null default now(),
  primary key (pt_id, palestra_id)
);

-- Una sola principale per PT.
create unique index if not exists palestre_pt_principale on public.palestre_pt (pt_id) where principale;
create index if not exists palestre_pt_palestra on public.palestre_pt (palestra_id);

-- Nessuna regola: si passa solo dalle funzioni qui sotto.
alter table public.palestre_pt enable row level security;

-- La metto (o la rendo principale, o non piu'). Solo un PT, e solo una
-- palestra che vedo (approvata, o aggiunta da me, o la mia). La prima e'
-- principale da sola.
create or replace function public.metti_palestra_pt(p_palestra uuid, p_principale boolean default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  princ boolean;
begin
  if not exists (select 1 from public.profili where id = auth.uid() and ruolo = 'pt') then
    raise exception 'Solo un PT puo'' dire dove lavora.';
  end if;
  if not exists (
    select 1 from public.palestre g
     where g.id = p_palestra
       and (g.confermata or g.creata_da = auth.uid()
            or g.id = (select palestra_id from public.profili where id = auth.uid()))
  ) then
    raise exception 'Palestra non trovata.';
  end if;

  princ := coalesce(p_principale,
                    (select principale from public.palestre_pt where pt_id = auth.uid() and palestra_id = p_palestra),
                    not exists (select 1 from public.palestre_pt where pt_id = auth.uid()));
  if princ then
    update public.palestre_pt set principale = false
     where pt_id = auth.uid() and principale and palestra_id <> p_palestra;
  end if;
  insert into public.palestre_pt (pt_id, palestra_id, principale)
  values (auth.uid(), p_palestra, princ)
  on conflict (pt_id, palestra_id) do update set principale = excluded.principale;
end;
$$;

revoke all on function public.metti_palestra_pt(uuid, boolean) from public, anon;
grant execute on function public.metti_palestra_pt(uuid, boolean) to authenticated;

create or replace function public.togli_palestra_pt(p_palestra uuid)
returns void
language sql security definer set search_path = public as $$
  delete from public.palestre_pt where pt_id = auth.uid() and palestra_id = p_palestra;
$$;

revoke all on function public.togli_palestra_pt(uuid) from public, anon;
grant execute on function public.togli_palestra_pt(uuid) to authenticated;

-- Le palestre di un PT, la principale prima.
drop function if exists public.palestre_di_pt(uuid);
create function public.palestre_di_pt(p_pt uuid)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision, principale boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon, x.principale
    from public.palestre_pt x
    join public.palestre g on g.id = x.palestra_id
    join public.profili p on p.id = x.pt_id
   where x.pt_id = p_pt
     and p.ruolo = 'pt'
     and not public.bloccato_con(p.id)
     and (p.id = auth.uid() or g.confermata)
   order by x.principale desc, lower(g.nome);
$$;

revoke all on function public.palestre_di_pt(uuid) from public, anon;
grant execute on function public.palestre_di_pt(uuid) to authenticated;

-- I PT di una palestra (PalestraPage, linguetta PT): io per primo, poi chi ci
-- lavora di solito, poi gli altri, per nome.
drop function if exists public.pt_della_palestra(uuid);
create function public.pt_della_palestra(p_palestra uuid)
returns table (id uuid, nome text, username text, foto text, principale boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.username, p.foto, x.principale
    from public.palestre_pt x
    join public.palestre g on g.id = x.palestra_id
    join public.profili p on p.id = x.pt_id
   where x.palestra_id = p_palestra
     and p.ruolo = 'pt'
     and not public.bloccato_con(p.id)
     and (p.id = auth.uid() or g.confermata)
   order by p.id = auth.uid() desc, x.principale desc, lower(coalesce(nullif(p.username, ''), p.nome))
   limit 300;
$$;

revoke all on function public.pt_della_palestra(uuid) from public, anon;
grant execute on function public.pt_della_palestra(uuid) to authenticated;
