import test from 'node:test'
import assert from 'node:assert/strict'
import { creaPdf, misura, pdfDaFoglio } from '../src/lib/pdf.js'
import { STILI } from '../src/lib/excel.js'

const testo = (byte) => new TextDecoder('latin1').decode(byte)

// Come lo legge un lettore PDF: dalla fine, la tabella xref, e ogni voce deve
// puntare esattamente all'inizio del suo oggetto. Un byte sbagliato e il file
// è "danneggiato".
function controllaXref(pdf) {
  assert.ok(pdf.startsWith('%PDF-1.4\n'))
  assert.ok(pdf.endsWith('%%EOF\n'))
  const inizio = Number(pdf.match(/startxref\n(\d+)\n%%EOF\n$/)[1])
  assert.ok(pdf.slice(inizio).startsWith('xref\n'))
  const [, quanti] = pdf.slice(inizio).match(/^xref\n0 (\d+)\n/)
  const voci = pdf.slice(inizio).split('\n').slice(3, 2 + Number(quanti))
  voci.forEach((v, i) => {
    assert.match(v, /^\d{10} 00000 n $/)
    const pos = Number(v.slice(0, 10))
    assert.ok(pdf.slice(pos).startsWith(`${i + 1} 0 obj\n`), `oggetto ${i + 1}`)
  })
  // Ogni flusso è lungo quanto dice.
  for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const da = m.index + m[0].length
    assert.equal(pdf.slice(da + Number(m[1]), da + Number(m[1]) + 10), '\nendstream')
  }
}

test('il file è valido: oggetti, xref e flussi tornano al byte', () => {
  const pdf = testo(creaPdf(['BT /F1 10 Tf 10 10 Td (ciao) Tj ET', ''], { larghezza: 200, altezza: 100, titolo: 'Più — prova' }))
  controllaXref(pdf)
  assert.match(pdf, /\/Count 2/)
  // Il titolo dei metadati in UTF-16: "ù" e "—" restano quelli.
  assert.match(pdf, /\/Title <FEFF0050006900F9002020140020/)
})

test('le larghezze sono quelle di Helvetica', () => {
  assert.equal(misura('Panca', 10), (667 + 556 + 556 + 500 + 556) / 100)
  assert.ok(misura('Panca', 10, true) > misura('Panca', 10))
  assert.equal(misura('è', 10), misura('e', 10))
})

const foglio = {
  righe: [
    [{ v: 'Velocità — prova (1)', stile: STILI.titolo }, { v: '', stile: STILI.titolo }, { v: '', stile: STILI.titolo }],
    [{ v: 'Esercizio', stile: STILI.intestazione }, { v: 'Serie 1', stile: STILI.intestazione }, { v: 'Serie 2', stile: STILI.intestazione }],
    ['Panca 💪', { v: '8 × 82,5kg', stile: STILI.verde }, { v: '6 × 82,5kg', stile: STILI.rosso }],
  ],
  larghezze: [30, 12, 12],
  unioni: ['A1:C1'],
}

test('un foglio diventa una tabella: accenti, "×", colori dei pallini', () => {
  const pdf = testo(pdfDaFoglio(foglio, { titolo: 'Prova' }))
  controllaXref(pdf)
  // WinAnsi in ottale: à = \340, — = \227, × = \327; le parentesi escapate.
  assert.match(pdf, /\(Velocit\\340 \\227 prova \\\(1\\\)\) Tj/)
  assert.match(pdf, /\(8 \\327 82,5kg\) Tj/)
  // L'emoji sparisce, non diventa un punto di domanda.
  assert.match(pdf, /\(Panca ?\) Tj/)
  // Il verde e il rosso dei pallini come fondo delle caselle.
  assert.match(pdf, /0\.78 0\.94 0\.81 rg [\d. ]+ re f/)
  assert.match(pdf, /1 0\.78 0\.81 rg [\d. ]+ re f/)
  assert.match(pdf, /\(Pagina 1 di 1\) Tj/)
})

test('una tabella lunga va su più pagine, con l\'intestazione ripetuta', () => {
  const righe = [foglio.righe[1]]
  for (let i = 0; i < 120; i++) righe.push([`Esercizio ${i}`, { v: '10 × 50kg', stile: STILI.giallo }, ''])
  const pdf = testo(pdfDaFoglio({ righe, larghezze: [30, 12, 12], unioni: [] }))
  controllaXref(pdf)
  const pagine = Number(pdf.match(/\/Count (\d+)/)[1])
  assert.ok(pagine >= 3, `${pagine} pagine`)
  assert.equal((pdf.match(/\(Esercizio\) Tj/g) || []).length, pagine)
  assert.match(pdf, new RegExp(`\\(Pagina ${pagine} di ${pagine}\\) Tj`))
  assert.match(pdf, /\(Esercizio 119\) Tj/)
})
