// ---------------------------------------------------------------------------
// Toglie dai bucket pubblici `feed` e `avatar` i file che non dovrebbero più
// esserci. La chiama `pg_cron` ogni ora (migrations/20261117150000_pulizia_
// file_pubblici.sql, che spiega perché e con quali sicure); quali file lo
// decide `file_pubblici_da_togliere`, qui si tolgono con l'API dello Storage.
//
// ⚠️ DI BASE SOLO ELENCA. Toglie davvero solo con PULIZIA_ATTIVA=si: prima la
// si lascia girare un paio di giorni e si guarda cosa toglierebbe (la
// risposta resta qualche ora in `net._http_response`).
//
// Segreti della funzione (mai nel repo, né nell'app):
//   PUSH_SEGRETO    lo stesso di push_config: dice che chiama il database
//   PULIZIA_ATTIVA  'si' per togliere davvero; senza, solo l'elenco
// Si pubblica con --no-verify-jwt: chi chiama è il database, col suo segreto.
// ---------------------------------------------------------------------------

const { Deno } = globalThis as any // gira su Deno: il controllo del codice non lo conosce

const MASSIMO = 50

Deno.serve(async (req) => {
  const segreto = Deno.env.get('PUSH_SEGRETO')
  if (!segreto || req.headers.get('x-push-segreto') !== segreto) return new Response('no', { status: 401 })

  const base = Deno.env.get('SUPABASE_URL')!
  const servizio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const conServizio = { apikey: servizio, Authorization: `Bearer ${servizio}`, 'Content-Type': 'application/json' }

  const r = await fetch(`${base}/rest/v1/rpc/file_pubblici_da_togliere`, {
    method: 'POST',
    headers: conServizio,
    body: JSON.stringify({ p_limite: MASSIMO }),
  })
  if (!r.ok) {
    console.error('elenco non riuscito', r.status, await r.text())
    return Response.json({ errore: `elenco ${r.status}` }, { status: 502 })
  }
  const file: { bucket_id: string; name: string }[] = await r.json()

  const attiva = Deno.env.get('PULIZIA_ATTIVA') === 'si'
  const tolti: Record<string, number | string> = {}
  if (attiva) {
    for (const bucket of new Set(file.map((f) => f.bucket_id))) {
      const nomi = file.filter((f) => f.bucket_id === bucket).map((f) => f.name)
      // Come `storage.from(bucket).remove(nomi)` di supabase-js.
      const d = await fetch(`${base}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: conServizio,
        body: JSON.stringify({ prefixes: nomi }),
      })
      tolti[bucket] = d.ok ? (await d.json()).length : `errore ${d.status}`
    }
  }

  const esito = { attiva, trovati: file.length, tolti, file }
  console.log(JSON.stringify({ attiva, trovati: file.length, tolti }))
  return Response.json(esito)
})
