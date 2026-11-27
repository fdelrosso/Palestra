-- ---------------------------------------------------------------------------
-- 2026-11-27 · Chi entra con Google ha nome e cognome dal suo account Google.
--
-- Google non manda `nome` e `cognome` nei metadati ma `full_name` (o `name`):
-- il trigger prendeva la parte dell'email prima della @ ("mariorossi92") e
-- lasciava il cognome vuoto. Chi si fermava a "Completa il tuo account"
-- restava cosi' nelle liste e nella ricerca. Ora: la prima parola e' il nome,
-- il resto il cognome (come li propone UserGate, con gli stessi tetti 24/32),
-- e lo username nasce da nome e cognome. Con la registrazione via email
-- (`nome` nei metadati) non cambia niente.
-- Uguale all'ultima `gestisci_nuovo_utente` di schema.sql, tranne il nome.
-- Rilanciabile.
-- ---------------------------------------------------------------------------

create or replace function public.gestisci_nuovo_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  completo text := btrim(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''),
    '\s+', ' ', 'g'));
  n text;
  c text;
begin
  if nullif(new.raw_user_meta_data ->> 'nome', '') is null and completo <> '' then
    n := left(split_part(completo, ' ', 1), 24);
    c := nullif(left(btrim(substr(completo, length(split_part(completo, ' ', 1)) + 1)), 32), '');
  else
    n := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));
    c := nullif(new.raw_user_meta_data ->> 'cognome', '');
  end if;
  insert into public.profili (id, nome, cognome, ruolo, codice_pt, codice_amico, username, dati)
  values (
    new.id,
    n,
    c,
    coalesce(nullif(new.raw_user_meta_data ->> 'ruolo', ''), 'atleta'),
    nullif(new.raw_user_meta_data ->> 'codice_pt', ''),
    public.genera_codice(n),
    public.genera_username(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), n || coalesce(c, ''))),
    coalesce(new.raw_user_meta_data -> 'dati', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
