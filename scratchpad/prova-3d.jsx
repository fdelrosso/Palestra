// ---------------------------------------------------------------------------
// Le scene 3D del petto ferme in tre momenti del movimento (partenza, metà,
// arrivo), viste di tre quarti e di lato: per controllare a occhio pose,
// attrezzi e manichino senza dover ruotare e fermare il visore.
//
//   npx vite --config scratchpad/vite.prova.config.js
//   → http://localhost:5174/scratchpad/prova-3d.html?nomi=Panca piana bilanciere|Dips alle parallele (petto)
//   `vivo=1&nomi=<uno>` monta il visore vero (quello della pagina Esercizi).
// ---------------------------------------------------------------------------
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { creaScenaPetto } from '../src/lib/petto3d.js'
import { creaUmano } from '../src/lib/umano3d.js'
import { posaPetto } from '../src/lib/posePetto3d.js'
import { ESERCIZI_PETTO_3D } from '../src/lib/pettoCatalogo3d.js'
import EsercizioPetto3D from '../src/components/EsercizioPetto3D.jsx'
import '../src/index.css'

const q = new URLSearchParams(location.search)
const scelti = q.get('nomi') ? q.get('nomi').split('|') : null
const voci = q.get('corpo') ? [{ nome: 'Corpo', corpo: true }] : ESERCIZI_PETTO_3D.filter((e) => !scelti || scelti.includes(e.nome))
const FASI = (q.get('fasi') || '0,0.25,0.5').split(',').map(Number)
const LATO = q.get('lato') !== '0'
const PX = Number(q.get('px') || 200)

let renderer
let stanza
function scatta(e, fase, vista) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(PX * 1.5, PX * 1.5)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
  }
  const scena = new THREE.Scene()
  scena.background = new THREE.Color('#222a33')
  const { modello, aggiorna, bersaglio, camera: pos } = e.corpo ? scenaCorpo() : creaScenaPetto(e)
  aggiorna(fase)
  scena.add(modello)
  if (!stanza) stanza = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scena.environment = stanza
  scena.environmentIntensity = 0.55
  scena.add(new THREE.HemisphereLight('#e2eeff', '#444054', 2.4))
  const luce = new THREE.DirectionalLight('#fff0df', 3.6)
  luce.position.set(-3, 5, -2)
  luce.castShadow = true
  scena.add(luce)
  const bordo = new THREE.DirectionalLight('#b0d2ff', 2)
  bordo.position.set(2, 3, 3)
  scena.add(bordo)
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#2c3540' }))
  piano.rotation.x = -Math.PI / 2
  piano.receiveShadow = true
  scena.add(piano)
  const camera = new THREE.PerspectiveCamera(Number(q.get('fov') || 38), 1, 0.1, 30)
  const t = new THREE.Vector3(...bersaglio)
  const d = new THREE.Vector3(...pos).sub(t).length()
  if (vista === 'lato') camera.position.set(t.x + d, t.y + 0.3, t.z)
  else if (vista === 'fronte') camera.position.set(t.x, t.y + 0.5, t.z - d)
  else camera.position.set(...pos)
  camera.lookAt(t)
  renderer.render(scena, camera)
  return renderer.domElement.toDataURL()
}

// `corpo=1`: solo il corpo, in piedi a braccia lungo i fianchi (la svend press
// a mani basse), per guardare busto, viso e muscoli da vicino.
function scenaCorpo() {
  const u = creaUmano({ principali: ['petto'], secondari: ['tricipiti', 'deltoideAnteriore'] })
  const p = posaPetto({ tipo: 'svend' }, 0.5)
  p.braccia.forEach((b, i) => {
    const l = i ? 1 : -1
    b.gomito = b.spalla.clone().add(new THREE.Vector3(l * 0.08, -0.35, 0.03))
    b.mano = b.gomito.clone().add(new THREE.Vector3(l * 0.03, -0.358, -0.02))
    delete b.palmo
    b.presa = new THREE.Vector3(0, 0, 1)
  })
  return { modello: u.gruppo, aggiorna: () => u.aggiorna(p), bersaglio: [0, Number(q.get('ty') || 1.35), 0], camera: [0.9, 1.6, -2.4] }
}

function Riga({ e }) {
  const ref = useRef(null)
  useEffect(() => {
    const viste = (q.get('viste') || (LATO ? '3/4,lato' : '3/4')).split(',')
    for (const vista of viste) {
      for (const f of FASI) {
        const img = document.createElement('img')
        try {
          img.src = scatta(e, f, vista)
        } catch (err) {
          img.alt = String(err)
        }
        img.width = PX
        img.height = PX
        ref.current.appendChild(img)
      }
    }
  }, [e])
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#fff', font: '700 14px system-ui', padding: '4px 6px' }}>{e.nome}</div>
      <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }} />
    </div>
  )
}

createRoot(document.getElementById('radice')).render(
  q.get('vivo')
    ? <div style={{ padding: 12, maxWidth: 420 }}><EsercizioPetto3D nome={voci[0].nome} /></div>
    : <div style={{ padding: 6 }}>{voci.map((e) => <Riga key={e.nome} e={e} />)}</div>,
)
