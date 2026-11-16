-- ===========================================================================
-- LE PUSH FRA PT E ATLETA (2026-11-16): quello che il cuoricino già dice, anche
-- ad app chiusa. Più le due cose che il cuoricino non ha, perché hanno la loro
-- card: una scheda o una dieta nuova dal PT.
--
--   evento → trigger push_pt_evento → Edge Function invia-push → Firebase
--
-- Come per i mi piace (20261106120000_push_notifiche): il trigger dice solo
-- COSA è successo, a chi e da chi; `push_pt_da_inviare` decide se si manda
-- (blocchi, preferenze, telefoni) e la frase la scrive la funzione, la stessa
-- del cuoricino (supabase/functions/invia-push/frase.js).
--
-- A chi va, evento per evento (le regole sono quelle delle `notifiche_*`):
--   schede_proposte      nuova → atleta · settimane sbloccate → atleta
--   diete_proposte       nuova → atleta
--   rinnovi_scheda       chiesto → PT · risposto → atleta
--   allungamenti_scheda  chiesto → PT · risposto → atleta
--   modifiche_scheda     → atleta
--   allegati_pt_eventi   → atleta
--   appuntamenti         ogni mossa → l'altro
--   progressi            scatto aperto al PT → PT
--   progressi_commenti   → l'altro dei due
--   legami_pt_finiti     chi ha chiuso → l'altro
--   profili              nuovo atleta associato → PT
-- La scheda scaduta resta solo nel cuoricino: è il calendario a deciderla, non
-- una riga che cambia.
--
-- ⚠️ Senza `push_config` non parte niente. Il trigger non deve MAI impedire
-- quello che lo ha fatto scattare: un errore qui = niente notifica, e basta.
-- Solo aggiunte: rilanciabile.
-- ===========================================================================

-- La voce "PT e atleti" fra le preferenze push (components/PreferenzePush).
alter table public.push_preferenze add column if not exists pt boolean not null default true;

-- A chi mandare e col nome di chi. Vuoto = niente. Solo per la funzione.
create or replace function public.push_pt_da_inviare(p_dest uuid, p_chi uuid)
returns table (tokens text[], chi_nome text)
language sql stable security definer set search_path = public as $$
  select array_agg(t.token), (select p.nome from public.profili p where p.id = p_chi)
    from public.push_token t
   where t.user_id = p_dest
     and p_dest <> p_chi
     and not exists (select 1 from public.blocchi b
                      where (b.da_id = p_dest and b.a_id = p_chi) or (b.a_id = p_dest and b.da_id = p_chi))
     and not exists (select 1 from public.push_preferenze x where x.user_id = p_dest and not x.pt)
  having count(*) > 0;
$$;
revoke all on function public.push_pt_da_inviare(uuid, uuid) from public, anon, authenticated;
grant execute on function public.push_pt_da_inviare(uuid, uuid) to service_role;

-- Un solo trigger per tutte le tabelle: ognuna dice a chi, da chi e cosa.
-- `ev` ha i campi che leggono le frasi (genere, tipo, nome, scadenza,
-- settimane, ultimoTesto, giorno, ora, sonoPt, categoria) più `chiave` e `nota`.
create or replace function public.push_pt_evento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg  public.push_config;
  dest uuid;
  chi  uuid;
  ev   jsonb;
  pr   record;
