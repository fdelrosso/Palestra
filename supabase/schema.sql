-- ===========================================================================
-- Palestra — schema del database (tappa 1: account veri + i dati di ognuno)
--
-- Da eseguire nel SQL Editor di Supabase. E' scritto per poter essere
-- rilanciato piu' volte senza rompere niente (create ... if not exists,
-- drop policy prima di crearla): se sbagli qualcosa, correggi e rilancia tutto.
--
-- ⚠️ REGOLA PER CHI TOCCA QUESTO FILE: ogni `create policy` vuole sopra il
-- `drop policy if exists` DEL SUO NOME — non del nome che quella regola aveva
-- prima. Rinominare una policy e lasciare il drop vecchio funziona la prima
-- volta e si rompe la seconda ("policy ... already exists"), cioe' proprio
-- quando serve: quando si rilancia il file dopo averlo corretto. Se una regola
-- ne sostituisce una che si chiamava diversamente, servono DUE drop.
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
-- ⚠️ DUE `drop`, e servono tutti e due. Questa regola SOSTITUISCE quella della
-- tappa 1, che si chiamava diversamente: il primo drop toglie la vecchia, il
-- secondo serve a poter rilanciare il file (senza, al secondo giro la nuova
-- esiste gia' e Postgres si ferma con "policy already exists").
-- ⚠️ SOSTITUITA in fondo al file ("I DATI FISICI LI VEDONO SOLO IL TITOLARE E
-- IL SUO PERSONAL TRAINER"): dava la riga intera, dati fisici compresi.
drop policy if exists "profilo: leggo il mio" on public.profili;
drop policy if exists "profilo: il mio e quelli legati a me" on public.profili;
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
--
-- ⚠️ QUI NELLA TAPPA 2 C'ERA UNA POLICY, e non c'e' piu': faceva leggere le
-- schede pubbliche direttamente dalla tabella, e cosi' faceva uscire il json
-- INTERO. L'ha sostituita `schede_visibili()` — il perche' per esteso e' in
-- fondo al file, dove la si toglie. Sulla tabella resta la regola di sempre:
-- le mie e basta.


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
--
-- ⚠️ "Qualcosa di pubblico" sono DUE cose, non una: una scheda pubblica, oppure
-- un allenamento pubblico — che puo' stare dentro una scheda nascosta, perche'
-- le due visibilita' sono indipendenti (vedi `allenamenti_visibili`). Con la
-- sola prima condizione, chi tiene per se' il programma ma pubblica gli
-- allenamenti sarebbe finito nello Storico come "qualcuno".
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
       or exists (
         select 1
           from public.schede s
           cross join lateral jsonb_array_elements(
                        coalesce(s.dati -> 'completamenti', '[]'::jsonb)) as fatto(c)
          where s.user_id = p.id
            and coalesce(nullif(fatto.c ->> 'visibilita', ''), 'nascosta') = 'pubblica'
       )
     );
$$;

revoke all on function public.nomi_di(uuid[]) from public, anon;
grant execute on function public.nomi_di(uuid[]) to authenticated;


-- ===========================================================================
-- LO STORICO APERTO, LE SCHEDE GENERALI E IL SEGNALE "COMUNITA'"
--
-- Sono le tre viste che, in tutta l'app, guardano i dati di PIU' persone
-- insieme: gli allenamenti pubblici di chiunque, le schede da cui prendere
-- spunto, e cosa fanno gli altri (che e' cio' che regge i consigli a chi non ha
-- ancora uno storico suo). Prima leggevano il localStorage di tutti i profili
-- del telefono: nel cloud non esiste piu' niente del genere, e la domanda
-- "cosa posso vedere degli altri" e' esattamente una domanda da database.
--
-- ⚠️ IL PUNTO IMPORTANTE: NON BASTA UNA REGOLA SULLA RIGA. La riga e' la
-- SCHEDA, ma dentro il json ci sono i COMPLETAMENTI, e ognuno ha la sua
-- visibilita', scelta a fine allenamento. Lasciar passare la scheda intera e
-- poi filtrarli nel browser vorrebbe dire spedirli comunque: chi guarda la
-- rete se li leggerebbe tutti, compresi quelli marcati "non farlo vedere a
-- nessuno". Il filtro nel browser (lib/visibilita) resta, ma come cortesia,
-- non come difesa.
--
-- ⚠️ E LE DUE VISIBILITA' SONO INDIPENDENTI, non una il tetto dell'altra.
-- Nascondere la SCHEDA vuol dire "non far vedere il mio programma"; pubblicare
-- un ALLENAMENTO vuol dire "ho fatto questo, guardate". Sono due frasi diverse,
-- e uno puo' volerle dire tutte e due insieme — decisione dell'utente, ed e'
-- come funzionava prima del cloud. Percio' le due cose escono da due funzioni
-- diverse:
--   · `schede_visibili()`      — le schede (il PROGRAMMA), SENZA i completamenti;
--   · `allenamenti_visibili()` — i completamenti, presi da QUALSIASI scheda,
--                                anche nascosta, e filtrati uno per uno.
-- Cosi' l'allenamento pubblico di una scheda nascosta esce, e della scheda che
-- lo conteneva non esce niente: di quel programma non si sapra' ne' il nome ne'
-- gli esercizi. Il completamento porta con se' il nome della scheda e del
-- giorno, congelati a fine allenamento (`lib/session.js`) — cioe' proprio
-- quello che chi pubblica un allenamento sta pubblicando.
--
-- Torna anche due cose che il browser NON puo' calcolarsi da solo, perche'
-- richiedono di vedere profili che non ha il diritto di leggere:
--   · `autore_pt`   — chi l'ha scritta e' un personal trainer;
--   · `relazione_pt`— 2 = l'ha scritta il MIO PT, 1 = un altro atleta che lui
--                     segue, 0 = nessun legame. E' l'ordine delle Schede
--                     Generali, ed e' anche cio' che isola il segnale del
--                     proprio PT per il motore dei consigli.
-- ===========================================================================
create or replace function public.schede_visibili()
returns table (
  id text,
  user_id uuid,
  autore_pt boolean,
  relazione_pt int,
  visibilita text,
  libera boolean,
  dati jsonb
)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select
    s.id,
    s.user_id,
    (autore.ruolo = 'pt') as autore_pt,
    case
      when s.user_id = io.me then 0
      when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end as relazione_pt,
    s.visibilita,
    s.libera,
    -- ⚠️ VIA I COMPLETAMENTI, anche dalle proprie: qui esce il PROGRAMMA.
    -- Gli allenamenti svolti hanno una visibilita' loro e una funzione loro
    -- (`allenamenti_visibili`), che li prende da tutte le schede — comprese le
    -- nascoste. Lasciarli anche qui vorrebbe dire contarli due volte.
    (s.dati - 'completamenti') as dati
  from public.schede s
  join io on true
  join public.profili autore on autore.id = s.user_id
  where s.user_id = io.me
     or s.visibilita = 'pubblica'
     or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id));
$$;

revoke all on function public.schede_visibili() from public, anon;
grant execute on function public.schede_visibili() to authenticated;


-- ===========================================================================
-- MODERAZIONE: LE BASI (40ª tornata)
--
-- Le regole sono nei Termini (public/termini.html, punto 7) e le decide un
-- MODERATORE. Qui ci sono solo i pezzi che servono già alle sezioni sotto
-- (allenamenti visibili, foto, commenti, messaggi), che controllano due cose:
--   - `in_attesa(tipo, oggetto)`: un commento o una foto segnalati da almeno
--     TRE persone diverse sono nascosti a tutti — tranne a chi li ha
--     pubblicati e ai moderatori — finché un moderatore non decide;
--   - `pubblicazione_bloccata(utente)` / `account_bloccato(utente)`: le
--     sanzioni. Al 3° contenuto tolto non si pubblica più nel Feed (commenti,
--     foto pubbliche, allenamenti pubblici); al 4° l'account è bloccato (e
--     non scrive nemmeno in chat). Si sblocca solo un moderatore, di solito
--     su richiesta (`richieste_sblocco`, in fondo al file).
-- Il resto (segnalare, decidere, avvisare, sbloccare) sta in fondo, nella
-- sezione SEGNALAZIONI, DECISIONI E AVVISI.
--
-- Chi è moderatore lo dice `moderatori`, e ci si entra SOLO dal SQL Editor:
-- dall'app nessuno può nominarsi da solo.
-- ===========================================================================

create table if not exists public.moderatori (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  creato_il timestamptz not null default now()
);

alter table public.moderatori enable row level security;

-- Ognuno sa solo se lo è lui. Nessuna regola di scrittura: si entra dal SQL Editor.
drop policy if exists "moderatori: so se lo sono" on public.moderatori;
create policy "moderatori: so se lo sono" on public.moderatori
  for select using (user_id = auth.uid());

create or replace function public.sono_moderatore()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderatori where user_id = auth.uid());
$$;

revoke all on function public.sono_moderatore() from public, anon;
grant execute on function public.sono_moderatore() to authenticated;

create table if not exists public.segnalazioni (
  id              text primary key,
  segnalato_da    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Cosa: un commento (allenamento_commenti.id) o una foto/video del Feed
  -- (allenamento_foto.id).
  tipo            text not null check (tipo in ('commento', 'foto')),
  oggetto         text not null,
  -- Li scrive il database (trigger in fondo al file), non chi segnala: chi
  -- l'ha pubblicato e sotto quale allenamento.
  autore_id       uuid references auth.users(id) on delete set null,
  allenamento_key text,
  motivo          text not null
                  check (motivo in ('offensivo', 'volgare', 'molestie', 'sessuale', 'violenza', 'spam', 'altro')),
  dettaglio       text not null default '' check (length(dettaglio) <= 500),
  stato           text not null default 'aperta' check (stato in ('aperta', 'rimossa', 'respinta')),
  creata_il       timestamptz not null default now(),
  decisa_il       timestamptz,
  decisa_da       uuid references auth.users(id) on delete set null,
  -- Una persona segnala una cosa una volta: premere due volte non fa due voti.
  unique (segnalato_da, tipo, oggetto),
  constraint segnalazione_altro_spiegata check (motivo <> 'altro' or length(trim(dettaglio)) > 0)
);
-- `in_attesa` la guarda per OGNI foto e commento letti: deve essere un indice.
create index if not exists segnalazioni_oggetto_aperte_idx
  on public.segnalazioni (tipo, oggetto) where stato = 'aperta';
create index if not exists segnalazioni_aperte_idx
  on public.segnalazioni (creata_il) where stato = 'aperta';

alter table public.segnalazioni enable row level security;

-- Le mie (per non mostrarmi più quello che ho segnalato), e tutte per i moderatori.
drop policy if exists "segnalazioni: le mie, tutte per i moderatori" on public.segnalazioni;
create policy "segnalazioni: le mie, tutte per i moderatori" on public.segnalazioni
  for select using (segnalato_da = auth.uid() or public.sono_moderatore());

drop policy if exists "segnalazioni: le mando io, aperte" on public.segnalazioni;
create policy "segnalazioni: le mando io, aperte" on public.segnalazioni
  for insert with check (segnalato_da = auth.uid() and stato = 'aperta' and decisa_il is null);

-- Quante cose di una persona sono state tolte, e cosa le è bloccato. Una riga
-- nasce alla prima rimozione (decidi_segnalazione) e non si scrive dall'app.
create table if not exists public.sanzioni (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  -- Contenuti tolti in tutto. Non scende quando si sblocca: dopo lo sblocco
  -- della pubblicazione, il prossimo contenuto tolto blocca l'account.
  tolti                  int not null default 0,
  pubblicazione_bloccata boolean not null default false,
  account_bloccato       boolean not null default false,
  aggiornato_il          timestamptz not null default now()
);

alter table public.sanzioni enable row level security;

drop policy if exists "sanzioni: le mie, tutte per i moderatori" on public.sanzioni;
create policy "sanzioni: le mie, tutte per i moderatori" on public.sanzioni
  for select using (user_id = auth.uid() or public.sono_moderatore());

-- Segnalato da almeno tre persone diverse e non ancora deciso.
create or replace function public.in_attesa(p_tipo text, p_oggetto text)
returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(distinct s.segnalato_da) from public.segnalazioni s
           where s.tipo = p_tipo and s.oggetto = p_oggetto and s.stato = 'aperta') >= 3;
$$;

create or replace function public.account_bloccato(p_utente uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select z.account_bloccato from public.sanzioni z where z.user_id = p_utente), false);
$$;

-- L'account bloccato non pubblica nemmeno lui.
create or replace function public.pubblicazione_bloccata(p_utente uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select z.pubblicazione_bloccata or z.account_bloccato
                     from public.sanzioni z where z.user_id = p_utente), false);
$$;

