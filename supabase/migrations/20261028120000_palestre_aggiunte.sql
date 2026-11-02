-- ===========================================================================
-- PALESTRE AGGIUNTE DAGLI UTENTI (2026-10-28)
--
-- Si applica dopo 20261027120000_palestre.sql, ed e' rilanciabile. Solo
-- aggiunte: due colonne su `palestre`, una tabella, cinque funzioni.
-- ⚠️ Come quella prima, per ora SOLO sul progetto di sviluppo.
--
-- Chi non trova la sua palestra la aggiunge in due modi:
--   1. dalle CANDIDATE (`palestre_candidate`): i luoghi di Overture in Italia
--      che l'import non ha preso (fuori dalla Toscana, o fuori dai filtri). Non
--      si vedono sulla mappa e non si leggono: si cercano solo da "Aggiungi"
--      (`cerca_candidate`). Scelta una, si copia in `palestre`;
--   2. con un PIN sulla mappa (`aggiungi_palestra`), dopo aver cercato
--      l'indirizzo.
-- In tutti e due i casi resta DA APPROVARE (`confermata` falso): la vede solo
-- chi ce l'ha sul profilo (o l'ha aggiunta), finche' un moderatore non decide
-- dalla pagina Segnalazioni (`palestre_da_approvare`, `decidi_palestra`).
-- Approvata o no, chi ce l'aveva riceve un avviso (`notifiche`); se no la
-- palestra si cancella, e dal profilo se ne va da sola (on delete set null).
-- Le candidate le carica scratchpad/importa-candidate-overture.py.
-- ===========================================================================

-- Chi l'ha aggiunta (null = dagli import) e se la vedono tutti.
alter table public.palestre
  add column if not exists creata_da uuid references auth.users(id) on delete set null,
  add column if not exists confermata boolean not null default true;

create index if not exists palestre_creata_da on public.palestre (creata_da) where creata_da is not null;

-- Le funzioni di ricerca e della mappa non sono `security definer`: seguono
-- questa regola senza toccarle. Una da approvare la vede chi l'ha aggiunta e
-- chi l'ha scelta (`aggiungi_palestra` la propone a chi vuole metterne una a
-- meno di 50 m): sulla mappa e sul profilo, la sua.
drop policy if exists "palestre: le vede chi ha un account" on public.palestre;
create policy "palestre: le vede chi ha un account" on public.palestre
  for select to authenticated using (
    confermata
    or creata_da = auth.uid()
    or id = (select p.palestra_id from public.profili p where p.id = auth.uid())
  );

-- Prima (in questo stesso file) un secondo che la sceglieva la confermava:
-- ora decide solo un moderatore.
drop trigger if exists conferma_palestra_scelta on public.profili;
drop function if exists public.conferma_palestra_scelta();

-- ---------------------------------------------------------------------------
-- Le candidate. Comune, provincia e regione ce li mette lo script dai confini
-- ISTAT (come per le palestre); fuori da ogni comune non entrano.
-- Nessuna regola di lettura: si arriva solo dalle funzioni qui sotto.
-- ---------------------------------------------------------------------------
create table if not exists public.palestre_candidate (
  id         uuid primary key default gen_random_uuid(),
  fonte_id   text not null unique,  -- "overture:<id>", lo stesso che avra' in `palestre`
  nome       text not null,
  categoria  text,                  -- quella di Overture: gym, pilates_studio, …
  lat        double precision not null,
  lon        double precision not null,
  comune     text,
  provincia  text,
  regione    text,
  indirizzo  text
);

create index if not exists palestre_candidate_lat_lon on public.palestre_candidate (lat, lon);

alter table public.palestre_candidate enable row level security;

