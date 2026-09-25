import { useEffect, useRef, useState } from 'react'
import { schemaPerSettimana } from '../data/model'
import { gruppiScritti, patchGruppi } from '../lib/eserciziLibreria'
import {
  blocchi,
  bloccoDi,
  eSuperserie,
  spostaBlocco,
  spostaNelBlocco,
  togliEsercizio,
} from '../lib/superserie'
import SceltaGruppi from './SceltaGruppi'
import { IconBack, IconCatena, IconChevron, IconPlus, IconTrash } from './icons'
import EsercizioAllegati from './EsercizioAllegati'

// Editor di un singolo giorno (nome/tipo + esercizi con schema per settimana).
// Componente controllato: lo stato vive nel genitore, qui solo la UI + callback.
//
// `soloEsercizi`: nasconde l'intestazione del giorno (nome, tipo, elimina) e
// lascia solo l'elenco esercizi + "Aggiungi esercizio". Usato nella modifica
// in-place dall'anteprima allenamento, dove si toccano solo gli esercizi.
//
// `senzaSettimane` e `senzaAllegati` servono all'allenamento costruito al volo
// (NuovoAllenamentoPage), che non è una scheda ma una cosa sola da fare adesso:
// - le settimane non esistono, quindi "Cambia per settimana" è una domanda
//   senza senso e lo schema è sempre e solo `schemaBase`;
// - ⚠️ gli allegati NO: una foto vuole la scheda in cui sta, perché è la sua
//   visibilità a dire chi può scaricarla (posso_scaricare_media), e qui la
//   scheda-contenitore non esiste ancora. Foto e commenti si aggiungono
//   durante l'allenamento, quando c'è.
//
// GLI ESERCIZI SONO CARD AFFIANCATE, come durante l'allenamento: una per
// esercizio, si scorrono di lato, con ‹ Prec / Succ › sopra. Si scrive una
// cosa alla volta e si vede lo stesso ordine che si troverà in palestra.
// Sotto la pista c'è l'ORDINE: l'elenco di tutti, per vedere la sequenza a
// colpo d'occhio, andarci con un tocco e cambiarla con le frecce.
//
// SUPERSERIE (lib/superserie): una card sola, come in allenamento, con dentro
// i suoi esercizi — ognuno col suo schema, la superserie è solo il legame.
// Ogni esercizio tranne il primo ha l'interruttore "Superserie con <quello
// prima>". Spostare prima/dopo muove la card INTERA (la superserie resta
// insieme); dentro la superserie le frecce su/giù cambiano chi va per primo.
//
// `onEsercizi(fn)` riceve una funzione vecchia-lista → nuova-lista: spostare e
// togliere toccano più di un esercizio alla volta (chi resta primo di una
// superserie perde il legame), e farlo con due callback separate vorrebbe dire
// perdere la prima modifica nei genitori che non usano l'aggiornamento
// funzionale. Senza `onEsercizi` le frecce non ci sono e si toglie come prima.
export function GiornoEditor({
  giorno,
  numeroSettimane,
  // Non serve a questo componente: lo passa a EsercizioAllegati, perché la
  // regola d'accesso ai file deve sapere in quale scheda sta la foto.
  schedaId = null,
  soloEsercizi = false,
  senzaSettimane = false,
  senzaAllegati = false,
  onPatch,
  onRemove,
  onAddEsercizio,
  onRemoveEsercizio,
  onPatchEsercizio,
  onToggleVaria,
  onPatchSchema,
  onEsercizi = null,
}) {
  const soloRiposo = !soloEsercizi && giorno.tipo === 'rest'
  const lista = giorno.esercizi || []
  const bs = blocchi(lista)

  // ⚠️ Il fuoco sta su un ESERCIZIO (il suo id), non su un indice: spostando
  // una card, unendola in superserie o aggiungendone una, l'indice di "quella
  // che stavo guardando" cambia, l'esercizio no — e la pista gli va dietro.
  const [fuocoId, setFuocoId] = useState(null)
  // L'ultimo posto noto: se l'esercizio col fuoco viene tolto si resta lì
  // intorno, non si torna al primo.
  const [ultimoIndice, setUltimoIndice] = useState(0)
  const trovato = lista.findIndex((e) => e.id === fuocoId)
  if (trovato !== -1 && trovato !== ultimoIndice) setUltimoIndice(trovato)
  const iFuoco = trovato !== -1 ? trovato : Math.min(ultimoIndice, Math.max(0, lista.length - 1))
  const fb = lista.length ? bloccoDi(lista, iFuoco) : 0

  // Un esercizio aggiunto (finisce in fondo): si va sulla sua card, se no si
  // preme "Aggiungi" e non succede niente di visibile. ⚠️ Si confronta durante
  // il render, non in un effetto: è il modo di React di adeguare lo stato a
  // una prop che cambia, senza un giro di disegno in più.
  const [lunghezza, setLunghezza] = useState(lista.length)
  if (lista.length !== lunghezza) {
    if (lista.length > lunghezza) setFuocoId(lista[lista.length - 1].id)
    setLunghezza(lista.length)
  }

  // La pista: indice → scroll. Stesso meccanismo dell'allenamento
  // (WorkoutSession): si scorre fino alla card e, finché non è arrivata, lo
  // scorrimento "a mano" non conta — se no la card di prima, ancora la più
  // vicina al bordo a metà corsa, si riprenderebbe il fuoco.
  const pistaRef = useRef(null)
  const scrollDaCodice = useRef(null)
  useEffect(() => {
    const pista = pistaRef.current
    const card = pista?.children[fb]
    if (!pista || !card) return
    const delta = card.getBoundingClientRect().left - pista.getBoundingClientRect().left
    if (Math.abs(delta) < 4) return
    const morbido = document.visibilityState === 'visible'
    const meta = Math.max(0, Math.min(pista.scrollLeft + delta, pista.scrollWidth - pista.clientWidth))
    scrollDaCodice.current = { fino: Date.now() + (morbido ? 2500 : 150), meta }
    pista.scrollTo({ left: meta, behavior: morbido ? 'smooth' : 'auto' })
  }, [fb, bs.length])

  // Scroll → indice: la card più vicina al bordo sinistro è quella col fuoco.
  const alloScroll = () => {
    const pista = pistaRef.current
    if (!pista) return
    const inCorso = scrollDaCodice.current
    if (inCorso) {
      const arrivato = Math.abs(pista.scrollLeft - inCorso.meta) < 2
      if (!arrivato && Date.now() < inCorso.fino) return
      scrollDaCodice.current = null
    }
    const sx = pista.getBoundingClientRect().left
    let vicino = 0
    let minimo = Infinity
    for (let i = 0; i < pista.children.length; i++) {
      const d = Math.abs(pista.children[i].getBoundingClientRect().left - sx)
      if (d < minimo) {
        minimo = d
        vicino = i
      }
    }
    if (vicino !== fb && bs[vicino]) setFuocoId(lista[bs[vicino].inizio].id)
  }
  const vai = (k) => bs[k] && setFuocoId(lista[bs[k].inizio].id)

  const togli = (id) => (onEsercizi ? onEsercizi((l) => togliEsercizio(l, id)) : onRemoveEsercizio(id))
  // Spostare lascia il fuoco sull'esercizio spostato: la pista lo segue.
  const spostaCard = onEsercizi
    ? (id, verso) => {
        setFuocoId(id)
        onEsercizi((l) => spostaBlocco(l, id, verso))
      }
    : null
  const spostaDentro = onEsercizi
    ? (id, verso) => {
        setFuocoId(id)
        onEsercizi((l) => spostaNelBlocco(l, id, verso))
      }
    : null

  const editorDi = (i, { testa = null, classe = '', blocco = null, etichetta = '' } = {}) => {
    const e = lista[i]
    return (
      <EsercizioEditor
        key={e.id}
        esercizio={e}
        precedente={i > 0 ? lista[i - 1] : null}
        primo={i === 0}
        testa={testa}
        classe={classe}
        schedaId={schedaId}
        numeroSettimane={numeroSettimane}
        senzaSettimane={senzaSettimane}
        senzaAllegati={senzaAllegati}
        onPatch={(p) => {
          // Unire o sciogliere una superserie cambia le card: si resta
          // sull'esercizio appena toccato, dovunque sia finito.
          if ('insiemeAlPrecedente' in p) setFuocoId(e.id)
          onPatchEsercizio(e.id, p)
        }}
        onRemove={() => togli(e.id)}
        nelBlocco={
          blocco
            ? {
                etichetta,
                primo: i === blocco.inizio,
                ultimo: i === blocco.fine,
                onSposta: spostaDentro ? (verso) => spostaDentro(e.id, verso) : null,
              }
            : null
        }
        onToggleVaria={() => onToggleVaria(e.id)}
        onPatchSchema={(weekIdx, p) => onPatchSchema(e.id, weekIdx, p)}
      />
    )
  }

  return (
    <div className="card" style={{ marginTop: soloEsercizi ? 6 : 14 }}>
      {!soloEsercizi && (
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            value={giorno.nome}
            placeholder="Nome giorno"
            onChange={(e) => onPatch({ nome: e.target.value })}
            style={{ flex: 1 }}
          />
          <select
            className="select"
            value={giorno.tipo}
            onChange={(e) => onPatch({ tipo: e.target.value })}
            style={{ width: 130 }}
          >
            <option value="workout">Allenamento</option>
            <option value="rest">Rest</option>
          </select>
          <button className="icon-btn" onClick={onRemove} aria-label="Elimina giorno">
            <IconTrash />
          </button>
        </div>
      )}

      {soloRiposo ? (
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>Nota riposo (facoltativa)</label>
          <input
            className="input"
            value={giorno.nota}
            placeholder="Es. bici"
            onChange={(e) => onPatch({ nota: e.target.value })}
          />
        </div>
      ) : (
        <>
          {!soloEsercizi && <div className="divider" />}
          {lista.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, margin: '4px 2px 0' }}>
              Nessun esercizio. Aggiungine uno qui sotto.
            </p>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-sm" disabled={fb === 0} onClick={() => vai(fb - 1)}>
                  ‹ Prec
                </button>
                {/* Una superserie conta come UN esercizio, come in allenamento. */}
                <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
                  Esercizio {fb + 1}/{bs.length}
                </span>
                <button
                  className="btn btn-sm"
                  disabled={fb >= bs.length - 1}
                  onClick={() => vai(fb + 1)}
                >
                  Succ ›
                </button>
              </div>

              <div className="pista-esercizi pista-editor" ref={pistaRef} onScroll={alloScroll}>
                {bs.map((b, bi) => {
                  const attiva = bi === fb
                  const intestazione = (
                    <TestaCard
                      superserie={eSuperserie(b) ? b.indici.length : 0}
                      numero={bi + 1}
                      primo={bi === 0}
                      ultimo={bi === bs.length - 1}
                      onSposta={spostaCard ? (verso) => spostaCard(lista[b.inizio].id, verso) : null}
                      // Il cestino di un esercizio da solo sta qui; in una
                      // superserie ogni esercizio ha il suo, nella sua testata.
                      onRemove={eSuperserie(b) ? null : () => togli(lista[b.inizio].id)}
                    />
                  )
                  if (!eSuperserie(b)) {
                    return editorDi(b.inizio, {
                      testa: intestazione,
                      classe: 'pista-voce' + (attiva ? '' : ' non-attiva'),
                    })
                  }
                  return (
                    <div
                      key={lista[b.inizio].id}
                      className={'superserie-blocco pista-voce' + (attiva ? '' : ' non-attiva')}
                    >
                      {intestazione}
                      <div className="superserie-sub" style={{ fontSize: 12.5, margin: '-4px 2px 8px' }}>
                        Di fila, recupero a fine giro
                      </div>
                      <div className="stack" style={{ gap: 8 }}>
                        {b.indici.map((i, k) =>
                          editorDi(i, { blocco: b, etichetta: `${bi + 1}${String.fromCharCode(65 + k)}` }),
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <OrdineEsercizi
                lista={lista}
                bs={bs}
                fb={fb}
                onVai={vai}
                onSposta={spostaCard}
              />
            </>
          )}
          <button className="btn btn-sm btn-block" style={{ marginTop: 12 }} onClick={onAddEsercizio}>
            <IconPlus width={16} height={16} /> Aggiungi esercizio
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Testata card
// In cima a ogni card della pista: che cosa è (Esercizio 3, o Superserie) e le
// frecce per spostarla prima o dopo la card vicina.
function TestaCard({ superserie, numero, primo, ultimo, onSposta, onRemove = null }) {
  return (
    <div className="editor-testa">
      <span className={'editor-testa-titolo' + (superserie ? ' superserie' : '')}>
        {superserie ? (
          <>
            <IconCatena width={15} height={15} />
            {superserie === 2 ? 'Superserie' : `Superserie da ${superserie}`} · {numero}
          </>
        ) : (
          `Esercizio ${numero}`
        )}
      </span>
      {onSposta && (
        <>
          <button
            className="icon-btn sposta-btn"
            onClick={() => onSposta(-1)}
            disabled={primo}
            aria-label="Sposta prima"
          >
            <IconBack width={18} height={18} />
          </button>
          <button
            className="icon-btn sposta-btn"
            onClick={() => onSposta(1)}
            disabled={ultimo}
            aria-label="Sposta dopo"
          >
            <IconChevron width={18} height={18} />
          </button>
        </>
      )}
      {onRemove && (
        <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
          <IconTrash width={18} height={18} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Ordine
// Tutta la sequenza sotto la pista: si vede l'ordine intero, ci si va con un
// tocco e lo si cambia con le frecce, senza scorrere card per card. Le
// superserie si numerano come le scrive un PT: 2A, 2B.
function OrdineEsercizi({ lista, bs, fb, onVai, onSposta }) {
  const frecce = (b, bi) =>
    onSposta && (
      <>
        <button
          className="icon-btn sposta-btn"
          onClick={() => onSposta(lista[b.inizio].id, -1)}
          disabled={bi === 0}
          aria-label="Sposta prima"
        >
          <IconChevron width={17} height={17} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button
          className="icon-btn sposta-btn"
          onClick={() => onSposta(lista[b.inizio].id, 1)}
          disabled={bi === bs.length - 1}
          aria-label="Sposta dopo"
        >
          <IconChevron width={17} height={17} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </>
    )
  const riga = (i, etichetta, bi) => (
    <button
      key={lista[i].id}
      className={'ex-mini ordine-voce' + (bi === fb ? ' active' : '')}
      onClick={() => onVai(bi)}
    >
      <span className="ordine-num">{etichetta}</span>
      <span className="nm">{lista[i].nome?.trim() || 'Senza nome'}</span>
    </button>
  )
  return (
    <>
      <div className="section-title" style={{ margin: '14px 2px 8px' }}>
        Ordine
      </div>
      <div className="stack" style={{ gap: 6 }}>
        {bs.map((b, bi) =>
          eSuperserie(b) ? (
            <div key={lista[b.inizio].id} className="superserie-blocco stretto">
              <div className="ordine-riga">
                <span className="superserie-titolo" style={{ flex: 1, margin: '0 4px' }}>
                  <IconCatena width={14} height={14} /> Superserie
                </span>
                {frecce(b, bi)}
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 4 }}>
                {b.indici.map((i, k) => riga(i, `${bi + 1}${String.fromCharCode(65 + k)}`, bi))}
              </div>
            </div>
          ) : (
            <div key={lista[b.inizio].id} className="ordine-riga">
              {riga(b.inizio, `${bi + 1}`, bi)}
              {frecce(b, bi)}
            </div>
          ),
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Esercizio
function SchemaFields({ schema, onChange }) {
  return (
    <div className="grid-4">
      <input
        className="input"
        placeholder="Serie"
        value={schema.serie}
        onChange={(e) => onChange({ serie: e.target.value })}
      />
      <input
        className="input"
        placeholder="Rip."
        value={schema.ripetizioni}
        onChange={(e) => onChange({ ripetizioni: e.target.value })}
      />
      <input
        className="input"
        placeholder="Carico"
        value={schema.carico}
        onChange={(e) => onChange({ carico: e.target.value })}
      />
      <input
        className="input"
        placeholder="Recupero"
        value={schema.recupero}
        onChange={(e) => onChange({ recupero: e.target.value })}
      />
    </div>
  )
}

function EsercizioEditor({
  esercizio,
  // L'esercizio prima (null per il primo): il suo nome dice CON CHI si fa la
  // superserie, che è la domanda vera dietro l'interruttore.
  precedente,
  primo,
  // La testata della card nella pista (per un esercizio da solo; quella di una
  // superserie sta sul riquadro intorno) e la classe per la pista.
  testa = null,
  classe = '',
  // Solo per EsercizioAllegati: la regola d'accesso ai file deve sapere in
  // quale scheda sta la foto per decidere chi può scaricarla.
  schedaId,
  numeroSettimane,
  senzaSettimane,
  senzaAllegati,
  onPatch,
  onRemove,
  // Dentro una superserie: { etichetta, primo, ultimo, onSposta } — "2A", e le
  // frecce per cambiare chi va per primo nel giro. null fuori da una superserie.
  nelBlocco = null,
  onToggleVaria,
  onPatchSchema,
}) {
  const unito = !primo && !!esercizio.insiemeAlPrecedente
  return (
    <div className={'editor-esercizio ' + classe}>
      {testa}
      {/* In una superserie: "2A", le frecce dentro il giro e il cestino. Da
          solo, il cestino sta nella testata della card (`testa`). Così il nome
          ha tutta la riga: nella card stretta della superserie, con le frecce
          accanto, se ne leggeva mezzo. */}
      {nelBlocco && (
        <div className="editor-testa">
          <span className="editor-testa-titolo superserie">{nelBlocco.etichetta}</span>
          {nelBlocco.onSposta && (
            <>
              <button
                className="icon-btn sposta-btn"
                onClick={() => nelBlocco.onSposta(-1)}
                disabled={nelBlocco.primo}
                aria-label="Prima nella superserie"
              >
                <IconChevron width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <button
                className="icon-btn sposta-btn"
                onClick={() => nelBlocco.onSposta(1)}
                disabled={nelBlocco.ultimo}
                aria-label="Dopo nella superserie"
              >
                <IconChevron width={18} height={18} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </>
          )}
          <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
            <IconTrash width={18} height={18} />
          </button>
        </div>
      )}
      <div className="row" style={{ gap: 4 }}>
        <input
          className="input"
          value={esercizio.nome}
          placeholder="Nome esercizio"
          onChange={(e) => onPatch({ nome: e.target.value })}
          style={{ flex: 1 }}
        />
        {/* Né testata né superserie (non dovrebbe capitare): il cestino resta
            accanto al nome, come una volta. */}
        {!testa && !nelBlocco && (
          <button className="icon-btn" onClick={onRemove} aria-label="Elimina esercizio">
            <IconTrash width={18} height={18} />
          </button>
        )}
      </div>

      {/* La superserie col precedente. Il primo esercizio non ce l'ha: non ha
          nessuno prima a cui legarsi. */}
      {!primo && (
        <div className="toggle-row">
          <span className="muted" style={{ fontSize: 13.5, minWidth: 0 }}>
            Superserie con{' '}
            <strong style={{ color: 'var(--text)' }}>
              {precedente?.nome?.trim() || 'l’esercizio prima'}
            </strong>
          </span>
          <button
            className={'switch' + (unito ? ' on' : '')}
            onClick={() => onPatch({ insiemeAlPrecedente: !unito })}
            role="switch"
            aria-checked={unito}
            aria-label="Superserie con l’esercizio prima"
          >
            <span className="knob" />
          </button>
        </div>
      )}

      <input
        className="input"
        style={{ marginTop: 8 }}
        value={esercizio.nota}
        placeholder="Nota (es. 12rm, cedimento…)"
        onChange={(e) => onPatch({ nota: e.target.value })}
      />

      {/* Più gruppi per esercizio (i dip sono petto e tricipiti). Si mostrano
          solo quelli SCRITTI, non l'ipotesi dal nome: un gruppo acceso che nel
          salvataggio non c'è sarebbe una bugia. */}
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Gruppi muscolari{gruppiScritti(esercizio).length > 1 ? ' — ★ il principale' : ''}
        </span>
        <SceltaGruppi
          compatto
          valori={gruppiScritti(esercizio)}
          onChange={(g) => onPatch(patchGruppi(g))}
        />
      </div>

      {!senzaSettimane && (
        <div className="toggle-row">
          <span className="muted" style={{ fontSize: 13.5 }}>
            Cambia per settimana
          </span>
          <button
            className={'switch' + (esercizio.variaPerSettimana ? ' on' : '')}
            onClick={onToggleVaria}
            aria-label="Cambia per settimana"
          >
            <span className="knob" />
          </button>
        </div>
      )}

      {senzaSettimane || !esercizio.variaPerSettimana ? (
        <SchemaFields schema={esercizio.schemaBase} onChange={(p) => onPatchSchema(null, p)} />
      ) : (
        <div>
          {Array.from({ length: numeroSettimane }, (_, i) => (
            <div key={i} className="week-scheme-row">
              <span className="wk">S{i + 1}</span>
              <input
                className="input"
                placeholder="Serie"
                value={schemaPerSettimana(esercizio, i + 1).serie}
                onChange={(e) => onPatchSchema(i, { serie: e.target.value })}
              />
              <input
                className="input"
                placeholder="Rip."
                value={schemaPerSettimana(esercizio, i + 1).ripetizioni}
                onChange={(e) => onPatchSchema(i, { ripetizioni: e.target.value })}
              />
              <input
                className="input"
                placeholder="Carico"
                value={schemaPerSettimana(esercizio, i + 1).carico}
                onChange={(e) => onPatchSchema(i, { carico: e.target.value })}
              />
              <input
                className="input"
                placeholder="Rec."
                value={schemaPerSettimana(esercizio, i + 1).recupero}
                onChange={(e) => onPatchSchema(i, { recupero: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {!senzaAllegati && (
        <EsercizioAllegati
          esercizio={esercizio}
          schedaId={schedaId}
          onChange={(upd) => onPatch({ commenti: upd.commenti, media: upd.media })}
        />
      )}
    </div>
  )
}
