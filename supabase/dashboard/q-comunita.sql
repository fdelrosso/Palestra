-- Dashboard Palestra · dataset "comunita": conteggi di comunità e moderazione. Solo lettura.
select json_build_array(
  json_build_object('voce', 'Amicizie accettate', 'gruppo', 'social', 'valore', (select count(*) from public.relazioni where tipo = 'amicizia' and stato = 'accettata')),
  json_build_object('voce', 'Richieste di amicizia in attesa', 'gruppo', 'social', 'valore', (select count(*) from public.relazioni where tipo = 'amicizia' and stato = 'attesa')),
  json_build_object('voce', '…di cui in attesa da più di 3 giorni', 'gruppo', 'social', 'valore', (select count(*) from public.relazioni where tipo = 'amicizia' and stato = 'attesa' and creata_il < now() - interval '3 days')),
  json_build_object('voce', 'Foto e video negli allenamenti', 'gruppo', 'social', 'valore', (select count(*) from public.allenamento_foto)),
  json_build_object('voce', '…di cui pubblici', 'gruppo', 'social', 'valore', (select count(*) from public.allenamento_foto where visibilita = 'pubblica')),
  json_build_object('voce', 'Segnalazioni ricevute', 'gruppo', 'moderazione', 'valore', (select count(*) from public.segnalazioni)),
  json_build_object('voce', 'Segnalazioni ancora aperte', 'gruppo', 'moderazione', 'valore', (select count(*) from public.segnalazioni where decisa_il is null)),
  json_build_object('voce', 'Utenti con un richiamo', 'gruppo', 'moderazione', 'valore', (select count(*) from public.sanzioni where tolti > 0)),
  json_build_object('voce', 'Account o pubblicazioni bloccati', 'gruppo', 'moderazione', 'valore', (select count(*) from public.sanzioni where pubblicazione_bloccata or account_bloccato)),
  json_build_object('voce', 'Atleti seguiti da un PT', 'gruppo', 'pt', 'valore', (select count(*) from public.profili where pt_id is not null)),
  json_build_object('voce', 'Vetrine PT', 'gruppo', 'pt', 'valore', (select count(*) from public.vetrine_pt)),
  json_build_object('voce', 'Diete salvate', 'gruppo', 'pt', 'valore', (select count(*) from public.diete)),
  json_build_object('voce', 'Durata media allenamento (min)', 'gruppo', 'pt', 'valore', (
    select coalesce(round(avg((c->>'durataSec')::numeric) / 60), 0)
    from public.allenamenti a join public.schede s on s.id = a.scheda_id, lateral (select a.dati) as c(c)
    where (c->>'durataSec')::numeric between 300 and 14400))
) as righe;
