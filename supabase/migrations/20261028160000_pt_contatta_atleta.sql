-- ===========================================================================
-- 2026-10-28 — Un PT contatta un atleta senza PT, visto nel feed.
--
-- E' "Contatta il PT" (contatti_pt, schema.sql) al contrario: il contatto
-- nasce gia' come 'proposta' (il PT si e' proposto), l'atleta conferma o no
-- dalla chat con `conferma_pt`, come sempre. Confermando, quel PT diventa il
-- suo (`profili.pt_id`).
--
-- Si contatta SOLO chi l'ha scelto: `profili.contattabile_da_pt`.
--   null  = non ha ancora risposto (glielo si chiede al primo allenamento
--           pubblicato, se non ha un PT);
--   true  = "mettimi in mostra";
--   false = no: ai PT non compare "Contatta".
-- Si cambia dal Profilo.
--
-- Additivo e rilanciabile.
-- ===========================================================================

alter table public.profili
  add column if not exists contattabile_da_pt boolean;

-- Chi ha aperto il contatto: false = l'atleta ("Contatta il PT"), true = il
-- PT dal feed. Cambia solo le parole del riquadro in chat.
alter table public.contatti_pt
  add column if not exists da_pt boolean not null default false;

-- Il PT puo' contattare questa persona? Si', se e' un PT lui, l'altro non e'
-- lui, non ha un PT, ha scelto di farsi contattare e non c'e' un blocco.
-- Un solo PT (si_allena = false) no: non si allena, non ha senso seguirlo.
create or replace function public.posso_contattare_atleta(p_atleta uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili io where io.id = auth.uid() and io.ruolo = 'pt')
     and exists (select 1 from public.profili a
                  where a.id = p_atleta and a.id <> auth.uid()
                    and a.pt_id is null and a.contattabile_da_pt is true
                    and coalesce(a.si_allena, true))
     and not public.bloccato_con(p_atleta);
$$;
revoke all on function public.posso_contattare_atleta(uuid) from public, anon;
grant execute on function public.posso_contattare_atleta(uuid) to authenticated;

create or replace function public.contatta_atleta(p_atleta uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stato text;
begin
  if not public.posso_contattare_atleta(p_atleta) then
    raise exception 'Non contattabile' using errcode = '42501';
  end if;
  insert into public.contatti_pt (atleta_id, pt_id, stato, da_pt)
  values (p_atleta, auth.uid(), 'proposta', true)
  on conflict (atleta_id, pt_id) do update
     set stato = 'proposta', da_pt = true, aggiornato_il = now()
   where public.contatti_pt.stato in ('rifiutato', 'declinato', 'accettato');
  if found then
    insert into public.messaggi (id, da_id, a_id, testo)
    values (gen_random_uuid()::text, auth.uid(), p_atleta,
            'Ciao! Ho visto i tuoi allenamenti: posso seguirti come personal trainer. Se ti va, conferma qui in chat.');
  end if;
  select stato into v_stato from public.contatti_pt where atleta_id = p_atleta and pt_id = auth.uid();
  return v_stato;
end;
$$;
revoke all on function public.contatta_atleta(uuid) from public, anon;
grant execute on function public.contatta_atleta(uuid) to authenticated;


-- Nel feed, per un PT: fra queste persone, quali si sono messe in mostra
-- (stesse condizioni di `posso_contattare_atleta`). Per chi non e' un PT,
-- nessuna: e' un'informazione che serve solo a lui.
create or replace function public.contattabili_fra(p_ids uuid[])
returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.id
    from public.profili a
   where a.id = any (p_ids)
     and exists (select 1 from public.profili io where io.id = auth.uid() and io.ruolo = 'pt')
     and a.id <> auth.uid()
     and a.pt_id is null
     and a.contattabile_da_pt is true
     and coalesce(a.si_allena, true)
     and not public.bloccato_con(a.id);
$$;
revoke all on function public.contattabili_fra(uuid[]) from public, anon;
grant execute on function public.contattabili_fra(uuid[]) to authenticated;