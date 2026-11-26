-- ---------------------------------------------------------------------------
-- 2026-11-25 · Il feed per chi NON ha un account (modalità ospite, pages/FeedOspite).
--
-- Gli allenamenti pubblici degli account pubblici, gli ultimi prima, 20 alla
-- volta: la stessa regola del link a un post (`post_pubblico`), su un elenco.
-- In più, `pubblico` chiesto esplicitamente: a chi non ha un account
-- `vedo_contenuti_di` farebbe vedere anche i PT che non si allenano.
-- Le foto: solo le pubbliche e non in attesa della moderazione, il percorso
-- della copia nel bucket `feed` (pubblico già da prima, lib/fotoAllenamento).
-- La palestra: NON si usa `dati_allenamento_per_me`. Senza utente
-- `vedo_palestra_di` risponde NULL (non false) per chi la mostra solo agli
-- amici o a nessuno, `not NULL` e' NULL e il suo CASE terrebbe `palestraId`.
-- Qui chi non ha un account la vede solo se `chi_vede_palestra = 'tutti'`
-- (come `post_pubblico`, che per anon e' la stessa regola), altrimenti
-- `palestraId` si toglie. E' l'unica cosa che quella funzione toglie.
-- Solo il nome, niente username: chi non ha un account non cerca persone.
-- Rilanciabile. Solo additiva.
-- ---------------------------------------------------------------------------

create or replace function public.feed_ospite(
  p_prima_di    timestamptz default null,
  p_prima_di_id text default null,
  p_quanti      int default 20
)
returns table (
  id        text,
  user_id   uuid,
  nome      text,
  scheda_id text,
  data      timestamptz,
  dati      jsonb,
  mi_piace  bigint,
  commenti  bigint,
  foto      jsonb
)
language sql stable security definer set search_path = public as $$
  select a.id,
         a.user_id,
         p.nome,
         a.scheda_id,
         a.data,
         case when p.chi_vede_palestra = 'tutti' then a.dati else a.dati - 'palestraId' end,
         (select count(*) from public.allenamento_mi_piace m where m.allenamento_key = a.id),
         (select count(*) from public.allenamento_commenti c
           where c.allenamento_key = a.id and not public.in_attesa('commento', c.id)),
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', f.id, 'percorso', f.percorso, 'tipo', f.tipo, 'nome', f.nome,
                    'posizione', f.posizione, 'visibilita', f.visibilita, 'allenamento_key', f.allenamento_key)
                  order by f.posizione)
             from public.allenamento_foto f
            where f.user_id = a.user_id
              and (f.allenamento_key = a.id or f.allenamento_key = a.chiave_vecchia)
              and f.visibilita = 'pubblica'
              and not public.in_attesa('foto', f.id)
         ), '[]'::jsonb)
    from public.allenamenti a
    join public.profili p on p.id = a.user_id
   where a.visibilita = 'pubblica'
     and not a.da_salvare
     and p.pubblico
     and not public.pubblicazione_bloccata(a.user_id)
     and (p_prima_di is null or (a.data, a.id) < (p_prima_di, p_prima_di_id))
   order by a.data desc, a.id desc
   limit least(greatest(coalesce(p_quanti, 20), 1), 50);
$$;

revoke all on function public.feed_ospite(timestamptz, text, int) from public;
grant execute on function public.feed_ospite(timestamptz, text, int) to anon, authenticated;
