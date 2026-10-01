// ---------------------------------------------------------------------------
// I percorsi dell'app, come li elenca vercel.json, in espressioni regolari.
//
// vercel.json e' LA lista: il server manda all'app (index.html) solo quei
// percorsi, e tutto il resto (/ciaociao) finisce su public/404.html. Il
// service worker, che quando l'app e' installata risponde al posto del
// server, deve dire di si' agli STESSI percorsi: se no /ciaociao aprirebbe
// l'app a chi ce l'ha installata e il 404 a tutti gli altri. Per questo
// vite.config.js non tiene una lista sua ma legge questa.
//
// Si capisce solo la forma semplice: pezzi fissi e `:nome` per un pezzo
// qualsiasi (l'id di una scheda). Qualcosa di piu' furbo (`:path*`, gruppi)
// Vercel lo saprebbe leggere e qui no: meglio fermare la build che avere un
// service worker che la pensa diversamente dal server.
//
// Niente import: si carica da vite.config.js e dai test.
// ---------------------------------------------------------------------------

export function espressioneDelPercorso(sorgente) {
  const s = String(sorgente || '')
  const pezzi = s.split('/').slice(1)
  if (!s.startsWith('/') || pezzi.some((p) => !/^(:[a-z]+|[a-z][a-z-]*)$/i.test(p))) {
    throw new Error(`vercel.json: "${s}" ha una forma che lib/percorsi non sa leggere`)
  }
  const corpo = pezzi.map((p) => (p.startsWith(':') ? '[^/?#]+' : p)).join('/')
  // Una barra in fondo e una query non cambiano la pagina (i link delle mail
  // tornano con `?code=…`).
  return new RegExp(`^/${corpo}/?(\\?.*)?$`)
}

/** La radice e i percorsi che vercel.json manda all'app. */
export function percorsiDellApp(vercel) {
  const riscritti = (vercel?.rewrites || [])
    .filter((r) => r.destination === '/index.html')
    .map((r) => espressioneDelPercorso(r.source))
  return [/^\/(\?.*)?$/, ...riscritti]
}
