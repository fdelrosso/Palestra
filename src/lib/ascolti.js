// ---------------------------------------------------------------------------
// LA PLAYLIST DELL'ALLENAMENTO (86ª+): le canzoni ascoltate durante
// l'allenamento, solo nell'app Android. Le annota il nativo (AscoltoMusica +
// Ascolti.java) anche a telefono bloccato; qui si leggono quelle della durata
// dell'allenamento e si riassumono: ogni brano una volta, con quante volte è
// partito. Poi si cercano su iTunes (id di Apple e copertina pubblica, come la
// canzone dell'allenamento) e diventano `Completamento.playlist`, da scorrere
// sotto la card (components/PlaylistRecap) e scegliere nel riepilogo
// (components/PlaylistAllenamento).
// ⚠️ Un'app installata prima della versione 3 non ha `Musica.ascolti`: la
// chiamata fallisce e la playlist semplicemente non c'è.
// ---------------------------------------------------------------------------

import { Capacitor, registerPlugin } from '@capacitor/core'
import { canzoniDelloStessoAlbum, canzoniDiArtista, cercaArtisti, cercaCanzoni, normalizzaBrano, normalizzaPlaylist, semplifica } from './musica.js'

// Quanto deve suonare un brano per contare: un brano saltato non è ascoltato.
export const SOGLIA_ASCOLTO_MS = 40 * 1000

// Margine attorno all'allenamento: la musica si fa partire un attimo prima.
const MARGINE_MS = 5 * 60 * 1000

const Musica = registerPlugin('Musica')

/** Da quando a quando cercare: `data` è la fine (ISO), `durataSec` quanto è durato. */
export function finestraAllenamento(riep) {
  const fine = Date.parse(riep?.data || '')
  if (!Number.isFinite(fine)) return null
  const inizio = fine - (Number(riep?.durataSec) || 0) * 1000
  return { da: inizio - MARGINE_MS, a: fine + MARGINE_MS }
}

/**
 * Ogni brano una volta, nell'ordine in cui è partito la prima volta.
 * @param {{titolo:string, artista?:string, copertina?:string, inizio:number, ms:number}[]} righe
 * @returns {{chiave:string, titolo:string, artista:string, copertina:string|null, volte:number, inizio:number, ms:number}[]}
 */
export function riassumiAscolti(righe = [], soglia = SOGLIA_ASCOLTO_MS) {
  const per = new Map()
  for (const r of [...righe].sort((a, b) => a.inizio - b.inizio)) {
    if (!r?.titolo || (r.ms || 0) < soglia) continue
    const chiave = `${r.titolo}|${r.artista || ''}`
    const c = per.get(chiave)
    if (c) {
      c.volte++
      c.ms += r.ms || 0
      c.copertina ||= r.copertina || null
    } else {
      per.set(chiave, {
        chiave,
        titolo: r.titolo,
        artista: r.artista || '',
        copertina: r.copertina || null,
        volte: 1,
        inizio: r.inizio,
        ms: r.ms || 0,
      })
    }
  }
  return [...per.values()]
}

/** Le canzoni dell'allenamento, già riassunte; [] fuori dall'app o con un'app vecchia. */
export async function ascoltiAllenamento(riep) {
  const f = finestraAllenamento(riep)
  if (!f || !Capacitor.isPluginAvailable('Musica')) return []
  try {
    const { ascolti } = await Musica.ascolti(f)
    return riassumiAscolti(ascolti)
  } catch {
    return []
  }
}

// Il titolo senza quello che le app aggiungono ("- Remastered 2009",
// "(feat. X)", "[Live]"): con quei pezzi iTunes spesso non la trova.
export function titoloPulito(t) {
  return String(t || '')
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim()
}

// Il titolo senza punteggiatura: l'app che suona scrive "Un'altra" e iTunes
// "Un’altra", o "Ciao!" e "Ciao".
const soloLettere = (t) =>
  semplifica(t)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

// Apple scrive alcuni titoli censurati ("Non fare la p*****a"): uguali
// lettera per lettera, dove non c'è un asterisco.
function censurato(ascoltato, apple) {
  const a = semplifica(titoloPulito(ascoltato))
  const b = semplifica(titoloPulito(apple))
  return b.includes('*') && a.length === b.length && [...b].every((ch, i) => ch === '*' || ch === a[i])
}

/**
 * Fra i risultati di iTunes, quello che è DAVVERO il brano ascoltato: stesso
 * titolo (ripulito) e l'artista che si somiglia. Null se nessuno: meglio
 * senza id che con quello di un'altra canzone.
 */
export function abbina(canzone, risultati = []) {
  const t = soloLettere(titoloPulito(canzone.titolo))
  const a = semplifica(canzone.artista).split(/[,&]/)[0].trim()
  return (
    risultati.find((r) => {
      if (soloLettere(titoloPulito(r.titolo)) !== t && !censurato(canzone.titolo, r.titolo)) return false
      const ra = semplifica(r.artista)
      return !a || ra.includes(a) || a.includes(ra)
    }) || null
  )
}

