-- ===========================================================================
-- 2026-11-02 — Il PT propone un appuntamento a un suo atleta.
--
-- Fino a qui il PT scriveva direttamente nella sua agenda, e all'atleta non
-- arrivava niente. Adesso parte una richiesta come quella dell'atleta, ma col
-- turno all'atleta: accetta l'orario (fissato, e va nell'agenda del PT) o ne
-- manda altri. La notifica e' quella degli appuntamenti: l'ultima mossa
-- dell'altro (`notifiche_appuntamenti`, migrazione 20261028150000).
--
-- Additivo e rilanciabile, dopo 20261028200000.
-- ===========================================================================

create or replace function public.proponi_appuntamento(p_atleta uuid, p_motivo text, p_orari jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profili where id = p_atleta and pt_id = auth.uid())
     or public.bloccato_con(p_atleta) then
    raise exception 'Non è un tuo atleta' using errcode = '42501';
  end if;
  insert into public.appuntamenti (atleta_id, pt_id, motivo, turno, ultimo_da, ultimo_tipo)
  values (p_atleta, auth.uid(), left(coalesce(p_motivo, ''), 500), 'atleta', auth.uid(), 'richiesta')
  returning id into v_id;
  perform public.appuntamenti_metti_orari(v_id, p_orari, '');
  return v_id;
end;
$$;
revoke all on function public.proponi_appuntamento(uuid, text, jsonb) from public, anon;
grant execute on function public.proponi_appuntamento(uuid, text, jsonb) to authenticated;
