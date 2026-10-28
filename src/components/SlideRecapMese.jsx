import { memo } from 'react'
import CorpoAllenato from './CorpoAllenato'
import { PolaroidMusica } from './ChipMusica'
import { celleDelMese, durataLunga, formattaMigliaia } from '../lib/recapMese'
import { dataLunga } from '../lib/recap'

// ---------------------------------------------------------------------------
// Il contenuto di UNA slide del recap del mese (pages/RecapMesePage). Testo
// vero, con un titolo: lo legge anche uno screen reader. Le animazioni
// (.rm-entra) partono solo sulla slide attuale, e non con "riduci movimento".
// ---------------------------------------------------------------------------

export default memo(SlideRecapMese)

function SlideRecapMese({ id, r, nome, riepilogo = null }) {
  switch (id) {
    case 'intro':
      return (
        <Slide titolo={`Il tuo ${r.nomeMese}`} sopra={nome ? `@${nome}` : ''}>
          <p className="rm-sotto">Com’è andato il mese, in qualche numero.</p>
        </Slide>
      )
    case 'allenamenti':
      return (
        <Slide sopra={`A ${r.nomeMese}`} grande={r.allenamenti} titolo={r.allenamenti === 1 ? 'allenamento fatto' : 'allenamenti fatti'}>
          <Calendario r={r} />
          {r.inPiu && <p className="rm-sotto">{`+${r.inPiu} rispetto a ${r.nomeMesePrima}`}</p>}
        </Slide>
      )
    case 'tempo':
      return (
        <Slide sopra="In palestra" grande={durataLunga(r.durataSec)} titolo="di allenamento">
          {r.piuLungo && (
            <p className="rm-sotto">{`Il più lungo: ${r.piuLungo.nome}, ${dataLunga(r.piuLungo.data)} (${durataLunga(r.piuLungo.durataSec)})`}</p>
          )}
        </Slide>
      )
    case 'volume':
      return (
        <Slide sopra="Sollevati" grande={`${formattaMigliaia(r.volume)} kg`} titolo="in tutto il mese">
          {r.pesoMax && <p className="rm-sotto">{`Il peso più alto: ${r.pesoMax.testo} a ${r.pesoMax.esercizio}`}</p>}
        </Slide>
      )
    case 'muscoli':
      return (
        <Slide sopra="I muscoli del mese" titolo={r.gruppi.slice(0, 3).map((g) => g.label).join(', ')}>
          <CorpoAllenato gruppi={r.gruppi} calore altezza={220} />
        </Slide>
      )
    case 'sforzo': {
      const { verde, giallo, rosso, tot } = r.sforzo
      return (
        <Slide sopra="Lo sforzo" grande={tot} titolo="serie">
          <div className="rm-barra" role="img" aria-label={`${verde} facili, ${giallo} medie, ${rosso} dure`}>
            <span className="rm-verde" style={{ flex: verde }} />
            <span className="rm-giallo" style={{ flex: giallo }} />
            <span className="rm-rosso" style={{ flex: rosso }} />
          </div>
          <p className="rm-sotto">{`${verde} facili · ${giallo} medie · ${rosso} dure`}</p>
          {r.piuDuro && <p className="rm-sotto">{`Il più duro: ${r.piuDuro.nome}, ${dataLunga(r.piuDuro.data)}`}</p>}
        </Slide>
      )
    }
    case 'record':
      return (
        <Slide sopra="Record" grande={r.numRecord} titolo={r.numRecord === 1 ? 'record battuto' : 'record battuti'}>
          <ul className="rm-elenco">
            {r.record.map((x) => (
              <li key={x.esercizio + x.data}>
                <strong>{x.esercizio}</strong> {x.carico}
              </li>
            ))}
          </ul>
        </Slide>
      )
    case 'abitudini': {
      const a = r.abitudini
      return (
        <Slide sopra="Le abitudini" titolo={a.esercizio ? a.esercizio.nome : `Il ${a.giorno}`}>
          {a.esercizio && <p className="rm-sotto">{`L’esercizio più fatto: ${a.esercizio.volte} volte`}</p>}
          <p className="rm-sotto">{`Il giorno preferito: il ${a.giorno}`}</p>
          {a.settimaneDiFila > 1 && <p className="rm-sotto">{`${a.settimaneDiFila} settimane di fila`}</p>}
        </Slide>
      )
    }
    case 'cardio':
      return <Slide sopra="Cardio" grande={r.minutiCardio} titolo="minuti di cardio" />
    case 'canzone':
      return (
        <Slide sopra="La canzone del mese" titolo={r.musica.titolo}>
          <PolaroidMusica musica={r.musica} />
        </Slide>
      )
    case 'riepilogo':
      return (
        <Slide sopra={`Il tuo ${r.nomeMese}`} titolo="Tutto in una card">
          {riepilogo}
        </Slide>
      )
    default:
      return null
  }
}

function Slide({ sopra = '', grande = null, titolo, children }) {
  return (
    <div className="rm-slide-dentro">
      {sopra && <p className="rm-sopra rm-entra">{sopra}</p>}
      {grande != null && <p className="rm-grande rm-entra">{grande}</p>}
      <h2 className="rm-titolo rm-entra">{titolo}</h2>
      <div className="rm-corpo rm-entra">{children}</div>
    </div>
  )
}

function Calendario({ r }) {
  const fatti = new Set(r.giorni)
  return (
    <div className="rm-cal" aria-hidden="true">
      {celleDelMese(r.anno, r.mese).map((g, i) => (
        <span key={i} className={'rm-cal-g' + (g && fatti.has(g) ? ' fatto' : '')} style={{ '--i': i }}>
          {g || ''}
        </span>
      ))}
    </div>
  )
}
