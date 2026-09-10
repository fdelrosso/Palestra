import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import EsercizioAnimato from './EsercizioAnimato'

export default function VisoreEsercizio3D({ nome, gruppo, esercizio, creaScena, muscoli }) {
  const contenitore = useRef(null)
  const api = useRef(null)
  const [inPausa, setInPausa] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const pausa = useRef(inPausa)
  const [errore, setErrore] = useState(false)

  useEffect(() => {
    if (errore || !esercizio) return
    const host = contenitore.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // Sincronizza la UI con il fallimento dell'API esterna WebGL.
      // oxlint-disable-next-line react/set-state-in-effect
      setErrore(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', `${nome} in 3D, muscoli evidenziati: ${muscoli}`)
    host.appendChild(renderer.domElement)
    const scena = new THREE.Scene()
    const { modello, aggiorna, bersaglio, camera: posizioneCamera } = creaScena(esercizio)
    scena.add(modello)
    let daDisegnare = true
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30)
    const controlli = new OrbitControls(camera, renderer.domElement)
    controlli.target.set(...bersaglio)
    controlli.enablePan = false
    controlli.enableDamping = true
    controlli.enableZoom = false // conserva lo scorrimento della pagina con la rotella
    controlli.minPolarAngle = 0.2
    controlli.maxPolarAngle = Math.PI / 2 - 0.04
    const reset = () => {
      camera.position.set(...posizioneCamera)
      daDisegnare = true
      controlli.target.set(...bersaglio)
      controlli.update()
    }
    const cambiataVista = () => { daDisegnare = true }
    controlli.addEventListener('change', cambiataVista)
    reset()
    api.current = { reset }
    scena.add(new THREE.HemisphereLight('#e2eeff', '#444054', 2.4))
    const luce = new THREE.DirectionalLight('#fff0df', 3.6)
    luce.position.set(-3, 5, -2)
    luce.castShadow = true
    luce.shadow.mapSize.set(1024, 1024)
    luce.shadow.camera.left = -2
    luce.shadow.camera.right = 2
    luce.shadow.camera.top = 2
    luce.shadow.camera.bottom = -2
    luce.shadow.normalBias = 0.025
    scena.add(luce)
    const bordo = new THREE.DirectionalLight('#b0d2ff', 2)
    bordo.position.set(2, 3, 3)
    scena.add(bordo)
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.22 }))
    piano.rotation.x = -Math.PI / 2
    piano.receiveShadow = true
    scena.add(piano)
    const resize = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      daDisegnare = true
    })
    resize.observe(host)
    let visibile = true
    const observer = new IntersectionObserver(([entry]) => { visibile = entry.isIntersecting; daDisegnare = true })
    observer.observe(host)
    let precedente = null
    let fase = 0
    renderer.setAnimationLoop((ora) => {
      const delta = precedente === null ? 0 : Math.min((ora - precedente) / 1000, 0.05)
      precedente = ora
      if (document.hidden || !visibile) return
      if (pausa.current && !daDisegnare) return
      daDisegnare = false
      if (!pausa.current) {
        fase = (fase + delta / 4) % 1
        aggiorna(fase)
      }
      controlli.update()
      renderer.render(scena, camera)
    })
    const perditaContesto = (event) => {
      event.preventDefault()
      setErrore(true)
    }
    renderer.domElement.addEventListener('webglcontextlost', perditaContesto)
    return () => {
      renderer.setAnimationLoop(null)
      renderer.domElement.removeEventListener('webglcontextlost', perditaContesto)
      resize.disconnect()
      observer.disconnect()
      controlli.removeEventListener('change', cambiataVista)
      controlli.dispose()
      const geometrie = new Set()
      const materiali = new Set()
      scena.traverse((oggetto) => {
        if (oggetto.geometry) geometrie.add(oggetto.geometry)
        if (oggetto.material) materiali.add(oggetto.material)
      })
      geometrie.forEach((g) => g.dispose())
      materiali.forEach((m) => m.dispose())
      luce.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      api.current = null
    }
  }, [errore, esercizio, nome, creaScena, muscoli])

  // L'illustrazione esistente resta disponibile su dispositivi senza WebGL.
  if (errore || !esercizio) return (
    <div className="panca-3d-fallback">
      <EsercizioAnimato nome={nome} gruppo={gruppo} altezza={168} />
      <p className="muted">Vista 3D non disponibile su questo dispositivo. Mostriamo l’animazione 2D.</p>
    </div>
  )
  return (
    <section className="panca-3d" aria-label={`Anteprima 3D: ${nome}`}>
      <div className="panca-3d-heading"><span className="panca-3d-badge">3D</span><span>{nome}</span></div>
      <div className="panca-3d-canvas" ref={contenitore} />
      <div className="panca-3d-caption"><span className="panca-3d-dot" /> {muscoli} <span>Trascina per ruotare</span></div>
      <div className="panca-3d-controls">
        <button className="btn btn-sm" aria-pressed={inPausa} onClick={() => {
          pausa.current = !pausa.current
          setInPausa(pausa.current)
        }}>{inPausa ? 'Riprendi' : 'Pausa'}</button>
        <button className="btn btn-sm" onClick={() => api.current?.reset()}>Ripristina vista</button>
      </div>
    </section>
  )
}