-- Come cerca_palestre, sulle candidate. Si saltano quelle gia' in `palestre`
-- (stessa fonte) e quelle a meno di ~50 m da una palestra che c'e' gia'.
-- ponytail: "a meno di 50 m" = la stessa, anche se fossero due palestre nello
-- stesso palazzo; quella vera si aggiunge col pin.
drop function if exists public.cerca_candidate(text);
create function public.cerca_candidate(chiave text)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  with parole as (
    select array_remove(string_to_array(extensions.unaccent(lower(trim(chiave))), ' '), '') as p
  )
  select c.id, c.nome, c.comune, c.provincia, c.indirizzo, c.lat, c.lon
    from public.palestre_candidate c, parole
   where length(trim(chiave)) >= 2
     and not exists (
       select 1 from unnest(parole.p) w
        where not (extensions.unaccent(c.nome) ilike '%' || w || '%'
                   or extensions.unaccent(c.comune) ilike w || '%'
                   or (length(w) = 2 and c.provincia = upper(w))))
     and not exists (select 1 from public.palestre g where g.fonte_id = c.fonte_id)
     -- 0.00045° di lat ~ 50 m; di lon, in Italia, 0.0006°.
     and not exists (select 1 from public.palestre g
                      where g.lat between c.lat - 0.00045 and c.lat + 0.00045
                        and g.lon between c.lon - 0.0006 and c.lon + 0.0006)
   order by extensions.unaccent(c.nome) ilike extensions.unaccent(trim(chiave)) || '%' desc, c.nome
   limit 20;
$$;

revoke all on function public.cerca_candidate(text) from public, anon;
grant execute on function public.cerca_candidate(text) to authenticated;

-- Una candidata scelta diventa una palestra da approvare (o, se qualcuno l'ha
-- gia' presa, e' quella). Torna la riga: l'app poi la mette sul profilo
-- (scegliPalestra).
drop function if exists public.aggiungi_da_candidata(uuid);
create function public.aggiungi_da_candidata(p_id uuid)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Serve un account'; end if;
  insert into public.palestre (fonte_id, nome, lat, lon, comune, provincia, regione, indirizzo, creata_da, confermata)
  select c.fonte_id, c.nome, c.lat, c.lon, c.comune, c.provincia, c.regione, c.indirizzo, auth.uid(), false
    from public.palestre_candidate c
   where c.id = p_id
  on conflict (fonte_id) do nothing;
  return query
    select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
      from public.palestre g join public.palestre_candidate c on c.fonte_id = g.fonte_id
     where c.id = p_id;
end;
$$;

revoke all on function public.aggiungi_da_candidata(uuid) from public, anon;
grant execute on function public.aggiungi_da_candidata(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Il pin. Prima, se a meno di ~50 m c'e' gia' una palestra (anche una da
-- confermare di un altro), torna QUELLE con `esistente`, e non aggiunge
-- niente: l'app chiede "È una di queste?". Con `anche_se_vicine` aggiunge lo
-- stesso. Al massimo 2 al giorno a testa.
-- Comune, provincia e regione: quelli della palestra (o candidata) piu' vicina
-- entro 3 km.
-- ponytail: sul confine fra due comuni puo' prendere quello accanto;
-- scratchpad/palestre-completa.py, rilanciato, li rifa' dai confini ISTAT.
-- ---------------------------------------------------------------------------
drop function if exists public.aggiungi_palestra(text, double precision, double precision, text, boolean);
create function public.aggiungi_palestra(
  p_nome text, p_lat double precision, p_lon double precision, p_indirizzo text default null,
  anche_se_vicine boolean default false
)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision, esistente boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_indirizzo text := nullif(regexp_replace(trim(coalesce(p_indirizzo, '')), '\s+', ' ', 'g'), '');
  v_luogo record;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Serve un account'; end if;
  if length(v_nome) < 3 or length(v_nome) > 80 then raise exception 'Il nome va da 3 a 80 lettere'; end if;
  if length(v_indirizzo) > 120 then raise exception 'L''indirizzo è troppo lungo'; end if;
  if p_lat is null or p_lon is null or p_lat not between 35.4 and 47.1 or p_lon not between 6.6 and 18.6 then
    raise exception 'Il punto non è in Italia';
  end if;

  if not anche_se_vicine then
    return query
      select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon, true
        from public.palestre g
       where g.lat between p_lat - 0.00045 and p_lat + 0.00045
         and g.lon between p_lon - 0.0006 and p_lon + 0.0006
       limit 5;
    if found then return; end if;
  end if;

  if (select count(*) from public.palestre g
       where g.creata_da = auth.uid() and g.fonte_id like 'utente:%'
         and g.creata_il > now() - interval '1 day') >= 2 then
    raise exception 'Per oggi ne hai già aggiunte due: riprova domani';
  end if;

  -- 0.027° di lat ~ 3 km: il riquadro prima, poi la piu' vicina. Anche fra le
  -- candidate, che sono dieci volte di piu' (e hanno il comune dai confini).
  select g.comune, g.provincia, g.regione into v_luogo
    from (select comune, provincia, regione, lat, lon from public.palestre
          union all
          select comune, provincia, regione, lat, lon from public.palestre_candidate) g
   where g.comune is not null
     and g.lat between p_lat - 0.027 and p_lat + 0.027
     and g.lon between p_lon - 0.036 and p_lon + 0.036
   order by power(g.lat - p_lat, 2) + power((g.lon - p_lon) * cos(radians(p_lat)), 2)
   limit 1;

  insert into public.palestre (fonte_id, nome, lat, lon, comune, provincia, regione, indirizzo, creata_da, confermata)
  values ('utente:' || gen_random_uuid(), v_nome, p_lat, p_lon, v_luogo.comune, v_luogo.provincia, v_luogo.regione,
          v_indirizzo, auth.uid(), false)
  returning palestre.id into v_id;

  return query
    select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon, false
      from public.palestre g where g.id = v_id;
