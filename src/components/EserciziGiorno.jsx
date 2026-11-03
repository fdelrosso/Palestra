import { useEffect } from 'react'
import { schemaPerSettimana } from '../data/model'
import { formattaSecondi } from '../lib/schema'
import { diRiscaldamento, RISCALDAMENTO, riscaldamentoInTesta, STRETCHING, vociDi } from '../lib/preparazione'
import { blocchi, eSuperserie, recuperoBlocco } from '../lib/superserie'
import EsercizioAllegati from './EsercizioAllegati'
import EsercizioCard from './EsercizioCard'
import Preparazione from './Preparazione'
import { IconCatena } from './icons'

// ---------------------------------------------------------------------------
// Gli esercizi di un giorno, in sola lettura: riscaldamento, esercizi e
// superserie, stretching. Li mostrano la scheda (pages/SchedaPage) e la scheda
// appena arrivata dal PT (pages/SchedaArrivataPage). `svolto(e)`: com'è andato
// un esercizio, se il giorno è stato fatto.
// ---------------------------------------------------------------------------

export default function EserciziGiorno({ giorno, settimana, carichi = null, svolto = () => null }) {
  // ?esercizio=<id>: si arriva da una notifica (pages/NotifichePage) e si
  // scende fino a quell'esercizio, coi suoi allegati.
  const daMostrare = new URLSearchParams(window.location.search).get('esercizio')
  useEffect(() => {
    if (daMostrare) document.getElementById('esercizio-' + daMostrare)?.scrollIntoView({ block: 'center' })
  }, [daMostrare])

  // I cardio di riscaldamento (nel riquadro del riscaldamento) e gli altri,
  // nell'ordine dell'allenamento (lib/preparazione, riscaldamentoInTesta).
  const ordinati = riscaldamentoInTesta(giorno.esercizi || [])
  const cardioRisc = ordinati.filter(diRiscaldamento)
  const altri = ordinati.filter((e) => !diRiscaldamento(e))

  return (
    <>
    {/* IL RISCALDAMENTO, in un riquadro giallo (il colore della sua
        parte nella barra dell'allenamento): le voci scritte e i cardio
        di riscaldamento (lib/preparazione), nell'ordine in cui si fanno
        in allenamento. Poi "Esercizi" e il resto. Senza riscaldamento
        il giorno di sempre. */}
    {(vociDi(giorno.riscaldamento).length > 0 || cardioRisc.length > 0) && (
      <section className="blocco-riscaldamento" aria-label="Riscaldamento">
        <div className="blocco-riscaldamento-titolo">Riscaldamento</div>
        <div className="stack" style={{ gap: 10 }}>
          {/* Facoltativo: senza, Preparazione non disegna niente. */}
          <Preparazione info={RISCALDAMENTO} testo={giorno.riscaldamento} />
          {cardioRisc.map((e) => (
            <div key={e.id} id={'esercizio-' + e.id}>
              <EsercizioCard esercizio={e} settimana={settimana} carichi={carichi} fatto={svolto(e)} />
              <EsercizioAllegati esercizio={e} readOnly />
            </div>
          ))}
        </div>
      </section>
    )}
    {(vociDi(giorno.riscaldamento).length > 0 || cardioRisc.length > 0) && altri.length > 0 && (
      <div className="section-title" style={{ marginTop: 20, marginBottom: 0 }}>
        Esercizi
      </div>
    )}

    <div className="stack" style={{ marginTop: 12 }}>
      {blocchi(altri).map((b) => {
        const voce = (e) => (
          <div key={e.id} id={'esercizio-' + e.id}>
            {/* Il peso ha il colore del consiglio, e al tocco lo apre. */}
            <EsercizioCard esercizio={e} settimana={settimana} carichi={carichi} fatto={svolto(e)} />
            <EsercizioAllegati esercizio={e} readOnly />
          </div>
        )
        if (!eSuperserie(b)) return voce(altri[b.inizio])
        // La superserie: gli esercizi restano uno per uno (ognuno ha
        // il suo schema), dentro un riquadro che dice che si fanno di
        // fila e qual è il recupero, quello di fine giro.
        const rec = formattaSecondi(recuperoBlocco(altri, b, (e) => schemaPerSettimana(e, settimana)))
        return (
          <div key={altri[b.inizio].id} className="superserie-blocco">
            <div className="superserie-titolo">
              <IconCatena width={15} height={15} />
              {b.indici.length === 2 ? 'Superserie' : `Superserie da ${b.indici.length}`}
              <span className="superserie-sub">
                di fila{rec ? `, poi recupero ${rec}` : ', recupero a fine giro'}
              </span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {b.indici.map((i) => voce(altri[i]))}
            </div>
          </div>
        )
      })}
    </div>

    <Preparazione info={STRETCHING} testo={giorno.stretching} style={{ marginTop: 12 }} />
    </>
  )
}
