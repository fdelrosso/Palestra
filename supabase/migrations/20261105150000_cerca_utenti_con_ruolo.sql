-- ---------------------------------------------------------------------------
-- La ricerca col ruolo, e per nome e cognome (2026-11-05). Dopo
-- 20261105140000_account_privato (`profili.pubblico`).
--
-- Cerca ha tre linguette, Atleti / PT / Palestre: chi è "Tutti e due" compare
-- in entrambe, gli altri in una sola. Per smistarli serve il ruolo, che
-- `cerca_utenti` non dà. `ruolo`: 'atleta', 'pt' (solo PT) o 'entrambi', lo
-- stesso che già dice `e_solo_pt` di chiunque.
--
-- Chi si trova, e come (come su Instagram):
--   · un account PUBBLICO per username, per codice, e per un pezzo di nome e
--     cognome ("mar", "rossi", "mario ros"). Il suo cognome lo vedono tutti
--     (`profilo_pubblico`), quindi torna anche qui.
--   · un account PRIVATO solo per username e per codice. Mai per nome, e il
--     nome (a chi non è nella sua cerchia) e il cognome non tornano: si vede
--     solo l'username. ⚠️ Il nome a pezzi è la ragione per cui `cerca_utenti` vietava i
--     pezzi di nome: l'elenco degli iscritti a forza di lettere. Ora si può
--     avere, ma solo di chi ha scelto di essere pubblico.
--   · un PT (solo PT o "Tutti e due") è sempre pubblico DA PT: si trova per
--     nome, con nome e cognome. Privato vale solo da atleta
--     (20261105140000): chi è "Tutti e due", privato, e trovato solo per nome
--     torna con ruolo 'pt', cioè solo nella linguetta PT.
--
-- Una funzione nuova accanto (come `amici_suggeriti_con_username`) invece di
-- cambiare il tipo di `cerca_utenti`: schema.sql la ricrea col tipo vecchio e
-- si romperebbe. Il corpo è il suo, più il nome. Rilanciabile.
-- ---------------------------------------------------------------------------

drop function if exists public.cerca_utenti_con_ruolo(text);
create function public.cerca_utenti_con_ruolo(chiave text)
returns table (id uuid, nome text, cognome text, username text, come text, ruolo text)
language sql stable security definer set search_path = public as $$
  with c as (
    select p.*,
           (p.pubblico or p.ruolo = 'pt') and strpos(
             lower(trim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, ''))),
             lower(trim(chiave))) > 0 as per_nome
      from public.profili p
  ),
  c2 as (
    select c.*,
           c.username like '%' || lower(trim(regexp_replace(chiave, '^@', ''))) || '%'
             or upper(trim(chiave)) in (c.codice_amico, c.codice_pt) as per_maniglia,
           c.pubblico or c.ruolo = 'pt' as aperto
      from c
  )
  -- Di un privato fuori dalla mia cerchia (`vedo_contenuti_di`) solo
  -- l'username; il nome resta solo a chi un username non ce l'ha ancora.
  select c.id,
         case when c.aperto or coalesce(c.username, '') = '' or public.vedo_contenuti_di(c.id)
              then c.nome else '' end,
         case when c.aperto then c.cognome end,
         c.username,
         case
           when upper(trim(chiave)) in (c.codice_amico, c.codice_pt) then 'codice'
           when c.username like '%' || lower(trim(regexp_replace(chiave, '^@', ''))) || '%' then 'username'
           else 'nome'
         end,
         case
           when c.ruolo is distinct from 'pt' then 'atleta'
           when coalesce(c.si_allena, true)
                and (c.pubblico or c.per_maniglia or public.vedo_contenuti_di(c.id)) then 'entrambi'
           else 'pt'
         end
    from c2 c
   where c.id <> auth.uid()
     and length(trim(chiave)) >= 2
     and not public.bloccato_con(c.id)
     and (
       c.username like '%' || lower(trim(regexp_replace(chiave, '^@', ''))) || '%'
       or upper(trim(chiave)) = c.codice_amico
       or upper(trim(chiave)) = c.codice_pt
       or c.per_nome
     )
   -- Prima chi ha l'username che comincia così, poi chi ha il nome che
   -- comincia così, poi il resto.
   order by (c.username like lower(trim(regexp_replace(chiave, '^@', ''))) || '%') desc,
            (lower(c.nome) like lower(trim(chiave)) || '%') desc,
            length(c.username), c.username
   limit 20;
$$;

revoke all on function public.cerca_utenti_con_ruolo(text) from public, anon;
grant execute on function public.cerca_utenti_con_ruolo(text) to authenticated;
