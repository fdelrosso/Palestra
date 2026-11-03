-- ===========================================================================
-- 2026-11-02 — Gli appuntamenti si chiedono per fasce.
--
-- Chi chiede indica una fascia intera (dalle 14 alle 18) e quanto dura
-- l'appuntamento (1 ora); chi accetta sceglie l'inizio dentro la fascia. Finche'
-- e' aperta, la fascia occupa TUTTI i suoi periodi per le richieste successive
-- di tutti e due: accettata o rifiutata, si libera (resta il solo orario
-- fissato). Nelle righe vecchie `ora_fine` e `durata` sono vuote: un'ora.
--
-- Additivo e rilanciabile, dopo 20261102120000. `accetta_orario` resta, e
-- fissa all'inizio della fascia.
-- ===========================================================================

alter table public.appuntamenti_orari add column if not exists ora_fine text;
alter table public.appuntamenti_orari add column if not exists durata int;
alter table public.appuntamenti add column if not exists ora_fine text;
alter table public.agenda_pt add column if not exists ora_fine text;

-- Un impegno gia' fissato si sovrappone a questo periodo?
create or replace function public.orario_occupato(p_utente uuid, p_giorno date, p_ora text, p_fine text)
returns boolean
language sql stable security definer set search_path = public as $$
  with t as (select (p_giorno + p_ora::time) as da, (p_giorno + p_fine::time) as a)
  select exists (
    select 1 from public.agenda_pt g, t
     where g.user_id = p_utente and g.ora <> ''
       and (g.data + g.ora::time) < t.a
       and coalesce(g.data + g.ora_fine::time, g.data + g.ora::time + interval '1 hour') > t.da
  ) or exists (
    select 1 from public.appuntamenti a, t
     where a.stato = 'fissato' and (a.pt_id = p_utente or a.atleta_id = p_utente)
       and a.giorno is not null and a.ora is not null
       and (a.giorno + a.ora::time) < t.a
       and coalesce(a.giorno + a.ora_fine::time, a.giorno + a.ora::time + interval '1 hour') > t.da
  );
$$;
revoke all on function public.orario_occupato(uuid, date, text, text) from public, anon, authenticated;

