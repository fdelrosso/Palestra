-- ===========================================================================
-- 2026-10-28 — Un orario gia' impegnato non si fissa.
--
-- Nell'app le fasce occupate non si scelgono (pages/AppuntamentiPage, lib/
-- orariAppuntamento → orarioImpegnato): un appuntamento dura un'ora, e
-- "occupato" e' un impegno della persona a meno di un'ora da li', in
-- qualunque ruolo: un appuntamento fissato da PT o da atleta, o una voce con
-- l'orario nell'agenda del PT (`agenda_pt`, dove finiscono anche i suoi
-- appuntamenti fissati).
-- L'app vede solo gli impegni di chi la usa: quelli dell'altro li controlla
-- il database, qui, quando l'appuntamento si fissa.
--
-- Additivo e rilanciabile, dopo 20261028150000 (rifa' `accetta_orario`).
-- ===========================================================================

create or replace function public.orario_impegnato(p_utente uuid, p_giorno date, p_ora text)
returns boolean
language sql stable security definer set search_path = public as $$
  with t as (select (p_giorno + p_ora::time) as il)
  select exists (
    select 1 from public.agenda_pt g, t
     where g.user_id = p_utente and g.ora <> ''
       and abs(extract(epoch from ((g.data + g.ora::time) - t.il))) < 3600
  ) or exists (
    select 1 from public.appuntamenti a, t
     where a.stato = 'fissato' and (a.pt_id = p_utente or a.atleta_id = p_utente)
       and a.giorno is not null and a.ora is not null
       and abs(extract(epoch from ((a.giorno + a.ora::time) - t.il))) < 3600
  );
$$;
revoke all on function public.orario_impegnato(uuid, date, text) from public, anon, authenticated;

-- Come in 20261028150000, piu' il controllo: ne' l'uno ne' l'altro dev'essere
-- gia' impegnato a quell'ora.
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
  if public.orario_impegnato(v_a.pt_id, v_o.giorno, v_o.ora)
     or public.orario_impegnato(v_a.atleta_id, v_o.giorno, v_o.ora) then
    raise exception 'Orario già impegnato' using errcode = '22023';
  end if;
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
