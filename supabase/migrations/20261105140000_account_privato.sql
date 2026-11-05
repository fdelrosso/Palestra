-- ---------------------------------------------------------------------------
-- Account pubblico o privato (2026-11-05), come su Instagram.
--
--   pubblico (`profili.pubblico = true`, il default, e quello di tutti gli
--            account che c'erano): come prima — gli allenamenti e le schede
--            "pubblici" li vede chiunque — in più il cognome lo vedono tutti e
--            lo si trova anche per pezzi di nome e cognome
--            (`cerca_utenti_con_ruolo`, 20261105150000).
--   privato: lo si trova SOLO per username (o col codice amico / PT, che si
--            danno a mano), e quello che ha reso pubblico lo vedono solo gli
--            amici, il suo PT e i suoi atleti: la stessa cerchia del cognome.
--            Per gli altri è come se non avesse niente di pubblico.
--
-- ⚠️ PRIVATO VALE SOLO DA ATLETA. Un PT è qui per farsi trovare dagli atleti:
-- un solo PT è sempre pubblico (l'interruttore non lo vede), e di chi è
-- "Tutti e due" il lato PT resta pubblico — nome, cognome, si trova per nome,
-- la vetrina —, mentre allenamenti e schede seguono la sua scelta.
--
-- ⚠️ IL CONTROLLO È UNO, `vedo_contenuti_di`, e sta in OGNI posto da cui esce
-- qualcosa di "pubblico" di un altro: feed e profilo (vedo_allenamento),
-- allenamenti_visibili, il post da un link (anche senza account), mi piace e
-- commenti, schede_visibili, Schede generali, Consigliato, le foto degli
-- allenamenti e i media delle schede. Una funzione nuova che fa uscire roba
-- pubblica deve chiederlo anche lei.
-- Restano fuori: la vetrina del PT (è il suo lavoro), i nomi (nomi_di), chi si
-- allena in una palestra (lo decide chi_vede_palestra).
--
-- Le funzioni sotto sono copie di quelle di prima (il file indicato) con in
-- più il controllo: chi ne cambia una parte da qui.
-- Solo aggiunte: rilanciabile.
-- ---------------------------------------------------------------------------

alter table public.profili add column if not exists pubblico boolean not null default true;

-- Io vedo quello che `p_persona` ha reso pubblico? Sì se è un account
-- pubblico (o un solo PT, che lo è sempre), se sono io, se siamo amici, se è il mio PT o un mio atleta.
-- Una richiesta d'amicizia in attesa NON basta (come per il cognome): se no
-- basterebbe mandarla. Senza account (anon, il link di un post) solo i pubblici.
create or replace function public.vedo_contenuti_di(p_persona uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_persona = auth.uid()
      or exists (
        select 1 from public.profili p
         where p.id = p_persona
           and (p.pubblico
                or (p.ruolo = 'pt' and p.si_allena = false)
                or p.pt_id = auth.uid()
                or p.id = (select pt_id from public.profili where id = auth.uid())
                or exists (select 1 from public.relazioni r
                            where r.stato = 'accettata'
                              and ((r.da_id = auth.uid() and r.a_id = p.id)
                                or (r.a_id = auth.uid() and r.da_id = p.id)))));
$$;
revoke all on function public.vedo_contenuti_di(uuid) from public, anon;
grant execute on function public.vedo_contenuti_di(uuid) to authenticated;

-- Le foto degli allenamenti, lette dalla tabella (schema.sql).
drop policy if exists "foto allenamento: le mie, e quelle pubblicate" on public.allenamento_foto;
create policy "foto allenamento: le mie, e quelle pubblicate" on public.allenamento_foto
  for select using (
    user_id = auth.uid()
    or (visibilita = 'pubblica' and not public.in_attesa('foto', id)
        and public.vedo_contenuti_di(user_id))
  );

-- vedo_allenamento (20261104180000): il ramo "pubblica"
create or replace function public.vedo_allenamento(p_persona uuid, p_visibilita text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not public.bloccato_con(p_persona)
     and (p_persona = auth.uid()
          or (p_visibilita = 'pubblica' and not public.pubblicazione_bloccata(p_persona)
              and public.vedo_contenuti_di(p_persona))
          or (p_visibilita = 'solo-pt' and public.e_mio_atleta(p_persona)));
$$;
revoke all on function public.vedo_allenamento(uuid, text) from public, anon;
grant execute on function public.vedo_allenamento(uuid, text) to authenticated;

-- allenamenti_visibili (20261104120000)
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
    a.user_id,
    a.scheda_id,
    case
      when a.user_id = io.me then 0
      when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end as relazione_pt,
    public.dati_allenamento_per_me(a.user_id, a.dati)
  from public.allenamenti a
  join io on true
  join public.profili autore on autore.id = a.user_id
  where not public.bloccato_con(a.user_id)
    and (a.user_id = io.me
     or (a.visibilita = 'pubblica' and not public.pubblicazione_bloccata(a.user_id)
         and public.vedo_contenuti_di(a.user_id))
     or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id)));
$$;
revoke all on function public.allenamenti_visibili() from public, anon;
grant execute on function public.allenamenti_visibili() to authenticated;

-- post_pubblico (20261104120000): anche dal link senza account, che vede solo i pubblici
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
         public.dati_allenamento_per_me(a.user_id, a.dati),
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = a.id),
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = a.id and not public.in_attesa('commento', c.id))
    from public.allenamenti a
    join public.profili p on p.id = a.user_id
   where a.id = public.id_allenamento($1)
     and a.visibilita = 'pubblica'
     and public.vedo_contenuti_di(a.user_id)
   limit 1;
