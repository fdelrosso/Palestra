import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { palestreNelRiquadro, palestrePerZona, ZOOM_PIN } from '../lib/palestre'
import italiaMaschera from '../data/italiaMaschera.json'

// ---------------------------------------------------------------------------
// La mappa di Cerca → Palestre: si gira, si avvicina, si tocca un pallino e
// si sceglie quella palestra (`onScegli`). MapLibre entra solo qui, e questo
// file lo carica PalestreCerca con lazy(): chi non apre la mappa non lo
// scarica (e vite.config lo tiene fuori dal precache del service worker).
//
// Da lontano le palestre sono BOLLE per zona, col numero: una per regione,
// avvicinandosi una per provincia, poi una per comune (LIVELLI). Toccandone
// una si entra nella zona, almeno fino al livello dopo. Da vicino
// (ZOOM_SINGOLE) arrivano le palestre una per una. Le bolle le fa il database
// (`palestre_per_zona`): poche righe a ogni spostamento, e ogni zona contata
// intera, cosi' spostando la mappa i numeri non cambiano.
//
// La mappa sta sull'Italia (ITALIA_LIMITI): non si va oltre, ne' spostandola
// ne' allontanandosi. Tutto il resto, da lontano, e' coperto di grigio
// (data/italiaMaschera.json, da scratchpad/italia-maschera.py).
//
// ⚠️ La mappa di fondo e' di OpenFreeMap: niente account, niente chiave,
// niente tetto, e non pesa sull'egress di Supabase. CARTO (la prima scelta)
// chiede ormai una chiave; i server di openstreetmap.org vietano le app con
// molto traffico senza permesso.
// Lo stile e' "liberty" anche col tema nero dell'app: "dark" e "fiord" sono
// grigi piatti dove mare e terra quasi non si distinguono, e le bolle rosse
// si leggono meglio sui colori veri.
// ---------------------------------------------------------------------------

const STILE = 'https://tiles.openfreemap.org/styles/liberty'
const LINEA_CONFINI = '#4b5b6b'
const GRIGIO_FUORI = '#4a5058'
const CREDITI_PALESTRE = 'Palestre: OpenStreetMap, Overture Maps, ISTAT'
// [ovest, sud], [est, nord]: l'Italia con un po' di mare intorno.
const ITALIA = [
  [6.3, 35.3],
  [18.9, 47.2],
]
const ITALIA_LIMITI = [
  [4.5, 34.0],
  [20.5, 48.3],
]
// Da che zoom vale ogni livello; da ZOOM_SINGOLE le palestre una per una.
const LIVELLI = [
  { livello: 'regione', da: 0 },
  { livello: 'provincia', da: 6 },
  { livello: 'comune', da: 8 },
]
// A 12 un telefono vede ~15-20 km: le palestre intorno, una per una (nel
// centro di Milano sono ~90, sotto il TETTO).
const ZOOM_SINGOLE = 12
const TETTO = 300
const ROSSO = '#e4572e'
// Le bolle dei comuni vicini si fondono (vedi fondiVicini); regioni e
// province no: una bolla deve voler dire QUELLA regione.
const VICINI_PX = 34

const livelloPer = (zoom) => [...LIVELLI].reverse().find((l) => zoom >= l.da).livello
// Lo zoom da cui comincia il livello dopo quello di `zoom`.
const zoomDopo = (zoom) => LIVELLI.find((l) => l.da > zoom)?.da ?? ZOOM_SINGOLE

// Due comuni vicini possono avere il punto medio quasi nello stesso posto, e i
// cerchi si coprono. Qui si fondono quelli a meno di VICINI_PX sullo schermo
// (il cerchio piu' grande, bordo compreso, e' ~33 px): i piu' grandi assorbono
// i vicini, sommando il numero e allargando il riquadro, cosi' il tocco porta
// ancora a tutte.
function fondiVicini(gruppi, proietta) {
  const tenuti = []
  for (const g of [...gruppi].sort((a, b) => b.quante - a.quante)) {
    const p = proietta(g)
    const vicino = tenuti.find((t) => Math.hypot(t.x - p.x, t.y - p.y) < VICINI_PX)
    if (!vicino) {
      tenuti.push({ ...g, ...p })
      continue
    }
    const tot = vicino.quante + g.quante
    vicino.lat = (vicino.lat * vicino.quante + g.lat * g.quante) / tot
    vicino.lon = (vicino.lon * vicino.quante + g.lon * g.quante) / tot
    vicino.quante = tot
    vicino.palestra = null
    vicino.riquadro = {
      sud: Math.min(vicino.riquadro.sud, g.riquadro.sud),
      ovest: Math.min(vicino.riquadro.ovest, g.riquadro.ovest),
      nord: Math.max(vicino.riquadro.nord, g.riquadro.nord),
      est: Math.max(vicino.riquadro.est, g.riquadro.est),
    }
  }
  return tenuti
}

