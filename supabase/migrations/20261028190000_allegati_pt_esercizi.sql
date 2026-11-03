-- ===========================================================================
-- 2026-10-28 — Video (e foto, e consigli scritti) del PT sugli esercizi di
-- una scheda mandata a un atleta.
--
-- Gli allegati di un esercizio esistono gia' (`media`, schema.sql: il file nel
-- bucket `media`, nella scheda il MediaRef in `esercizio.media`, i commenti in
-- `esercizio.commenti`). Due cose mancavano:
--
--   1. l'atleta non poteva SCARICARE il file del PT: la regola
--      (`posso_scaricare_media`) guarda la scheda in cui sta il media, e la
--      scheda del PT per l'atleta non e' una riga di `schede` ma una proposta.
--      Qui una regola in piu' (le policy si sommano): un media del PT si
--      scarica se sta in una scheda che quel PT ha mandato a me.
--   2. allegare DOPO l'invio: `aggiorna_allegati_proposta`, che riscrive la
--      scheda della proposta (la fa l'app del PT, come lo sblocco a parti) e,
--      se l'atleta l'ha gia' salvata, lascia la notifica: quale esercizio, in
--      quale giorno. Sul telefono dell'atleta gli allegati arrivano da soli
--      (lib/proposteScheda → allegatiArrivati, guardando `allegati_il`).
--
-- Additivo e rilanciabile, dopo 20261028180000.
-- ===========================================================================

alter table public.schede_proposte add column if not exists allegati_il timestamptz;

-- --- 1. Scaricare il file del PT --------------------------------------------
-- Il media e' del PT (la cartella), e il suo id sta scritto nella scheda di
-- una proposta di quel PT a me, ancora viva. L'id e' un uuid: cercarlo nel
-- testo della scheda non da' falsi positivi.
create or replace function public.posso_vedere_allegato_pt(percorso_file text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.media m
      join public.schede_proposte p on p.pt_id = m.user_id
     where m.percorso = percorso_file
       and p.atleta_id = auth.uid()
       and p.stato in ('attesa', 'accettata')
       and strpos(p.dati::text, m.id) > 0
  );
$$;
revoke all on function public.posso_vedere_allegato_pt(text) from public, anon;
grant execute on function public.posso_vedere_allegato_pt(text) to authenticated;

drop policy if exists "media: gli allegati del PT al suo atleta" on storage.objects;
create policy "media: gli allegati del PT al suo atleta" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.posso_vedere_allegato_pt(name));


-- --- 2. Allegare dopo l'invio -------------------------------------------------
-- Una riga per allegato aggiunto a una scheda gia' salvata dall'atleta: e' la
-- sua notifica. `cosa`: 'video' | 'foto' | 'consiglio'.
create table if not exists public.allegati_pt_eventi (
  id             uuid primary key default gen_random_uuid(),
  proposta_id    text not null references public.schede_proposte(id) on delete cascade,
  pt_id          uuid not null references auth.users(id) on delete cascade,
  atleta_id      uuid not null references auth.users(id) on delete cascade,
  giorno_nome    text not null default '' check (char_length(giorno_nome) <= 80),
  esercizio_nome text not null default '' check (char_length(esercizio_nome) <= 120),
  cosa           text not null default 'video' check (cosa in ('video', 'foto', 'consiglio')),
  creato_il      timestamptz not null default now()
);
create index if not exists allegati_pt_eventi_atleta_idx on public.allegati_pt_eventi (atleta_id, creato_il);

alter table public.allegati_pt_eventi enable row level security;
drop policy if exists "allegati pt: i miei" on public.allegati_pt_eventi;
create policy "allegati pt: i miei" on public.allegati_pt_eventi
  for select to authenticated
  using (pt_id = auth.uid() or atleta_id = auth.uid());

-- Il PT riscrive la scheda con l'allegato nuovo: `p_dati` quella che vede
-- l'atleta, `p_intera` (facoltativa) quella intera di una scheda a parti.
-- `p_cosa` vuota = ha solo tolto qualcosa: niente notifica.
create or replace function public.aggiorna_allegati_proposta(
  p_id text, p_dati jsonb, p_intera jsonb default null,
  p_giorno text default '', p_esercizio text default '', p_cosa text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.schede_proposte;
begin
  select * into v_p from public.schede_proposte
   where id = p_id and pt_id = auth.uid() and stato in ('attesa', 'accettata');
  if not found then
    raise exception 'Nessuna proposta da aggiornare' using errcode = '22023';
  end if;
  if p_dati is null or jsonb_typeof(p_dati) <> 'object' or octet_length(p_dati::text) > 500000
     or (p_intera is not null and (jsonb_typeof(p_intera) <> 'object' or octet_length(p_intera::text) > 500000)) then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  update public.schede_proposte set dati = p_dati, allegati_il = now() where id = p_id;
  if p_intera is not null then
    update public.schede_proposte_intere set dati = p_intera where proposta_id = p_id;
  end if;
  if v_p.stato = 'accettata' and coalesce(p_cosa, '') in ('video', 'foto', 'consiglio') then
    insert into public.allegati_pt_eventi (proposta_id, pt_id, atleta_id, giorno_nome, esercizio_nome, cosa)
    values (p_id, auth.uid(), v_p.atleta_id, left(coalesce(p_giorno, ''), 80), left(coalesce(p_esercizio, ''), 120), p_cosa);
  end if;
end;
$$;
revoke all on function public.aggiorna_allegati_proposta(text, jsonb, jsonb, text, text, text) from public, anon;
grant execute on function public.aggiorna_allegati_proposta(text, jsonb, jsonb, text, text, text) to authenticated;

-- Le notifiche dell'atleta, stessa forma di `notifiche_rinnovi()`: tipo
-- 'allegato-video' | 'allegato-foto' | 'allegato-consiglio', e in `testo`
-- "esercizio|giorno" (lib/notifiche li separa).
create or replace function public.notifiche_allegati_pt()
returns table (
  proposta_id text,
  atleta_id   uuid,
  scheda_nome text,
  tipo        text,
  chi_nome    text,
  quando      timestamptz,
  testo       text,
  scadenza    date,
  settimane   int,
  nuovo       boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select e.proposta_id, e.atleta_id, p.nome, 'allegato-' || e.cosa, pc.nome,
         e.creato_il, e.esercizio_nome || '|' || e.giorno_nome, null::date, null::int,
         e.creato_il > (select il from letto)
    from public.allegati_pt_eventi e
    join public.schede_proposte p on p.id = e.proposta_id
    join public.profili pc on pc.id = e.pt_id
   where e.atleta_id = auth.uid()
     and not public.bloccato_con(e.pt_id)
   order by e.creato_il desc
   limit 100;
$$;
revoke all on function public.notifiche_allegati_pt() from public, anon;
grant execute on function public.notifiche_allegati_pt() to authenticated;
