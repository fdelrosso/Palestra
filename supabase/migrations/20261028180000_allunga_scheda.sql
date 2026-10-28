-- ===========================================================================
-- 2026-10-28 — L'atleta chiede al PT di allungare la scheda.
--
-- Diverso dal rinnovo (20261028130000), che sposta solo la scadenza: qui la
-- scheda cresce. Il PT, se accetta, dice di quante settimane e scrive gli
-- esercizi (riapre la scheda nell'editor, pages/EditorPage); la scheda nuova
-- prende il posto di quella della proposta, e sul telefono dell'atleta la
-- copia si aggiorna da sola (lib/proposteScheda → allungamentiArrivati,
-- guardando `allungata_il`).
--
-- Con una scheda a parti (20261028140000): la scheda intera cresce; le
-- settimane nuove si vedono subito solo se l'atleta vedeva gia' tutto,
-- altrimenti restano da sbloccare come le altre. Il taglio lo fa l'app del PT.
--
-- Additivo e rilanciabile, dopo 20261028140000.
-- ===========================================================================

-- Quando il PT l'ha allungata l'ultima volta (null = mai).
alter table public.schede_proposte add column if not exists allungata_il timestamptz;

-- Una richiesta in attesa per volta per scheda, come i rinnovi.
create table if not exists public.allungamenti_scheda (
  id                  uuid primary key default gen_random_uuid(),
  proposta_id         text not null references public.schede_proposte(id) on delete cascade,
  pt_id               uuid not null references auth.users(id) on delete cascade,
  atleta_id           uuid not null references auth.users(id) on delete cascade,
  nota                text not null default '' check (char_length(nota) <= 500),
  stato               text not null default 'attesa'
                      check (stato in ('attesa', 'accettata', 'rifiutata')),
  risposta            text not null default '' check (char_length(risposta) <= 1000),
  settimane_aggiunte  int,
  creata_il           timestamptz not null default now(),
  risposta_il         timestamptz
);
create index if not exists allungamenti_scheda_proposta_idx on public.allungamenti_scheda (proposta_id, creata_il);
create index if not exists allungamenti_scheda_pt_idx on public.allungamenti_scheda (pt_id, stato);
create unique index if not exists allungamenti_scheda_una_in_attesa
  on public.allungamenti_scheda (proposta_id) where stato = 'attesa';

alter table public.allungamenti_scheda enable row level security;

drop policy if exists "allungamenti: i miei" on public.allungamenti_scheda;
create policy "allungamenti: i miei" on public.allungamenti_scheda
  for select to authenticated
  using ((pt_id = auth.uid() or atleta_id = auth.uid())
         and not public.bloccato_con(case when pt_id = auth.uid() then atleta_id else pt_id end));

-- L'atleta chiede: una scheda salvata, con una fine, a chi e' ancora il suo PT.
create or replace function public.chiedi_allungamento(p_proposta text, p_nota text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p  public.schede_proposte;
  v_id uuid;
begin
  select * into v_p from public.schede_proposte
   where id = p_proposta and atleta_id = auth.uid() and stato = 'accettata';
  if not found then
    raise exception 'Nessuna scheda da allungare' using errcode = '22023';
  end if;
  if coalesce((v_p.dati ->> 'senzaFine')::boolean, false) then
    raise exception 'Una scheda senza fine non si allunga' using errcode = '22023';
  end if;
  if not public.e_mio_pt(v_p.pt_id) or public.bloccato_con(v_p.pt_id) then
    raise exception 'Non è più il tuo PT' using errcode = '42501';
  end if;
  if exists (select 1 from public.allungamenti_scheda where proposta_id = p_proposta and stato = 'attesa') then
    raise exception 'Allungamento già chiesto' using errcode = '22023';
  end if;
  insert into public.allungamenti_scheda (proposta_id, pt_id, atleta_id, nota)
  values (p_proposta, v_p.pt_id, auth.uid(), left(coalesce(p_nota, ''), 500))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.chiedi_allungamento(text, text) from public, anon;
grant execute on function public.chiedi_allungamento(text, text) to authenticated;

-- Il PT risponde. Si': `p_intera` la scheda allungata intera, `p_dati` quella
-- che vede l'atleta (uguale, o tagliata a `p_visibili`), `p_totali` le
-- settimane in tutto, `p_scade` facoltativa (sposta la scadenza).
-- No: basta `p_accetto = false`, con un messaggio se si vuole.
create or replace function public.rispondi_allungamento(
  p_id uuid, p_accetto boolean,
  p_intera jsonb default null, p_dati jsonb default null,
  p_totali int default null, p_visibili int default null,
  p_scade date default null, p_risposta text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r     public.allungamenti_scheda;
  v_p     public.schede_proposte;
  v_prima int;
begin
  select * into v_r from public.allungamenti_scheda
   where id = p_id and pt_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessuna richiesta in attesa' using errcode = '22023';
  end if;

  if not p_accetto then
    update public.allungamenti_scheda
       set stato = 'rifiutata', risposta = left(coalesce(p_risposta, ''), 1000), risposta_il = now()
     where id = p_id;
    return;
  end if;

  select * into v_p from public.schede_proposte where id = v_r.proposta_id and stato = 'accettata';
  if not found then
    raise exception 'La scheda non è più fra le sue' using errcode = '22023';
  end if;
  v_prima := coalesce(v_p.settimane_totali, (v_p.dati ->> 'numeroSettimane')::int, 0);
  if p_totali is null or p_totali <= v_prima then
    raise exception 'Settimane non valide' using errcode = '22023';
  end if;
  if p_visibili is null or p_visibili < 1 or p_visibili > p_totali then
    raise exception 'Parti non valide' using errcode = '22023';
  end if;
  if p_intera is null or jsonb_typeof(p_intera) <> 'object' or octet_length(p_intera::text) > 500000
     or p_dati is null or jsonb_typeof(p_dati) <> 'object' or octet_length(p_dati::text) > 500000 then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  if p_scade is not null and p_scade <= current_date then
    raise exception 'Scadenza non valida' using errcode = '22023';
  end if;

  update public.schede_proposte
     set dati = p_dati,
         settimane_totali = p_totali,
         settimane_visibili = p_visibili,
         allungata_il = now(),
         scade_il = coalesce(p_scade, scade_il)
   where id = v_p.id;
  insert into public.schede_proposte_intere (proposta_id, pt_id, dati)
  values (v_p.id, auth.uid(), p_intera)
  on conflict (proposta_id) do update set dati = excluded.dati;
  update public.allungamenti_scheda
     set stato = 'accettata', risposta = left(coalesce(p_risposta, ''), 1000),
         settimane_aggiunte = p_totali - v_prima, risposta_il = now()
   where id = p_id;
end;
$$;
revoke all on function public.rispondi_allungamento(uuid, boolean, jsonb, jsonb, int, int, date, text) from public, anon;
grant execute on function public.rispondi_allungamento(uuid, boolean, jsonb, jsonb, int, int, date, text) to authenticated;


-- Le notifiche, nel cuoricino: al PT la richiesta, all'atleta la risposta.
-- Stessa forma di `notifiche_rinnovi()`, cosi' l'app le legge allo stesso modo
-- (tipi 'allunga-richiesta', 'allunga-accettata', 'allunga-rifiutata';
-- `settimane` = quante in piu').
create or replace function public.notifiche_allungamenti()
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
    select a.proposta_id, a.atleta_id, 'allunga-richiesta'::text as tipo, a.atleta_id as chi,
           a.creata_il as quando, a.nota as testo, a.settimane_aggiunte as settimane
      from public.allungamenti_scheda a
     where a.pt_id = auth.uid()
    union all
    select a.proposta_id, a.atleta_id, 'allunga-' || a.stato, a.pt_id, a.risposta_il, a.risposta, a.settimane_aggiunte
      from public.allungamenti_scheda a
     where a.atleta_id = auth.uid() and a.stato <> 'attesa'
  )
  select e.proposta_id, e.atleta_id, p.nome, e.tipo, pc.nome,
         e.quando, e.testo, null::date, e.settimane, e.quando > (select il from letto)
    from eventi e
    join public.schede_proposte p on p.id = e.proposta_id
    join public.profili pc on pc.id = e.chi
   where not public.bloccato_con(e.chi)
   order by e.quando desc
   limit 100;
$$;
revoke all on function public.notifiche_allungamenti() from public, anon;
grant execute on function public.notifiche_allungamenti() to authenticated;
