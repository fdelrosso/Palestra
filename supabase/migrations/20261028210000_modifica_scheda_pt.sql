-- ===========================================================================
-- 2026-10-28 — Il PT modifica quando vuole la scheda mandata a un atleta.
--
-- Come l'allungamento (20261028180000), ma senza richiesta: il PT riapre la
-- scheda nell'editor, cambia quello che vuole e la rimanda. La scheda nuova
-- prende il posto di quella della proposta; sul telefono dell'atleta la
-- copia si aggiorna da sola (lib/proposteScheda → allungamentiArrivati, che
-- guarda `allungata_il`: da qui vuol dire "aggiornata dal PT"). Gli
-- allenamenti fatti e gli allegati dell'atleta restano.
--
-- Se l'atleta l'ha gia' salvata gli arriva la notifica con COSA e' cambiato:
-- l'elenco lo scrive l'app del PT (lib/cambiScheda), qui si conserva.
--
-- Additivo e rilanciabile, dopo 20261028180000.
-- ===========================================================================

create table if not exists public.modifiche_scheda (
  id           uuid primary key default gen_random_uuid(),
  proposta_id  text not null references public.schede_proposte(id) on delete cascade,
  pt_id        uuid not null references auth.users(id) on delete cascade,
  atleta_id    uuid not null references auth.users(id) on delete cascade,
  -- Una riga per cambiamento, gia' in parole ("Giorno A: aggiunto Dip").
  cambi        text not null default '' check (char_length(cambi) <= 2000),
  nota         text not null default '' check (char_length(nota) <= 1000),
  creata_il    timestamptz not null default now()
);
create index if not exists modifiche_scheda_atleta_idx on public.modifiche_scheda (atleta_id, creata_il);

alter table public.modifiche_scheda enable row level security;
drop policy if exists "modifiche scheda: le mie" on public.modifiche_scheda;
create policy "modifiche scheda: le mie" on public.modifiche_scheda
  for select to authenticated
  using (pt_id = auth.uid() or atleta_id = auth.uid());

-- `p_intera` la scheda nuova intera, `p_dati` quella che vede l'atleta (uguale,
-- o tagliata alle settimane sbloccate di una scheda a parti), `p_totali` e
-- `p_visibili` le settimane (null per una scheda non a parti).
create or replace function public.modifica_proposta(
  p_id text, p_intera jsonb, p_dati jsonb,
  p_totali int default null, p_visibili int default null,
  p_cambi text default '', p_nota text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.schede_proposte;
begin
  select * into v_p from public.schede_proposte
   where id = p_id and pt_id = auth.uid() and stato in ('attesa', 'accettata');
  if not found then
    raise exception 'Nessuna proposta da aggiornare' using errcode = '22023';
  end if;
  if p_intera is null or jsonb_typeof(p_intera) <> 'object' or octet_length(p_intera::text) > 500000
     or p_dati is null or jsonb_typeof(p_dati) <> 'object' or octet_length(p_dati::text) > 500000 then
    raise exception 'Scheda troppo grande' using errcode = '22023';
  end if;
  if v_p.settimane_totali is not null
     and (p_totali is null or p_visibili is null or p_visibili < 1 or p_visibili > p_totali) then
    raise exception 'Parti non valide' using errcode = '22023';
  end if;

  update public.schede_proposte
     set dati = p_dati,
         settimane_totali = case when v_p.settimane_totali is null then null else p_totali end,
         settimane_visibili = case when v_p.settimane_totali is null then null else p_visibili end,
         allungata_il = now()
   where id = p_id;
  if v_p.settimane_totali is not null then
    insert into public.schede_proposte_intere (proposta_id, pt_id, dati)
    values (p_id, auth.uid(), p_intera)
    on conflict (proposta_id) do update set dati = excluded.dati;
  end if;
  if v_p.stato = 'accettata' then
    insert into public.modifiche_scheda (proposta_id, pt_id, atleta_id, cambi, nota)
    values (p_id, auth.uid(), v_p.atleta_id, left(coalesce(p_cambi, ''), 2000), left(coalesce(p_nota, ''), 1000));
  end if;
end;
$$;
revoke all on function public.modifica_proposta(text, jsonb, jsonb, int, int, text, text) from public, anon;
grant execute on function public.modifica_proposta(text, jsonb, jsonb, int, int, text, text) to authenticated;

-- Le notifiche dell'atleta, stessa forma di `notifiche_rinnovi()`: tipo
-- 'modificata', in `testo` i cambi (una riga ciascuno) e il messaggio del PT
-- dopo una riga vuota.
create or replace function public.notifiche_modifiche_scheda()
returns table (
  proposta_id text,
  atleta_id   uuid,
  scheda_nome text,
  tipo        text,
  chi_nome    text,
  quando      timestamptz,
  testo       text,
  scadenza    date,
  settimane   int,
  nuovo       boolean
)
language sql stable security definer set search_path = public as $$
  with letto as (
    select coalesce(
      (select n.letto_il from public.notifiche_lette n where n.user_id = auth.uid()),
      '-infinity'::timestamptz) as il
  )
  select m.proposta_id, m.atleta_id, p.nome, 'modificata'::text, pc.nome,
         m.creata_il, m.cambi || case when m.nota <> '' then E'\n\n' || m.nota else '' end,
         null::date, null::int, m.creata_il > (select il from letto)
    from public.modifiche_scheda m
    join public.schede_proposte p on p.id = m.proposta_id
    join public.profili pc on pc.id = m.pt_id
   where m.atleta_id = auth.uid()
     and not public.bloccato_con(m.pt_id)
   order by m.creata_il desc
   limit 100;
$$;
revoke all on function public.notifiche_modifiche_scheda() from public, anon;
grant execute on function public.notifiche_modifiche_scheda() to authenticated;