revoke all on function public.in_attesa(text, text) from public, anon;
grant execute on function public.in_attesa(text, text) to authenticated;
revoke all on function public.account_bloccato(uuid) from public, anon;
grant execute on function public.account_bloccato(uuid) to authenticated;
revoke all on function public.pubblicazione_bloccata(uuid) from public, anon;
grant execute on function public.pubblicazione_bloccata(uuid) to authenticated;


-- ===========================================================================
-- GLI ALLENAMENTI SVOLTI CHE SI POSSONO VEDERE
--
-- Uno per riga, presi da QUALSIASI scheda — anche da una nascosta. La
-- visibilita' di un allenamento e' sua: la si sceglie a fine allenamento, e non
-- la si perde per il posto in cui l'allenamento e' finito a stare.
--
-- ⚠️ Della scheda che lo conteneva non esce NIENTE: ne' il nome, ne' i giorni,
-- ne' gli esercizi in programma. Esce il completamento e basta, e quello si
-- porta dietro `nomeScheda` e `nomeGiorno` congelati a fine allenamento
-- (`lib/session.js`) — cioe' quello che chi pubblica un allenamento sta
-- pubblicando. `scheda_id` serve solo a distinguere due allenamenti, non ad
-- andare a cercare la scheda: quella, se e' nascosta, non si legge.
--
-- Chi vede cosa:
--   · i MIEI, tutti, anche quelli tenuti per me (e' la mia cronologia);
--   · di chiunque altro, quelli PUBBLICI (campo assente = pubblico, come in
--     src/lib/visibilita.js: le due cose devono dire la stessa frase);
--   · in piu', quelli "solo al PT" dei MIEI atleti — a me che sono il loro PT.
-- ===========================================================================
create or replace function public.allenamenti_visibili()
returns table (
  user_id uuid,
  scheda_id text,
  relazione_pt int,
  dati jsonb
)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select
    s.user_id,
    s.id as scheda_id,
    -- Stesso significato di `schede_visibili`: 2 = e' del mio PT, 1 = di un
    -- altro suo atleta. Serve al motore dei consigli, che deve poter isolare
    -- "cosa fa fare il MIO personal trainer" da tutto il resto.
    case
      when s.user_id = io.me then 0
      when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end as relazione_pt,
    fatto.c as dati
  from public.schede s
  join io on true
  join public.profili autore on autore.id = s.user_id
  cross join lateral jsonb_array_elements(
    coalesce(s.dati -> 'completamenti', '[]'::jsonb)) as fatto(c)
  where s.user_id = io.me
     -- ⚠️ Campo assente = NASCOSTO: chi non sceglie non pubblica. E' la stessa
     -- frase di src/lib/visibilita.js, e le due devono restare uguali — qui e'
     -- dove il filtro conta davvero.
     -- Con la pubblicazione bloccata (MODERAZIONE, sopra) gli allenamenti
     -- pubblici non arrivano agli altri: restano visibili al PT.
     or (coalesce(nullif(fatto.c ->> 'visibilita', ''), 'nascosta') = 'pubblica'
         and not public.pubblicazione_bloccata(s.user_id))
     or (fatto.c ->> 'visibilita' = 'solo-pt' and public.e_mio_atleta(s.user_id));
$$;

revoke all on function public.allenamenti_visibili() from public, anon;
grant execute on function public.allenamenti_visibili() to authenticated;


-- ===========================================================================
-- QUANTI ATLETI SEGUE UN PERSONAL TRAINER
--
-- Serve a chi NON ha un PT: il motore pesa i personal trainer in proporzione a
-- quanti atleti seguono, cosi' che "quello che fa fare un PT seguito da molti"
-- valga piu' del caso (lib/comunita → influenzaPt).
--
-- ⚠️ Risponde SOLO sugli id che gli si passano, e sono gli id degli autori
-- delle schede che si stanno gia' vedendo. Non e' una classifica dei PT
-- dell'app: chiedere "chi sono i piu' seguiti" resta una domanda senza
-- risposta, come dev'essere.
-- ===========================================================================
create or replace function public.fama_pt(ids uuid[])
returns table (id uuid, atleti int)
language sql stable security definer set search_path = public as $$
  select p.id, count(a.id)::int as atleti
    from public.profili p
    left join public.profili a on a.pt_id = p.id
   where p.id = any(ids) and p.ruolo = 'pt'
   group by p.id;
$$;

revoke all on function public.fama_pt(uuid[]) from public, anon;
grant execute on function public.fama_pt(uuid[]) to authenticated;


-- ===========================================================================
-- ⚠️ E ORA SI RICHIUDE LA PORTA GRANDE.
--
-- Nella tappa 2 le schede pubbliche si leggevano direttamente dalla tabella.
-- Funzionava, ma faceva uscire il json INTERO — compresi i completamenti che
-- qualcuno aveva marcato "nascosto" dentro una scheda per il resto pubblica.
-- Da adesso l'unica strada per vedere le schede di un altro e'
-- `schede_visibili()`, che ripulisce; sulla tabella resta la regola di sempre:
-- le mie e basta.
-- ===========================================================================
drop policy if exists "schede: le pubbliche le legge chi ha un account" on public.schede;


-- ===========================================================================
-- TAPPA 3 — FOTO E VIDEO DEGLI ESERCIZI
--
-- I blob vanno su Supabase Storage, nel bucket privato `media`. Nel json della
-- scheda resta il `MediaRef` di sempre ({id, tipo, nome, autore, visibilita}),
-- che e' quello che serve a DISEGNARE la miniatura; qui in tabella finisce
-- quello che serve a DECIDERE CHI PUO' SCARICARLA. E' la stessa divisione del
-- resto del file: nel json il documento, in colonne cio' su cui ragionano le
-- regole.
--
-- ⚠️ PERCHE' UNA TABELLA E NON IL JSON. La regola di accesso su Storage deve
-- rispondere a "questo file, chi puo' prenderselo?" — e la risposta dipende da
-- due cose che stanno sepolte dentro un array dentro un oggetto dentro `dati`.
-- Frugare nel jsonb a ogni download sarebbe lento e, peggio, fragile. Con una
-- riga per file la domanda diventa una join.
--
-- ⚠️ E QUINDI LA RIGA E IL JSON DEVONO RESTARE D'ACCORDO. E' l'unico punto
-- dell'app in cui lo stesso fatto (la visibilita' di un media) e' scritto in
-- due posti: chi cambia "privata/pubblica" nella UI deve aggiornare tutti e
-- due. La riga e' quella che comanda — se le due divergono, vince la regola, e
-- il file non si scarica.
--
-- ⚠️ PERCORSO: `<user_id>/<media_id>`. Il primo pezzo e' l'id di chi carica, e
-- serve alla regola di scrittura: si scrive solo nella propria cartella, e non
-- c'e' modo di far finta di essere un altro.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 209715200)   -- 200MB, come il limite nel client
on conflict (id) do update set public = false, file_size_limit = 209715200;

create table if not exists public.media (
  -- Lo STESSO id del MediaRef dentro la scheda: e' cio' che lega le due cose.
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Dove sta attaccato. Serve alla regola: una foto "pubblica" la vede chi puo'
  -- vedere la scheda che la contiene, non chiunque.
  scheda_id    text references public.schede(id) on delete cascade,
  percorso     text not null unique,
  tipo         text not null default 'foto' check (tipo in ('foto', 'video')),
  nome         text,
  peso         bigint,
  -- Due valori soli, e sono un'altra cosa dalla visibilita' delle schede:
  -- 'privata' = la vede solo chi l'ha caricata (vedi src/lib/visibilita.js, in
  -- fondo al commento in testa).
  -- ⚠️ 'privata' come default, come nel selettore dell'app: una foto che parte
  -- pubblica senza che nessuno l'abbia deciso e' esattamente il caso che si e'
  -- voluto togliere di mezzo (vedi src/lib/visibilita.js).
  visibilita   text not null default 'privata'
               check (visibilita in ('privata', 'pubblica')),
  creato_il    timestamptz not null default now()
);
create index if not exists media_user_idx   on public.media (user_id);
create index if not exists media_scheda_idx on public.media (scheda_id);

alter table public.media enable row level security;

-- La riga e' di chi ha caricato il file, e la tocca solo lui. Gli ALTRI non
-- hanno bisogno di leggerla: il percorso di un media se lo ricavano da soli
-- (l'id sta nel MediaRef, la cartella e' l'id di chi ha scritto la scheda), e
-- se possano scaricarlo lo decide la regola su Storage qui sotto.
drop policy if exists "media: solo i miei" on public.media;
create policy "media: solo i miei" on public.media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ===========================================================================
-- CHI PUO' SCARICARE UN FILE
--
-- Una funzione sola, perche' la stessa frase la devono dire la regola di
-- lettura su Storage e chiunque altro se lo chieda. Le condizioni sono due,
-- in ordine di forza:
--   1. e' mio                      → sempre, anche se e' privato;
--   2. e' marcato 'pubblica' E la scheda in cui sta la posso vedere — cioe'
--      esattamente le stesse condizioni di `schede_visibili()`.
--
-- ⚠️ La seconda meta' della condizione 2 non e' pignoleria: senza, "pubblica"
-- vorrebbe dire "chiunque abbia un account e conosca l'id", e a proteggere il
-- file resterebbe solo il fatto che l'id e' difficile da indovinare. Che non e'
-- proteggerlo.
-- ===========================================================================
create or replace function public.posso_scaricare_media(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.media m
      left join public.schede s on s.id = m.scheda_id
     where m.percorso = percorso_file
       and (
         m.user_id = auth.uid()
         or (
           m.visibilita = 'pubblica'
           and s.id is not null
           and (
             s.user_id = auth.uid()
             or s.visibilita = 'pubblica'
             or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id))
           )
         )
       )
  );
$$;

revoke all on function public.posso_scaricare_media(text) from public, anon;
grant execute on function public.posso_scaricare_media(text) to authenticated;


-- --- le regole sul bucket -------------------------------------------------
-- ⚠️ Se queste tre danno "must be owner of table objects", vuol dire che il
-- progetto non lascia toccare `storage.objects` dal SQL Editor: in quel caso si
-- fanno dalla dashboard (Storage → media → Policies) con le stesse condizioni.
drop policy if exists "media: leggo cio' che ho diritto di vedere" on storage.objects;
create policy "media: leggo cio' che ho diritto di vedere" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.posso_scaricare_media(name));

drop policy if exists "media: carico solo nella mia cartella" on storage.objects;
create policy "media: carico solo nella mia cartella" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media: cancello solo i miei" on storage.objects;
create policy "media: cancello solo i miei" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );



-- ===========================================================================
-- TAPPA 3, SECONDA META' — FOTO E VIDEO MOMENTANEI TRA AMICI
--
-- Un invio vive il minimo indispensabile: sparisce appena il destinatario l'ha
-- guardato, e comunque dopo 24 ore. Il motivo non e' la privacy ma la MEMORIA
-- (un video di 10" pesa ~15MB) — ed e' scritto anche nell'app, perche' non
-- venga scambiato per una garanzia che non e'.
--
-- ⚠️ COSA VUOL DIRE "SPARISCE", QUI. Vuol dire che il file NON SI PUO' PIU'
-- SCARICARE: lo dice la regola, che guarda la riga (consumato? scaduto?) prima
-- di lasciar passare la richiesta. I byte veri li cancella chi guarda, nel
-- momento in cui chiude il visore — quella e' una chiamata vera allo Storage.
-- Se nessuno apre l'invio, alla scadenza la riga se ne va e il file resta
-- irraggiungibile. Non si promette la distruzione dei byte: si promette che
-- non li vede piu' nessuno, ed e' quello che l'app dice a chi manda.
--
-- ⚠️ UNA COPIA PER DESTINATARIO, non una condivisa. Mandare la stessa foto a
-- tre amici carica tre file. Sembra uno spreco ed e' voluto: "l'ha guardata" e'
-- di ciascuno, e con un file solo non si potrebbe cancellare finche' l'ultimo
-- non l'ha aperto — cioe' mai, se uno se ne dimentica.
--
-- ⚠️ NIENTE CRON, E NIENTE SQL: la pulizia la fa l'APP, dalla Storage API, a
-- ogni accesso (`lib/effimeri.js → pulisciScaduti`). Non e' una preferenza —
-- cancellare file da SQL Supabase non lo permette, vedi piu' sotto. Un cron
-- avrebbe avuto lo stesso problema, e comunque non aggiungerebbe garanzie: nel
-- frattempo la regola dice gia' di no.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('effimeri', 'effimeri', false, 52428800)   -- 50MB: qui i video sono da 10"
on conflict (id) do update set public = false, file_size_limit = 52428800;

create table if not exists public.effimeri (
  id          text primary key,
  da_id       uuid not null references auth.users(id) on delete cascade,
  -- Congelato come nelle condivisioni: se l'amicizia finisce, il profilo non si
  -- legge piu' e l'invio diventerebbe "una foto di nessuno".
  da_nome     text not null default '',
  a_id        uuid not null references auth.users(id) on delete cascade,
  percorso    text not null unique,
  tipo        text not null default 'foto' check (tipo in ('foto', 'video')),
  nome        text,
  peso        bigint,
  inviato_il  timestamptz not null default now(),
  scade_il    timestamptz not null,
  aperto_il   timestamptz,
  -- true = il file non c'e' piu' (l'ha guardato). La riga resta fino alla
  -- scadenza, cosi' per un giorno chi ha mandato vede che e' arrivata.
  consumato   boolean not null default false
);
create index if not exists effimeri_a_idx     on public.effimeri (a_id);
create index if not exists effimeri_da_idx    on public.effimeri (da_id);
create index if not exists effimeri_scade_idx on public.effimeri (scade_il);

