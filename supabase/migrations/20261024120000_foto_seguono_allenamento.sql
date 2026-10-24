-- ===========================================================================
-- LE FOTO SEGUONO LA VISIBILITA' DEL LORO ALLENAMENTO (2026-10-24)
--
-- Si applica dopo 20261023180000_allenamenti_id.sql, ed e' rilanciabile.
--
-- Una foto nasce privata e la rendeva pubblica l'app, scegliendo "Chi lo
-- vede" (Riepilogo, allineaVisibilitaFotoAllenamento). Ma le foto si caricano
-- a "Termina" per conto loro, e lo sfondo al "Salva": quando la scelta
-- arrivava prima del caricamento, quella foto restava privata e gli altri nel
-- feed non la vedevano. Lo stesso per le foto rimaste in coda senza rete.
--
-- Qui la regola la tiene il database, in qualunque ordine arrivino:
--   · una foto nuova di un allenamento gia' pubblico nasce pubblica;
--   · un allenamento che diventa (o arriva) pubblico porta con se' le sue
--     foto, e uno che smette di esserlo le riporta private;
--   · le foto rimaste private di allenamenti gia' pubblici si sistemano.
-- Con la pubblicazione bloccata (MODERAZIONE) restano private, come vuole la
-- regola di scrittura di `allenamento_foto`.
-- La copia da feed (bucket `feed`) la fa sempre l'app del proprietario
-- (completaCopieFeed, a ogni accesso); finche' manca, chi guarda usa il link
-- firmato, che per una foto pubblica funziona.
-- ===========================================================================

create or replace function public.foto_nasce_come_allenamento()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.allenamenti a
              where a.id = new.allenamento_key
                and a.user_id = new.user_id
                and a.visibilita = 'pubblica')
     and not public.pubblicazione_bloccata(new.user_id) then
    new.visibilita := 'pubblica';
  end if;
  return new;
end;
$$;

revoke all on function public.foto_nasce_come_allenamento() from public, anon, authenticated;

-- ⚠️ Il nome conta: i trigger "before" girano in ordine alfabetico, e questo
-- deve venire DOPO `a_chiave_allenamento`, che gira la chiave vecchia sull'id.
drop trigger if exists foto_nasce_come_allenamento on public.allenamento_foto;
create trigger foto_nasce_come_allenamento before insert on public.allenamento_foto
  for each row execute function public.foto_nasce_come_allenamento();

create or replace function public.foto_seguono_allenamento()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_voluta text := case
    when new.visibilita = 'pubblica' and not public.pubblicazione_bloccata(new.user_id) then 'pubblica'
    else 'privata'
  end;
begin
  update public.allenamento_foto f
     set visibilita = v_voluta
   where f.allenamento_key = new.id
     and f.user_id = new.user_id
     and f.visibilita <> v_voluta;
  return null;
end;
$$;

revoke all on function public.foto_seguono_allenamento() from public, anon, authenticated;

drop trigger if exists foto_seguono_allenamento on public.allenamenti;
create trigger foto_seguono_allenamento after insert or update of visibilita on public.allenamenti
  for each row execute function public.foto_seguono_allenamento();

-- Quelle gia' rimaste indietro.
update public.allenamento_foto f
   set visibilita = 'pubblica'
  from public.allenamenti a
 where a.id = f.allenamento_key
   and a.user_id = f.user_id
   and a.visibilita = 'pubblica'
   and f.visibilita = 'privata'
   and not public.pubblicazione_bloccata(f.user_id);
