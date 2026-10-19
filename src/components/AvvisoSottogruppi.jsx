import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { gruppoDi } from '../lib/muscoli'
import { conGruppiProposti, proposteGruppi } from '../lib/proposteGruppi'

// ---------------------------------------------------------------------------
// L'avviso dei SOTTOGRUPPI (2026-10-19), una volta sola, a chi ha già schede o
// allenamenti salvati con i gruppi di prima (lib/proposteGruppi).
//
// I gruppi nuovi non si applicano da soli: lo stacco rumeno salvato "schiena"
// resta schiena finché chi l'ha salvato non dice di sì. Tre risposte:
//   - Modifica: l'elenco di cosa cambia, esercizio per esercizio, e un tasto
//     per applicare tutto (schede e allenamenti già fatti, che così arrivano
//     giusti anche nel feed degli amici);
//   - Più tardi: sparisce fino alla prossima apertura dell'app;
//   - Rifiuta: restano come sono e non si chiede più. Si ricorda nelle
//     preferenze del profilo (`avvisi.sottogruppi`), così vale su ogni telefono.
//
// Non compare durante l'allenamento, né prima che i dati siano arrivati dal
// cloud: un "Rifiuta" dato da un altro telefono deve fare in tempo ad arrivare.
// ---------------------------------------------------------------------------

// "Più tardi" vale fino alla prossima apertura: basta che stia in memoria.
let rimandato = false

const nomi = (ids) => ids.map((id) => gruppoDi(id)?.label || id).join(', ')

export default function AvvisoSottogruppi({ nascosto = false }) {
  const { schede, aggiornaScheda, preferenze, aggiornaPreferenze, statoCloud } = useStore()
  const [passo, setPasso] = useState('avviso')
  const [chiuso, setChiuso] = useState(rimandato)
  const proposte = useMemo(() => proposteGruppi(schede), [schede])

  const rifiutato = preferenze?.avvisi?.sottogruppi === 'rifiutato'
  if (nascosto || chiuso || rifiutato || statoCloud === 'caricamento' || proposte.length === 0) return null

  const piuTardi = () => {
    rimandato = true
    setChiuso(true)
  }
  const rifiuta = () => {
    aggiornaPreferenze({ avvisi: { ...preferenze?.avvisi, sottogruppi: 'rifiutato' } })
    setChiuso(true)
  }
  const applica = () => {
    for (const s of schede) {
      const nuova = conGruppiProposti(s)
      if (nuova !== s) aggiornaScheda(nuova)
    }
    setChiuso(true)
  }

  return (
    <div className="modal-backdrop al-centro">
      <div className="modal avviso-sottogruppi" role="dialog" aria-label="Novità: i sottogruppi muscolari">
        {passo === 'avviso' ? (
          <>
            <h3>Novità: i sottogruppi muscolari</h3>
            <p className="muted avviso-testo">
              Gambe, spalle e schiena ora sono divise nei loro muscoli: quadricipiti, femorali e adduttori, i tre
              deltoidi, dorsali, trapezio, romboidi e lombari. Nel recap si accende il muscolo che hai lavorato davvero.
              E alcuni esercizi ora lavorano più gruppi: lo stacco rumeno è gambe, schiena e glutei.
            </p>
            <p className="avviso-testo">
              {proposte.length === 1
                ? 'Un esercizio che hai già salvato ha ancora i gruppi di prima.'
                : `${proposte.length} esercizi che hai già salvato hanno ancora i gruppi di prima.`}{' '}
              Puoi aggiornarli: prima ti facciamo vedere cosa cambia.
            </p>
            <button className="btn btn-accent btn-block" onClick={() => setPasso('elenco')}>
              Modifica
            </button>
            <button className="btn btn-block" style={{ marginTop: 8 }} onClick={piuTardi}>
              Più tardi
            </button>
            <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={rifiuta}>
              Rifiuta
            </button>
            <p className="faint avviso-nota">Rifiuta: restano come sono e non te lo chiediamo più.</p>
          </>
        ) : (
          <>
            <h3>Cosa cambia</h3>
            <ul className="avviso-elenco">
              {proposte.map((p) => (
                <li key={`${p.nome}|${p.prima.join(',')}`}>
                  <strong>{p.nome}</strong>
                  <span>
                    {nomi(p.prima)} → {nomi(p.dopo)}
                  </span>
                  <span className="faint">
                    {[
                      p.inScheda > 0 && (p.inScheda === 1 ? 'in una scheda' : `in ${p.inScheda} schede`),
                      p.fatti > 0 && (p.fatti === 1 ? 'in un allenamento fatto' : `in ${p.fatti} allenamenti fatti`),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn btn-accent btn-block" onClick={applica}>
              Applica le modifiche
            </button>
            <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={() => setPasso('avviso')}>
              Indietro
            </button>
          </>
        )}
      </div>
    </div>
  )
}
