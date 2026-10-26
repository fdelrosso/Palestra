import test from 'node:test'
import assert from 'node:assert/strict'

// api/riscrivi con fetch finto: Supabase dice chi è, Mistral risponde.
process.env.MISTRAL_API_KEY = 'finta'
const { default: handler } = await import('../api/riscrivi.js')
const { leggiScheda } = await import('../src/lib/parser.js')

function chiama(body, { token = 'ok', mistral = '```\nGiorno A\nPanca piana 4x8 80kg rec 90s\n```', nomi = {} } = {}) {
  const chiamate = []
  globalThis.fetch = async (url, opts = {}) => {
    chiamate.push({ url, corpo: opts.body ? JSON.parse(opts.body) : null })
    if (url.includes('/auth/v1/user')) return new Response(token ? '{"id":"u1"}' : '{}', { status: token ? 200 : 401 })
    // La seconda chiamata, quella dei nomi, chiede un JSON.
    const content = JSON.parse(opts.body).response_format ? JSON.stringify(nomi) : mistral
    return Response.json({ choices: [{ message: { content } }] })
  }
  const res = {
    status(n) {
      this.codice = n
      return this
    },
    json(d) {
      this.dati = d
      return this
    },
  }
  return handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body }, res).then(() => ({ res, chiamate }))
}

test('testo: torna riscritto, senza ```, e il parser lo legge', async () => {
  const { res } = await chiama({ testo: 'lunedì panca 4 serie da 8 con 80' })
  assert.equal(res.codice, 200)
  assert.equal(res.dati.testo, 'Giorno A\nPanca piana 4x8 80kg rec 90s')
  const { scheda } = leggiScheda(res.dati.testo)
  assert.equal(scheda.giorni[0].esercizi.length, 1)
})

test('i nomi: quelli della libreria, e solo quelli', async () => {
  const testo = 'Giorno A\nLat pull 4x10 40kg\nRDL 3x10\nCosa strana 3x10'
  const { res } = await chiama(
    { testo: 'x' },
    { mistral: testo, nomi: { 'Lat pull': 'lat machine avanti', RDL: 'Stacco rumeno inventato', 'Cosa strana': null } },
  )
  assert.deepEqual(res.dati.nomi, { 'Lat pull': 'Lat machine avanti' })
  const { nomiValidi } = await import('../api/riscrivi.js')
  assert.deepEqual(nomiValidi({ 'Pull down': 'Push down ai cavi (corda)', 'Push down corda': 'Push down ai cavi (corda)' }, ['Pull down', 'Push down corda']), {
    'Push down corda': 'Push down ai cavi (corda)',
  })
})

test('niente markdown nella risposta', async () => {
  const { res } = await chiama({ testo: 'x' }, { mistral: '**Settimane: 6**\n\n---\n\n## **Giorno A**\nRiscaldamento: non specificato\nPanca 4x8' })
  assert.equal(res.dati.testo, 'Settimane: 6\n\nGiorno A\nPanca 4x8')
  const elenco = await chiama({ testo: 'x' }, { mistral: 'Giorno A\nRiscaldamento:\ncyclette 5\'\nPanca 4x8' })
  assert.equal(elenco.res.dati.testo, 'Giorno A\nRiscaldamento:\ncyclette 5\'\nPanca 4x8')
})

test('PDF: passa come documento, senza OCR', async () => {
  const { res, chiamate } = await chiama({ file: 'data:application/pdf;base64,AAAA' })
  assert.equal(res.codice, 200)
  assert.deepEqual(chiamate[1].corpo.messages[0].content[1], { type: 'document_url', document_url: 'data:application/pdf;base64,AAAA' })
})

test('foto: passa come immagine', async () => {
  const { chiamate } = await chiama({ file: 'data:image/jpeg;base64,AAAA' })
  assert.deepEqual(chiamate[1].corpo.messages[0].content[1], { type: 'image_url', image_url: 'data:image/jpeg;base64,AAAA' })
})

test('senza account o con un file strano: no', async () => {
  assert.equal((await chiama({ testo: 'x' }, { token: '' })).res.codice, 401)
  assert.equal((await chiama({ file: 'data:text/html;base64,AAAA' })).res.codice, 400)
})

test('una foto che non è una scheda: si dice, e niente seconda chiamata', async () => {
  const { res, chiamate } = await chiama({ file: 'data:image/jpeg;base64,AAAA' }, { mistral: 'NESSUNA_SCHEDA' })
  assert.equal(res.codice, 422)
  assert.match(res.dati.errore, /non sembra una scheda/)
  assert.equal(chiamate.length, 2) // Supabase e la trascrizione
})
