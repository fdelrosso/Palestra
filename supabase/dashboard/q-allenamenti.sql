-- Dashboard Palestra · dataset "allenamenti": ogni allenamento chiuso. Solo lettura.
with c as (
  select a.user_id, a.id as aid, to_char(a.data at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ts, a.visibilita as vis,
    nullif(round((c->>'durataSec')::numeric / 60), 0) as durata_min,
    jsonb_array_length(coalesce(c->'esercizi', '[]'::jsonb)) as esercizi,
    length(trim(coalesce(c->>'nota', ''))) > 0 as nota, c ? 'musica' as musica, c ? 'sfondo' as sfondo
  from public.allenamenti a, lateral (select a.dati) as c(c)
)
select coalesce(json_agg(r order by r.quando), '[]'::json) as righe from (
  select
    (select trim(nome || ' ' || coalesce(cognome, '')) from public.profili where id = c.user_id) as persona,
    c.ts as quando, c.vis as visibilita, c.durata_min, c.esercizi,
    (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = c.aid) as mi_piace,
    (select count(*) from public.allenamento_commenti k where k.allenamento_key = c.aid) as commenti,
    (select count(*) from public.allenamento_foto f where f.allenamento_key = c.aid) as foto,
    c.nota, c.musica, c.sfondo
  from c
) r;
