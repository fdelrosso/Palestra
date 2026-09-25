import { useEffect, useMemo, useRef, useState } from 'react'
import { dataOra } from '../lib/format'
import { durataLunga, gruppiAllenati, numeroPositivo } from '../lib/recap'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import { NESSUNA } from '../lib/interazioni'
import CorpoAllenato from './CorpoAllenato'
import { IconClock, IconComment, IconCuore } from './icons'

// ---------------------------------------------------------------------------
// La scheda di un allenamento nel Feed: quello che prima bisognava aprire, qui
// si vede subito.
//
// È un POST, come in un feed qualunque: in cima chi e quando, in mezzo il
// contenuto — che si sfoglia in ORIZZONTALE: la prima pagina è il recap, le
// altre sono le foto e i video di quella giornata — e sotto il cuore, i
// commenti e quanti ce ne sono.
//
// ⚠️ Dal Feed le foto NON si aggiungono: si aggiungono a fine allenamento
// (il riepilogo) o dopo, dal recap del calendario (components/FotoAllenamento).
// Qui prima c'era una pagina "Aggiungi una foto" in fondo ai propri recap, e
// il suo formato fisso allungava tutte le pagine: sotto gli esercizi restava
// un buco.
//
// ⚠️ L'ALTEZZA LA DÀ IL RECAP. Le pagine di una pista sono alte quanto la più
// alta; le foto quindi non hanno un'altezza loro (riempiono la pagina, con un
// minimo), così non allungano il recap lasciandogli sotto uno spazio vuoto.
//
// ⚠️ Lo scorrimento è `scroll-snap` del browser, non una libreria e nemmeno un
// gestore di gesti scritto a mano. Su un telefono è già fluido, si ferma dove
// deve, e soprattutto NON ruba il gesto allo scorrimento verticale della
// pagina: un carosello fatto a mano è la cosa che più facilmente blocca il
// pollice di chi voleva solo scendere nel feed.
//
// ⚠️ Un allenamento AGGIUNTO A MANO non ha esercizi né durata: la sua scheda non
// deve sembrare rotta. Al posto del corpo coi muscoli accesi mostra quello che
// ha davvero — il nome, la data e la nota — e resta una scheda a tutti gli
// effetti. Prima queste voci erano righe come le altre e si perdevano; adesso
// che il feed è fatto di schede, una scheda mezza vuota si noterebbe.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

function FotoSfogliata({ riga }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)
  const { id, percorso } = riga

  useEffect(() => {
    let vivo = true
    let revoca = () => {}
    fonteFotoAllenamento({ id, percorso })
      .then((f) => {
        if (!vivo) {
          f.revoca()
          return
        }
        revoca = f.revoca
        if (!f.url) setMancante(true)
        else setUrl(f.url)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      revoca()
    }
  }, [id, percorso])

  return (
    <div className="recap-foto">
      {mancante ? (
        <div className="media-mancante">Foto non disponibile</div>
      ) : riga.tipo === 'video' ? (
        url ? <video src={url} controls playsInline /> : <div className="media-loading" />
      ) : url ? (
        <img src={url} alt={riga.nome || 'Foto dell’allenamento'} />
      ) : (
        <div className="media-loading" />
      )}
      {riga.soloLocale && (
        <span className="media-locale">Solo su questo dispositivo</span>
      )}
    </div>
  )
}

