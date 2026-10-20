import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { gruppoDi } from '../lib/muscoli'
import { patchMuscoli } from '../lib/eserciziLibreria'
import { conMuscoliCompletati, muscoliDaCompletare, sceltaCompleta } from '../lib/muscoliDaCompletare'
import SceltaGruppi from './SceltaGruppi'

// ---------------------------------------------------------------------------
// L'avviso dei MUSCOLI DA COMPLETARE (2026-10-20), all'apertura dell'app, a
// chi ha esercizi salvati di gambe, spalle o schiena che non dicono quali
// muscoli lavorano (lib/muscoliDaCompletare): oggi il corpo li indovina dal
// nome, e con un nome che non conosce accende il gruppo intero.
//
// Si sceglie una volta per esercizio (nome e gruppi): vale per le schede e per
// gli allenamenti già fatti. Già acceso quello che si indovina dal nome, da
// controllare; quelli che dal nome non si sanno vanno in cima e vanno scelti.
// "Più tardi" lo rimanda alla prossima apertura: torna finché ce n'è uno.
//
// Lo monta AvvisoSottogruppi quando non ha niente da dire: due finestre
// all'apertura, una dopo l'altra, mai insieme.
// ---------------------------------------------------------------------------

// "Più tardi" vale fino alla prossima apertura: basta che stia in memoria.
let rimandato = false

export default function AvvisoMuscoli() {
  const { schede, aggiornaScheda } = useStore()
  const [passo, setPasso] = useState('avviso')
  const [chiuso, setChiuso] = useState(rimandato)
  const righe = useMemo(() => muscoliDaCompletare(schede), [schede])
  // Le scelte, per chiave; si parte dall'ipotesi dal nome.
  const [scelte, setScelte] = useState(() => new Map())

  if (chiuso || righe.length === 0) return null

  const sceltaDi = (r) => scelte.get(r.chiave) || { gruppi: r.gruppi, sottogruppi: r.ipotesi }
  const cambia = (r, s) => setScelte((m) => new Map(m).set(r.chiave, s))
  const mancano = righe.filter((r) => !sceltaCompleta(sceltaDi(r))).length

  const piuTardi = () => {
    rimandato = true
    setChiuso(true)
  }
  const salva = () => {
    if (mancano > 0) return
    const tutte = new Map(righe.map((r) => [r.chiave, sceltaDi(r)]))
    for (const s of schede) {
      const nuova = conMuscoliCompletati(s, tutte)
      if (nuova !== s) aggiornaScheda(nuova)
    }
    setChiuso(true)
  }

  const daSapere = righe.filter((r) => r.ipotesi.length === 0).length

  return (
    <div className="modal-backdrop al-centro">
      <div className="modal avviso-sottogruppi" role="dialog" aria-label="Completa i muscoli degli esercizi">
        {passo === 'avviso' ? (
          <>
            <h3>Quali muscoli lavorano?</h3>
            <p className="muted avviso-testo">
              Il corpo del recap si colora coi muscoli scelti per ogni esercizio.{' '}
              {righe.length === 1
                ? 'Un esercizio che hai salvato non li dice ancora: per ora li indoviniamo dal nome.'
                : `${righe.length} esercizi che hai salvato non li dicono ancora: per ora li indoviniamo dal nome.`}
            </p>
            {daSapere > 0 && (
              <p className="avviso-testo">
                {daSapere === 1
                  ? 'Di uno non sappiamo niente, e si accende il gruppo intero.'
                  : `Di ${daSapere} non sappiamo niente, e si accende il gruppo intero.`}
              </p>
            )}
            <button className="btn btn-accent btn-block" onClick={() => setPasso('elenco')}>
              Controlla e completa
            </button>
            <button className="btn btn-block" style={{ marginTop: 8 }} onClick={piuTardi}>
              Più tardi
            </button>
            <p className="faint avviso-nota">Più tardi: te lo richiediamo alla prossima apertura.</p>
          </>
        ) : (
          <>
            <h3>Scegli i muscoli</h3>
            <p className="muted avviso-testo">
              Una volta per esercizio: vale per le schede e per gli allenamenti già fatti.
            </p>
            <ul className="avviso-elenco avviso-muscoli">
              {righe.map((r) => {
                const s = sceltaDi(r)
                const manca = !sceltaCompleta(s)
                return (
                  <li key={r.chiave}>
                    <strong>{r.nome}</strong>
                    <span className="faint">
                      {[
                        r.gruppi.map((g) => gruppoDi(g)?.label || g).join(', '),
                        r.inScheda > 0 && (r.inScheda === 1 ? 'in una scheda' : `in ${r.inScheda} schede`),
                        r.fatti > 0 && (r.fatti === 1 ? 'in un allenamento fatto' : `in ${r.fatti} allenamenti fatti`),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <SceltaGruppi
                      compatto
                      valori={s.gruppi}
                      onChange={(g) =>
                        cambia(r, patchMuscoli({ nome: r.nome, gruppi: s.gruppi, sottogruppi: s.sottogruppi }, g))
                      }
                      sottogruppi={s.sottogruppi}
                      onSottogruppi={(sg) => cambia(r, { ...s, sottogruppi: sg })}
                      mancaSotto={manca}
                    />
                  </li>
                )
              })}
            </ul>
            <button className="btn btn-accent btn-block" onClick={salva} disabled={mancano > 0}>
              {mancano > 0 ? `Mancano ${mancano === 1 ? 'un esercizio' : `${mancano} esercizi`}` : 'Salva i muscoli'}
            </button>
            <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 6 }} onClick={piuTardi}>
              Più tardi
            </button>
          </>
        )}
      </div>
    </div>
  )
}
