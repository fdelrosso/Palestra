-- ===========================================================================
-- 2026-10-28 — Le schede del PT scadono, e si chiede il rinnovo.
--
-- Il PT, mandando una scheda (`schede_proposte`), dice fino a quando vale.
-- Scaduta, l'atleta puo' chiedergli il rinnovo; il PT accetta (e mette la
-- data nuova) o rifiuta. La scadenza vive sulla PROPOSTA, non nella scheda
-- dell'atleta: la scheda e' un documento suo, che il PT non scrive (vedi
-- schede_proposte in schema.sql). L'app la legge da `daPt.propostaId`.
--
-- Tutto ADDITIVO e rilanciabile. `proponi_scheda` resta com'era per le app
-- gia' installate: la versione con la scadenza e' una funzione nuova.
-- ===========================================================================


-- --- 1. La scadenza ---------------------------------------------------------
-- Il giorno in cui scade: da quel giorno compreso e' "scaduta". Null = senza
-- scadenza (quelle mandate prima di oggi).
alter table public.schede_proposte
  add column if not exists scade_il date;

create or replace function public.proponi_scheda_scadenza(
  p_atleta uuid, p_dati jsonb, p_nota text, p_scade date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if p_scade is null or p_scade <= current_date then
    raise exception 'Scadenza non valida' using errcode = '22023';
  end if;
  v_id := public.proponi_scheda(p_atleta, p_dati, p_nota);
  update public.schede_proposte set scade_il = p_scade where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.proponi_scheda_scadenza(uuid, jsonb, text, date) from public, anon;
grant execute on function public.proponi_scheda_scadenza(uuid, jsonb, text, date) to authenticated;


-- --- 2. Le richieste di rinnovo ---------------------------------------------
-- Una per volta per scheda: finche' ce n'e' una in attesa non se ne fa
-- un'altra. Le scrivono solo le funzioni qui sotto.
create table if not exists public.rinnovi_scheda (
  id              uuid primary key default gen_random_uuid(),
  proposta_id     text not null references public.schede_proposte(id) on delete cascade,
  pt_id           uuid not null references auth.users(id) on delete cascade,
  atleta_id       uuid not null references auth.users(id) on delete cascade,
  nota            text not null default '' check (char_length(nota) <= 500),
  stato           text not null default 'attesa'
                  check (stato in ('attesa', 'accettata', 'rifiutata')),
  risposta        text not null default '' check (char_length(risposta) <= 500),
  nuova_scadenza  date,
  creata_il       timestamptz not null default now(),
  risposta_il     timestamptz
);
create index if not exists rinnovi_scheda_proposta_idx on public.rinnovi_scheda (proposta_id, creata_il);
create index if not exists rinnovi_scheda_pt_idx on public.rinnovi_scheda (pt_id, stato);
create unique index if not exists rinnovi_scheda_una_in_attesa
  on public.rinnovi_scheda (proposta_id) where stato = 'attesa';

alter table public.rinnovi_scheda enable row level security;

drop policy if exists "rinnovi: i miei" on public.rinnovi_scheda;
create policy "rinnovi: i miei" on public.rinnovi_scheda
  for select to authenticated
  using ((pt_id = auth.uid() or atleta_id = auth.uid())
         and not public.bloccato_con(case when pt_id = auth.uid() then atleta_id else pt_id end));

-- L'atleta chiede: solo per una scheda salvata, scaduta, a chi e' ancora il
-- suo PT.
create or replace function public.chiedi_rinnovo(p_proposta text, p_nota text default '')
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
    raise exception 'Nessuna scheda da rinnovare' using errcode = '22023';
  end if;
  if v_p.scade_il is null or v_p.scade_il > current_date then
    raise exception 'La scheda non è ancora scaduta' using errcode = '22023';
  end if;
  if not public.e_mio_pt(v_p.pt_id) or public.bloccato_con(v_p.pt_id) then
    raise exception 'Non è più il tuo PT' using errcode = '42501';
  end if;
  if exists (select 1 from public.rinnovi_scheda where proposta_id = p_proposta and stato = 'attesa') then
    raise exception 'Rinnovo già chiesto' using errcode = '22023';
  end if;
  insert into public.rinnovi_scheda (proposta_id, pt_id, atleta_id, nota)
  values (p_proposta, v_p.pt_id, auth.uid(), left(coalesce(p_nota, ''), 500))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.chiedi_rinnovo(text, text) from public, anon;
grant execute on function public.chiedi_rinnovo(text, text) to authenticated;

-- Il PT risponde: si' con la data nuova (che va sulla proposta), o no.
create or replace function public.rispondi_rinnovo(
  p_id uuid, p_accetto boolean, p_scadenza date default null, p_risposta text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.rinnovi_scheda;
begin
  select * into v_r from public.rinnovi_scheda
   where id = p_id and pt_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessuna richiesta in attesa' using errcode = '22023';
  end if;
  if p_accetto and (p_scadenza is null or p_scadenza <= current_date) then
    raise exception 'Scadenza non valida' using errcode = '22023';
  end if;
  update public.rinnovi_scheda
     set stato = case when p_accetto then 'accettata' else 'rifiutata' end,
         risposta = left(coalesce(p_risposta, ''), 500),
         nuova_scadenza = case when p_accetto then p_scadenza end,
         risposta_il = now()
   where id = p_id;
  if p_accetto then
    update public.schede_proposte set scade_il = p_scadenza where id = v_r.proposta_id;
  end if;
end;
$$;
revoke all on function public.rispondi_rinnovo(uuid, boolean, date, text) from public, anon;
grant execute on function public.rispondi_rinnovo(uuid, boolean, date, text) to authenticated;


-- --- 3. Le notifiche ---------------------------------------------------------
-- `notifiche_rinnovi()` sta nella migrazione dopo (20261028140000), che ci
-- aggiunge lo sblocco delle parti: definita in due file, rilanciando tutto in
-- ordine la prima si scontrerebbe con la forma della seconda.
