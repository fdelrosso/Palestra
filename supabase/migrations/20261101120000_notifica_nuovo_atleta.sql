-- ===========================================================================
-- 2026-11-01 — La notifica al PT quando ha un nuovo atleta seguito.
--
-- Stessa idea delle altre notifiche del cuoricino (lib/notifiche): niente righe
-- da tenere in pari, si legge da dove il legame sta gia'. `profili.pt_id` e
-- `associato_il` li scrivono tutte le strade (`conferma_pt`, `accetta_relazione`);
-- se il legame finisce, `lavoro_tolto` li pulisce e la notifica sparisce.
--
-- Additivo e rilanciabile.
-- ===========================================================================

create or replace function public.notifiche_nuovi_atleti()
returns table (
  atleta_id   uuid,
  atleta_nome text,
  quando      timestamptz,
  nuovo       boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select a.id, a.nome, a.associato_il, a.associato_il > (select il from letto)
    from public.profili a
   where a.pt_id = auth.uid()
     and a.associato_il is not null
     and not public.bloccato_con(a.id)
   order by a.associato_il desc
   limit 100;
$$;
revoke all on function public.notifiche_nuovi_atleti() from public, anon;
grant execute on function public.notifiche_nuovi_atleti() to authenticated;
