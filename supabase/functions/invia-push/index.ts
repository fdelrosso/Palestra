// ---------------------------------------------------------------------------
// Manda una notifica push: la chiama il trigger del database a ogni mi piace o
// commento (migrations/20261106120000_push_notifiche.sql) e a ogni mossa fra PT
// e atleta (migrations/20261116120000_push_pt.sql). A chi e cosa lo decide
// `push_da_inviare`; qui si scrive la frase e si consegna a Firebase.
//
// Segreti della funzione (mai nel repo, né nell'app):
//   PUSH_SEGRETO              lo stesso di push_config, dice che chiama il database
//   FIREBASE_SERVICE_ACCOUNT  il JSON dell'account di servizio di Firebase
// Si pubblica con --no-verify-jwt: chi chiama è il database, col suo segreto.
// ---------------------------------------------------------------------------
import {
  frase,
  fraseNotificaAppuntamento,
  fraseNotificaAtletaPerso,
  fraseNotificaCheck,
  fraseNotificaNuovoAtleta,
  fraseNotificaProposta,
  fraseNotificaPtPerso,
  fraseNotificaScheda,
} from './frase.js'

const { Deno } = globalThis as any // gira su Deno: il controllo del codice non lo conosce

const b64url = (d: ArrayBuffer | string) =>
  btoa(typeof d === 'string' ? d : String.fromCharCode(...new Uint8Array(d)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// L'accesso a Firebase dura un'ora: fra una chiamata e l'altra si riusa.
let accesso: { token: string; fino: number } | null = null

async function tokenFirebase(sa: { client_email: string; private_key: string }) {
  if (accesso && accesso.fino > Date.now() + 60000) return accesso.token
  const ora = Math.floor(Date.now() / 1000)
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ora,
    exp: ora + 3600,
  }))}`
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, '')
  const chiave = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chiave, new TextEncoder().encode(corpo))
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${corpo}.${b64url(firma)}`,
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`accesso a Firebase: ${r.status}`)
  accesso = { token: j.access_token, fino: Date.now() + j.expires_in * 1000 }
  return accesso.token
}

