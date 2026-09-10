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
  -- ⚠️ `text` e non `uuid`: gli id li genera l'app, e `nuovoId()` ha un ripiego
  -- non-UUID ('id-xyz...') per quando `crypto.randomUUID` non c'e'. Con una
  -- colonna `uuid` quel ripiego farebbe fallire OGNI salvataggio, e in un modo
  -- difficile da capire. L'id qui e' una stringa opaca: che sia un UUID e' un
  -- dettaglio di chi lo produce, non un requisito di chi lo conserva.
  id            text primary key,
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
  id            text primary key,   -- vedi la nota su schede.id
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


-- ===========================================================================
-- ELIMINARE IL PROPRIO ACCOUNT
--
-- ⚠️ Un'app che gira nel browser NON puo' cancellare un utente da `auth.users`:
-- quella e' un'operazione da amministratore, e la chiave che serve per farla
-- (la secret key) non deve stare nel browser — se ci stesse, chiunque potrebbe
-- cancellare gli account di tutti.
--
-- La via giusta e' questa: una funzione che gira DENTRO il database con i
-- permessi del proprietario (`security definer`) ma che sa cancellare una cosa
-- sola — l'utente che l'ha chiamata, `auth.uid()`. Non prende parametri
-- apposta: cosi' non c'e' modo di chiederle di cancellare qualcun altro.
--
-- La cancellazione a cascata porta via anche profilo, schede, diete,
-- preferenze e sessione (sono tutte `on delete cascade`).
-- ===========================================================================
create or replace function public.elimina_mio_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Nessun utente autenticato';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.elimina_mio_account() from public, anon;
grant execute on function public.elimina_mio_account() to authenticated;


-- ===========================================================================
-- CORREZIONE per chi ha gia' creato le tabelle con `id uuid` (prima versione
-- di questo file). Rilanciarlo e' innocuo: se la colonna e' gia' `text` non
-- cambia niente.
-- ===========================================================================
alter table public.schede alter column id type text;
alter table public.diete  alter column id type text;


-- ###########################################################################
-- TAPPA 2 — GLI AMICI: relazioni, condivisioni, e chi vede cosa.
--
-- Qui si decide la cosa piu' delicata di tutta l'app: **cosa vede di te una
-- persona che non conosci.** Le scelte, fatte con l'utente il 2026-09-10:
--
--   · CI SI TROVA per CODICE AMICO o per NOME ESATTO. Niente ricerca parziale:
--     scrivere "mar" e vedere tutti i Marco vorrebbe dire che chiunque si
--     registri puo' ricavarsi l'elenco di chi usa l'app, tre lettere alla volta.
--   · SI VIENE SUGGERITI solo a chi ha un legame reale con noi (amici in comune
--     o stesso personal trainer). Un suggerimento e' un nome che l'altro non ha
--     cercato: darlo senza un legame sarebbe la ricerca parziale travestita.
--   · LO STORICO e' aperto a tutti quelli che hanno un account — ma solo per
--     cio' che e' stato reso PUBBLICO apposta: le schede nascono `nascosta`.
--
-- ⚠️ COME SI LEGGE UN PROFILO ALTRUI. Non con una policy larga su `profili`,
-- ma attraverso FUNZIONI che tornano i soli campi che servono (id e nome). Il
-- motivo e' che una policy dice "puoi leggere queste righe" e poi il client
-- sceglie le colonne — una funzione decide entrambe le cose in un posto solo.
-- ###########################################################################


-- --------------------------------------------------------------------------
-- Il codice amico: come il codice PT, ma per chiunque. Si manda su WhatsApp.
-- Niente 0/O e 1/I: vanno dettati al telefono senza equivoci.
-- --------------------------------------------------------------------------
alter table public.profili add column if not exists codice_amico text unique;

create or replace function public.genera_codice(base text)
returns text language plpgsql as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  pulito text;
  tentativo text;
  i int;
