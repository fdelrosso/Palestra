import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { nuovaScheda, nuovoGiorno, nuovoEsercizio, schemaVuoto, GIORNI_SETTIMANA } from '../data/model'
import { navigate, goBack, routes } from '../lib/router'
import { IconBack, IconPlus, IconTrash } from '../components/icons'
import { GiornoEditor } from '../components/GiornoEditor'
import VisibilitaPicker from '../components/VisibilitaPicker'

// Ridimensiona gli array `settimane` degli esercizi quando cambia il numero di settimane.
function resizeSettimane(scheda, n) {
  return {
    ...scheda,
    numeroSettimane: n,
    giorni: scheda.giorni.map((g) => ({
      ...g,
      esercizi: g.esercizi.map((e) => {
        if (!e.variaPerSettimana) return e
        const cur = e.settimane || []
        const arr = Array.from({ length: n }, (_, i) =>
          schemaVuoto(cur[i] || cur[cur.length - 1] || {}),
        )
        return { ...e, settimane: arr }
      }),
    })),
  }
}

export default function EditorPage({ id }) {
  const { getScheda, aggiungiScheda, aggiornaScheda, eliminaScheda } = useStore()
  const esistente = id ? getScheda(id) : null
  const [scheda, setScheda] = useState(() =>
    esistente ? structuredClone(esistente) : nuovaScheda({ nome: '', numeroSettimane: 5 }),
  )

  // ---- helper di aggiornamento immutabile ----
  const patch = (p) => setScheda((s) => ({ ...s, ...p }))
  const patchGiorno = (gid, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => (g.id === gid ? { ...g, ...p } : g)),
    }))
  const patchEsercizio = (gid, eid, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) =>
        g.id === gid
          ? { ...g, esercizi: g.esercizi.map((e) => (e.id === eid ? { ...e, ...p } : e)) }
          : g,
      ),
    }))
  const patchSchema = (gid, eid, weekIdx, p) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => {
        if (g.id !== gid) return g
        return {
          ...g,
          esercizi: g.esercizi.map((e) => {
            if (e.id !== eid) return e
            if (weekIdx == null) return { ...e, schemaBase: { ...e.schemaBase, ...p } }
            const settimane = e.settimane.map((sc, i) => (i === weekIdx ? { ...sc, ...p } : sc))
            return { ...e, settimane }
          }),
        }
      }),
    }))

  const setNumeroSettimane = (val) => {
    const n = Math.max(1, Math.min(12, parseInt(val, 10) || 1))
    setScheda((s) => resizeSettimane(s, n))
  }

  // Attiva/disattiva un giorno della settimana tra quelli di allenamento,
  // mantenendo l'array ordinato (lunedì-first).
  const toggleGiornoSettimana = (idx) =>
    setScheda((s) => {
      const set = new Set(s.giorniSettimana || [])
      if (set.has(idx)) set.delete(idx)
      else set.add(idx)
      return { ...s, giorniSettimana: [...set].sort((a, b) => a - b) }
    })

  const addGiorno = (tipo) => {
    const workoutCount = scheda.giorni.filter((g) => g.tipo === 'workout').length
    const nome =
      tipo === 'rest' ? 'Rest' : `Giorno ${String.fromCharCode(65 + workoutCount)}` // A, B, C...
    patch({ giorni: [...scheda.giorni, nuovoGiorno({ tipo, nome })] })
  }
  const removeGiorno = (gid) => {
    const g = scheda.giorni.find((x) => x.id === gid)
    if (g?.esercizi?.length && !confirm(`Eliminare "${g.nome}" e i suoi esercizi?`)) return
    patch({ giorni: scheda.giorni.filter((x) => x.id !== gid) })
  }
  const addEsercizio = (gid) =>
    patchGiorno(gid, {
      esercizi: [...scheda.giorni.find((g) => g.id === gid).esercizi, nuovoEsercizio()],
    })
  const removeEsercizio = (gid, eid) =>
    patchGiorno(gid, {
      esercizi: scheda.giorni.find((g) => g.id === gid).esercizi.filter((e) => e.id !== eid),
    })

  const toggleVaria = (gid, eid) =>
    setScheda((s) => ({
      ...s,
      giorni: s.giorni.map((g) => {
        if (g.id !== gid) return g
        return {
          ...g,
          esercizi: g.esercizi.map((e) => {
            if (e.id !== eid) return e
            if (!e.variaPerSettimana) {
              // base -> per settimana: copia lo schema base su ogni settimana
              const settimane = Array.from({ length: s.numeroSettimane }, () =>
                schemaVuoto(e.schemaBase),
              )
              return { ...e, variaPerSettimana: true, settimane }
            }
            // per settimana -> base: usa la prima settimana come base
            return { ...e, variaPerSettimana: false, schemaBase: schemaVuoto(e.settimane[0]) }
          }),
        }
      }),
    }))

  const salva = () => {
    const daSalvare = { ...scheda, nome: scheda.nome.trim() || 'Scheda senza nome' }
    if (esistente) {
      aggiornaScheda(daSalvare)
      navigate(routes.scheda(daSalvare.id))
    } else {
      const s = aggiungiScheda(daSalvare)
      navigate(routes.scheda(s.id))
    }
  }

  const elimina = () => {
    if (!esistente) return
    if (!confirm('Eliminare definitivamente questa scheda?')) return
    eliminaScheda(scheda.id)
    navigate(routes.home())
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={goBack}>
          <IconBack />
        </button>
        <h1>{esistente ? 'Modifica scheda' : 'Nuova scheda'}</h1>
        <button className="btn btn-accent btn-sm" onClick={salva}>
          Salva
        </button>
      </div>

      {/* Dati scheda */}
      <div className="card" style={{ marginTop: 6 }}>
        <div className="field">
          <label>Nome scheda</label>
          <input
            className="input"
            value={scheda.nome}
            placeholder="Es. Forza & Ipertrofia"
            onChange={(e) => patch({ nome: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Note (facoltative)</label>
          <textarea
            className="textarea"
            value={scheda.nota}
            placeholder="Es. rotazione A · B · Rest · C · D…"
            onChange={(e) => patch({ nota: e.target.value })}
          />
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Numero di settimane</label>
          <input
            className="input"
            type="number"
            min="1"
            max="12"
            value={scheda.numeroSettimane}
            onChange={(e) => setNumeroSettimane(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Giorni di allenamento</label>
          <div className="giorni-picker">
            {GIORNI_SETTIMANA.map((g) => (
              <button
                key={g.id}
                type="button"
                className={'giorno-chip' + (scheda.giorniSettimana.includes(g.id) ? ' on' : '')}
                onClick={() => toggleGiornoSettimana(g.id)}
                aria-pressed={scheda.giorniSettimana.includes(g.id)}
                aria-label={g.label}
              >
                {g.breve}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.4 }}>
            I giorni in cui ti alleni di solito: serviranno per consigliarti
            l'allenamento giusto in base al giorno.
          </p>
        </div>

        <div className="divider" style={{ margin: '16px 0' }} />

        <VisibilitaPicker
          valore={scheda.visibilita}
          onChange={(v) => patch({ visibilita: v })}
          etichetta="Chi vede questa scheda"
          genere="f"
        />
      </div>

      {/* Giorni */}
      {scheda.giorni.map((g) => (
        <GiornoEditor
          key={g.id}
          giorno={g}
          numeroSettimane={scheda.numeroSettimane}
          onPatch={(p) => patchGiorno(g.id, p)}
          onRemove={() => removeGiorno(g.id)}
          onAddEsercizio={() => addEsercizio(g.id)}
          onRemoveEsercizio={(eid) => removeEsercizio(g.id, eid)}
          onPatchEsercizio={(eid, p) => patchEsercizio(g.id, eid, p)}
          onToggleVaria={(eid) => toggleVaria(g.id, eid)}
          onPatchSchema={(eid, weekIdx, p) => patchSchema(g.id, eid, weekIdx, p)}
        />
      ))}

      <div className="row" style={{ marginTop: 14, gap: 10 }}>
        <button className="btn btn-block" onClick={() => addGiorno('workout')}>
          <IconPlus width={18} height={18} /> Giorno
        </button>
        <button className="btn btn-block" onClick={() => addGiorno('rest')}>
          <IconPlus width={18} height={18} /> Rest
        </button>
      </div>

      {esistente && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 22 }} onClick={elimina}>
          <IconTrash width={18} height={18} /> Elimina scheda
        </button>
      )}
    </div>
  )
}