-- ...o una fascia ancora aperta, di un altro appuntamento di questa persona?
create or replace function public.fascia_occupata(p_utente uuid, p_giorno date, p_ora text, p_fine text, p_app uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.orario_occupato(p_utente, p_giorno, p_ora, p_fine) or exists (
    select 1
      from public.appuntamenti_orari o
      join public.appuntamenti a on a.id = o.appuntamento_id
     where o.stato = 'aperto' and a.stato = 'trattativa' and a.id <> p_app
       and (a.pt_id = p_utente or a.atleta_id = p_utente)
       and (o.giorno + o.ora::time) < (p_giorno + p_fine::time)
       and coalesce(o.giorno + o.ora_fine::time, o.giorno + o.ora::time + interval '1 hour') > (p_giorno + p_ora::time)
  );
$$;
revoke all on function public.fascia_occupata(uuid, date, text, text, uuid) from public, anon, authenticated;

-- Gli orari di un giro: [{giorno, ora, fine, durata}]. Come in 20261028150000,
-- piu' la fascia: la durata ci deve stare, e nessuno dei due dev'essere gia'
-- impegnato in quel periodo.
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
  v_fine text;
  v_durata int;
  v_n int := 0;
  v_a public.appuntamenti;
begin
  select * into v_a from public.appuntamenti where id = p_app;
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
    v_fine := coalesce(v_o ->> 'fine', to_char(v_ora::time + interval '1 hour', 'HH24:MI'));
    v_durata := coalesce((v_o ->> 'durata')::int, 60);
    if v_fine !~ '^[0-2][0-9]:[0-5][0-9]$' or v_fine::time <= v_ora::time or v_durata < 15
       or v_durata > extract(epoch from (v_fine::time - v_ora::time)) / 60 then
      raise exception 'Orari non validi' using errcode = '22023';
    end if;
    if exists (select 1 from public.appuntamenti_orari
                where appuntamento_id = p_app and giorno = v_giorno and ora = v_ora
                  and stato = 'rifiutato') then
      raise exception 'Orario già rifiutato' using errcode = '22023';
    end if;
    if public.fascia_occupata(v_a.pt_id, v_giorno, v_ora, v_fine, p_app)
       or public.fascia_occupata(v_a.atleta_id, v_giorno, v_ora, v_fine, p_app) then
      raise exception 'Orario già impegnato' using errcode = '22023';
    end if;
    if not exists (select 1 from public.appuntamenti_orari
                    where appuntamento_id = p_app and giorno = v_giorno and ora = v_ora
                      and stato = 'aperto' and da_id = auth.uid()) then
      insert into public.appuntamenti_orari (appuntamento_id, da_id, giorno, ora, ora_fine, durata, nota)
      values (p_app, auth.uid(), v_giorno, v_ora, v_fine, v_durata, left(coalesce(p_nota, ''), 500));
      v_n := v_n + 1;
    end if;
  end loop;
  if v_n = 0 then
    raise exception 'Orari non validi' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.appuntamenti_metti_orari(uuid, jsonb, text) from public, anon, authenticated;

-- Va bene questa fascia, alle `p_ora` (vuota = all'inizio). Fissato per la durata.
create or replace function public.accetta_orario_alle(p_orario uuid, p_ora text default null)
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
  v_ora text;
  v_fine text;
begin
  select * into v_o from public.appuntamenti_orari where id = p_orario;
  if not found or v_o.stato <> 'aperto' or v_o.da_id = auth.uid() then
    raise exception 'Orario non valido' using errcode = '22023';
  end if;
  v_a := public.appuntamento_al_mio_turno(v_o.appuntamento_id);
  v_ora := coalesce(p_ora, v_o.ora);
  if v_ora !~ '^[0-2][0-9]:[0-5][0-9]$' then
    raise exception 'Orario non valido' using errcode = '22023';
  end if;
  v_fine := to_char(v_ora::time + make_interval(mins => coalesce(v_o.durata, 60)), 'HH24:MI');
  if v_ora::time < v_o.ora::time
     or v_fine::time > coalesce(v_o.ora_fine::time, v_o.ora::time + interval '1 hour') then
    raise exception 'Orario non valido' using errcode = '22023';
  end if;
  if public.orario_occupato(v_a.pt_id, v_o.giorno, v_ora, v_fine)
     or public.orario_occupato(v_a.atleta_id, v_o.giorno, v_ora, v_fine) then
    raise exception 'Orario già impegnato' using errcode = '22023';
  end if;
  update public.appuntamenti_orari set stato = 'scelto' where id = p_orario;
  update public.appuntamenti_orari set stato = 'rifiutato'
   where appuntamento_id = v_a.id and stato = 'aperto';
  select nome into v_nome from public.profili where id = v_a.atleta_id;
  insert into public.agenda_pt (user_id, data, ora, ora_fine, titolo, nota, atleta_id)
  values (v_a.pt_id, v_o.giorno, v_ora, v_fine, left('Appuntamento con ' || coalesce(v_nome, 'un atleta'), 120),
          left(v_a.motivo, 500), v_a.atleta_id)
  returning id into v_agenda;
  update public.appuntamenti
     set stato = 'fissato', turno = null, giorno = v_o.giorno, ora = v_ora, ora_fine = v_fine, agenda_id = v_agenda,
         ultimo_da = auth.uid(), ultimo_tipo = 'fissato', ultimo_il = now()
   where id = v_a.id;
end;
$$;
revoke all on function public.accetta_orario_alle(uuid, text) from public, anon;
grant execute on function public.accetta_orario_alle(uuid, text) to authenticated;

create or replace function public.accetta_orario(p_orario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.accetta_orario_alle(p_orario, null);
end;
$$;
revoke all on function public.accetta_orario(uuid) from public, anon;
grant execute on function public.accetta_orario(uuid) to authenticated;
