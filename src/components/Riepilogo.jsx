import { useEffect, useMemo, useRef, useState } from 'react'
import { numeroPositivo } from '../lib/recap'
import { routes, esciDallAllenamento, trattieniIndietro } from '../lib/router'
import { IconBack, IconChevron, IconEdit } from './icons'
import RiepilogoDettaglio from './RiepilogoDettaglio'
import EsercizioAllegati, { VisibilitaMedia } from './EsercizioAllegati'
import RecapCondivisibile, { PillolaRecap } from './RecapCondivisibile'
import MediaIntero, { StrisciaAllegati } from './AllegatiRecap'
import Foglio from './Foglio'
import { acceso, eLayoutDefault, normalizzaLayout } from '../lib/recapLayout'
import TastoConferma from './TastoConferma'
import FotoAllenamento from './FotoAllenamento'
import {
  chiaveAllenamento,
  cambiaSfondoAllenamento,
  allineaVisibilitaFotoAllenamento,
  VISIBILITA_FOTO_ALL,
} from '../lib/fotoAllenamento'
import { VISIBILITA, opzioniVisibilita, visibilitaDi } from '../lib/visibilita'
import useStatoModerazione from '../hooks/useStatoModerazione'
import { useAccount } from '../store/AccountContext'
import SceltaMusica from './SceltaMusica'
import PlaylistAllenamento from './PlaylistAllenamento'
import PlaylistRecap from './PlaylistRecap'
import { ascoltiAllenamento, risolviCanzoni } from '../lib/ascolti'
import { normalizzaMusica, normalizzaPlaylist } from '../lib/musica'
import ModificaAllenamento from './ModificaAllenamento'
import { durataSospetta } from '../lib/modificaAllenamento'

