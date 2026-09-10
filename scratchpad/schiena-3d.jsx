// Anteprima locale isolata: un solo esercizio montato, nessun account necessario.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import EsercizioSchiena3D from '../src/components/EsercizioSchiena3D'
import { ESERCIZI_SCHIENA_3D } from '../src/lib/schienaCatalogo3d'
import { movimentoDi } from '../src/lib/animazioniEsercizi'
import '../src/index.css'

export default function Prova() {
  const [aperta, setAperta] = useState(true)
  const [nome, setNome] = useState(ESERCIZI_SCHIENA_3D[0].nome)
  return <main className="app">
    <div className="topbar"><h1>Schiena · 17 esercizi in 3D</h1></div>
    <label htmlFor="esercizio-3d">Scegli un esercizio</label>
    <select id="esercizio-3d" value={nome} onChange={(e) => { setNome(e.target.value); setAperta(true) }} style={{ width: '100%', margin: '8px 0 12px' }}>
      {ESERCIZI_SCHIENA_3D.map((e) => <option key={e.nome}>{e.nome}</option>)}
    </select>
    <button className="btn btn-sm" onClick={() => setAperta(!aperta)}>{aperta ? 'Chiudi anteprima' : 'Apri anteprima'}</button>
    {aperta && <EsercizioSchiena3D key={nome} nome={nome} />}
    <p className="ex-tecnica">{movimentoDi(nome, 'schiena')?.tecnica}</p>
    <p><a href="/#/esercizi/schiena">Apri la libreria della schiena</a></p>
  </main>
}
createRoot(document.getElementById('root')).render(<StrictMode><Prova /></StrictMode>)
