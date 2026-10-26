import { schemaPerSettimana } from '../data/model'
import { caricoDellaFase, formatCarico, formatSerieRip, formattaCarico, formattaRecupero } from '../lib/schema'
import { gruppoDi } from '../lib/muscoli'
import { CorpoEsercizio } from './CorpoAllenato'
import { IconCheck, IconChevron } from './icons'
import ConsiglioCarico from './ConsiglioCarico'

// Card di un esercizio mostrato per una certa settimana.
// Se `onToggle` è passato, mostra il pallino "fatto".
// Se l'esercizio ha un gruppo muscolare, a destra c'e' il modellino del corpo
// coi suoi gruppi accesi, ognuno del suo colore (la card resta neutra).
// Con `carichi` (lib/carico, storicoCarichi) il chip del peso ha il colore del
// consiglio (sali, tieni, scendi) e al tocco apre il consiglio: niente riga in
// più sotto ogni esercizio.
export default function EsercizioCard({ esercizio, settimana, done = false, onToggle, carichi = null }) {
  const schema = schemaPerSettimana(esercizio, settimana)
  const serieRip = formatSerieRip(schema)
  const carico = formatCarico(schema)
  const recupero = formattaRecupero(schema)
  const gruppo = gruppoDi(esercizio.gruppo)

  return (
    <div
      className={'ex-card' + (done ? ' done' : '')}
      style={gruppo ? { '--g': gruppo.colore } : undefined}
    >
      <div className="ex-corpo-resto">
        <div className="ex-head">
          <div className="grow" style={{ minWidth: 0 }}>
            <div className={'nome' + (done ? ' done' : '')}>{esercizio.nome}</div>
            {gruppo && <span className="gruppo-tag">{gruppo.label}</span>}
            {esercizio.nota && <div className="ex-nota">{esercizio.nota}</div>}
          </div>
          {onToggle && (
            <button
              className={'tick' + (done ? ' on' : '')}
              onClick={onToggle}
              aria-label={done ? 'Segna come da fare' : 'Segna come fatto'}
            >
              <IconCheck width={18} height={18} />
            </button>
          )}
        </div>

        {/* Serie, peso e recupero: tre colonne uguali, etichetta sopra e
            valore sotto. Il peso, con un consiglio, ha il suo colore e lo apre. */}
        <dl className="ex-dati">
          {serieRip && <Dato etichetta="Serie">{serieRip}</Dato>}
          {carichi ? (
            <ConsiglioCarico
              nome={esercizio.nome}
              carichi={carichi}
              schema={schema}
              caricoAttuale={caricoDellaFase(schema, 0)}
              chiudibile
              riga={(c, apri, verso) => {
                const testo = carico || (c?.caricoSuggerito ? formattaCarico(c.caricoSuggerito) : '')
                if (!c) return testo && <Dato etichetta="Peso">{testo}</Dato>
                return (
                  <Dato etichetta="Peso">
                    <button
                      type="button"
                      className={'ex-dato-peso ' + verso}
                      onClick={apri}
                      aria-label={`${testo || 'Peso'}: ${c.titolo}`}
                    >
                      {testo || '?'}
                      <IconChevron width={14} height={14} aria-hidden="true" />
                    </button>
                  </Dato>
                )
              }}
            />
          ) : (
            carico && <Dato etichetta="Peso">{carico}</Dato>
          )}
          {recupero && <Dato etichetta="Recupero">{recupero}</Dato>}
        </dl>
        {schema.nota && <div className="ex-dati-nota">{schema.nota}</div>}
      </div>
      <CorpoEsercizio esercizio={esercizio} />
    </div>
  )
}

function Dato({ etichetta, children }) {
  return (
    <div className="ex-dato">
      <dt>{etichetta}</dt>
      <dd>{children}</dd>
    </div>
  )
}
