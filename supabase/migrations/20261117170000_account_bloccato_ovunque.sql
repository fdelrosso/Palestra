-- ===========================================================================
-- UN ACCOUNT BLOCCATO È BLOCCATO ANCHE SUL SERVER (2026-11-17, audit).
--
-- Al 4° contenuto tolto l'account è bloccato: l'app mostra solo la schermata
-- di blocco (components/Moderazione, AccountBloccato) con "chiedi lo sblocco"
-- ed "Esci". Ma a decidere era quasi solo l'app: dalla console, con la propria
-- sessione, un account bloccato poteva ancora usare le funzioni di Vercel
-- (lettura con l'AI, segnalazioni) e soprattutto CERCARE GLI ALTRI — richieste
-- di amicizia e di PT, condivisioni, foto momentanee, mi piace. Bloccati dal
-- server erano solo i messaggi in chat e la pubblicazione nel Feed.
--
-- Ora anche:
--   1. `usa_limite` (api/_limiteGiornaliero.js, le funzioni di Vercel) dice
--      di no a un account bloccato: errore 42501, che arriva come 403;
--   2. un trigger su INSERT di relazioni, condivisioni, effimeri e mi piace
--      rifiuta quello che parte da un account bloccato.
-- Solo trigger e funzioni nuove o rifatte uguali: nessuna regola riscritta.
-- Chi chiama senza sessione (trigger, funzioni di servizio) passa: il blocco
-- è di chi agisce, `auth.uid()`.
--
-- Rilanciabile.
-- ===========================================================================

-- 1. La stessa `usa_limite` di 20261117140000_limiti_giornalieri, più il blocco.
create or replace function public.usa_limite(p_tipo text, p_massimo integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if auth.uid() is null then
    return false;
  end if;
  if public.account_bloccato(auth.uid()) then
    raise exception 'Account bloccato' using errcode = '42501';
  end if;
  delete from public.limiti_giornalieri
   where user_id = auth.uid() and giorno < v_oggi - 2;
  insert into public.limiti_giornalieri as l (user_id, tipo, giorno, quante)
  values (auth.uid(), p_tipo, v_oggi, 1)
  on conflict (user_id, tipo, giorno) do update
    set quante = l.quante + 1
    where l.quante < p_massimo;
  return found;
end;
$$;

revoke execute on function public.usa_limite(text, integer) from public, anon;
grant execute on function public.usa_limite(text, integer) to authenticated;

-- 2. Niente contatti nuovi da un account bloccato.
create or replace function public.account_non_bloccato()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and public.account_bloccato(auth.uid()) then
    raise exception 'Il tuo account è bloccato' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists account_non_bloccato on public.relazioni;
create trigger account_non_bloccato
  before insert on public.relazioni
  for each row execute function public.account_non_bloccato();

drop trigger if exists account_non_bloccato on public.condivisioni;
create trigger account_non_bloccato
  before insert on public.condivisioni
  for each row execute function public.account_non_bloccato();

drop trigger if exists account_non_bloccato on public.effimeri;
create trigger account_non_bloccato
  before insert on public.effimeri
  for each row execute function public.account_non_bloccato();

drop trigger if exists account_non_bloccato on public.allenamento_mi_piace;
create trigger account_non_bloccato
  before insert on public.allenamento_mi_piace
  for each row execute function public.account_non_bloccato();
