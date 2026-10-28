import { memo, useEffect, useState } from 'react'
import CorpoAllenato from './CorpoAllenato'
import { PolaroidMusica } from './ChipMusica'
import { IconComment, IconCuore } from './icons'
import { celleDelMese, conGiorno, dataBreve, durataLunga, formattaMigliaia, recordPerCrescita } from '../lib/recapMese'
import { formattaNumero } from '../lib/carico'
import { anelloDi } from '../lib/oggi'

// ---------------------------------------------------------------------------
// Il contenuto di UNA slide del recap del mese (pages/RecapMesePage). Testo
// vero, con un titolo: lo legge anche uno screen reader. Poche slide e piene
// (lib/recapMese SLIDE), ognuna col SUO momento animato: il calendario che si
// accende, le foto che cadono, i numeri che contano, le righe di pallini che si
// scoprono, le polaroid distribuite come carte, i record che scattano.
// Le animazioni partono solo sulla slide attuale, e non con "riduci movimento".
// ---------------------------------------------------------------------------

export default memo(SlideRecapMese)

function SlideRecapMese({ id, r, foto = [], nome = '', riepilogo = null }) {
  switch (id) {
    case 'mese':
      return (
        <div className="rm-slide-dentro">
          {/* Quanti, lo dicono i cerchi a penna (e il "N volte!" in fondo). */}
          <h2 className="rm-titolo-grande rm-entra">{titoloMese(r.nomeMese, nome)}</h2>
          <div className="rm-entra">
            <Calendario r={r} />
          </div>
          {r.inPiu && <p className="rm-sotto rm-entra">{`+${r.inPiu} rispetto a ${r.nomeMesePrima}`}</p>}
        </div>
      )
    case 'foto':
      return (
        <div className="rm-slide-dentro">
          <h2 className="rm-titolo rm-entra">{foto.length === 1 ? 'La foto del mese' : 'Le foto del mese'}</h2>
          {/* Le tre più apprezzate; le altre stanno solo sullo sfondo della card. */}
          <Foto foto={foto.slice(0, 3)} />
        </div>
      )
    case 'fatica': {
      // Il peso sollevato e il bilanciere caricato coi dischi del mese (uno per
      // allenamento); il tempo e il cardio in riquadri sotto. Senza kg il
      // protagonista è il tempo.
      const riquadri = [
        r.volume && r.durataSec && { valore: durataLunga(r.durataSec), cosa: 'in palestra' },
        r.minutiCardio > 0 && { valore: durataLunga(r.minutiCardio * 60), cosa: 'di cardio' },
      ].filter(Boolean)
      const sotto = r.volume
        ? r.volumeInPiu
          ? `+${formattaMigliaia(r.volumeInPiu)} kg rispetto a ${r.nomeMesePrima}`
          : r.pesoMax && `Il peso più alto: ${r.pesoMax.testo} a ${r.pesoMax.esercizio}`
        : r.piuLungo && r.allenamenti > 1 && `Il più lungo: ${r.piuLungo.nome}, ${dataBreve(r.piuLungo.data)}`
      const pesante = r.dischi[0]
      return (
        <div className="rm-slide-dentro">
          <p className="rm-sopra rm-entra">La fatica del mese</p>
          <p className="rm-grande rm-entra">
            {r.volume ? (
              <Conta n={r.volume} unita="kg" />
            ) : (
              <Conta n={Math.round(r.durataSec / 60)} formatta={(m) => conUnita(durataLunga(m * 60))} testo={durataLunga(r.durataSec)} />
            )}
          </p>
          <h2 className="rm-titolo rm-entra">{r.volume ? 'sollevati' : 'in palestra'}</h2>
          {r.dischi.length > 0 && (
            <>
              <Bilanciere dischi={r.dischi} />
              <p className="rm-sotto rm-bil-nota">
                {r.dischi.length === 1
                  ? 'Il disco è il tuo allenamento.'
                  : `Un disco per allenamento: il più pesante ${dataBreve(pesante.data)}, ${formattaMigliaia(pesante.volume)} kg.`}
              </p>
            </>
          )}
          {sotto && <p className="rm-sotto rm-entra">{sotto}</p>}
          {riquadri.length > 0 && (
            <div className="rm-abitudini rm-fatica-riquadri">
              {riquadri.map((x, i) => (
                <div key={x.cosa} className={'rm-abitudine' + (riquadri.length === 1 ? ' largo' : '')} style={{ '--i': i + 2 }}>
                  <strong>{conUnita(x.valore)}</strong>
                  <span>{x.cosa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'stile': {
      // Il muscolo del mese grande, del suo colore (lo stesso della figura), e
      // sotto le abitudini in riquadri: un dato e cosa vuol dire.
      const a = r.abitudini
      const g = r.gruppi[0]
      const poi = r.gruppi.slice(1, 3).map((x) => x.label.toLowerCase())
      const riquadri = [
        a?.esercizio && { valore: a.esercizio.nome, cosa: `l’esercizio più fatto, ${volte(a.esercizio.volte)}`, largo: true },
        a && { valore: maiuscola(conGiorno(a.giorno)), cosa: 'il giorno preferito' },
        a?.settimaneDiFila > 1 && { valore: `${a.settimaneDiFila} settimane`, cosa: 'di fila, senza saltarne una' },
      ].filter(Boolean)
      return (
        <div className="rm-slide-dentro">
          {g && (
            <>
              <p className="rm-sopra rm-entra">Il muscolo del mese</p>
              <h2 className="rm-muscolo rm-entra" style={{ '--g': g.colore }}>
                {g.label}
              </h2>
              <p className="rm-sotto rm-entra">
                {`${g.serie} serie`}
                {poi.length > 0 && `, poi ${poi.join(' e ')}`}
              </p>
              <div className="rm-stile-corpo rm-entra">
                <CorpoAllenato gruppi={r.gruppi} calore altezza={250} />
              </div>
            </>
          )}
          {!g && <h2 className="rm-titolo rm-entra">Le abitudini</h2>}
          {riquadri.length > 0 && (
            <div className="rm-abitudini">
              {riquadri.map((x, i) => (
                <div key={x.cosa} className={'rm-abitudine' + (x.largo ? ' largo' : '')} style={{ '--i': i }}>
                  <strong>{x.valore}</strong>
                  <span>{x.cosa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'sforzo': {
      const { verde, giallo, rosso, tot } = r.sforzo
      return (
        <Slide sopra="Lo sforzo" grande={tot} titolo={tot === 1 ? 'serie' : 'serie, una per pallino'}>
          <Pallini righe={r.pallini} etichetta={`${verde} facili, ${giallo} medie, ${rosso} dure`} />
          <p className="rm-sotto rm-legenda">
            <span className="dot-mini verde" /> {verde} facili <span className="dot-mini giallo" /> {giallo} medie{' '}
            <span className="dot-mini rosso" /> {rosso} dure
          </p>
          {r.piuDuro && r.allenamenti > 1 && <p className="rm-sotto">{`Il più duro: ${r.piuDuro.nome}, ${dataBreve(r.piuDuro.data)}`}</p>}
        </Slide>
      )
    }
    case 'canzoni':
      return (
        <div className="rm-slide-dentro">
          <h2 className="rm-titolo rm-entra">{r.canzoni.length === 1 ? 'La canzone del mese' : 'Le canzoni del mese'}</h2>
          <Canzoni canzoni={r.canzoni} />
        </div>
      )
    case 'record':
      return (
        <div className="rm-slide-dentro">
          <p className="rm-sopra rm-entra">{r.numRecord === 1 ? 'Il record del mese' : `${r.numRecord} record battuti`}</p>
          <ol className="rm-rec-lista">
            {recordPerCrescita(r.record).map((x, i) => (
              <Record key={x.esercizio} x={x} i={i} />
            ))}
          </ol>
          {r.numRecord > r.record.length && <p className="rm-sotto rm-entra">{`e altri ${r.numRecord - r.record.length}`}</p>}
        </div>
      )
    case 'riepilogo':
      return <Slide titolo={chiusura(r)}>{riepilogo}</Slide>
    default:
      return null
  }
}

const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1)
// "L'ottobre di Ciusbe in palestra", "Il settembre di…": il nome senza la @ e
// con la maiuscola. Senza nome "Il tuo ottobre in palestra".
function titoloMese(mese, nome) {
  const chi = maiuscola(String(nome || '').replace(/^@/, '').trim())
  if (!chi) return `Il tuo ${mese} in palestra`
  return `${/^[aeiou]/.test(mese) ? `L’${mese}` : `Il ${mese}`} di ${chi} in palestra`
}

const volte = (n) => (n === 1 ? '1 volta' : `${n} volte`)

// La frase che chiude la storia, sopra la card: il mese in una riga.
function chiusura(r) {
  const pezzi = [`${r.allenamenti} ${r.allenamenti === 1 ? 'allenamento' : 'allenamenti'}`]
  if (r.numRecord) pezzi.push(`${r.numRecord} record`)
  return `${maiuscola(r.nomeMese)}: ${pezzi.join(', ')}.`
}

function Slide({ sopra = '', grande = null, unita = '', titolo, children }) {
  return (
    <div className="rm-slide-dentro">
      {sopra && <p className="rm-sopra rm-entra">{sopra}</p>}
      {grande != null && (
        <p className="rm-grande rm-entra">
          {typeof grande === 'number' ? <Conta n={grande} unita={unita} /> : conUnita(grande)}
        </p>
      )}
      <h2 className="rm-titolo rm-entra">{titolo}</h2>
      <div className="rm-corpo rm-entra">{children}</div>
    </div>
  )
}

// IL BILANCIERE del mese: la sbarra, e su ogni lato gli stessi dischi, uno per
// allenamento, dal più pesante (dentro) al più leggero (fuori), alti secondo
// il loro peso e del colore dei dischi veri. Entrano uno alla volta dalla
// punta, come si carica in palestra; poi il fermo.
const DISCHI_MAX = 12
function Bilanciere({ dischi }) {
  const visti = dischi.slice(0, DISCHI_MAX)
  const disco = (d, i, lato) => (
    <span
      key={d.data + lato}
      className={'rm-disco ' + d.colore}
      style={{ '--h': `${32 + d.quota * 68}%`, '--k': i }}
    />
  )
  return (
    <div className="rm-bil" aria-hidden="true" style={{ '--n': visti.length }}>
      <span className="rm-bil-punta" />
      <span className="rm-bil-fermo sx" />
      <span className="rm-bil-lato sx">{[...visti].reverse().map((d) => disco(d, visti.indexOf(d), 'sx'))}</span>
      <span className="rm-bil-sbarra" />
      <span className="rm-bil-lato dx">{visti.map((d, i) => disco(d, i, 'dx'))}</span>
      <span className="rm-bil-fermo dx" />
      <span className="rm-bil-punta" />
    </div>
  )
}

// Il numero grande: le cifre piene, le unità piccole accanto ("8 h 02 min"
// sta in una riga anche a 96px).
function conUnita(testo) {
  return String(testo)
    .split(/(\d[\d.,]*)/)
    .filter((x) => x.trim())
    .map((x, i) => (/^\d/.test(x) ? x : <span key={i} className="rm-unita">{x.trim()}</span>))
}

const fermo = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Un numero che sale fino al suo valore quando la slide arriva (ease-out,
// ~0,9", dopo `ritardo` ms), da `da`; con "riduci movimento" è già lì.
// `formatta` lo scrive (di base con i punti delle migliaia); lo screen reader
// legge solo il finale (`testo`).
function Conta({ n, da = 0, unita = '', formatta = formattaMigliaia, testo, ritardo = 0 }) {
  const [v, setV] = useState(() => (fermo() ? n : da))
  useEffect(() => {
    if (fermo()) return
    const t0 = performance.now() + ritardo
    let giro = requestAnimationFrame(function passo(t) {
      const k = Math.min(1, Math.max(0, (t - t0) / 900))
      const x = da + (n - da) * (1 - Math.pow(2, -10 * k))
      // Interi se lo sono gli estremi; se no al mezzo chilo (i dischi da 2,5 a lato).
      setV(Number.isInteger(n) && Number.isInteger(da) ? Math.round(x) : Math.round(x * 2) / 2)
      if (k < 1) giro = requestAnimationFrame(passo)
      else setV(n)
    })
    return () => cancelAnimationFrame(giro)
  }, [n, da, ritardo])
  return (
    <>
      <span aria-hidden="true">
        {formatta(v)}
        {unita && <span className="rm-unita">{unita}</span>}
      </span>
      <span className="rm-solo-voce">{testo || `${formattaMigliaia(n)} ${unita}`.trim()}</span>
    </>
  )
}

// Un record: il nome, il peso nuovo che sale da quello di prima, e la barra
// prima/dopo che si allunga con "+N kg". Il primo (il più cresciuto) grande,
// gli altri uguali ma compatti; arrivano uno dopo l'altro.
function Record({ x, i }) {
  // La barra: il più piccolo dei due sul più grande (per l'aiuto il dopo è il minore).
  const quota = Math.max(0.08, Math.min(x.primaN, x.dopoN) / Math.max(x.primaN, x.dopoN, 1))
  const ritardo = 300 + i * 260
  return (
    <li className={'rm-rec' + (i === 0 ? ' primo' : '')} style={{ '--i': i, '--quota': quota, '--ritardo': `${ritardo}ms` }}>
      <div className="rm-rec-testa">
        <span className="rm-rec-nome">{x.esercizio}</span>
        <span className="rm-rec-kg">
          <Conta n={x.dopoN} da={x.primaN} unita={x.unita} formatta={formattaNumero} testo={x.carico} ritardo={ritardo} />
        </span>
      </div>
      <div className="rm-pd-barra">
        <span className="rm-pd-prima" />
        <span className="rm-pd-dopo" />
      </div>
      <div className="rm-pd-testi">
        <span>{`prima ${x.prima} ${x.unita}`}</span>
        <strong>{`${x.misura === 'aiuto' ? '−' : '+'}${formattaNumero(x.crescita)} ${x.unita}`}</strong>
      </div>
    </li>
  )
}

// Le foto del mese (scelte dalla pagina: le più apprezzate, al massimo tre):
// la prima grande, le altre due sotto. Ognuna col giorno e i suoi mi piace e
// commenti, che cadono una dopo l'altra come stampe sul tavolo.
function Foto({ foto }) {
  return (
    <div className="rm-foto" data-n={foto.length}>
      {foto.map((f, i) => (
        <figure key={f.id} className="rm-foto-una" style={{ '--i': i, '--r': `${[-1.5, 2, -2.5][i]}deg` }}>
          <img src={f.url} alt="" draggable="false" onError={(e) => (e.currentTarget.closest('figure').hidden = true)} />
          <figcaption>
            <span>{dataBreve(f.data)}</span>
            {f.miPiace > 0 && (
              <span className="rm-foto-n">
                <IconCuore pieno width={14} height={14} aria-hidden="true" /> {f.miPiace}
                <span className="rm-solo-voce"> mi piace</span>
              </span>
            )}
            {f.commenti > 0 && (
              <span className="rm-foto-n">
                <IconComment width={14} height={14} aria-hidden="true" /> {f.commenti}
                <span className="rm-solo-voce">{f.commenti === 1 ? ' commento' : ' commenti'}</span>
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

// Le canzoni del mese: la più scelta come polaroid grande (si tocca per
// l'anteprima), le altre in classifica, leggibili, con quante volte.
const CANZONI_MAX = 5
function Canzoni({ canzoni }) {
  const [prima, ...altre] = canzoni.slice(0, CANZONI_MAX)
  return (
    <>
      <div className="rm-canzone-prima rm-entra">
        <PolaroidMusica musica={prima.musica} />
        <p className="rm-canzone-volte">{volte(prima.volte)}</p>
      </div>
      {altre.length > 0 && (
        <ol className="rm-classifica" start={2}>
          {altre.map((c, i) => (
            <li key={c.musica.id} style={{ '--i': i }}>
              <span className="rm-classifica-n">{i + 2}</span>
              {c.musica.copertina ? <img src={c.musica.copertina} alt="" /> : <span className="rm-classifica-img" />}
              <span className="rm-classifica-testo">
                <strong>{c.musica.titolo}</strong>
                {c.musica.artista && <span>{c.musica.artista}</span>}
              </span>
              <span className="rm-classifica-volte">{volte(c.volte)}</span>
            </li>
          ))}
        </ol>
      )}
      {canzoni.length > CANZONI_MAX && <p className="rm-sotto rm-centro">{`e altre ${canzoni.length - CANZONI_MAX}`}</p>}
    </>
  )
}

// Un mese di pallini: una riga per allenamento (il giorno a sinistra), le
// serie in fila coi loro colori. Colonne uguali per tutte le righe, così le
// righe si confrontano a occhio; ogni riga si scopre da sinistra.
function Pallini({ righe, etichetta }) {
  const n = Math.max(...righe.map((p) => p.colori.length))
  return (
    <div className="rm-pallini" role="img" aria-label={etichetta} style={{ '--n': n, '--righe': righe.length }}>
      {righe.map((p, i) => (
        <div key={i} className="rm-pallini-riga" style={{ '--i': i }}>
          <span className="rm-pallini-g">{p.giorno}</span>
          <span className="rm-pallini-serie">
            {p.colori.map((c, j) => (
              <span key={j} className={'rm-pallino ' + c} />
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

// IL CALENDARIO, lo stesso della pagina Calendario (pages/CalendarPage): il
// mese grande con l'anno tenue e quanti allenamenti, i giorni allenati con
// l'ANELLO coi colori dei muscoli di quel giorno (lib/oggi anelloDi). Qui in
// più gli anelli si disegnano, uno dopo l'altro.
function Calendario({ r }) {
  const perGiorno = new Map()
  for (const v of r.voci) {
    const g = new Date(v.data).getDate()
    perGiorno.set(g, [...(perGiorno.get(g) || []), v])
  }
  const ordine = [...perGiorno.keys()].sort((a, b) => a - b)
  return (
    <div className="rm-cal" aria-hidden="true" style={{ '--n': ordine.length }}>
      <div className="rm-cal-testa">
        <span className="rm-cal-mese">{maiuscola(r.nomeMese)}</span>
        <span className="rm-cal-anno">{r.anno}</span>
      </div>
      <div className="rm-cal-griglia">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => (
          <span key={'g' + i} className="rm-cal-int">
            {x}
          </span>
        ))}
        {celleDelMese(r.anno, r.mese).map((g, i) => {
          const fatti = g && perGiorno.get(g)
          return (
            <span key={i} className="rm-cal-cella">
              {g && (
                <span
                  className={'rm-cal-g' + (fatti ? ' fatto' : '')}
                  style={fatti ? { '--anello': anelloDi(fatti), '--o': ordine.indexOf(g) } : undefined}
                >
                  {g}
                </span>
              )}
            </span>
          )
        })}
      </div>
      {/* Quante volte, scritto a mano quando gli anelli sono tutti disegnati. */}
      <p className="rm-cal-volte">{`${r.allenamenti} ${r.allenamenti === 1 ? 'volta' : 'volte'}!`}</p>
    </div>
  )
}