begin
  pulito := upper(regexp_replace(coalesce(base, ''), '[^a-zA-Z]', '', 'g'));
  pulito := substr(pulito, 1, 4);
  for i in 1..40 loop
    tentativo := pulito
      || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1)
      || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1)
      || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    -- Deve essere libero in ENTRAMBE le colonne: un codice non deve poter
    -- essere insieme il codice amico di uno e il codice PT di un altro.
    if not exists (
      select 1 from public.profili
      where codice_amico = tentativo or codice_pt = tentativo
    ) then
      return tentativo;
    end if;
  end loop;
  -- Improbabile, ma meglio un codice brutto che nessun codice.
  return pulito || substr(md5(random()::text), 1, 6);
end;
$$;

-- Il trigger che crea il profilo assegna anche il codice amico.
create or replace function public.gestisci_nuovo_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
begin
  n := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));
  insert into public.profili (id, nome, ruolo, codice_pt, codice_amico, dati)
  values (
    new.id,
    n,
    coalesce(nullif(new.raw_user_meta_data ->> 'ruolo', ''), 'atleta'),
    nullif(new.raw_user_meta_data ->> 'codice_pt', ''),
    public.genera_codice(n),
    coalesce(new.raw_user_meta_data -> 'dati', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Chi c'era prima di questa colonna se lo prende adesso.
update public.profili
   set codice_amico = public.genera_codice(nome)
 where codice_amico is null;


-- --------------------------------------------------------------------------
-- RELAZIONI: amicizie e rapporti di lavoro. Una richiesta che l'altro accetta.
-- --------------------------------------------------------------------------
create table if not exists public.relazioni (
  id          text primary key,
  tipo        text not null check (tipo in ('amicizia', 'lavoro')),
  da_id       uuid not null references auth.users(id) on delete cascade,
  a_id        uuid not null references auth.users(id) on delete cascade,
  stato       text not null default 'attesa' check (stato in ('attesa', 'accettata')),
  creata_il   timestamptz not null default now(),
  risposta_il timestamptz,
  -- Una relazione per coppia e per tipo, in un verso solo: senza questo, due
  -- persone che si mandano la richiesta nello stesso momento si ritrovano con
  -- due amicizie fra loro, e a quel punto toglierne una non basta.
  constraint relazioni_coppia unique (tipo, da_id, a_id),
  constraint relazioni_non_con_se_stessi check (da_id <> a_id)
);
create index if not exists relazioni_da_idx on public.relazioni (da_id);
create index if not exists relazioni_a_idx on public.relazioni (a_id);

-- --------------------------------------------------------------------------
-- CONDIVISIONI: schede, allenamenti e recap mandati a un amico.
-- `payload` e' una COPIA CONGELATA: se domani cancello la scheda, chi l'ha
-- ricevuta ce l'ha ancora. E' la stessa scelta di prima del cloud.
-- --------------------------------------------------------------------------
create table if not exists public.condivisioni (
  id          text primary key,
  tipo        text not null check (tipo in ('scheda', 'allenamento', 'recap')),
  da_id       uuid not null references auth.users(id) on delete cascade,
  da_nome     text not null default '',
  a_id        uuid not null references auth.users(id) on delete cascade,
  titolo      text not null default '',
  sottotitolo text not null default '',
  payload     jsonb not null,
  creata_il   timestamptz not null default now(),
  vista_il    timestamptz,
  salvata_il  timestamptz
);
create index if not exists condivisioni_a_idx on public.condivisioni (a_id);
create index if not exists condivisioni_da_idx on public.condivisioni (da_id);


-- ===========================================================================
-- CHI SEI PER ME: le funzioni che rispondono alle domande delle regole.
--
-- ⚠️ Sono `security definer` per un motivo preciso: una policy su `schede` che
-- guardasse dentro `profili` verrebbe filtrata a sua volta dalle regole di
-- `profili`, e la risposta sarebbe "no" anche quando e' "si'". Queste funzioni
-- guardano i dati senza filtri e tornano solo un si'/no — non fanno uscire
-- niente che chi chiama non potesse gia' sapere.
-- ===========================================================================
create or replace function public.sono_amico_di(altro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.relazioni
     where tipo = 'amicizia' and stato = 'accettata'
       and ((da_id = auth.uid() and a_id = altro) or (a_id = auth.uid() and da_id = altro))
  );
$$;

create or replace function public.ho_relazione_con(altro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.relazioni
     where (da_id = auth.uid() and a_id = altro) or (a_id = auth.uid() and da_id = altro)
  ) or exists (
    -- Il legame col personal trainer vive anche sul profilo, e vale in
    -- entrambi i versi: l'atleta vede il suo PT, il PT vede i suoi atleti.
    select 1 from public.profili
     where (id = auth.uid() and pt_id = altro) or (id = altro and pt_id = auth.uid())
  );
$$;

-- Sono io il personal trainer di questa persona? Serve alla visibilita'
-- "solo-pt" delle schede.
create or replace function public.e_mio_atleta(altro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili where id = altro and pt_id = auth.uid());
$$;


-- ===========================================================================
-- REGOLE DI ACCESSO — tappa 2
-- ===========================================================================
alter table public.relazioni    enable row level security;
alter table public.condivisioni enable row level security;

-- --- profili: il proprio, e quelli con cui si ha un legame ----------------
-- ⚠️ Questa policy NON permette di cercare: leggere il profilo di uno
-- sconosciuto resta impossibile. Trovare qualcuno passa dalle funzioni piu'
-- sotto, che tornano il solo nome e solo su corrispondenza esatta.
drop policy if exists "profilo: leggo il mio" on public.profili;
create policy "profilo: il mio e quelli legati a me" on public.profili
  for select using (auth.uid() = id or public.ho_relazione_con(id));

-- --- relazioni -----------------------------------------------------------
drop policy if exists "relazioni: le mie" on public.relazioni;
create policy "relazioni: le mie" on public.relazioni
  for select using (auth.uid() = da_id or auth.uid() = a_id);

-- La richiesta la manda chi la manda: non si puo' creare una richiesta a nome
-- di un altro.
drop policy if exists "relazioni: chiedo io" on public.relazioni;
create policy "relazioni: chiedo io" on public.relazioni
  for insert with check (auth.uid() = da_id and stato = 'attesa');

-- Accettare tocca a chi la riceve. (Il percorso normale e' la funzione
-- `accetta_relazione` qui sotto, che sistema anche il legame col PT.)
drop policy if exists "relazioni: accetto io che ricevo" on public.relazioni;
create policy "relazioni: accetto io che ricevo" on public.relazioni
  for update using (auth.uid() = a_id) with check (auth.uid() = a_id);

-- Rifiutare, ritirare, o togliere un'amicizia: entrambi i lati possono.
drop policy if exists "relazioni: tolgo da entrambi i lati" on public.relazioni;
create policy "relazioni: tolgo da entrambi i lati" on public.relazioni
  for delete using (auth.uid() = da_id or auth.uid() = a_id);

-- --- condivisioni --------------------------------------------------------
drop policy if exists "condivisioni: mie o a me" on public.condivisioni;
create policy "condivisioni: mie o a me" on public.condivisioni
  for select using (auth.uid() = da_id or auth.uid() = a_id);

-- ⚠️ Si manda roba SOLO agli amici. Senza questa condizione, chiunque
-- conoscesse un id potrebbe recapitare quello che vuole a chiunque.
drop policy if exists "condivisioni: mando io, e solo agli amici" on public.condivisioni;
create policy "condivisioni: mando io, e solo agli amici" on public.condivisioni
  for insert with check (auth.uid() = da_id and public.sono_amico_di(a_id));

-- Chi riceve segna "vista" e "salvata".
drop policy if exists "condivisioni: segno io che ricevo" on public.condivisioni;
create policy "condivisioni: segno io che ricevo" on public.condivisioni
  for update using (auth.uid() = a_id) with check (auth.uid() = a_id);

drop policy if exists "condivisioni: cancello da entrambi i lati" on public.condivisioni;
create policy "condivisioni: cancello da entrambi i lati" on public.condivisioni
  for delete using (auth.uid() = da_id or auth.uid() = a_id);

-- --- schede: lo Storico aperto -------------------------------------------
-- Scelta dell'utente (2026-09-10): gli allenamenti resi PUBBLICI si vedono tra
-- tutti quelli che hanno un account, "per prendere spunto". Il default resta
-- `nascosta`: si vede solo cio' che qualcuno ha deciso di mostrare.
drop policy if exists "schede: le pubbliche le legge chi ha un account" on public.schede;
create policy "schede: le pubbliche le legge chi ha un account" on public.schede
  for select using (
    visibilita = 'pubblica'
    or (visibilita = 'solo-pt' and public.e_mio_atleta(user_id))
  );


-- ===========================================================================
-- TROVARE UNA PERSONA
--
-- Due strade, e nessuna delle due permette di sfogliare:
--   · il CODICE AMICO, che si manda a chi si vuole;
--   · il NOME ESATTO, tutto intero. `citext`-style, cioe' senza distinguere
--     maiuscole e accenti, ma **senza `like`**: "mar" non trova "Marco".
--
-- ⚠️ Torna `id` e `nome` e nient'altro. Non l'email, non i dati fisici, non il
-- livello: chi cerca deve poter dire "e' lui" e mandare la richiesta, non farsi
-- un'idea di uno che non lo conosce.
-- ===========================================================================
create or replace function public.cerca_persona(chiave text)
returns table (id uuid, nome text, come text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome,
         case when upper(trim(chiave)) in (p.codice_amico, p.codice_pt)
              then 'codice' else 'nome' end
    from public.profili p
   where p.id <> auth.uid()
     and length(trim(chiave)) >= 3
     and (
       upper(trim(chiave)) = p.codice_amico
       or upper(trim(chiave)) = p.codice_pt
       -- Nome ESATTO: niente `%chiave%`, che rimetterebbe in piedi la ricerca
       -- parziale e con essa la possibilita' di ricavarsi l'elenco di tutti.
       or lower(trim(chiave)) = lower(p.nome)
     )
   limit 20;
$$;

revoke all on function public.cerca_persona(text) from public, anon;
grant execute on function public.cerca_persona(text) to authenticated;


-- ===========================================================================
-- AMICI SUGGERITI
--
-- ⚠️ IL PUNTO DELICATO. Un suggerimento e' un nome che l'altro non ha cercato:
-- proporre gente a caso sarebbe la ricerca parziale rimessa in piedi da
-- un'altra porta, e vanificherebbe la scelta di non essere sfogliabili.
-- Quindi si suggerisce SOLO chi e' collegato da un percorso vero:
--
--   1. AMICI DI AMICI — il segnale classico, e l'unico che dice qualcosa sulle
--      persone. Piu' amici in comune, piu' su nell'elenco.
--   2. STESSO PERSONAL TRAINER — in una palestra e' il legame piu' forte che
--      esista: vi allenate con lo stesso programma, spesso negli stessi orari.
--
-- Chi non ha nessuno dei due legami non viene proposto, e non c'e' un ripiego
-- tipo "ultimi iscritti": senza legame, un nome e' solo un nome di sconosciuto.
--
-- Conseguenza da sapere: dire "2 amici in comune" racconta un pezzo della rete
-- di amicizie di qualcun altro. E' come funziona ovunque, ma e' una scelta.
-- ===========================================================================
create or replace function public.amici_suggeriti(limite int default 10)
returns table (id uuid, nome text, motivo text, amici_in_comune int)
language sql stable security definer set search_path = public as $$
  with io as (select auth.uid() as me),
  -- Le persone con cui ho gia' a che fare: non vanno suggerite.
  gia_note as (
    select case when da_id = (select me from io) then a_id else da_id end as altro
      from public.relazioni
     where da_id = (select me from io) or a_id = (select me from io)
    union
    select pt_id from public.profili where id = (select me from io) and pt_id is not null
    union
    select id from public.profili where pt_id = (select me from io)
    union
    select (select me from io)
  ),
  miei_amici as (
    select case when da_id = (select me from io) then a_id else da_id end as amico
      from public.relazioni
     where tipo = 'amicizia' and stato = 'accettata'
       and (da_id = (select me from io) or a_id = (select me from io))
  ),
  -- 1. Amici dei miei amici, con quanti ne abbiamo in comune.
  di_secondo_grado as (
    select case when r.da_id in (select amico from miei_amici) then r.a_id else r.da_id end as candidato,
           count(*)::int as in_comune
      from public.relazioni r
     where r.tipo = 'amicizia' and r.stato = 'accettata'
       and (r.da_id in (select amico from miei_amici) or r.a_id in (select amico from miei_amici))
     group by 1
  ),
  -- 2. Gli altri atleti del mio personal trainer.
  stesso_pt as (
    select p.id as candidato
      from public.profili p
     where p.pt_id is not null
       and p.pt_id = (select pt_id from public.profili where id = (select me from io))
  ),
  candidati as (
    select candidato, in_comune, 'amici in comune' as motivo from di_secondo_grado
    union all
    select candidato, 0, 'stesso personal trainer' from stesso_pt
  )
  select p.id, p.nome,
         -- A parita' di persona vince il motivo piu' informativo.
         (array_agg(c.motivo order by c.in_comune desc))[1] as motivo,
         max(c.in_comune) as amici_in_comune
    from candidati c
    join public.profili p on p.id = c.candidato
   where c.candidato not in (select altro from gia_note where altro is not null)
   group by p.id, p.nome
   order by max(c.in_comune) desc, p.nome
   limit greatest(1, least(coalesce(limite, 10), 50));
$$;

revoke all on function public.amici_suggeriti(int) from public, anon;
grant execute on function public.amici_suggeriti(int) to authenticated;


-- ===========================================================================
-- ACCETTARE UNA RICHIESTA
--
-- ⚠️ Perche' serve una funzione e non basta un `update`. Accettare un ATLETA
-- vuol dire scrivere `pt_id` sul profilo DELL'ATLETA — cioe' nella riga di un
-- altro, che nessuno deve poter toccare. Qui il database lo fa per conto del
-- PT, ma solo dopo aver verificato che la richiesta esista, sia indirizzata a
-- lui e sia ancora in attesa. E' l'unico modo di concedere quella singola
-- scrittura senza aprire la porta a tutte le altre.
-- ===========================================================================
create or replace function public.accetta_relazione(rel_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.relazioni%rowtype;
begin
  select * into r from public.relazioni where id = rel_id;
  if not found then raise exception 'Richiesta non trovata'; end if;
  if r.a_id <> auth.uid() then raise exception 'Non è una richiesta per te'; end if;
  if r.stato <> 'attesa' then return; end if;

  update public.relazioni
     set stato = 'accettata', risposta_il = now()
   where id = rel_id;

  -- Richiesta di lavoro: chi chiede e' l'atleta, chi accetta e' il PT.
  if r.tipo = 'lavoro' then
    update public.profili
       set pt_id = r.a_id, associato_il = now()
     where id = r.da_id;
  end if;
end;
$$;

revoke all on function public.accetta_relazione(text) from public, anon;
grant execute on function public.accetta_relazione(text) to authenticated;


-- ===========================================================================
-- I NOMI DI CHI COMPARE NELLO STORICO
--
-- ⚠️ Serve perche' le due scelte fatte sopra, messe insieme, lasciavano un
-- buco: lo Storico puo' leggere le schede PUBBLICHE di chiunque, ma la regola
-- su `profili` lascia leggere solo i profili delle persone legate a me. Senza
-- questa funzione lo Storico mostrerebbe allenamenti di "qualcuno".
--
-- Il criterio e' lo stesso di sempre: si vede il nome di chi ha gia' deciso di
-- mostrare qualcosa. Chi non ha niente di pubblico non compare, nemmeno
-- chiedendo il suo id.
-- ===========================================================================
create or replace function public.nomi_di(ids uuid[])
returns table (id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome
    from public.profili p
   where p.id = any(ids)
     and (
       p.id = auth.uid()
       or public.ho_relazione_con(p.id)
       or exists (select 1 from public.schede s where s.user_id = p.id and s.visibilita = 'pubblica')
     );
$$;

revoke all on function public.nomi_di(uuid[]) from public, anon;
grant execute on function public.nomi_di(uuid[]) to authenticated;
