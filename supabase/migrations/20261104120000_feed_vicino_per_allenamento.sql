-- ===========================================================================
-- IL FEED "VICINO A TE" GUARDA L'ALLENAMENTO, NON LA PERSONA (2026-11-04)
--
-- Prima il feed "Palestra" teneva gli allenamenti di chi ha la palestra DEL
-- PROFILO nella mia zona (`persone_della_mia_zona`): chi passava una volta da
-- una palestra qui vicino non c'era, e chi della zona si allenava una volta a
-- Milano si'. Ora conta la palestra dell'allenamento (`dati.palestraId`, di base
-- quella del profilo, si cambia dal riepilogo): l'app chiede le palestre della
-- mia zona e tiene gli allenamenti che ci sono stati fatti (lib/feed).
--
-- E la palestra di un allenamento esce dal database solo a chi la puo' vedere
-- (`vedo_palestra_di`, la stessa regola del profilo e del recap): prima
-- `allenamenti_visibili` e `post_pubblico` passavano il json intero, e
-- `palestraId` arrivava anche a chi la persona aveva detto "nessuno". Senza
-- `palestraId` un allenamento nel feed vicino non entra: chi nasconde la sua
-- palestra non compare nella zona di nessuno.
-- ===========================================================================

-- Le palestre della mia zona: il mio comune ('comune'), la mia provincia
-- ('provincia') o i `km` intorno alla mia palestra (al massimo 50). Solo le
-- approvate, come le vedono gli altri. Senza la mia palestra, nessuna.
-- ponytail: si mandano tutte le palestre della zona (50 km intorno a Milano
-- sono ~430 id); se diventano migliaia, filtrare gli allenamenti qui dentro.
create or replace function public.palestre_della_mia_zona(modo text, km double precision default 5)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with mia as (
    select g.lat, g.lon, g.comune, g.provincia
      from public.profili p join public.palestre g on g.id = p.palestra_id
     where p.id = auth.uid()
  )
  select g.id
    from public.palestre g
    cross join mia
   where g.confermata
     and case
           when modo = 'comune' then g.comune = mia.comune and g.provincia = mia.provincia
           when modo = 'provincia' then g.provincia = mia.provincia
           else 6371 * 2 * asin(sqrt(
                  power(sin(radians(g.lat - mia.lat) / 2), 2)
                + cos(radians(mia.lat)) * cos(radians(g.lat)) * power(sin(radians(g.lon - mia.lon) / 2), 2)
                )) <= least(greatest(coalesce(km, 5), 0), 50)
         end;
$$;

revoke all on function public.palestre_della_mia_zona(text, double precision) from public, anon;
grant execute on function public.palestre_della_mia_zona(text, double precision) to authenticated;

-- Il json di un allenamento di `p_persona` come lo vedo io: senza `palestraId`
-- se la sua palestra a me non la mostra.
create or replace function public.dati_allenamento_per_me(p_persona uuid, p_dati jsonb)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
           when p_dati ? 'palestraId' and not public.vedo_palestra_di(p_persona)
             then p_dati - 'palestraId'
           else p_dati
         end;
$$;

revoke all on function public.dati_allenamento_per_me(uuid, jsonb) from public, anon;

-- Come in 20261023120000_allenamenti.sql, col json passato da qui sopra.
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
    public.dati_allenamento_per_me(a.user_id, a.dati)
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where not public.bloccato_con(a.user_id)
    and (a.user_id = io.me
     or (a.visibilita = 'pubblica' and not public.pubblicazione_bloccata(a.user_id))
     or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id)));
$$;

-- Come in 20261023180000_allenamenti_id.sql. Chi non ha l'account (anon) la
-- palestra la vede solo se e' "tutti".
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
         public.dati_allenamento_per_me(a.user_id, a.dati),
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = a.id),
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = a.id and not public.in_attesa('commento', c.id))
    from public.allenamenti a
    join public.profili p on p.id = a.user_id
   where a.id = public.id_allenamento($1)
     and a.visibilita = 'pubblica'
   limit 1;
$$;

-- Come in 20261102160000_ex_atleti.sql: anche l'ex PT la palestra degli
-- allenamenti la vede solo se `vedo_palestra_di` dice si'.
create or replace function public.ex_atleta_dati(p_atleta uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with periodi as (
    select e.dal, e.al from public.ex_atleti e
     where e.pt_id = auth.uid() and e.atleta_id = p_atleta and e.dal is not null
       and not public.bloccato_con(p_atleta)
  ),
  fatti as (
    select a.scheda_id, public.dati_allenamento_per_me(a.user_id, a.dati) as dati
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

-- La vecchia, per persona: l'app non la chiama piu'.
drop function if exists public.persone_della_mia_zona(text, double precision);
