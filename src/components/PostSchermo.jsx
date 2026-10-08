import { useEffect, useMemo, useRef, useState } from 'react'
import { quandoBreve } from '../lib/format'
import { durataLunga, formattaMigliaia, gruppiAllenati, numeroPositivo, volumeEsercizio } from '../lib/recap'
import { fonteFotoAllenamento } from '../lib/fotoAllenamento'
import { NESSUNA } from '../lib/interazioni'
import CorpoAllenato from './CorpoAllenato'
import SegnalaContenuto from './SegnalaContenuto'
import { IconBandiera, IconComment, IconCuore } from './icons'

// ---------------------------------------------------------------------------
// Un allenamento nel feed di Social: UNO PER SCHERMATA, si scorre in
// verticale come le storie. Fino alla 39ª era una lista di card
// (components/SchedaRecap): utile, ma un allenamento valeva quanto una riga.
//
// La prima pagina è una CARTOLINA GRAFICA, perché quasi nessuno attacca foto
// all'allenamento e uno schermo intero vuoto non si guarda: il corpo coi
// muscoli accesi (lo stesso del recap), il nome grande, i numeri che contano
// (serie, kg alzati, durata) e i gruppi. Il colore di fondo è quello del
// gruppo PIÙ lavorato, mescolato col colore dell'app: un giorno di gambe e uno
// di petto si riconoscono scorrendo, prima ancora di leggere.
// Le foto e i video della giornata vengono dopo, sfogliando di LATO.
//
// A destra, come in ogni feed a schermo intero, il cuore e i commenti; in
// basso chi e quando. Toccare la cartolina apre il recap per esteso, toccare
// un gruppo lo apre già filtrato su quel gruppo.
//
// ⚠️ La cartolina è SEMPRE scura, anche col tema chiaro: sopra ci va del
// testo bianco grande, e i token del tema (--text, --bg-elev…) si ridefiniscono
// dentro .post-schermo così il corpo disegnato resta leggibile.
//
// ⚠️ Lo scorrimento (verticale fra i post, orizzontale fra le pagine) è
// `scroll-snap` del browser: niente gestori di gesti scritti a mano, che sono
// la cosa che più facilmente blocca il pollice.
//
// ⚠️ Un allenamento AGGIUNTO A MANO non ha esercizi né durata: niente corpo
// spento e numeri a zero, ma il nome, la nota e un segno grande.
// ---------------------------------------------------------------------------

function iniziale(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}

// Una foto (o un video) di un ALTRO si può segnalare dalla bandierina in alto
// a destra: sparisce per chi la segnala (`onSegnalato`, il Feed tiene
// l'elenco) e la guarda un moderatore (lib/segnalazioni).
function FotoSfogliata({ riga, onSegnala }) {
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
      {onSegnala && (
        <button
          type="button"
          className="recap-foto-segnala"
          aria-label={riga.tipo === 'video' ? 'Segnala questo video' : 'Segnala questa foto'}
          onClick={(e) => {
            e.stopPropagation()
            onSegnala(riga)
          }}
        >
          <IconBandiera width={16} height={16} />
        </button>
      )}
    </div>
  )
}

// Kg alzati: sotto la tonnellata in kg, sopra in tonnellate con un decimale.
function volumeTesto(kg) {
  if (!kg) return null
  return kg < 1000 ? { n: formattaMigliaia(kg), u: 'kg' } : { n: (kg / 1000).toFixed(1).replace('.', ','), u: 't' }
}

