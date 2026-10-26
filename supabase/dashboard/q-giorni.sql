-- Dashboard Palestra · dataset "giorni": un giorno per riga dal 10/09/2026 a oggi (ora italiana). Solo lettura.
with c as (
  select a.user_id as u, to_char(a.data at time zone 'UTC', 'YYYY-MM-DD') as d, a.visibilita as vis
  from public.allenamenti a
), azioni as (
  select u, d from c
  union all select user_id, to_char(creato_il, 'YYYY-MM-DD') from public.allenamento_mi_piace
  union all select user_id, to_char(creato_il, 'YYYY-MM-DD') from public.allenamento_commenti
  union all select da_id, to_char(creato_il, 'YYYY-MM-DD') from public.messaggi
), g as (
  select to_char(x, 'YYYY-MM-DD') as giorno
  from generate_series('2026-09-10'::date, (now() at time zone 'Europe/Rome')::date, '1 day') x
)
select coalesce(json_agg(r order by r.giorno), '[]'::json) as righe from (
  select g.giorno,
    (select count(*) from public.profili p where to_char(p.creato_il, 'YYYY-MM-DD') = g.giorno) as iscritti,
    (select count(*) from c where c.d = g.giorno) as allenamenti,
    (select count(*) from c where c.d = g.giorno and c.vis = 'pubblica') as pubblici,
    (select count(*) from public.allenamento_mi_piace m where to_char(m.creato_il, 'YYYY-MM-DD') = g.giorno) as mi_piace,
    (select count(*) from public.allenamento_commenti k where to_char(k.creato_il, 'YYYY-MM-DD') = g.giorno) as commenti,
    (select count(*) from public.messaggi m where to_char(m.creato_il, 'YYYY-MM-DD') = g.giorno) as messaggi,
    (select count(distinct u) from azioni a where a.d = g.giorno) as attivi
  from g
) r;
