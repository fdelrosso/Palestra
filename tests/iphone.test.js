import test from 'node:test'
import assert from 'node:assert/strict'
import { iphoneSenzaHome } from '../src/lib/iphone.js'

// La card "Metti l'app sulla schermata Home" (components/CardAppIphone) va
// solo a chi usa un iPhone/iPad dal browser: non ad Android, non a chi apre
// già dall'icona sulla Home, non dentro l'app nativa.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const amb = (userAgent, altro = {}) => ({ userAgent, maxTouchPoints: 5, standalone: false, nativo: false, ...altro })

test('iPhone nel browser: sì', () => {
  assert.equal(iphoneSenzaHome(amb(IPHONE)), true)
})
test('iPad che si presenta come Mac, col touch: sì; un Mac vero: no', () => {
  assert.equal(iphoneSenzaHome(amb(IPAD)), true)
  assert.equal(iphoneSenzaHome(amb(IPAD, { maxTouchPoints: 0 })), false)
})
test('iPhone aperto dalla Home o nell’app nativa: no', () => {
  assert.equal(iphoneSenzaHome(amb(IPHONE, { standalone: true })), false)
  assert.equal(iphoneSenzaHome(amb(IPHONE, { nativo: true })), false)
})
test('Android: no (ha la sua card)', () => {
  assert.equal(iphoneSenzaHome(amb(ANDROID)), false)
})
