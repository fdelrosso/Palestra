---
target: src/components/SlideRecapMese.jsx
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 4
target_identity: "file:/home/matte/Palestra/src/components/SlideRecapMese.jsx"
target_fingerprint: "sha256:f9b20de688f486a468cca1850997bf3271fb4716874a8e314d103b98394e39ed"
target_path: /home/matte/Palestra/src/components/SlideRecapMese.jsx
timestamp: 2026-10-28T14-19-37Z
slug: src-components-sliderecapmese-jsx
---
Method: dual-agent (A: design review · B: detector + browser)
Nota: recap non visto renderizzato (login Supabase); valutazione su sorgente + calcoli di contrasto.

## Design Health Score

| # | Euristica | Voto | Problema chiave |
|---|---|---|---|
| 1 | Stato del sistema | 3 | Barrette e pausa chiare; zone di tocco invisibili, terzo centrale morto |
| 2 | Linguaggio reale | 3 | Italiano naturale; "Tutto in una card" è gergo da sviluppatore |
| 3 | Controllo | 3 | Pausa, X, Esc, frecce, Rivedi; X e pausa 36px e a 2px l'una dall'altra |
| 4 | Coerenza | 3 | Convenzioni da storia rispettate; deriva da DESIGN.md (maiuscolo, celeste fisso) |
| 5 | Prevenzione errori | 3 | Slide senza dato nascoste; casi limite che trapelano |
| 6 | Riconoscimento | 3 | Calendario senza intestazione L M M G V S D |
| 7 | Flessibilità | n/a | Storia passiva |
| 8 | Estetica minimale | 2 | Uno stampo per 11 slide, doppio velo scuro, letterbox |
| 9 | Recupero errori | 2 | "Condivisione non riuscita." senza via d'uscita |
| 10 | Aiuto | n/a | Convenzione autoesplicativa |
| **Totale** | | **22/32** | **Buono (69%, al limite con Accettabile)** |

## Verdetto di specificità
È un Wrapped con dentro i dati della palestra. Tutte le 11 slide usano lo stesso stampo (occhiello, numero, titolo, testo). Le cose che solo quest'app ha sono appiattite: i pallini di sforzo diventano una barra generica, i record perdono il valore di prima (recordDi lo calcola già), la card da condividere non ha lo sforzo. Specifici davvero: il calendario che si accende, il corpo coi muscoli, la polaroid della canzone.
Detector: JSX puliti (0). Nel CSS rm- 10 scostamenti dai token (colori fissi #0b0b0d/#5cc8f5, font 14/26/16/12px, 96px fuori scala), voluti in parte (il recap è sempre scuro). Contrasto calcolato: numeri del calendario 3,25:1 (sotto 4,5); "Rivedi" in tema chiaro 1,70:1 (testo scuro su fondo scuro).

## Problemi prioritari
1. [P1] Numeri grandi che vanno a capo: clamp(56px,18vw,96px) senza cifre tabulari; "12 h 30 min" o "123.456 kg" non stanno in riga. Unità piccola, tabular-nums, adattamento alla larghezza, conteggio che sale. → typeset
2. [P1] "Rivedi" quasi invisibile in tema chiaro (1,70:1) e numeri del calendario a 3,25:1; X e pausa 36px attaccate. → harden/adapt
3. [P1] I progressi non si vedono: sforzo come barra invece dei pallini; record senza "prima → dopo", doppioni, tagliati a 5 senza "+N"; nessun confronto col mese prima oltre agli allenamenti. → bolder
4. [P1] Fondo torbido e inquadratura stretta: doppio velo (sfondoGruppi + .rm-storia 0,55), luci posizionate per uno strato al 160%, letterbox 9:16 che su telefoni lunghi lascia bande nere. → layout, colorize
5. [P2] Picco-fine sbagliato: record alla 7ª di 11, poi abitudini/cardio piatti, finale "Tutto in una card" con la card rimpicciolita; intro piatta. → delight, clarify
6. [P2] Casi limite: abitudini senza esercizio ripete il giorno; "il più lungo/duro" con un solo allenamento; @username in maiuscolo; titolo canzone doppio. → harden

## Persone
- Casey (telefono, distratto): 6" troppo pochi per sforzo/abitudini; terzo centrale non fa nulla; X/pausa piccole.
- Sam (accessibilità): aria-live dice solo "Slide 3 di 11"; il doppio tocco di VoiceOver cade nel terzo centrale morto; numeri calendario 3,25:1.
- Atleta con scheda del PT: nessun "80 → 87,5 kg", nessun confronto col mese prima di volume o sforzo.

## Osservazioni minori
- Storia ridisegnata a ogni frame per la barretta (meglio animazione CSS).
- .rm-slide non tiene conto di --safe-top.
- Nessuna transizione fra slide; stesso fade-up ovunque.
- Primo giorno acceso del calendario parte in ritardo (--i conta le celle vuote).
- Occhiello "IL MIO MESE" maiuscolo anche nella card condivisa.

## Domande
1. Se i pallini sono la firma dell'app, perché la slide dello sforzo non è un mese di pallini?
2. Il recap serve a mettersi in mostra o a vedere i progressi? Chi si prende l'ultima slide?
3. Il recap è il posto dove i colori dei muscoli possono brillare pieni, senza doppio velo?
