-- ===========================================================================
-- 2026-10-28 — La scheda del PT a parti: si manda intera, si vede a pezzi.
--
-- Caso tipico: tre mesi pagati un mese per volta. Il PT scrive le 12
-- settimane, all'atleta arrivano le prime 4; arrivato il pagamento sblocca le
-- 4 dopo, e cosi' via.
--
-- ⚠️ All'atleta arriva DAVVERO solo la parte sbloccata: `schede_proposte.dati`
-- (che l'atleta legge) e' la scheda tagliata alle settimane visibili. Quella
-- intera sta in `schede_proposte_intere`, che legge solo il PT. Il taglio lo
-- fa l'app del PT (lib/schedaAParti), qui si controlla chi puo' cosa.
--
-- Additivo e rilanciabile, dopo 20261028130000 (usa proponi_scheda_scadenza).
-- ===========================================================================

-- Null = scheda intera, come sempre.
alter table public.schede_proposte add column if not exists settimane_visibili int;
alter table public.schede_proposte add column if not exists settimane_totali int;
-- Quante per volta, come le ha scelte il PT: la proposta del prossimo sblocco.
alter table public.schede_proposte add column if not exists settimane_passo int;
-- Quando il PT ha sbloccato l'ultima parte: e' la notifica dell'atleta.
alter table public.schede_proposte add column if not exists sbloccata_il timestamptz;

create table if not exists public.schede_proposte_intere (
  proposta_id text primary key references public.schede_proposte(id) on delete cascade,
  pt_id       uuid not null references auth.users(id) on delete cascade,
  dati        jsonb not null
);
alter table public.schede_proposte_intere enable row level security;

drop policy if exists "schede intere: solo il PT" on public.schede_proposte_intere;
create policy "schede intere: solo il PT" on public.schede_proposte_intere
  for select to authenticated using (pt_id = auth.uid());

create or replace function public.proponi_scheda_a_parti(
  p_atleta uuid, p_dati jsonb, p_intera jsonb, p_nota text, p_scade date,
  p_visibili int, p_totali int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if p_visibili is null or p_totali is null or p_visibili < 1 or p_visibili >= p_totali then
    raise exception 'Parti non valide' using errcode = '22023';
  end if;
  if p_intera is null or jsonb_typeof(p_intera) <> 'object' or octet_length(p_intera::text) > 500000 then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  v_id := public.proponi_scheda_scadenza(p_atleta, p_dati, p_nota, p_scade);
  update public.schede_proposte
     set settimane_visibili = p_visibili, settimane_totali = p_totali, settimane_passo = p_visibili
   where id = v_id;
  insert into public.schede_proposte_intere (proposta_id, pt_id, dati)
  values (v_id, auth.uid(), p_intera);
  return v_id;
end;
$$;
revoke all on function public.proponi_scheda_a_parti(uuid, jsonb, jsonb, text, date, int, int) from public, anon;
grant execute on function public.proponi_scheda_a_parti(uuid, jsonb, jsonb, text, date, int, int) to authenticated;

-- Il PT sblocca fino alla settimana `p_visibili` (la scheda tagliata la manda
-- lui). Con `p_scade` sposta anche la scadenza: il mese pagato.
create or replace function public.sblocca_settimane(
  p_id text, p_dati jsonb, p_visibili int, p_scade date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.schede_proposte;
begin
  select * into v_p from public.schede_proposte
   where id = p_id and pt_id = auth.uid() and stato in ('attesa', 'accettata')
     and settimane_totali is not null;
  if not found then
    raise exception 'Nessuna proposta a parti' using errcode = '22023';
  end if;
  if p_visibili is null or p_visibili <= coalesce(v_p.settimane_visibili, 0) or p_visibili > v_p.settimane_totali then
    raise exception 'Parti non valide' using errcode = '22023';
  end if;
  if p_dati is null or jsonb_typeof(p_dati) <> 'object' or octet_length(p_dati::text) > 500000 then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  if p_scade is not null and p_scade <= current_date then
    raise exception 'Scadenza non valida' using errcode = '22023';
  end if;
  update public.schede_proposte
     set dati = p_dati,
         settimane_visibili = p_visibili,
         sbloccata_il = now(),
         scade_il = coalesce(p_scade, scade_il)
   where id = p_id;
end;
$$;
revoke all on function public.sblocca_settimane(text, jsonb, int, date) from public, anon;
grant execute on function public.sblocca_settimane(text, jsonb, int, date) to authenticated;


-- --- Le notifiche: anche "il PT ha sbloccato le settimane fino alla N" -------
-- Cambia la forma del risultato (la colonna `settimane`): si rifa' da capo.
drop function if exists public.notifiche_rinnovi();
create function public.notifiche_rinnovi()
returns table (
  proposta_id text,
  atleta_id   uuid,
  scheda_nome text,
  tipo        text,
  chi_nome    text,
  quando      timestamptz,
  testo       text,
  scadenza    date,
  settimane   int,
  nuovo       boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  ),
  eventi as (
    select r.proposta_id, r.atleta_id, 'richiesta'::text as tipo, r.atleta_id as chi,
           r.creata_il as quando, r.nota as testo, null::date as scadenza, null::int as settimane
      from public.rinnovi_scheda r
     where r.pt_id = auth.uid()
    union all
    select r.proposta_id, r.atleta_id, r.stato, r.pt_id, r.risposta_il, r.risposta, r.nuova_scadenza, null
      from public.rinnovi_scheda r
     where r.atleta_id = auth.uid() and r.stato <> 'attesa'
    union all
    select p.id, p.atleta_id, 'scaduta', p.pt_id, p.scade_il::timestamptz, '', p.scade_il, null
      from public.schede_proposte p
     where p.atleta_id = auth.uid() and p.stato = 'accettata'
       and p.scade_il is not null and p.scade_il <= current_date
    union all
    select p.id, p.atleta_id, 'sbloccata', p.pt_id, p.sbloccata_il, '', p.scade_il, p.settimane_visibili
      from public.schede_proposte p
     where p.atleta_id = auth.uid() and p.stato in ('attesa', 'accettata')
       and p.sbloccata_il is not null
  )
  select e.proposta_id, e.atleta_id, p.nome, e.tipo, pc.nome,
         e.quando, e.testo, e.scadenza, e.settimane, e.quando > (select il from letto)
    from eventi e
    join public.schede_proposte p on p.id = e.proposta_id
    join public.profili pc on pc.id = e.chi
   where not public.bloccato_con(e.chi)
   order by e.quando desc
   limit 100;
$$;
revoke all on function public.notifiche_rinnovi() from public, anon;
grant execute on function public.notifiche_rinnovi() to authenticated;
