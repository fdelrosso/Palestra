// Prova delle tre viste trasversali (storico, schede generali, comunita')
// adesso che non leggono piu' il localStorage ma ricevono un "collettivo".
//
// Il caso che conta piu' di tutti: SCHEDA NASCOSTA + ALLENAMENTO PUBBLICO.
// Le due visibilita' sono indipendenti — l'allenamento deve uscire, la scheda
// no, e di quella scheda non si deve sapere niente.
//
//     node scratchpad/prova-collettivo.mjs
//
// Stesso gancio degli altri harness: Node non risolve gli import senza .js.

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try { return await next(specifier, context) }
        catch (e) {
          if (specifier.startsWith('.') && !specifier.endsWith('.js')) {
            return next(specifier + '.js', context)
          }
          throw e
        }
      }
    `),
  pathToFileURL('./'),
)

// localStorage non esiste in Node: le funzioni che lo toccano ancora (archivio
// dei profili cancellati) devono trovare qualcosa, non esplodere.
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const BASE = new URL('../src/', import.meta.url).href
const { normalizzaScheda, nuovaScheda, nuovoGiorno, nuovoEsercizio } = await import(
  BASE + 'data/model.js'
)
const { storicoGlobale, allenamentiDiUtente } = await import(BASE + 'lib/storico.js')
const { schedeGenerali, schedeDiUtente } = await import(BASE + 'lib/schedeGenerali.js')
const { popolaritaEsercizi, influenzaPt } = await import(BASE + 'lib/comunita.js')

const IO = 'io'
const PT = 'pt'
const COMPAGNO = 'compagno'
const ESTRANEO = 'estraneo'
// Chi tiene per se' il programma ma pubblica gli allenamenti: di lui il server
// manda gli allenamenti e NESSUNA scheda.
const SEGRETA = 'segreta'

function scheda({ nome, visibilita = 'pubblica', libera = false, esercizi = [] }) {
  return normalizzaScheda(
    nuovaScheda({
      nome,
      visibilita,
      libera,
      giorni: [
        nuovoGiorno({
          tipo: 'workout',
          nome: 'A',
          esercizi: esercizi.map((n) => nuovoEsercizio({ nome: n })),
        }),
      ],
    }),
  )
}

// Un allenamento svolto, come lo manda `allenamenti_visibili()`: il nome della
// scheda e del giorno sono DENTRO, congelati a fine allenamento.
function svolto({ utenteId, utenteNome, relazionePt = 0, nomeScheda, data, visibilita, esercizi }) {
  return {
    utenteId,
    utenteNome,
    schedaId: 's-' + utenteId,
    relazionePt,
    completamento: {
      settimana: 1,
      giornoId: 'x',
      data,
      visibilita,
      nomeScheda,
      nomeGiorno: 'A',
      durataSec: 3600,
      esercizi: esercizi.map((n) => ({ nome: n, gruppo: '', schema: {}, sets: [] })),
    },
  }
}

const riga = (utenteId, utenteNome, autoreEPt, relazionePt, s) => ({
  utenteId,
  utenteNome,
  autoreEPt,
  relazionePt,
  scheda: s,
})

// Il collettivo COSI' COME LO MANDA IL SERVER: due liste separate, gia'
// filtrate. Le schede arrivano senza completamenti.
const collettivo = {
  schede: [
    // ⚠️ La MIA e' nascosta, ma sotto c'e' un mio allenamento pubblicato.
    riga(IO, 'Io', false, 0, scheda({ nome: 'La mia', visibilita: 'nascosta', esercizi: ['Panca piana'] })),
    riga(PT, 'Marco', true, 2, scheda({ nome: 'Scheda del PT', esercizi: ['Stacco da terra', 'Rematore'] })),
    riga(COMPAGNO, 'Luca', false, 1, scheda({ nome: 'Scheda del compagno', esercizi: ['Squat'] })),
    riga(ESTRANEO, 'Anna', false, 0, scheda({ nome: 'Scheda di una sconosciuta', esercizi: ['Curl bilanciere'] })),
    riga(ESTRANEO, 'Anna', false, 0, scheda({ nome: 'Allenamenti consigliati', libera: true })),
    // ⚠️ Una sconosciuta che tiene per se' il programma e pubblica gli
    // allenamenti: la scheda NON arriva affatto (il server non la manda), e
    // infatti qui non c'e'. Il suo allenamento invece si', qui sotto.
  ],
  allenamenti: [
    svolto({ utenteId: IO, utenteNome: 'Io', nomeScheda: 'La mia', data: '2026-09-01',
             visibilita: 'nascosta', esercizi: ['Panca piana'] }),
    svolto({ utenteId: IO, utenteNome: 'Io', nomeScheda: 'La mia', data: '2026-09-05',
             visibilita: 'pubblica', esercizi: ['Panca piana'] }),
    svolto({ utenteId: PT, utenteNome: 'Marco', relazionePt: 2, nomeScheda: 'Scheda del PT',
             data: '2026-09-02', visibilita: 'pubblica', esercizi: ['Stacco da terra'] }),
    svolto({ utenteId: COMPAGNO, utenteNome: 'Luca', relazionePt: 1, nomeScheda: 'Scheda del compagno',
             data: '2026-09-03', visibilita: 'pubblica', esercizi: ['Squat'] }),
    svolto({ utenteId: ESTRANEO, utenteNome: 'Anna', nomeScheda: 'Scheda di una sconosciuta',
             data: '2026-09-04', visibilita: 'pubblica', esercizi: ['Curl bilanciere'] }),
    svolto({ utenteId: SEGRETA, utenteNome: 'Gio', nomeScheda: 'Il mio programma',
             data: '2026-09-06', visibilita: 'pubblica', esercizi: ['Trazioni'] }),
  ],
  fama: new Map([[PT, 4]]),
}

const ok = (etichetta, atteso, avuto) => {
  const bene = JSON.stringify(atteso) === JSON.stringify(avuto)
  console.log(`${bene ? 'ok  ' : 'NO  '} ${etichetta}: ${JSON.stringify(avuto)}`)
  if (!bene) console.log(`     atteso ${JSON.stringify(atteso)}`)
  return bene
}

let tutto = true

// --- STORICO --------------------------------------------------------------
const voci = storicoGlobale({ collettivo, ioId: IO })
tutto &= ok(
  'storico: dal piu recente, e il MIO nascosto c e lo stesso',
  ['2026-09-06', '2026-09-05', '2026-09-04', '2026-09-03', '2026-09-02', '2026-09-01'],
  voci.map((v) => v.data),
)
tutto &= ok(
  'storico: ogni voce ha il nome di chi l ha fatto',
  ['Gio', 'Io', 'Anna', 'Luca', 'Marco', 'Io'],
  voci.map((v) => v.utenteNome),
)
tutto &= ok(
  'storico: chi NON e entrato non vede il nascosto di nessuno',
  ['2026-09-06', '2026-09-05', '2026-09-04', '2026-09-03', '2026-09-02'],
  storicoGlobale({ collettivo, ioId: null }).map((v) => v.data),
)
tutto &= ok(
  'allenamenti di un solo profilo',
  ['2026-09-03'],
  allenamentiDiUtente({ id: COMPAGNO, nome: 'Luca' }, { collettivo }).map((v) => v.data),
)

// ⚠️ IL PUNTO: la scheda e nascosta, l allenamento fatto dentro e pubblico.
tutto &= ok(
  'SCHEDA NASCOSTA + ALLENAMENTO PUBBLICO: l allenamento esce, con il nome della scheda che si e portato dietro',
  [true, 'La mia'],
  (() => {
    const v = storicoGlobale({ collettivo, ioId: null }).find((x) => x.data === '2026-09-05')
    return [!!v, v?.nomeScheda]
  })(),
)
tutto &= ok(
  'chi pubblica SOLO allenamenti (nessuna scheda) compare nello storico col suo nome',
  [true, 'Gio'],
  (() => {
    const v = storicoGlobale({ collettivo, ioId: null }).find((x) => x.utenteId === SEGRETA)
    return [!!v, v?.utenteNome]
  })(),
)

// --- SCHEDE GENERALI ------------------------------------------------------
const generali = schedeGenerali({ collettivo, utente: { id: IO } })
tutto &= ok(
  'schede generali: prima il PT, poi il compagno, poi le altre dalla piu recente; la libera fuori; la mia nascosta c e',
  ['Scheda del PT', 'Scheda del compagno', 'Scheda di una sconosciuta', 'La mia'],
  generali.map((g) => g.nome),
)
tutto &= ok(
  'schede generali: della scheda nascosta di chi pubblica solo allenamenti non c e traccia',
  false,
  generali.some((g) => g.utenteId === SEGRETA),
)
tutto &= ok(
  'schede generali: la scheda del PT e marcata come sua',
  [true, 2],
  [generali[0].autoreEPt, generali[0].relazionePt],
)
tutto &= ok(
  'schede di un solo profilo',
  ['Scheda del PT'],
  schedeDiUtente({ id: PT }, { collettivo }).map((s) => s.nome),
)

// --- COMUNITA' ------------------------------------------------------------
const com = popolaritaEsercizi({ collettivo, escludiUtenteId: IO })
const nomiCom = () => Object.values(com.perGruppo).flat().map((e) => e.nome)
tutto &= ok('comunita: quante persone (io escluso)', 4, com.nUtenti)
tutto &= ok('comunita: non e vuota', false, com.vuota)
tutto &= ok(
  'comunita: la panca e SOLO mia, quindi qui non c e',
  false,
  nomiCom().includes('Panca piana'),
)
tutto &= ok(
  'comunita: le trazioni ci sono, e arrivano da un allenamento dentro una scheda che non vedo',
  true,
  nomiCom().includes('Trazioni'),
)

const conPt = influenzaPt({ collettivo, utente: { id: IO }, mioPt: { id: PT, nome: 'Marco' } })
const nomiPt = (x) => Object.values(x.perGruppo).flat().map((e) => e.nome)
tutto &= ok(
  'influenza col MIO pt: e sua, si chiama Marco, 4 atleti (dal database)',
  [true, 'Marco', 4, 1],
  [conPt.tuo, conPt.nome, conPt.nAtleti, conPt.nPt],
)
tutto &= ok(
  'influenza col MIO pt: entra lo stacco (suo) e NON il curl della sconosciuta',
  [true, false],
  [nomiPt(conPt).includes('Stacco da terra'), nomiPt(conPt).includes('Curl bilanciere')],
)

const senzaPt = influenzaPt({ collettivo, utente: { id: IO }, mioPt: null })
tutto &= ok(
  'influenza SENZA pt: contano solo le schede scritte dai PT',
  [false, 1, false],
  [senzaPt.tuo, senzaPt.nPt, senzaPt.vuota],
)
tutto &= ok(
  'influenza SENZA pt: c e lo stacco del PT, non lo squat del compagno',
  [true, false],
  [nomiPt(senzaPt).includes('Stacco da terra'), nomiPt(senzaPt).includes('Squat')],
)
tutto &= ok(
  'influenza senza collettivo: vuota, non rotta',
  [false, true, 0],
  (() => {
    const v = influenzaPt({})
    return [v.tuo, v.vuota, v.nPt]
  })(),
)
tutto &= ok('storico senza collettivo: lista vuota, non rotta', 0, storicoGlobale({}).length)
tutto &= ok('schede generali senza collettivo: lista vuota, non rotta', 0, schedeGenerali({}).length)

console.log('')
console.log(tutto ? 'TUTTO A POSTO' : 'QUALCOSA NON TORNA')
process.exit(tutto ? 0 : 1)
