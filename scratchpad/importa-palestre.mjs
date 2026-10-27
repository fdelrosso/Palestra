// Carica in `public.palestre` le palestre italiane di OpenStreetMap
// (leisure=fitness_centre), una volta, a mano:
//
//     node --env-file=.env scratchpad/importa-palestre.mjs
//
// Le scarica da Overpass, scrive un .sql nella cartella temporanea e lo passa
// a `npm run db -- --file`, che fa connessione, certificato e transazione.
// Rilanciabile: le palestre gia' presenti (stesso `fonte_id`) si aggiornano.
// Serve la migrazione 20261027120000_palestre.sql gia' applicata.
//
// ⚠️ Per ora solo sul progetto di SVILUPPO: se il .env punta alla produzione,
// si ferma. Quando la si vuole in produzione, si toglie il controllo qui sotto.
//
// Il server pubblico di Overpass e' spesso pieno ("at capacity"): se non
// risponde, OVERPASS_URL=https://overpass.private.coffee/api/interpreter.

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const PRODUZIONE = 'nmnsdyutsjrxcvjvwvog'
const connessione = [process.env.DATABASE_URL, process.env.PGHOST, process.env.PGUSER].join(' ')
if (connessione.includes(PRODUZIONE)) {
  console.error('Il .env punta al database di produzione: qui si carica solo su quello di sviluppo.')
  process.exit(1)
}

const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter'
const query = `[out:json][timeout:300];
area["ISO3166-1"="IT"][admin_level=2]->.it;
nwr["leisure"="fitness_centre"](area.it);
out center tags;`

console.log(`Scarico da ${OVERPASS}…`)
const risposta = await fetch(OVERPASS, {
  method: 'POST',
  // Senza User-Agent overpass-api.de risponde 406.
  headers: { 'User-Agent': 'palestra-import/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(query),
})
if (!risposta.ok) {
  console.error(`Overpass: ${risposta.status} ${(await risposta.text()).slice(0, 300)}`)
  process.exit(1)
}
const { elements } = await risposta.json()

function riga(e) {
  const t = e.tags || {}
  // Senza nome non la si puo' scegliere da un elenco: la si salta.
  if (!t.name) return null
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  if (lat == null || lon == null) return null
  const via = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')
  return [`osm:${e.type}/${e.id}`, t.name, lat, lon, t['addr:city'] || null, via || null]
}

const testo = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`)
const righe = elements.map(riga).filter(Boolean)
if (!righe.length) {
  console.error(`Nessuna palestra con nome su ${elements.length} elementi: niente da caricare.`)
  process.exit(1)
}

const sql = `insert into public.palestre (fonte_id, nome, lat, lon, comune, indirizzo) values
${righe.map((r) => `(${r.map(testo).join(', ')})`).join(',\n')}
on conflict (fonte_id) do update set
  nome = excluded.nome, lat = excluded.lat, lon = excluded.lon,
  comune = excluded.comune, indirizzo = excluded.indirizzo;`

const file = join(tmpdir(), 'palestre-osm.sql')
writeFileSync(file, sql)
console.log(`${righe.length} palestre con nome (su ${elements.length}) → ${file}`)
execFileSync('npm', ['run', 'db', '--', '--file', file], { stdio: 'inherit' })