end;
$$;

revoke all on function public.aggiungi_palestra(text, double precision, double precision, text, boolean) from public, anon;
grant execute on function public.aggiungi_palestra(text, double precision, double precision, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- La moderazione (pages/ModerazionePage, "Palestre da approvare").
-- ---------------------------------------------------------------------------

-- Le palestre da approvare, dalla piu' vecchia: da dove vengono, chi l'ha
-- aggiunta e quanti ce l'hanno sul profilo.
drop function if exists public.palestre_da_approvare();
create function public.palestre_da_approvare()
returns table (
  id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision,
  fonte text, categoria text, aggiunta_da text, creata_il timestamptz, scelta_da int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.sono_moderatore() then
    raise exception 'Solo un moderatore approva le palestre' using errcode = '42501';
  end if;
  return query
    select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon,
           split_part(g.fonte_id, ':', 1), c.categoria, coalesce(nullif(p.username, ''), p.nome),
           g.creata_il, (select count(*)::int from public.profili q where q.palestra_id = g.id)
      from public.palestre g
      left join public.palestre_candidate c on c.fonte_id = g.fonte_id
      left join public.profili p on p.id = g.creata_da
     where not g.confermata
     order by g.creata_il;
end;
$$;

revoke all on function public.palestre_da_approvare() from public, anon;
grant execute on function public.palestre_da_approvare() to authenticated;

-- Approvata: la vedono tutti. Rifiutata: si cancella. In tutti e due i casi
-- un avviso a chi ce l'aveva sul profilo e a chi l'ha aggiunta (una volta
-- sola a testa); lo mostra AvvisiModerazione all'apertura dell'app.
drop function if exists public.decidi_palestra(uuid, boolean);
create function public.decidi_palestra(p_id uuid, approvata boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
begin
  if not public.sono_moderatore() then
    raise exception 'Solo un moderatore approva le palestre' using errcode = '42501';
  end if;
  select g.nome into v_nome from public.palestre g where g.id = p_id and not g.confermata;
  if v_nome is null then raise exception 'Palestra non trovata, o gia'' decisa' using errcode = '22023'; end if;

  insert into public.notifiche (user_id, tipo, titolo, testo)
  select u, case when approvata then 'palestra_approvata' else 'palestra_rifiutata' end,
         case when approvata then 'La tua palestra è sulla mappa' else 'La tua palestra non è stata aggiunta' end,
         case when approvata
              then '«' || v_nome || '» ora la vedono tutti, e chi si allena lì ti trova in «Vicino a te».'
              else '«' || v_nome || '» non l''abbiamo messa sulla mappa (il nome o il posto non tornavano), e dal tuo profilo l''abbiamo tolta. Puoi cercarla di nuovo in Cerca → Palestre, o aggiungerla col nome e il punto giusti.'
         end
    from (select q.id as u from public.profili q where q.palestra_id = p_id
          union
          select g.creata_da from public.palestre g where g.id = p_id and g.creata_da is not null) chi;

  if approvata then
    update public.palestre set confermata = true where id = p_id;
  else
    delete from public.palestre where id = p_id;
  end if;
end;
$$;

revoke all on function public.decidi_palestra(uuid, boolean) from public, anon;
grant execute on function public.decidi_palestra(uuid, boolean) to authenticated;
