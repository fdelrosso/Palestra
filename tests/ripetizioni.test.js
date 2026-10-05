import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// Come le altre prove: i moduli di src/ importano senza estensione (Vite li
// risolve, Node no), quindi un loader minimo aggiunge `.js`.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx) }
        catch (e) {
          if (spec.startsWith('.') && !spec.endsWith('.js')) return next(spec + '.js', ctx)
          throw e
        }
      }`),
)

const { riepilogoSessione } = await import('../src/lib/session.js')
const { storicoCarichi } = await import('../src/lib/carico.js')
const { vocePerFase } = await import('../src/lib/carico.js')

// "Duro" (🔴) chiede a quante ripetizioni si è arrivati: il numero sta nella
// serie (`rip`) e deve arrivare fino allo storico dell'esercizio.
const sessione = {
  schedaId: 's1',
  nomeScheda: 'Scheda',
  settimana: 1,
  giornoId: 'g1',
  nomeGiorno: 'Petto',
  inizio: '2026-10-01T10:00:00.000Z',
  esercizi: [
    {
      nome: 'Panca piana',
      schema: { serie: '3', ripetizioni: '10', carico: '60 kg' },
      sets: [{ colore: 'verde' }, { colore: 'giallo' }, { colore: 'rosso', rip: 7 }],
    },
  ],
}

test('il riepilogo salvato tiene le ripetizioni delle serie dure, e niente sulle altre', () => {
  const r = riepilogoSessione(sessione, '2026-10-01T11:00:00.000Z')
  assert.deepEqual(r.esercizi[0].sets, [{ colore: 'verde' }, { colore: 'giallo' }, { colore: 'rosso', rip: 7 }])
})

test('lo storico dell esercizio porta le ripetizioni fatte, al posto giusto', () => {
  const r = riepilogoSessione(sessione, '2026-10-01T11:00:00.000Z')
  const storico = storicoCarichi([{ nome: 'Scheda', completamenti: [r] }])
  const [voce] = [...storico.values()][0]
  assert.deepEqual(voce.colori, ['verde', 'giallo', 'rosso'])
  assert.deepEqual(voce.fatte, [null, null, 7])
})

test('con le fasi, ogni fase si porta le sue ripetizioni fatte', () => {
  const conFasi = {
    ...sessione,
    esercizi: [
      {
        nome: 'Squat',
        schema: { serie: '5', ripetizioni: '5/5/5/2/2', carico: '100/100/100/120/120' },
        sets: [{ colore: 'verde' }, { colore: 'verde' }, { colore: 'giallo' }, { colore: 'rosso', rip: 1 }, { colore: 'rosso', rip: 2 }],
      },
    ],
  }
  const storico = storicoCarichi([{ nome: 'Scheda', completamenti: [riepilogoSessione(conFasi, '2026-10-01T11:00:00.000Z')] }])
  const [voce] = [...storico.values()][0]
  assert.deepEqual(vocePerFase(voce, 1).fatte, [1, 2])
  assert.deepEqual(vocePerFase(voce, 0).fatte, [null, null, null])
})
