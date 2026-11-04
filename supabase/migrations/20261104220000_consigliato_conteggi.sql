-- ---------------------------------------------------------------------------
-- Consigliato: i conti della comunita' li fa il database (2026-11-04, ramo
-- `egress`). Prima ConsigliatoPage scaricava `schede_visibili()` +
-- `allenamenti_visibili()` (tutto di tutti) per contare quanto e' usato ogni
-- esercizio (lib/comunita). Qui esce una riga per esercizio e per segnale:
--   'comunita' = tutto quello che vedo, tranne il mio;
--   'mio_pt'   = il mio PT e gli altri suoi atleti (relazione_pt 1/2);
--   'pt'       = chi non ha un PT: le schede dei PT (con atleti) e i loro
--                allenamenti, pesati per quanti atleti segue ognuno sul piu'
--                seguito.
-- Le regole sono quelle di schede_visibili/allenamenti_visibili e di
-- scansionaScheda/scansionaAllenamento: niente nascoste (json), niente libere.
-- Il nome si unisce qui alla buona (minuscole, spazi); quello vero (accenti,
-- gruppo dal nome) resta nel browser, `voce` in lib/comunita.
-- ponytail: si ricontano tutte le schede e gli allenamenti visibili a ogni
-- apertura: poco traffico ma lavoro per il database; da precalcolare una volta
-- al giorno se diventa lento.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

drop function if exists public.conteggi_esercizi();
create or replace function public.conteggi_esercizi()
returns table (fonte text, nome text, gruppo text, gruppi jsonb, da_scheda boolean,
               pianificati double precision, svolti double precision, utenti int,
               pianificati_senza double precision, svolti_senza double precision, utenti_tutti int)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  ),
  -- Le schede degli altri che vedo (schede_visibili), prima dei filtri sul json:
  -- da qui escono anche i PT che contano (come `dellePt` in lib/comunita).
  sv as (
    select s.user_id, s.dati, autore.ruolo = 'pt' as autore_pt,
      case
        when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
        when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
        else 0
      end as rel
    from public.schede s
    join io on true
    join public.profili autore on autore.id = s.user_id
    where s.user_id <> io.me
      and not public.bloccato_con(s.user_id)
      and (s.visibilita = 'pubblica' or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id)))
  ),
  av as (
    select a.user_id, public.dati_allenamento_per_me(a.user_id, a.dati) as dati,
      case
        when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
        when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
        else 0
      end as rel
    from public.allenamenti a
    join io on true
    join public.profili autore on autore.id = a.user_id
    where a.user_id <> io.me
      and not public.bloccato_con(a.user_id)
      and ((a.visibilita = 'pubblica' and not public.pubblicazione_bloccata(a.user_id))
        or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id)))
  ),
  -- I PT con almeno un atleta che hanno schede che vedo, e il loro peso sul piu'
