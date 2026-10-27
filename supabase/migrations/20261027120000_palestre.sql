-- ===========================================================================
-- PALESTRE (2026-10-27)
--
-- Si applica dopo 20261024120000_foto_seguono_allenamento.sql, ed e'
-- rilanciabile. Solo aggiunte: una tabella, una colonna su `profili`, una
-- funzione.
--
-- L'elenco viene da due fonti, caricate a mano e in quest'ordine:
--   1. OpenStreetMap, tutta Italia (leisure=fitness_centre):
--      scratchpad/importa-palestre.mjs
--   2. Overture Maps, per ora solo la Toscana, dove OSM ne ha poche: salta
--      quelle a meno di 150 m da una gia' presente.
--      scratchpad/importa-palestre-overture.py
--   3. Comune, provincia e regione, per tutte e due, dai confini ISTAT, e
--      l'indirizzo dove manca, dal civico piu' vicino (indirizzi di Overture):
--      scratchpad/palestre-completa.py. Le fonti il comune lo danno a meta'
--      (OSM a 4 su 10), la provincia quasi mai, l'indirizzo OSM a 1 su 2.
-- La tabella la scrive SOLO chi ha la password del database, l'app la legge e
-- basta. ⚠️ Dove l'app le mostra serve la scritta "© OpenStreetMap
-- contributors, Overture Maps Foundation, ISTAT" (OSM e' ODbL, Overture
-- CDLA per i luoghi e CC BY per gli indirizzi, ISTAT CC BY).
--
-- Ognuno sceglie la sua con `profili.palestra_id` (la scrive gia' la regola
-- "profilo: modifico il mio"). Le palestre vicine le trova `palestre_vicine`
-- con l'haversine in SQL puro: per qualche migliaio di righe filtrate prima
-- su un riquadro di lat/lon basta, senza PostGIS.
-- ===========================================================================

create table if not exists public.palestre (
  id         uuid primary key default gen_random_uuid(),
  -- "osm:node/123", "overture:<id>": la chiave per riallineare con la fonte
  -- a ogni import.
  fonte_id   text not null unique,
  nome       text not null,
  lat        double precision not null,
  lon        double precision not null,
  comune     text,
  provincia  text,  -- la sigla: "FI"
  regione    text,
  indirizzo  text,
  creata_il  timestamptz not null default now()
);

create index if not exists palestre_lat_lon on public.palestre (lat, lon);

alter table public.palestre enable row level security;

drop policy if exists "palestre: le vede chi ha un account" on public.palestre;
create policy "palestre: le vede chi ha un account" on public.palestre
  for select to authenticated using (true);

-- `on delete set null`: se un import futuro toglie una palestra chiusa, chi
-- la frequentava resta senza, non perde il profilo.
alter table public.profili
  add column if not exists palestra_id uuid references public.palestre(id) on delete set null;

create index if not exists profili_palestra on public.profili (palestra_id);

-- Le palestre entro `p_km` dal punto, dalla piu' vicina.
-- Il drop perche' `create or replace` non puo' cambiare le colonne restituite.
drop function if exists public.palestre_vicine(double precision, double precision, double precision);
create function public.palestre_vicine(p_lat double precision, p_lon double precision, p_km double precision default 10)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision, km double precision)
language sql stable set search_path = public as $$
  select p.id, p.nome, p.comune, p.provincia, p.indirizzo, p.lat, p.lon, d.km
    from public.palestre p
   cross join lateral (
     select 6371 * 2 * asin(sqrt(
              power(sin(radians(p.lat - p_lat) / 2), 2)
            + cos(radians(p_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lon - p_lon) / 2), 2)
            )) as km
   ) d
   -- Il riquadro prima, perche' usi l'indice: 1° di latitudine ~ 111 km.
   where p.lat between p_lat - p_km / 111.0 and p_lat + p_km / 111.0
     and p.lon between p_lon - p_km / (111.0 * cos(radians(p_lat))) and p_lon + p_km / (111.0 * cos(radians(p_lat)))
     and d.km <= p_km
   order by d.km
   limit 200;
$$;

revoke all on function public.palestre_vicine(double precision, double precision, double precision) from public, anon;
grant execute on function public.palestre_vicine(double precision, double precision, double precision) to authenticated;

-- La ricerca di Cerca → Palestre. Ogni parola deve stare nel nome (a pezzi),
-- all'inizio del comune o, se e' di due lettere, essere la sigla della
-- provincia: "crossfit firenze", "virgin mi", "fi". Prima chi ha il nome che
-- comincia cosi'. Senza accenti da tutte e due le parti (unaccent): "forli"
-- trova "Forlì", e "caffè" trova "Caffe".
create extension if not exists unaccent with schema extensions;

