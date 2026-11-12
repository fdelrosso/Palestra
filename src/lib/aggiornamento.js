// ---------------------------------------------------------------------------
// C'è una versione nuova, e cosa c'è da scaricare (components/AggiornamentoApp).
//
// L'elenco dei file di una versione sta scritto dentro il suo sw.js (workbox lo
// mette in linea: `{url:"…",revision:"…"}`), e ogni file della versione in uso
// è nella cache di workbox con una chiave che si sa calcolare. I file del sw.js
// appena pubblicato che in cache non ci sono sono la versione nuova; nessuno =
// niente di nuovo. Lo si chiede da soli perché il controllo del browser
// (registration.update) appena aperta l'app parte dopo ~3 secondi.
// ⚠️ Se workbox cambia il formato, l'elenco esce vuoto: si entra e basta, e la
// versione nuova arriva come prima, all'avvio dopo.
// ---------------------------------------------------------------------------

/** I file elencati in sw.js: { url, chiave (di cache), revisionato }. */
export function fileDaSw(testo, base) {
  const file = []
  for (const m of String(testo).matchAll(/\{url:"([^"]+)",revision:(null|"([^"]*)")\}/g)) {
    const u = new URL(m[1], base)
    const url = u.href
    if (m[3] != null) u.searchParams.set('__WB_REVISION__', m[3])
    file.push({ url, chiave: u.href, revisionato: m[3] != null })
  }
  return file
}

/** Quelli che la versione in uso non ha: la versione nuova. */
export function fileNuovi(testo, base, inCache) {
  return fileDaSw(testo, base).filter((f) => !inCache.has(f.chiave))
}
