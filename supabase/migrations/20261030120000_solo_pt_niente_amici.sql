-- ===========================================================================
-- 2026-10-30 — Un solo PT (`profili.si_allena = false`) non ha amici.
--
-- Solo chi si allena ha amici, anche se e' un PT ("Tutti e due"). Quindi:
--   - nessuna richiesta di amicizia da o verso un solo PT (trigger, cosi' vale
--     anche per chi scrive a mano nella tabella);
--   - le amicizie e le richieste che ha gia' spariscono, adesso e quando un
--     account diventa solo PT. ⚠️ Tornando a "Tutti e due" non ricompaiono.
--   - non si suggerisce fra "Forse li conosci";
--   - `e_solo_pt` dice all'app di chi e' la pagina: `profilo_pubblico` non puo'
--     cambiare colonne senza rompere il `create or replace` di schema.sql.
--
-- Il legame col PT (`tipo = 'lavoro'`) non si tocca.
-- Rilanciabile, dopo 20261028120000 (si_allena) e 20261027120000.
-- ===========================================================================

create or replace function public.e_solo_pt(p_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profili p
     where p.id = p_id and p.ruolo = 'pt' and p.si_allena = false
  );
$$;
revoke all on function public.e_solo_pt(uuid) from public, anon;
grant execute on function public.e_solo_pt(uuid) to authenticated;

-- La regola: niente amicizia se uno dei due e' un solo PT.
create or replace function public.niente_amici_solo_pt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'amicizia' and (public.e_solo_pt(new.da_id) or public.e_solo_pt(new.a_id)) then
    raise exception 'Un personal trainer che non si allena non ha amici' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists niente_amici_solo_pt on public.relazioni;
create trigger niente_amici_solo_pt
  before insert on public.relazioni
  for each row execute function public.niente_amici_solo_pt();

-- Chi diventa solo PT perde amicizie e richieste.
create or replace function public.solo_pt_senza_amici()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.relazioni
   where tipo = 'amicizia' and (da_id = new.id or a_id = new.id);
  return null;
end;
$$;

drop trigger if exists solo_pt_senza_amici on public.profili;
create trigger solo_pt_senza_amici
  after insert or update of ruolo, si_allena on public.profili
  for each row
  when (new.ruolo = 'pt' and new.si_allena = false)
  execute function public.solo_pt_senza_amici();

-- Quelle che esistono gia'.
delete from public.relazioni r
 where r.tipo = 'amicizia'
   and exists (select 1 from public.profili p
                where p.id in (r.da_id, r.a_id) and p.ruolo = 'pt' and p.si_allena = false);

-- "Forse li conosci": se ne chiedono un po' di piu', i solo PT restano fuori.
create or replace function public.amici_suggeriti_con_username(limite int default 10)
returns table (id uuid, nome text, username text, motivo text, amici_in_comune int)
language sql stable security definer set search_path = public as $$
  select s.id, s.nome, p.username, s.motivo, s.amici_in_comune
    from public.amici_suggeriti(limite + 10) with ordinality as s(id, nome, motivo, amici_in_comune, ordine)
    join public.profili p on p.id = s.id
   where not (p.ruolo = 'pt' and p.si_allena = false)
   order by s.ordine
   limit greatest(1, least(coalesce(limite, 10), 50));
$$;
revoke all on function public.amici_suggeriti_con_username(int) from public, anon;
grant execute on function public.amici_suggeriti_con_username(int) to authenticated;
