-- Dashboard Palestra · dataset "iscritti": una riga per iscritto. Solo lettura.
with c as (
  select s.user_id, coalesce(c->>'visibilita', s.visibilita) as vis, left(c->>'data', 10) as d
  from public.allenamenti a join public.schede s on s.id = a.scheda_id, lateral (select a.dati) as c(c)
)
select coalesce(json_agg(r order by r.iscritto, r.persona), '[]'::json) as righe from (
  select
    trim(p.nome || ' ' || coalesce(p.cognome, '')) as persona,
    p.ruolo,
    to_char(p.creato_il, 'YYYY-MM-DD') as iscritto,
    to_char(u.last_sign_in_at, 'YYYY-MM-DD') as ultimo_accesso,
    (select count(*) from c where c.user_id = p.id) as allenamenti,
    (select count(*) from c where c.user_id = p.id and c.vis = 'pubblica') as pubblici,
    (select max(d) from c where c.user_id = p.id) as ultimo_allenamento,
    (select count(*) from public.schede s where s.user_id = p.id and not s.libera) as schede,
    (select count(*) from public.relazioni r where r.tipo = 'amicizia' and r.stato = 'accettata' and (r.da_id = p.id or r.a_id = p.id)) as amici,
    (select count(*) from public.allenamento_commenti k where k.user_id = p.id) as commenti,
    (select count(*) from public.allenamento_mi_piace m where m.user_id = p.id) as mi_piace,
    (select count(*) from public.messaggi m where m.da_id = p.id) as messaggi,
    (p.pt_id is not null) as ha_pt,
    exists (select 1 from public.diete d where d.user_id = p.id) as dieta,
    exists (select 1 from public.diario d where d.user_id = p.id) as diario,
    (select to_char(x.aggiornata_il, 'YYYY-MM-DD') from public.sessione x where x.user_id = p.id and x.dati is not null) as allenamento_aperto_dal,
    (select count(*) from public.relazioni r where r.tipo = 'amicizia' and r.stato = 'attesa' and r.a_id = p.id) as richieste_ricevute,
    (select count(*) from public.relazioni r where r.tipo = 'amicizia' and r.stato = 'attesa' and r.da_id = p.id) as richieste_inviate,
    (p.foto is not null) as foto_profilo
  from public.profili p
  left join auth.users u on u.id = p.id
) r;