alter table public.effimeri enable row level security;

drop policy if exists "effimeri: miei o a me" on public.effimeri;
create policy "effimeri: miei o a me" on public.effimeri
  for select using (auth.uid() = da_id or auth.uid() = a_id);

-- ⚠️ Solo agli AMICI, come per le condivisioni: senza questa condizione
-- chiunque conoscesse un id potrebbe recapitare quello che vuole a chiunque.
drop policy if exists "effimeri: mando io, e solo agli amici" on public.effimeri;
create policy "effimeri: mando io, e solo agli amici" on public.effimeri
  for insert with check (auth.uid() = da_id and public.sono_amico_di(a_id));

-- Chi riceve segna "aperto" e "consumato". Nessun altro.
drop policy if exists "effimeri: segno io che ricevo" on public.effimeri;
create policy "effimeri: segno io che ricevo" on public.effimeri
  for update using (auth.uid() = a_id) with check (auth.uid() = a_id);

drop policy if exists "effimeri: cancello da entrambi i lati" on public.effimeri;
create policy "effimeri: cancello da entrambi i lati" on public.effimeri
  for delete using (auth.uid() = da_id or auth.uid() = a_id);


-- Chi puo' scaricare un invio momentaneo: chi l'ha mandato e chi lo riceve,
-- finche' non e' stato guardato e non e' scaduto. E' qui che "momentaneo"
-- diventa vero: passata la scadenza, la risposta e' no.
create or replace function public.posso_vedere_effimero(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.effimeri e
     where e.percorso = percorso_file
       and (e.da_id = auth.uid() or e.a_id = auth.uid())
       and not e.consumato
       and e.scade_il > now()
  );
$$;

revoke all on function public.posso_vedere_effimero(text) from public, anon;
grant execute on function public.posso_vedere_effimero(text) to authenticated;


-- ⚠️ QUI C'ERA UNA FUNZIONE `pulisci_effimeri_scaduti()`, E NON POTEVA
-- FUNZIONARE. Cancellava i file con un `delete from storage.objects`, che
-- Supabase VIETA — anche a chi lancia il SQL Editor:
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--   Use the Storage API instead.
--   HINT: This prevents accidental data loss from orphaned objects.
--
-- E' una protezione giusta: cancellare la riga di `storage.objects` lascerebbe
-- il file vero dov'e', invisibile e irrecuperabile. Quindi i file si tolgono
-- SOLO dalla Storage API, cioe' dall'app (`lib/effimeri.js → pulisciScaduti`),
-- che gira a ogni accesso.
--
-- ⚠️ E L'ORDINE E' OBBLIGATO: prima il file, poi la riga. La regola qui sotto
-- che permette di cancellare un file va a cercare la sua riga in `effimeri`;
-- tolta la riga, quel file non lo puo' piu' cancellare nessuno, per sempre.
--
-- La scadenza resta vera comunque, anche se la pulizia non passa mai:
-- `posso_vedere_effimero()` guarda `scade_il` a ogni richiesta.
drop function if exists public.pulisci_effimeri_scaduti();


-- --- le regole sul bucket -------------------------------------------------
drop policy if exists "effimeri: leggo finche' si puo'" on storage.objects;
create policy "effimeri: leggo finche' si puo'" on storage.objects
  for select to authenticated
  using (bucket_id = 'effimeri' and public.posso_vedere_effimero(name));

drop policy if exists "effimeri: carico solo nella mia cartella" on storage.objects;
create policy "effimeri: carico solo nella mia cartella" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'effimeri' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ⚠️ Cancella anche chi RICEVE, e non e' una svista: e' il gesto che rende
-- l'invio momentaneo. Chi guarda chiude il visore e il file se ne va — se
-- potesse farlo solo il mittente, "sparisce appena l'hai vista" dipenderebbe
-- da lui che riapre l'app.
drop policy if exists "effimeri: cancella chi manda e chi guarda" on storage.objects;
create policy "effimeri: cancella chi manda e chi guarda" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'effimeri'
    and exists (
      select 1 from public.effimeri e
       where e.percorso = name and (e.da_id = auth.uid() or e.a_id = auth.uid())
    )
  );


-- ===========================================================================
-- IL NOME E' UNICO (dal 2026-09-18)
--
-- Fino a qui due persone potevano chiamarsi uguali ("a distinguervi e'
-- l'email"). Da quando si entra anche col nome (sezione sotto), il nome e'
-- un modo di dire CHI SEI, e due account con lo stesso nome renderebbero
-- l'accesso ambiguo. Uguale vuol dire uguale senza guardare maiuscole e spazi
-- ai lati: "Marco", "marco" e " Marco " sono lo stesso nome.
--
-- ⚠️ Se nel database ci sono GIA' due nomi uguali l'indice non si puo' creare:
-- il blocco qui sotto si ferma e dice quali sono, e tutto il file non passa.
-- E' voluto: rinominare qualcuno di nascosto non spetta a uno script. Si
-- sceglie chi rinominare, lo si dice a lui, e si rilancia:
--   update public.profili set nome = 'Marco R.' where id = '<id>';
-- (chi e' chi: select id, nome, creato_il from public.profili
--               where lower(trim(nome)) = 'marco';)
--
-- ⚠️ Il nome, dopo la registrazione, l'app non lo cambia: l'unico punto da
-- proteggere e' la nascita dell'account. Se il nome e' preso, l'inserimento
-- del profilo nel trigger `gestisci_nuovo_utente` fallisce e con lui TUTTA la
-- registrazione — non resta un account a meta', senza profilo.
-- ===========================================================================
do $$
declare
  doppi text;
begin
  select string_agg(format('"%s" (%s account)', esempio, quanti), ', ')
    into doppi
    from (
      select min(nome) as esempio, count(*) as quanti
        from public.profili
       group by lower(trim(nome))
      having count(*) > 1
    ) d;
  if doppi is not null then
    raise exception 'Nomi gia'' usati da piu'' account: %. Rinominane uno per nome (vedi il commento sopra) e rilancia.', doppi;
  end if;
end;
$$;

create unique index if not exists profili_nome_unico on public.profili (lower(trim(nome)));

-- Il nome e' libero? Serve alla registrazione, per dirlo PRIMA di provarci:
-- dopo, Supabase risponderebbe solo "Database error saving new user".
-- ⚠️ E' una porta per sapere se un nome ESATTO esiste. Con i nomi unici e'
-- inevitabile (lo direbbe comunque la registrazione rifiutata), ed e' la
-- stessa cosa che gia' permette `cerca_persona`: nome intero, niente pezzi.
create or replace function public.nome_disponibile(p_nome text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select trim(coalesce(p_nome, '')) <> ''
     and not exists (
       select 1 from public.profili p where lower(trim(p.nome)) = lower(trim(p_nome))
     );
$$;

revoke all on function public.nome_disponibile(text) from public;
grant execute on function public.nome_disponibile(text) to anon, authenticated;


-- ===========================================================================
-- ENTRARE COL NOME, OLTRE CHE CON L'EMAIL
--
-- Supabase fa entrare solo con l'email. Per entrare col nome serve sapere
-- QUALE email c'e' dietro quel nome — e darla a chiunque scriva un nome vuol
-- dire regalare l'indirizzo di chiunque compaia nell'app (lo Storico "Degli
-- altri" mostra i nomi). Quindi questa funzione l'email la restituisce SOLO
-- a chi ha gia' dato la password giusta di quel nome: cioe' a chi potrebbe
-- entrare comunque, e a nessun altro.
--
-- ⚠️ Il controllo della password qui NON passa dai limiti di Supabase Auth
-- sui tentativi: senza un limite proprio, sarebbe la porta per provare
-- password all'infinito. Dieci tentativi sbagliati per nome ogni quarto
-- d'ora, poi 'troppi'. Con l'email si entra comunque.
-- ===========================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tentativi_accesso (
  chiave   text not null,
  momento  timestamptz not null default now()
);
create index if not exists tentativi_accesso_idx on public.tentativi_accesso (chiave, momento);
-- Nessuna regola: dal browser non si legge e non si scrive. Ci scrive solo la
-- funzione qui sotto, che gira coi permessi di chi l'ha creata.
alter table public.tentativi_accesso enable row level security;

create or replace function public.email_per_accesso(p_nome text, p_password text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  k         text := lower(trim(coalesce(p_nome, '')));
  sbagliati int;
  trovata   text;
begin
  if k = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('esito', 'no');
  end if;

  delete from public.tentativi_accesso where momento < now() - interval '1 day';
  select count(*) into sbagliati
    from public.tentativi_accesso
   where chiave = k and momento > now() - interval '15 minutes';
  if sbagliati >= 10 then
    return jsonb_build_object('esito', 'troppi');
  end if;

  -- Al piu' una riga: il nome e' unico (indice `profili_nome_unico`).
  select u.email::text into trovata
    from public.profili p
    join auth.users u on u.id = p.id
   where lower(trim(p.nome)) = k
     and coalesce(u.encrypted_password, '') <> ''
     and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password);

  if trovata is null then
    insert into public.tentativi_accesso (chiave) values (k);
    return jsonb_build_object('esito', 'no');
  end if;
  return jsonb_build_object('esito', 'ok', 'email', trovata);
end;
$$;

revoke all on function public.email_per_accesso(text, text) from public;
grant execute on function public.email_per_accesso(text, text) to anon, authenticated;


-- ===========================================================================
-- IL DIARIO ALIMENTARE (2026-09-21)
--
-- Cosa si e' mangiato davvero, giorno per giorno. Stessa forma delle diete —
-- una riga, un documento JSON, RLS che dice "solo le mie" — con una differenza
-- che conta: **l'id E' LA DATA** ('2026-09-21'). Due righe per lo stesso giorno
-- non possono esistere, e due telefoni che scrivono lo stesso giorno finiscono
-- sulla stessa riga invece di sdoppiarla.
--
-- ⚠️ Vale anche qui la regola del resto del file: niente merge. Se si scrive
-- da due dispositivi nello stesso giorno, vince l'ultimo che arriva (src/lib/sync.js).
--
-- ⚠️ Finche' questo pezzo non viene lanciato, l'app NON si rompe: il diario
-- resta sul telefono (localStorage) e la lettura dal server fallisce in
-- silenzio, come per ogni collezione non raggiungibile. Quello che manca e' la
-- sincronizzazione fra dispositivi — cioe' il motivo per cui esiste il cloud.
-- ===========================================================================
create table if not exists public.diario (
  -- La DATA in formato 'YYYY-MM-DD'. Vedi sopra: non e' un id qualunque.
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  dati          jsonb not null,
  aggiornata_il timestamptz not null default now()
);
create index if not exists diario_user_idx on public.diario (user_id);

alter table public.diario enable row level security;

-- ⚠️ Il diario alimentare non si mostra a nessuno: non c'e' nessuna funzione
-- "diario_visibile" e non ci deve essere. Cosa uno mangia non e' un
-- allenamento da far vedere agli amici.
drop policy if exists "diario: solo il mio" on public.diario;
create policy "diario: solo il mio" on public.diario
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ===========================================================================
-- FOTO DEL CHECK FISICO (sezione "Foto")
--
-- Un'altra cosa dai media degli esercizi e dagli effimeri, e per questo un
-- bucket e una tabella a parte:
--   · i media degli esercizi stanno attaccati a una SCHEDA, e chi li vede lo
--     decide la visibilita' della scheda;
--   · gli effimeri SCADONO;
--   · queste RESTANO, sono di una persona e basta, e servono a guardare come
--     cambia il fisico nel tempo. Metterle insieme alle altre vorrebbe dire
--     una regola d'accesso che deve dire due frasi diverse, che e' esattamente
--     il modo in cui una foto finisce sotto gli occhi sbagliati.
--
-- LA CARTELLA E' L'ATLETA, non chi carica: `<atleta_id>/<id>`. Serve alla
-- sezione "Foto Atleti" del PT, che e' una cartella per atleta, e serve alla
-- regola di scrittura piu' sotto, per cui anche il PT puo' aggiungere uno
-- scatto nella cartella di un suo atleta (il check lo fa spesso lui, in
-- palestra, col suo telefono).
--
-- ⚠️ CHI CARICA NON E' CHI POSSIEDE. `caricato_da` dice chi ha premuto il
-- pulsante, `atleta_id` di chi e' il corpo nella foto. Comanda `atleta_id`:
-- l'atleta puo' cancellare e nascondere anche gli scatti fatti dal suo PT.
-- Il contrario no, ed e' voluto.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('progressi', 'progressi', false, 209715200)  -- 200MB, come `media`
on conflict (id) do update set public = false, file_size_limit = 209715200;

create table if not exists public.progressi (
  id          text primary key,
  -- Di chi e' il corpo nella foto: e' lui il padrone della riga.
  atleta_id   uuid not null references auth.users(id) on delete cascade,
  -- Chi l'ha caricata: l'atleta, o il suo PT.
  caricato_da uuid not null references auth.users(id) on delete cascade,
  percorso    text not null unique,
  tipo        text not null default 'foto' check (tipo in ('foto', 'video')),
  nome        text,
  peso        bigint,
  -- Il giorno del check. Separato da `creato_il` apposta: una foto di marzo
  -- caricata a maggio va messa a marzo, se no la sequenza non racconta niente.
  data        date not null default current_date,
  -- Due parole a mano: "78,4 kg", "fine massa". Facoltativa.
  nota        text not null default '',
  -- ⚠️ 'privata' = la vede solo l'atleta. 'pt' = la vede anche il suo personal
  -- trainer, nella sua sezione Foto Atleti. Nessun terzo valore: queste foto
  -- agli amici non ci vanno, e non c'e' modo di renderle pubbliche.
  -- ⚠️ DEFAULT 'privata', come ovunque nell'app: chi non sceglie non pubblica
  -- (vedi src/lib/visibilita.js). L'unica eccezione la fa il client, e la fa
  -- in chiaro: uno scatto caricato DAL PT nasce 'pt', perche' quella foto il
  -- PT ce l'ha gia' in mano — fingere di nascondergliela sarebbe teatro.
  visibilita  text not null default 'privata'
              check (visibilita in ('privata', 'pt')),
  creato_il   timestamptz not null default now()
);
create index if not exists progressi_atleta_idx on public.progressi (atleta_id, data desc);

alter table public.progressi enable row level security;

-- Chi e' il MIO personal trainer (il verso opposto di `e_mio_atleta`).
create or replace function public.e_mio_pt(altro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili where id = auth.uid() and pt_id = altro);
$$;

-- --- la riga ---------------------------------------------------------------
-- La legge l'atleta sempre, il PT solo se l'atleta ha aperto quello scatto.
drop policy if exists "progressi: i miei, e quelli che i miei atleti mi mostrano" on public.progressi;
create policy "progressi: i miei, e quelli che i miei atleti mi mostrano" on public.progressi
  for select using (
    atleta_id = auth.uid()
    or (visibilita = 'pt' and public.e_mio_atleta(atleta_id))
  );

-- Si carica per se' stessi, oppure per un proprio atleta. In nessun altro caso.
-- ⚠️ `caricato_da = auth.uid()` non e' una formalita': senza, si potrebbe
-- scrivere una riga a nome di un altro e la cronologia direbbe il falso.
drop policy if exists "progressi: per me, o per un mio atleta" on public.progressi;
create policy "progressi: per me, o per un mio atleta" on public.progressi
  for insert with check (
    caricato_da = auth.uid()
    and (atleta_id = auth.uid() or public.e_mio_atleta(atleta_id))
  );

-- La visibilita' la cambia SOLO l'atleta: e' la sua scelta, non quella del PT.
drop policy if exists "progressi: li governo io che ci sono dentro" on public.progressi;
create policy "progressi: li governo io che ci sono dentro" on public.progressi
  for update using (atleta_id = auth.uid()) with check (atleta_id = auth.uid());

-- Cancella l'atleta (sempre) e il PT (solo cio' che ha caricato lui, per
-- disfare uno scatto sbagliato appena fatto).
drop policy if exists "progressi: cancello i miei, il pt disfa i suoi" on public.progressi;
create policy "progressi: cancello i miei, il pt disfa i suoi" on public.progressi
  for delete using (
    atleta_id = auth.uid()
    or (caricato_da = auth.uid() and public.e_mio_atleta(atleta_id))
  );

-- --- il file ---------------------------------------------------------------
create or replace function public.posso_vedere_progresso(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.progressi p
     where p.percorso = percorso_file
       and (
         p.atleta_id = auth.uid()
         or (p.visibilita = 'pt' and public.e_mio_atleta(p.atleta_id))
       )
  );
$$;

revoke all on function public.posso_vedere_progresso(text) from public, anon;
grant execute on function public.posso_vedere_progresso(text) to authenticated;
revoke all on function public.e_mio_pt(uuid) from public, anon;
grant execute on function public.e_mio_pt(uuid) to authenticated;

-- ⚠️ Come per `media`: se queste danno "must be owner of table objects", si
-- fanno dalla dashboard (Storage -> progressi -> Policies) con le stesse
-- condizioni.
drop policy if exists "progressi: leggo cio' che ho diritto di vedere" on storage.objects;
create policy "progressi: leggo cio' che ho diritto di vedere" on storage.objects
  for select to authenticated
  using (bucket_id = 'progressi' and public.posso_vedere_progresso(name));

-- ⚠️ Qui la regola e' piu' larga di quella di `media`: la cartella non e' per
-- forza la propria, puo' essere quella di un proprio atleta. E' cio' che fa
-- funzionare il check fatto dal PT col suo telefono.
drop policy if exists "progressi: carico per me o per un mio atleta" on storage.objects;
create policy "progressi: carico per me o per un mio atleta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'progressi'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.e_mio_atleta(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "progressi: cancello dalla mia cartella o da quella di un mio atleta" on storage.objects;
create policy "progressi: cancello dalla mia cartella o da quella di un mio atleta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'progressi'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.e_mio_atleta(((storage.foldername(name))[1])::uuid)
    )
  );


