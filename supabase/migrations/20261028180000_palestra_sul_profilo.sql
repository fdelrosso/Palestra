-- ===========================================================================
-- CHI VEDE LA MIA PALESTRA (2026-10-28)
--
-- Si applica dopo 20261028120000_palestre_aggiunte.sql, ed e' rilanciabile.
-- Solo aggiunte: una colonna su `profili`, quattro funzioni.
-- ⚠️ Come le altre delle palestre, per ora SOLO sul progetto di sviluppo.
--
-- La propria palestra si vede sul profilo (pages/UtentePage) e nella riga
-- "📍" del recap dei propri allenamenti (lib/recap, pezziRecap). Chi la vede
-- lo sceglie ognuno (components/ChiVedePalestra), in Profilo → Tu e
-- nel profilo di Social:
--   'tutti'    chi apre il profilo o vede l'allenamento (di base);
--   'amici'    gli amici, il proprio PT e i propri atleti: la stessa cerchia
--              del cognome (profilo_pubblico);
--   'nessuno'  solo io.
-- Agli altri solo approvata, e mai a chi e' bloccato. La palestra degli altri
-- passa tutta da qui (`palestra_di`, `palestra_allenamento`): la tabella
-- `palestre` dice com'e' una palestra, non di chi e'.
-- `profilo_pubblico` resta com'e': sta in schema.sql, che e' in produzione.
-- ===========================================================================

alter table public.profili
  add column if not exists chi_vede_palestra text not null default 'tutti'
    check (chi_vede_palestra in ('tutti', 'amici', 'nessuno'));

-- Io posso vedere la palestra di `p_persona`?
create or replace function public.vedo_palestra_di(p_persona uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_persona = auth.uid()
      or exists (
        select 1 from public.profili p
         where p.id = p_persona
           and not public.bloccato_con(p.id)
           and (p.chi_vede_palestra = 'tutti'
                or (p.chi_vede_palestra = 'amici'
                    and (p.pt_id = auth.uid()
                         or p.id = (select pt_id from public.profili where id = auth.uid())
                         or exists (select 1 from public.relazioni r
                                     where r.stato = 'accettata'
                                       and ((r.da_id = auth.uid() and r.a_id = p.id)
                                         or (r.a_id = auth.uid() and r.da_id = p.id)))))));
$$;

revoke all on function public.vedo_palestra_di(uuid) from public, anon;
grant execute on function public.vedo_palestra_di(uuid) to authenticated;

-- La palestra di una persona, per il suo profilo.
drop function if exists public.palestra_di(uuid);
create function public.palestra_di(p_id uuid)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
    from public.profili p
    join public.palestre g on g.id = p.palestra_id
   where p.id = p_id
     and public.vedo_palestra_di(p.id)
     and (p.id = auth.uid() or g.confermata);
$$;

revoke all on function public.palestra_di(uuid) from public, anon;
grant execute on function public.palestra_di(uuid) to authenticated;

-- La palestra di un allenamento di `p_persona` (il suo `palestraId`), per la
-- riga del recap: la stessa regola del profilo. I propri allenamenti la
-- mostrano anche da approvare.
drop function if exists public.palestra_allenamento(uuid, uuid);
create function public.palestra_allenamento(p_persona uuid, p_palestra uuid)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
    from public.palestre g
   where g.id = p_palestra
     and public.vedo_palestra_di(p_persona)
     and (p_persona = auth.uid() or g.confermata);
$$;

revoke all on function public.palestra_allenamento(uuid, uuid) from public, anon;
grant execute on function public.palestra_allenamento(uuid, uuid) to authenticated;

-- Chi si allena in una palestra (pages/PalestraPage): solo chi la mostra a me,
-- io per primo, poi per nome. Degli altri solo approvata.
drop function if exists public.persone_della_palestra(uuid);
create function public.persone_della_palestra(p_palestra uuid)
returns table (id uuid, nome text, username text, foto text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.username, p.foto
    from public.profili p
    join public.palestre g on g.id = p.palestra_id
   where g.id = p_palestra
     and public.vedo_palestra_di(p.id)
     and (p.id = auth.uid() or g.confermata)
   order by p.id = auth.uid() desc, lower(coalesce(nullif(p.username, ''), p.nome))
   limit 300;
$$;

revoke all on function public.persone_della_palestra(uuid) from public, anon;
grant execute on function public.persone_della_palestra(uuid) to authenticated;