begin
  select * into cfg from public.push_config limit 1;
  if cfg.url is null then return new; end if;

  case tg_table_name
  when 'schede_proposte' then
    if tg_op = 'INSERT' then
      dest := new.atleta_id; chi := new.pt_id;
      ev := jsonb_build_object('genere', 'proposta-scheda', 'nome', new.nome, 'chiave', new.id, 'nota', new.nota);
    elsif new.sbloccata_il is not null and new.sbloccata_il is distinct from old.sbloccata_il
          and new.stato in ('attesa', 'accettata') then
      dest := new.atleta_id; chi := new.pt_id;
      ev := jsonb_build_object('genere', 'scheda', 'tipo', 'sbloccata', 'nome', new.nome, 'chiave', new.id,
                               'settimane', new.settimane_visibili);
    end if;

  when 'diete_proposte' then
    dest := new.atleta_id; chi := new.pt_id;
    ev := jsonb_build_object('genere', 'proposta-dieta', 'nome', new.nome, 'chiave', new.id, 'nota', new.nota);

  when 'rinnovi_scheda', 'allungamenti_scheda' then
    select p.nome into pr from public.schede_proposte p where p.id = new.proposta_id;
    if tg_op = 'INSERT' then
      dest := new.pt_id; chi := new.atleta_id;
      ev := jsonb_build_object('tipo', case when tg_table_name = 'rinnovi_scheda' then 'richiesta' else 'allunga-richiesta' end,
                               'nota', new.nota);
    elsif new.stato <> 'attesa' and old.stato = 'attesa' then
      dest := new.atleta_id; chi := new.pt_id;
      ev := jsonb_build_object('tipo', case when tg_table_name = 'rinnovi_scheda' then new.stato else 'allunga-' || new.stato end,
                               'nota', new.risposta);
      if tg_table_name = 'rinnovi_scheda' then
        ev := ev || jsonb_build_object('scadenza', new.nuova_scadenza);
      else
        ev := ev || jsonb_build_object('settimane', new.settimane_aggiunte);
      end if;
    end if;
    ev := ev || jsonb_build_object('genere', 'scheda', 'nome', pr.nome, 'chiave', new.proposta_id);

  when 'modifiche_scheda' then
    select p.nome into pr from public.schede_proposte p where p.id = new.proposta_id;
    dest := new.atleta_id; chi := new.pt_id;
    ev := jsonb_build_object('genere', 'scheda', 'tipo', 'modificata', 'nome', pr.nome, 'chiave', new.proposta_id,
                             'nota', new.nota);

  when 'allegati_pt_eventi' then
    select p.nome into pr from public.schede_proposte p where p.id = new.proposta_id;
    dest := new.atleta_id; chi := new.pt_id;
    ev := jsonb_build_object('genere', 'scheda', 'tipo', 'allegato-' || new.cosa, 'nome', pr.nome,
                             'chiave', new.proposta_id, 'ultimoTesto', new.esercizio_nome || '|' || new.giorno_nome);

  when 'appuntamenti' then
    chi := new.ultimo_da;
    dest := case when new.ultimo_da = new.pt_id then new.atleta_id
                 when new.ultimo_da = new.atleta_id then new.pt_id end;
    ev := jsonb_build_object('genere', 'appuntamento', 'tipo', new.ultimo_tipo, 'chiave', new.id,
                             'giorno', new.giorno, 'ora', new.ora, 'sonoPt', dest = new.pt_id,
                             'nota', case when new.ultimo_tipo = 'richiesta' then new.motivo else '' end);

  when 'progressi' then
    if new.condivisa_il is not null and new.visibilita = 'pt' and new.caricato_da = new.atleta_id
       and (tg_op = 'INSERT' or new.condivisa_il is distinct from old.condivisa_il) then
      chi := new.atleta_id;
      select p.pt_id into dest from public.profili p where p.id = new.atleta_id;
      ev := jsonb_build_object('genere', 'check', 'tipo', 'condiviso', 'categoria', new.categoria,
                               'chiave', new.id, 'nota', new.nota);
    end if;

  when 'progressi_commenti' then
    select v.* into pr from public.progressi v where v.id = new.progresso_id;
    chi := new.autore_id;
    if new.autore_id = pr.atleta_id then
      if pr.visibilita = 'pt' then
        select p.pt_id into dest from public.profili p where p.id = pr.atleta_id;
      end if;
    else
      dest := pr.atleta_id;
    end if;
    ev := jsonb_build_object('genere', 'check', 'tipo', 'commento', 'categoria', pr.categoria,
                             'chiave', new.progresso_id, 'nota', new.testo);

  when 'legami_pt_finiti' then
    chi := new.finito_da;
    dest := case when new.finito_da = new.pt_id then new.atleta_id
                 when new.finito_da = new.atleta_id then new.pt_id end;
    ev := jsonb_build_object('genere', case when dest = new.atleta_id then 'pt-perso' else 'atleta-perso' end,
                             'chiave', new.atleta_id || '|' || new.pt_id);

  when 'profili' then
    if new.pt_id is not null and new.associato_il is not null
       and (tg_op = 'INSERT' or new.associato_il is distinct from old.associato_il) then
      dest := new.pt_id; chi := new.id;
      ev := jsonb_build_object('genere', 'nuovo-atleta', 'chiave', new.id);
    end if;

  else
    null;
  end case;

  if dest is null or chi is null or dest = chi or ev is null then return new; end if;
  perform net.http_post(
    url := cfg.url,
    body := jsonb_build_object('tipo', 'pt', 'destinatario', dest, 'autore', chi, 'evento', ev),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segreto', cfg.segreto)
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_pt_evento() from public, anon, authenticated;

drop trigger if exists push_pt on public.schede_proposte;
create trigger push_pt after insert or update of sbloccata_il on public.schede_proposte
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.diete_proposte;
create trigger push_pt after insert on public.diete_proposte
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.rinnovi_scheda;
create trigger push_pt after insert or update of stato on public.rinnovi_scheda
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.allungamenti_scheda;
create trigger push_pt after insert or update of stato on public.allungamenti_scheda
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.modifiche_scheda;
create trigger push_pt after insert on public.modifiche_scheda
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.allegati_pt_eventi;
create trigger push_pt after insert on public.allegati_pt_eventi
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.appuntamenti;
create trigger push_pt after insert or update of ultimo_il on public.appuntamenti
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.progressi;
create trigger push_pt after insert or update of condivisa_il on public.progressi
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.progressi_commenti;
create trigger push_pt after insert on public.progressi_commenti
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.legami_pt_finiti;
create trigger push_pt after insert or update of finito_il on public.legami_pt_finiti
  for each row execute function public.push_pt_evento();
drop trigger if exists push_pt on public.profili;
create trigger push_pt after insert or update of associato_il on public.profili
  for each row execute function public.push_pt_evento();
