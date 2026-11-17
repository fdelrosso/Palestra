-- ===========================================================================
-- QUANTE LETTURE CON L'AI AL GIORNO (2026-11-17, audit di sicurezza).
--
-- api/riscrivi (schede) e api/riscrivi-dieta (diete) chiamano Mistral per
-- chiunque abbia un account: senza un conto, uno script con un account solo
-- poteva finire la quota di Mistral per tutti. Ora al massimo N letture
-- RIUSCITE al giorno (ora italiana) per persona e per tipo; N lo decide la
-- funzione Vercel (api/_quotaAi.js), non sta qui.
--
-- Conta solo una lettura finita, ma senza lasciar passare le richieste in
-- parallelo: prima si PRENOTA un posto (riga 'in_corso', sotto un lucchetto per
-- persona e tipo, così 50 richieste insieme non passano tutte il controllo),
-- poi la funzione lo CHIUDE: 'fatta' se Mistral ha risposto, 'annullata' se no.
-- Una prenotazione rimasta 'in_corso' (funzione caduta a metà) smette di
-- contare dopo 10 minuti: la lettura più lunga (diete) ne dura al massimo 5.
--
-- ⚠️ La tabella non ha regole: la si tocca solo da queste due funzioni, che
-- guardano `auth.uid()`. Chi chiama `chiudi_ai` a mano non guadagna niente:
-- l'id della prenotazione non lo vede (resta dentro la funzione Vercel), e una
-- 'fatta' non torna mai 'annullata'.
--
-- Rilanciabile.
-- ===========================================================================

create table if not exists public.uso_ai (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  tipo      text not null check (tipo in ('scheda', 'dieta')),
  stato     text not null default 'in_corso' check (stato in ('in_corso', 'fatta', 'annullata')),
  creato_il timestamptz not null default now()
);
create index if not exists uso_ai_utente on public.uso_ai (user_id, tipo, creato_il);
alter table public.uso_ai enable row level security;

-- L'id della prenotazione, o null se oggi ne ha già usate `p_massimo`.
create or replace function public.prenota_ai(p_tipo text, p_massimo integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usate integer;
  v_id    uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  -- Una prenotazione alla volta per persona e tipo: il conto e l'inserimento
  -- non si mescolano con quelli di una richiesta parallela.
  perform pg_advisory_xact_lock(hashtext('uso_ai|' || auth.uid()::text || '|' || p_tipo));

  delete from public.uso_ai
   where user_id = auth.uid() and creato_il < now() - interval '2 days';

  select count(*) into v_usate
    from public.uso_ai
   where user_id = auth.uid()
     and tipo = p_tipo
     and (creato_il at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date
     and (stato = 'fatta' or (stato = 'in_corso' and creato_il > now() - interval '10 minutes'));
  if v_usate >= p_massimo then
    return null;
  end if;

  insert into public.uso_ai (user_id, tipo) values (auth.uid(), p_tipo)
  returning id into v_id;
  return v_id;
end;
$$;

-- 'fatta' vince sempre (anche su una 'annullata'); 'annullata' solo se ancora in corso.
create or replace function public.chiudi_ai(p_id uuid, p_fatta boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.uso_ai
     set stato = case when p_fatta then 'fatta' else 'annullata' end
   where id = p_id
     and user_id = auth.uid()
     and (p_fatta or stato = 'in_corso');
$$;

-- Solo chi ha un account (da `public` anche, se no anon la eredita da lì).
revoke execute on function public.prenota_ai(text, integer) from public, anon;
revoke execute on function public.chiudi_ai(uuid, boolean) from public, anon;
grant execute on function public.prenota_ai(text, integer) to authenticated;
grant execute on function public.chiudi_ai(uuid, boolean) to authenticated;
