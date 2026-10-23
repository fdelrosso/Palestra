-- ===========================================================================
-- OGNI ALLENAMENTO HA UN ID SUO (2026-10-23)
--
-- Si applica dopo 20261023120000_allenamenti.sql, ed e' rilanciabile.
--
-- Fino a qui l'id di un allenamento era '<scheda_id>|<data ISO>': la data
-- dentro la chiave, quindi correggere la data cambiava l'identita', e mi
-- piace, commenti e foto andavano spostati a mano (`sposta_interazioni`,
-- `spostaFotoAllenamento`). Quando lo spostamento non arrivava restavano appesi
-- al niente: in produzione 3 mi piace su 26.
--
-- Qui:
--   · ogni allenamento ha un id vero (uuid); la chiave di prima resta in
--     `chiave_vecchia`, per i link gia' condivisi (/post/<chiave vecchia>) e
--     per le app non ancora aggiornate;
--   · mi piace, commenti, foto e segnalazioni passano all'id nuovo;
--   · mi piace e commenti hanno una FK vera: si cancella l'allenamento, se ne
--     vanno anche loro (i mi piace gia' orfani si tolgono, se no la FK non
--     nasce: non li vedeva nessuno);
--   · le foto no: possono arrivare prima del loro allenamento (si caricano a
--     "Termina", l'allenamento viaggia per conto suo), e una FK le rifiuterebbe.
--
-- ⚠️ PONTI PER LE APP VECCHIE (finche' qualcuno ha la pagina di prima aperta):
-- un mi piace, un commento o una foto con la chiave vecchia si gira sull'id
-- nuovo; un allenamento scritto con la chiave vecchia (anche dal trigger dei
-- `completamenti`) finisce sulla sua riga, o ne nasce una con un id vero.
-- ponytail: si tolgono, col trigger dei completamenti, quando nessuno scrive
-- piu' chiavi vecchie.
-- ===========================================================================

alter table public.allenamenti add column if not exists chiave_vecchia text;
create unique index if not exists allenamenti_chiave_vecchia_idx on public.allenamenti (chiave_vecchia);

-- L'id di un allenamento a partire da quello che arriva: l'id stesso, o una
-- chiave vecchia. Null se non c'e'.
create or replace function public.id_allenamento(chiave text)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select a.id from public.allenamenti a where a.id = $1),
    (select a.id from public.allenamenti a where a.chiave_vecchia = $1));
$$;

revoke all on function public.id_allenamento(text) from public;
grant execute on function public.id_allenamento(text) to anon, authenticated;


-- --------------------------------------------------------------------------
-- 1. Gli id nuovi. Una chiave vecchia si riconosce dal '|' (gli id dell'app,
-- `nuovoId()`, non ce l'hanno mai). `dati.id` dice all'app il suo id;
-- `dati.chiaveVecchia` le fa riconoscere un link vecchio.
-- --------------------------------------------------------------------------
update public.allenamenti a
   set chiave_vecchia = a.id,
       id = n.nuovo,
       dati = a.dati || jsonb_build_object('id', n.nuovo, 'chiaveVecchia', a.id)
  from (select id, gen_random_uuid()::text as nuovo
          from public.allenamenti
         where position('|' in id) > 0) n
 where a.id = n.id;

-- 2. Chi puntava la chiave vecchia punta l'id nuovo.
update public.allenamento_mi_piace m set allenamento_key = a.id
  from public.allenamenti a where a.chiave_vecchia = m.allenamento_key;
update public.allenamento_commenti c set allenamento_key = a.id
  from public.allenamenti a where a.chiave_vecchia = c.allenamento_key;
update public.allenamento_foto f set allenamento_key = a.id
  from public.allenamenti a where a.chiave_vecchia = f.allenamento_key;
update public.segnalazioni s set allenamento_key = a.id
  from public.allenamenti a where a.chiave_vecchia = s.allenamento_key;

-- 3. Gli orfani (un allenamento che non c'e' piu'), poi le FK.
delete from public.allenamento_mi_piace m
 where not exists (select 1 from public.allenamenti a where a.id = m.allenamento_key);
delete from public.allenamento_commenti c
 where not exists (select 1 from public.allenamenti a where a.id = c.allenamento_key);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'allenamento_mi_piace_allenamento_fk') then
    alter table public.allenamento_mi_piace add constraint allenamento_mi_piace_allenamento_fk
      foreign key (allenamento_key) references public.allenamenti(id) on delete cascade on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'allenamento_commenti_allenamento_fk') then
    alter table public.allenamento_commenti add constraint allenamento_commenti_allenamento_fk
      foreign key (allenamento_key) references public.allenamenti(id) on delete cascade on update cascade;
  end if;
