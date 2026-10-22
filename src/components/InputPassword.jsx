import { useState } from 'react'
import { IconOcchio } from './icons'

// Il campo password di tutta l'app, con l'occhio per vedere cosa si scrive.
// Prende le stesse props di un <input>; `type` lo decide lui.
// ⚠️ onMouseDown col preventDefault: il tocco sull'occhio non deve togliere il
// fuoco al campo, se no sul telefono la tastiera si chiude a ogni tocco.
export default function InputPassword({ className = 'input', ...input }) {
  const [visibile, setVisibile] = useState(false)
  return (
    <div className="input-password">
      <input {...input} className={className} type={visibile ? 'text' : 'password'} />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisibile((v) => !v)}
        aria-label={visibile ? 'Nascondi password' : 'Mostra password'}
        aria-pressed={visibile}
      >
        <IconOcchio barrato={visibile} />
      </button>
    </div>
  )
}
