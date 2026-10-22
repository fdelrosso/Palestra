import test from 'node:test'
import assert from 'node:assert/strict'

// api/riscrivi con fetch finto: Supabase dice chi è, Mistral risponde.
process.env.MISTRAL_API_KEY = 'finta'
const { default: handler } = await import('../api/riscrivi.js')
const { leggiScheda } = await import('../src/lib/parser.js')

function chiama(body, { token = 'ok', mistral = '```\nGiorno A\nPanca piana 4x8 80kg rec 90s\n```' } = {}) {
  const chiamate = []
  globalThis.fetch = async (url, opts = {}) => {
    chiamate.push({ url, corpo: opts.body ? JSON.parse(opts.body) : null })
    if (url.includes('/auth/v1/user')) return new Response(token ? '{"id":"u1"}' : '{}', { status: token ? 200 : 401 })
    if (url.endsWith('/ocr')) return Response.json({ pages: [{ markdown: 'Day 1: bench 4x8' }] })
    return Response.json({ choices: [{ message: { content: mistral } }] })
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

test('PDF: prima l’OCR, poi il suo testo a ministral', async () => {
  const { res, chiamate } = await chiama({ file: 'data:application/pdf;base64,AAAA' })
  assert.equal(res.codice, 200)
  assert.ok(chiamate[1].url.endsWith('/ocr'))
  assert.match(chiamate[2].corpo.messages[0].content[0].text, /Day 1: bench 4x8$/)
})

test('foto: passa come immagine', async () => {
  const { chiamate } = await chiama({ file: 'data:image/jpeg;base64,AAAA' })
  assert.deepEqual(chiamate[1].corpo.messages[0].content[1], { type: 'image_url', image_url: 'data:image/jpeg;base64,AAAA' })
})

test('senza account o con un file strano: no', async () => {
  assert.equal((await chiama({ testo: 'x' }, { token: '' })).res.codice, 401)
  assert.equal((await chiama({ file: 'data:text/html;base64,AAAA' })).res.codice, 400)
})
