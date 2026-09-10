-- ===========================================================================
-- Palestra — schema del database (tappa 1: account veri + i dati di ognuno)
--
-- Da eseguire nel SQL Editor di Supabase. E' scritto per poter essere
-- rilanciato piu' volte senza rompere niente (create ... if not exists,
-- drop policy prima di crearla): se sbagli qualcosa, correggi e rilancia tutto.
--
-- COSA C'E' QUI: profili, schede, diete, preferenze alimentari e sessione di
-- allenamento. Cioe' i dati che sono TUOI e basta.
-- COSA NON C'E' ANCORA: amicizie, personal trainer, condivisioni, foto e video.
-- Sono la tappa 2 e la 3, e hanno bisogno di regole di accesso piu' pensate
-- (chi vede cosa) che non ha senso improvvisare adesso.
--
-- ⚠️ PERCHE' `dati jsonb` E NON UNA COLONNA PER CAMPO. Una scheda in questa app
-- e' gia' un documento: si carica intera, si modifica intera, si salva intera
-- (vedi src/data/model.js). Spezzarla in tabelle giorni/esercizi/settimane
-- vorrebbe dire riscrivere editor, sessione, recap e motore dei consigli per
-- avere in cambio query che qui non servono a nessuno. Quello che INVECE serve
-- fuori dal json — a chi filtra e alle regole di sicurezza — sta in colonne
-- vere: `user_id`, `visibilita`, `libera`.
-- ===========================================================================


-- --------------------------------------------------------------------------
-- 1. PROFILI — quello che l'app sa di una persona, agganciato al suo account.
--
-- L'account vero e proprio (email e password) vive in `auth.users`, gestito da
-- Supabase: li' dentro non si scrive a mano. Qui c'e' il resto: come si chiama,
-- se e' un atleta o un personal trainer, e i suoi dati fisici.
-- --------------------------------------------------------------------------
create table if not exists public.profili (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  ruolo         text not null default 'atleta' check (ruolo in ('atleta', 'pt')),
  -- Il codice che un PT da' ai suoi atleti. UNICO a livello di database: prima
  -- l'unicita' la controllava l'app guardando i profili del dispositivo, che
  -- con piu' dispositivi non vuol dire piu' niente.
  -- Per gli atleti resta NULL (e i NULL non si pestano i piedi tra loro).
  codice_pt     text unique,
  pt_id         uuid references public.profili(id) on delete set null,
  associato_il  timestamptz,
  -- DatiFisici: sesso, eta, peso, altezza, movimento, obiettivo, livello.
  dati          jsonb not null default '{}'::jsonb,
  creato_il     timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. SCHEDE — il documento intero in `dati`, piu' le colonne che servono fuori.
-- --------------------------------------------------------------------------
create table if not exists public.schede (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- Fuori dal json perche' e' su questo che dovranno decidere le regole di
  -- accesso quando arriveranno gli amici (tappa 2).
  visibilita    text not null default 'nascosta'
                check (visibilita in ('pubblica', 'solo-pt', 'nascosta')),
  -- Il contenitore degli allenamenti liberi/consigliati: si esclude da quasi
  -- tutte le viste, quindi conviene poterlo filtrare senza aprire il json.
  libera        boolean not null default false,
  dati          jsonb not null,
  aggiornata_il timestamptz not null default now()
);
create index if not exists schede_user_idx on public.schede (user_id);
create index if not exists schede_pubbliche_idx on public.schede (visibilita) where visibilita = 'pubblica';

-- --------------------------------------------------------------------------
-- 3. DIETE
-- --------------------------------------------------------------------------
create table if not exists public.diete (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  dati          jsonb not null,
  aggiornata_il timestamptz not null default now()
);
create index if not exists diete_user_idx on public.diete (user_id);

-- --------------------------------------------------------------------------
-- 4. PREFERENZE ALIMENTARI e 5. SESSIONE IN CORSO
-- Una riga per persona: la chiave primaria e' l'utente stesso.
-- La sessione e' l'allenamento aperto in questo momento; `dati` a NULL vuol
-- dire "nessun allenamento in corso".
-- --------------------------------------------------------------------------
create table if not exists public.preferenze (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dati          jsonb not null default '{}'::jsonb,
  aggiornata_il timestamptz not null default now()
);

create table if not exists public.sessione (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dati          jsonb,
  aggiornata_il timestamptz not null default now()
);


-- ===========================================================================
-- REGOLE DI ACCESSO (Row Level Security)
--
-- ⚠️ QUESTA E' LA PARTE CHE PROTEGGE I DATI, non la chiave nel codice. La
-- chiave e' pubblica per progetto: senza queste regole, chiunque la copiasse
-- dal bundle potrebbe leggere il database intero. Con queste regole, il
-- database risponde solo per le righe di chi ha fatto il login.
--
-- `auth.uid()` e' l'utente che ha fatto la richiesta, letto dal suo token.
-- Non e' un valore che il browser puo' falsificare: lo verifica il server.
-- ===========================================================================

alter table public.profili    enable row level security;
alter table public.schede     enable row level security;
alter table public.diete      enable row level security;
alter table public.preferenze enable row level security;
alter table public.sessione   enable row level security;

-- --- profili -------------------------------------------------------------
-- Per adesso: ognuno vede e scrive SOLO il proprio.
-- ⚠️ Nella tappa 2 questa regola dovra' allargarsi (cercare un amico per nome,
-- trovare un PT dal codice), ma allargarla richiede decidere che cosa si vede
-- di uno sconosciuto — e non e' una cosa da lasciare a un default.
drop policy if exists "profilo: leggo il mio" on public.profili;
create policy "profilo: leggo il mio" on public.profili
  for select using (auth.uid() = id);

