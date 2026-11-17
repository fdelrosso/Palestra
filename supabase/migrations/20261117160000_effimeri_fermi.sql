-- ===========================================================================
-- UN INVIO MOMENTANEO NON SI RISCRIVE (2026-11-17, audit di sicurezza).
--
-- Come `messaggio_fermo` e `condivisione_ferma`: la regola "effimeri: segno io
-- che ricevo" lascia a chi riceve l'UPDATE della riga intera. L'app ne fa due
-- soli (lib/effimeri.js): chiuso il visore `consumato = true` + `aperto_il`,
-- per un permanente solo `aperto_il`. Dalla console si poteva invece rimettere
-- `consumato = false` (il file torna scaricabile, se non era stato tolto),
-- spostare `scade_il` di un anno (il file resta nello Storage invece di
-- sparire dopo 24 ore) o cambiare mittente e percorso.
--
-- Ora, dopo l'invio:
--   - `consumato` va solo da false a true, mai indietro;
--   - `aperto_il` si scrive una volta, poi resta quello;
--   - tutto il resto resta com'era (riga intera meno quelle due: vale anche
--     per le colonne che verranno).
--
-- Rilanciabile.
-- ===========================================================================

create or replace function public.effimero_fermo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'consumato' - 'aperto_il') is distinct from (to_jsonb(old) - 'consumato' - 'aperto_il')
     or (old.consumato and not new.consumato)
     or (old.aperto_il is not null and new.aperto_il is distinct from old.aperto_il) then
    raise exception 'Un invio momentaneo non si modifica: si segna solo come aperto'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists effimero_fermo on public.effimeri;
create trigger effimero_fermo
  before update on public.effimeri
  for each row execute function public.effimero_fermo();
