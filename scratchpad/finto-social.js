// lib/social per i banchi di prova: tutto quello vero, tranne il profilo
// pubblico, che senza accesso il database rifiuta (pages/UtentePage).
export * from '../src/lib/social.js'

export async function profiloPubblico(id) {
  return { ok: true, errore: '', profilo: { id, nome: id === 'io' ? 'Prova' : id, username: id, cognome: '', foto: '', amici: 3 } }
}
