-- ===========================================================================
-- LA PALESTRA SUL PROFILO (2026-10-28)
--
-- Si applica dopo 20261028120000_palestre_aggiunte.sql, ed e' rilanciabile.
-- Solo aggiunte: una colonna su `profili`, una funzione.
-- ⚠️ Come le altre delle palestre, per ora SOLO sul progetto di sviluppo.
--
-- La propria palestra si vede sul profilo pubblico (pages/UtentePage) di chi
-- puo' aprirlo, a meno di spegnere "Mostrala sul mio profilo" (Cerca →
-- Palestre, il foglio della propria): `mostra_palestra`, accesa di base.
-- Dagli altri: solo approvata, e mai a chi e' bloccato. La palestra degli
-- altri non si legge da `profili` (la regola "vedo i profili" non lo vieta,
-- ma `palestre` sì per quelle da approvare): passa tutto da qui.
-- `profilo_pubblico` resta com'e': sta in schema.sql, che e' in produzione.
-- ===========================================================================

alter table public.profili
  add column if not exists mostra_palestra boolean not null default true;

drop function if exists public.palestra_di(uuid);
create function public.palestra_di(p_id uuid)
returns table (id uuid, nome text, comune text, provincia text, indirizzo text, lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select g.id, g.nome, g.comune, g.provincia, g.indirizzo, g.lat, g.lon
    from public.profili p
    join public.palestre g on g.id = p.palestra_id
   where p.id = p_id
     and (p.id = auth.uid() or (p.mostra_palestra and g.confermata and not public.bloccato_con(p.id)));
$$;

revoke all on function public.palestra_di(uuid) from public, anon;
grant execute on function public.palestra_di(uuid) to authenticated;
