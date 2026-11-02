// Copia le palestre importate (OSM e Overture, non quelle aggiunte dagli
// utenti) e le candidate da SVILUPPO a PRODUZIONE. Dati gia' provati su dev,
// cosi' non si rifanno gli import da OSM e Overture.
//
//     node --env-file=.env scratchpad/copia-palestre-in-produzione.mjs
//
// Da sviluppo legge DATABASE_URL, scrive su PROD_DATABASE_URL (vedi .env).
// Prima vanno lanciate su produzione le tre migrazioni delle palestre.
// Rilanciabile: le righe che ci sono gia' (stesso fonte_id) si saltano.
// Tutto in una transazione: o passa tutto o niente.

import { readFileSync } from 'node:fs'
import pg from 'pg'

const DEV = 'xfdzhiolqpcqekhvtpyw'
const PROD = 'nmnsdyutsjrxcvjvwvog'
const da = process.env.DATABASE_URL
const a = process.env.PROD_DATABASE_URL
if (!da?.includes(DEV) || !a?.includes(PROD)) {
  console.error('Serve DATABASE_URL su sviluppo e PROD_DATABASE_URL su produzione.')
  process.exit(1)
}
const ssl = process.env.PGSSLROOTCERT
  ? { ca: readFileSync(process.env.PGSSLROOTCERT, 'utf8'), rejectUnauthorized: true }
  : { rejectUnauthorized: true }

const COPIE = [
  {
    tabella: 'palestre',
    colonne: ['fonte_id', 'nome', 'lat', 'lon', 'comune', 'indirizzo', 'provincia', 'regione'],
    dove: 'creata_da is null',
  },
  {
    tabella: 'palestre_candidate',
    colonne: ['fonte_id', 'nome', 'categoria', 'lat', 'lon', 'comune', 'provincia', 'regione', 'indirizzo'],
    dove: 'true',
  },
]
const BLOCCO = 1000

const sorgente = new pg.Client({ connectionString: da, ssl })
const destinazione = new pg.Client({ connectionString: a, ssl })
try {
  await sorgente.connect()
  await destinazione.connect()
  await destinazione.query('begin')
  for (const { tabella, colonne, dove } of COPIE) {
    const { rows } = await sorgente.query(`select ${colonne.join(', ')} from public.${tabella} where ${dove}`)
    let nuove = 0
    for (let i = 0; i < rows.length; i += BLOCCO) {
      const pezzo = rows.slice(i, i + BLOCCO)
      const valori = pezzo.flatMap((r) => colonne.map((c) => r[c]))
      const segnaposto = pezzo
        .map((_, j) => `(${colonne.map((_, k) => `$${j * colonne.length + k + 1}`).join(', ')})`)
        .join(', ')
      const r = await destinazione.query(
        `insert into public.${tabella} (${colonne.join(', ')}) values ${segnaposto} on conflict (fonte_id) do nothing`,
        valori,
      )
      nuove += r.rowCount
    }
    console.log(`${tabella}: ${rows.length} su sviluppo, ${nuove} nuove su produzione`)
  }
  await destinazione.query('commit')
} catch (e) {
  await destinazione.query('rollback').catch(() => {})
  // Solo il messaggio: quelli di `pg` a volte si portano dietro la connessione.
  console.error('Non riuscito, niente scritto:', String(e?.message || e).split(a).join('<PROD>').split(da).join('<DEV>'))
  process.exitCode = 1
} finally {
  await sorgente.end().catch(() => {})
  await destinazione.end().catch(() => {})
}
