// ---------------------------------------------------------------------------
// Foto e video fatti DURANTE l'allenamento (components/MediaSessione), per lo
// sfondo del recap o da allegare. ⚠️ Mentre ci si allena l'allenamento non ha
// ancora la sua chiave (lib/fotoAllenamento, chiaveAllenamento: dipende
// dall'ora del "Termina"), quindi il file resta sul telefono (IndexedDB,
// lib/media) e la sessione si ricorda solo cosa c'è e a cosa serve
// (`sessione.media`). Al "Termina" (pages/WorkoutSession):
//   · gli ALLEGATI si caricano sull'allenamento, come dal riepilogo;
//   · lo SFONDO arriva al riepilogo già scelto, e si salva col suo "Salva".
// Un video da allegare si comprime già qui (lib/media, comprimiVideo), con la
// percentuale sotto gli occhi; uno di sfondo è già lo spezzone di 6 secondi.
// ---------------------------------------------------------------------------

import { blobLocale, eliminaBlobLocale, salvaBlobLocale } from './media'
import { aggiungiFotoAllenamento } from './fotoAllenamento'

/**
 * @typedef {{ id: string, uso: 'sfondo'|'allegato', tipo: 'foto'|'video', nome: string }} MediaSessione
 */

/**
 * La lista con una voce in più. Lo sfondo è uno solo: il nuovo prende il posto
 * di quello di prima (che torna da buttare, `via`).
 * @returns {{ lista: MediaSessione[], via: MediaSessione[] }}
 */
export function conNuovoMedia(lista = [], voce) {
  const via = voce.uso === 'sfondo' ? lista.filter((m) => m.uso === 'sfondo') : []
  return { lista: [...lista.filter((m) => !via.includes(m)), voce], via }
}

function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'sess-' + crypto.randomUUID()
  return 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/**
 * Tiene il file sul telefono e torna la sua voce, da mettere nella lista con
 * `conNuovoMedia` (e buttare con `scartaMedia` quello che esce). Separati
 * apposta: fra la scelta e il salvataggio può passare una compressione, e la
 * lista va presa com'è DOPO, non com'era prima.
 * @returns {Promise<MediaSessione>}
 */
export async function salvaMediaSessione(file, uso) {
  const voce = {
    id: nuovoId(),
    uso,
    tipo: String(file.type || '').startsWith('video') ? 'video' : 'foto',
    nome: file.name || '',
  }
  await salvaBlobLocale(voce.id, file, { kind: 'sessione' })
  return voce
}

export function scartaMedia(voci = []) {
  for (const m of voci) eliminaBlobLocale(m.id).catch(() => {})
}

export function togliMediaSessione(lista = [], id) {
  eliminaBlobLocale(id).catch(() => {})
  return lista.filter((m) => m.id !== id)
}

export const fileMediaSessione = (voce) => blobLocale(voce.id).catch(() => null)

/**
 * Al "Termina": carica gli allegati sull'allenamento (`chiave`) e, finiti,
 * chiama `onCaricati` (il pannello delle foto li rilegge). Nascono privati:
 * la visibilità la allinea il riepilogo, come per quelli aggiunti lì.
 */
export async function caricaAllegatiSessione(lista = [], { userId, chiave, onCaricati }) {
  const allegati = lista.filter((m) => m.uso === 'allegato')
  if (!allegati.length || !userId || !chiave) return
  let posizione = 0
  for (const m of allegati) {
    const blob = await fileMediaSessione(m)
    if (blob) {
      await aggiungiFotoAllenamento({
        blob,
        userId,
        chiave,
        tipo: m.tipo,
        nome: m.nome,
        posizione: posizione++,
        // Già compresso quando l'ha scelto (components/MediaSessione).
        comprimi: false,
      }).catch((e) => console.warn('Allegato della sessione non caricato', e?.message))
    }
    // aggiungiFotoAllenamento ne tiene una copia sua: questa non serve più.
    eliminaBlobLocale(m.id).catch(() => {})
  }
  onCaricati?.()
}
