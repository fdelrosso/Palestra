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
            and coalesce(nullif(fatto.c ->> 'visibilita', ''), 'pubblica') = 'pubblica'
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
     -- Campo assente = pubblico: e' la stessa retro-compatibilita' di
     -- src/lib/visibilita.js, e le due devono dire la stessa frase.
     or coalesce(nullif(fatto.c ->> 'visibilita', ''), 'pubblica') = 'pubblica'
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
  visibilita   text not null default 'pubblica'
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
