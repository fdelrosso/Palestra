# Guest mode ("Dai un'occhiata") — design

Date: 2026-11-25 · Branch: `ospite`

## Why

Lots of visits to the website, almost no new users. A logged-out visitor today sees only
`Benvenuto` (landing + login/sign-up) or a single shared post (`PostOspite`). They never get to
see the app itself. Guest mode lets them look around without an account and without being
able to change anything.

## Decisions taken

- Visitors can **read** the real social feed: public posts of public accounts (the same rule as
  `post_pubblico`), **photos included** (the public copies in the `feed` bucket). No interaction:
  like, comment, profile → "create an account".
- Everything else is a **preview with sample data**, read-only.
- Entry: `Benvenuto` stays as it is, plus a "look around" button.
- Approach A: the real app pages run on a guest store fed by a sample file. No anonymous
  Supabase login (it would make visitors `authenticated` on all 188 rules).

## 1. Entry and exit

- `components/Benvenuto`: third button "Dai un'occhiata senza account".
- It sets `sessionStorage['palestra:ospite'] = '1'`: it survives a reload and ends when the tab
  is closed.
- `App.jsx`: no session + flag → the guest app (instead of `UserGate`). The `/post/<chiave>`
  case stays as it is today.
- Fixed bar at the top: "Stai guardando un esempio · Crea account" → clears the flag and opens
  `UserGate` on the sign-up form. Logging in also clears the flag.

## 2. Guest store

- `src/data/ospite.js`: a made-up athlete (`Marco`, example). 2 programs, ~4 weeks of
  completed workouts (calendar, progress and recap have content), 1 diet with a few days in
  the diary, preferences. Dates computed from today, so the example never "gets old".
- `store/StoreOspite.jsx`: provides `StoreContext` with **the same keys** as `StoreProvider`.
  Data from the file; `sessione` null; `statoCloud` "all saved". Every function that writes
  (`aggiungiScheda`, `iniziaSessione`, `aggiornaDieta`, …) calls `chiediAccount(azione)` and
  returns without doing anything.
- `chiediAccount`: opens a shared sheet "Crea un account per farlo" (Create account / Not now).
- `AccountContext`: in guest mode `utenteCorrente = { id: 'ospite', ospite: true, nome, dati }`
  from the sample file, no PT role. Account functions (logout, profile changes) → `chiediAccount`.

## 3. Allowed pages

A list of routes allowed for guests: home/start, program and day, calendar, monthly recap,
diet (view, today, history), exercise library, feed. Navigating anywhere else (editor, import,
workout session, chat, friends, profile, PT, notifications, search…) → `chiediAccount`, no
change of route. Bottom bar unchanged.

The big edit flows are blocked at the door (route); the small in-page actions are caught by
the store.

## 4. Real feed

- `pages/FeedOspite.jsx`: a scrolling list of `PostSchermo` (the same component as
  `PostOspite`), pages of 20, "load more" at the end. Like, comment, name/avatar → `chiediAccount`.
  Photos via `urlFeed(path)` (lib/fotoAllenamento).
- New migration `supabase/migrations/20261125xxxxxx_feed_ospite.sql`:
  `feed_ospite(p_prima_di timestamptz, p_prima_di_id text, p_quanti int)` security definer,
  `grant execute … to anon, authenticated`. It returns `id, user_id, nome, username, scheda_id,
  data, dati, mi_piace, commenti, foto` (jsonb of the paths of the `feed` copies) for:
  `allenamenti.visibilita = 'pubblica'`, `not da_salvare`, author with `profili.pubblico`,
  not held back by moderation. `dati` passes through `dati_allenamento_per_me` (with no user,
  the gym is removed as it is today). Ordered `data desc, id desc`, max 50.
- Additive only: a new function, nothing renamed or removed.

## 5. Testing

- `tests/ospite.test.js`: the keys of the guest store = the keys of the real one (fails if
  someone adds a function to `StoreProvider` and forgets the guest); every write function calls
  `chiediAccount` and changes nothing; the route guard lets the list through and stops the rest.
- `npm run lint`, `npm run test`; on localhost the user checks the pages.
- Migration: tested as `anon` before applying it.

## Not in this round (to the user)

- Applying the migration: `.env` currently points at **production** → only with the OK.
- Privacy text in `Consensi`: it should say that public posts are visible to visitors too.
- Measuring the effect: add later (e.g. Vercel analytics event on "Dai un'occhiata" and on
  "Crea account" from the bar) if the numbers are needed.
