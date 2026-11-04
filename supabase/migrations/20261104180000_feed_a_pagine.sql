-- ---------------------------------------------------------------------------
-- Il feed e il profilo A PAGINE (2026-11-04, ramo `egress`, spec
-- docs/superpowers/specs/2026-11-04-feed-a-pagine-design.md).
--
-- Prima feed e profilo scaricavano `allenamenti_visibili()`: TUTTI gli
-- allenamenti che si possono vedere, di tutti, col json intero, a ogni
-- apertura. Qui pagine di 20, dal più recente, per chiave (data, id): un
-- allenamento nuovo mentre si scorre non sposta le pagine.
--
-- ⚠️ LE REGOLE DI VISIBILITA' sono in `vedo_allenamento`, una volta. Le stesse
-- stanno ancora scritte in `allenamenti_visibili` (20261104120000), che serve
-- finché Schede generali, Consigliato e Atleti non passano di qui: chi ne
-- cambia una cambia anche l'altra.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

create or replace function public.vedo_allenamento(p_persona uuid, p_visibilita text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not public.bloccato_con(p_persona)
     and (p_persona = auth.uid()
          or (p_visibilita = 'pubblica' and not public.pubblicazione_bloccata(p_persona))
          or (p_visibilita = 'solo-pt' and public.e_mio_atleta(p_persona)));
$$;
revoke all on function public.vedo_allenamento(uuid, text) from public, anon;
grant execute on function public.vedo_allenamento(uuid, text) to authenticated;

-- Le linguette del feed (pages/FeedPage), e 'utente' per il profilo di un
-- altro. Come il client di prima: degli ALTRI solo i pubblici (visibileA senza
-- comePt); 'atleti' anche i "solo al PT", da quando li si segue; i propri mai
-- (il feed li toglieva comunque, e il proprio profilo li prende dal telefono).
create or replace function public.feed_allenamenti(
  p_chi         text,
  p_prima_di    timestamptz default null,
  p_prima_di_id text default null,
  p_quanti      int default 20,
  p_modo        text default null,
  p_km          double precision default 5,
  p_utente      uuid default null
)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  ),
  zona as (
    select z::text as palestra_id
      from public.palestre_della_mia_zona(p_modo, p_km) z
     where p_chi = 'palestra'
  )
  select
    a.id,
    a.user_id,
    a.scheda_id,
    a.data,
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
  where public.vedo_allenamento(a.user_id, a.visibilita)
    and (p_prima_di is null or (a.data, a.id) < (p_prima_di, p_prima_di_id))
    and case p_chi
      when 'atleti' then
        autore.pt_id = io.me
        and a.visibilita in ('pubblica', 'solo-pt')
        and (autore.associato_il is null or a.data >= autore.associato_il)
      when 'utente' then
        a.user_id = p_utente and a.user_id <> io.me and a.visibilita = 'pubblica'
      else
        a.user_id <> io.me and a.visibilita = 'pubblica'
        and (
          p_chi = 'tutti'
          or (p_chi = 'amici' and exists (
                select 1 from public.relazioni r
                 where r.tipo = 'amicizia' and r.stato = 'accettata'
                   and ((r.da_id = io.me and r.a_id = a.user_id)
                     or (r.a_id = io.me and r.da_id = a.user_id))))
          -- La palestra conta solo se a me la si mostra (152ª): come
          -- dati_allenamento_per_me, che altrimenti la toglie dal json.
          or (p_chi = 'palestra'
              and public.vedo_palestra_di(a.user_id)
              and a.dati->>'palestraId' in (select palestra_id from zona))
        )
    end
  order by a.data desc, a.id desc
  limit least(greatest(coalesce(p_quanti, 20), 1), 50);
$$;
revoke all on function public.feed_allenamenti(text, timestamptz, text, int, text, double precision, uuid) from public, anon;
grant execute on function public.feed_allenamenti(text, timestamptz, text, int, text, double precision, uuid) to authenticated;

create or replace function public.allenamenti_di(
  p_utente uuid, p_prima_di timestamptz default null, p_prima_di_id text default null, p_quanti int default 20
)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  select * from public.feed_allenamenti('utente', p_prima_di, p_prima_di_id, p_quanti, null, 5, p_utente);
$$;
revoke all on function public.allenamenti_di(uuid, timestamptz, text, int) from public, anon;
grant execute on function public.allenamenti_di(uuid, timestamptz, text, int) to authenticated;

create or replace function public.conta_allenamenti_di(p_utente uuid)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*)
    from public.allenamenti a
   where a.user_id = p_utente
     and a.user_id <> auth.uid()
     and a.visibilita = 'pubblica'
     and public.vedo_allenamento(a.user_id, a.visibilita);
$$;
revoke all on function public.conta_allenamenti_di(uuid) from public, anon;
grant execute on function public.conta_allenamenti_di(uuid) to authenticated;

-- ponytail: rilegge schede_visibili() intera e filtra (una funzione security
-- definer non si "apre" nella query); le schede sono poche. Da riscrivere col
-- pezzo "Schede generali", quando schede_visibili se ne va.
create or replace function public.schede_di(p_utente uuid)
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean, dati jsonb)
language sql stable security definer set search_path = public as $$
  select * from public.schede_visibili() s where s.user_id = p_utente;
$$;
revoke all on function public.schede_di(uuid) from public, anon;
grant execute on function public.schede_di(uuid) to authenticated;

-- Il post aperto da un link o da una notifica: per id, o per la chiave di
-- prima della 106ª (id_allenamento). Gli altri solo pubblici, come nel feed.
create or replace function public.allenamento_per_chiave(p_chiave text)
returns table (id text, user_id uuid, scheda_id text, data timestamptz, relazione_pt int, dati jsonb)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select a.id, a.user_id, a.scheda_id, a.data,
    case
      when a.user_id = io.me then 0
      when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end,
    public.dati_allenamento_per_me(a.user_id, a.dati)
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where a.id = public.id_allenamento(p_chiave)
    and public.vedo_allenamento(a.user_id, a.visibilita)
    and (a.user_id = io.me or a.visibilita = 'pubblica');
$$;
revoke all on function public.allenamento_per_chiave(text) from public, anon;
grant execute on function public.allenamento_per_chiave(text) to authenticated;

create index if not exists allenamenti_data_id_idx on public.allenamenti (data desc, id desc);
create index if not exists allenamenti_utente_data_idx on public.allenamenti (user_id, data desc);
