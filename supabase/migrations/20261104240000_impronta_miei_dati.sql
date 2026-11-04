-- ---------------------------------------------------------------------------
-- L'impronta dei propri dati (2026-11-04, ramo `egress`, problema 2).
-- StoreContext rileggeva TUTTO a ogni ritorno in primo piano (contro il
-- "Giorno A": una copia vecchia rimandata su). Ora prima chiede questa: per
-- tabella quante righe e l'ultima modifica, poche decine di byte. Rilegge
-- solo quello che e' cambiato: una modifica sposta il massimo, una
-- cancellazione il conto.
-- `aggiornata_il` mancava ad `allenamenti`, e a `diario` mancava il trigger.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

alter table public.allenamenti add column if not exists aggiornata_il timestamptz not null default now();

drop trigger if exists allenamenti_aggiornata on public.allenamenti;
create trigger allenamenti_aggiornata before update on public.allenamenti
  for each row execute function public.segna_aggiornata();

drop trigger if exists diario_aggiornata on public.diario;
create trigger diario_aggiornata before update on public.diario
  for each row execute function public.segna_aggiornata();

create or replace function public.impronta_miei_dati()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'schede',      (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.schede where user_id = auth.uid()),
    'allenamenti', (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.allenamenti where user_id = auth.uid()),
    'diete',       (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.diete where user_id = auth.uid()),
    'diario',      (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.diario where user_id = auth.uid()),
    'preferenze',  (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.preferenze where user_id = auth.uid()),
    'sessione',    (select count(*) || '|' || coalesce(max(aggiornata_il)::text, '') from public.sessione where user_id = auth.uid())
  );
$$;
revoke all on function public.impronta_miei_dati() from public, anon;
grant execute on function public.impronta_miei_dati() to authenticated;
