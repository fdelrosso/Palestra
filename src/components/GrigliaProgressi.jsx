import { useEffect, useRef, useState } from 'react'
import {
  VISIBILITA_FOTO,
  aggiornaVisibilitaProgresso,
  eliminaProgresso,
  fonteProgresso,
  giornoLungo,
  oggiIso,
  perGiorno,
  salvaProgresso,
} from '../lib/progressi'
import { DURATA_VIDEO_MAX, durataVideo, videoTroppoLungo } from '../lib/media'
import { IconCoach, IconLock, IconTrash, IconUpload } from './icons'

// ---------------------------------------------------------------------------
// I pezzi della sezione "Foto", usati da tutte e due le parti: dall'atleta,
// nella sua sezione, e dal personal trainer dentro la cartella di un atleta.
//
// Sono gli stessi pezzi apposta. Un PT che guarda il check di marzo deve vedere
// esattamente quello che vede l'atleta — stessa griglia, stesse date, stesse
// note — se no i due parlano di due cose diverse mentre credono di parlare
// della stessa.
//
// Quello che CAMBIA fra i due è cosa si può toccare, e sono due permessi
// separati apposta:
//   · `puoiAprire`  — la levetta lucchetto/PT. Ce l'ha SOLO l'atleta: è la sua
//                     scelta, e il database non lascia cambiarla a nessun altro
//                     (policy "progressi: li governo io che ci sono dentro").
//   · `puoiEliminare` — l'atleta su tutto, il PT solo sugli scatti che ha
//                     caricato lui, per disfare uno sbaglio appena fatto.
// ⚠️ Nasconderli qui non è la sicurezza: la sicurezza è la regola sul database.
// Qui si evita solo di mostrare un pulsante che darebbe errore.
// ---------------------------------------------------------------------------

const LIMITE_BYTE = 200 * 1024 * 1024 // 200MB, come il limite del bucket

/** Aperta al PT solo se c'è scritto: qualunque altra cosa è privata. */
const apertaAlPt = (r) => r?.visibilita === VISIBILITA_FOTO.PT

export function MiniaturaProgresso({ riga, puoiAprire, puoiEliminare, onCambiata, onEliminata }) {
  const [url, setUrl] = useState(null)
  const [mancante, setMancante] = useState(false)
  // ⚠️ I campi, non l'oggetto: la riga viene da un array che si ricrea a ogni
  // ricarica, e con [riga] si rifarebbe una URL firmata a ogni giro.
  const { id, percorso, atleta_id: atletaId, tipo } = riga

  useEffect(() => {
    let vivo = true
    let revoca = () => {}
    fonteProgresso({ id, percorso, atleta_id: atletaId })
      .then((f) => {
        if (!vivo) {
          f.revoca()
          return
        }
        revoca = f.revoca
        if (!f.url) {
          setMancante(true)
          return
        }
        setUrl(f.url)
      })
      .catch(() => vivo && setMancante(true))
    return () => {
      vivo = false
      revoca()
    }
  }, [id, percorso, atletaId])

  const aperta = apertaAlPt(riga)

  const cambiaVisibilita = async () => {
    const nuova = aperta ? VISIBILITA_FOTO.PRIVATA : VISIBILITA_FOTO.PT
    const esito = await aggiornaVisibilitaProgresso(id, nuova)
    // ⚠️ Si aggiorna la schermata solo se il server ha detto sì. Il contrario —
    // il lucchetto che si apre e il database che non lo sa — è esattamente il
    // modo in cui uno crede di aver mostrato una foto al PT e invece no.
    if (esito.ok) onCambiata?.({ ...riga, visibilita: nuova })
  }

  const elimina = async () => {
    const esito = await eliminaProgresso(riga)
    if (esito.ok) onEliminata?.(riga)
  }

  return (
    <div className="media-thumb">
      {mancante ? (
        <div className="media-mancante">Foto non disponibile</div>
      ) : tipo === 'video' ? (
        url ? <video src={url} controls playsInline /> : <div className="media-loading" />
      ) : url ? (
        <img src={url} alt={riga.nota || riga.nome || 'Foto del check'} />
      ) : (
        <div className="media-loading" />
      )}

      {puoiAprire ? (
        <button
          type="button"
          className={`media-vis ${aperta ? 'al-pt' : 'privata'}`}
          onClick={cambiaVisibilita}
          aria-label={aperta ? 'La vede il tuo PT — richiudila' : 'Privata — mostrala al tuo PT'}
          title={aperta ? 'La vede anche il tuo personal trainer' : 'La vedi solo tu'}
        >
          {aperta ? <IconCoach width={13} height={13} /> : <IconLock width={13} height={13} />}
        </button>
      ) : (
        aperta && (
          <span className="media-vis al-pt" title="L'atleta l'ha mostrata a te" aria-hidden="true">
            <IconCoach width={13} height={13} />
          </span>
        )
      )}

      {riga.soloLocale && (
        <span className="media-locale" title="Non è ancora partita: riprovo quando torna la rete">
          Solo su questo dispositivo
        </span>
      )}

      {puoiEliminare && (
        <button
          type="button"
          className="media-del"
          onClick={elimina}
          aria-label="Elimina questa foto"
        >
          <IconTrash width={15} height={15} />
        </button>
      )}
    </div>
  )
}

