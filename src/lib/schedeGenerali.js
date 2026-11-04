
// ---------------------------------------------------------------------------
// Schede Generali: tutte le schede inserite nell'app da QUALSIASI utente,
// trasversali ai profili (come lo Storico Allenamenti ma per le schede stesse).
// Servono per prendere spunto: si può cercare per esercizio e filtrare per
// numero di allenamenti a settimana o durata (settimane) della scheda.
//
// Chi ha un PERSONAL TRAINER trova in cima le schede che lo riguardano: quelle
// scritte dal suo PT e quelle degli altri atleti che lui segue — è lì che c'è
// da prendere spunto davvero. Per tutti gli altri l'ordine resta quello di
// prima (dalla più recente): l'influenza dei PT sui consigli resta leggera.
//
// VISIBILITÀ: creando una scheda si sceglie chi la vede (lib/visibilita). Qui
// compaiono solo le **pubbliche**, più sempre le proprie. Quelle "solo al PT"
// le vede il proprio PT nella sezione Atleti (lib/atletiServer).
//
// Come lo Storico, non legge niente da sola: le schede degli altri arrivano
// dal database già filtrate e ordinate (lib/schedeServer), e qui si fanno le voci.
// ⚠️ Chi ha scritto la scheda è un PT? È un altro atleta del MIO PT? Non lo si
// può dedurre da qui: vorrebbe dire leggere il profilo di uno sconosciuto, e il
// database — giustamente — non lo permette. Le due risposte arrivano insieme
// alle schede (`autoreEPt`, `relazionePt`), calcolate là dove si possono
// calcolare.
// ---------------------------------------------------------------------------

// Nomi degli esercizi (giorni workout), utili per la ricerca.
function nomiEsercizi(scheda) {
  const nomi = []
  for (const g of scheda.giorni) {
    if (g.tipo !== 'workout') continue
    for (const e of g.esercizi) {
      const n = (e.nome || '').trim()
      if (n) nomi.push(n)
    }
  }
  return nomi
}

/** Una voce di Schede Generali: la scheda con l'autore e i campi per filtro/ricerca. */
export function voceSchedaGenerale(v) {
  const { scheda } = v
  const giorniWorkout = scheda.giorni.filter((g) => g.tipo === 'workout')
  const eserciziNomi = nomiEsercizi(scheda)
  return {
    key: `${v.utenteId}:${scheda.id}`,
    utenteId: v.utenteId,
    utenteNome: v.utenteNome,
    autoreEPt: v.autoreEPt,
    relazionePt: v.relazionePt,
    scheda,
    nome: scheda.nome,
    nota: scheda.nota,
    numeroSettimane: scheda.numeroSettimane,
    numAllenamenti: giorniWorkout.length, // allenamenti a settimana
    numEsercizi: eserciziNomi.length,
    eserciziNomi,
    creataIl: scheda.creataIl,
  }
}

