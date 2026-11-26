-- ---------------------------------------------------------------------------
-- 2026-11-26 · La palestra nascosta resta nascosta anche a chi non ha un account.
--
-- `vedo_palestra_di` senza un utente (auth.uid() NULL: il link a un post,
-- `post_pubblico`, aperto da chi non ha fatto l'accesso) per chi mostra la
-- palestra solo agli amici o a nessuno non dice false ma NULL, e `not NULL`
-- e' ancora NULL: il CASE qui sotto finiva nell'else e la palestra restava nel
-- json. Il coalesce fa di "non si sa" un no. Per chi ha fatto l'accesso non
-- cambia niente: li' la risposta e' sempre true o false.
-- Uguale a 20261104120000_feed_vicino_per_allenamento.sql, tranne il coalesce.
-- Rilanciabile.
-- ---------------------------------------------------------------------------

create or replace function public.dati_allenamento_per_me(p_persona uuid, p_dati jsonb)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
           when p_dati ? 'palestraId' and not coalesce(public.vedo_palestra_di(p_persona), false)
             then p_dati - 'palestraId'
           else p_dati
         end;
$$;
revoke all on function public.dati_allenamento_per_me(uuid, jsonb) from public, anon;