-- seguito (anch'io, se sono un PT con schede: come `fama` in lib/collettivo).
  fama as (
    select f.id, f.atleti::double precision / max(f.atleti) over () as peso
      from (select p.id, (select count(*) from public.profili x where x.pt_id = p.id) as atleti
              from public.profili p
             where p.id in (select user_id from sv where autore_pt)
                or (p.id = (select me from io) and p.ruolo = 'pt'
                    and exists (select 1 from public.schede x where x.user_id = p.id))) f
     where f.atleti > 0
  ),
  -- Un esercizio pianificato o svolto per riga, con il suo peso per segnale.
  pezzi as (
    select sv.user_id, sv.rel, true as pianificato, e
      from sv,
           jsonb_array_elements(case when jsonb_typeof(sv.dati->'giorni') = 'array'
                                     then sv.dati->'giorni' else '[]'::jsonb end) g,
           jsonb_array_elements(case when jsonb_typeof(g->'esercizi') = 'array'
                                     then g->'esercizi' else '[]'::jsonb end) e
     where coalesce(sv.dati->>'visibilita', '') in ('pubblica', 'solo-pt')
       and coalesce(sv.dati->>'libera', 'false') <> 'true'
       and coalesce(g->>'tipo', 'workout') = 'workout'
    union all
    select av.user_id, av.rel, false, e
      from av,
           jsonb_array_elements(case when jsonb_typeof(av.dati->'esercizi') = 'array'
                                     then av.dati->'esercizi' else '[]'::jsonb end) e
     where coalesce(av.dati->>'visibilita', '') in ('pubblica', 'solo-pt')
  ),
  pesati as (
    select 'comunita' as fonte, 1::double precision as peso, p.* from pezzi p
    union all
    select 'mio_pt', 1, p.* from pezzi p where p.rel in (1, 2)
    union all
    select 'pt', f.peso, p.* from pezzi p join fama f on f.id = p.user_id
     where (select mio_pt from io) is null
  )
  -- Nome e gruppo da una scheda se c'e' (lib/comunita contava prima le schede), e
  -- da una riga che il gruppo ce l'ha. Quelle senza gruppo a parte (`_senza`,
  -- `utenti_tutti`): contano solo se il gruppo si ricava dal nome, e lo sa
  -- solo il browser (gruppoDaNome).
  select fonte,
         (array_agg(trim(e->>'nome') order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         (array_agg(e->>'gruppo' order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         (array_agg(e->'gruppi' order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         bool_or(pianificato),
         coalesce(sum(peso) filter (where pianificato and con_gruppo), 0),
         coalesce(sum(peso) filter (where not pianificato and con_gruppo), 0),
         (count(distinct user_id) filter (where con_gruppo))::int,
         coalesce(sum(peso) filter (where pianificato and not con_gruppo), 0),
         coalesce(sum(peso) filter (where not pianificato and not con_gruppo), 0),
         count(distinct user_id)::int
    from (select *, coalesce(e->>'gruppo', '') <> '' as con_gruppo from pesati) p
   where coalesce(trim(e->>'nome'), '') <> ''
   group by fonte, lower(regexp_replace(trim(e->>'nome'), '\s+', ' ', 'g'));
$$;
revoke all on function public.conteggi_esercizi() from public, anon;
grant execute on function public.conteggi_esercizi() to authenticated;

-- Lo stile del mio PT: gli schemi (serie, ripetizioni, recupero) delle schede
-- del mio PT e dei suoi altri atleti, con quante volte compaiono. Come
-- scansionaScheda con i campioni: un esercizio che varia per settimana conta
-- una volta per settimana (le mancanti = l'ultima, come normalizzaScheda).
create or replace function public.stile_mio_pt()
returns table (schema jsonb, n int)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  ),
  es as (
    select s.dati, e
      from public.schede s
      join io on io.mio_pt is not null
      join public.profili autore on autore.id = s.user_id
      cross join jsonb_array_elements(case when jsonb_typeof(s.dati->'giorni') = 'array'
                                           then s.dati->'giorni' else '[]'::jsonb end) g
      cross join jsonb_array_elements(case when jsonb_typeof(g->'esercizi') = 'array'
                                           then g->'esercizi' else '[]'::jsonb end) e
     where s.user_id <> io.me
       and not public.bloccato_con(s.user_id)
       and (s.visibilita = 'pubblica' or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id)))
       and ((s.user_id = io.mio_pt and autore.ruolo = 'pt') or autore.pt_id = io.mio_pt)
       and coalesce(s.dati->>'visibilita', '') in ('pubblica', 'solo-pt')
       and coalesce(s.dati->>'libera', 'false') <> 'true'
       and coalesce(g->>'tipo', 'workout') = 'workout'
       and coalesce(trim(e->>'nome'), '') <> ''
  ),
  schemi as (
    select e->'schemaBase' as schema from es
     where coalesce(e->>'variaPerSettimana', 'false') <> 'true'
    union all
    select coalesce(e->'settimane'->i, e->'settimane'->(jsonb_array_length(e->'settimane') - 1))
      from es, generate_series(0, public.scheda_settimane(es.dati) - 1) i
     where e->>'variaPerSettimana' = 'true'
       and jsonb_typeof(e->'settimane') = 'array'
  )
  select schema, count(*)::int from schemi group by schema;
$$;
revoke all on function public.stile_mio_pt() from public, anon;
grant execute on function public.stile_mio_pt() to authenticated;
