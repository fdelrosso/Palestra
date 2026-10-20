-- Le schede di lavoro del PT (2026-10-20). Da incollare nell'SQL Editor di
-- Supabase: e' idempotente. (E' anche in fondo a supabase/schema.sql.)
-- ===========================================================================
-- LE SCHEDE DI LAVORO DEL PT (2026-10-20)
--
-- Le schede che un PT scrive PER I SUOI ATLETI e non ha ancora mandato (o che
-- tiene per mandarle): Lavoro → "Schede di lavoro", linguetta "Da inviare".
-- Quelle gia' mandate sono le `schede_proposte` (linguetta "Inviate").
-- ⚠️ Separate apposta da `schede`: quelle sono le schede con cui il PT si
-- allena lui, nella sua parte "Personale", e qui non devono comparire (ne'
-- queste li', nel calendario, nel motore o nel feed).
-- Mandata a un atleta, la scheda di lavoro da cui e' partita si toglie da
-- qui (lo fa l'app): da quel momento e' fra le inviate.
-- Una riga per scheda, le vede e le scrive solo il PT.
-- ===========================================================================
create table if not exists public.schede_lavoro (
  id            text primary key,   -- vedi la nota su schede.id
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null default '',
  dati          jsonb not null check (octet_length(dati::text) <= 500000),
  creata_il     timestamptz not null default now(),
  aggiornata_il timestamptz not null default now()
);
create index if not exists schede_lavoro_user_idx on public.schede_lavoro (user_id, aggiornata_il);

alter table public.schede_lavoro enable row level security;

drop policy if exists "schede di lavoro: le mie" on public.schede_lavoro;
create policy "schede di lavoro: le mie" on public.schede_lavoro
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from public.profili where id = auth.uid() and ruolo = 'pt'));