-- ===========================================================================
-- FOTO DI UN ALLENAMENTO (quelle che si sfogliano nel Feed)
--
-- La quarta cosa fatta di file, e di nuovo un bucket a parte. Il motivo e'
-- sempre lo stesso: ognuna ha una regola d'accesso diversa, e regole diverse
-- nello stesso bucket sono il modo in cui una foto finisce dove non deve.
--   · `media`     -> allegati di un esercizio, li vede chi vede la scheda;
--   · `effimeri`  -> scadono;
--   · `progressi` -> il check del fisico, privato o aperto al proprio PT;
--   · `allenamenti` -> queste: lo scatto della giornata, che si pubblica
--     INSIEME all'allenamento e si sfoglia scorrendo la scheda di recap.
--
-- COME SI LEGA ALL'ALLENAMENTO. I completamenti non sono righe: stanno dentro
-- il json di `schede.dati`, quindi non c'e' una chiave esterna da mettere.
-- Si usa `allenamento_key`, cioe' '<scheda_id>|<data ISO>', che e' la stessa
-- coppia con cui l'app gia' riconosce un allenamento (vedi voceStorico in
-- src/lib/storico.js). ⚠️ La data e' la STRINGA esatta salvata nel json: non si
-- converte in timestamp, perche' un giro di conversione e mezzo fuso orario
-- basterebbero a non ritrovare piu' le foto.
--
-- ⚠️ LA VISIBILITA' E' SUA, non ereditata dall'allenamento. Sarebbe piu' bello
-- dire "la vede chi vede l'allenamento", ma la visibilita' di un allenamento
-- sta dentro un json e una regola di sicurezza non ci puo' guardare dentro in
-- modo affidabile. Quindi la foto se la porta scritta addosso, e l'app tiene
-- allineate le due cose quando si pubblica. Nel dubbio comanda questa riga, e
-- il default e' 'privata' come ovunque.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('allenamenti', 'allenamenti', false, 209715200)  -- 200MB, come gli altri
on conflict (id) do update set public = false, file_size_limit = 209715200;

create table if not exists public.allenamento_foto (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- '<scheda_id>|<data ISO>'. Vuota la parte scheda per gli allenamenti
  -- aggiunti a mano, che una scheda non ce l'hanno.
  allenamento_key text not null,
  percorso        text not null unique,
  tipo            text not null default 'foto' check (tipo in ('foto', 'video')),
  nome            text,
  peso            bigint,
  -- L'ordine in cui si sfogliano scorrendo la scheda di recap.
  posizione       int not null default 0,
  visibilita      text not null default 'privata'
                  check (visibilita in ('privata', 'pubblica')),
  creato_il       timestamptz not null default now()
);
create index if not exists allenamento_foto_key_idx
  on public.allenamento_foto (user_id, allenamento_key, posizione);
-- Il Feed chiede le foto di TANTI allenamenti in un colpo solo: senza questo
-- diventa una scansione di tutta la tabella a ogni scorrimento.
create index if not exists allenamento_foto_pubbliche_idx
  on public.allenamento_foto (allenamento_key) where visibilita = 'pubblica';

alter table public.allenamento_foto enable row level security;

-- Le proprie sempre; quelle degli altri solo se pubblicate, e non nascoste
-- in attesa di un moderatore (MODERAZIONE: tre segnalazioni).
drop policy if exists "foto allenamento: le mie, e quelle pubblicate" on public.allenamento_foto;
create policy "foto allenamento: le mie, e quelle pubblicate" on public.allenamento_foto
  for select using (
    user_id = auth.uid()
    or (visibilita = 'pubblica' and not public.in_attesa('foto', id))
  );

-- Si scrive solo nella propria cronologia. Non esiste il caso "carico per un
-- altro": un allenamento e' di chi l'ha fatto.
-- Con la pubblicazione bloccata (MODERAZIONE) le foto si caricano ancora, ma
-- solo private.
drop policy if exists "foto allenamento: scrivo solo le mie" on public.allenamento_foto;
create policy "foto allenamento: scrivo solo le mie" on public.allenamento_foto
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (visibilita = 'privata' or not public.pubblicazione_bloccata(auth.uid()))
  );

create or replace function public.posso_vedere_foto_allenamento(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.allenamento_foto f
     where f.percorso = percorso_file
       and (f.user_id = auth.uid()
            or (f.visibilita = 'pubblica' and not public.in_attesa('foto', f.id))
            -- Il moderatore vede quello che deve giudicare.
            or (public.sono_moderatore()
                and exists (select 1 from public.segnalazioni s
                             where s.tipo = 'foto' and s.oggetto = f.id)))
  );
$$;

revoke all on function public.posso_vedere_foto_allenamento(text) from public, anon;
grant execute on function public.posso_vedere_foto_allenamento(text) to authenticated;

-- ⚠️ Come per gli altri bucket: se queste danno "must be owner of table
-- objects", si fanno dalla dashboard (Storage -> allenamenti -> Policies).
-- ⚠️ E come per gli altri: NESSUNA policy di UPDATE, di proposito. Senza, il
-- caricamento va fatto senza `upsert` — vedi `caricaFile()` in src/lib/media.js,
-- dove c'e' scritto perche' aggiungerla sarebbe peggio del male.
drop policy if exists "foto allenamento: leggo cio' che ho diritto di vedere" on storage.objects;
create policy "foto allenamento: leggo cio' che ho diritto di vedere" on storage.objects
  for select to authenticated
  using (bucket_id = 'allenamenti' and public.posso_vedere_foto_allenamento(name));

drop policy if exists "foto allenamento: carico solo nella mia cartella" on storage.objects;
create policy "foto allenamento: carico solo nella mia cartella" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'allenamenti' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "foto allenamento: cancello solo le mie" on storage.objects;
create policy "foto allenamento: cancello solo le mie" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'allenamenti' and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ===========================================================================
-- MI PIACE E COMMENTI sugli allenamenti del Feed
--
-- Il Feed è fatto di recap: chi li vede può mettere mi piace e commentare, e
-- in un commento può allegare una foto. Come per le foto dell'allenamento,
-- un allenamento si riconosce con `allenamento_key` = '<scheda_id>|<data ISO>'
-- (la data è la STRINGA esatta del json, vedi `allenamento_foto`).
--
-- ⚠️ CHI PUÒ: chi può VEDERE l'allenamento, né più né meno. Qui non basta una
-- colonna "visibilita" sulla riga come per le foto, perché il mi piace e il
-- commento sono di un ALTRO: la visibilità che conta è quella
-- dell'allenamento, e sta nel json della scheda. `posso_vedere_allenamento`
-- la va a leggere lì, con la stessa frase di `allenamenti_visibili` — e le due
-- devono restare uguali.
--
-- ⚠️ I NOMI. Chi mette mi piace a un allenamento pubblico può essere uno che
-- con te non ha nessun legame e niente di pubblico: `nomi_di` il suo nome non
-- lo darebbe. Ma un mi piace o un commento sono gesti fatti in pubblico, sotto
-- quell'allenamento, e chi lo guarda deve poter vedere chi è stato — come in
-- qualunque feed. Per questo i nomi arrivano da funzioni apposta
-- (`mi_piace_di`, `commenti_di`), e SOLO per gli allenamenti che chi chiede
-- può vedere.
-- ===========================================================================

