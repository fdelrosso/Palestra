import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { GRUPPI, gruppoDi } from '../lib/muscoli'
import {
  cercaEsercizi,
  eserciziDiGruppo,
  eserciziPropri,
  gruppiDaNome,
  gruppoDaNome,
  inLibreria,
  normalizzaNome,
  sottogruppiDaNome,
} from '../lib/eserciziLibreria'
import { formatSerieRip, normalizzaSchema, schemaHaContenuto } from '../lib/schema'
import { IconPlus, IconSearch } from './icons'

// La ricerca di un esercizio, per aggiungerlo (o cambiarlo) nell'editor.
//
// Si cerca tra quelli che si sono GIÀ fatti (prima, con lo schema dell'ultima
// volta) e nella libreria; senza scrivere niente si sfoglia per gruppo. Se
// quello che si cerca non c'è, "Aggiungi «…»" lo crea col nome scritto.
//
// `onScegli({ nome, gruppi, sottogruppi, schema })`: per un esercizio della
// libreria gruppi e sottogruppi della libreria; per uno già usato quelli
// dell'ultima volta; per un nome nuovo, fuori dalla libreria, NIENTE (`[]` e
// `sottogruppi` assente): li deve scegliere chi lo scrive, nel foglio
// dell'esercizio (GiornoEditor, muscoliMancanti). `schema` è quello
// dell'ultima volta per un esercizio già fatto, se no null.
// `gruppoIniziale`: il gruppo già scelto all'apertura (il riscaldamento
// dell'allenamento parte dal cardio, pages/WorkoutSession).
export default function CercaEsercizio({
  titolo = 'Aggiungi un esercizio',
  gruppoIniziale = '',
  segnaposto = 'Cerca: panca, lat, curl…',
  onScegli,
  onChiudi,
}) {
  const { schede } = useStore()
  const [testo, setTesto] = useState('')
  const [gruppo, setGruppo] = useState(gruppoIniziale)

  const propri = useMemo(() => eserciziPropri(schede), [schede])
  const schemaProprio = useMemo(
    () => new Map(propri.map((p) => [normalizzaNome(p.nome), p.schema])),
    [propri],
  )
  const muscoliPropri = useMemo(
    () => new Map(propri.map((p) => [normalizzaNome(p.nome), p.muscoli])),
    [propri],
  )

  const risultati = useMemo(() => {
    if (!testo.trim() && gruppo) {
      const miei = propri.filter((p) => gruppoDaNome(p.nome) === gruppo).map((p) => ({ nome: p.nome, gruppo, proprio: true }))
      const visti = new Set(miei.map((m) => normalizzaNome(m.nome)))
      return [...miei, ...eserciziDiGruppo(gruppo).filter((e) => !visti.has(normalizzaNome(e.nome))).map((e) => ({ ...e, proprio: false }))]
    }
    const tutti = cercaEsercizi(testo, propri.map((p) => p.nome), 40)
    return gruppo ? tutti.filter((e) => e.gruppo === gruppo) : tutti
  }, [testo, gruppo, propri])

  const scritto = testo.trim()
  const esiste = risultati.some((r) => normalizzaNome(r.nome) === normalizzaNome(scritto))

  const scegli = (nome, g = gruppoDaNome(nome)) => {
    const schema = schemaProprio.get(normalizzaNome(nome))
    const sue = muscoliPropri.get(normalizzaNome(nome))
    // Gli altri gruppi della libreria (i dip: petto e tricipiti) vengono col
    // principale, se è quello di questo nome; i sottogruppi con loro.
    const muscoli = inLibreria(nome)
      ? { gruppi: gruppoDaNome(nome) === g ? gruppiDaNome(nome) : [g], sottogruppi: sottogruppiDaNome(nome) }
      : sue || { gruppi: [] }
    onScegli({
      nome,
      ...muscoli,
      schema: schema && schemaHaContenuto(schema) ? normalizzaSchema(schema) : null,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onChiudi}>
      <div
        className="modal cerca-esercizio"
        role="dialog"
        aria-label={titolo}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{titolo}</h3>
        <div className="cerca-campo">
          <IconSearch width={18} height={18} aria-hidden="true" />
          <input
            className="input"
            type="search"
            autoFocus
            value={testo}
            placeholder={segnaposto}
            aria-label="Cerca un esercizio"
            onChange={(e) => setTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !scritto) return
              if (risultati[0]) scegli(risultati[0].nome, risultati[0].gruppo)
              else scegli(scritto)
            }}
          />
        </div>

        <div className="cerca-gruppi" role="group" aria-label="Filtra per gruppo">
          {GRUPPI.map((g) => (
            <button
              key={g.id}
              type="button"
              className={'chip chip-scelta' + (gruppo === g.id ? ' on' : '')}
              aria-pressed={gruppo === g.id}
              style={gruppo === g.id ? { background: g.colore, borderColor: g.colore } : undefined}
              onClick={() => setGruppo(gruppo === g.id ? '' : g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {scritto && !esiste && (
          <button type="button" className="cerca-voce cerca-nuovo" onClick={() => scegli(scritto)}>
            <IconPlus width={16} height={16} />
            <span>
              Aggiungi «<strong>{scritto}</strong>»
            </span>
          </button>
        )}

        <div className="cerca-risultati">
          {risultati.map((r) => {
            const g = gruppoDi(r.gruppo)
            const schema = r.proprio ? schemaProprio.get(normalizzaNome(r.nome)) : null
            return (
              <button
                key={r.nome}
                type="button"
                className="cerca-voce"
                onClick={() => scegli(r.nome, r.gruppo)}
              >
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="cerca-nome">{r.nome}</span>
                  <span className="cerca-sotto">
                    {r.proprio ? 'Già fatto' : 'Libreria'}
                    {schema && formatSerieRip(schema) ? ` · ${formatSerieRip(schema)}` : ''}
                  </span>
                </span>
                {g && (
                  <span className="gruppo-tag" style={{ '--g': g.colore }}>
                    {g.label}
                  </span>
                )}
              </button>
            )
          })}
          {!risultati.length && !scritto && (
            <p className="muted" style={{ fontSize: 13.5 }}>Scrivi il nome o scegli un gruppo.</p>
          )}
        </div>

        <button type="button" className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 10 }} onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </div>
  )
}
