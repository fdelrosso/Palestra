-- ===========================================================================
-- 2026-10-28 — Gli appuntamenti fra atleta e PT.
--
-- L'atleta (solo chi ha un PT: profili.pt_id) chiede un appuntamento: un
-- motivo e una lista di giorni e orari. Il PT ne sceglie uno (fissato) o
-- manda indietro altri orari; l'atleta fa lo stesso, e cosi' via finche'
-- uno dei due ne accetta uno dell'altro. Chi risponde con orari nuovi
-- RIFIUTA quelli ancora aperti dell'altro, e un orario rifiutato non si puo'
-- riproporre in quella trattativa (da nessuno dei due).
--
-- Fissato, finisce anche nell'agenda del PT (`agenda_pt`, migrazione
-- 20261028120000); annullato, ne esce.
--
-- Tutto additivo e rilanciabile. Le righe le scrivono solo le funzioni.
-- ===========================================================================

create table if not exists public.appuntamenti (
  id           uuid primary key default gen_random_uuid(),
  atleta_id    uuid not null references auth.users(id) on delete cascade,
  pt_id        uuid not null references auth.users(id) on delete cascade,
  motivo       text not null default '' check (char_length(motivo) <= 500),
  stato        text not null default 'trattativa'
               check (stato in ('trattativa', 'fissato', 'annullato')),
  -- A chi tocca rispondere, in trattativa: 'pt' | 'atleta'.
  turno        text check (turno in ('pt', 'atleta')),
  -- Quello fissato.
  giorno       date,
  ora          text check (ora is null or ora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  agenda_id    uuid references public.agenda_pt(id) on delete set null,
  -- L'ultima mossa, per le notifiche: chi, cosa, quando.
  ultimo_da    uuid,
  ultimo_tipo  text not null default 'richiesta'
               check (ultimo_tipo in ('richiesta', 'proposte', 'fissato', 'annullato')),
  ultimo_il    timestamptz not null default now(),
  creato_il    timestamptz not null default now()
);
create index if not exists appuntamenti_atleta_idx on public.appuntamenti (atleta_id, ultimo_il);
create index if not exists appuntamenti_pt_idx on public.appuntamenti (pt_id, ultimo_il);

create table if not exists public.appuntamenti_orari (
  id              uuid primary key default gen_random_uuid(),
  appuntamento_id uuid not null references public.appuntamenti(id) on delete cascade,
  da_id           uuid not null references auth.users(id) on delete cascade,
  giorno          date not null,
  ora             text not null check (ora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  stato           text not null default 'aperto' check (stato in ('aperto', 'rifiutato', 'scelto')),
  -- Il messaggio che accompagna questo giro di orari (uguale per tutto il giro).
  nota            text not null default '' check (char_length(nota) <= 500),
  creato_il       timestamptz not null default now()
);
create index if not exists appuntamenti_orari_idx on public.appuntamenti_orari (appuntamento_id, creato_il);

alter table public.appuntamenti enable row level security;
alter table public.appuntamenti_orari enable row level security;

drop policy if exists "appuntamenti: i miei" on public.appuntamenti;
create policy "appuntamenti: i miei" on public.appuntamenti
  for select to authenticated
  using ((atleta_id = auth.uid() or pt_id = auth.uid())
         and not public.bloccato_con(case when pt_id = auth.uid() then atleta_id else pt_id end));

drop policy if exists "appuntamenti orari: dei miei" on public.appuntamenti_orari;
create policy "appuntamenti orari: dei miei" on public.appuntamenti_orari
  for select to authenticated
  using (exists (select 1 from public.appuntamenti a
                  where a.id = appuntamento_id and (a.atleta_id = auth.uid() or a.pt_id = auth.uid())));


-- Gli orari di un giro: [{giorno:'AAAA-MM-GG', ora:'HH:MM'}], da 1 a 10, da
-- oggi in poi, senza doppioni e senza quelli gia' rifiutati.
create or replace function public.appuntamenti_metti_orari(
  p_app uuid, p_orari jsonb, p_nota text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o jsonb;
  v_giorno date;
  v_ora text;
  v_n int := 0;
begin
  if p_orari is null or jsonb_typeof(p_orari) <> 'array'
     or jsonb_array_length(p_orari) < 1 or jsonb_array_length(p_orari) > 10 then
    raise exception 'Orari non validi' using errcode = '22023';
  end if;
  for v_o in select * from jsonb_array_elements(p_orari) loop
    v_giorno := (v_o ->> 'giorno')::date;
    v_ora := v_o ->> 'ora';
    if v_giorno is null or v_giorno < current_date or v_ora !~ '^[0-2][0-9]:[0-5][0-9]$' then
      raise exception 'Orari non validi' using errcode = '22023';
    end if;
    if exists (select 1 from public.appuntamenti_orari
                where appuntamento_id = p_app and giorno = v_giorno and ora = v_ora
                  and stato = 'rifiutato') then
      raise exception 'Orario già rifiutato' using errcode = '22023';
    end if;
    if not exists (select 1 from public.appuntamenti_orari
                    where appuntamento_id = p_app and giorno = v_giorno and ora = v_ora
                      and stato = 'aperto' and da_id = auth.uid()) then
      insert into public.appuntamenti_orari (appuntamento_id, da_id, giorno, ora, nota)
      values (p_app, auth.uid(), v_giorno, v_ora, left(coalesce(p_nota, ''), 500));
      v_n := v_n + 1;
    end if;
  end loop;
  if v_n = 0 then
    raise exception 'Orari non validi' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.appuntamenti_metti_orari(uuid, jsonb, text) from public, anon, authenticated;

-- L'atleta chiede.
create or replace function public.chiedi_appuntamento(p_motivo text, p_orari jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pt uuid;
  v_id uuid;
begin
  select pt_id into v_pt from public.profili where id = auth.uid();
  if v_pt is null or public.bloccato_con(v_pt) then
    raise exception 'Nessun PT' using errcode = '42501';
  end if;
  insert into public.appuntamenti (atleta_id, pt_id, motivo, turno, ultimo_da, ultimo_tipo)
  values (auth.uid(), v_pt, left(coalesce(p_motivo, ''), 500), 'pt', auth.uid(), 'richiesta')
  returning id into v_id;
  perform public.appuntamenti_metti_orari(v_id, p_orari, '');
  return v_id;
end;
$$;
revoke all on function public.chiedi_appuntamento(text, jsonb) from public, anon;
grant execute on function public.chiedi_appuntamento(text, jsonb) to authenticated;

-- Chi ha il turno: la riga, se tocca a lui. Altrimenti errore.
create or replace function public.appuntamento_al_mio_turno(p_app uuid)
returns public.appuntamenti
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.appuntamenti;
begin
  select * into v_a from public.appuntamenti where id = p_app for update;
  if not found or v_a.stato <> 'trattativa'
     or not ((v_a.turno = 'pt' and v_a.pt_id = auth.uid())
             or (v_a.turno = 'atleta' and v_a.atleta_id = auth.uid())) then
    raise exception 'Non tocca a te' using errcode = '22023';
  end if;
  return v_a;
end;
$$;
revoke all on function public.appuntamento_al_mio_turno(uuid) from public, anon, authenticated;

-- Va bene uno degli orari dell'altro: fissato.
create or replace function public.accetta_orario(p_orario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.appuntamenti_orari;
  v_a public.appuntamenti;
  v_nome text;
  v_agenda uuid;
begin
  select * into v_o from public.appuntamenti_orari where id = p_orario;
  if not found or v_o.stato <> 'aperto' or v_o.da_id = auth.uid() then
    raise exception 'Orario non valido' using errcode = '22023';
  end if;
  v_a := public.appuntamento_al_mio_turno(v_o.appuntamento_id);
  update public.appuntamenti_orari set stato = 'scelto' where id = p_orario;
  update public.appuntamenti_orari set stato = 'rifiutato'
   where appuntamento_id = v_a.id and stato = 'aperto';
  select nome into v_nome from public.profili where id = v_a.atleta_id;
  insert into public.agenda_pt (user_id, data, ora, titolo, nota, atleta_id)
  values (v_a.pt_id, v_o.giorno, v_o.ora, left('Appuntamento con ' || coalesce(v_nome, 'un atleta'), 120),
          left(v_a.motivo, 500), v_a.atleta_id)
  returning id into v_agenda;
  update public.appuntamenti
     set stato = 'fissato', turno = null, giorno = v_o.giorno, ora = v_o.ora, agenda_id = v_agenda,
         ultimo_da = auth.uid(), ultimo_tipo = 'fissato', ultimo_il = now()
   where id = v_a.id;
end;
$$;
revoke all on function public.accetta_orario(uuid) from public, anon;
grant execute on function public.accetta_orario(uuid) to authenticated;

-- Nessuno va bene: si rifiutano quelli aperti dell'altro e se ne mandano altri.
create or replace function public.controproponi_orari(p_app uuid, p_orari jsonb, p_nota text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.appuntamenti;
begin
  v_a := public.appuntamento_al_mio_turno(p_app);
  update public.appuntamenti_orari set stato = 'rifiutato'
   where appuntamento_id = p_app and stato = 'aperto' and da_id <> auth.uid();
  perform public.appuntamenti_metti_orari(p_app, p_orari, p_nota);
  update public.appuntamenti
     set turno = case when v_a.turno = 'pt' then 'atleta' else 'pt' end,
         ultimo_da = auth.uid(), ultimo_tipo = 'proposte', ultimo_il = now()
   where id = p_app;
end;
$$;
revoke all on function public.controproponi_orari(uuid, jsonb, text) from public, anon;
grant execute on function public.controproponi_orari(uuid, jsonb, text) to authenticated;

-- Uno dei due lascia perdere (anche dopo fissato): esce dall'agenda del PT.
create or replace function public.annulla_appuntamento(p_app uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.appuntamenti;
begin
  select * into v_a from public.appuntamenti
   where id = p_app and (atleta_id = auth.uid() or pt_id = auth.uid()) and stato <> 'annullato';
  if not found then
    raise exception 'Appuntamento non trovato' using errcode = '22023';
  end if;
  if v_a.agenda_id is not null then
    delete from public.agenda_pt where id = v_a.agenda_id;
  end if;
  update public.appuntamenti_orari set stato = 'rifiutato' where appuntamento_id = p_app and stato = 'aperto';
  update public.appuntamenti
     set stato = 'annullato', turno = null, agenda_id = null,
         ultimo_da = auth.uid(), ultimo_tipo = 'annullato', ultimo_il = now()
   where id = p_app;
end;
$$;
revoke all on function public.annulla_appuntamento(uuid) from public, anon;
grant execute on function public.annulla_appuntamento(uuid) to authenticated;


-- Le notifiche: l'ultima mossa dell'altro, una per appuntamento.
create or replace function public.notifiche_appuntamenti()
returns table (
  appuntamento_id uuid,
  tipo            text,
  chi_nome        text,
  quando          timestamptz,
  testo           text,
  giorno          date,
  ora             text,
  sono_pt         boolean,
  nuovo           boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select a.id, a.ultimo_tipo, pc.nome, a.ultimo_il,
         case when a.ultimo_tipo = 'richiesta' then a.motivo else '' end,
         a.giorno, a.ora, a.pt_id = auth.uid(), a.ultimo_il > (select il from letto)
    from public.appuntamenti a
    join public.profili pc on pc.id = a.ultimo_da
   where (a.atleta_id = auth.uid() or a.pt_id = auth.uid())
     and a.ultimo_da <> auth.uid()
     and not public.bloccato_con(a.ultimo_da)
   order by a.ultimo_il desc
   limit 100;
$$;
revoke all on function public.notifiche_appuntamenti() from public, anon;
grant execute on function public.notifiche_appuntamenti() to authenticated;
