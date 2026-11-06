import { useEffect, useState } from 'react'
import { chiediPush, pushDisponibile } from '../lib/push'
import { supabase } from '../lib/supabase'

const VOCI = [
  ['mi_piace', 'Mi piace ai tuoi allenamenti'],
  ['commento', 'Commenti ai tuoi allenamenti'],
]

// Cosa far arrivare sul telefono, in Profilo. Sta nell'account, non nel telefono:
// la legge il server quando c'è da mandare. Solo nell'app Android (lib/push).
export default function PreferenzePush({ ioId }) {
  const [pref, setPref] = useState({ mi_piace: true, commento: true })
  const [errore, setErrore] = useState('')
  const disponibile = pushDisponibile()

  useEffect(() => {
    if (!disponibile) return
    let vivo = true
    supabase
      .from('push_preferenze')
      .select('mi_piace, commento')
      .eq('user_id', ioId)
      .maybeSingle()
      .then(({ data }) => {
        if (vivo && data) setPref(data)
      })
    return () => {
      vivo = false
    }
  }, [ioId, disponibile])

  if (!disponibile) return null

  const cambia = async (campo) => {
    const nuove = { ...pref, [campo]: !pref[campo] }
    setPref(nuove)
    setErrore('')
    if (nuove[campo]) chiediPush()
    const { error } = await supabase.from('push_preferenze').upsert({ user_id: ioId, ...nuove })
    if (error) {
      setPref(pref)
      setErrore('Non salvato. Riprova.')
    }
  }

  return (
    <>
      <div className="section-title">Notifiche</div>
      <div className="card" style={{ padding: '10px 12px' }}>
        {VOCI.map(([campo, nome]) => (
          <div key={campo} className="toggle-row" style={{ padding: '4px 0' }}>
            <span style={{ fontSize: 14, minWidth: 0 }}>{nome}</span>
            <button
              className={'switch' + (pref[campo] ? ' on' : '')}
              onClick={() => cambia(campo)}
              role="switch"
              aria-checked={pref[campo]}
              aria-label={nome}
            >
              <span className="knob" />
            </button>
          </div>
        ))}
        {errore && <p className="form-error">{errore}</p>}
      </div>
    </>
  )
}
