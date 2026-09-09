import { nuovaScheda, nuovoGiorno, nuovoEsercizio, schemaVuoto } from './model'

// Piccoli helper per scrivere la scheda in modo compatto.
const sc = (serie, ripetizioni, carico = '', recupero = '', nota = '') =>
  schemaVuoto({ serie, ripetizioni, carico, recupero, nota })

// Esercizio con schema uguale per tutte le settimane.
const ex = (nome, schemaBase, nota = '') =>
  nuovoEsercizio({ nome, nota, variaPerSettimana: false, schemaBase })

// Esercizio con uno schema per settimana (array lungo quanto le settimane).
const exW = (nome, settimane, nota = '') =>
  nuovoEsercizio({ nome, nota, variaPerSettimana: true, settimane })

const giornoA = nuovoGiorno({
  nome: 'Giorno A',
  esercizi: [
    ex('Slanci al macchinario (solo destra)', sc('3', '15/12'), 'Pre panca'),
    exW(
      'Panca piana',
      [
        sc('8', '3', '90kg', '1min'),
        sc('6', '4', '90kg', '1,15min'),
        sc('5', '5', '90kg', '1,45min'),
        sc('4', '6', '90kg', '1,45min'),
        sc('4', '3', '90kg', '1min'),
      ],
      'Solite regole ma stai bene attento ad extrarotatore di sx e a gluteo dx!!',
    ),
    exW('Seal row', [
      sc('8', '3', '80kg', '1min'),
      sc('6', '4', '80kg', '1,15min'),
      sc('5', '5', '80kg', '1,45min'),
      sc('4', '6', '80kg', '1,45min'),
      sc('4', '3', '80kg', '1min'),
    ]),
    ex('Military', sc('4', '3', '50kg', '1min')),
    exW(
      'Pectoral machine',
      [
        sc('4', '8', '', '1,15min'),
        sc('4', '8', '', '1,15min'),
        sc('4', '8', '', '1,15min'),
        sc('4', '8', '', '1,15min'),
        sc('3', '8', '', '1,15min'),
      ],
      '12rm',
    ),
    exW(
      'Leg curl seduto',
      [
        sc('6', '6', '', '1,5min'),
        sc('6', '6', '', '1,5min'),
        sc('6', '6', '', '1,5min'),
        sc('6', '6', '', '1,5min'),
        sc('3', '6', '', '1,5min'),
      ],
      'Max stretching · 10rm',
    ),
    exW(
      'Stacco rumeno',
      [
        sc('4', '8', '', '1,5min'),
        sc('4', '8', '', '1,5min'),
        sc('4', '8', '', '1,5min'),
        sc('4', '8', '', '1,5min'),
        sc('4', '6', '', '1,5min'),
      ],
      '12rm',
    ),
  ],
})

const giornoB = nuovoGiorno({
  nome: 'Giorno B',
  esercizi: [
    ex('Curl a 45 manubri', sc('4', '7/6', '', '1,5min'), '10rm'),
    ex('Push down', sc('4', '10', '', '1min'), '15rm'),
    exW(
      'Pullover manubrio',
      [
        sc('5', '5', '', '1,5min'),
        sc('5', '5', '', '1,5min'),
        sc('5', '5', '', '1,5min'),
        sc('5', '5', '', '1,5min'),
        sc('4', '4', '', '1,5min'),
      ],
      '10rm',
    ),
    ex('Alzate laterali', sc('4', '10', '', '1min'), '15rm'),
    ex('Calf polpacci', sc('4', '10', '', '1min'), '15rm'),
    ex('Addome', sc('4', '')),
  ],
})

const giornoC = nuovoGiorno({
  nome: 'Giorno C',
  esercizi: [
    ex('Slancio a dx', sc('3', '15/12')),
    exW(
      'Squat multipower con rialzo',
      [
        sc('5', '5', '', '2min'),
        sc('5', '5', '', '2min'),
        sc('5', '5', '', '2min'),
        sc('5', '5', '', '2min'),
        sc('4', '4', '', '2min'),
      ],
      '8rm',
    ),
    exW(
      'Affondo o pressa 45 mono',
      [
        sc('3', '12/10', '', '30" tra gli arti'),
        sc('3', '12/10', '', '30" tra gli arti'),
        sc('3', '12/10', '', '30" tra gli arti'),
        sc('3', '12/10', '', '30" tra gli arti'),
        sc('2', '12/10', '', '30" tra gli arti'),
      ],
      '15rm',
    ),
    exW(
      'Leg extension',
      [
        sc('3', '15/12', '', '1min', 'Cedimento'),
        sc('3', '15/12', '', '1min', 'Cedimento'),
        sc('3', '15/12', '', '1min', 'Cedimento'),
        sc('3', '15/12', '', '1min', 'Cedimento'),
        sc('2', '12', '', '1min', 'Cedimento'),
      ],
      '15rm',
    ),
    exW(
      'Leg curl sdraiato',
      [
        sc('4', '9', '', '1,5min'),
        sc('4', '9', '', '1,5min'),
        sc('4', '9', '', '1,5min'),
        sc('4', '9', '', '1,5min'),
        sc('4', '7', '', '1,5min'),
      ],
      'Gluteo appena contratto · 12rm',
    ),
  ],
})

const giornoD = nuovoGiorno({
  nome: 'Giorno D',
  esercizi: [
    ex('Slancio a dx', sc('3', '15/12')),
    exW('Military', [
      sc('8', '3', '50kg', '1min'),
      sc('6', '4', '50kg', '1,15min'),
      sc('5', '5', '50kg', '1,45min'),
      sc('4', '6', '50kg', '1,45min'),
      sc('4', '3', '50kg', '1min'),
    ]),
    exW('Trazioni zavorra', [
      sc('8', '3', '10kg', '1min'),
      sc('6', '4', '10kg', '1,15min'),
      sc('5', '5', '10kg', '1,45min'),
      sc('4', '6', '10kg', '1,45min'),
      sc('4', '3', '10kg', '1min'),
    ]),
    ex('Panca piana', sc('4', '3', '90kg', '1min')),
    ex(
      'Lat machine presa inversa + Curl martello (superset)',
      sc('4 giri', '8', '', '1,15min'),
      'Lat presa inversa 8 reps (12rm) in superset con curl martello gomiti appoggiati 8 reps (12rm). In settimana 5 passi a 3 giri.',
    ),
    ex(
      'Push down con schienale + Pek back (superset)',
      sc('4 giri', '7'),
      'Push down con schienale 7 reps (10rm) in superset con pek back deltoidi posteriori 10 reps (12rm). In settimana 5 passi a 3 giri.',
    ),
    ex('Calf alla pressa', sc('4', '10', '', '1min'), '15rm'),
  ],
})

const rest1 = nuovoGiorno({ tipo: 'rest', nome: 'Rest' })
const restBici = nuovoGiorno({ tipo: 'rest', nome: 'Rest', nota: 'bici' })
const rest2 = nuovoGiorno({ tipo: 'rest', nome: 'Rest' })

export function schedaEsempio() {
  return nuovaScheda({
    nome: 'Forza & Ipertrofia — 5 settimane',
    nota: 'Scheda del PT. Rotazione settimanale: A · B · Rest · C · D · Rest (bici) · Rest.',
    numeroSettimane: 5,
    settimanaCorrente: 1,
    giorni: [giornoA, giornoB, rest1, giornoC, giornoD, restBici, rest2],
  })
}
