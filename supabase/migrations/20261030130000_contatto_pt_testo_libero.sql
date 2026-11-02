-- ===========================================================================
-- 2026-10-30 — Contatto fra atleta e PT: niente messaggi automatici.
--
-- Chi contatta scrive quello che vuole, e il PT risponde con parole sue: il
-- testo arriva dall'app e diventa il messaggio in chat al posto delle frasi
-- fisse. Stesse funzioni di schema.sql e 20261028160000 con `p_testo` in piu':
-- quelle vecchie restano per le versioni dell'app gia' aperte.
--
-- ⚠️ Sono `security definer`: non passano dalla regola di scrittura di
-- `messaggi`, quindi l'account bloccato e il testo vuoto si fermano qui.
-- Il messaggio parte sempre: anche a contatto gia' aperto l'ha scritto qualcuno.
--
-- Additivo e rilanciabile, dopo 20261028160000.
-- ===========================================================================

create or replace function public.controlla_testo_contatto(p_testo text)
returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if public.account_bloccato(auth.uid()) then
    raise exception 'Account bloccato' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_testo, ''))) not between 1 and 4000 then
    raise exception 'Messaggio vuoto' using errcode = '22023';
  end if;
  return trim(p_testo);
end;
$$;
revoke all on function public.controlla_testo_contatto(text) from public, anon, authenticated;

-- L'atleta contatta un PT.
create or replace function public.contatta_pt(p_pt uuid, p_testo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_io  public.profili%rowtype;
  v_pt  public.profili%rowtype;
  v_testo text := public.controlla_testo_contatto(p_testo);
  v_stato text;
begin
  select * into v_io from public.profili where id = auth.uid();
  select * into v_pt from public.profili where id = p_pt;
  if v_pt.id is null or v_pt.ruolo <> 'pt' or public.bloccato_con(p_pt) then
    raise exception 'Non è un personal trainer' using errcode = '22023';
  end if;
  if p_pt = auth.uid() then
    raise exception 'Sei tu' using errcode = '22023';
  end if;
  if v_io.pt_id = p_pt then
    raise exception 'Ti segue già' using errcode = '22023';
  end if;

  insert into public.contatti_pt (atleta_id, pt_id) values (auth.uid(), p_pt)
  on conflict (atleta_id, pt_id) do update
     set stato = 'attesa', aggiornato_il = now()
   where public.contatti_pt.stato in ('rifiutato', 'declinato', 'accettato');
  insert into public.messaggi (id, da_id, a_id, testo)
  values (gen_random_uuid()::text, auth.uid(), p_pt, v_testo);
  select stato into v_stato from public.contatti_pt where atleta_id = auth.uid() and pt_id = p_pt;
  return v_stato;
end;
$$;
revoke all on function public.contatta_pt(uuid, text) from public, anon;
grant execute on function public.contatta_pt(uuid, text) to authenticated;

-- Il PT si propone a un atleta visto nel feed.
create or replace function public.contatta_atleta(p_atleta uuid, p_testo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_testo text := public.controlla_testo_contatto(p_testo);
  v_stato text;
begin
  if not public.posso_contattare_atleta(p_atleta) then
    raise exception 'Non contattabile' using errcode = '42501';
  end if;
  insert into public.contatti_pt (atleta_id, pt_id, stato, da_pt)
  values (p_atleta, auth.uid(), 'proposta', true)
  on conflict (atleta_id, pt_id) do update
     set stato = 'proposta', da_pt = true, aggiornato_il = now()
   where public.contatti_pt.stato in ('rifiutato', 'declinato', 'accettato');
  insert into public.messaggi (id, da_id, a_id, testo)
  values (gen_random_uuid()::text, auth.uid(), p_atleta, v_testo);
  select stato into v_stato from public.contatti_pt where atleta_id = p_atleta and pt_id = auth.uid();
  return v_stato;
end;
$$;
revoke all on function public.contatta_atleta(uuid, text) from public, anon;
grant execute on function public.contatta_atleta(uuid, text) to authenticated;

-- Il PT risponde: prende l'incarico o no, con parole sue.
create or replace function public.rispondi_contatto(p_atleta uuid, p_prendo boolean, p_testo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_testo text := public.controlla_testo_contatto(p_testo);
begin
  update public.contatti_pt
     set stato = case when p_prendo then 'proposta' else 'rifiutato' end, aggiornato_il = now()
   where atleta_id = p_atleta and pt_id = auth.uid() and stato = 'attesa';
  if not found then
    raise exception 'Nessun contatto in attesa' using errcode = '22023';
  end if;
  insert into public.messaggi (id, da_id, a_id, testo)
  values (gen_random_uuid()::text, auth.uid(), p_atleta, v_testo);
end;
$$;
revoke all on function public.rispondi_contatto(uuid, boolean, text) from public, anon;
grant execute on function public.rispondi_contatto(uuid, boolean, text) to authenticated;
