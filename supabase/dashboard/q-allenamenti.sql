-- Dashboard Palestra · dataset "allenamenti": ogni allenamento chiuso. Solo lettura.
with c as (
  select s.user_id, s.id as sid, c->>'data' as ts, coalesce(c->>'visibilita', s.visibilita) as vis,
    nullif(round((c->>'durataSec')::numeric / 60), 0) as durata_min,
    jsonb_array_length(coalesce(c->'esercizi', '[]'::jsonb)) as esercizi,
    length(trim(coalesce(c->>'nota', ''))) > 0 as nota, c ? 'musica' as musica, c ? 'sfondo' as sfondo
  from public.schede s, jsonb_array_elements(coalesce(s.dati->'completamenti', '[]'::jsonb)) c
)
select coalesce(json_agg(r order by r.quando), '[]'::json) as righe from (
  select
    (select trim(nome || ' ' || coalesce(cognome, '')) from public.profili where id = c.user_id) as persona,
    c.ts as quando, c.vis as visibilita, c.durata_min, c.esercizi,
    (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = c.sid || '|' || c.ts) as mi_piace,
    (select count(*) from public.allenamento_commenti k where k.allenamento_key = c.sid || '|' || c.ts) as commenti,
    (select count(*) from public.allenamento_foto f where f.allenamento_key = c.sid || '|' || c.ts) as foto,
    c.nota, c.musica, c.sfondo
  from c
) r;