end $$;


-- --------------------------------------------------------------------------
-- 4. I PONTI.
-- --------------------------------------------------------------------------

-- Mi piace, commenti e foto con la chiave vecchia: sull'id nuovo. Il nome
-- comincia per "a_" perche' i trigger "before" girano in ordine di nome, e
-- questo deve venire prima degli altri (e prima della RLS e della FK, che
-- guardano la riga gia' girata).
create or replace function public.a_chiave_allenamento()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.allenamento_key := coalesce(public.id_allenamento(new.allenamento_key), new.allenamento_key);
  return new;
end;
$$;

revoke all on function public.a_chiave_allenamento() from public, anon, authenticated;

drop trigger if exists a_chiave_allenamento on public.allenamento_mi_piace;
create trigger a_chiave_allenamento before insert or update of allenamento_key on public.allenamento_mi_piace
  for each row execute function public.a_chiave_allenamento();
drop trigger if exists a_chiave_allenamento on public.allenamento_commenti;
create trigger a_chiave_allenamento before insert or update of allenamento_key on public.allenamento_commenti
  for each row execute function public.a_chiave_allenamento();
drop trigger if exists a_chiave_allenamento on public.allenamento_foto;
create trigger a_chiave_allenamento before insert or update of allenamento_key on public.allenamento_foto
  for each row execute function public.a_chiave_allenamento();

-- Un allenamento con la chiave vecchia: se la sua riga c'e', la si aggiorna
-- (e l'inserimento non avviene); se no nasce con un id vero.
-- Gira coi permessi di chi scrive: la riga da aggiornare deve essere sua (RLS),
-- se no non succede niente.
create or replace function public.a_allenamento_chiave_vecchia()
returns trigger
language plpgsql set search_path = public as $$
declare
  v_id text;
begin
  if position('|' in new.id) = 0 then
    return new;
  end if;
  select a.id into v_id from public.allenamenti a where a.chiave_vecchia = new.id;
  if v_id is null then
    new.chiave_vecchia := new.id;
    new.id := gen_random_uuid()::text;
    new.dati := new.dati || jsonb_build_object('id', new.id, 'chiaveVecchia', new.chiave_vecchia);
    return new;
  end if;
  update public.allenamenti a
     set data = new.data,
         visibilita = new.visibilita,
         da_salvare = new.da_salvare,
         dati = new.dati || jsonb_build_object('id', v_id, 'chiaveVecchia', new.id)
   where a.id = v_id;
  return null;
end;
$$;

drop trigger if exists a_allenamento_chiave_vecchia on public.allenamenti;
create trigger a_allenamento_chiave_vecchia before insert on public.allenamenti
  for each row execute function public.a_allenamento_chiave_vecchia();

-- Il trigger dei `completamenti` (app vecchie): toglie solo le righe nate da
-- una chiave vecchia che il json non ha piu'. Quelle nate nell'app nuova non
-- hanno `chiave_vecchia`, e un json vecchio non le conosce: restano.
-- L'inserimento passa dal ponte qui sopra.
create or replace function public.specchia_completamenti(p_scheda text, p_utente uuid, p_dati jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dati is null or not (p_dati ? 'completamenti') then
    return;
  end if;

  delete from public.allenamenti a
   where a.scheda_id = p_scheda
     and a.chiave_vecchia is not null
     and a.chiave_vecchia not in (
       select p_scheda || '|' || (c ->> 'data')
         from jsonb_array_elements(coalesce(p_dati -> 'completamenti', '[]'::jsonb)) c
        where c ->> 'data' is not null);

  insert into public.allenamenti (id, user_id, scheda_id, data, visibilita, da_salvare, dati)
  select p_scheda || '|' || (c ->> 'data'),
         p_utente,
         p_scheda,
         (c ->> 'data')::timestamptz,
         coalesce(nullif(c ->> 'visibilita', ''), 'nascosta'),
         coalesce((c ->> 'daSalvare')::boolean, false),
         c || jsonb_build_object('schedaId', p_scheda)
    from jsonb_array_elements(coalesce(p_dati -> 'completamenti', '[]'::jsonb)) c
   where c ->> 'data' is not null;
end;
$$;


-- --------------------------------------------------------------------------
-- 5. LE FUNZIONI CHE LEGGEVANO LA CHIAVE. Un link vecchio (o un'app vecchia)
-- passa ancora la chiave vecchia: `id_allenamento` la riconosce.
-- --------------------------------------------------------------------------
create or replace function public.posso_vedere_allenamento(chiave text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.allenamenti a
     where a.id = public.id_allenamento($1)
       and not public.bloccato_con(a.user_id)
       and (
         a.user_id = auth.uid()
         or a.visibilita = 'pubblica'
         or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id))
       )
  );
$$;

-- Prima tagliava la chiave sul '|' per trovare la scheda: con un id vero non
-- c'e' piu' niente da tagliare.
create or replace function public.proprietario_allenamento(chiave text)
returns uuid
language sql stable security definer set search_path = public as $$
  select a.user_id from public.allenamenti a where a.id = public.id_allenamento($1);
$$;

create or replace function public.post_pubblico(chiave text)
returns table (
  user_id   uuid,
  nome      text,
  scheda_id text,
  dati      jsonb,
  mi_piace  bigint,
  commenti  bigint
)
language sql stable security definer set search_path = public as $$
  select a.user_id,
         p.nome,
         a.scheda_id,
         a.dati,
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = a.id),
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = a.id and not public.in_attesa('commento', c.id))
    from public.allenamenti a
    join public.profili p on p.id = a.user_id
   where a.id = public.id_allenamento($1)
     and a.visibilita = 'pubblica'
   limit 1;