-- Chi può vedere questo allenamento: io se è mio, tutti se è pubblico, il mio
-- PT se è "solo PT". ⚠️ Stessa frase di `allenamenti_visibili`, campo assente
-- = nascosto.
create or replace function public.posso_vedere_allenamento(chiave text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.schede s
      cross join lateral jsonb_array_elements(
                   coalesce(s.dati -> 'completamenti', '[]'::jsonb)) as fatto(c)
     where s.id = split_part(chiave, '|', 1)
       and fatto.c ->> 'data' = substr(chiave, strpos(chiave, '|') + 1)
       and (
         s.user_id = auth.uid()
         or coalesce(nullif(fatto.c ->> 'visibilita', ''), 'nascosta') = 'pubblica'
         or (fatto.c ->> 'visibilita' = 'solo-pt' and public.e_mio_atleta(s.user_id))
       )
  );
$$;

revoke all on function public.posso_vedere_allenamento(text) from public, anon;
grant execute on function public.posso_vedere_allenamento(text) to authenticated;

-- Di chi è questo allenamento: chi l'ha fatto può togliere i commenti sotto il
-- suo allenamento, anche quelli scritti da altri.
create or replace function public.proprietario_allenamento(chiave text)
returns uuid
language sql stable security definer set search_path = public as $$
  select s.user_id from public.schede s where s.id = split_part(chiave, '|', 1);
$$;

revoke all on function public.proprietario_allenamento(text) from public, anon;
grant execute on function public.proprietario_allenamento(text) to authenticated;

-- --- i mi piace -------------------------------------------------------------
create table if not exists public.allenamento_mi_piace (
  allenamento_key text not null,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creato_il       timestamptz not null default now(),
  -- Uno per persona per allenamento: premere due volte non ne fa due.
  primary key (allenamento_key, user_id)
);

alter table public.allenamento_mi_piace enable row level security;

drop policy if exists "mi piace: li vede chi vede l'allenamento" on public.allenamento_mi_piace;
create policy "mi piace: li vede chi vede l'allenamento" on public.allenamento_mi_piace
  for select using (public.posso_vedere_allenamento(allenamento_key));

drop policy if exists "mi piace: lo metto io, dove posso guardare" on public.allenamento_mi_piace;
create policy "mi piace: lo metto io, dove posso guardare" on public.allenamento_mi_piace
  for insert with check (user_id = auth.uid() and public.posso_vedere_allenamento(allenamento_key));

drop policy if exists "mi piace: tolgo il mio" on public.allenamento_mi_piace;
create policy "mi piace: tolgo il mio" on public.allenamento_mi_piace
  for delete using (user_id = auth.uid());

-- --- i commenti -------------------------------------------------------------
create table if not exists public.allenamento_commenti (
  id              text primary key,
  allenamento_key text not null,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  testo           text not null default '' check (length(testo) <= 2000),
  -- La foto allegata: il percorso nel bucket `commenti`. null = solo testo.
  foto            text unique,
  creato_il       timestamptz not null default now(),
  -- Un commento vuoto non è un commento: o c'è il testo o c'è la foto.
  constraint commento_non_vuoto check (length(trim(testo)) > 0 or foto is not null)
);
create index if not exists allenamento_commenti_key_idx
  on public.allenamento_commenti (allenamento_key, creato_il);

alter table public.allenamento_commenti enable row level security;

drop policy if exists "commenti: li legge chi vede l'allenamento" on public.allenamento_commenti;
create policy "commenti: li legge chi vede l'allenamento" on public.allenamento_commenti
  for select using (public.posso_vedere_allenamento(allenamento_key));

drop policy if exists "commenti: scrivo io, dove posso guardare" on public.allenamento_commenti;
create policy "commenti: scrivo io, dove posso guardare" on public.allenamento_commenti
  for insert with check (
    user_id = auth.uid()
    and public.posso_vedere_allenamento(allenamento_key)
    -- MODERAZIONE: con la pubblicazione bloccata non si commenta.
    and not public.pubblicazione_bloccata(auth.uid())
  );

-- Lo toglie chi l'ha scritto, o chi ha fatto l'allenamento. Non si modifica:
-- un commento riscritto dopo le risposte cambierebbe il senso di quelle.
drop policy if exists "commenti: tolgo i miei, e quelli sotto i miei allenamenti" on public.allenamento_commenti;
create policy "commenti: tolgo i miei, e quelli sotto i miei allenamenti" on public.allenamento_commenti
  for delete using (
    user_id = auth.uid() or public.proprietario_allenamento(allenamento_key) = auth.uid()
  );

-- --- le foto dei commenti ---------------------------------------------------
-- Un bucket a parte: la regola che le lascia scaricare non è quella delle foto
-- dell'allenamento (lì comanda la riga della foto, qui il commento e
-- l'allenamento sotto cui sta). 20MB: sono foto, e l'app le rimpicciolisce
-- prima di mandarle.
insert into storage.buckets (id, name, public, file_size_limit)
values ('commenti', 'commenti', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

create or replace function public.posso_vedere_foto_commento(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allenamento_commenti c
     where c.foto = percorso_file
       and ((public.posso_vedere_allenamento(c.allenamento_key)
             and (c.user_id = auth.uid() or not public.in_attesa('commento', c.id)))
            -- Il moderatore vede la foto di un commento segnalato, anche sotto
            -- un allenamento che da solo non potrebbe guardare.
            or (public.sono_moderatore()
                and exists (select 1 from public.segnalazioni s
                             where s.tipo = 'commento' and s.oggetto = c.id)))
  );
$$;

revoke all on function public.posso_vedere_foto_commento(text) from public, anon;
grant execute on function public.posso_vedere_foto_commento(text) to authenticated;

-- ⚠️ Chi ha fatto l'allenamento può togliere un commento altrui, foto
-- compresa: il file sta nella cartella di chi l'ha scritto, quindi la regola
-- della cartella da sola non basterebbe, e la foto resterebbe lì per sempre.
create or replace function public.posso_cancellare_foto_commento(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allenamento_commenti c
     where c.foto = percorso_file
       and (c.user_id = auth.uid()
            or public.proprietario_allenamento(c.allenamento_key) = auth.uid())
  );
$$;

revoke all on function public.posso_cancellare_foto_commento(text) from public, anon;
grant execute on function public.posso_cancellare_foto_commento(text) to authenticated;

-- ⚠️ Come per gli altri bucket: NESSUNA policy di UPDATE (vedi `caricaFile()`
-- in src/lib/media.js), e l'ordine è obbligato — il file si carica PRIMA della
-- riga e si cancella PRIMA della riga: la regola che lo lascia leggere o
-- cancellare va a cercare il commento.
drop policy if exists "foto commenti: leggo cio' che posso vedere" on storage.objects;
create policy "foto commenti: leggo cio' che posso vedere" on storage.objects
  for select to authenticated
  using (bucket_id = 'commenti' and public.posso_vedere_foto_commento(name));

drop policy if exists "foto commenti: carico solo nella mia cartella" on storage.objects;
create policy "foto commenti: carico solo nella mia cartella" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'commenti' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "foto commenti: cancello le mie, e sotto i miei allenamenti" on storage.objects;
create policy "foto commenti: cancello le mie, e sotto i miei allenamenti" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'commenti'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.posso_cancellare_foto_commento(name))
  );

-- --- cosa legge il Feed -----------------------------------------------------
-- Per ogni allenamento del Feed, in un colpo solo: quanti mi piace, se c'è il
-- mio, quanti commenti e l'ultimo (chi e cosa), da mostrare sotto il recap.
-- Gli allenamenti che chi chiede non può vedere non tornano proprio.
create or replace function public.interazioni_allenamenti(chiavi text[])
returns table (
  allenamento_key text,
  mi_piace        bigint,
  mio             boolean,
  commenti        bigint,
  ultimo_nome     text,
  ultimo_testo    text,
  ultimo_foto     boolean
)
language sql stable security definer set search_path = public as $$
  select k.chiave,
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = k.chiave),
         exists (select 1 from public.allenamento_mi_piace m
                  where m.allenamento_key = k.chiave and m.user_id = auth.uid()),
         -- MODERAZIONE: non contano i commenti che ho segnalato io, né quelli
         -- nascosti in attesa di un moderatore (se non sono miei).
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = k.chiave
             and not exists (select 1 from public.segnalazioni s
                              where s.tipo = 'commento' and s.oggetto = c.id
                                and s.segnalato_da = auth.uid())
             and (c.user_id = auth.uid() or not public.in_attesa('commento', c.id))),
         u.nome,
         u.testo,
         u.foto is not null
    from unnest(chiavi) as k(chiave)
    left join lateral (
      select p.nome, c.testo, c.foto
        from public.allenamento_commenti c
        join public.profili p on p.id = c.user_id
       where c.allenamento_key = k.chiave
         and not exists (select 1 from public.segnalazioni s
                          where s.tipo = 'commento' and s.oggetto = c.id
                            and s.segnalato_da = auth.uid())
         and (c.user_id = auth.uid() or not public.in_attesa('commento', c.id))
       order by c.creato_il desc
       limit 1
    ) u on true
   where public.posso_vedere_allenamento(k.chiave);
$$;

revoke all on function public.interazioni_allenamenti(text[]) from public, anon;
grant execute on function public.interazioni_allenamenti(text[]) to authenticated;

