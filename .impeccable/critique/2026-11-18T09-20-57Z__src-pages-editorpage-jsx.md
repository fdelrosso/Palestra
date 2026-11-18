---
target: creazione/modifica scheda
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/matte/Palestra/src/pages/EditorPage.jsx"
target_fingerprint: "sha256:8c2e10e8bf0fe3e75acaea73d9b6833670aad77ef7c7e5e46dfc8b199030cb93"
target_path: /home/matte/Palestra/src/pages/EditorPage.jsx
timestamp: 2026-11-18T09-20-57Z
slug: src-pages-editorpage-jsx
---
⚠️ DEGRADED: single-context (critica avviata dall'assistente, niente sotto-agenti)
Nota: vista dal vivo col banco scratchpad/prova-editor (store finto), 390px, scuro e chiaro. Detector: 0 su EditorPage, GiornoEditor, SchemaFasi, CercaEsercizio.

## Design Health Score — 25/40 (Accettabile)
| # | Euristica | Voto | Problema |
|---|---|---|---|
| 1 | Stato | 3 | Aggiungi spento poco distinguibile |
| 2 | Linguaggio | 3 | Misura / Da-a / Una per serie |
| 3 | Controllo | 3 | Salva in alto + Avanti in basso |
| 4 | Coerenza | 2 | 4 stili di pillola, MAIUSCOLO, gradienti |
| 5 | Prevenzione | 3 | Superserie proposta col cardio di riscaldamento |
| 6 | Riconoscimento | 3 | chip "superserie" ripetuto |
| 7 | Flessibilità | 2 | niente duplica esercizio / copia giorno |
| 8 | Estetica | 2 | 4-6 elementi colorati per card |
| 9 | Errori | 2 | avviso rosso prima dell'errore |
| 10 | Aiuto | 2 | paragrafi lunghi nel passo 1 |

## Problemi prioritari
1. [P1] Card rumorose: X rosse, pillole diverse, "Usa «…»" sopra il corpo, corpo sotto il recupero, chip superserie fra tutte. → distill
2. [P1] Fuori dal design system: maiuscolo, gradiente+alone sui tasti, due accenti, rosso decorativo. → polish
3. [P1] Foglio esercizio sbilanciato: contatori enormi a destra, Carico prima, select "-", checkbox nativa, "Altre opzioni" non sembra tasto, rosso prematuro. → layout
4. [P2] Passo 1 da modulo: Dom e 7 orfani nella griglia, testi lunghi, card unica enorme. → layout, clarify
5. [P2] Passo 2: linguette pesanti, nome giorno doppio, "facoltativo" che va a capo male, tre tasti uguali in fondo. → layout