// Fra PT e atleta (migrations/20261116120000_push_pt.sql): l'evento arriva già
// col destinatario; qui la frase del cuoricino e dove porta il tocco.
// "31 dicembre" per le scadenze ("fino al 31 dicembre"), col giorno della
// settimana per gli appuntamenti ("venerdì 20 novembre alle 18:00").
const dataIt = (iso: string, conGiorno = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('it-IT', {
    ...(conGiorno ? { weekday: 'long' } : {}),
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

function frasePt(ev: any) {
  switch (ev.genere) {
    case 'proposta-scheda':
    case 'proposta-dieta':
      return fraseNotificaProposta(ev)
    case 'scheda':
      return fraseNotificaScheda(ev, (d: string) => dataIt(d))
    case 'appuntamento':
      return fraseNotificaAppuntamento(ev, (o: any) => `${dataIt(o.giorno, true)} alle ${o.ora}`)
    case 'check':
      return fraseNotificaCheck(ev)
    case 'nuovo-atleta':
      return fraseNotificaNuovoAtleta(ev)
    case 'atleta-perso':
      return fraseNotificaAtletaPerso(ev)
    case 'pt-perso':
      return fraseNotificaPtPerso(ev)
    default:
      return ''
  }
}

// La scheda e la dieta nuove hanno la loro card (Home, Dieta); il resto sta nel
// cuoricino, che sa già dove portare ogni riga.
const percorsoPt = (genere: string) =>
  genere === 'proposta-dieta' ? '/dieta' : genere === 'proposta-scheda' ? '/' : '/notifiche'

async function consegna(
  tokens: string[],
  messaggio: { title: string; body: string; percorso: string; tag: string; canale: string },
  base: string,
  conServizio: Record<string, string>,
) {
  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
  const accessoFcm = await tokenFirebase(sa)
  let inviate = 0
  for (const token of tokens) {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessoFcm}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: messaggio.body ? { title: messaggio.title, body: messaggio.body } : { title: messaggio.title },
          data: { percorso: messaggio.percorso },
          android: {
            priority: 'HIGH',
            notification: {
              tag: messaggio.tag,
              channel_id: messaggio.canale,
              icon: 'ic_notifica',
              color: '#5cc8f5',
            },
          },
        },
      }),
    })
    if (r.ok) inviate++
    // Telefono che non c'è più: il token non serve.
    else if (r.status === 404) {
      await fetch(`${base}/rest/v1/push_token?token=eq.${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: conServizio,
      })
    }
  }
  return inviate
}

Deno.serve(async (req) => {
  const segreto = Deno.env.get('PUSH_SEGRETO')
  if (!segreto || req.headers.get('x-push-segreto') !== segreto) return new Response('no', { status: 401 })
  const { tipo, allenamento_key, autore, destinatario, evento } = await req.json()

  const base = Deno.env.get('SUPABASE_URL')!
  const servizio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const conServizio = { apikey: servizio, Authorization: `Bearer ${servizio}`, 'Content-Type': 'application/json' }

  if (tipo === 'pt') {
    if (!destinatario || !autore || !evento?.genere) return new Response('richiesta non valida', { status: 400 })
    const q = await fetch(`${base}/rest/v1/rpc/push_pt_da_inviare`, {
      method: 'POST',
      headers: conServizio,
      body: JSON.stringify({ p_dest: destinatario, p_chi: autore }),
    })
    if (!q.ok) return new Response(`regole: ${q.status}`, { status: 500 })
    const riga = (await q.json())[0]
    if (!riga?.tokens?.length) return new Response(JSON.stringify({ inviate: 0 }))
    const ev = { ...evento, chi: riga.chi_nome || 'Qualcuno', nome: evento.nome || '' }
    const title = frasePt(ev)
    if (!title) return new Response('evento sconosciuto', { status: 400 })
    const inviate = await consegna(
      riga.tokens,
      {
        title,
        body: String(evento.nota || '').trim().slice(0, 140),
        percorso: percorsoPt(evento.genere),
        // Stessa cosa, stesso tipo: si sostituisce (dieci video sulla stessa scheda = una notifica).
        tag: `${evento.genere}:${evento.chiave || ''}:${evento.tipo || ''}`,
        canale: 'pt',
      },
      base,
      conServizio,
    )
    return new Response(JSON.stringify({ inviate }))
  }

  if ((tipo !== 'mi_piace' && tipo !== 'commento') || !allenamento_key || !autore) {
    return new Response('richiesta non valida', { status: 400 })
  }
  const q = await fetch(`${base}/rest/v1/rpc/push_da_inviare`, {
    method: 'POST',
    headers: conServizio,
    body: JSON.stringify({ p_key: allenamento_key, p_tipo: tipo, p_autore: autore }),
  })
  if (!q.ok) return new Response(`regole: ${q.status}`, { status: 500 })
  const riga = (await q.json())[0]
  if (!riga?.tokens?.length) return new Response(JSON.stringify({ inviate: 0 }))

  const titolo = frase({ tipo, nomi: riga.nomi || [], persone: Number(riga.persone), quanti: Number(riga.quanti) })
  const testo = tipo === 'commento' && riga.ultimo_testo ? riga.ultimo_testo.slice(0, 140) : 'Sul tuo allenamento'
  const inviate = await consegna(
    riga.tokens,
    {
      title: titolo,
      body: testo,
      percorso: '/notifiche',
      // Stesso allenamento e stesso tipo: si sostituisce, come nel cuoricino.
      tag: `${allenamento_key}:${tipo}`,
      canale: 'social',
    },
    base,
    conServizio,
  )
  return new Response(JSON.stringify({ inviate }))
})
