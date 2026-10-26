# Query della dashboard

La dashboard "Palestra · Andamento" è una pagina privata su claude.ai
(https://claude.ai/artifact/HfEpxbiVGk2E3uVMsp9L2p, la apre solo chi l'ha ricevuta condivisa).
Ogni mattina alle 8 un'attività programmata di Claude, sul PC di Filippo, esegue queste query
sul database Supabase **in sola lettura** e carica i risultati nella dashboard.

| file | dataset | cosa contiene |
|---|---|---|
| `q-iscritti.sql` | `iscritti` | una riga per iscritto: profilo, ultimo login, allenamenti, post, amici, commenti, mi piace, messaggi, richieste, dieta, diario |
| `q-giorni.sql` | `giorni` | un giorno per riga dal 10/09/2026: iscritti, attivi, allenamenti, pubblici, mi piace, commenti, messaggi |
| `q-allenamenti.sql` | `allenamenti` | ogni allenamento chiuso, con reazioni, foto, musica, sfondo, nota |
| `q-comunita.sql` | `comunita` | conteggi di amicizie, foto, segnalazioni, sanzioni, PT |

Gli allenamenti si leggono dalla tabella `allenamenti`, dalle sue colonne (`user_id`, `data`,
`visibilita`): non da `schede.dati -> 'completamenti'`, che non ha più quelli nuovi, e senza
passare dalla scheda (un allenamento può non averla). Mi piace, commenti e foto si agganciano
con `allenamento_key = allenamenti.id`.

## Regole per modificarle

- **Ogni query restituisce una riga sola con una colonna `righe`**: un array JSON di oggetti.
  La pagina legge i campi per nome: se ne rinomini o togli uno, va cambiata anche la pagina
  (chiedetelo a Claude, che la ritocca su claude.ai).
- **Solo `select` / `with`.** Niente che scriva: l'attività le esegue così come sono.
- Prima di portarla su `main`, provatela nel SQL Editor di Supabase e controllate che `righe`
  esca come prima.
- L'attività legge i file dalla copia del repo sul PC di Filippo: una modifica vale dal
  primo aggiornamento dopo che è arrivata lì (merge su `main` + pull).

## Quando una query si rompe

Se cambia lo schema e una query non funziona più, la dashboard lo dice: un riquadro rosso in
cima con l'errore del database, e "Dati non aggiornati" sui grafici che ne dipendono. Gli
altri dati continuano ad aggiornarsi. Si corregge la query qui e la si porta su `main`.
