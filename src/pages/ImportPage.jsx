import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { parseSchedaTesto } from '../lib/parser'
import { gruppiEsercizio, patchGruppi } from '../lib/eserciziLibreria'
import { navigate, goBack, routes } from '../lib/router'
import SceltaGruppi from '../components/SceltaGruppi'
import { IconBack } from '../components/icons'

// ---------------------------------------------------------------------------
// Importa una scheda da un messaggio del PT. In DUE passaggi:
//
//   1. si incolla il testo e l'app lo legge;
//   2. prima di salvare, si dice a che gruppi muscolari lavora ogni esercizio.
//
// ⚠️ Il passaggio 2 è obbligatorio, e c'è per un difetto visto davvero: le
// schede importate non avevano gruppi, l'app li indovinava dal nome, e sbagliava
// in silenzio — lo "Stacco rumeno" di una scheda vera non accendeva le gambe
// nel recap. I messaggi del PT sono scritti a modo suo ("Military", "Lat
// inversa più stretta delle spalle"): indovinare è il punto di partenza, non la
// risposta. Quindi l'ipotesi si propone, ma la scheda non si salva finché ogni
// esercizio non ha almeno un gruppo.
//
// Più gruppi per esercizio, e il primo è il principale: i dip sono petto E
// tricipiti (components/SceltaGruppi).
// ---------------------------------------------------------------------------

function esercizi(scheda) {
  return (scheda?.giorni || []).flatMap((g) => (g.tipo === 'rest' ? [] : g.esercizi || []))
}

export default function ImportPage() {
  const { aggiungiScheda } = useStore()
  const [nome, setNome] = useState('')
  const [testo, setTesto] = useState('')
  const [bozza, setBozza] = useState(null)
  // Gli esercizi a cui il gruppo l'ha messo l'app: si segnano, perché chi
  // controlla guardi quelli prima degli altri.
  const [indovinati, setIndovinati] = useState(() => new Set())

  const leggi = () => {
    if (!testo.trim()) return
    const scheda = parseSchedaTesto(testo, nome.trim() || 'Scheda importata')
    const ipotesi = new Set()
    const conIpotesi = {
      ...scheda,
      giorni: scheda.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => {
          const g0 = gruppiEsercizio(e)
          if (g0.length > 0 && !(e.gruppi || []).length) ipotesi.add(e.id)
          return { ...e, ...patchGruppi(g0) }
        }),
      })),
    }
    setIndovinati(ipotesi)
    setBozza(conIpotesi)
  }

  const cambiaGruppi = (id, gruppi) => {
    setBozza((s) => ({
      ...s,
      giorni: s.giorni.map((g) => ({
        ...g,
        esercizi: (g.esercizi || []).map((e) => (e.id === id ? { ...e, ...patchGruppi(gruppi) } : e)),
      })),
    }))
    // Toccato a mano: non è più un'ipotesi dell'app.
    setIndovinati((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
  }

  const senzaGruppo = useMemo(
    () => esercizi(bozza).filter((e) => !(e.gruppi || []).length).length,
    [bozza],
  )

  const salva = () => {
    if (!bozza || senzaGruppo > 0) return
    const salvata = aggiungiScheda(bozza)
    // Porta subito nell'editor per controllare serie, carichi e recuperi.
    navigate(routes.editor(salvata.id))
  }

  // ------------------------------------------------ passaggio 2: i gruppi
  if (bozza) {
    const tot = esercizi(bozza).length
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setBozza(null)} aria-label="Torna al testo">
            <IconBack />
          </button>
          <h1>Gruppi muscolari</h1>
        </div>

        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 2px 12px' }}>
          Per ogni esercizio accendi i muscoli che lavora — anche più di uno: i dip sono petto{' '}
          <em>e</em> tricipiti. Il primo che scegli è il principale (★). Quelli segnati{' '}
          <strong>da controllare</strong> li ho indovinati io dal nome.
        </p>

        {bozza.giorni
          .filter((g) => g.tipo !== 'rest' && (g.esercizi || []).length > 0)
          .map((g) => (
            <div key={g.id} style={{ marginBottom: 16 }}>
              <div className="section-title">{g.nome || 'Giorno'}</div>
              <div className="stack" style={{ gap: 10 }}>
                {g.esercizi.map((e) => {
                  const vuoto = !(e.gruppi || []).length
                  return (
                    <div
                      key={e.id}
                      className="card stack"
                      style={{
                        gap: 8,
                        ...(vuoto ? { borderColor: 'var(--danger)' } : null),
                      }}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 14.5, minWidth: 0, overflowWrap: 'anywhere' }}>
                          {e.nome}
                        </strong>
                        {vuoto ? (
                          <span className="badge badge-danger">Manca il gruppo</span>
                        ) : indovinati.has(e.id) ? (
                          <span className="badge badge-warn">Da controllare</span>
                        ) : null}
                      </div>
                      <SceltaGruppi
                        compatto
                        valori={e.gruppi || []}
                        onChange={(gr) => cambiaGruppi(e.id, gr)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        <button
          className="btn btn-accent btn-lg btn-block"
          disabled={senzaGruppo > 0 || tot === 0}
          onClick={salva}
        >
          {senzaGruppo > 0
            ? senzaGruppo === 1
              ? 'Manca il gruppo a 1 esercizio'
              : `Manca il gruppo a ${senzaGruppo} esercizi`
            : 'Salva e controlla la scheda'}
        </button>
      </div>
    )
  }

  // ------------------------------------------------ passaggio 1: il testo
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1>Importa da testo</h1>
      </div>

      <div className="field" style={{ marginTop: 6 }}>
        <label>Nome scheda</label>
        <input
          className="input"
          value={nome}
          placeholder="Es. Forza & Ipertrofia — ottobre"
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Incolla qui il messaggio del PT</label>
        <textarea
          className="textarea"
          style={{ minHeight: 240, fontSize: 15 }}
          value={testo}
          placeholder={'Giorno A\n\nPanca piana\nSett1 8x3 90kg rec 1min\n...'}
          onChange={(e) => setTesto(e.target.value)}
        />
      </div>

      <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, margin: '0 2px 14px' }}>
        L'app riconosce giorni (<strong>Giorno A</strong>, <strong>Rest</strong>), esercizi, schemi per
        settimana (<strong>Sett1…</strong>), carichi e recuperi. Poi ti chiedo i{' '}
        <strong>gruppi muscolari</strong> di ogni esercizio, e dopo il salvataggio ti porto
        nell'<strong>editor</strong> per controllare il resto.
      </p>

      <button className="btn btn-accent btn-lg btn-block" disabled={!testo.trim()} onClick={leggi}>
        Avanti: i gruppi muscolari
      </button>
    </div>
  )
}
