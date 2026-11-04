-- ---------------------------------------------------------------------------
-- Atleti del PT e Schede generali DAL SERVER (2026-11-04, ramo `egress`, spec
-- docs/superpowers/specs/2026-11-04-atleti-schede-generali-design.md).
--
-- Prima le due pagine partivano da `schede_visibili()` + `allenamenti_visibili()`:
-- tutto di tutti, a ogni apertura. Qui:
--   - la lista degli atleti chiede solo ultimo allenamento e quanti in 7 giorni;
--   - il dettaglio di un atleta chiede i dati di QUELL'atleta;
--   - le schede generali arrivano 20 alla volta, filtri fatti qui.
-- Visibilita' degli allenamenti: `vedo_allenamento` (20261104180000).
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

-- Le schede dei miei atleti che il PT vede: pubbliche e "solo al PT", non
-- libere, senza completamenti (come schede_visibili).
create or replace function public.schede_atleti()
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean, dati jsonb)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, false, 0, s.visibilita, s.libera, s.dati - 'completamenti'
    from public.schede s
    join public.profili p on p.id = s.user_id
   where p.pt_id = auth.uid()
     and not s.libera
     and s.visibilita in ('pubblica', 'solo-pt')
     and not public.bloccato_con(s.user_id);
$$;
revoke all on function public.schede_atleti() from public, anon;
grant execute on function public.schede_atleti() to authenticated;

-- A che punto e' ogni mio atleta: l'ultimo allenamento e quanti negli ultimi 7
-- giorni, solo da quando lo seguo (hooks/useAtleta).
create or replace function public.ritmo_atleti()
returns table (user_id uuid, ultimo timestamptz, ultimi7 int)
language sql stable security definer set search_path = public as $$
  select p.id,
         max(a.data),
         (count(a.id) filter (where a.data > now() - interval '7 days'))::int
    from public.profili p
    left join public.allenamenti a
      on a.user_id = p.id
     and a.visibilita in ('pubblica', 'solo-pt')
     and (p.associato_il is null or a.data >= p.associato_il)
     and public.vedo_allenamento(a.user_id, a.visibilita)
   where p.pt_id = auth.uid()
   group by p.id;
$$;
revoke all on function public.ritmo_atleti() from public, anon;
grant execute on function public.ritmo_atleti() to authenticated;

-- Il dettaglio di UN mio atleta: schede e tutti gli allenamenti da quando lo
-- seguo. Vuoto se non e' mio. Come ex_atleta_dati.
-- ponytail: tutti insieme (il conto e i progressi per scheda li vogliono tutti);
-- cresce con la storia di un atleta, a pagine se qualcuno arriva ad anni.
create or replace function public.atleta_dati(p_atleta uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with suo as (
    select p.id, p.associato_il from public.profili p
     where p.id = p_atleta and p.pt_id = auth.uid() and not public.bloccato_con(p.id)
  )
  select jsonb_build_object(
    'schede', coalesce((
      select jsonb_agg(s.dati - 'completamenti')
        from public.schede s join suo on suo.id = s.user_id
       where not s.libera and s.visibilita in ('pubblica', 'solo-pt')
    ), '[]'::jsonb),
    'allenamenti', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'scheda_id', a.scheda_id, 'data', a.data,
               'dati', public.dati_allenamento_per_me(a.user_id, a.dati))
             order by a.data desc)
        from public.allenamenti a join suo on suo.id = a.user_id
       where a.visibilita in ('pubblica', 'solo-pt')
         and (suo.associato_il is null or a.data >= suo.associato_il)
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.atleta_dati(uuid) from public, anon;
grant execute on function public.atleta_dati(uuid) to authenticated;

-- I due numeri di una scheda come li vede normalizzaScheda (data/model): giorni
-- di allenamento (tipo assente = workout) e settimane (0/assente = 5).
create or replace function public.scheda_giorni(p_dati jsonb)
returns int language sql immutable as $$
  select count(*)::int from jsonb_array_elements(
           case when jsonb_typeof(p_dati->'giorni') = 'array' then p_dati->'giorni' else '[]'::jsonb end) g
   where coalesce(g->>'tipo', 'workout') = 'workout';
$$;
create or replace function public.scheda_settimane(p_dati jsonb)
returns int language sql immutable as $$
  select coalesce(nullif(case when p_dati->>'numeroSettimane' ~ '^\d+$'
                              then (p_dati->>'numeroSettimane')::int end, 0), 5);
$$;

