// ---------------------------------------------------------------------------
// Per chi è una mini-guida (lib/guide). A parte, senza import, così si prova
// anche da Node (tests/guide.test.js).
// ---------------------------------------------------------------------------

/**
 * Questa guida è per chi sta guardando? `per` (facoltativo) dice per chi è:
 *   'pt'               ogni PT;
 *   'solo-pt'          solo chi è SOLO PT (lib/pt, isSoloPt);
 *   'pt-che-si-allena' un PT che si allena anche lui ("Tutti e due");
 *   'chi-si-allena'    tutti tranne il solo PT.
 * Allenamento e Dieta sono per chi si allena per intero: un solo PT quelle
 * sezioni non le ha (components/BarraBasso), e una guida che le spiega
 * parlerebbe di cose che non vede.
 */
export function guidaPerChi(g, { pt = false, soloPt = false } = {}) {
  if (!g) return false
  const siAllena = !soloPt
  if (g.gruppo === 'allenamento' || g.gruppo === 'dieta') return siAllena
  switch (g.per) {
    case 'pt':
      return pt
    case 'solo-pt':
      return soloPt
    case 'pt-che-si-allena':
      return pt && siAllena
    case 'chi-si-allena':
      return siAllena
    default:
      return true
  }
}