// ---------------------------------------------------------------- Riepilogo
// IL RIEPILOGO di un allenamento svolto: lo STESSO a fine allenamento
// (pages/WorkoutSession) e riaprendone uno vecchio dal calendario o dallo
// Storico (pages/AllenamentoSvoltoPage, `vecchio`). Due viste: la CARD da
// condividere (quella che si apre per prima) e il DETTAGLIO serie per serie.
//
// Cosa cambia con `vecchio` (2026-10-20, prima erano due schermate diverse):
//   - in testa la freccia indietro (`onIndietro`), in fondo niente "Riprendi"
//     e "Salva": un allenamento vecchio non si riprende, "Salva le modifiche" compare quando c'è qualcosa da salvare;
//   - "Chi lo vede" è una riga sotto la condivisione (a fine allenamento è
//     l'ultimo passo dopo "Salva", SceltaChiLoVede): le stesse tre voci, in
//     un foglio;
//   - in "Altro" c'è "Correggi" (`correggi`: { occupata, onSalva }, giorno,
//     ora, durata, carichi e pallini — components/ModificaAllenamento), che
//     si apre da solo se la durata è sospetta. A fine allenamento non serve:
//     per sistemare le serie c'è "Riprendi";
//   - uno segnato a mano (`dettagliato` falso, niente serie) non ha la card:
//     nome, una riga che lo dice, chi lo vede, Correggi e Cancella.
export default function Riepilogo({
  vecchio = false,
  onIndietro,
  correggi,
  riep,
  dest,
  giornoLibero,
  onRiprendi,
  onSalvaAllenamento,
  eserciziInScheda,
  onAllegati,
  onElimina,
  schede,
  diete,
  dati,
  utente,
  onSalvaCommento,
  onSalvaNome,
  onSalvaOrologio,
  onSalvaVisibilita,
  onSalvaLayout,
  onSalvaSfondo,
  onSalvaMusica,
  onSalvaPlaylist,
  onSalvaColori,
  ioId,
  // Fatti durante l'allenamento (lib/mediaSessione): lo sfondo già scelto
  // (un file, da salvare col "Salva" come uno scelto qui) e il segnale che gli
  // allegati sono arrivati, per rileggerli.
  sfondoIniziale = null,
  ricaricaFoto = 0,
}) {
  const [vista, setVista] = useState('card')
  const conCard = !vecchio || !!riep?.dettagliato
  const [chiAperto, setChiAperto] = useState(false)
  // Durata sospetta (oltre 4 ore: «Termina» premuto il giorno dopo): la
  // correzione si apre da sola, chi l'ha dimenticato non sa di doverla cercare.
  const [correggiAperto, setCorreggiAperto] = useState(() => !!(vecchio && correggi && durataSospetta(riep)))
  const [fotoAperte, setFotoAperte] = useState(false)
  const [nFoto, setNFoto] = useState(0)
  // Gli allegati sotto la card, e cosa è aperto a tutto schermo (0 = la card).
  const [allegati, setAllegati] = useState([])
  const [urlCard, setUrlCard] = useState(null)
  const [videoCard, setVideoCard] = useState(null)
  const [intero, setIntero] = useState(null)
  const [nomeAperto, setNomeAperto] = useState(false)
  const altroTitolo = [
    vecchio && correggi && 'Correggi',
    eserciziInScheda?.length > 0 && 'Note sugli esercizi',
    giornoLibero && 'Tienilo tra i tuoi',
  ]
    .filter(Boolean)
    .join(' · ')
  // Privata o pubblica per le foto/video degli esercizi aggiunti qui sotto:
  // una volta per tutti, non sotto ognuno.
  const [visibilitaMedia, setVisibilitaMedia] = useState('privata')
  // ⚠️ IL RIEPILOGO È UNA BOZZA (2026-10-20): nome, commento, orologio,
  // card, sfondo e canzone restano qui finché non si preme "Salva". Prima si
  // salvavano da soli a ogni tocco, e tornare indietro teneva tutto senza
  // chiedere niente. Il tasto indietro, con qualcosa da salvare, chiede
  // (`uscita`, lib/router trattieniIndietro). Restano immediati i gesti che
  // sono già una scelta: chi lo vede sui vecchi, tenerlo tra i propri,
  // note e foto degli esercizi, le foto e i video dell'allenamento.
  // Cosa c'è sulla card (lib/recapLayout). Null = la card di sempre.
  const [layout, setLayout] = useState(riep?.recap || null)
  const cambiaLayout = (l) => setLayout(l && !eLayoutDefault(l) ? normalizzaLayout(l) : null)
  // Il nome dell'allenamento. Vuoto non si salva: resta quello di prima.
  const [nome, setNome] = useState(riep?.nomeGiorno || '')
  // La foto di sfondo del recap, la stessa che il feed mette dietro al recap
  // (lib/fotoAllenamento). Quella nuova (`sfondoNuovo`: un blob, o null per
  // toglierla) si carica solo al salvataggio; undefined = non toccata.
  const [sfondoId, setSfondoId] = useState(riep?.sfondo || null)
  const [sfondoNuovo, setSfondoNuovo] = useState(() => sfondoIniziale || undefined)
  // La canzone dell'allenamento (lib/musica).
  const [musica, setMusica] = useState(riep?.musica || null)
  const [musicaAperta, setMusicaAperta] = useState(false)
  // La playlist dell'allenamento (lib/ascolti, solo nell'app Android): i brani
  // ascoltati su QUESTO telefono durante l'allenamento (`ascoltati`, cercati su
  // iTunes) e quelli scelti (`playlist`, la bozza da salvare). Su uno nuovo mai
  // toccato la playlist parte con tutti: si tolgono quelli che non si vogliono.
  const [playlist, setPlaylist] = useState(() => normalizzaPlaylist(riep?.playlist))
  const [ascoltati, setAscoltati] = useState([])
  const [playlistAperta, setPlaylistAperta] = useState(false)
  const fineAll = riep?.data
  const durataAll = riep?.durataSec
  const playlistMaiScelta = riep?.playlist === undefined && (!vecchio || !!riep?.daSalvare)
  useEffect(() => {
    let vivo = true
    ascoltiAllenamento({ data: fineAll, durataSec: durataAll })
      .then((c) => (c.length ? risolviCanzoni(c) : []))
      .then((brani) => {
        if (!vivo || !brani.length) return
        setAscoltati(brani)
        if (playlistMaiScelta) setPlaylist((p) => p ?? { titolo: '', brani })
      })
    return () => {
      vivo = false
    }
  }, [fineAll, durataAll, playlistMaiScelta])
  // La palette dello sfondo, scelta col dado sulla card (lib/recap, paletteFondo).
  const [colori, setColori] = useState(riep?.colori || null)
  // Tenerlo o no (solo per gli allenamenti liberi). Si scrive subito, non al
  // "Salva": chi chiude l'app senza toccare niente ha comunque scelto — di no.
  const [salvato, setSalvato] = useState(() => !!giornoLibero?.salvato)
  const [commento, setCommento] = useState(riep?.nota || '')
  // Chi lo vede. Nasce NASCOSTO (lib/visibilita: chi non sceglie non pubblica)
  // e si sceglie DOPO "Salva", come ultimo passo a schermo intero (2026-10-20):
  // in mezzo al riepilogo tanti non la vedevano e restava quella di partenza.
  const [visibilita, setVisibilita] = useState(() => visibilitaDi(riep))
  const [ultimoPasso, setUltimoPasso] = useState(false)
  // Calorie e battiti copiati dall'orologio: campi di testo finché si scrive,
  // numeri (o null) quando si salvano.
  const [orologio, setOrologio] = useState(() => ({
    calorieReali: riep?.calorieReali ?? '',
    fcMedia: riep?.fcMedia ?? '',
    fcMax: riep?.fcMax ?? '',
  }))

  const orologioNumeri = useMemo(
    () => ({
      calorieReali: numeroPositivo(orologio.calorieReali),
      fcMedia: numeroPositivo(orologio.fcMedia),
      fcMax: numeroPositivo(orologio.fcMax),
    }),
    [orologio],
  )

  // Cosa è cambiato rispetto all'allenamento salvato.
  const nomePulito = nome.trim()
  const diverso = (a, b) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)
  const cambiati = {
    commento: commento !== (riep?.nota || ''),
    nome: !!nomePulito && nomePulito !== (riep?.nomeGiorno || ''),
    orologio: Object.keys(orologioNumeri).some((k) => orologioNumeri[k] !== numeroPositivo(riep?.[k])),
    layout: diverso(layout, riep?.recap),
    musica: diverso(musica, riep?.musica),
    playlist: diverso(playlist, normalizzaPlaylist(riep?.playlist)),
    colori: diverso(colori, riep?.colori),
    sfondo: sfondoNuovo !== undefined && !(sfondoNuovo === null && !sfondoId),
  }
  const modificato = Object.values(cambiati).some(Boolean)

  const salvaTutto = async () => {
    if (cambiati.commento) onSalvaCommento?.(commento)
    if (cambiati.nome) onSalvaNome?.(nomePulito)
    if (cambiati.orologio) onSalvaOrologio?.(orologioNumeri)
    if (cambiati.layout) onSalvaLayout?.(layout)
    if (cambiati.musica) onSalvaMusica?.(musica)
    if (cambiati.playlist) onSalvaPlaylist?.(playlist)
    if (cambiati.colori) onSalvaColori?.(colori)
    if (cambiati.sfondo) {
      setSfondoNuovo(undefined)
      const { id } = await cambiaSfondoAllenamento({
        blob: sfondoNuovo,
        vecchioId: sfondoId,
        userId: ioId,
        chiave: chiaveAllenamento(riep),
      })
      setSfondoId(id)
      onSalvaSfondo?.(id)
    }
  }

  // Indietro con qualcosa da salvare chiede cosa fare. A fine allenamento
  // sempre: finché non si preme "Salva" non è finito. Dall'ultimo passo
  // ("Chi lo vede") indietro torna al riepilogo.
  const [uscita, setUscita] = useState(false)
  // Non ancora salvato: a fine allenamento, o riaperto dal calendario dopo
  // esserne usciti senza "Salva" (`daSalvare`, lib/session). Va come a fine
  // allenamento: "Salva", poi chi lo vede.
  const nuovo = !vecchio || !!riep?.daSalvare
  const daChiedere = nuovo || modificato
  const ultimoPassoRef = useRef(ultimoPasso)
  useEffect(() => {
    ultimoPassoRef.current = ultimoPasso
  }, [ultimoPasso])
  useEffect(() => {
    if (!daChiedere) return undefined
    return trattieniIndietro(() => (ultimoPassoRef.current ? setUltimoPasso(false) : setUscita(true)))
  }, [daChiedere])
  const indietro = () => (daChiedere ? setUscita(true) : onIndietro?.())
  const esciDaQui = () => (vecchio ? onIndietro?.() : esciDallAllenamento(dest || routes.scheda(riep.schedaId)))

  if (ultimoPasso) {
    return (
      <SceltaChiLoVede
        attuale={visibilita}
        chiave={chiaveAllenamento(riep)}
        ioId={ioId}
        onIndietro={() => setUltimoPasso(false)}
        onScelta={(v) => {
          salvaTutto()
          setVisibilita(v)
          onSalvaVisibilita?.(v)
          esciDaQui()
        }}
      />
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        {onIndietro && (
          <button className="icon-btn" onClick={indietro} aria-label="Indietro">
            <IconBack />
          </button>
        )}
        <h1>Riepilogo</h1>
        {conCard && (
          <div className="segmented segmented-sm" role="group" aria-label="Vista">
            <button
              className={'seg-btn' + (vista === 'card' ? ' on' : '')}
              onClick={() => setVista('card')}
              aria-pressed={vista === 'card'}
            >
              Card
            </button>
            <button
              className={'seg-btn' + (vista === 'dettaglio' ? ' on' : '')}
              onClick={() => setVista('dettaglio')}
              aria-pressed={vista === 'dettaglio'}
            >
              Dettaglio
            </button>
          </div>
        )}
      </div>

      {/* Il nome dell'allenamento, a parte: è dell'allenamento (calendario,
          storico), non della card — sulla card è spento di base (lib/recapLayout,
          SPENTI_DI_BASE) e si accende da "Scegli cosa mostrare". */}
      <button className="riep-nome" onClick={() => setNomeAperto(true)} aria-label="Cambia il nome dell’allenamento">
        <span className="riep-nome-testo">{nome.trim() || riep?.nomeGiorno || 'Allenamento'}</span>
        <IconEdit width={16} height={16} />
      </button>
      {nomeAperto && (
        <Foglio
          titolo="Nome dell’allenamento"
          sotto={
            acceso(layout, 'titolo')
              ? 'Lo ritrovi anche in calendario e nello storico.'
              : 'Lo ritrovi in calendario e nello storico. Sulla card non compare: se lo vuoi, accendilo da «Scegli cosa mostrare».'
          }
          onChiudi={() => setNomeAperto(false)}
        >
          <input
            id="recap-nome"
            className="input"
            aria-label="Nome dell’allenamento"
            maxLength={60}
            autoFocus
            value={nome}
            placeholder={riep?.nomeGiorno || 'Allenamento'}
            onChange={(e) => setNome(e.target.value)}
          />
          <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} onClick={() => setNomeAperto(false)}>
            Fatto
          </button>
        </Foglio>
      )}

      {!conCard ? (
        <div className="card">
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.4 }}>
            Segnato come completato a mano: le serie non sono state registrate.
          </p>
        </div>
      ) : vista === 'card' ? (
        <RecapCondivisibile
          riep={riep}
          schede={schede}
          diete={diete}
          dati={dati}
          utente={utente}
          nome={nome}
          commento={commento}
          onCommento={setCommento}
          orologio={orologio}
          onOrologio={(patch) => setOrologio((prev) => ({ ...prev, ...patch }))}
          layout={layout}
          onLayout={cambiaLayout}
          sfondoId={sfondoId}
          utenteId={ioId}
          onSfondo={ioId ? setSfondoNuovo : undefined}
          sfondoNuovo={sfondoNuovo}
          musica={musica}
          onUrlCard={setUrlCard}
          onVideoCard={setVideoCard}
          onApriCard={() => setIntero(0)}
          sottoCard={
            <>
              <StrisciaAllegati allegati={allegati} onApri={(i) => setIntero(urlCard ? i + 1 : i)} />
              <PlaylistRecap playlist={playlist} />
            </>
          }
          colori={colori}
          onColori={setColori}
          pillole={
            <>
              <PillolaRecap piena={nFoto > 0} onClick={() => setFotoAperte(true)}>
                {nFoto > 0 ? `${nFoto} foto e video` : 'Allegati'}
              </PillolaRecap>
              {/* La canzone, o una playlist di Spotify collegata: la polaroid. */}
              <PillolaRecap piena={!!musica} onClick={() => setMusicaAperta(true)}>
                <span className="recap-pill-testo">{normalizzaMusica(musica)?.titolo || 'Musica'}</span>
              </PillolaRecap>
              {/* Le canzoni ascoltate (lib/ascolti): la lista sotto la card. */}
              <PillolaRecap piena={!!playlist} onClick={() => setPlaylistAperta(true)}>
                {playlist ? `Lista Canzoni · ${playlist.brani.length}` : 'Lista Canzoni'}
              </PillolaRecap>
            </>
          }
        />
      ) : null}
      {intero != null && (
        <MediaIntero
          urlCard={urlCard}
          videoCard={videoCard}
          allegati={allegati}
          inizio={intero}
          onChiudi={() => setIntero(null)}
        />
      )}
      {conCard && vista !== 'card' && (
        // Il dettaglio vede subito quello che si sta scrivendo nella card.
        <RiepilogoDettaglio
          riep={{
            ...riep,
            ...orologioNumeri,
            nota: commento,
            nomeGiorno: nome.trim() || riep?.nomeGiorno,
          }}
          schede={schede}
        />
      )}

      {/* Chi lo vede, sui vecchi: subito sotto la condivisione, perché un
          allenamento pubblicato per sbaglio si deve togliere al volo. */}
      {!nuovo && (
        <button className="riep-riga" onClick={() => setChiAperto(true)}>
          <span className="grow">Chi lo vede</span>
          <span className="riep-riga-valore">
            {SCELTE_CHI[visibilita].icona} {SCELTE_CHI[visibilita].nome}
          </span>
          <IconChevron width={16} height={16} />
        </button>
      )}
      {chiAperto && (
        <Foglio titolo="Chi può vederlo?" onChiudi={() => setChiAperto(false)}>
          <OpzioniChiLoVede
            attuale={visibilita}
            chiave={chiaveAllenamento(riep)}
            ioId={ioId}
            onScelta={(v) => {
              setVisibilita(v)
              onSalvaVisibilita?.(v)
              setChiAperto(false)
            }}
          />
        </Foglio>
      )}
      {correggiAperto && (
        <Foglio titolo="Correggi l’allenamento" onChiudi={() => setCorreggiAperto(false)}>
          <ModificaAllenamento
            completamento={riep}
            occupata={correggi.occupata}
            nelFoglio
            onChiudi={() => setCorreggiAperto(false)}
            onSalva={(patch, cambiaData) => {
              setCorreggiAperto(false)
              correggi.onSalva(patch, cambiaData)
            }}
          />
        </Foglio>
      )}

      {/* Le foto e i video di oggi: è ADESSO che si hanno in mano. Nel feed si
          sfogliano col recap, e seguono la visibilità scelta dopo "Salva".
          Dopo si aggiungono riaprendolo dal calendario o dallo Storico. Si aprono dalla pillola
          sotto la card; il foglio chiuso NON si smonta, così una foto che si
          sta caricando non si ferma e la pillola sa quante sono. */}
      <Foglio
        titolo="Foto e video"
        sotto="Si sfogliano di lato dopo la card, nel feed e nel profilo."
        aperto={fotoAperte}
        onChiudi={() => setFotoAperte(false)}
      >
        <FotoAllenamento
          chiave={chiaveAllenamento(riep)}
          sfondo={sfondoId}
          userId={ioId}
          pubblica={visibilita === VISIBILITA.PUBBLICA}
          onNumero={setNFoto}
          onAllegati={setAllegati}
          ricarica={ricaricaFoto}
          nudo
        />
        <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} onClick={() => setFotoAperte(false)}>
          Fatto
        </button>
      </Foglio>

      {/* La canzone dell'allenamento (lib/musica): dalla pillola sotto la card. */}
      {musicaAperta && (
        <Foglio titolo="La canzone dell’allenamento" onChiudi={() => setMusicaAperta(false)}>
          <SceltaMusica valore={musica} onChange={setMusica} nudo onFatto={() => setMusicaAperta(false)} />
        </Foglio>
      )}

      {/* La playlist dell'allenamento (lib/ascolti): dalla sua pillola. */}
      {playlistAperta && (
        <Foglio
          titolo="Lista canzoni"
          sotto="Le canzoni dell’allenamento, in una lista sotto la card. Nel feed si sfoglia di lato."
          onChiudi={() => setPlaylistAperta(false)}
        >
          <PlaylistAllenamento
            ascoltati={ascoltati}
            playlist={playlist}
            onChange={setPlaylist}
            onFatto={() => setPlaylistAperta(false)}
          />
        </Foglio>
      )}

      {/* Quello che serve di rado sta chiuso in una riga: correggerlo (sui
          vecchi), le note degli esercizi e tenerlo (solo i liberi). */}
      {altroTitolo && (
        <details className="riep-altro">
          <summary>
            {altroTitolo}
            <IconChevron width={16} height={16} />
          </summary>
          {vecchio && correggi && (
            <button className="menu-voce" style={{ marginTop: 16 }} onClick={() => setCorreggiAperto(true)}>
              <span className="menu-voce-icona" aria-hidden="true">
                <IconEdit width={18} height={18} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="menu-voce-nome">Correggi l’allenamento</span>
                <span className="menu-voce-desc">Giorno, ora, durata, carichi e pallini</span>
              </span>
              <IconChevron className="faint" />
            </button>
          )}
          {giornoLibero && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="kicker">Questo allenamento</div>
              <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>
                Puoi tenerlo tra i tuoi allenamenti, per ritrovarlo e rifarlo quando vuoi. In
                calendario e nello storico ci resta comunque.
              </p>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button
                  className={'btn grow' + (salvato ? ' btn-accent' : '')}
                  aria-pressed={salvato}
                  onClick={() => {
                    setSalvato(true)
                    onSalvaAllenamento?.(true)
                  }}
                >
                  Salvalo
                </button>
                <button
                  className={'btn grow' + (!salvato ? ' btn-accent' : '')}
                  aria-pressed={!salvato}
                  onClick={() => {
                    setSalvato(false)
                    onSalvaAllenamento?.(false)
                  }}
                >
                  Solo per oggi
                </button>
              </div>
            </div>
          )}

          {eserciziInScheda?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="kicker">Note e foto degli esercizi</div>
              <div className="field" style={{ margin: '10px 0 0' }}>
                <VisibilitaMedia valore={visibilitaMedia} onChange={setVisibilitaMedia} />
              </div>
              <div className="vis-hint" style={{ marginTop: 6 }}>
                {visibilitaMedia === 'privata'
                  ? 'Le foto e i video che aggiungi qui li vedi solo tu.'
                  : 'Le foto e i video che aggiungi qui li vede chi guarda la scheda.'}
              </div>
              {eserciziInScheda.map((e) => (
                <details key={e.id} className="allegati-esercizio">
                  <summary>{e.nome}</summary>
                  <EsercizioAllegati
                    esercizio={e}
                    schedaId={riep.schedaId}
                    onChange={(upd) => onAllegati?.(e.id, upd)}
                    placeholderCommento={`Precisazioni su ${e.nome}…`}
                    visibilitaMedia={visibilitaMedia}
                    onVisibilitaMedia={setVisibilitaMedia}
                  />
                </details>
              ))}
            </div>
          )}
        </details>
      )}

      {/* ⚠️ Un allenamento si puo' buttare via anche subito: una prova, una
          sessione che non conta. Chiede conferma, perche' non si torna
          indietro. Sempre in vista, fuori da "Altro", ma in sordina.
          ⚠️ NON e' il rimedio al "Termina" premuto per sbaglio: per quello
          c'e' "Riprendi", che rimette dentro invece di buttare via. Lo stesso
          tasto c'e' nel calendario e nello Storico. */}
      <TastoConferma
        style={{ marginTop: 16 }}
        etichetta="Cancella questo allenamento"
        domanda="Cancellare questo allenamento? Sparisce dal calendario e dallo storico, e non si torna indietro."
        onConferma={() => onElimina?.()}
      />

      {/* ⚠️ "Riprendi" sta accanto al "Salva", fisso in fondo: chi ha
          sfiorato "Termina" per sbaglio arriva qui spaesato e deve vederlo
          subito, senza scorrere. Sbagliare QUESTO tasto invece non costa
          niente — si preme "Termina" un'altra volta e il riepilogo torna
          identico. */}
      {nuovo && (
        <div className="riep-fondo">
          {onRiprendi && (
            <button className="btn btn-lg grow" onClick={() => onRiprendi(commento)}>
              ↩ Riprendi
            </button>
          )}
          <button className="btn btn-accent btn-lg grow" onClick={() => setUltimoPasso(true)}>
            Salva
          </button>
        </div>
      )}
      {!nuovo && modificato && (
        <div className="riep-fondo">
          <button className="btn btn-accent btn-lg grow" onClick={salvaTutto}>
            Salva le modifiche
          </button>
        </div>
      )}

      {/* Indietro senza aver salvato. */}
      {uscita && (
        <Foglio
          titolo={nuovo ? 'Salvare l’allenamento?' : 'Salvare le modifiche?'}
          sotto={nuovo ? 'Dopo il salvataggio scegli chi può vederlo.' : null}
          onChiudi={() => setUscita(false)}
        >
          <div className="stack" style={{ gap: 8 }}>
            <button
              className="btn btn-accent btn-lg btn-block"
              onClick={() => {
                setUscita(false)
                if (nuovo) return setUltimoPasso(true)
                salvaTutto()
                onIndietro?.()
              }}
            >
              Salva
            </button>
            {nuovo && onRiprendi && (
              <button className="btn btn-block" onClick={() => onRiprendi(commento)}>
                ↩ Riprendi l’allenamento
              </button>
            )}
            {/* Da salvare resta da salvare: l'app lo ricorda (AvvisoDaSalvare)
                e lo si finisce riaprendolo. Per buttarlo c'è "Cancella". */}
            <button className="btn btn-ghost btn-block" onClick={esciDaQui}>
              {nuovo ? 'Salva più tardi' : 'Esci senza salvare'}
            </button>
          </div>
        </Foglio>
      )}
      {/* Lo spazio per i tasti fissi in fondo, che se no coprono "Cancella". */}
      <div style={{ height: daChiedere ? 96 : 20 }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// L'ULTIMO PASSO dell'allenamento (2026-10-20): dopo "Salva", a schermo
// intero, "Chi può vederlo?". Prima la scelta stava in mezzo al riepilogo, e
// tanti la saltavano senza accorgersene: l'allenamento restava com'era nato.
// Qui non si salta: o si sceglie, o si torna al riepilogo.
//
// Nessuna opzione è già accesa, nemmeno quella attuale: va toccata. Chi
// rientra da "Riprendi" vede scritto cosa aveva scelto. Chi chiude l'app
// prima di scegliere resta col default, nascosto (lib/visibilita).
//
// ⚠️ Le foto dell'allenamento seguono la scelta (vedi FotoAllenamento): il
// pannello che di solito le allinea qui non c'è più, quindi si allineano
// da qui, senza aspettare la rete per uscire.
// ---------------------------------------------------------------------------
const SCELTE_CHI = {
  [VISIBILITA.PUBBLICA]: { icona: '🌍', nome: 'Pubblico' },
  [VISIBILITA.SOLO_PT]: { icona: '💼', nome: 'Solo al mio PT' },
  [VISIBILITA.NASCOSTA]: { icona: '🔒', nome: 'Privato' },
}

function SceltaChiLoVede({ attuale, chiave, ioId, onIndietro, onScelta }) {
  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={onIndietro} aria-label="Torna al riepilogo">
          <IconBack />
        </button>
        <h1>Chi può vederlo?</h1>
      </div>
      <p className="muted" style={{ fontSize: 14, margin: '2px 2px 16px', lineHeight: 1.45 }}>
        Ultimo passo: scegli chi vede questo allenamento. Puoi cambiarlo quando vuoi dal calendario.
      </p>
      <OpzioniChiLoVede attuale={attuale} chiave={chiave} ioId={ioId} onScelta={onScelta} />
    </div>
  )
}

