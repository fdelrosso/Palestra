# Palestra — come si lavora qui

> La mappa del progetto (file, modello dati, rotte) sta in **[context.md](context.md)**: quello
> resta il file da leggere per capire dove mettere le mani. Qui ci sono solo le regole di
> convivenza, perche' da settembre 2026 il progetto lo portano avanti in tre.

## Branch

Ognuno ha il suo e ci lavora dentro: `pippo` (Filippo), `Nico`, piu' quello del terzo.

- **Non si pusha su `main` di propria iniziativa.** Nemmeno per una correzione piccola.
- Su `main` ci si arriva con una **pull request**, oppure se il proprio utente lo chiede
  dicendo esplicitamente "su main".
- `main` e' il ramo pubblicato: ogni push li' aggiorna l'app online su Vercel. Per questo si
  tocca solo quando si vuole davvero rilasciare.
- Prima di cominciare un lavoro nuovo, allineare il proprio branch:
  `git checkout main && git pull && git checkout <proprio-branch> && git merge main`.
  Merge, non rebase: i branch sono gia' pubblicati e il rebase obbligherebbe al force-push.

## context.md non si tocca sui branch personali

Storicamente `context.md` veniva riscritto a ogni tornata, e il blocco "Ultimo aggiornamento" in
cima si rifaceva da capo ogni volta. **In tre non funziona piu'**: sono le stesse righe di prosa
riscritte in parallelo, e git non sa fonderle.

Quindi: sul proprio branch `context.md` si lascia stare. Lo aggiorna **solo chi porta il lavoro
su `main`**, in quel momento, raccontando quello che e' entrato davvero. Stessa regola per
`docs/*.md`.

## Il database e' uno solo

C'e' un unico progetto Supabase, condiviso da tutti, e `supabase/schema.sql` e' un file solo
applicato a mano. **Un branch isola il codice, non i dati**: una modifica allo schema fatta dal
proprio branch e' gia' in produzione, la vede l'app online.

- Modifiche allo schema **solo additive** (nuove tabelle, nuove colonne). Mai rinominare o
  cancellare senza averlo detto agli altri.
- Chi vuole lavorare senza rischi si fa un progetto Supabase suo e mette `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_KEY` nel proprio `.env`.

## Segreti

`.env` e' fuori dal repo e ci resta. Contiene la password `postgres`, che scavalca tutte le
regole di sicurezza del database: non si passa in giro e non si committa. Per far girare l'app
non serve — URL e chiave pubblica hanno gia' un ripiego in chiaro in `src/lib/supabase.js`.

## Comandi

```bash
npm install
npm run dev     # http://localhost:5173
npm run lint
npm run test
```
