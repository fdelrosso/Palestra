-- ===========================================================================
-- UNA CONDIVISIONE NON SI RISCRIVE (2026-11-17, audit di sicurezza).
--
-- Come `messaggio_fermo` (20261117120000_messaggi_fermi): la regola
-- "condivisioni: segno io che ricevo" lascia a chi riceve l'UPDATE della riga
-- intera. L'app manda solo `vista_il` o `salvata_il` (lib/social.js,
-- segnaCondivisione), ma dalla console si potevano cambiare contenuto
-- (`payload`, `titolo`) e mittente (`da_id`, `da_nome`): una scheda o un
-- allenamento che sembrava mandato da un altro, con dentro quello che non
-- aveva mandato. Dopo l'invio cambiano solo `vista_il` e `salvata_il`.
--
-- Il confronto è sulla riga intera meno quelle due, così vale anche per le
-- colonne che verranno. Rilanciabile.
-- ===========================================================================

create or replace function public.condivisione_ferma()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'vista_il' - 'salvata_il') is distinct from (to_jsonb(old) - 'vista_il' - 'salvata_il') then
    raise exception 'Una condivisione inviata non si modifica: si segna solo vista o salvata'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists condivisione_ferma on public.condivisioni;
create trigger condivisione_ferma
  before update on public.condivisioni
  for each row execute function public.condivisione_ferma();
