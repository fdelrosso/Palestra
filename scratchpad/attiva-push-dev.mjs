// Accende le notifiche push sul database di DEV (palestra-test): due segreti alla
// funzione invia-push, e lo stesso segreto in push_config. Non stampa mai i segreti.
//   node --env-file=.env scratchpad/attiva-push-dev.mjs
// Si rifiuta di girare su qualunque altro progetto. Si può rilanciare.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import pg from 'pg'

const DEV = 'xfdzhiolqpcqekhvtpyw'
const url = process.env.DEV_DATABASE_URL
if (!url?.includes(DEV)) throw new Error('DEV_DATABASE_URL non è il database di dev.')

const cartella = process.env.CHIAVE_FIREBASE_DIR || '/mnt/c/Users/Pc/Downloads'
const chiavi = fs.readdirSync(cartella).filter((f) => f.includes('firebase-adminsdk') && f.endsWith('.json'))
if (chiavi.length !== 1) throw new Error(`Mi aspetto una sola chiave Firebase in ${cartella}, ne vedo ${chiavi.length}.`)
const sa = JSON.parse(fs.readFileSync(path.join(cartella, chiavi[0]), 'utf8'))
if (sa.type !== 'service_account' || !sa.private_key) throw new Error('Il file non è una chiave Firebase.')
const segreto = randomBytes(32).toString('hex')

const copri = (t) => t.replaceAll(segreto, '[segreto]').replace(/-----BEGIN[\s\S]*?(-----END[^"]*|$)/g, '[chiave]')

// Coi segreti scritti direttamente, senza passare da un file .env da interpretare.
const r = spawnSync(
  'npx',
  ['--yes', 'supabase', 'secrets', 'set', `--remote=${DEV}`, '--yes', `PUSH_SEGRETO=${segreto}`, `FIREBASE_SERVICE_ACCOUNT=${JSON.stringify(sa)}`],
  { encoding: 'utf8' },
)
if (r.status !== 0) {
  console.error('Segreti NON impostati:\n' + copri(`${r.stdout}\n${r.stderr}`).slice(-1500))
  process.exit(1)
}
console.log('✓ segreti impostati su palestra-test')

const c = new pg.Client({ connectionString: url.split('?')[0], ssl: { ca: fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') } })
await c.connect()
const fn = `https://${DEV}.supabase.co/functions/v1/invia-push`
await c.query('insert into public.push_config (url,segreto) values ($1,$2) on conflict (unica) do update set url=excluded.url, segreto=excluded.segreto', [fn, segreto])
await c.end()
console.log('✓ push_config aggiornata su dev')

// I segreti nuovi arrivano alla funzione dopo qualche secondo.
await new Promise((ok) => setTimeout(ok, 8000))
const prova = await fetch(fn, {
  method: 'POST',
  headers: { 'x-push-segreto': segreto, 'Content-Type': 'application/json' },
  body: JSON.stringify({ tipo: 'commento', allenamento_key: 'non-esiste', autore: '00000000-0000-4000-8000-000000000001' }),
})
console.log(`funzione: ${prova.status} ${prova.status === 200 ? '✓ tutto a posto' : '✗ qualcosa non va, dillo a Claude'}`)
console.log(`Ora puoi cancellare la chiave da ${os.platform() === 'linux' ? 'Downloads' : cartella}.`)
