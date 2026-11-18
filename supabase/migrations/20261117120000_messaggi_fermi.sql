-- ===========================================================================
-- UN MESSAGGIO NON SI RISCRIVE (2026-11-17, audit di sicurezza).
--
-- La regola "messaggi: segno letto io che ricevo" lascia a chi riceve
-- l'UPDATE della riga intera: l'app manda solo `letto_il` (lib/chat.js), ma
-- dalla console, con la propria sessione e la chiave pubblica, si potevano
-- cambiare testo e mittente di un messaggio ricevuto — e l'altro lo vedeva
-- come scritto da lui. Come `relazione_ferma` per le richieste: dopo l'invio
-- cambia solo `letto_il`.
--
-- Il confronto è sulla riga intera meno `letto_il`, così vale anche per le
-- colonne che verranno. `coppia` è generata (da da_id e a_id, che si
-- confrontano già): in un BEFORE non è ancora ricalcolata, quindi fuori.
--
-- Rilanciabile.
-- ===========================================================================

create or replace function public.messaggio_fermo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'letto_il' - 'coppia') is distinct from (to_jsonb(old) - 'letto_il' - 'coppia') then
    raise exception 'Un messaggio inviato non si modifica: si segna solo come letto'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists messaggio_fermo on public.messaggi;
create trigger messaggio_fermo
  before update on public.messaggi
  for each row execute function public.messaggio_fermo();
