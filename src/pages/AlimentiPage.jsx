import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/StoreContext'
import { goBack } from '../lib/router'
import { normalizzaCibo } from '../lib/alimenti'
import { normalizzaCibiMiei, normalizzaCiboMio, togliCiboMio } from '../lib/cibiMiei'
import { catalogoPerCategoria, cercaAlimenti, riassuntoPer100 } from '../lib/catalogoCibi'
import { numeroIt } from '../lib/unita'
import TastoConferma from '../components/TastoConferma'
import { IconBack, IconChevron, IconClose, IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons'

// ---------------------------------------------------------------------------
// "Alimenti", in Altro: il catalogo che usa la Dieta, da sfogliare per
// categoria coi valori per 100 g, e in cima I TUOI — quelli trovati online o
// scritti a mano, che l'app si ricorda (lib/cibiMiei).
//
// Qui un alimento tuo lo AGGIUNGI col "+", lo correggi o lo togli. Da quel
// momento in "Cosa hai mangiato" esce per primo appena lo cerchi. ⚠️ I tuoi
// sono solo tuoi: stanno nelle preferenze alimentari del profilo, che non
// vede nessun altro. Il catalogo invece è uguale per tutti e non si tocca.
// ---------------------------------------------------------------------------

const vuoto = { nome: '', marca: '', kcal: '', p: '', c: '', g: '', pezzo: '' }

const daCibo = (c) => ({
  id: c.id,
  nome: c.nome,
  marca: c.marca || '',
  kcal: c.kcal != null ? String(c.kcal) : '',
  p: String(c.m.p),
  c: String(c.m.c),
  g: String(c.m.g),
  pezzo: c.pezzo ? String(c.pezzo) : '',
})

function RigaAlimento({ alimento, onModifica }) {
  const contenuto = (
    <>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="voce-diario-nome">
          {alimento.nome}
          {alimento.marca && <span className="faint" style={{ fontWeight: 500 }}>{alimento.marca}</span>}
        </span>
        <span className="voce-diario-macro">{riassuntoPer100(alimento)} per 100 g</span>
      </span>
      {onModifica && <IconEdit width={16} height={16} className="faint" />}
    </>
  )
  return onModifica ? (
    <button type="button" className="riga-alimento" onClick={onModifica}>
      {contenuto}
    </button>
  ) : (
    <div className="riga-alimento">{contenuto}</div>
  )
}

/** Il foglio per aggiungere o correggere un alimento tuo. */
function FoglioAlimento({ iniziale, onSalva, onElimina, onChiudi }) {
  const [f, setF] = useState(iniziale)
  const [err, setErr] = useState('')
  const set = (campo) => (e) => {
    setF((x) => ({ ...x, [campo]: e.target.value }))
    setErr('')
  }

  const salva = () => {
    if (!f.nome.trim()) return setErr('Scrivi il nome.')
    const cibo = normalizzaCiboMio({
      // ⚠️ Correggendo si tiene l'id: senza, cambiare il nome farebbe un
      // alimento nuovo accanto a quello vecchio.
      id: f.id,
      nome: f.nome,
      marca: f.marca,
      m: { p: numeroIt(f.p) || 0, c: numeroIt(f.c) || 0, g: numeroIt(f.g) || 0 },
      kcal: f.kcal.trim() ? numeroIt(f.kcal) : undefined,
      pezzo: numeroIt(f.pezzo) || undefined,
    })
    if (!cibo) return setErr('Servono almeno le calorie o un macro.')
    onSalva(cibo)
  }

  return createPortal(
    <div className="foglio-backdrop" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-label="Alimento" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-maniglia" aria-hidden="true" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>{f.id ? 'Correggi alimento' : 'Nuovo alimento'}</h3>
          <button className="icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <IconClose />
          </button>
        </div>

        <div className="field">
          <label htmlFor="cibo-nome">Nome</label>
          <input id="cibo-nome" className="input" value={f.nome} onChange={set('nome')} placeholder="Yogurt greco" maxLength={60} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="cibo-marca">Marca (facoltativa)</label>
          <input id="cibo-marca" className="input" value={f.marca} onChange={set('marca')} placeholder="Fage" maxLength={40} />
        </div>
        <div className="field" style={{ marginBottom: 6 }}>
          <label>Valori per 100 g</label>
          <div className="grid-4">
            {[
              ['kcal', 'kcal'],
              ['p', 'Prot.'],
              ['c', 'Carbo'],
              ['g', 'Grassi'],
            ].map(([campo, lab]) => (
              <input
                key={campo}
                className="input input-sm"
                type="text"
                inputMode="decimal"
                placeholder={lab}
                aria-label={`${lab} per 100 g`}
                value={f[campo]}
                onChange={set(campo)}
              />
            ))}
          </div>
        </div>
        <p className="vis-hint" style={{ margin: '0 0 12px' }}>
          Se lasci vuote le calorie le conto io dai macro.
        </p>
        <div className="field">
          <label htmlFor="cibo-pezzo">Quanto pesa un pezzo, in g (facoltativo)</label>
          <input id="cibo-pezzo" className="input" inputMode="decimal" value={f.pezzo} onChange={set('pezzo')} placeholder="es. 8 per un biscotto" />
        </div>

        {err && <p className="form-error">{err}</p>}
        <button className="btn btn-accent btn-block" onClick={salva}>
          Salva
        </button>
        {onElimina && (
          <TastoConferma
            etichetta={
              <>
                <IconTrash width={16} height={16} /> Togli dai miei alimenti
              </>
            }
            domanda="Togliere questo alimento dai tuoi? Quello che hai già segnato nel diario resta."
            si="Sì, togli"
            onConferma={onElimina}
            style={{ marginTop: 8 }}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}

export default function AlimentiPage() {
  const { preferenze, ricordaCibo, aggiornaPreferenze } = useStore()
  const miei = useMemo(() => normalizzaCibiMiei(preferenze?.cibi), [preferenze])
  const categorie = useMemo(() => catalogoPerCategoria(), [])
  const [q, setQ] = useState('')
  const [aperte, setAperte] = useState(() => new Set())
  // Il foglio aperto: i campi di un alimento (nuovo o da correggere), o null.
  const [foglio, setFoglio] = useState(null)

  const cercando = normalizzaCibo(q).length >= 2
  const trovati = useMemo(() => (cercando ? cercaAlimenti(q, miei, 60) : []), [cercando, q, miei])
  const apri = (id) =>
    setAperte((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const salva = (cibo) => {
    ricordaCibo(cibo)
    setFoglio(null)
  }
  const elimina = (id) => {
    aggiornaPreferenze((prev) => ({ cibi: togliCiboMio(prev.cibi, id) }))
    setFoglio(null)
  }
  const modifica = (c) => (c.mio ? () => setFoglio(daCibo(c)) : undefined)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack} aria-label="Indietro">
          <IconBack />
        </button>
        <h1 style={{ flex: 1 }}>Alimenti</h1>
        <button className="icon-btn icon-btn-pieno" aria-label="Nuovo alimento" onClick={() => setFoglio(vuoto)}>
          <IconPlus />
        </button>
      </div>

      <div className="search-box cerca-cibo">
        <IconSearch width={17} height={17} className="faint" aria-hidden="true" />
        <input
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca un alimento"
          aria-label="Cerca un alimento"
        />
        {q && (
          <button className="icon-btn" aria-label="Svuota" onClick={() => setQ('')}>
            <IconClose width={15} height={15} />
          </button>
        )}
      </div>

      {cercando ? (
        trovati.length === 0 ? (
          <div className="empty">
            <p>
              Niente per «{q.trim()}».
              <br />
              Aggiungilo tu col <strong>+</strong>: lo ritrovi in Dieta appena lo cerchi.
            </p>
          </div>
        ) : (
          <div className="card lista-cibi">
            {trovati.map((a) => (
              <RigaAlimento key={a.id} alimento={a} onModifica={modifica(a)} />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="section-title">I tuoi · {miei.length}</div>
          {miei.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: '0 2px 8px', lineHeight: 1.45 }}>
              Qui finiscono gli alimenti che aggiungi col <strong>+</strong>, quelli che trovi cercando in
              Dieta e quelli di cui scrivi i valori. Li vedi solo tu, e in Dieta escono per primi.
            </p>
          ) : (
            <div className="card lista-cibi">
              {miei.map((a) => (
                <RigaAlimento key={a.id} alimento={a} onModifica={modifica(a)} />
              ))}
            </div>
          )}

          {categorie.map((c) => (
            <div key={c.id}>
              <button
                type="button"
                className="section-title sezione-apribile"
                onClick={() => apri(c.id)}
                aria-expanded={aperte.has(c.id)}
              >
                <span className="grow">{c.nome}</span>
                <span className="badge">{c.alimenti.length}</span>
                <IconChevron
                  width={18}
                  height={18}
                  className="faint"
                  style={{ transform: `rotate(${aperte.has(c.id) ? -90 : 90}deg)` }}
                />
              </button>
              {aperte.has(c.id) && (
                <div className="card lista-cibi">
                  {c.alimenti.map((a) => (
                    <RigaAlimento key={a.id} alimento={a} />
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12, margin: '16px 2px 0', lineHeight: 1.45 }}>
            Valori medi da tabella, per 100 g. Cereali e legumi sono a crudo, salvo dove è scritto
            «cotto».
          </p>
        </>
      )}

      {foglio && (
        <FoglioAlimento
          iniziale={foglio}
          onSalva={salva}
          onElimina={foglio.id ? () => elimina(foglio.id) : undefined}
          onChiudi={() => setFoglio(null)}
        />
      )}
    </div>
  )
}