-- Per le card basta poco: nome, durata e i nomi degli esercizi per giorno. La
-- scheda intera (~10 KB) arriva aprendola (scheda_comunita_intera).
create or replace function public.scheda_leggera(p_dati jsonb)
returns jsonb language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p_dati->'id', 'nome', p_dati->'nome', 'nota', p_dati->'nota',
    'numeroSettimane', p_dati->'numeroSettimane', 'senzaFine', p_dati->'senzaFine',
    'creataIl', p_dati->'creataIl', 'visibilita', p_dati->'visibilita',
    'giorni', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tipo', coalesce(g->>'tipo', 'workout'),
               'esercizi', coalesce((
                 select jsonb_agg(jsonb_build_object('nome', e->'nome'))
                   from jsonb_array_elements(case when jsonb_typeof(g->'esercizi') = 'array'
                                                  then g->'esercizi' else '[]'::jsonb end) e), '[]'::jsonb))
             order by n)
        from jsonb_array_elements(case when jsonb_typeof(p_dati->'giorni') = 'array'
                                       then p_dati->'giorni' else '[]'::jsonb end) with ordinality as x(g, n)), '[]'::jsonb)));
$$;

-- Le schede della pagina "Schede della community": 'tutti' = le mie + le
-- pubbliche degli altri, 'amici' = le pubbliche degli amici. Filtri come
-- pages/SchedeGeneraliPage prima; null = spento.
create or replace function public.schede_comunita(p_chi text)
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean,
               dati jsonb, creata_il timestamptz)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select s.id, s.user_id,
    (autore.ruolo = 'pt'),
    case
      when s.user_id = io.me then 0
      when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end,
    s.visibilita, s.libera, s.dati - 'completamenti',
    coalesce(case when s.dati->>'creataIl' ~ '^\d{4}-\d{2}-\d{2}'
                  then (s.dati->>'creataIl')::timestamptz end, 'epoch'::timestamptz)
  from public.schede s
  join io on true
  join public.profili autore on autore.id = s.user_id
  where not s.libera
    and not public.bloccato_con(s.user_id)
    and case p_chi
      when 'amici' then
        s.visibilita = 'pubblica' and exists (
          select 1 from public.relazioni r
           where r.tipo = 'amicizia' and r.stato = 'accettata'
             and ((r.da_id = io.me and r.a_id = s.user_id)
               or (r.a_id = io.me and r.da_id = s.user_id)))
      else s.user_id = io.me or s.visibilita = 'pubblica'
    end;
$$;
revoke all on function public.schede_comunita(text) from public, anon;
grant execute on function public.schede_comunita(text) to authenticated;

create or replace function public.schede_pubbliche(
  p_chi       text,
  p_giorni    int default null,
  p_settimane int default null,
  p_q         text default null,
  p_dopo_rel  int default null,
  p_dopo_il   timestamptz default null,
  p_dopo_id   text default null,
  p_quanti    int default 20
)
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean,
               dati jsonb, creata_il timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, c.autore_pt, c.relazione_pt, c.visibilita, c.libera,
         public.scheda_leggera(c.dati), c.creata_il
    from public.schede_comunita(p_chi) c
   where (p_giorni is null or public.scheda_giorni(c.dati) = p_giorni)
     and (p_settimane is null or public.scheda_settimane(c.dati) = p_settimane)
     and (coalesce(trim(p_q), '') = '' or exists (
            select 1
              from jsonb_array_elements(case when jsonb_typeof(c.dati->'giorni') = 'array'
                                             then c.dati->'giorni' else '[]'::jsonb end) g,
                   jsonb_array_elements(case when jsonb_typeof(g->'esercizi') = 'array'
                                             then g->'esercizi' else '[]'::jsonb end) e
             where coalesce(g->>'tipo', 'workout') = 'workout'
               and strpos(lower(e->>'nome'), lower(trim(p_q))) > 0))
     and (p_dopo_id is null or (c.relazione_pt, c.creata_il, c.id) < (p_dopo_rel, p_dopo_il, p_dopo_id))
   order by c.relazione_pt desc, c.creata_il desc, c.id desc
   limit least(greatest(coalesce(p_quanti, 20), 1), 50);
$$;
revoke all on function public.schede_pubbliche(text, int, int, text, int, timestamptz, text, int) from public, anon;
grant execute on function public.schede_pubbliche(text, int, int, text, int, timestamptz, text, int) to authenticated;

-- I valori dei due menu (allenamenti/settimana, settimane), sulle stesse schede.
create or replace function public.filtri_schede_pubbliche(p_chi text)
returns table (giorni int[], settimane int[])
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct public.scheda_giorni(c.dati) order by public.scheda_giorni(c.dati)), '{}'),
         coalesce(array_agg(distinct public.scheda_settimane(c.dati) order by public.scheda_settimane(c.dati)), '{}')
    from public.schede_comunita(p_chi) c;
$$;
revoke all on function public.filtri_schede_pubbliche(text) from public, anon;
grant execute on function public.filtri_schede_pubbliche(text) to authenticated;

-- La scheda intera, aperta da una card: se la vedo fra quelle della community.
create or replace function public.scheda_comunita_intera(p_id text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select c.dati from public.schede_comunita('tutti') c where c.id = p_id;
$$;
revoke all on function public.scheda_comunita_intera(text) from public, anon;
grant execute on function public.scheda_comunita_intera(text) to authenticated;
