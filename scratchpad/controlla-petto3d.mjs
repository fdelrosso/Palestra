// node scratchpad/controlla-petto3d.mjs — ogni posa di ogni esercizio del petto si calcola?
import { ESERCIZI_PETTO_3D } from '../src/lib/pettoCatalogo3d.js'
import { posaPetto } from '../src/lib/posePetto3d.js'
import { creaScenaPetto } from '../src/lib/petto3d.js'
for (const e of ESERCIZI_PETTO_3D) {
  try {
    let minGomito = Infinity
    for (let i = 0; i <= 40; i++) {
      const p = posaPetto(e, i / 40)
      for (const b of p.braccia) minGomito = Math.min(minGomito, b.gomito.y)
    }
    const s = creaScenaPetto(e)
    for (let i = 0; i <= 10; i++) s.aggiorna(i / 10)
    console.log('ok', e.nome, 'gomito min y', minGomito.toFixed(3))
  } catch (err) { console.log('ERR', e.nome, err.message) }
}