-- I drop qui e sotto: `create or replace` non cambia le colonne restituite
-- (l'id era bigint, ora uuid), e il file deve restare rilanciabile.
drop function if exists public.cerca_palestre(text);
create function public.cerca_palestre(chiave text)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable set search_path = public as $$
  with parole as (
    select array_remove(string_to_array(extensions.unaccent(lower(trim(chiave))), ' '), '') as p
  )
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
    from public.palestre g, parole
   where length(trim(chiave)) >= 2
     and not exists (
       select 1 from unnest(parole.p) w
        where not (extensions.unaccent(g.nome) ilike '%' || w || '%'
                   or extensions.unaccent(g.comune) ilike w || '%'
                   or (length(w) = 2 and g.provincia = upper(w))))
   order by extensions.unaccent(g.nome) ilike extensions.unaccent(trim(chiave)) || '%' desc, g.nome
   limit 20;
$$;

revoke all on function public.cerca_palestre(text) from public, anon;
grant execute on function public.cerca_palestre(text) to authenticated;

-- Le palestre nel pezzo di mappa che si sta guardando. Il tetto tiene leggero
-- il caso "mappa di mezza Italia": l'app le chiede solo da vicino.
drop function if exists public.palestre_nel_riquadro(double precision, double precision, double precision, double precision);
create function public.palestre_nel_riquadro(sud double precision, ovest double precision, nord double precision, est double precision)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable set search_path = public as $$
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
    from public.palestre g
   where g.lat between sud and nord and g.lon between ovest and est
   limit 300;
$$;

revoke all on function public.palestre_nel_riquadro(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.palestre_nel_riquadro(double precision, double precision, double precision, double precision) to authenticated;

-- La mappa da lontano: una bolla per zona (regione, provincia o comune, a
-- seconda dello zoom) col numero delle sue palestre. Tornano le zone che
-- hanno almeno una palestra nel pezzo in vista, ma contate INTERE: una
-- regione tagliata dal bordo dello schermo dice lo stesso numero di quando la
-- si vede tutta, e spostando la mappa i numeri non cambiano. Per ognuna:
-- quante, il punto medio delle sue palestre e il riquadro che le contiene
-- (toccando la bolla la mappa ci va dentro). Una zona con una palestra sola
-- la restituisce intera, come palestre_nel_riquadro.
-- Il comune si tiene con la provincia: ci sono comuni con lo stesso nome.
drop function if exists public.palestre_per_zona(text, double precision, double precision, double precision, double precision);
create function public.palestre_per_zona(
  livello text, sud double precision, ovest double precision, nord double precision, est double precision
)
returns table (
  zona text, quante int, lat double precision, lon double precision,
  g_sud double precision, g_ovest double precision, g_nord double precision, g_est double precision,
  id uuid, nome text, comune text, provincia text, indirizzo text
)
language sql stable set search_path = public as $$
  with zone as (
    select g.*,
           case livello
             when 'regione' then g.regione
             when 'provincia' then g.provincia
             else g.comune || ' (' || g.provincia || ')'
           end as z
      from public.palestre g
  )
  select z, count(*)::int, avg(lat), avg(lon),
         min(lat), min(lon), max(lat), max(lon),
         case when count(*) = 1 then (array_agg(id))[1] end,
         case when count(*) = 1 then min(nome) end,
         case when count(*) = 1 then min(comune) end,
         case when count(*) = 1 then min(provincia) end,
         case when count(*) = 1 then min(indirizzo) end
    from zone
   where z in (select z from zone where lat between sud and nord and lon between ovest and est)
   group by z
   limit 500;
$$;

revoke all on function public.palestre_per_zona(text, double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.palestre_per_zona(text, double precision, double precision, double precision, double precision) to authenticated;

-- Il feed "Palestra" (pages/FeedPage): chi si allena nella mia zona. Solo gli
-- id, e solo di chi ha almeno un allenamento pubblico: il feed li usa per
-- filtrare quello che gia' vede (allenamenti_visibili), quindi non mostra
-- niente di nuovo, sceglie fra quello che c'e'. La zona e' il mio comune
-- (`modo` = 'comune') o i `km` intorno alla mia palestra (al massimo 50).
-- Chi ha scelto una palestra partecipa: lo dice il foglio dove la si sceglie.
-- `security definer` perche' la palestra degli altri non si legge: qui si
-- guarda, ma fuori escono solo gli id. Senza la mia palestra, nessuno.
create or replace function public.persone_della_mia_zona(modo text, km double precision default 5)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with mia as (
    select g.lat, g.lon, g.comune, g.provincia
      from public.profili p join public.palestre g on g.id = p.palestra_id
     where p.id = auth.uid()
  )
  select p.id
    from public.profili p
    join public.palestre g on g.id = p.palestra_id
    cross join mia
   where p.id <> auth.uid()
     and case
           when modo = 'comune' then g.comune = mia.comune and g.provincia = mia.provincia
           else 6371 * 2 * asin(sqrt(
                  power(sin(radians(g.lat - mia.lat) / 2), 2)
                + cos(radians(mia.lat)) * cos(radians(g.lat)) * power(sin(radians(g.lon - mia.lon) / 2), 2)
                )) <= least(greatest(coalesce(km, 5), 0), 50)
         end
     and not public.bloccato_con(p.id)
     and exists (select 1 from public.allenamenti a where a.user_id = p.id and a.visibilita = 'pubblica');
$$;

revoke all on function public.persone_della_mia_zona(text, double precision) from public, anon;
grant execute on function public.persone_della_mia_zona(text, double precision) to authenticated;
