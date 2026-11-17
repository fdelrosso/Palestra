-- ===========================================================================
-- QUANTE VOLTE AL GIORNO (2026-11-17, audit di sicurezza).
--
-- Tre funzioni di Vercel lavorano per chiunque abbia un account, e senza un
-- conto uno script con un account solo poteva:
--   api/riscrivi        (scheda)        finire la quota di Mistral per tutti;
--   api/riscrivi-dieta  (dieta)         idem;
--   api/segnala         (segnalazione)  riempire info@ e consumare i limiti
--                                       dell'SMTP, lo stesso delle mail di
--                                       conferma e di recupero password.
-- Ora al massimo N richieste al giorno (ora italiana) per persona e per tipo.
-- N lo decide la funzione Vercel (api/_limiteGiornaliero.js), non sta qui.
--
-- Conta OGNI richiesta che arriva a Mistral o all'SMTP, come sia andata: se si
-- contassero solo le riuscite, una foto che non è una scheda (una chiamata a
-- Mistral, poi 422) si potrebbe ripetere all'infinito. Le richieste respinte
-- prima (senza account, file sbagliato) non arrivano fin qui.
--
-- Un passo solo: l'upsert prende il lucchetto della riga, così 50 richieste in
-- parallelo non passano tutte il controllo.
--
-- ⚠️ La tabella non ha regole: la si tocca solo da `usa_limite`, che guarda
-- `auth.uid()`. Chiamarla a mano consuma soltanto le proprie.
--
-- Rilanciabile.
-- ===========================================================================

create table if not exists public.limiti_giornalieri (
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo    text not null check (tipo in ('scheda', 'dieta', 'segnalazione')),
  giorno  date not null,
  quante  integer not null,
  primary key (user_id, tipo, giorno)
);
alter table public.limiti_giornalieri enable row level security;

-- true = si può (e questa richiesta è già contata); false = oggi le ha finite.
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

-- Solo chi ha un account (da `public` anche, se no anon la eredita da lì).
revoke execute on function public.usa_limite(text, integer) from public, anon;
grant execute on function public.usa_limite(text, integer) to authenticated;
