---
target: sessione di allenamento
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/matte/Palestra/src/pages/WorkoutSession.jsx"
target_fingerprint: "sha256:69d79dd6c3198243e5c099e85f58af5da6fa7549ad8d2d0e1b2cb99b090e3557"
target_path: /home/matte/Palestra/src/pages/WorkoutSession.jsx
timestamp: 2026-10-08T07-52-33Z
slug: src-pages-workoutsession-jsx
closed: true
---
Method: dual-agent (A: design review · B: detector)

## Design Health Score — 23/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Timer does not start when a set is logged |
| 2 | Match System / Real World | 2 | Facile/Medio/Duro vs "reps not completed"; RPE/RIR/12RM jargon in weight error |
| 3 | User Control and Freedom | 3 | Tapping outside the Modifica/Peso modals discards edits |
| 4 | Consistency and Standards | 2 | "Annulla" x3 meanings; Termina styled as danger; several accents in recap |
| 5 | Error Prevention | 3 | Effort tap commits + advances; undo far away |
| 6 | Recognition Rather Than Recall | 2 | Clock icon = Riduci; green/yellow dots same check |
| 7 | Flexibility and Efficiency | 2 | effort → scroll → Start for every set |
| 8 | Aesthetic and Minimalist Design | 2 | Warm-up, timer, tip, nav, advice above the main action |
| 9 | Error Recovery | 2 | Jargon validation; Riprendi buried |
| 10 | Help and Documentation | 2 | No meaning given for the effort levels |

## Design Specificity
Grounded in logic (superserie, phases, red asks for reps, solo per oggi, wake lock, resume), generic in layout (stack + 🟢🟡🔴). Emoji lean toward the "motivational" anti-reference. Detector: 0 findings on 10 files. Browser: not available.

## Priority Issues
- [P0] Rest timer doesn't start on effort tap (completaSet WorkoutSession.jsx:402, no avvia call) and sits above the card. Fix: auto-start on tap, compact strip under/stuck to the effort row, manual Start as fallback. → layout
- [P1] Effort row has no fixed position under the thumb. Fix: fixed bottom bar with --spazio-barra, warm-up closed, advice behind a chip. → layout, distill
- [P1] Effort meaning unclear + dots colour only / aria "Serie N". Fix: outcome labels, glyph per state, full aria-labels, legend. → clarify
- [P1] Riprendi buried (:1709, against the comment at :1704) + recap with ~15 decisions and several accents. Fix: "Salvato ✓ · Riprendi" strip at the top, "Altro" disclosure, single accent. → distill
- [P2] Icon-only top bar, targets <44pt (28px dots, chip, select). Fix: "Esci" with chevron, 40px dots/44px hit area, Termina not danger. → adapt

## Persona Red Flags
Casey: Start after scrolling, effort row moves, Termina next to icons, backdrop loses input. Jordan: clock=Riduci, jargon, "Medio" undefined, next step not stated. Sam: dots without state, modals without aria-modal/focus/Esc, timer not announced. Marco: advice box in the way, labels unlike his PT's, small inputs, recap at the shower.

## Minor Observations
Outdated "Nasce pubblico" comment (:1519); uppercase .recupero-etichetta; red on .timer-big.over and .carico-tip.riduci; effort hex hard-coded; two clocks; duplicate "solo per oggi" copy; accent on "Salva per sempre"; recap re-renders every second.

## Questions
1. Auto-starting timer: do you still need Start/Reset/select on screen?
2. Effort: 3 levels, or done/not done + count?
3. Recap: "Salvato. Fatto." and the rest later?
