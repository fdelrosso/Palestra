-- Le novita' PT del 2026-10-20 (schede dal PT, vetrina, schede collegate al PT).
-- Si incolla tutto nell'SQL Editor di Supabase e si lancia: e' idempotente.

-- ===========================================================================
-- LA SCHEDA DAL PT (2026-10-20)
--
-- Il PT scrive una scheda per un suo atleta dall'app (prima arrivava solo da
-- WhatsApp, e passava dall'import del testo). Non finisce DIRETTAMENTE fra le
-- schede dell'atleta: e' una PROPOSTA. L'atleta la guarda e:
--   - "Salva" → l'app la copia fra le SUE schede (non attiva: la rende attiva
--     lui, quando vuole) e la proposta diventa 'accettata';
--   - "Rifiuta" → 'rifiutata'.
-- Finche' e' in attesa il PT puo' ritirarla ('ritirata').
--
-- ⚠️ La copia fra le schede la fa l'APP, non il database: le schede sono un
-- documento dell'atleta, scritto solo da lui (vedi SCHEDE). Qui si tiene solo
-- la proposta e il suo stato. `dati` e' la scheda intera (json dell'app),
-- `nome` sta fuori per gli elenchi del PT, che non scaricano il json.
--
-- Le righe le scrivono solo le funzioni: `proponi_scheda` (il PT, solo ai
-- PROPRI atleti: profili.pt_id), `rispondi_proposta` (l'atleta),
-- `ritira_proposta` (il PT).
-- ===========================================================================
create table if not exists public.schede_proposte (
  id           text primary key default gen_random_uuid()::text,
  pt_id        uuid not null references auth.users(id) on delete cascade,
  atleta_id    uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  nota         text not null default '',
  dati         jsonb not null,
  stato        text not null default 'attesa'
               check (stato in ('attesa', 'accettata', 'rifiutata', 'ritirata')),
  creata_il    timestamptz not null default now(),
  risposta_il  timestamptz
);
create index if not exists schede_proposte_atleta_idx on public.schede_proposte (atleta_id, stato);
create index if not exists schede_proposte_pt_idx on public.schede_proposte (pt_id, creata_il);

alter table public.schede_proposte enable row level security;

drop policy if exists "proposte: le mie" on public.schede_proposte;
create policy "proposte: le mie" on public.schede_proposte
  for select using ((pt_id = auth.uid() or atleta_id = auth.uid())
                    and not public.bloccato_con(case when pt_id = auth.uid() then atleta_id else pt_id end));

create or replace function public.proponi_scheda(p_atleta uuid, p_dati jsonb, p_nota text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   text;
  v_nome text;
begin
  if not public.e_mio_atleta(p_atleta) or public.bloccato_con(p_atleta) then
    raise exception 'Non è un tuo atleta' using errcode = '42501';
  end if;
  if p_dati is null or jsonb_typeof(p_dati) <> 'object' then
    raise exception 'Scheda non valida' using errcode = '22023';
  end if;
  -- Una scheda e' testo: mezzo mega e' gia' tantissimo.
  if octet_length(p_dati::text) > 500000 then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  v_nome := left(coalesce(nullif(trim(p_dati ->> 'nome'), ''), 'Scheda senza nome'), 120);
  insert into public.schede_proposte (pt_id, atleta_id, nome, nota, dati)
  values (auth.uid(), p_atleta, v_nome, left(coalesce(p_nota, ''), 1000), p_dati)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.proponi_scheda(uuid, jsonb, text) from public, anon;
grant execute on function public.proponi_scheda(uuid, jsonb, text) to authenticated;

create or replace function public.rispondi_proposta(p_id text, p_accetto boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.schede_proposte
     set stato = case when p_accetto then 'accettata' else 'rifiutata' end,
         risposta_il = now()
   where id = p_id and atleta_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessuna proposta in attesa' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.rispondi_proposta(text, boolean) from public, anon;
grant execute on function public.rispondi_proposta(text, boolean) to authenticated;

create or replace function public.ritira_proposta(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.schede_proposte
     set stato = 'ritirata', risposta_il = now()
   where id = p_id and pt_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessuna proposta in attesa' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.ritira_proposta(text) from public, anon;
grant execute on function public.ritira_proposta(text) to authenticated;


-- ===========================================================================
-- LA VETRINA DEL PT (2026-10-20)
--
-- Cosa un personal trainer racconta di se' a chi lo trova: due righe di
-- presentazione, le specializzazioni, dove lavora e le tariffe (testo libero:
-- "40€ a seduta, 120€ al mese"). Compare sulla sua pagina (UtentePage) sopra
-- "Contatta il PT". Una riga per PT, la scrive solo lui.
--
-- Si legge da chiunque abbia un account, salvo i bloccati: e' fatta apposta
-- per essere vista da chi un PT ancora non ce l'ha. Dell'atleta non c'e'
-- niente: e' la vetrina di un professionista, non un profilo personale.
-- ===========================================================================
create table if not exists public.vetrine_pt (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  bio               text not null default '' check (char_length(bio) <= 600),
  specializzazioni  text[] not null default '{}' check (cardinality(specializzazioni) <= 12),
  dove              text not null default '' check (char_length(dove) <= 120),
  tariffe           text not null default '' check (char_length(tariffe) <= 300),
  aggiornata_il     timestamptz not null default now()
);

alter table public.vetrine_pt enable row level security;

drop policy if exists "vetrine pt: le leggono tutti" on public.vetrine_pt;
create policy "vetrine pt: le leggono tutti" on public.vetrine_pt
  for select to authenticated using (not public.bloccato_con(user_id));

drop policy if exists "vetrine pt: la mia" on public.vetrine_pt;
create policy "vetrine pt: la mia" on public.vetrine_pt
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from public.profili where id = auth.uid() and ruolo = 'pt'));


-- ===========================================================================
-- "QUESTA SCHEDA E' DEL MIO PT" (2026-10-20)
--
-- Il verso opposto della SCHEDA DAL PT: l'atleta ha gia' una scheda (scritta
-- da se', incollata da WhatsApp, di qualche mese fa) e dice che l'ha fatta il
-- suo PT. Al PT arriva la richiesta (in Lavoro); se accetta, la scheda resta
-- dell'atleta ma risulta COLLEGATA a lui: `dati.daPt = {id, nome}`, come le
-- schede nate da una proposta.
--
-- Solo verso il PT di adesso (profili.pt_id): un PT di prima non lo vede piu'
-- come atleta, e chiunque altro riceverebbe richieste da sconosciuti.
-- `dati` e' una copia della scheda al momento della richiesta, senza
-- completamenti: serve al PT per vedere cosa gli si attribuisce, anche se
-- l'atleta l'ha nascosta. Accettando, `rispondi_attribuzione` scrive `daPt`
-- nella scheda vera (l'app lo rimette anche da se', vedi SchedeDalPt).
-- Le righe le scrivono solo le funzioni.
-- ===========================================================================
create table if not exists public.schede_attribuite (
  id           text primary key default gen_random_uuid()::text,
  atleta_id    uuid not null references auth.users(id) on delete cascade,
  pt_id        uuid not null references auth.users(id) on delete cascade,
  scheda_id    text not null,
  nome         text not null,
  dati         jsonb not null,
  stato        text not null default 'attesa'
               check (stato in ('attesa', 'accettata', 'rifiutata', 'annullata')),
  creata_il    timestamptz not null default now(),
  risposta_il  timestamptz
);
create index if not exists schede_attribuite_pt_idx on public.schede_attribuite (pt_id, stato);
create index if not exists schede_attribuite_atleta_idx on public.schede_attribuite (atleta_id);
-- Una sola richiesta aperta per scheda.
create unique index if not exists schede_attribuite_una_aperta
  on public.schede_attribuite (scheda_id) where stato = 'attesa';

alter table public.schede_attribuite enable row level security;

drop policy if exists "attribuzioni: le mie" on public.schede_attribuite;
create policy "attribuzioni: le mie" on public.schede_attribuite
  for select using ((pt_id = auth.uid() or atleta_id = auth.uid())
                    and not public.bloccato_con(case when pt_id = auth.uid() then atleta_id else pt_id end));

create or replace function public.attribuisci_scheda(p_scheda text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pt  uuid;
  v_s   public.schede%rowtype;
  v_id  text;
begin
  select pt_id into v_pt from public.profili where id = auth.uid();
  if v_pt is null or public.bloccato_con(v_pt) then
    raise exception 'Non hai un PT' using errcode = '22023';
  end if;
  select * into v_s from public.schede where id = p_scheda and user_id = auth.uid();
  if v_s.id is null then
    raise exception 'Scheda non trovata' using errcode = '22023';
  end if;
  if v_s.dati -> 'daPt' ->> 'id' = v_pt::text then
    raise exception 'Già collegata' using errcode = '22023';
  end if;
  select id into v_id from public.schede_attribuite where scheda_id = p_scheda and stato = 'attesa';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.schede_attribuite (atleta_id, pt_id, scheda_id, nome, dati)
  values (auth.uid(), v_pt, p_scheda,
          left(coalesce(nullif(trim(v_s.dati ->> 'nome'), ''), 'Scheda senza nome'), 120),
          v_s.dati - 'completamenti')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.attribuisci_scheda(text) from public, anon;
grant execute on function public.attribuisci_scheda(text) to authenticated;

create or replace function public.rispondi_attribuzione(p_id text, p_accetto boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a  public.schede_attribuite%rowtype;
begin
  select * into v_a from public.schede_attribuite
   where id = p_id and pt_id = auth.uid() and stato = 'attesa';
  if v_a.id is null then
    raise exception 'Nessuna richiesta in attesa' using errcode = '22023';
  end if;
  if p_accetto and not public.e_mio_atleta(v_a.atleta_id) then
    raise exception 'Non è un tuo atleta' using errcode = '42501';
  end if;
  update public.schede_attribuite
     set stato = case when p_accetto then 'accettata' else 'rifiutata' end,
         risposta_il = now()
   where id = p_id;
  if p_accetto then
    update public.schede
       set dati = jsonb_set(dati, '{daPt}',
                            jsonb_build_object('id', auth.uid(),
                                               'nome', (select nome from public.profili where id = auth.uid()))),
           aggiornata_il = now()
     where id = v_a.scheda_id and user_id = v_a.atleta_id;
  end if;
end;
$$;

revoke all on function public.rispondi_attribuzione(text, boolean) from public, anon;
grant execute on function public.rispondi_attribuzione(text, boolean) to authenticated;

create or replace function public.annulla_attribuzione(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.schede_attribuite
     set stato = 'annullata', risposta_il = now()
   where id = p_id and atleta_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessuna richiesta in attesa' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.annulla_attribuzione(text) from public, anon;
grant execute on function public.annulla_attribuzione(text) to authenticated;
