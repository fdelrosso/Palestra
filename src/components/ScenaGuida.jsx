import CorpoAllenato from './CorpoAllenato'

// ---------------------------------------------------------------------------
// Le SCENE delle mini-guide (lib/guide, `scena`): un pezzo d'app in piccolo
// che si muove da solo, per le cose che dalla Guida non si possono aprire
// davvero — un allenamento in corso (aprirlo lo comincerebbe), il recap
// appena fatto, la correzione di un allenamento.
//
// Solo forme e CSS (index.css, .scena-*), come gli schermi finti del
// Benvenuto: ogni scena è un'animazione in giro continuo che mostra il gesto
// (il tocco sul tasto, il pallino che si colora, il recupero che parte).
// Il corpo del recap è quello vero (components/CorpoAllenato).
// Con "riduci movimento" restano ferme sul fotogramma finale.
// ---------------------------------------------------------------------------

const GIORNO = [
  { id: 'petto', serie: 9 },
  { id: 'tricipiti', serie: 6 },
  { id: 'spalle', serie: 3 },
]

function Pista() {
  return (
    <div className="scena scena-pista">
      <span className="scena-freccia">‹</span>
      <div className="scena-finestra">
        <div className="scena-nastro">
          {['Panca piana', 'Croci ai cavi', 'Push down'].map((nome, i) => (
            <div key={nome} className="scena-esercizio">
              <strong>{nome}</strong>
              <small>{['4 × 8 · 70 kg', '3 × 12 · 14 kg', '3 × 12 · 25 kg'][i]}</small>
              <span className="scena-consiglio">Consiglio: {['72,5', '14', '27,5'][i]} kg</span>
            </div>
          ))}
        </div>
      </div>
      <span className="scena-freccia">›</span>
    </div>
  )
}

function Sforzo() {
  return (
    <div className="scena scena-sforzo">
      <div className="scena-pallini">
        <span className="fatto verde" />
        <span className="fatto giallo" />
        <span className="ora" />
        <span />
      </div>
      <div className="scena-tasti">
        <span className="verde">avevo margine</span>
        <span className="giallo">giusto così</span>
        <span className="rosso">al limite</span>
      </div>
      <div className="scena-recupero">
        <span className="scena-anello" />
        Recupero <b>1:30</b>
      </div>
    </div>
  )
}

function Termina() {
  return (
    <div className="scena scena-termina">
      <span className="scena-tasto">Termina</span>
      <span className="scena-va">→</span>
      <div className="scena-mini-recap">
        <CorpoAllenato gruppi={GIORNO} altezza={58} viste={['fronte']} />
        <span>Riepilogo</span>
      </div>
    </div>
  )
}

function RecapCard() {
  return (
    <div className="scena scena-recap">
      <div className="scena-card">
        <div className="scena-corpo">
          <CorpoAllenato gruppi={GIORNO} altezza={88} />
        </div>
        <div className="scena-dati">
          <strong>Push del giovedì</strong>
          <small>1 h 05 · 18 serie</small>
          <div className="scena-pillole">
            <span className="p1">+ Commento</span>
            <span className="p2">+ Calorie</span>
            <span className="p3">+ Sfondo</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecapModifica() {
  return (
    <div className="scena scena-modifica">
      <div className="scena-voci">
        {['Muscoli', 'Esercizi', 'Durata', 'Calorie'].map((v, i) => (
          <span key={v} className={'scena-voce v' + i}>
            <i />
            {v}
          </span>
        ))}
      </div>
      <div className="scena-anteprima">
        <span className="a0" />
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
    </div>
  )
}

function ChiVede() {
  return (
    <div className="scena scena-chi">
      {[
        ['🌍', 'Pubblico'],
        ['💼', 'Solo al mio PT'],
        ['🔒', 'Privato'],
      ].map(([icona, nome], i) => (
        <span key={nome} className={'scena-scelta s' + i}>
          <span aria-hidden="true">{icona}</span> {nome}
        </span>
      ))}
    </div>
  )
}

function Correggi() {
  return (
    <div className="scena scena-correggi">
      <div className="scena-campo">
        <small>Durata</small>
        <span className="scena-cambia">
          <span className="prima">3 h 12</span>
          <span className="dopo">1 h 10</span>
        </span>
      </div>
      <div className="scena-campo">
        <small>Panca piana</small>
        <span className="scena-cambia">
          <span className="prima">60 kg</span>
          <span className="dopo">65 kg</span>
        </span>
      </div>
      <span className="scena-salva">Salva le modifiche</span>
    </div>
  )
}

const SCENE = {
  pista: Pista,
  sforzo: Sforzo,
  termina: Termina,
  'recap-card': RecapCard,
  'recap-modifica': RecapModifica,
  'chi-vede': ChiVede,
  correggi: Correggi,
}

export default function ScenaGuida({ scena }) {
  const Scena = SCENE[scena]
  return Scena ? (
    <div aria-hidden="true">
      <Scena />
    </div>
  ) : null
}
