-- ---------------------------------------------------------------------------
-- Il numero rosso delle notifiche, da solo (2026-11-04, ramo `egress`).
--
-- Il pallino sulla barra (hooks/useNotificheNuove) chiamava ogni minuto le
-- dieci `notifiche_*` e scaricava le liste intere — nomi, testi, date — solo
-- per contare quelle nuove. Qui lo stesso conto, fatto nel database: una
-- chiamata, un numero.
--
-- ⚠️ Riusa le dieci funzioni, non ne copia le regole: se una cambia, il
-- numero la segue. Deve restare uguale a `contaNuove(leggiNotifiche())` in
-- src/lib/notifiche.js. Una notifica nuova va aggiunta in tutti e due i posti.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

create or replace function public.notifiche_nuove()
returns bigint
language sql stable set search_path = public as $$
  select coalesce((select sum(nuovi) from public.notifiche_interazioni()), 0)::bigint
       + (select count(*) from public.notifiche_check() where nuovo)
       + (select count(*) from public.notifiche_rinnovi() where nuovo)
       + (select count(*) from public.notifiche_appuntamenti() where nuovo)
       + (select count(*) from public.notifiche_allungamenti() where nuovo)
       + (select count(*) from public.notifiche_allegati_pt() where nuovo)
       + (select count(*) from public.notifiche_modifiche_scheda() where nuovo)
       + (select count(*) from public.notifiche_nuovi_atleti() where nuovo)
       + (select count(*) from public.notifiche_atleti_persi() where nuovo)
       + (select count(*) from public.notifiche_pt_perso() where nuovo);
$$;
revoke all on function public.notifiche_nuove() from public, anon;
grant execute on function public.notifiche_nuove() to authenticated;