// v2: dalla 112ª si cerca anche nell'elenco dell'artista, e i "non trovati"
// della v1 vanno ricercati.
const CHIAVE_ITUNES = 'palestra:itunes-brani:v2'

function memoria() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_ITUNES) || '{}')
  } catch {
    return {}
  }
}

/**
 * Le canzoni (da riassumiAscolti) come brani della playlist (lib/musica,
 * normalizzaBrano): id e copertina da iTunes, titolo e artista quelli che si
 * sono ascoltati. Una ricerca alla volta, e le risposte restano sul telefono:
 * iTunes regge una ventina di richieste al minuto. Senza rete o senza
 * risultato il brano resta, senza id né copertina.
 */
export async function risolviCanzoni(canzoni) {
  return (await risolvi(canzoni)).brani
}

// `riprova`: anche i brani già cercati e non trovati (in memoria come null).
// `fermo`: iTunes non ha risposto, i restanti non si sono cercati.
async function risolvi(canzoni, riprova = false) {
  const mem = memoria()
  const fuori = []
  // Al primo errore (niente rete, o iTunes che dice basta: una playlist
  // importata può avere 60 brani) non si chiede più: i restanti restano
  // senza copertina, e non si ricorda niente, così la prossima volta si riprova.
  let fermo = false
  // ⚠️ Prima l'ELENCO DELL'ARTISTA (fino a 200 brani, due richieste per
  // artista per tutta la playlist), poi la ricerca: la ricerca di Apple non
  // trova tutto. Gli album di "Mr. Simpatia" di Fabri Fibra (2004) non
  // escono con nessuna parola, ma nel suo elenco ci sono (come in
  // SceltaMusica, per la canzone dell'allenamento).
  const elenchi = new Map() // artista → Promise<brani>
  const elencoDi = (artista) => {
    const nome = String(artista || '').split(/[,&]/)[0].trim()
    if (!elenchi.has(nome)) {
      elenchi.set(
        nome,
        cercaArtisti(nome).then((trovati) => {
          const a = trovati.find((x) => semplifica(x.nome) === semplifica(nome))
          return a ? canzoniDiArtista(a.id) : []
        }),
      )
    }
    return elenchi.get(nome)
  }
  const cercate = []
  for (const c of canzoni) {
    if (!fermo && (!(c.chiave in mem) || (riprova && !mem[c.chiave]))) {
      cercate.push(c)
      try {
        const r =
          (c.artista && abbina(c, await elencoDi(c.artista))) ||
          abbina(c, await cercaCanzoni(`${titoloPulito(c.titolo)} ${c.artista}`, { limite: 10 }))
        mem[c.chiave] = r ? { id: r.id, copertina: r.copertina } : null
      } catch {
        fermo = true
      }
    }
  }
  // Quelle ancora senza: negli album di quelle trovate, al massimo tre
  // (`visti`: i brani degli album già guardati, per non richiederli).
  const visti = new Set()
  let album = 0
  for (const c of cercate) {
    if (fermo || album >= 3 || !cercate.some((x) => !mem[x.chiave])) break
    const id = mem[c.chiave]?.id
    if (!id || visti.has(id)) continue
    try {
      const tracce = await canzoniDelloStessoAlbum(id)
      album++
      for (const t of tracce) visti.add(t.id)
      for (const x of cercate) {
        const r = !mem[x.chiave] && abbina(x, tracce)
        if (r) mem[x.chiave] = { id: r.id, copertina: r.copertina }
      }
    } catch {
      fermo = true
    }
  }
  for (const c of canzoni) {
    const trovato = mem[c.chiave]
    fuori.push(normalizzaBrano({ ...trovato, titolo: c.titolo, artista: c.artista, volte: c.volte }))
  }
  try {
    localStorage.setItem(CHIAVE_ITUNES, JSON.stringify(mem))
  } catch {
    // Senza memoria si richiede ogni volta: più lento, non sbagliato.
  }
  return { brani: fuori.filter(Boolean), fermo }
}

/**
 * La playlist salvata coi brani rimasti senza id ricercati adesso: a fine
 * allenamento iTunes può non rispondere (in palestra spesso senza rete), e
 * senza id non c'è copertina, anteprima né Apple Music. `playlist` null se
 * non è cambiato niente; `trovati` su `cercati`; `fermo` se iTunes non
 * risponde. `riprova` (il bottone nel foglio della playlist): anche quelli
 * già cercati e non trovati.
 */
export async function completaPlaylist(playlist, { riprova = false } = {}) {
  const p = normalizzaPlaylist(playlist)
  const senza = p?.brani.filter((b) => !b.id) || []
  if (!senza.length) return { playlist: null, trovati: 0, cercati: 0, fermo: false }
  const chiave = (b) => `${b.titolo}|${b.artista}`
  const { brani, fermo } = await risolvi(
    senza.map((b) => ({ ...b, chiave: chiave(b) })),
    riprova,
  )
  const per = new Map(brani.filter((b) => b.id).map((b) => [chiave(b), b]))
  return {
    playlist: per.size ? { ...p, brani: p.brani.map((b) => (b.id ? b : per.get(chiave(b)) || b)) } : null,
    trovati: per.size,
    cercati: senza.length,
    fermo,
  }
}