$$;

-- Come in schema.sql, ma i propri allenamenti si riconoscono dalla tabella e
-- non tagliando la chiave.
create or replace function public.notifiche_interazioni()
returns table (
  allenamento_key text,
  tipo            text,
  quanti          bigint,
  persone         bigint,
  nuovi           bigint,
  nomi            text[],
  ultimo_il       timestamptz,
  ultimo_testo    text
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  ),
  miei as (
    select a.id from public.allenamenti a where a.user_id = auth.uid()
  ),
  eventi as (
    select m.allenamento_key, 'mi_piace'::text as tipo, m.user_id, m.creato_il, null::text as testo
      from public.allenamento_mi_piace m
     where m.allenamento_key in (select id from miei)
    union all
    select c.allenamento_key, 'commento'::text, c.user_id, c.creato_il, c.testo
      from public.allenamento_commenti c
     where c.allenamento_key in (select id from miei)
       and not public.in_attesa('commento', c.id)
  ),
  validi as (
    select e.*, p.nome
      from eventi e
      join public.profili p on p.id = e.user_id
     where e.user_id <> auth.uid()
       and not public.bloccato_con(e.user_id)
  ),
  per_persona as (
    select v.allenamento_key, v.tipo, v.nome, max(v.creato_il) as quando
      from validi v
     group by v.allenamento_key, v.tipo, v.user_id, v.nome
  )
  select v.allenamento_key,
         v.tipo,
         count(*),
         count(distinct v.user_id),
         count(*) filter (where v.creato_il > (select il from letto)),
         (select array_agg(pp.nome order by pp.quando desc)
            from (select * from per_persona pp2
                   where pp2.allenamento_key = v.allenamento_key and pp2.tipo = v.tipo
                   order by pp2.quando desc limit 3) pp),
         max(v.creato_il),
         (array_agg(v.testo order by v.creato_il desc))[1]
    from validi v
   group by v.allenamento_key, v.tipo
   order by max(v.creato_il) desc
   limit 300;
$$;
