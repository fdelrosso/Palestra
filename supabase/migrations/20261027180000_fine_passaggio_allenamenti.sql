-- ===========================================================================
-- FINE DEL PASSAGGIO DEGLI ALLENAMENTI (2026-10-27)
--
-- Si applica dopo 20261023180000_allenamenti_id.sql, ed e' rilanciabile.
--
-- Dalla 105ª/106ª gli allenamenti stanno in `allenamenti`, con un id vero. Per
-- le app rimaste indietro c'erano: il trigger che ricopiava i `completamenti`
-- del json di una scheda, i ponti che giravano la chiave vecchia
-- ('<schedaId>|<data>') sull'id nuovo, e `sposta_interazioni`. Controllato in
-- produzione il 2026-10-27: dal 24/10 nessuna riga nuova da un'app vecchia, e
-- l'unica scheda salvata ancora col json vecchio (24/10) ha il suo solo
-- allenamento gia' in tabella. Si tolgono.
--
-- Restano `chiave_vecchia` e `id_allenamento`: i link gia' condivisi
-- (/post/<chiave vecchia>) devono continuare ad aprirsi.
--
-- ⚠️ Le migrazioni di prima, rilanciate con `npm run db -- --schema`, rimettono
-- trigger e funzioni: questa viene dopo (ordine di nome) e li ritoglie.
-- ===========================================================================

drop trigger if exists scheda_specchia_completamenti on public.schede;
drop function if exists public.scheda_specchia_completamenti();
drop function if exists public.specchia_completamenti(text, uuid, jsonb);

drop trigger if exists a_chiave_allenamento on public.allenamento_mi_piace;
drop trigger if exists a_chiave_allenamento on public.allenamento_commenti;
drop trigger if exists a_chiave_allenamento on public.allenamento_foto;
drop function if exists public.a_chiave_allenamento();

drop trigger if exists a_allenamento_chiave_vecchia on public.allenamenti;
drop function if exists public.a_allenamento_chiave_vecchia();

drop function if exists public.sposta_interazioni(text, text);

-- La storia vecchia rimasta nel json delle schede mai piu' salvate: la copia
-- vera e' in `allenamenti`, l'app la toglie gia' a ogni salvataggio.
update public.schede set dati = dati - 'completamenti' where dati ? 'completamenti';
