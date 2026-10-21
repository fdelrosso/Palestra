import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// La versione dell'APK nel codice (lib/apk, VERSIONE_APK) e quella dell'app
// (versionCode in android/app/build.gradle) devono essere la stessa: se se ne
// alza una sola, o l'app aggiornata si crede vecchia e lo chiede per sempre, o
// quella vecchia non sa che ce n'è una nuova.
test('VERSIONE_APK coincide col versionCode dell’app Android', () => {
  const codice = readFileSync(new URL('../src/lib/apk.js', import.meta.url), 'utf8')
  const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8')
  const nelCodice = Number(codice.match(/export const VERSIONE_APK = (\d+)/)?.[1])
  const nellApp = Number(gradle.match(/versionCode (\d+)/)?.[1])
  assert.ok(nelCodice > 0 && nellApp > 0, 'non trovo le due versioni')
  assert.equal(nelCodice, nellApp)
})
