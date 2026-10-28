-- ===========================================================================
-- GLI USERNAME NEI CONSIGLI D'AMICIZIA (2026-10-27)
--
-- Si applica dopo 20261024120000_foto_seguono_allenamento.sql, ed e'
-- rilanciabile.
--
-- In Cerca ogni persona si mostra col suo @username (pages/CercaPage), anche in
-- "Forse li conosci". `amici_suggeriti` pero' non lo restituisce, e non puo'
-- cambiare le colonne senza essere cancellata e rifatta (come `nomi_di`, che
-- per questo ha accanto `username_di`). Quindi una funzione a parte: le STESSE
-- persone, nello stesso ordine, con in piu' l'username. La regola di chi si
-- propone resta tutta in `amici_suggeriti` (supabase/schema.sql).
--
-- L'username e' una maniglia pubblica (vedi "NOME, COGNOME E USERNAME" in
-- schema.sql): dirlo di chi gia' si propone non apre niente di nuovo.
-- ===========================================================================

create or replace function public.amici_suggeriti_con_username(limite int default 10)
returns table (id uuid, nome text, username text, motivo text, amici_in_comune int)
language sql stable security definer set search_path = public as $$
  select s.id, s.nome, p.username, s.motivo, s.amici_in_comune
    from public.amici_suggeriti(limite) with ordinality as s(id, nome, motivo, amici_in_comune, ordine)
    join public.profili p on p.id = s.id
   order by s.ordine;
$$;

revoke all on function public.amici_suggeriti_con_username(int) from public, anon;
grant execute on function public.amici_suggeriti_con_username(int) to authenticated;