/**
 * Gli scatti raggruppati per giorno. È così che si guarda un check — "3 marzo",
 * non ventisei miniature in fila senza sapere quando sono state fatte.
 */
export function GrigliaProgressi({ righe, puoiAprire, puoEliminareRiga, onCambiata, onEliminata }) {
  const giorni = perGiorno(righe)
  if (giorni.length === 0) return null

  return (
    <div className="stack" style={{ gap: 18 }}>
      {giorni.map((g) => (
        <div key={g.data || 'senza-data'}>
          <div className="section-title">
            {giornoLungo(g.data)}
            {g.righe.some((r) => r.nota) && (
              <span className="muted" style={{ fontWeight: 400 }}>
                {' · '}
                {g.righe.find((r) => r.nota)?.nota}
              </span>
            )}
          </div>
          <div className="allegati-media">
            {g.righe.map((r) => (
              <MiniaturaProgresso
                key={r.id}
                riga={r}
                puoiAprire={puoiAprire}
                puoiEliminare={puoEliminareRiga ? puoEliminareRiga(r) : false}
                onCambiata={onCambiata}
                onEliminata={onEliminata}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Il pulsante per aggiungere scatti a un check.
 *
 * La DATA si sceglie prima di scegliere i file, e parte da oggi: una foto di
 * marzo caricata a maggio va messa a marzo, se no la sequenza non racconta
 * niente. La nota è facoltativa ed è il posto dove finisce il peso del giorno.
 *
 * @param {string} atletaId   di chi è il corpo nella foto (= la cartella)
 * @param {string} caricatoDa chi sta premendo il pulsante
 */
export function CaricaProgressi({ atletaId, caricatoDa, onCaricati }) {
  const input = useRef(null)
  const [data, setData] = useState(oggiIso())
  const [nota, setNota] = useState('')
  const [caricando, setCaricando] = useState(false)
  const [scartati, setScartati] = useState([])
  const [inSospeso, setInSospeso] = useState(0)

  const scegli = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // così si può riscegliere lo stesso file
    if (files.length === 0) return

    setCaricando(true)
    setScartati([])
    setInSospeso(0)
    const rifiutati = []
    const nuove = []
    let sospesi = 0

    for (const f of files) {
      if (f.size > LIMITE_BYTE) {
        rifiutati.push(`"${f.name}" è troppo grande (oltre 200MB).`)
        continue
      }
      const tipo = f.type.startsWith('video') ? 'video' : 'foto'
      // Stessa regola degli allegati: i video solo brevi, e il taglio si fa
      // dove il video è già (Foto sull'iPhone), non qui.
      if (tipo === 'video') {
        const secondi = await durataVideo(f)
        if (secondi == null) {
          rifiutati.push(`"${f.name}": non riesco a leggerne la durata, quindi non posso caricarlo.`)
          continue
        }
        if (videoTroppoLungo(secondi)) {
          rifiutati.push(
            `"${f.name}" dura ${Math.round(secondi)} secondi: il massimo è ${DURATA_VIDEO_MAX}. Ritaglialo e riprova (su iPhone: Foto → Modifica → trascina le estremità).`,
          )
          continue
        }
      }
      try {
        const esito = await salvaProgresso({
          blob: f,
          atletaId,
          caricatoDa,
          tipo,
          nome: f.name,
          data,
          nota: nota.trim(),
        })
        if (esito.soloLocale) sospesi += 1
        // ⚠️ Se il server ha detto NO (non "non ti ho sentito") si dice quale
        // file e perché: è l'unica cosa con cui l'utente può rimediare.
        if (esito.errore) rifiutati.push(`"${f.name}": ${esito.errore}`)
        nuove.push(esito.riga)
      } catch (err) {
        console.warn('Salvataggio della foto fallito', err)
        rifiutati.push(`"${f.name}": salvataggio non riuscito.`)
      }
    }

    setCaricando(false)
    setScartati(rifiutati)
    setInSospeso(sospesi)
    setNota('')
    if (nuove.length > 0) onCaricati?.(nuove)
  }

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <label className="stack" style={{ gap: 4, flex: '0 0 auto' }}>
          <span className="muted" style={{ fontSize: 12 }}>Giorno del check</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: 4, flex: 1, minWidth: 140 }}>
          <span className="muted" style={{ fontSize: 12 }}>Nota (facoltativa)</span>
          <input
            type="text"
            value={nota}
            placeholder="78,4 kg · fine massa"
            onChange={(e) => setNota(e.target.value)}
          />
        </label>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={scegli}
      />
      <button
        type="button"
        className="btn"
        disabled={caricando}
        onClick={() => input.current?.click()}
      >
        <IconUpload width={16} height={16} />
        {caricando ? 'Carico…' : 'Aggiungi foto o video'}
      </button>

      {inSospeso > 0 && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          {inSospeso === 1 ? 'Uno scatto è' : `${inSospeso} scatti sono`} solo su questo
          dispositivo: riprovo a mandarli quando torna la rete.
        </p>
      )}
      {scartati.length > 0 && (
        <ul className="stack" style={{ gap: 4, fontSize: 12.5, paddingLeft: 18 }}>
          {scartati.map((m, i) => (
            <li key={i} className="muted">{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
