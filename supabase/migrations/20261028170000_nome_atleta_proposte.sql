-- ===========================================================================
-- 2026-10-28 — Di chi era la scheda mandata, anche dopo che il legame finisce.
--
-- Quando un atleta smette di farsi seguire, il PT non legge piu' il suo
-- profilo (la regola su `profili` vale per chi e' legato), e fra le schede
-- inviate restava "Un ex atleta". Il nome si tiene sulla proposta: lo scrive
-- il database a ogni invio (trigger), e qui si riempiono quelle di prima.
-- Il nome del PT, dall'altra parte, l'atleta ce l'ha gia' nella sua scheda
-- (`daPt.nome`, lib/proposteScheda).
--
-- Additivo e rilanciabile.
-- ===========================================================================

alter table public.schede_proposte
  add column if not exists atleta_nome text not null default '';

create or replace function public.schede_proposte_nome_atleta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(nullif(trim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, '')), ''), p.username, '')
    into new.atleta_nome
    from public.profili p
   where p.id = new.atleta_id;
  new.atleta_nome := coalesce(new.atleta_nome, '');
  return new;
end;
$$;

drop trigger if exists schede_proposte_nome_atleta on public.schede_proposte;
create trigger schede_proposte_nome_atleta
  before insert on public.schede_proposte
  for each row execute function public.schede_proposte_nome_atleta();

update public.schede_proposte s
   set atleta_nome = coalesce(nullif(trim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, '')), ''), p.username, '')
  from public.profili p
 where p.id = s.atleta_id and s.atleta_nome = '';
