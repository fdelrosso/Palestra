// Parla col database Supabase del progetto, da riga di comando.
//
//     npm run db -- "select count(*) from profili"
//     npm run db -- --file supabase/schema.sql
//
// Serve a fare le verifiche (e le modifiche) senza passare dal copia-incolla nel
// SQL Editor. La connessione la legge dal file `.env`, in una delle due forme:
//
//   DATABASE_URL=postgresql://utente:password@host:5432/postgres
//
//   oppure, campo per campo:
//   PGHOST=… PGPORT=5432 PGUSER=… PGPASSWORD=… PGDATABASE=postgres
//
// ⚠️ La seconda forma esiste per un motivo pratico: dentro una URL la password
// va codificata a percentuale, e se contiene `@ : / ? #` — cosa comune nelle
// password generate — la stringa presa dalla dashboard NON funziona finche' non
// la si sistema a mano, con un errore che non dice affatto questo. Coi campi
// separati il problema non esiste.
//
// ⚠️ `.env` NON STA NEL REPO (vedi .gitignore) e non ci deve tornare: dentro
// c'è la password del database, che scavalca ogni regola di accesso. Questo
// script non la stampa mai — nemmeno negli errori, dove `pg` a volte se la
// porta dietro: vedi `soloIlMessaggio()`.
//
// ⚠️ SI SCRIVE DAVVERO. Una `delete` lanciata da qui cancella per davvero e non
// chiede conferma, esattamente come nel SQL Editor. L'unica rete di protezione
// è che le istruzioni che cancellano vanno annunciate prima (vedi il riepilogo
// che stampa in testa).
//
// ⚠️ Un file .sql si lancia INTERO, in una transazione: o passa tutto o non
// passa niente. `supabase/schema.sql` è scritto per essere rilanciabile, quindi
// un errore a metà non lascia il database mezzo aggiornato.

import { readFileSync } from 'node:fs'
import pg from 'pg'

const URL_DB = process.env.DATABASE_URL
// I campi separati bastano da soli: `pg` legge PGHOST/PGPORT/PGUSER/PGPASSWORD/
// PGDATABASE dall'ambiente senza che glieli si passi.
const A_CAMPI = !!(process.env.PGHOST && process.env.PGPASSWORD)

// Gli errori di `pg` a volte contengono la stringa di connessione intera. Qui
// dentro non deve uscire: si tiene il messaggio e si butta il resto.
function soloIlMessaggio(err) {
  let m = String(err?.message || err)
  if (URL_DB) m = m.split(URL_DB).join('<DATABASE_URL>')
  // Anche la sola password, che puo' comparire da sola in certi errori.
  const pw = process.env.PGPASSWORD
  if (pw) m = m.split(pw).join('<PGPASSWORD>')
  return m
}

// Le istruzioni che tolgono roba. Non le blocca — le fa vedere, perché chi
// legge l'output sappia cosa e' appena passato di qui.
function distruttive(sql) {
  const trovate = sql.match(/\b(drop|delete|truncate|alter\s+table\s+\S+\s+drop)\b/gi) || []
  return [...new Set(trovate.map((t) => t.toLowerCase().replace(/\s+/g, ' ')))]
}

function tabella(righe) {
  if (righe.length === 0) return '(nessuna riga)'
  const colonne = Object.keys(righe[0])
  const largh = colonne.map((c) =>
    Math.max(c.length, ...righe.map((r) => String(r[c] ?? '').length)),
  )
  const riga = (celle) => celle.map((v, i) => String(v ?? '').padEnd(largh[i])).join('  ')
  return [riga(colonne), largh.map((l) => '-'.repeat(l)).join('  '), ...righe.map((r) => riga(colonne.map((c) => r[c])))].join('\n')
}

async function main() {
  if (!URL_DB && !A_CAMPI) {
    console.error('Manca la connessione. Crea un file .env accanto a package.json,')
    console.error('copiando .env.example, con dentro UNA delle due forme:')
    console.error('  DATABASE_URL=postgresql://utente:password@host:5432/postgres')
    console.error('oppure')
    console.error('  PGHOST=…  PGPORT=5432  PGUSER=…  PGPASSWORD=…  PGDATABASE=postgres')
    process.exit(2)
  }

  const args = process.argv.slice(2)
  const daFile = args[0] === '--file'
  const sql = daFile ? readFileSync(args[1], 'utf8') : args.join(' ')
  if (!sql.trim()) {
    console.error('Nessun SQL da eseguire.')
    process.exit(2)
  }

  const pericolose = distruttive(sql)
  if (pericolose.length > 0) {
    console.log(`⚠️  Questo SQL contiene: ${pericolose.join(', ')}`)
  }

  // ⚠️ SSL vero, con verifica del certificato. Tre modi, dal migliore al peggiore:
  //
  //   1. PGSSLROOTCERT=percorso/prod-ca-2021.crt  → la strada giusta. Il
  //      certificato di Supabase (dashboard → Settings → Database → SSL
  //      Configuration) non sta fra quelli di cui Node si fida di suo, quindi
  //      glielo si dà: da lì in poi la verifica funziona davvero.
  //   2. niente → verifica coi soli certificati noti a Node. Col pooler di
  //      Supabase fallisce con "self-signed certificate in certificate chain",
  //      ed è il caso 1 mascherato da errore.
  //   3. PGSSL_INSECURE=1 → ripiego. Senza verifica, chi sta in mezzo alla rete
  //      può farsi passare per il database, e a quel punto gli si consegna la
  //      password. Si usa una volta, sapendo perché.
  const certificato = process.env.PGSSLROOTCERT
  let ssl
  if (certificato) {
    try {
      ssl = { ca: readFileSync(certificato, 'utf8'), rejectUnauthorized: true }
    } catch {
      console.error(`Il certificato non si legge: ${certificato}`)
      process.exit(2)
    }
  } else {
    ssl = { rejectUnauthorized: process.env.PGSSL_INSECURE !== '1' }
  }

  const client = new pg.Client({
    // Senza `connectionString`, `pg` prende i campi dall'ambiente da solo.
    ...(URL_DB ? { connectionString: URL_DB } : {}),
    ssl,
  })

  try {
    await client.connect()
  } catch (err) {
    console.error('Connessione fallita:', soloIlMessaggio(err))
    process.exit(1)
  }

  try {
    if (daFile) {
      // Un file intero: o tutto o niente.
      await client.query('begin')
      await client.query(sql)
      await client.query('commit')
      console.log(`✅ ${args[1]} applicato (${sql.split('\n').length} righe).`)
    } else {
      const res = await client.query(sql)
      const risultati = Array.isArray(res) ? res : [res]
      for (const r of risultati) {
        if (r.rows?.length !== undefined && r.command === 'SELECT') console.log(tabella(r.rows))
        else console.log(`${r.command || 'OK'}: ${r.rowCount ?? 0} righe`)
      }
    }
  } catch (err) {
    if (daFile) await client.query('rollback').catch(() => {})
    console.error('SQL fallito:', soloIlMessaggio(err))
    if (daFile) console.error('(niente è stato applicato: la transazione è stata annullata)')
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}

main()
