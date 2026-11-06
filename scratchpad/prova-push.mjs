// Le regole delle notifiche push, sul database di DEV: tutto in una transazione che
// si annulla, non resta niente. Si rifiuta di girare su qualunque altro database.
//   node --env-file=.env scratchpad/prova-push.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import pg from 'pg'

const DEV = 'xfdzhiolqpcqekhvtpyw'
const url = process.env.DEV_DATABASE_URL
if (!url?.includes(DEV)) throw new Error('Solo sul database di dev.')
const c = new pg.Client({ connectionString: url.split('?')[0], ssl: { ca: fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') } })
await c.connect()
await c.query('begin')
let ok = 0
const prova = async (nome, f) => {
  await f()
  ok++
  console.log('✓', nome)
}
try {
  const u = (await c.query(`select id from auth.users where email like 'prova.comandi.%@test.local' order by created_at limit 3`)).rows.map((r) => r.id)
  assert.equal(u.length, 3, 'servono tre account di prova')
  const [io, ale, bea] = u
  const nome = (id, n) => c.query('update public.profili set nome=$2 where id=$1', [id, n])
  await nome(ale, 'Ale')
  await nome(bea, 'Bea')
  const colonne = (await c.query(`select column_name, data_type from information_schema.columns where table_schema='public' and table_name='allenamenti' and is_nullable='NO' and column_default is null`)).rows
  const valori = { user_id: io }
  for (const { column_name: k, data_type: t } of colonne) {
    if (k in valori) continue
    valori[k] = k === 'id' && t === 'uuid' ? '00000000-0000-4000-8000-000000000001' : t === 'uuid' ? '00000000-0000-4000-8000-000000000002' : t.includes('timestamp') || t === 'date' ? new Date().toISOString() : t === 'integer' || t === 'bigint' ? 1 : t === 'boolean' ? false : t === 'jsonb' || t === 'json' ? '{}' : 'prova-push'
  }
  const k = Object.keys(valori)
  await c.query(`alter table public.allenamenti disable trigger user`)
  const key = (await c.query(`insert into public.allenamenti (${k.join(',')}) values (${k.map((_, i) => `$${i + 1}`).join(',')}) returning id::text`, Object.values(valori))).rows[0].id
  await c.query(`alter table public.allenamenti enable trigger user`)
  await c.query(`insert into public.push_token (token, user_id) values ('tok-io', $1)`, [io])
  const invia = async (tipo, autore) => (await c.query('select * from public.push_da_inviare($1,$2,$3)', [key, tipo, autore])).rows[0]
  const piace = (id) => c.query('insert into public.allenamento_mi_piace (allenamento_key,user_id) values ($1,$2) on conflict do nothing', [key, id])
  const togli = (id) => c.query('delete from public.allenamento_mi_piace where allenamento_key=$1 and user_id=$2', [key, id])

  await prova('un mi piace arriva a chi ha fatto l’allenamento', async () => {
    await piace(ale)
    const r = await invia('mi_piace', ale)
    assert.deepEqual(r.tokens, ['tok-io'])
    assert.deepEqual(r.nomi, ['Ale'])
    assert.equal(Number(r.persone), 1)
  })
  await prova('togliere e rimettere il mi piace non suona due volte', async () => {
    await togli(ale)
    await piace(ale)
    assert.equal(await invia('mi_piace', ale), undefined)
  })
  await prova('i miei gesti sui miei allenamenti no', async () => {
    await piace(io)
    assert.equal(await invia('mi_piace', io), undefined)
  })
  await prova('due persone: una notifica sola, col conto giusto e senza di me', async () => {
    await piace(bea)
    const r = await invia('mi_piace', bea)
    assert.deepEqual(r.nomi, ['Bea', 'Ale'])
    assert.equal(Number(r.persone), 2)
  })
  await prova('il commento porta il suo testo', async () => {
    await c.query(`insert into public.allenamento_commenti (id,allenamento_key,user_id,testo) values ('prova-c1',$1,$2,'Grande!')`, [key, ale])
    const r = await invia('commento', ale)
    assert.equal(r.ultimo_testo, 'Grande!')
    assert.equal(Number(r.quanti), 1)
  })
  await prova('chi è bloccato non manda niente e sparisce dal conto', async () => {
    await c.query(`insert into public.blocchi (da_id,a_id) values ($1,$2)`, [io, ale])
    assert.equal(await invia('commento', ale), undefined)
    await c.query(`insert into public.allenamento_commenti (id,allenamento_key,user_id,testo) values ('prova-c2',$1,$2,'Bravo')`, [key, bea])
    const r = await invia('commento', bea)
    assert.deepEqual(r.nomi, ['Bea'])
    assert.equal(Number(r.quanti), 1)
    await c.query('delete from public.blocchi where da_id=$1', [io])
  })
  await prova('spento dal Profilo non arriva, e l’altro tipo sì', async () => {
    await c.query(`insert into public.push_preferenze (user_id,commento) values ($1,false)`, [io])
    assert.equal(await invia('commento', bea), undefined)
    await c.query('update public.push_preferenze set commento=true, mi_piace=false where user_id=$1', [io])
    assert.ok((await invia('commento', bea)).tokens)
    await c.query('delete from public.push_preferenze where user_id=$1', [io])
  })
  await prova('senza telefoni registrati non c’è niente da mandare', async () => {
    await c.query(`delete from public.push_token where user_id=$1`, [io])
    assert.equal(await invia('commento', bea), undefined)
    await c.query(`insert into public.push_token (token, user_id) values ('tok-io', $1)`, [io])
  })
  await prova('un allenamento che non esiste non manda niente', async () => {
    assert.equal((await c.query('select * from public.push_da_inviare($1,$2,$3)', ['non-esiste', 'commento', bea])).rows[0], undefined)
  })
  await prova('senza push_config il trigger non chiama nessuno', async () => {
    const prima = Number((await c.query('select count(*) from net.http_request_queue')).rows[0].count)
    await c.query(`insert into public.allenamento_commenti (id,allenamento_key,user_id,testo) values ('prova-c3',$1,$2,'x')`, [key, bea])
    assert.equal(Number((await c.query('select count(*) from net.http_request_queue')).rows[0].count), prima)
  })
  await prova('con push_config il trigger chiama la funzione, col segreto', async () => {
    await c.query(`insert into public.push_config (url,segreto) values ('https://esempio.invalid/invia-push','segreto-di-prova')`)
    await c.query(`insert into public.allenamento_commenti (id,allenamento_key,user_id,testo) values ('prova-c4',$1,$2,'y')`, [key, bea])
    const q = (await c.query(`select url, headers, convert_from(body,'utf8') b from net.http_request_queue order by id desc limit 1`)).rows[0]
    assert.equal(q.url, 'https://esempio.invalid/invia-push')
    assert.equal(q.headers['x-push-segreto'], 'segreto-di-prova')
    assert.equal(JSON.parse(q.b).tipo, 'commento')
  })
  await prova('la config guasta non impedisce il commento', async () => {
    await c.query(`update public.push_config set url='non è un url'`)
    await c.query(`insert into public.allenamento_commenti (id,allenamento_key,user_id,testo) values ('prova-c5',$1,$2,'z')`, [key, bea])
    assert.equal((await c.query(`select count(*) from public.allenamento_commenti where id='prova-c5'`)).rows[0].count, '1')
    await c.query(`delete from public.push_config`)
  })
  await prova('da utente normale: niente token altrui, niente segreto, niente regole', async () => {
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: bea, role: 'authenticated' })])
    await c.query('savepoint s; set local role authenticated')
    assert.equal((await c.query('select count(*) from public.push_token')).rows[0].count, '0')
    assert.equal((await c.query('select count(*) from public.push_config')).rows[0].count, '0')
    await assert.rejects(c.query('select * from public.push_da_inviare($1,$2,$3)', [key, 'commento', bea]), /permission denied/)
    await c.query('rollback to s')
    await c.query('savepoint s; set local role authenticated')
    await c.query(`select public.registra_push_token('tok-io')`) // il telefono passa a Bea
    await c.query('reset role')
    assert.equal((await c.query(`select user_id from public.push_token where token='tok-io'`)).rows[0].user_id, bea)
  })
  console.log(`\n${ok} prove passate`)
} finally {
  await c.query('rollback')
  await c.end()
}