-- Chi ha messo mi piace, col nome (vedi in testa: i nomi da qui e non da
-- `nomi_di`).
create or replace function public.mi_piace_di(chiave text)
returns table (user_id uuid, nome text, creato_il timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.nome, m.creato_il
    from public.allenamento_mi_piace m
    join public.profili p on p.id = m.user_id
   where m.allenamento_key = chiave
     and public.posso_vedere_allenamento(chiave)
   order by m.creato_il desc;
$$;

revoke all on function public.mi_piace_di(text) from public, anon;
grant execute on function public.mi_piace_di(text) to authenticated;

-- I commenti di un allenamento, dal più vecchio (si leggono come una chat).
create or replace function public.commenti_di(chiave text)
returns table (id text, user_id uuid, nome text, testo text, foto text, creato_il timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, p.nome, c.testo, c.foto, c.creato_il
    from public.allenamento_commenti c
    join public.profili p on p.id = c.user_id
   where c.allenamento_key = chiave
     and public.posso_vedere_allenamento(chiave)
     -- MODERAZIONE: tre segnalazioni lo nascondono, tranne a chi l'ha scritto.
     and (c.user_id = auth.uid() or public.sono_moderatore()
          or not public.in_attesa('commento', c.id))
   order by c.creato_il asc;
$$;

revoke all on function public.commenti_di(text) from public, anon;
grant execute on function public.commenti_di(text) to authenticated;

-- Un allenamento che cambia data cambia chiave (vedi `spostaFotoAllenamento`
-- in src/lib/fotoAllenamento.js): mi piace e commenti devono seguirlo. Sono
-- righe di ALTRI, che chi ha fatto l'allenamento non può toccare con le regole
-- normali — per questo una funzione, che lo lascia fare solo a lui.
create or replace function public.sposta_interazioni(vecchia text, nuova text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.proprietario_allenamento(vecchia) is distinct from auth.uid()
     or public.proprietario_allenamento(nuova) is distinct from auth.uid() then
    raise exception 'Solo chi ha fatto l''allenamento puo'' spostarlo';
  end if;
  update public.allenamento_mi_piace set allenamento_key = nuova where allenamento_key = vecchia;
  update public.allenamento_commenti set allenamento_key = nuova where allenamento_key = vecchia;
end;
$$;

revoke all on function public.sposta_interazioni(text, text) from public, anon;
grant execute on function public.sposta_interazioni(text, text) to authenticated;


-- ===========================================================================
-- USERNAME, e la ricerca per pezzi che senza non si poteva fare
--
-- Fino a oggi si trovava una persona solo col nome ESATTO o con un codice, e
-- `cerca_persona` rifiutava apposta la corrispondenza parziale: col nome a
-- pezzi chiunque poteva ricavarsi l'elenco completo degli iscritti provando le
-- lettere. Quella ragione non e' sparita — e' l'username che cambia le carte.
--
-- ⚠️ PERCHE' SULL'USERNAME SI PUO' E SUL NOME NO. Un username e' una maniglia
-- pubblica: uno se lo sceglie sapendo che serve a farsi trovare, e puo'
-- cambiarlo. Il nome no: e' come ti chiami, non l'hai scelto per stare in un
-- elenco. Cercare per pezzi di username espone una cosa fatta per essere
-- esposta; cercare per pezzi di nome esporrebbe le persone.
-- Quindi: username a pezzi, nome solo esatto, codici solo esatti.
-- ===========================================================================
alter table public.profili add column if not exists username text;

-- Minuscole, lettere numeri e underscore, da 3 a 20. ⚠️ Niente maiuscole: due
-- username che si distinguono solo per il maiuscolo sono due modi di scrivere
-- la stessa cosa, ed e' cosi' che si fanno passare le imitazioni.
alter table public.profili drop constraint if exists profili_username_forma;
alter table public.profili add constraint profili_username_forma
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profili_username_unico on public.profili (username);

-- Un username libero a partire dal nome. Stessa idea di `genera_codice`.
create or replace function public.genera_username(base text)
returns text language plpgsql as $$
declare
  pulito text;
  tentativo text;
  i int;
begin
  pulito := lower(regexp_replace(coalesce(base, ''), '[^a-zA-Z0-9]', '', 'g'));
  pulito := substr(pulito, 1, 15);
  -- Un nome fatto di soli simboli, o troppo corto, lascerebbe un username che
  -- non rispetta la forma: meglio una base brutta che un profilo senza.
  if length(pulito) < 3 then
    pulito := 'utente';
  end if;
  if not exists (select 1 from public.profili where username = pulito) then
    return pulito;
  end if;
  for i in 1..60 loop
    tentativo := pulito || floor(random() * 10000)::int::text;
    tentativo := substr(tentativo, 1, 20);
    if not exists (select 1 from public.profili where username = tentativo) then
      return tentativo;
    end if;
  end loop;
  return substr(pulito || md5(random()::text), 1, 20);
end;
$$;

-- Chi c'era prima di questa colonna se lo prende adesso, dal proprio nome.
update public.profili
   set username = public.genera_username(nome)
 where username is null;

-- Da qui in poi lo prende chiunque si iscriva. ⚠️ E' la stessa funzione del
-- profilo: si riscrive intera perche' `create or replace` non sa aggiungere un
-- campo, e l'unica differenza rispetto a prima e' `username`.
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
  insert into public.profili (id, nome, ruolo, codice_pt, codice_amico, username, dati)
  values (
    new.id,
    n,
    coalesce(nullif(new.raw_user_meta_data ->> 'ruolo', ''), 'atleta'),
    nullif(new.raw_user_meta_data ->> 'codice_pt', ''),
    public.genera_codice(n),
    public.genera_username(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), n)),
    coalesce(new.raw_user_meta_data -> 'dati', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Adesso che ce l'hanno tutti e che il trigger lo mette sempre, l'invariante si
-- scrive: un profilo senza username non si puo' cercare, cioe' non esiste per
-- meta' dell'app. ⚠️ Se questo `set not null` fallisce vuol dire che qualche
-- riga e' rimasta senza: e' un controllo, non una formalita'.
alter table public.profili alter column username set not null;

-- --- e' libero? ------------------------------------------------------------
-- Serve a dirlo mentre uno scrive, invece di far scoprire il doppione dopo il
-- salvataggio. ⚠️ `security definer` perche' deve poter guardare TUTTI i
-- profili, non solo quelli che chi chiede ha diritto di leggere — ma torna un
-- si'/no e nient'altro, quindi non svela di chi sia.
create or replace function public.username_disponibile(p_username text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_username, '') ~ '^[a-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profili
        where username = p_username and id <> auth.uid()
     );
$$;

revoke all on function public.username_disponibile(text) from public, anon;
grant execute on function public.username_disponibile(text) to authenticated;

-- --- la ricerca ------------------------------------------------------------
-- Sostituisce `cerca_persona` (che resta, la usa ancora la pagina Amici).
-- Username a PEZZI, nome e codici solo esatti: vedi il perche' in testa.
create or replace function public.cerca_utenti(chiave text)
returns table (id uuid, nome text, username text, come text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.username,
         case
           when upper(trim(chiave)) in (p.codice_amico, p.codice_pt) then 'codice'
           when lower(trim(chiave)) = lower(p.nome) then 'nome'
           else 'username'
         end
    from public.profili p
   where p.id <> auth.uid()
     and length(trim(chiave)) >= 2
     and (
       -- l'unico pezzo per pezzi
       p.username like '%' || lower(trim(regexp_replace(chiave, '^@', ''))) || '%'
       or upper(trim(chiave)) = p.codice_amico
       or upper(trim(chiave)) = p.codice_pt
       or lower(trim(chiave)) = lower(p.nome)
     )
   -- Chi comincia con quello che hai scritto viene prima: cercando "fil" si
   -- vuole "filippo", non "ilfilosofo".
   order by (p.username like lower(trim(regexp_replace(chiave, '^@', ''))) || '%') desc,
            length(p.username), p.username
   limit 20;
$$;

revoke all on function public.cerca_utenti(text) from public, anon;
grant execute on function public.cerca_utenti(text) to authenticated;


-- ===========================================================================
-- CHAT fra amici
--
-- Solo TESTO. Le foto e i video fra amici ci sono gia' e sono un'altra cosa:
-- gli effimeri (`lib/effimeri`), che scadono dopo 24 ore. Rimetterli anche qui
-- vorrebbe dire due modi di mandare la stessa foto con due regole diverse su
-- quanto resta — cioe' la premessa perfetta per mandarla credendo che sparisca.
--
-- ⚠️ SI SCRIVE SOLO AGLI AMICI, e lo dice il database (`sono_amico_di`), non
-- l'app. E' la stessa regola delle condivisioni: senza, l'username che abbiamo
-- appena reso cercabile a pezzi diventerebbe un modo per scrivere a chiunque.
-- ===========================================================================
create table if not exists public.messaggi (
  id        text primary key,
  da_id     uuid not null references auth.users(id) on delete cascade,
  a_id      uuid not null references auth.users(id) on delete cascade,
  testo     text not null check (length(trim(testo)) between 1 and 4000),
  creato_il timestamptz not null default now(),
  letto_il  timestamptz,
  -- La coppia, sempre nello stesso ordine a prescindere da chi scrive: e' cio'
  -- che rende una conversazione una riga sola da cercare invece di due
  -- condizioni in OR su ogni lettura.
  coppia    text generated always as (
    case when da_id < a_id
         then da_id::text || '|' || a_id::text
         else a_id::text || '|' || da_id::text end
  ) stored,
  constraint messaggi_non_a_se_stessi check (da_id <> a_id)
);
create index if not exists messaggi_coppia_idx on public.messaggi (coppia, creato_il desc);
-- I non letti che arrivano a me: e' il conto del pallino sulla linguetta, e si
-- chiede a ogni apertura.
create index if not exists messaggi_non_letti_idx
  on public.messaggi (a_id) where letto_il is null;

alter table public.messaggi enable row level security;

-- Si legge solo quello che si e' scritto o ricevuto.
drop policy if exists "messaggi: miei o a me" on public.messaggi;
create policy "messaggi: miei o a me" on public.messaggi
  for select using (da_id = auth.uid() or a_id = auth.uid());

-- Si scrive a nome proprio, e solo a un amico.
drop policy if exists "messaggi: scrivo io, e solo agli amici" on public.messaggi;
create policy "messaggi: scrivo io, e solo agli amici" on public.messaggi
  for insert with check (
    da_id = auth.uid() and public.sono_amico_di(a_id)
    -- MODERAZIONE: l'account bloccato non scrive.
    and not public.account_bloccato(auth.uid())
  );

-- ⚠️ L'aggiornamento serve a UNA cosa sola: segnare letto cio' che e' arrivato
-- a me. La regola non sa distinguere quale colonna si tocca, quindi chi riceve
-- potrebbe in teoria riscrivere il testo di un messaggio nella sua casella.
-- Resta comunque impossibile cambiare da chi viene o a chi va, e soprattutto
-- non si puo' toccare niente di quello che si e' MANDATO: chi scrive non puo'
-- riscrivere la storia di una conversazione altrui.
drop policy if exists "messaggi: segno letto io che ricevo" on public.messaggi;
create policy "messaggi: segno letto io che ricevo" on public.messaggi
  for update using (a_id = auth.uid()) with check (a_id = auth.uid());

-- Ognuno cancella cio' che ha scritto. ⚠️ Cancellare toglie il messaggio a
-- TUTTI E DUE: e' la stessa scelta delle condivisioni, e va detta nell'app —
-- "elimina" che lascia la copia all'altro sarebbe una bugia.
drop policy if exists "messaggi: cancello quelli che ho scritto" on public.messaggi;
create policy "messaggi: cancello quelli che ho scritto" on public.messaggi
  for delete using (da_id = auth.uid());

-- --- "cancella solo per me" ------------------------------------------------
-- Il messaggio resta, e all'altro resta: io smetto di vederlo. Una riga per
-- ogni messaggio che ho tolto dalla MIA conversazione.
-- ⚠️ Una tabella a parte e non una colonna su `messaggi`: sui messaggi chi
-- scrive non ha diritto di aggiornamento (non deve poter riscrivere la storia),
-- e dargliene uno per una colonna vorrebbe dire darglielo per tutte.
-- `coppia` e' ripetuta qui per leggere i nascosti di UNA conversazione senza
-- scaricarli tutti; la regola di scrittura la vuole uguale a quella del
-- messaggio.
create table if not exists public.messaggi_nascosti (
  utente_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  messaggio_id text not null references public.messaggi(id) on delete cascade,
  coppia       text not null,
  nascosto_il  timestamptz not null default now(),
  primary key (utente_id, messaggio_id)
);
create index if not exists messaggi_nascosti_coppia_idx
  on public.messaggi_nascosti (utente_id, coppia);

alter table public.messaggi_nascosti enable row level security;

drop policy if exists "messaggi_nascosti: i miei" on public.messaggi_nascosti;
create policy "messaggi_nascosti: i miei" on public.messaggi_nascosti
  for select using (utente_id = auth.uid());

-- Si nasconde solo un messaggio della propria conversazione.
drop policy if exists "messaggi_nascosti: nascondo i miei" on public.messaggi_nascosti;
create policy "messaggi_nascosti: nascondo i miei" on public.messaggi_nascosti
  for insert with check (
    utente_id = auth.uid()
    and exists (
      select 1 from public.messaggi m
       where m.id = messaggio_id
         and m.coppia = messaggi_nascosti.coppia
         and (m.da_id = auth.uid() or m.a_id = auth.uid())
    )
  );

-- Il tempo reale: senza questo la chat va lo stesso, ma i messaggi arrivano
-- solo riaprendo la schermata.
do $$
begin
  alter publication supabase_realtime add table public.messaggi;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- --- l'ultimo messaggio per ogni conversazione -----------------------------
-- L'elenco delle chat vuole, per ogni amico, l'ultima riga e quanti non letti.
-- Farlo nell'app vorrebbe dire scaricare TUTTI i messaggi per mostrarne uno.
create or replace function public.conversazioni()
returns table (
  altro_id  uuid,
  testo     text,
  creato_il timestamptz,
  da_me     boolean,
  non_letti bigint
)
language sql stable security definer set search_path = public as $$
  with miei as (
    select m.*,
           case when m.da_id = auth.uid() then m.a_id else m.da_id end as altro
      from public.messaggi m
     where (m.da_id = auth.uid() or m.a_id = auth.uid())
       -- Quelli cancellati "solo per me" non sono l'ultimo messaggio e non
       -- contano fra i non letti.
       and not exists (
         select 1 from public.messaggi_nascosti n
          where n.utente_id = auth.uid() and n.messaggio_id = m.id
       )
  ),
  ultimo as (
    select distinct on (altro) altro, testo, creato_il, da_id
      from miei
     order by altro, creato_il desc
  )
  select u.altro,
         u.testo,
         u.creato_il,
         u.da_id = auth.uid(),
         (select count(*) from miei m
           where m.altro = u.altro and m.a_id = auth.uid() and m.letto_il is null)
    from ultimo u
   order by u.creato_il desc;
$$;

revoke all on function public.conversazioni() from public, anon;
grant execute on function public.conversazioni() to authenticated;

-- Quanti messaggi non letti in tutto: il pallino sulla linguetta Amici.
create or replace function public.messaggi_non_letti()
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.messaggi m
   where m.a_id = auth.uid() and m.letto_il is null
     and not exists (
       select 1 from public.messaggi_nascosti n
        where n.utente_id = auth.uid() and n.messaggio_id = m.id
     );
$$;

revoke all on function public.messaggi_non_letti() from public, anon;
grant execute on function public.messaggi_non_letti() to authenticated;


-- ===========================================================================
-- I DATI FISICI LI VEDONO SOLO IL TITOLARE E IL SUO PERSONAL TRAINER
--
-- ⚠️ Il buco che chiude. La regola "profilo: il mio e quelli legati a me" dava
-- a chiunque avesse un legame la riga INTERA di `profili`, e quindi anche
-- `dati`: sesso, eta', peso, altezza, obiettivo, livello — dati sulla salute
-- (art. 9 GDPR). L'app non li mostrava, ma bastava chiederli all'API. E il
-- "legame" di `ho_relazione_con` comprende anche le richieste IN ATTESA: chi
-- ti mandava una richiesta d'amicizia leggeva il tuo peso prima ancora che tu
-- rispondessi.
--
-- La strada e' quella gia' scritta all'inizio della tappa 2 ("come si legge
-- un profilo altrui"): non una policy larga, ma una funzione che decide righe
-- E colonne. `profili_collegati` torna le stesse persone di prima; le colonne
-- private sono piene solo per il mio profilo e per quelli dei miei atleti, per
-- tutti gli altri restano vuote. Agli amici arrivano nome, username, ruolo,
-- codice PT (che di un PT e' pubblico per costruzione) e `pt_id` (serve a
-- contare gli altri atleti dello stesso PT).
-- ===========================================================================
create or replace function public.profili_collegati()
returns table (
  id           uuid,
  nome         text,
  username     text,
  ruolo        text,
  codice_pt    text,
  pt_id        uuid,
  codice_amico text,
  associato_il timestamptz,
  creato_il    timestamptz,
  dati         jsonb
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.username, p.ruolo, p.codice_pt, p.pt_id,
         case when v.pieno then p.codice_amico end,
         case when v.pieno then p.associato_il end,
         case when v.pieno then p.creato_il end,
         case when v.pieno then p.dati else '{}'::jsonb end
    from public.profili p
   cross join lateral (
     -- Pieno = il mio profilo, o quello di un mio atleta. `pt_id` sta sulla
     -- riga dell'atleta e la scrive solo lui (o `accetta_relazione` per conto
     -- del PT): nessuno puo' farsi PT di un altro da solo.
     select p.id = auth.uid() or p.pt_id = auth.uid() as pieno
   ) v
   where p.id = auth.uid() or public.ho_relazione_con(p.id);
$$;

revoke all on function public.profili_collegati() from public, anon;
grant execute on function public.profili_collegati() to authenticated;

-- --- profili: il mio e quelli dei miei atleti ------------------------------
-- ⚠️ SENZA QUESTA REGOLA LA FUNZIONE SOPRA NON SERVE A NIENTE: finche' la
-- policy lascia leggere le righe intere, i dati fisici si chiedono a `profili`
-- direttamente e la funzione e' solo una strada in piu'.
-- Restano il proprio profilo (lo legge AccountContext al login) e, per un PT,
-- quelli dei suoi atleti, che i dati fisici li darebbero comunque a lui.
--
-- ⚠️ ORDINE, perche' il database e' uno solo e l'app online lo usa adesso:
--   1. la funzione `profili_collegati` qui sopra si lancia quando si vuole;
--   2. poi il client che la usa (lib/social.js) va su main, cioe' online;
--   3. SOLO DOPO questa regola. Lanciata prima, l'app online — che legge
--      ancora `profili` direttamente — smetterebbe di vedere amici e PT.
-- Vale anche per chi lavora su un altro branch: prima di questa regola deve
-- aver fatto merge di main, se no in locale amici e PT spariscono.
-- Due drop: sostituisce "profilo: il mio e quelli legati a me" (vedi la regola
-- in cima al file).
drop policy if exists "profilo: il mio e quelli legati a me" on public.profili;
drop policy if exists "profilo: il mio e quelli dei miei atleti" on public.profili;
create policy "profilo: il mio e quelli dei miei atleti" on public.profili
  for select using (auth.uid() = id or public.e_mio_atleta(id));


-- ===========================================================================
-- UN LEGAME NASCE SOLO SE L'ALTRO HA DETTO DI SI'
--
-- ⚠️ Tre buchi della stessa famiglia: risultare legati a qualcuno che non lo
-- ha mai accettato. Le regole sopra dicono CHI puo' scrivere una riga, non
-- COSA puo' scriverci, e qui il "cosa" era tutto:
--   1. `pt_id` sta sulla riga dell'atleta, e "profilo: modifico il mio" lascia
--      scrivere qualunque colonna. Un utente poteva mettersi come PT chiunque:
--      comparire tra i suoi atleti, vedersi suggerire gli altri suoi atleti
--      (`amici_suggeriti`), leggere il suo profilo — senza nessuna richiesta.
--   2. "Non seguire piu'" (AccountContext, `rimuoviAtleta`) cancella la
--      relazione, ma il `pt_id` sulla riga dell'atleta restava: il PT se lo
--      ritrovava tra gli atleti, con schede e dati fisici, come prima.
--   3. "relazioni: accetto io che ricevo" lascia cambiare a chi riceve anche
--      `da_id`: bastava una richiesta da un proprio secondo account, girata a
--      nome di chiunque e segnata accettata, per risultare amici di una persona
--      mai sentita — e poterle scrivere, mandarle foto e schede.
--
-- Si chiudono con trigger e non toccando le regole: l'app non scrive niente di
-- tutto questo (`pt_id` lo mette solo `accetta_relazione`, le relazioni non le
-- modifica mai), quindi per lei non cambia nulla e il blocco si lancia quando
-- si vuole, da solo.
--
-- ⚠️ I LEGAMI GIA' STORTI NON LI SISTEMA: i trigger guardano le scritture
-- nuove. Per vedere gli atleti che hanno un `pt_id` senza una richiesta di
-- lavoro accettata (cioe' i casi 1 e 2 gia' successi):
--   select a.id, a.nome, a.pt_id, pt.nome as pt_nome, a.associato_il
--     from public.profili a left join public.profili pt on pt.id = a.pt_id
--    where a.pt_id is not null and not exists (
--      select 1 from public.relazioni r
--       where r.tipo = 'lavoro' and r.stato = 'accettata'
--         and r.da_id = a.id and r.a_id = a.pt_id);
-- e, se sono da staccare tutti, la stessa condizione con
--   update public.profili a set pt_id = null, associato_il = null where ...
-- ===========================================================================

-- 1. Il PT lo si ha solo se ha accettato. Toglierlo (null) si puo' sempre.
-- `security definer` perche' deve vedere la relazione anche quando a scrivere
-- non e' chi l'ha mandata (lo fa `accetta_relazione`, per conto del PT).
create or replace function public.pt_solo_se_ha_accettato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pt_id is not null
     and (tg_op = 'INSERT' or new.pt_id is distinct from old.pt_id)
     and not exists (
       select 1 from public.relazioni r
        where r.tipo = 'lavoro' and r.stato = 'accettata'
          and r.da_id = new.id and r.a_id = new.pt_id
     ) then
    raise exception 'Il personal trainer si collega solo accettando la richiesta'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists pt_solo_se_ha_accettato on public.profili;
create trigger pt_solo_se_ha_accettato
  before insert or update of pt_id on public.profili
  for each row execute function public.pt_solo_se_ha_accettato();

-- 2. Via la richiesta di lavoro, via il PT dal profilo dell'atleta: da
-- qualunque lato la si tolga. Il PT non puo' scrivere nella riga dell'atleta,
-- quindi lo fa il database per lui — e solo se quel PT e' proprio lui.
create or replace function public.lavoro_tolto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.tipo = 'lavoro' then
    update public.profili
       set pt_id = null, associato_il = null
     where id = old.da_id and pt_id = old.a_id;
  end if;
  return old;
end;
$$;

drop trigger if exists lavoro_tolto on public.relazioni;
create trigger lavoro_tolto
  after delete on public.relazioni
  for each row execute function public.lavoro_tolto();

-- 3. Una relazione non cambia persone ne' tipo. Chi la riceve puo' solo
-- accettarla (o cancellarla); per un'altra persona se ne manda un'altra.
create or replace function public.relazione_ferma()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tipo is distinct from old.tipo
     or new.da_id is distinct from old.da_id
     or new.a_id is distinct from old.a_id then
    raise exception 'Una richiesta non cambia persone ne'' tipo'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists relazione_ferma on public.relazioni;
create trigger relazione_ferma
  before update on public.relazioni
  for each row execute function public.relazione_ferma();


-- ===========================================================================
-- SEGNALAZIONI, DECISIONI E AVVISI (40ª tornata)
--
-- Tabelle e controlli di base stanno più su (MODERAZIONE: LE BASI). Qui:
--   1. segnalare: il trigger che controlla e completa una segnalazione;
--   2. decidere (solo moderatori): la coda, "togli" o "va bene così", e le
--      SANZIONI A GRADINI dei Termini (punto 7):
--        1° e 2° contenuto tolto → solo avviso;
--        3° → pubblicazione bloccata;   4° e oltre → account bloccato;
--   3. avvisare: ogni decisione che tocca una persona le lascia una
--      NOTIFICA (cosa era, perché, cosa succede adesso), che l'app le mostra
--      al primo accesso (components/AvvisiModerazione);
--   4. sbloccare: chi è bloccato chiede lo sblocco dall'app
--      (`richieste_sblocco`), un moderatore accoglie o respinge.
--
-- Diventare moderatore (dal SQL Editor, una volta):
--   insert into public.moderatori (user_id)
--   select id from public.profili where nome = 'Filippo';
--
-- ⚠️ Il file della foto tolta resta nel bucket ma non lo apre più nessuno:
-- le regole di lettura vogliono che la riga esista. Cancellare file da SQL
-- Supabase non lo lascia fare.
-- ===========================================================================

-- --- 1. segnalare -----------------------------------------------------------

-- Prima di salvarla: la cosa segnalata esiste, chi segnala la può vedere, e
-- non è roba sua. Autore e allenamento li mette il database.
create or replace function public.segnalazione_valida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autore uuid;
  v_chiave text;
begin
  if new.tipo = 'commento' then
    select c.user_id, c.allenamento_key into v_autore, v_chiave
      from public.allenamento_commenti c
     where c.id = new.oggetto and public.posso_vedere_allenamento(c.allenamento_key);
  else
    select f.user_id, f.allenamento_key into v_autore, v_chiave
      from public.allenamento_foto f
     where f.id = new.oggetto and f.visibilita = 'pubblica';
  end if;
  if v_autore is null then
    raise exception 'Non c''è niente da segnalare qui' using errcode = '42501';
  end if;
  if v_autore = new.segnalato_da then
    raise exception 'Non si segnala una cosa propria' using errcode = '42501';
  end if;
  new.autore_id := v_autore;
  new.allenamento_key := v_chiave;
  return new;
end;
$$;

drop trigger if exists segnalazione_valida on public.segnalazioni;
create trigger segnalazione_valida
  before insert on public.segnalazioni
  for each row execute function public.segnalazione_valida();

-- --- 3. gli avvisi (prima delle decisioni, che li scrivono) ----------------

create table if not exists public.notifiche (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- 'rimosso' (un tuo contenuto è stato tolto), 'sbloccato', 'sblocco_negato'.
  tipo       text not null,
  titolo     text not null,
  testo      text not null,
  creata_il  timestamptz not null default now(),
  letta_il   timestamptz
);
create index if not exists notifiche_da_leggere_idx
  on public.notifiche (user_id, creata_il) where letta_il is null;

alter table public.notifiche enable row level security;

-- Si leggono le proprie; si scrivono solo dalle funzioni dei moderatori, e
-- "letta" si segna con segna_notifiche_lette (non si riscrive il testo).
drop policy if exists "notifiche: le mie" on public.notifiche;
create policy "notifiche: le mie" on public.notifiche
  for select using (user_id = auth.uid());

create or replace function public.segna_notifiche_lette(ids text[])
returns void
language sql security definer set search_path = public as $$
  update public.notifiche set letta_il = now()
   where user_id = auth.uid() and id = any(ids) and letta_il is null;
$$;

revoke all on function public.segna_notifiche_lette(text[]) from public, anon;
grant execute on function public.segna_notifiche_lette(text[]) to authenticated;

-- Il nome di un motivo come si legge nell'app (lib/segnalazioni, MOTIVI).
create or replace function public.nome_motivo(p_motivo text)
returns text
language sql immutable as $$
  select case p_motivo
    when 'offensivo' then 'offensivo o di odio'
    when 'volgare'   then 'volgare'
    when 'molestie'  then 'molestie o bullismo'
    when 'sessuale'  then 'contenuto sessuale'
    when 'violenza'  then 'violenza o pericolo'
    when 'spam'      then 'spam o pubblicità'
    else 'contrario alle regole della community'
  end;
$$;

-- --- 4. le richieste di sblocco --------------------------------------------

create table if not exists public.richieste_sblocco (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Cosa si chiede di sbloccare.
  tipo       text not null check (tipo in ('pubblicazione', 'account')),
  messaggio  text not null default '' check (length(messaggio) <= 1000),
  stato      text not null default 'aperta' check (stato in ('aperta', 'accolta', 'respinta')),
  creata_il  timestamptz not null default now(),
  decisa_il  timestamptz,
  decisa_da  uuid references auth.users(id) on delete set null
);
-- Una richiesta aperta alla volta per cosa: insistere non la fa arrivare prima.
create unique index if not exists richieste_sblocco_una_aperta
  on public.richieste_sblocco (user_id, tipo) where stato = 'aperta';

alter table public.richieste_sblocco enable row level security;

drop policy if exists "richieste sblocco: le mie, tutte per i moderatori" on public.richieste_sblocco;
create policy "richieste sblocco: le mie, tutte per i moderatori" on public.richieste_sblocco
  for select using (user_id = auth.uid() or public.sono_moderatore());

-- Si chiede solo lo sblocco di quello che è davvero bloccato.
drop policy if exists "richieste sblocco: le mando io" on public.richieste_sblocco;
create policy "richieste sblocco: le mando io" on public.richieste_sblocco
  for insert with check (
    user_id = auth.uid() and stato = 'aperta' and decisa_il is null
    and exists (select 1 from public.sanzioni z
                 where z.user_id = auth.uid()
                   and ((tipo = 'pubblicazione' and z.pubblicazione_bloccata)
                        or (tipo = 'account' and z.account_bloccato)))
  );

-- Come sono messo io: per l'app (blocchi, avviso, richiesta già mandata).
create or replace function public.mio_stato_moderazione()
returns table (
  tolti int, pubblicazione_bloccata boolean, account_bloccato boolean,
  richiesta_pubblicazione boolean, richiesta_account boolean
)
language sql stable security definer set search_path = public as $$
  select coalesce(z.tolti, 0),
         coalesce(z.pubblicazione_bloccata, false),
         coalesce(z.account_bloccato, false),
         exists (select 1 from public.richieste_sblocco r
                  where r.user_id = auth.uid() and r.tipo = 'pubblicazione' and r.stato = 'aperta'),
         exists (select 1 from public.richieste_sblocco r
                  where r.user_id = auth.uid() and r.tipo = 'account' and r.stato = 'aperta')
    from (select auth.uid() as me) io
    left join public.sanzioni z on z.user_id = io.me;
$$;

revoke all on function public.mio_stato_moderazione() from public, anon;
grant execute on function public.mio_stato_moderazione() to authenticated;

-- --- 2. decidere (solo moderatori) ------------------------------------------

-- La coda: una riga per COSA segnalata (non per segnalazione), col contenuto
-- com'è adesso, quante persone l'hanno segnalata e perché, se è già nascosta
-- e quante cose dell'autore sono state tolte prima.
create or replace function public.segnalazioni_aperte()
returns table (
  tipo text, oggetto text, allenamento_key text, autore_id uuid, autore_nome text,
  testo text, percorso text, media text, esiste boolean, nascosto boolean,
  quante int, persone int, motivi text[], dettagli text[], prima timestamptz, tolti_prima int
)
language sql stable security definer set search_path = public as $$
  with aperte as (
    select s.tipo, s.oggetto,
           max(s.allenamento_key) as allenamento_key,
           (array_agg(s.autore_id))[1] as autore_id,
           count(*)::int as quante,
           count(distinct s.segnalato_da)::int as persone,
           array_agg(s.motivo order by s.creata_il) as motivi,
           array_remove(array_agg(nullif(trim(s.dettaglio), '') order by s.creata_il), null) as dettagli,
           min(s.creata_il) as prima
      from public.segnalazioni s
     where s.stato = 'aperta'
     group by s.tipo, s.oggetto
  )
  select a.tipo, a.oggetto, a.allenamento_key, a.autore_id, p.nome,
         c.testo,
         coalesce(c.foto, f.percorso),
         case when f.id is not null then f.tipo when c.foto is not null then 'foto' end,
         (c.id is not null or f.id is not null),
         a.persone >= 3,
         a.quante, a.persone, a.motivi, a.dettagli, a.prima,
         coalesce((select z.tolti from public.sanzioni z where z.user_id = a.autore_id), 0)
    from aperte a
    left join public.allenamento_commenti c on a.tipo = 'commento' and c.id = a.oggetto
    left join public.allenamento_foto f on a.tipo = 'foto' and f.id = a.oggetto
    left join public.profili p on p.id = a.autore_id
   where public.sono_moderatore()
   order by a.persone desc, a.prima;
$$;

revoke all on function public.segnalazioni_aperte() from public, anon;
grant execute on function public.segnalazioni_aperte() to authenticated;

-- La decisione su una cosa segnalata.
--   'respinta': va bene così, le segnalazioni si chiudono (e se era nascosta
--               torna visibile);
--   'rimossa':  il contenuto sparisce per tutti, all'autore si conta un
--               contenuto tolto, scatta il gradino della sanzione e gli
--               arriva l'avviso con cosa era e perché. `p_motivo` è il motivo
--               scelto dal moderatore; se manca, il più segnalato.
-- Restituisce i contenuti tolti all'autore fino a quel momento (0 se 'respinta').
create or replace function public.decidi_segnalazione(
  p_tipo text, p_oggetto text, p_esito text, p_motivo text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autore  uuid;
  v_testo   text;
  v_media   text;
  v_motivo  text;
  v_tolti   int := 0;
  v_cosa    text;
  v_tolto   text := 'è stato tolto';
  v_dopo    text;
begin
  if not public.sono_moderatore() then
    raise exception 'Solo un moderatore decide sulle segnalazioni' using errcode = '42501';
  end if;
  if p_esito not in ('rimossa', 'respinta') then
    raise exception 'Esito sconosciuto: %', p_esito using errcode = '22023';
  end if;

  if p_esito = 'rimossa' then
    select s.autore_id into v_autore from public.segnalazioni s
     where s.tipo = p_tipo and s.oggetto = p_oggetto limit 1;
    v_motivo := coalesce(p_motivo, (
      select s.motivo from public.segnalazioni s
       where s.tipo = p_tipo and s.oggetto = p_oggetto and s.stato = 'aperta'
       group by s.motivo order by count(*) desc, min(s.creata_il) limit 1));

    -- Cosa era, prima di toglierlo: l'avviso lo deve poter dire.
    if p_tipo = 'commento' then
      select c.testo, case when c.foto is not null then 'foto' end into v_testo, v_media
        from public.allenamento_commenti c where c.id = p_oggetto;
      delete from public.allenamento_commenti where id = p_oggetto;
      v_cosa := case
        when coalesce(trim(v_testo), '') <> '' then
          'Il tuo commento «' || left(v_testo, 200) || case when length(v_testo) > 200 then '…' else '' end || '»'
        else 'La foto che avevi allegato a un commento' end;
      if coalesce(trim(v_testo), '') = '' then v_tolto := 'è stata tolta'; end if;
    else
      select f.tipo into v_media from public.allenamento_foto f where f.id = p_oggetto;
      delete from public.allenamento_foto where id = p_oggetto;
      v_cosa := case when v_media = 'video' then 'Un video' else 'Una foto' end
                || ' che avevi pubblicato nel Feed';
      if v_media is distinct from 'video' then v_tolto := 'è stata tolta'; end if;
    end if;

    if v_autore is not null and found then
      insert into public.sanzioni as z (user_id, tolti) values (v_autore, 1)
      on conflict (user_id) do update set tolti = z.tolti + 1, aggiornato_il = now()
      returning z.tolti into v_tolti;

      if v_tolti = 3 then
        update public.sanzioni set pubblicazione_bloccata = true, aggiornato_il = now()
         where user_id = v_autore;
        v_dopo := 'È il terzo contenuto tolto: da adesso non puoi più pubblicare nel Feed '
               || '(commenti, foto e allenamenti pubblici). Puoi chiedere lo sblocco dall’app.';
      elsif v_tolti >= 4 then
        update public.sanzioni set pubblicazione_bloccata = true, account_bloccato = true,
               aggiornato_il = now()
         where user_id = v_autore;
        v_dopo := 'È il ' || v_tolti || '° contenuto tolto: il tuo account è bloccato. '
               || 'Puoi chiedere lo sblocco dall’app.';
      else
        v_dopo := case when v_tolti = 1 then 'È il primo avviso. ' else 'È il secondo avviso. ' end
               || 'Al terzo contenuto tolto non potrai più pubblicare nel Feed, al quarto '
               || 'l’account verrà bloccato.';
      end if;

      insert into public.notifiche (user_id, tipo, titolo, testo)
      values (v_autore, 'rimosso', 'Un tuo contenuto è stato tolto',
              v_cosa || ' ' || v_tolto || ' perché '
              || case when v_tolto = 'è stata tolta' then 'segnalata' else 'segnalato' end
              || ' come ' || public.nome_motivo(v_motivo)
              || ', contro le regole della community. ' || v_dopo);
    end if;
  end if;

  update public.segnalazioni
     set stato = p_esito, decisa_il = now(), decisa_da = auth.uid()
   where tipo = p_tipo and oggetto = p_oggetto and stato = 'aperta';
  return v_tolti;
end;
$$;

revoke all on function public.decidi_segnalazione(text, text, text, text) from public, anon;
grant execute on function public.decidi_segnalazione(text, text, text, text) to authenticated;

-- Le persone con contenuti tolti o bloccate, e le loro richieste aperte.
create or replace function public.persone_sanzionate()
returns table (
  user_id uuid, nome text, tolti int, pubblicazione_bloccata boolean, account_bloccato boolean,
  richiesta_id text, richiesta_tipo text, richiesta_messaggio text, richiesta_il timestamptz
)
language sql stable security definer set search_path = public as $$
  select z.user_id, p.nome, z.tolti, z.pubblicazione_bloccata, z.account_bloccato,
         r.id, r.tipo, r.messaggio, r.creata_il
    from public.sanzioni z
    left join public.profili p on p.id = z.user_id
    left join lateral (
      select * from public.richieste_sblocco r
       where r.user_id = z.user_id and r.stato = 'aperta'
       order by (r.tipo = 'account') desc, r.creata_il limit 1
    ) r on true
   where public.sono_moderatore()
     and (z.pubblicazione_bloccata or z.account_bloccato or r.id is not null)
   order by r.creata_il nulls last, z.aggiornato_il desc;
$$;

revoke all on function public.persone_sanzionate() from public, anon;
grant execute on function public.persone_sanzionate() to authenticated;

-- Sbloccare: 'account' (resta bloccata la pubblicazione, se lo era prima del
-- 4° contenuto tolto), 'pubblicazione', o 'tutto'. Chiude le richieste aperte
-- su quello come accolte e avvisa la persona. Il conto dei contenuti tolti
-- resta: il prossimo contenuto tolto riparte da lì.
create or replace function public.sblocca(p_utente uuid, p_cosa text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sono_moderatore() then
    raise exception 'Solo un moderatore sblocca' using errcode = '42501';
  end if;
  if p_cosa not in ('pubblicazione', 'account', 'tutto') then
    raise exception 'Cosa sconosciuta: %', p_cosa using errcode = '22023';
  end if;
  update public.sanzioni
     set account_bloccato = case when p_cosa in ('account', 'tutto') then false else account_bloccato end,
         pubblicazione_bloccata = case when p_cosa in ('pubblicazione', 'tutto') then false else pubblicazione_bloccata end,
         aggiornato_il = now()
   where user_id = p_utente;
  update public.richieste_sblocco
     set stato = 'accolta', decisa_il = now(), decisa_da = auth.uid()
   where user_id = p_utente and stato = 'aperta'
     and (p_cosa = 'tutto' or tipo = p_cosa);
  insert into public.notifiche (user_id, tipo, titolo, testo)
  values (p_utente, 'sbloccato',
          case p_cosa when 'pubblicazione' then 'Puoi di nuovo pubblicare'
                      else 'Il tuo account è sbloccato' end,
          case p_cosa when 'pubblicazione'
                      then 'Un moderatore ha sbloccato la pubblicazione nel Feed. '
                      else 'Un moderatore ha sbloccato il tuo account. ' end
          || 'Ricorda le regole della community: un altro contenuto tolto ti blocca di nuovo.');
end;
$$;

revoke all on function public.sblocca(uuid, text) from public, anon;
grant execute on function public.sblocca(uuid, text) to authenticated;

-- Respingere una richiesta di sblocco: si chiude e la persona lo sa.
create or replace function public.respingi_sblocco(p_richiesta text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_utente uuid;
begin
  if not public.sono_moderatore() then
    raise exception 'Solo un moderatore decide sulle richieste' using errcode = '42501';
  end if;
  update public.richieste_sblocco
     set stato = 'respinta', decisa_il = now(), decisa_da = auth.uid()
   where id = p_richiesta and stato = 'aperta'
  returning user_id into v_utente;
  if v_utente is not null then
    insert into public.notifiche (user_id, tipo, titolo, testo)
    values (v_utente, 'sblocco_negato', 'Richiesta di sblocco non accolta',
            'Per ora il blocco resta. Potrai mandare una nuova richiesta più avanti.');
  end if;
end;
$$;

revoke all on function public.respingi_sblocco(text) from public, anon;
grant execute on function public.respingi_sblocco(text) to authenticated;
