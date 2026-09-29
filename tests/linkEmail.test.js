import test from 'node:test'
import assert from 'node:assert/strict'

import {
  TIPO_VERIFICA,
  indirizzoSenzaLink,
  leggiLinkEmail,
  messaggioLinkNonValido,
} from '../src/lib/linkEmail.js'

test('un indirizzo normale non e\' un link', () => {
  assert.equal(leggiLinkEmail({ search: '', hash: '' }), null)
  assert.equal(leggiLinkEmail({ search: '', hash: '#/schede' }), null)
  assert.equal(leggiLinkEmail({ search: '?utm=x', hash: '#/calendario' }), null)
})

test('la conferma col token_hash', () => {
  assert.deepEqual(leggiLinkEmail({ search: '?token_hash=abc&type=email' }), {
    scopo: 'conferma',
    tipo: 'token',
    tokenHash: 'abc',
  })
  // `signup` e' il nome vecchio dello stesso tipo.
  assert.deepEqual(leggiLinkEmail({ search: '?token_hash=abc&type=signup', hash: '#/' }), {
    scopo: 'conferma',
    tipo: 'token',
    tokenHash: 'abc',
  })
})

test('la conferma col link standard: la sessione arriva nell\'hash', () => {
  const hash = '#access_token=AAA&expires_at=1&expires_in=3600&refresh_token=RRR&token_type=bearer&type=signup'
  assert.deepEqual(leggiLinkEmail({ hash }), {
    scopo: 'conferma',
    tipo: 'sessione',
    accessToken: 'AAA',
    refreshToken: 'RRR',
  })
})

test('il recupero della password, nei due modi', () => {
  assert.deepEqual(leggiLinkEmail({ search: '?token_hash=abc&type=recovery' }), {
    scopo: 'recupero',
    tipo: 'token',
    tokenHash: 'abc',
  })
  assert.deepEqual(leggiLinkEmail({ hash: '#access_token=A&refresh_token=R&type=recovery' }), {
    scopo: 'recupero',
    tipo: 'sessione',
    accessToken: 'A',
    refreshToken: 'R',
  })
})

test('il link scaduto, nell\'hash o nella query', () => {
  const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
  // Supabase di solito non dice da che link viene l'errore.
  assert.deepEqual(leggiLinkEmail({ hash }), {
    scopo: null,
    tipo: 'errore',
    codice: 'otp_expired',
    descrizione: 'Email link is invalid or has expired',
  })
  assert.equal(leggiLinkEmail({ search: '?error=access_denied' }).tipo, 'errore')
  assert.equal(leggiLinkEmail({ hash: '#error=x&error_code=otp_expired&type=recovery' }).scopo, 'recupero')
})

test('i link che non sono nostri restano al router', () => {
  assert.equal(leggiLinkEmail({ search: '?token_hash=abc&type=invite' }), null)
  assert.equal(leggiLinkEmail({ hash: '#access_token=A&refresh_token=R&type=email_change' }), null)
  assert.equal(leggiLinkEmail({ hash: '#error=x&type=magiclink' }), null)
})

test('un link a meta\' non conta', () => {
  assert.equal(leggiLinkEmail({ hash: '#access_token=A&type=signup' }), null)
  assert.equal(leggiLinkEmail({ search: '?type=recovery' }), null)
})

test('il tipo per verifyOtp', () => {
  assert.equal(TIPO_VERIFICA.conferma, 'email')
  assert.equal(TIPO_VERIFICA.recupero, 'recovery')
})

test('l\'indirizzo pulito perde token ed errori e tiene il resto', () => {
  assert.equal(indirizzoSenzaLink({ pathname: '/', search: '?token_hash=abc&type=email', hash: '#/' }), '/#/')
  assert.equal(
    indirizzoSenzaLink({ pathname: '/', search: '', hash: '#access_token=A&refresh_token=R&type=recovery' }),
    '/',
  )
  assert.equal(indirizzoSenzaLink({ pathname: '/app', search: '?x=1&error=e', hash: '#/schede' }), '/app?x=1#/schede')
})

test('il messaggio del link non valido', () => {
  assert.equal(messaggioLinkNonValido('otp_expired'), 'Il link è scaduto o è già stato usato.')
  assert.match(messaggioLinkNonValido('boh'), /Non sono riuscito/)
})
