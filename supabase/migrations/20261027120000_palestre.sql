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
  id         bigint generated always as identity primary key,
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
  add column if not exists palestra_id bigint references public.palestre(id) on delete set null;

create index if not exists profili_palestra on public.profili (palestra_id);

-- Le palestre entro `p_km` dal punto, dalla piu' vicina.
-- Il drop perche' `create or replace` non puo' cambiare le colonne restituite.
drop function if exists public.palestre_vicine(double precision, double precision, double precision);
create function public.palestre_vicine(p_lat double precision, p_lon double precision, p_km double precision default 10)
returns table (id bigint, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision, km double precision)
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
