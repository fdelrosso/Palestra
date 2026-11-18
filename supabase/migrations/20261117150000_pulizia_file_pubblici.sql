-- ===========================================================================
-- LA PULIZIA DEI FILE PUBBLICI (2026-11-17, audit di sicurezza).
--
-- `feed` (le copie leggere delle foto pubbliche, lib/fotoAllenamento) e
-- `avatar` (le foto profilo) sono bucket PUBBLICI: chi ha l'indirizzo apre il
-- file senza account. Le copie le toglie solo l'app di chi le ha, e certe
-- strade non ci passano mai:
--   - un moderatore toglie una foto (decidi_segnalazione): la riga sparisce,
--     la copia da feed no — chi l'aveva vista la riapre per sempre;
--   - una foto nascosta da tre segnalazioni (in_attesa);
--   - la visibilità cambiata senza rete, poi rimessa privata dal trigger
--     foto_seguono_allenamento prima che l'app allinei le copie;
--   - foto profilo vecchie (di prima che l'app togliesse la precedente).
--
-- Ogni ora `pg_cron` chiama la Edge Function `pulisci-pubblici`, che chiede a
-- `file_pubblici_da_togliere` quali file non dovrebbero esserci e li toglie
-- con l'API dello Storage (da SQL Supabase non lascia cancellare file).
--
-- ⚠️ LE SICURE, perché togliere per sbaglio una copia che serve costa traffico
-- (il feed ripiega sulla foto intera col link firmato, e il telefono di chi
-- l'ha scaricherebbe l'originale per rifarla):
--   - le stesse regole dell'app: una copia serve finché la foto è pubblica e
--     non in attesa, `.mp4` compreso (la copia del video accanto al fotogramma);
--   - solo file più vecchi di 2 ore: niente di appena caricato, con la riga
--     magari non ancora scritta;
--   - al massimo 50 file per volta (lo dice la funzione);
--   - conta solo la riga del PROPRIETARIO (la cartella del file è il suo id):
--     se no chiunque, puntando la sua foto profilo o una sua riga a un file
--     altrui (una foto tolta dal moderatore), lo terrebbe in vita per sempre;
--   - la funzione di base SOLO ELENCA: toglie davvero solo col segreto
--     PULIZIA_ATTIVA=si (supabase/functions/pulisci-pubblici).
--
-- Si chiama come le push: indirizzo e segreto da `push_config` (stesso
-- progetto, stesso segreto). Senza quella riga non parte niente.
--
-- Rilanciabile.
-- ===========================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- I file pubblici che non dovrebbero esserci, i più vecchi prima.
create or replace function public.file_pubblici_da_togliere(p_limite integer default 50)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.bucket_id, o.name
    from storage.objects o
   where o.created_at < now() - interval '2 hours'
     and (
       (o.bucket_id = 'feed'
        and not exists (
          select 1 from public.allenamento_foto f
           where f.percorso = regexp_replace(o.name, '\.mp4$', '')
             and f.user_id::text = split_part(o.name, '/', 1)
             and f.visibilita = 'pubblica'
             and not public.in_attesa('foto', f.id)))
       or
       (o.bucket_id = 'avatar'
        and not exists (
          select 1 from public.profili p
           where right(p.foto, length(o.name) + 8) = '/avatar/' || o.name
             and p.id::text = split_part(o.name, '/', 1)))
     )
   order by o.created_at
   limit p_limite;
$$;

-- Solo la Edge Function (service_role): l'elenco dice quali file c'erano.
revoke execute on function public.file_pubblici_da_togliere(integer) from public, anon, authenticated;
grant execute on function public.file_pubblici_da_togliere(integer) to service_role;

-- La chiamata dell'ora: stessa funzione delle push, altro nome in fondo.
create or replace function public.chiama_pulizia_pubblici()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.push_config;
begin
  select * into cfg from public.push_config limit 1;
  if cfg.url is null then return; end if;
  perform net.http_post(
    url := regexp_replace(cfg.url, '/invia-push/?$', '/pulisci-pubblici'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segreto', cfg.segreto)
  );
end;
$$;

revoke execute on function public.chiama_pulizia_pubblici() from public, anon, authenticated;

-- Al minuto 17 di ogni ora (non allo scoccare, quando partono i cron di tutti).
-- Con lo stesso nome `cron.schedule` sostituisce: rilanciabile.
select cron.schedule('pulisci-pubblici', '17 * * * *', 'select public.chiama_pulizia_pubblici()');
