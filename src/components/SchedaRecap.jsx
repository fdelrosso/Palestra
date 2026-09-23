import { useEffect, useMemo, useRef, useState } from 'react'
import { dataOra } from '../lib/format'
import { durataLunga, gruppiAllenati, numeroPositivo } from '../lib/recap'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import CorpoAllenato from './CorpoAllenato'
import { IconClock, IconImage, IconPlus } from './icons'

// ---------------------------------------------------------------------------
// La scheda di un allenamento nel Feed: quello che prima bisognava aprire, qui
// si vede subito.
//
// Si sfoglia in ORIZZONTALE: la prima pagina è il recap, le altre sono le foto
// di quella giornata, e in fondo — solo sui propri — la pagina per aggiungerne.
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

export default function SchedaRecap({ voce, foto = [], mio = false, onApri, onAggiungiFoto }) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)

  const gruppi = useMemo(() => gruppiAllenati(voce.esercizi), [voce.esercizi])
  const kcal = numeroPositivo(voce.calorieReali)
  const serie = (voce.esercizi || []).reduce((n, e) => n + (e.sets?.length || 0), 0)

  // Quante pagine: il recap, le foto, e — sui propri — quella per aggiungerne.
  const pagine = 1 + foto.length + (mio ? 1 : 0)

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
          <div className="recap-pagina" key={f.id}>
            <FotoSfogliata riga={f} />
          </div>
        ))}

        {/* --- solo sui propri: aggiungine --- */}
        {mio && (
          <div className="recap-pagina">
            <button
              type="button"
              className="recap-aggiungi"
              onClick={() => onAggiungiFoto?.(voce)}
            >
              <IconPlus width={26} height={26} />
              <span>{foto.length === 0 ? 'Aggiungi una foto' : 'Aggiungine un’altra'}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                Si sfoglia insieme al recap
              </span>
            </button>
          </div>
        )}
      </div>

      {pagine > 1 && (
        <div className="recap-pallini" aria-hidden="true">
          {Array.from({ length: pagine }, (_, i) => (
            <span key={i} className={'recap-pallino' + (i === pagina ? ' on' : '')} />
          ))}
        </div>
      )}

      {/* Un indizio che c'è dell'altro di lato: senza, chi scorre solo in
          verticale non scopre mai le foto. Sparisce appena ci si sposta. */}
      {pagine > 1 && pagina === 0 && (
        <div className="recap-suggerimento">
          <IconImage width={13} height={13} />
          {foto.length > 0
            ? foto.length === 1
              ? '1 foto — scorri di lato'
              : `${foto.length} foto — scorri di lato`
            : 'Scorri di lato per aggiungere una foto'}
        </div>
      )}
    </article>
  )
}
