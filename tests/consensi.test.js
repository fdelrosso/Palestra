import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { VERSIONE_TESTI, consensiValidi, nuoviConsensi } from '../src/lib/consensi.js'

test('i consensi appena dati valgono', () => {
  assert.ok(consensiValidi({ consensi: nuoviConsensi() }))
})

test('senza consensi, o con uno solo, non si entra', () => {
  assert.ok(!consensiValidi(undefined))
  assert.ok(!consensiValidi({}))
  assert.ok(!consensiValidi({ consensi: { ...nuoviConsensi(), salute: null } }))
  assert.ok(!consensiValidi({ consensi: { ...nuoviConsensi(), termini: '' } }))
})

test('i consensi su testi vecchi vanno chiesti di nuovo', () => {
  assert.ok(!consensiValidi({ consensi: { ...nuoviConsensi(), versione: '2000-01-01' } }))
})

// La data che si legge in cima alle due pagine è la versione che l'app chiede
// di accettare: se cambia una e non l'altra, si accetta un testo che non è
// quello che si legge.
test('privacy e termini dicono la data della versione in vigore', () => {
  const data = new Date(`${VERSIONE_TESTI}T12:00:00Z`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  for (const pagina of ['privacy.html', 'termini.html']) {
    const html = readFileSync(new URL(`../public/${pagina}`, import.meta.url), 'utf8')
    assert.ok(html.includes(`Ultimo aggiornamento: ${data}`), `${pagina} non dice "Ultimo aggiornamento: ${data}"`)
  }
})
