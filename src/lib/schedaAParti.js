// ---------------------------------------------------------------------------
// La scheda del PT a parti (2026-10-28): si manda intera, l'atleta la vede un
// pezzo di settimane per volta (es. un mese pagato = 4 settimane). Il PT
// tiene la scheda intera (`schede_proposte_intere`), all'atleta arriva solo la
// parte sbloccata, tagliata qui. Senza import: si prova da Node
// (tests/schedaAParti.test.js).
// ---------------------------------------------------------------------------

/**
 * La scheda con solo le prime `settimane`: meno settimane, e gli schemi
 * "per settimana" degli esercizi accorciati. Quelli uguali per tutte le
 * settimane restano come sono (sono già tutti visibili dalla prima).
 */
export function taglioScheda(scheda, settimane) {
  const k = Math.max(1, Math.min(settimane, scheda.numeroSettimane || settimane))
  return {
    ...scheda,
    numeroSettimane: k,
    settimanaCorrente: Math.min(scheda.settimanaCorrente || 1, k),
    giorni: (scheda.giorni || []).map((g) => ({
      ...g,
      esercizi: (g.esercizi || []).map((e) =>
        e.variaPerSettimana && Array.isArray(e.settimane) ? { ...e, settimane: e.settimane.slice(0, k) } : e,
      ),
    })),
  }
}

/** Si può mandare a parti? Serve una fine, e più settimane di una parte. */
export function divisibileAParti(scheda, passo) {
  return !scheda?.senzaFine && passo >= 1 && (scheda?.numeroSettimane || 0) > passo
}

/**
 * Sulla scheda dell'atleta arriva una parte nuova (`nuova` = i dati tagliati
 * della proposta): si prendono le settimane e gli schemi degli esercizi, e
 * resta tutto il resto suo (allenamenti fatti, settimana corrente, chi la
 * vede, i suoi ritocchi). Un esercizio che lui ha tolto non torna.
 */
export function conParteNuova(mia, nuova, settimaneVisibili) {
  const giorniNuovi = new Map((nuova.giorni || []).map((g) => [g.id, g]))
  return {
    ...mia,
    numeroSettimane: nuova.numeroSettimane,
    giorni: (mia.giorni || []).map((g) => {
      const ng = giorniNuovi.get(g.id)
      if (!ng) return g
      const eserciziNuovi = new Map((ng.esercizi || []).map((e) => [e.id, e]))
      return {
        ...g,
        esercizi: (g.esercizi || []).map((e) => {
          const ne = eserciziNuovi.get(e.id)
          return ne ? { ...e, variaPerSettimana: ne.variaPerSettimana, schemaBase: ne.schemaBase, settimane: ne.settimane } : e
        }),
      }
    }),
    daPt: { ...mia.daPt, settimaneVisibili },
  }
}

/**
 * Il PT allunga la scheda (2026-10-28, richiesta dell'atleta): quante
 * settimane vede l'atleta dopo. Se vedeva già tutto, anche le nuove; se
 * c'erano settimane ancora da sbloccare, restano dov'era (le nuove si
 * sbloccano dopo, come le altre). → { visibili, dati } con `dati` la scheda
 * da mandargli (tagliata, se serve).
 */
export function parteDopoAllungamento(intera, primaVisibili, primaTotali) {
  const totali = intera.numeroSettimane
  const vedevaTutto = !primaVisibili || primaVisibili >= primaTotali
  const visibili = vedevaTutto ? totali : Math.min(primaVisibili, totali)
  return { visibili, dati: visibili < totali ? taglioScheda(intera, visibili) : intera }
}

/**
 * Sulla scheda dell'atleta arriva la versione allungata: il PT può aver
 * cambiato anche gli esercizi, quindi i giorni sono i suoi. Restano
 * dell'atleta gli allenamenti fatti, la settimana a cui è, chi la vede, il
 * nome che le ha dato e se è attiva.
 */
export function conAllungamento(mia, nuova, { visibili, totali, allungataIl }) {
  // Gli allegati suoi (foto, video, commenti sugli esercizi) restano.
  const giorni = nuova.giorni ? conAllegatiDelPt({ ...mia, giorni: nuova.giorni }, mia, mia.daPt?.id, true).giorni : mia.giorni
  return {
    ...mia,
    numeroSettimane: nuova.numeroSettimane,
    giorni,
    giorniSettimana: nuova.giorniSettimana || mia.giorniSettimana,
    settimanaCorrente: Math.min(mia.settimanaCorrente || 1, nuova.numeroSettimane),
    daPt: { ...mia.daPt, settimaneVisibili: visibili, settimaneTotali: totali, allungataIl },
  }
}

// Di chi è un allegato (media o commento): chi l'ha scritto. I commenti di
// prima non avevano `autoreId`: sono di chi ha la scheda.
const delPt = (x, ptId) => !!ptId && x?.autoreId === ptId

/**
 * Gli allegati del PT sugli esercizi (2026-10-28: video, foto e consigli
 * aggiunti anche dopo l'invio). Su ogni esercizio della scheda `mia`: i suoi
 * allegati restano, quelli del PT sono quelli di `altra` (stesso id di
 * esercizio). Tolti dal PT, spariscono anche qui.
 * Con `alContrario`: `mia` porta gli esercizi del PT (la scheda allungata) e
 * da `altra` si riprendono gli allegati di chi la usa (conAllungamento).
 */
export function conAllegatiDelPt(mia, altra, ptId, alContrario = false) {
  const esercizi = new Map()
  for (const g of altra.giorni || []) for (const e of g.esercizi || []) esercizi.set(e.id, e)
  const unisci = (lista, daAltra) =>
    alContrario
      ? [...(daAltra || []).filter((x) => !delPt(x, ptId)), ...(lista || []).filter((x) => delPt(x, ptId))]
      : [...(lista || []).filter((x) => !delPt(x, ptId)), ...(daAltra || []).filter((x) => delPt(x, ptId))]
  return {
    ...mia,
    giorni: (mia.giorni || []).map((g) => ({
      ...g,
      esercizi: (g.esercizi || []).map((e) => {
        const a = esercizi.get(e.id)
        if (!a && !alContrario) return e
        const media = unisci(e.media, a?.media)
        const commenti = unisci(e.commenti, a?.commenti)
        return { ...e, media, commenti }
      }),
    })),
  }
}

/** Il primo esercizio con un allegato del PT che in `prima` non c'era. → { giorno, esercizio, cosa } o null. */
export function allegatoNuovo(prima, dopo, ptId) {
  const vecchi = new Set()
  for (const g of prima?.giorni || [])
    for (const e of g.esercizi || []) for (const x of [...(e.media || []), ...(e.commenti || [])]) vecchi.add(x.id)
  for (const g of dopo?.giorni || [])
    for (const e of g.esercizi || []) {
      const m = (e.media || []).find((x) => delPt(x, ptId) && !vecchi.has(x.id))
      if (m) return { giorno: g.nome || '', esercizio: e.nome || '', cosa: m.tipo === 'video' ? 'video' : 'foto' }
      const c = (e.commenti || []).find((x) => delPt(x, ptId) && !vecchi.has(x.id))
      if (c) return { giorno: g.nome || '', esercizio: e.nome || '', cosa: 'consiglio' }
    }
  return null
}