export default function SchedaRecap({
  voce,
  foto = [],
  interazioni = NESSUNA,
  onApri,
  onMiPiace,
  onApriMiPiace,
  onApriCommenti,
}) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)

  const gruppi = useMemo(() => gruppiAllenati(voce.esercizi), [voce.esercizi])
  const kcal = numeroPositivo(voce.calorieReali)
  const serie = (voce.esercizi || []).reduce((n, e) => n + (e.sets?.length || 0), 0)

  // Quante pagine: il recap e le foto.
  const pagine = 1 + foto.length
  const { miPiace, mio: miPiaceMio, commenti, ultimo } = interazioni || NESSUNA

  // Quale pagina si sta guardando, per i pallini sotto. Si legge dallo
  // scorrimento invece di pilotarlo: chi trascina con il dito comanda lui.
  const onScroll = () => {
    const el = pista.current
    if (!el || el.clientWidth === 0) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((p) => (p === n ? p : n))
  }

  return (
    <article className="recap-card">
      <header className="recap-card-testa">
        <span className="user-avatar sm" aria-hidden="true">{iniziale(voce.utenteNome)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{voce.utenteNome}</div>
          <div className="muted" style={{ fontSize: 12 }}>{dataOra(voce.data)}</div>
        </div>
        {voce.durataSec != null && (
          <span className="badge">
            <IconClock width={13} height={13} /> {durataLunga(voce.durataSec)}
          </span>
        )}
      </header>

      <div className="recap-pista" ref={pista} onScroll={onScroll}>
        {/* --- pagina 1: il recap --- */}
        <div className="recap-pagina">
          <button className="recap-corpo" onClick={() => onApri?.(voce)} type="button">
            <div className="recap-titolo">
              <span className="recap-giorno">{voce.nomeGiorno}</span>
              {voce.nomeScheda && <span className="muted recap-scheda">{voce.nomeScheda}</span>}
            </div>

            {gruppi.length > 0 ? (
              <>
                <CorpoAllenato gruppi={gruppi} />
                <div className="gruppo-chips" style={{ justifyContent: 'center' }}>
                  {gruppi.map((g) => (
                    <span key={g.id} className="gruppo-chip on" style={{ '--g': g.colore }}>
                      {g.label} · {g.serie}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              // Allenamento aggiunto a mano: niente corpo, ma nemmeno un buco.
              <div className="recap-semplice">
                <div className="recap-semplice-segno" aria-hidden="true">🏋️</div>
                <p className="muted">
                  {voce.nota
                    ? voce.nota
                    : 'Allenamento segnato a mano, senza il dettaglio delle serie.'}
                </p>
              </div>
            )}

            {/* ⚠️ Gli esercizi, per nome. Nella prima versione la scheda aveva
                solo il riassunto per gruppi ("Schiena · 11") e rimandava al
                recap per esteso: a vederla sembrava vuota, perché la cosa che
                uno vuole sapere di un allenamento altrui è COSA ha fatto.
                I pallini sono le serie coi colori dello sforzo, come nel recap
                e durante l'allenamento: una lingua sola in tutta l'app. */}
            {(voce.esercizi || []).length > 0 && (
              <ul className="recap-esercizi">
                {voce.esercizi.map((e, i) => (
                  <li key={i} className="recap-esercizio">
                    <span className="recap-esercizio-nome">{e.nome}</span>
                    <span className="recap-esercizio-serie" aria-label={`${(e.sets || []).length} serie`}>
                      {(e.sets || []).map((s, j) => (
                        <span key={j} className={'dot-mini' + (s.colore ? ' ' + s.colore : '')} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="row recap-numeri">
              {serie > 0 && <span className="chip">{serie} serie</span>}
              {(voce.esercizi || []).length > 0 && (
                <span className="chip">{voce.esercizi.length} esercizi</span>
              )}
              {kcal && <span className="chip">🔥 {Math.round(kcal)} kcal</span>}
              {voce.settimana != null && (
                <span className="badge badge-accent">Sett. {voce.settimana}</span>
              )}
            </div>
          </button>
        </div>

        {/* --- le foto della giornata --- */}
        {foto.map((f) => (
          <div className="recap-pagina recap-pagina-foto" key={f.id}>
            <FotoSfogliata riga={f} />
          </div>
        ))}

      </div>

      {pagine > 1 && (
        <div className="recap-pallini" aria-hidden="true">
          {Array.from({ length: pagine }, (_, i) => (
            <span key={i} className={'recap-pallino' + (i === pagina ? ' on' : '')} />
          ))}
        </div>
      )}

      {/* --- sotto il post: mi piace e commenti --- */}
      <div className="post-azioni">
        <button
          type="button"
          className={'post-azione' + (miPiaceMio ? ' acceso' : '')}
          onClick={() => onMiPiace?.(voce)}
          aria-pressed={miPiaceMio}
          aria-label={miPiaceMio ? 'Togli il mi piace' : 'Mi piace'}
        >
          <IconCuore pieno={miPiaceMio} width={24} height={24} />
        </button>
        <button
          type="button"
          className="post-azione"
          onClick={() => onApriCommenti?.(voce)}
          aria-label="Commenti"
        >
          <IconComment width={23} height={23} />
        </button>
        {foto.length > 0 && (
          <span className="post-foto-conto">
            {foto.length === 1 ? '1 foto' : `${foto.length} foto`}
          </span>
        )}
      </div>
      <div className="post-sotto">
        {miPiace > 0 && (
          <button type="button" className="post-mi-piace" onClick={() => onApriMiPiace?.(voce)}>
            {miPiace === 1 ? '1 mi piace' : `${miPiace} mi piace`}
          </button>
        )}
        {ultimo && (
          <button type="button" className="post-ultimo" onClick={() => onApriCommenti?.(voce)}>
            <strong>{ultimo.nome}</strong> {ultimo.testo || (ultimo.foto ? '📷 una foto' : '')}
          </button>
        )}
        <button type="button" className="post-commenti" onClick={() => onApriCommenti?.(voce)}>
          {commenti > 1
            ? `Vedi tutti i ${commenti} commenti`
            : commenti === 1
              ? 'Vedi il commento'
              : 'Aggiungi un commento…'}
        </button>
      </div>
    </article>
  )
}