drop policy if exists "profilo: creo il mio" on public.profili;
create policy "profilo: creo il mio" on public.profili
  for insert with check (auth.uid() = id);

drop policy if exists "profilo: modifico il mio" on public.profili;
create policy "profilo: modifico il mio" on public.profili
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- --- schede, diete, preferenze, sessione ---------------------------------
-- Stessa regola per tutte e quattro: e' roba tua, la tocchi solo tu.
-- `for all` copre lettura, inserimento, modifica e cancellazione insieme.
drop policy if exists "schede: solo le mie" on public.schede;
create policy "schede: solo le mie" on public.schede
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "diete: solo le mie" on public.diete;
create policy "diete: solo le mie" on public.diete
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "preferenze: solo le mie" on public.preferenze;
create policy "preferenze: solo le mie" on public.preferenze
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessione: solo la mia" on public.sessione;
create policy "sessione: solo la mia" on public.sessione
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ===========================================================================
-- IL PROFILO NASCE INSIEME ALL'ACCOUNT
--
-- Alla registrazione l'app manda nome, ruolo e dati fisici come "metadati"
-- dell'utente; questo trigger li copia in `profili`. Lo fa il database e non
-- l'app apposta: se l'app si chiudesse tra la registrazione e il salvataggio
-- del profilo, resterebbe un account senza nome — e chi lo ha creato non
-- potrebbe piu' ne' ripararlo ne' accorgersene.
-- ===========================================================================
create or replace function public.gestisci_nuovo_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, nome, ruolo, codice_pt, dati)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'ruolo', ''), 'atleta'),
    -- Stringa vuota = atleta senza codice: deve diventare NULL, se no il primo
    -- atleta occuperebbe il codice '' e il secondo non riuscirebbe a iscriversi.
    nullif(new.raw_user_meta_data ->> 'codice_pt', ''),
    coalesce(new.raw_user_meta_data -> 'dati', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_nuovo_utente on auth.users;
create trigger al_nuovo_utente
  after insert on auth.users
  for each row execute function public.gestisci_nuovo_utente();


-- ===========================================================================
-- `aggiornata_il` la scrive il database, non il client: un orologio sbagliato
-- su un telefono non deve poter dire che una modifica di ieri e' di domani.
-- ===========================================================================
create or replace function public.segna_aggiornata()
returns trigger language plpgsql as $$
begin
  new.aggiornata_il = now();
  return new;
end;
$$;

drop trigger if exists schede_aggiornata on public.schede;
create trigger schede_aggiornata before update on public.schede
  for each row execute function public.segna_aggiornata();

drop trigger if exists diete_aggiornata on public.diete;
create trigger diete_aggiornata before update on public.diete
  for each row execute function public.segna_aggiornata();

drop trigger if exists preferenze_aggiornata on public.preferenze;
create trigger preferenze_aggiornata before update on public.preferenze
  for each row execute function public.segna_aggiornata();

drop trigger if exists sessione_aggiornata on public.sessione;
create trigger sessione_aggiornata before update on public.sessione
  for each row execute function public.segna_aggiornata();
