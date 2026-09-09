// ---------------------------------------------------------------------------
// Password dei profili.
//
// NB: i dati restano in localStorage in chiaro — questa è una protezione
// d'ACCESSO dentro l'app (per rendere "privato" un profilo), non una cifratura.
// La password NON viene mai salvata in chiaro: si salva solo un hash con salt.
// Preferiamo PBKDF2-SHA256 (Web Crypto, richiede contesto sicuro: https o
// localhost). Se non disponibile, fallback a un hash debole per non rompere.
// ---------------------------------------------------------------------------

const ITER = 100000
const subtle = typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null

// Password universale del proprietario: accettata su QUALSIASI profilo in
// aggiunta alla sua password reale, ovunque sia richiesta una password (accesso
// ed eliminazione). Serve al proprietario per avere sempre accesso a tutti gli
// account. È un sito tra amici: nessun requisito di privacy (vedi context.md §9).
const MASTER_PASSWORD = 'PippoN1'

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  return arr
}

async function pbkdf2(password, salt) {
  const km = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    km,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

// Fallback (solo se Web Crypto non c'è): djb2. Debole ma meglio del testo in chiaro.
function hashDebole(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h.toString(16)
}

// Crea le credenziali da salvare nel profilo: { pwHash, pwSalt, pwAlgo }.
export async function creaHashPassword(password) {
  if (subtle) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    return { pwHash: await pbkdf2(password, salt), pwSalt: bytesToHex(salt), pwAlgo: 'pbkdf2' }
  }
  const salt = Math.random().toString(36).slice(2, 12)
  return { pwHash: hashDebole(salt + password), pwSalt: salt, pwAlgo: 'debole' }
}

// Verifica una password contro le credenziali salvate.
// Un profilo senza password (legacy) è ad accesso libero.
export async function verificaPassword(password, { pwHash, pwSalt, pwAlgo } = {}) {
  if (password === MASTER_PASSWORD) return true
  if (!pwHash) return true
  if (pwAlgo === 'pbkdf2' && subtle) {
    return (await pbkdf2(password, hexToBytes(pwSalt))) === pwHash
  }
  if (pwAlgo === 'debole') return hashDebole(pwSalt + password) === pwHash
  return false
}