$$;

-- posso_vedere_allenamento (20261023180000): mi piace e commenti
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
         or (a.visibilita = 'pubblica' and public.vedo_contenuti_di(a.user_id))
         or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id))
       )
  );
$$;
revoke all on function public.posso_vedere_allenamento(text) from public, anon;
grant execute on function public.posso_vedere_allenamento(text) to authenticated;

-- schede_visibili (schema.sql), e con lei schede_di
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
  where (s.user_id = io.me
         or (s.visibilita = 'pubblica' and public.vedo_contenuti_di(s.user_id))
         or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id)))
    and not public.bloccato_con(s.user_id);
$$;
revoke all on function public.schede_visibili() from public, anon;
grant execute on function public.schede_visibili() to authenticated;

-- schede_comunita (20261104200000): Schede generali, filtri e scheda intera
create or replace function public.schede_comunita(p_chi text)
returns table (id text, user_id uuid, autore_pt boolean, relazione_pt int, visibilita text, libera boolean,
               dati jsonb, creata_il timestamptz)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  )
  select s.id, s.user_id,
    (autore.ruolo = 'pt'),
    case
      when s.user_id = io.me then 0
      when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
      when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
      else 0
    end,
    s.visibilita, s.libera, s.dati - 'completamenti',
    coalesce(case when s.dati->>'creataIl' ~ '^\d{4}-\d{2}-\d{2}'
                  then (s.dati->>'creataIl')::timestamptz end, 'epoch'::timestamptz)
  from public.schede s
  join io on true
  join public.profili autore on autore.id = s.user_id
  where not s.libera
    and not public.bloccato_con(s.user_id)
    and case p_chi
      when 'amici' then
        s.visibilita = 'pubblica' and exists (
          select 1 from public.relazioni r
           where r.tipo = 'amicizia' and r.stato = 'accettata'
             and ((r.da_id = io.me and r.a_id = s.user_id)
               or (r.a_id = io.me and r.da_id = s.user_id)))
      else s.user_id = io.me or (s.visibilita = 'pubblica' and public.vedo_contenuti_di(s.user_id))
    end;
$$;
revoke all on function public.schede_comunita(text) from public, anon;
grant execute on function public.schede_comunita(text) to authenticated;

-- conteggi_esercizi (20261104220000): Consigliato
create or replace function public.conteggi_esercizi()
returns table (fonte text, nome text, gruppo text, gruppi jsonb, da_scheda boolean,
               pianificati double precision, svolti double precision, utenti int,
               pianificati_senza double precision, svolti_senza double precision, utenti_tutti int)
language sql stable security definer set search_path = public as $$
  with io as (
    select p.id as me, p.pt_id as mio_pt from public.profili p where p.id = auth.uid()
  ),
  -- Le schede degli altri che vedo (schede_visibili), prima dei filtri sul json:
  -- da qui escono anche i PT che contano (come `dellePt` in lib/comunita).
  sv as (
    select s.user_id, s.dati, autore.ruolo = 'pt' as autore_pt,
      case
        when s.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
        when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
        else 0
      end as rel
    from public.schede s
    join io on true
    join public.profili autore on autore.id = s.user_id
    where s.user_id <> io.me
      and not public.bloccato_con(s.user_id)
      and ((s.visibilita = 'pubblica' and public.vedo_contenuti_di(s.user_id))
           or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id)))
  ),
  av as (
    select a.user_id, public.dati_allenamento_per_me(a.user_id, a.dati) as dati,
      case
        when a.user_id = io.mio_pt and autore.ruolo = 'pt' then 2
        when io.mio_pt is not null and autore.pt_id = io.mio_pt then 1
        else 0
      end as rel
    from public.allenamenti a
    join io on true
    join public.profili autore on autore.id = a.user_id
    where a.user_id <> io.me
      and not public.bloccato_con(a.user_id)
      and ((a.visibilita = 'pubblica' and not public.pubblicazione_bloccata(a.user_id)
            and public.vedo_contenuti_di(a.user_id))
        or (a.visibilita = 'solo-pt' and public.e_mio_atleta(a.user_id)))
  ),
  -- I PT con almeno un atleta che hanno schede che vedo, e il loro peso sul piu'
