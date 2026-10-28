import test from 'node:test'
import assert from 'node:assert/strict'
import { guidaPerChi } from '../src/lib/guidePerChi.js'

// Le guide che vede ognuno (2026-10-28): chi si allena, il PT che si allena,
// il solo PT. Guide d'esempio con le stesse forme di lib/guide.
const ATLETA = { pt: false, soloPt: false }
const PT = { pt: true, soloPt: false }
const SOLO_PT = { pt: true, soloPt: true }

const GUIDE = [
  { id: 'nuova-scheda', gruppo: 'allenamento' },
  { id: 'dieta-giorno', gruppo: 'dieta' },
  { id: 'feed', gruppo: 'social' },
  { id: 'profilo', gruppo: 'profilo', per: 'chi-si-allena' },
  { id: 'profilo-pt', gruppo: 'profilo', per: 'solo-pt' },
  { id: 'foto', gruppo: 'profilo', per: 'chi-si-allena' },
  { id: 'lavoro', gruppo: 'profilo', per: 'pt-che-si-allena' },
  { id: 'lavoro-pt', gruppo: 'profilo', per: 'solo-pt' },
  { id: 'foto-atleti', gruppo: 'profilo', per: 'pt' },
  { id: 'esercizi', gruppo: 'altro' },
  { id: 'alimenti', gruppo: 'altro', per: 'chi-si-allena' },
]
const ids = (chi) => GUIDE.filter((g) => guidaPerChi(g, chi)).map((g) => g.id)

test('il solo PT vede solo le guide di quello che ha', () => {
  assert.deepEqual(ids(SOLO_PT), ['feed', 'profilo-pt', 'lavoro-pt', 'foto-atleti', 'esercizi'])
})

test('chi si allena non vede le guide del lavoro da PT', () => {
  assert.deepEqual(ids(ATLETA), ['nuova-scheda', 'dieta-giorno', 'feed', 'profilo', 'foto', 'esercizi', 'alimenti'])
})

test('il PT che si allena vede tutto tranne le guide del solo PT', () => {
  assert.deepEqual(ids(PT), [
    'nuova-scheda', 'dieta-giorno', 'feed', 'profilo', 'foto', 'lavoro', 'foto-atleti', 'esercizi', 'alimenti',
  ])
})

test('senza guida: no', () => {
  assert.equal(guidaPerChi(null, PT), false)
})
