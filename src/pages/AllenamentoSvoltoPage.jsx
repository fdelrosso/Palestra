import { useMemo } from 'react'
import { useStore } from '../store/StoreContext'
import { useAccount } from '../store/AccountContext'
import { raccogliCompletamenti } from '../lib/oggi'
import { chiaveAllenamento, eliminaFotoDiAllenamento, spostaFotoAllenamento } from '../lib/fotoAllenamento'
import { spostaInterazioni } from '../lib/interazioni'
import { cancellatiDiRecente, ricordaSpostato } from '../lib/storico'
import { goBack, navigate, routes } from '../lib/router'
import Riepilogo from '../components/Riepilogo'
import { IconBack } from '../components/icons'

// ---------------------------------------------------------------------------
// Un PROPRIO allenamento già svolto, riaperto dal calendario o dallo Storico
// ("I miei"): lo STESSO riepilogo di fine allenamento (components/Riepilogo,
// `vecchio`), a pagina intera. Prima era un modale con tutt'altro ordine
// (components/AzioniAllenamento, tolto il 2026-10-20).
//
// `chiave` = chiaveAllenamento ('<schedaId>|<data ISO>'). Si legge dalle
// proprie schede, la copia LOCALE, quella che si corregge.
//
// ⚠️ Correggere la DATA cambia l'identità dell'allenamento: foto, mi piace e
// commenti ci sono attaccati con la chiave e vanno spostati con lui, e la
// pagina passa all'indirizzo nuovo (sostituendosi: indietro si torna da dove
// si era venuti). Lo Storico se lo ricorda (lib/storico, spostatiDiRecente),
// e così le cancellazioni.
// ---------------------------------------------------------------------------
export default function AllenamentoSvoltoPage({ chiave }) {
  const {
    schede,
    diete,
    aggiornaCompletamento,
    eliminaCompletamento,
    salvaAllenamento,
    aggiornaGiorno,
    aggiornaEsercizio,
  } = useStore()
  const { utenteCorrente } = useAccount()
  const ioId = utenteCorrente?.id || null

  const c = useMemo(() => {
    for (const arr of raccogliCompletamenti(schede).values()) {
      for (const x of arr) if (chiaveAllenamento(x) === chiave) return x
    }
    return null
  }, [schede, chiave])

  if (!c) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => goBack(routes.calendario())} aria-label="Indietro">
            <IconBack />
          </button>
          <h1>Riepilogo</h1>
        </div>
        <div className="empty">
          <div className="big">🗒️</div>
          <p>Questo allenamento non c’è più: forse l’hai cancellato.</p>
        </div>
      </div>
    )
  }

  const scheda = schede.find((s) => s.id === c.schedaId)
  const giorno = scheda?.giorni.find((g) => g.id === c.giornoId) || null
  // Solo gli allenamenti LIBERI si tengono o no (come a fine allenamento).
  const giornoLibero = scheda?.libera ? giorno : null
  // Gli esercizi di quel giorno COME STANNO NELLA SCHEDA, quelli fatti quella
  // volta: note e foto si scrivono lì. Uno tolto dalla scheda dopo non c'è.
  const fatti = new Set((c.esercizi || []).map((e) => e.nome))
  const eserciziInScheda = (giorno?.esercizi || []).filter((e) => fatti.has(e.nome))
  const salva = (patch) => aggiornaCompletamento(c.schedaId, c.data, patch)

  return (
    <Riepilogo
      vecchio
      onIndietro={() => goBack(routes.calendario())}
      riep={c}
      giornoLibero={giornoLibero}
      onSalvaAllenamento={(v) => salvaAllenamento(c.schedaId, c.giornoId, v)}
      eserciziInScheda={eserciziInScheda}
      onAllegati={(id, upd) => aggiornaEsercizio(c.schedaId, c.giornoId, id, { commenti: upd.commenti, media: upd.media })}
      onElimina={() => {
        eliminaCompletamento(c.data, c.schedaId)
        // Le sue foto non devono restare nello Storage appese al niente.
        eliminaFotoDiAllenamento(chiave)
        cancellatiDiRecente.add(c.data)
        goBack(routes.calendario())
      }}
      correggi={{
        // Due allenamenti della stessa scheda finiti nello stesso minuto
        // sarebbero indistinguibili.
        occupata: (data) => (scheda?.completamenti || []).some((x) => x.data === data),
        onSalva: (patch, cambiaData) => {
          salva(patch)
          if (!cambiaData) return
          const nuova = chiaveAllenamento({ schedaId: c.schedaId, data: patch.data })
          spostaFotoAllenamento(ioId, chiave, nuova)
          spostaInterazioni(chiave, nuova)
          ricordaSpostato(c.schedaId, c.data, patch.data)
          navigate(routes.svolto(nuova), { sostituisci: true })
        },
      }}
      ioId={ioId}
      schede={schede}
      diete={diete}
      dati={utenteCorrente?.dati}
      utente={utenteCorrente?.nome || ''}
      onSalvaCommento={(testo) => salva({ nota: testo })}
      onSalvaNome={(nome) => {
        // Come a fine allenamento: il giorno della scheda si rinomina solo se
        // l'allenamento è libero (lì il giorno È questo allenamento).
        salva({ nomeGiorno: nome })
        if (giornoLibero) aggiornaGiorno(c.schedaId, c.giornoId, { nome })
      }}
      onSalvaOrologio={salva}
      onSalvaVisibilita={(v) => salva({ visibilita: v, daSalvare: false })}
      onSalvaLayout={(l) => salva({ recap: l })}
      onSalvaSfondo={(id) => salva({ sfondo: id })}
      onSalvaMusica={(m) => salva({ musica: m })}
      onSalvaPlaylist={(p) => salva({ playlist: p })}
      onSalvaColori={(c) => salva({ colori: c })}
    />
  )
}
