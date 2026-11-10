// ---------------------------------------------------------------------------
// Da dove arrivano i nuovi iscritti: volantino, Instagram, un link condiviso...
//
// Si guarda alla PRIMA apertura dell'app su quel dispositivo e lo si ricorda
// (localStorage) fino alla registrazione, che lo manda come metadato
// `provenienza` (AccountContext, creaUtente). Resta in auth.users: niente
// colonne nuove, si conta dal database con
//   select raw_user_meta_data ->> 'provenienza' as da, count(*)
//   from auth.users group by 1 order by 2 desc;
//
// In ordine, vince la prima cosa che c'è:
// 1. `?da=...` nel link (o `utm_source`): è il modo sicuro. Il QR del volantino
//    punta a https://progettopalestra.it/?da=volantino, il link nella bio di
//    Instagram a ?da=instagram, e così per ogni canale nuovo (parola libera).
// 2. Il browser dentro un'app: Instagram, Facebook, TikTok lo dicono nello
//    user agent anche quando il link non ha `da`.
// 3. Un link a un profilo o a un post (Condividi, WhatsApp): passaparola.
// 4. Il sito da cui si arriva (referrer), se il browser lo dice.
// 5. Altrimenti 'diretto': scritto a mano, o un QR senza `da`.
//
// ⚠️ Conta il primo arrivo, non l'ultimo: chi ha visto il volantino e poi si
// iscrive dal link di un amico resta 'volantino'. Dopo un mese si riparte.
// ---------------------------------------------------------------------------

const CHIAVE = 'provenienza:v1'
const MESE = 30 * 24 * 60 * 60 * 1000

// Una parola corta e pulita: è un'etichetta da contare, non un testo.
function pulisci(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function fonteDa({ search = '', userAgent = '', pathname = '/', referrer = '', host = '' } = {}) {
  const q = new URLSearchParams(String(search).replace(/^\?/, ''))
  const scritto = pulisci(q.get('da') || q.get('utm_source'))
  if (scritto) return scritto

  if (/Instagram/i.test(userAgent)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'facebook'
  if (/musical_ly|BytedanceWebview|TikTok/i.test(userAgent)) return 'tiktok'

  if (/^\/utente\//.test(pathname)) return 'link-profilo'
  if (/^\/post\//.test(pathname)) return 'link-post'

  let da = ''
  try {
    da = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''
  } catch {
    da = ''
  }
  if (da && da !== host.replace(/^www\./, '')) {
    if (/instagram/.test(da)) return 'instagram'
    if (/facebook|fb\.com/.test(da)) return 'facebook'
    if (/whatsapp/.test(da)) return 'whatsapp'
    if (/google\./.test(da)) return 'google'
    return pulisci('sito-' + da)
  }
  return 'diretto'
}

// Alla prima apertura (chiamata una volta, al caricamento): ricorda la fonte
// se non ce n'è già una fresca, e toglie `da` dalla barra così chi copia il
// link non se lo porta dietro.
export function ricordaProvenienza() {
  if (typeof window === 'undefined') return
  const { search, pathname, host } = window.location
  try {
    const salvata = JSON.parse(localStorage.getItem(CHIAVE) || 'null')
    const scrittaOra = /[?&](da|utm_source)=/.test(search)
    if (!salvata || Date.now() - salvata.il > MESE || (scrittaOra && salvata.fonte === 'diretto')) {
      const fonte = fonteDa({ search, pathname, host, userAgent: navigator.userAgent, referrer: document.referrer })
      localStorage.setItem(CHIAVE, JSON.stringify({ fonte, il: Date.now() }))
    }
  } catch {
    /* niente storage: la registrazione dirà 'diretto' */
  }
  if (/[?&]da=/.test(search)) {
    const q = new URLSearchParams(search)
    q.delete('da')
    const resto = q.toString()
    window.history.replaceState(window.history.state, '', pathname + (resto ? '?' + resto : '') + window.location.hash)
  }
}

export function provenienzaRicordata() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) || 'null')?.fonte || 'diretto'
  } catch {
    return 'diretto'
  }
}