// Le tre voci di "Chi può vederlo?": a schermo intero a fine allenamento, in
// un foglio riaprendone uno vecchio. Le stesse, così la scelta si riconosce.
function OpzioniChiLoVede({ attuale, chiave, ioId, onScelta }) {
  const { mioPt } = useAccount()
  const { pubblicazioneBloccata } = useStatoModerazione(ioId)
  const descrizione = {
    [VISIBILITA.PUBBLICA]: 'Lo vedono i tuoi amici e chi guarda il feed, con foto e video.',
    [VISIBILITA.SOLO_PT]: `Lo vede soltanto ${mioPt?.nome || 'il tuo personal trainer'}, nella sua sezione Lavoro.`,
    [VISIBILITA.NASCOSTA]: mioPt ? `Lo vedi solo tu: nemmeno ${mioPt.nome}.` : 'Lo vedi solo tu.',
  }
  const scegli = (v) => {
    const fotoPubbliche = v === VISIBILITA.PUBBLICA && !pubblicazioneBloccata
    allineaVisibilitaFotoAllenamento(
      chiave,
      fotoPubbliche ? VISIBILITA_FOTO_ALL.PUBBLICA : VISIBILITA_FOTO_ALL.PRIVATA,
    ).catch(() => {})
    onScelta(v)
  }

  return (
    <>
      <div className="stack" style={{ gap: 10 }}>
        {opzioniVisibilita(!!mioPt).map((v) => (
          <button key={v} className="menu-voce" onClick={() => scegli(v)}>
            <span className="menu-voce-icona" aria-hidden="true">{SCELTE_CHI[v].icona}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="menu-voce-nome">{SCELTE_CHI[v].nome}</span>
              <span className="menu-voce-desc">{descrizione[v]}</span>
            </span>
            <IconChevron className="faint" />
          </button>
        ))}
      </div>
      {pubblicazioneBloccata && (
        <p className="faint" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.4 }}>
          La pubblicazione nel feed per ora è bloccata: anche scegliendo Pubblico non lo vede nessun altro
          {mioPt ? `, tranne ${mioPt.nome}` : ''}.
        </p>
      )}
      <p className="faint" style={{ fontSize: 12.5, marginTop: 14, lineHeight: 1.4 }}>
        Per ora è: {SCELTE_CHI[attuale].nome}.
      </p>
    </>
  )
}