-- seguito (anch'io, se sono un PT con schede: come `fama` in lib/collettivo).
  fama as (
    select f.id, f.atleti::double precision / max(f.atleti) over () as peso
      from (select p.id, (select count(*) from public.profili x where x.pt_id = p.id) as atleti
              from public.profili p
             where p.id in (select user_id from sv where autore_pt)
                or (p.id = (select me from io) and p.ruolo = 'pt'
                    and exists (select 1 from public.schede x where x.user_id = p.id))) f
     where f.atleti > 0
  ),
  -- Un esercizio pianificato o svolto per riga, con il suo peso per segnale.
  pezzi as (
    select sv.user_id, sv.rel, true as pianificato, e
      from sv,
           jsonb_array_elements(case when jsonb_typeof(sv.dati->'giorni') = 'array'
                                     then sv.dati->'giorni' else '[]'::jsonb end) g,
           jsonb_array_elements(case when jsonb_typeof(g->'esercizi') = 'array'
                                     then g->'esercizi' else '[]'::jsonb end) e
     where coalesce(sv.dati->>'visibilita', '') in ('pubblica', 'solo-pt')
       and coalesce(sv.dati->>'libera', 'false') <> 'true'
       and coalesce(g->>'tipo', 'workout') = 'workout'
    union all
    select av.user_id, av.rel, false, e
      from av,
           jsonb_array_elements(case when jsonb_typeof(av.dati->'esercizi') = 'array'
                                     then av.dati->'esercizi' else '[]'::jsonb end) e
     where coalesce(av.dati->>'visibilita', '') in ('pubblica', 'solo-pt')
  ),
  pesati as (
    select 'comunita' as fonte, 1::double precision as peso, p.* from pezzi p
    union all
    select 'mio_pt', 1, p.* from pezzi p where p.rel in (1, 2)
    union all
    select 'pt', f.peso, p.* from pezzi p join fama f on f.id = p.user_id
     where (select mio_pt from io) is null
  )
  -- Nome e gruppo da una scheda se c'e' (lib/comunita contava prima le schede), e
  -- da una riga che il gruppo ce l'ha. Quelle senza gruppo a parte (`_senza`,
  -- `utenti_tutti`): contano solo se il gruppo si ricava dal nome, e lo sa
  -- solo il browser (gruppoDaNome).
  select fonte,
         (array_agg(trim(e->>'nome') order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         (array_agg(e->>'gruppo' order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         (array_agg(e->'gruppi' order by pianificato desc, coalesce(e->>'gruppo', '') = ''))[1],
         bool_or(pianificato),
         coalesce(sum(peso) filter (where pianificato and con_gruppo), 0),
         coalesce(sum(peso) filter (where not pianificato and con_gruppo), 0),
         (count(distinct user_id) filter (where con_gruppo))::int,
         coalesce(sum(peso) filter (where pianificato and not con_gruppo), 0),
         coalesce(sum(peso) filter (where not pianificato and not con_gruppo), 0),
         count(distinct user_id)::int
    from (select *, coalesce(e->>'gruppo', '') <> '' as con_gruppo from pesati) p
   where coalesce(trim(e->>'nome'), '') <> ''
   group by fonte, lower(regexp_replace(trim(e->>'nome'), '\s+', ' ', 'g'));
$$;
revoke all on function public.conteggi_esercizi() from public, anon;
grant execute on function public.conteggi_esercizi() to authenticated;

-- posso_vedere_foto_allenamento (schema.sql): il file della foto
create or replace function public.posso_vedere_foto_allenamento(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.allenamento_foto f
     where f.percorso = percorso_file
       and (f.user_id = auth.uid()
            or (f.visibilita = 'pubblica' and not public.in_attesa('foto', f.id)
                and public.vedo_contenuti_di(f.user_id))
            -- Il moderatore vede quello che deve giudicare.
            or (public.sono_moderatore()
                and exists (select 1 from public.segnalazioni s
                             where s.tipo = 'foto' and s.oggetto = f.id)))
  );
$$;

-- posso_scaricare_media (schema.sql): foto e video degli esercizi di una scheda
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
             or (s.visibilita = 'pubblica' and public.vedo_contenuti_di(s.user_id))
             or (s.visibilita = 'solo-pt' and public.e_mio_atleta(s.user_id))
           )
         )
       )
  );
$$;
revoke all on function public.posso_scaricare_media(text) from public, anon;
grant execute on function public.posso_scaricare_media(text) to authenticated;

-- profilo_pubblico (schema.sql): il cognome di un account pubblico, e di un PT, lo vedono tutti
create or replace function public.profilo_pubblico(p_id uuid)
returns table (id uuid, nome text, cognome text, username text, foto text,
               ruolo text, creato_il timestamptz, amici int)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome,
         case when p.id = auth.uid()
                or p.pubblico
                or p.ruolo = 'pt'
                or p.pt_id = auth.uid()
                or p.id = (select pt_id from public.profili where id = auth.uid())
                or exists (select 1 from public.relazioni r
                            where r.stato = 'accettata'
                              and ((r.da_id = auth.uid() and r.a_id = p.id)
                                or (r.a_id = auth.uid() and r.da_id = p.id)))
              then p.cognome end,
         p.username, p.foto, p.ruolo, p.creato_il,
         (select count(*)::int from public.relazioni r
           where r.tipo = 'amicizia' and r.stato = 'accettata'
             and (r.da_id = p.id or r.a_id = p.id))
    from public.profili p
   where p.id = p_id
     and not public.bloccato_con(p.id);
$$;