export default function PostSchermo({
  voce,
  foto = [],
  interazioni = NESSUNA,
  onApri,
  onMiPiace,
  onApriMiPiace,
  onApriCommenti,
  ioId = null,
  onSegnalato,
}) {
  const pista = useRef(null)
  const [pagina, setPagina] = useState(0)
  const [daSegnalare, setDaSegnalare] = useState(null) // la foto da segnalare

  const gruppi = useMemo(() => gruppiAllenati(voce.esercizi), [voce.esercizi])
  const esercizi = voce.esercizi || []
  const serie = esercizi.reduce((n, e) => n + (e.sets || []).filter((s) => s?.colore).length, 0)
  const volume = volumeTesto(esercizi.reduce((n, e) => n + volumeEsercizio(e), 0))
  const kcal = numeroPositivo(voce.calorieReali)
  const numeri = [
    serie > 0 && { n: serie, u: 'serie' },
    volume && { n: volume.n, u: volume.u === 't' ? 'tonnellate' : 'kg alzati' },
    voce.durataSec > 0 && { n: durataLunga(voce.durataSec), u: 'durata' },
    kcal && { n: Math.round(kcal), u: 'kcal' },
  ].filter(Boolean)

  const pagine = 1 + foto.length
  const { miPiace, mio, commenti } = interazioni || NESSUNA

  const onScroll = () => {
    const el = pista.current
    if (!el || el.clientWidth === 0) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setPagina((p) => (p === n ? p : n))
  }

  return (
    <article className="post-schermo" style={{ '--tinta': gruppi[0]?.colore || 'var(--accent)' }}>
      <div className="post-pista" ref={pista} onScroll={onScroll}>
        <section className="post-pagina post-cartolina" onClick={() => onApri?.(voce)}>
          <div className="post-alone" aria-hidden="true" />
          <div className="post-contenuto">
            {gruppi.length > 0 ? (
              <div className="post-corpo">
                <CorpoAllenato gruppi={gruppi} onGruppo={(id) => onApri?.(voce, [id])} />
              </div>
            ) : (
              <div className="post-segno" aria-hidden="true">🏋️</div>
            )}

            <button
              type="button"
              className="post-titolo"
              onClick={(e) => {
                e.stopPropagation()
                onApri?.(voce)
              }}
              aria-label={`Apri il recap: ${voce.nomeGiorno} di ${voce.utenteNome}`}
            >
              {voce.nomeGiorno}
            </button>
            {voce.nomeScheda && (
              <div className="post-scheda">
                {voce.nomeScheda}
                {voce.settimana != null ? ` · settimana ${voce.settimana}` : ''}
              </div>
            )}

            {numeri.length > 0 ? (
              <div className="post-numeri">
                {numeri.map((x) => (
                  <div key={x.u} className="post-numero">
                    <span className="post-numero-n">{x.n}</span>
                    <span className="post-numero-u">{x.u}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="post-nota">
                {voce.nota || 'Allenamento segnato a mano, senza il dettaglio delle serie.'}
              </p>
            )}

            {gruppi.length > 0 && (
              <div className="gruppo-chips post-gruppi">
                {gruppi.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="gruppo-chip on"
                    style={{ '--g': g.colore }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onApri?.(voce, [g.id])
                    }}
                    aria-label={`Esercizi di ${g.label} (${g.serie} serie) di ${voce.utenteNome}`}
                  >
                    {g.label} · {g.serie}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {foto.map((f) => (
          <section className="post-pagina post-pagina-foto" key={f.id}>
            <FotoSfogliata
              riga={f}
              onSegnala={onSegnalato && ioId && f.user_id && f.user_id !== ioId ? setDaSegnalare : null}
            />
          </section>
        ))}
      </div>

      {daSegnalare && (
        <SegnalaContenuto
          tipo="foto"
          oggetto={daSegnalare.id}
          ioId={ioId}
          cosa={daSegnalare.tipo === 'video' ? 'questo video' : 'questa foto'}
          onChiudi={() => setDaSegnalare(null)}
          onFatto={() => {
            onSegnalato?.('foto', daSegnalare.id)
            setDaSegnalare(null)
          }}
        />
      )}

      <footer className="post-chi">
        <span className="user-avatar sm" aria-hidden="true">{iniziale(voce.utenteNome)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="post-chi-nome">{voce.utenteNome}</span>
          <span className="post-chi-quando">{quandoBreve(voce.data)}</span>
        </span>
        {pagine > 1 && (
          <span className="post-pallini" aria-hidden="true">
            {Array.from({ length: pagine }, (_, i) => (
              <span key={i} className={'post-pallino' + (i === pagina ? ' on' : '')} />
            ))}
          </span>
        )}
      </footer>

      <aside className="post-rail">
        <button
          type="button"
          className={'post-rail-tasto' + (mio ? ' acceso' : '')}
          onClick={() => onMiPiace?.(voce)}
          aria-pressed={mio}
          aria-label={mio ? 'Togli il mi piace' : 'Mi piace'}
        >
          <IconCuore pieno={mio} width={30} height={30} />
        </button>
        <button
          type="button"
          className="post-rail-conto"
          onClick={() => miPiace > 0 && onApriMiPiace?.(voce)}
          aria-label={`${miPiace} mi piace: vedi chi`}
        >
          {miPiace}
        </button>
        <button
          type="button"
          className="post-rail-tasto"
          onClick={() => onApriCommenti?.(voce)}
          aria-label={`Commenti: ${commenti}`}
        >
          <IconComment width={29} height={29} />
        </button>
        <span className="post-rail-conto" aria-hidden="true">{commenti}</span>
      </aside>
    </article>
  )
}
