-- ===========================================================================
-- 2026-11-02 — L'atleta sa quando il PT ha smesso di seguirlo.
--
-- Il rovescio di `notifiche_atleti_persi()`: stessa tabella, `finito_da` e' il
-- PT. Vale anche per chi disattiva il PT dal Profilo (`smettiPt`), che toglie
-- tutti i suoi atleti. Ripreso il legame la riga sparisce, e la notifica con lei.
--
-- Additivo e rilanciabile, dopo 20261102140000.
-- ===========================================================================

create or replace function public.notifiche_pt_perso()
returns table (
  pt_id   uuid,
  pt_nome text,
  quando  timestamptz,
  nuovo   boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select p.id, p.nome, f.finito_il, f.finito_il > (select il from letto)
    from public.legami_pt_finiti f
    join public.profili p on p.id = f.pt_id
   where f.atleta_id = auth.uid()
     and f.finito_da = f.pt_id
     and not public.bloccato_con(p.id)
   order by f.finito_il desc
   limit 100;
$$;
revoke all on function public.notifiche_pt_perso() from public, anon;
grant execute on function public.notifiche_pt_perso() to authenticated;