// Ogni elemento e' un gruppo ({quante, lat, lon, riquadro}) o una palestra
// sola ({palestra}): lo stesso strato li disegna tutti e due. Dai piu' grandi
// ai piu' piccoli: MapLibre disegna in ordine, e cosi' una bolla piccola resta
// sopra una grande che le sta addosso (il Molise sopra la Campania).
// La palestra cercata (`evidenziataId`) va per ultima, cioe' sopra le vicine.
const geojson = (elementi, miaId, evidenziataId) => ({
  type: 'FeatureCollection',
  features: elementi
    .map((e, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        i,
        quante: e.quante,
        mia: e.palestra?.id === miaId,
        evidenziata: !!evidenziataId && e.palestra?.id === evidenziataId,
        nome: e.palestra?.nome || '',
      },
    }))
    .sort((a, b) => b.properties.quante - a.properties.quante || a.properties.evidenziata - b.properties.evidenziata),
})

export default function MappaPalestre({ centro, miaId, evidenziataId = null, onScegli }) {
  const contenitore = useRef(null)
  const mappa = useRef(null)
  // MapLibre chiama i suoi ascoltatori da fuori React: leggono questi.
  const scegli = useRef(onScegli)
  const mia = useRef(miaId)
  const evidenziata = useRef(evidenziataId)
  const ultimi = useRef([])
  // 'carico' | 'ok' | 'troppe' | 'errore'
  const [stato, setStato] = useState('carico')

  useEffect(() => {
    scegli.current = onScegli
  }, [onScegli])

  useEffect(() => {
    const accento = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0a72ad'
    const m = new maplibregl.Map({
      container: contenitore.current,
      style: STILE,
      bounds: ITALIA,
      maxBounds: ITALIA_LIMITI,
      attributionControl: { compact: true, customAttribution: CREDITI_PALESTRE },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')

    // Ogni giro ha il suo numero: una risposta arrivata dopo che la mappa si
    // e' gia' spostata di nuovo si butta.
    let giro = 0
    let attesa
    // L'ultima domanda fatta: se spostandosi resta uguale non si richiede
    // niente. Le regioni si chiedono sempre per tutta l'Italia, quindi una
    // volta sola finche' si resta a quello zoom.
    let chiesta = ''
    const disegna = () => m.getSource('palestre')?.setData(geojson(ultimi.current, mia.current, evidenziata.current))
    const carica = () => {
      clearTimeout(attesa)
      attesa = setTimeout(async () => {
        const zoom = m.getZoom()
        const b = m.getBounds()
        const vista = { sud: b.getSouth(), ovest: b.getWest(), nord: b.getNorth(), est: b.getEast() }
        const livello = zoom >= ZOOM_SINGOLE ? null : livelloPer(zoom)
        const riquadro =
          livello === 'regione'
            ? { sud: ITALIA[0][1], ovest: ITALIA[0][0], nord: ITALIA[1][1], est: ITALIA[1][0] }
            : vista
        const chiave = JSON.stringify([livello, riquadro])
        if (chiave === chiesta) return
        chiesta = chiave
        const n = ++giro
        setStato('carico')
        let elementi
        let pieno = false
        if (!livello) {
          const r = await palestreNelRiquadro(riquadro)
          if (n !== giro) return
          if (!r.ok) {
            chiesta = ''
            return setStato('errore')
          }
          elementi = r.palestre.map((p) => ({ quante: 1, lat: p.lat, lon: p.lon, palestra: p }))
          pieno = r.palestre.length >= TETTO
        } else {
          const r = await palestrePerZona(livello, riquadro)
          if (n !== giro) return
          if (!r.ok) {
            chiesta = ''
            return setStato('errore')
          }
          elementi = livello === 'comune' ? fondiVicini(r.gruppi, (g) => m.project([g.lon, g.lat])) : r.gruppi
        }
        ultimi.current = elementi
        disegna()
        setStato(pieno ? 'troppe' : 'ok')
      }, 250)
    }

    m.on('load', () => {
      // I crediti "compatti" MapLibre li apre comunque all'avvio, e su un
      // telefono coprono il fondo della mappa: si parte chiusi, dietro la (i).
      contenitore.current
        ?.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
        ?.classList.remove('maplibregl-compact-show')
      // Fuori dall'Italia, grigio. Svanisce avvicinandosi: i confini della
      // maschera sono quelli ISTAT semplificati, e da vicino non
      // coinciderebbero con la costa vera (mezzo porto di Genova grigio).
      m.addSource('fuori-italia', { type: 'geojson', data: italiaMaschera })
      m.addLayer({
        id: 'fuori-italia',
        type: 'fill',
        source: 'fuori-italia',
        paint: {
          'fill-color': GRIGIO_FUORI,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.7, 10, 0],
        },
      })
      // I confini delle regioni sempre, quelli delle province da quando le
      // bolle sono per provincia: cosi' si vede di chi e' ogni bolla. Le linee
      // vengono dalle tessere stesse (strato `boundary` di OpenMapTiles:
      // admin_level 4 le regioni, 6 le province), niente dati in piu'.
      // ⚠️ Le tessere di OpenFreeMap hanno le province solo da zoom 9: fra 7
      // e 9 le bolle sono per provincia ma le linee non ci sono ancora.
      for (const [id, livello, da, spessore] of [
        ['confini-regioni', 4, 0, 1.4],
        ['confini-province', 6, LIVELLI[1].da, 0.8],
      ]) {
        m.addLayer({
          id,
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'boundary',
          minzoom: da,
          filter: ['all', ['==', ['get', 'admin_level'], livello], ['!=', ['get', 'maritime'], 1]],
          paint: { 'line-color': LINEA_CONFINI, 'line-width': spessore, 'line-opacity': 0.7 },
        })
      }
      m.addSource('palestre', { type: 'geojson', data: geojson([], null) })
      m.addLayer({
        id: 'gruppi',
        type: 'circle',
        source: 'palestre',
        filter: ['>', ['get', 'quante'], 1],
        paint: {
          'circle-radius': ['step', ['get', 'quante'], 10, 10, 12, 100, 15],
          'circle-color': ROSSO,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
        },
      })
      m.addLayer({
        id: 'gruppi-numero',
        type: 'symbol',
        source: 'palestre',
        filter: ['>', ['get', 'quante'], 1],
        layout: {
          'text-field': ['to-string', ['get', 'quante']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#fff' },
      })
      // La palestra cercata: un alone sotto, il pallino piu' grande e il nome
      // sotto, sempre, anche sopra le scritte della mappa.
      m.addLayer({
        id: 'palestra-alone',
        type: 'circle',
        source: 'palestre',
        filter: ['all', ['==', ['get', 'quante'], 1], ['get', 'evidenziata']],
        paint: { 'circle-radius': 22, 'circle-color': accento, 'circle-opacity': 0.25 },
      })
      m.addLayer({
        id: 'palestre',
        type: 'circle',
        source: 'palestre',
        filter: ['==', ['get', 'quante'], 1],
        paint: {
          'circle-radius': ['case', ['get', 'evidenziata'], 11, ['get', 'mia'], 10, 8],
          'circle-color': ['case', ['get', 'mia'], accento, ROSSO],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })
      m.addLayer({
        id: 'palestra-nome',
        type: 'symbol',
        source: 'palestre',
        filter: ['all', ['==', ['get', 'quante'], 1], ['get', 'evidenziata']],
        layout: {
          'text-field': ['get', 'nome'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-max-width': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#1d2733', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      })
      m.on('click', 'palestre', (e) => {
        const p = ultimi.current[e.features?.[0]?.properties?.i]?.palestra
        if (p) scegli.current(p)
      })
      // Una bolla: si entra nel riquadro delle sue palestre, e almeno fino al
      // livello dopo (le palestre di Milano stanno in una vista a zoom 10,5,
      // che e' ancora "comune": senza, il tocco ridarebbe la stessa bolla).
      m.on('click', 'gruppi', (e) => {
        const g = ultimi.current[e.features?.[0]?.properties?.i]
        if (!g?.riquadro) return
        const { sud, ovest, nord, est } = g.riquadro
        const dentro = m.cameraForBounds(
          [
            [ovest, sud],
            [est, nord],
          ],
          { padding: 60 },
        )
        const minimo = zoomDopo(m.getZoom())
        if (!dentro || dentro.zoom < minimo) m.easeTo({ center: [g.lon, g.lat], zoom: minimo })
        else m.easeTo({ ...dentro, zoom: Math.min(dentro.zoom, ZOOM_SINGOLE + 3) })
      })
      for (const strato of ['palestre', 'gruppi']) {
        m.on('mouseenter', strato, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', strato, () => (m.getCanvas().style.cursor = ''))
      }
      m.on('moveend', carica)
      carica()
    })
    m.ridisegna = disegna
    mappa.current = m
    return () => {
      clearTimeout(attesa)
      giro++
      m.remove()
      mappa.current = null
    }
  }, [])

  // Cambiata la mia (scelta da qui o tolta) o quella cercata: i pallini si
  // ridisegnano.
  useEffect(() => {
    mia.current = miaId
    evidenziata.current = evidenziataId
    mappa.current?.ridisegna()
  }, [miaId, evidenziataId])

  // Il centro che c'e' gia' aprendo la mappa (la mia palestra) si prende e
  // basta; quelli dopo (una palestra cercata, "Vicino a me") ci si vola dalla
  // vista di prima, cosi' si vede dove sta. Ci si ferma a ZOOM_SINGOLE, il
  // primo zoom dove le palestre sono pallini (e si vedono quelle intorno);
  // chi e' gia' piu' vicino resta a quello zoom. ⚠️ Anche aprendola SENZA centro
  // (nessuna palestra mia) il prossimo e' "dopo": se no il primo cercato salta.
  const giaCentrata = useRef(false)
  useEffect(() => {
    const m = mappa.current
    if (!m) return
    if (!centro) {
      giaCentrata.current = true
      return
    }
    const dove = { center: [centro.lon, centro.lat], zoom: Math.max(m.getZoom(), ZOOM_SINGOLE) }
    if (giaCentrata.current) m.flyTo({ ...dove, duration: 2000, essential: true })
    else m.jumpTo(dove)
    giaCentrata.current = true
  }, [centro])

  const avviso = {
    carico: '',
    ok: '',
    troppe: `Qui ce ne sono più di ${TETTO}: avvicinati per vederle tutte`,
    errore: 'Palestre non caricate. Sposta la mappa per riprovare.',
  }[stato]

  return (
    <div className="mappa-palestre">
      <div ref={contenitore} className="mappa-palestre-tela" role="region" aria-label="Mappa delle palestre" />
      {avviso && <div className="mappa-palestre-avviso">{avviso}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// La mappa del PIN di "Aggiungi" (components/AggiungiPalestra): non si tocca
// un punto, si sposta la mappa sotto il mirino fisso al centro, che è più
// preciso col dito. `centro` la porta su un indirizzo cercato; `onSposta`
// dice ogni volta dov'è il mirino e a che zoom.
// ---------------------------------------------------------------------------

export function MappaPin({ centro, onSposta }) {
  const contenitore = useRef(null)
  const mappa = useRef(null)
  const sposta = useRef(onSposta)

  useEffect(() => {
    sposta.current = onSposta
  }, [onSposta])

  useEffect(() => {
    const m = new maplibregl.Map({
      container: contenitore.current,
      style: STILE,
      bounds: ITALIA,
      maxBounds: ITALIA_LIMITI,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    const dimmi = () => {
      const c = m.getCenter()
      sposta.current({ lat: c.lat, lon: c.lng, zoom: m.getZoom() })
    }
    m.on('moveend', dimmi)
    mappa.current = m
    return () => {
      m.remove()
      mappa.current = null
    }
  }, [])

  useEffect(() => {
    const m = mappa.current
    if (m && centro) m.jumpTo({ center: [centro.lon, centro.lat], zoom: Math.max(m.getZoom(), ZOOM_PIN + 1) })
  }, [centro])

  return (
    <div className="mappa-palestre">
      <div ref={contenitore} className="mappa-palestre-tela mappa-pin-tela" role="region" aria-label="Mappa: sposta la palestra sotto il mirino" />
      <div className="mappa-pin-mirino" aria-hidden="true" />
    </div>
  )
}
