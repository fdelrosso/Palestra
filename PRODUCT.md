# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA installabile (Safari → "Aggiungi alla schermata Home"), usata soprattutto da telefono; va anche su PC. Niente App Store.

## Users

- **Primario: chi arriva da fuori.** Oggi la usano il proprietario e gli amici, ma l'interfaccia si progetta per uno sconosciuto che arriva da Google o da `progettopalestra.it`, si iscrive e deve capire l'app da solo, senza nessuno che gliela spieghi.
- Chi si allena con una scheda del personal trainer, ricevuta di solito come testo su WhatsApp.
- **Secondario: il PT**, con un account suo che segue i propri atleti (schede, progressi, foto del check se l'atleta le apre).

## Product Purpose

Tracciare gli allenamenti in palestra partendo dalla scheda del PT: la si incolla, diventa una sessione guidata (timer di recupero, serie, ripetizioni, kg, pallini di sforzo), e lo storico alimenta il consiglio sul carico. Intorno: dieta e diario alimentare, amici/chat/feed, account PT. Successo = l'utente apre l'app a ogni allenamento invece del blocco note o di WhatsApp.

## Positioning

- **La scheda arriva dal testo del PT**: si incolla quella ricevuta su WhatsApp e diventa un allenamento guidato, senza riscriverla a mano.
- **Il peso di OGGI, non una tabella fissa**: il consiglio sul carico parte da un massimale stimato dai pallini di sforzo e propone il peso per le serie, le ripetizioni e la tecnica di quel giorno.
- **Sociale fra amici veri, privato di default**: amici, chat, feed e recap, ma schede, allenamenti e foto nascono nascosti; ci si trova solo per codice amico o nome esatto, nessun elenco di utenti.

## Operating Context

- **Il momento che conta è in palestra, fra una serie e l'altra**: telefono in una mano, pochi secondi, attenzione divisa, spesso rete scarsa o assente. La sessione guidata deve reggere questo.
- Il resto (importare o modificare schede, dieta, social, progressi, esportazioni) si fa con calma, di solito a casa.
- Le schede arrivano dal PT su WhatsApp; la dieta arriva come PDF del nutrizionista.
- Il codice arriva ai telefoni solo quando chi ha installato l'app accetta "C'è una versione nuova".

## Capabilities and Constraints

- Lingua dell'interfaccia: **italiano**.
- Offline-first: senza rete l'app si apre dalla copia locale, le modifiche si accodano e una striscia gialla lo dice; al primo accesso su un telefono la rete serve.
- Account con email o nome (unico); l'elenco dei profili non si mostra mai.
- Sessione guidata, storico, schede generali, allenamento consigliato e schede prefatte per obiettivo/focus/livello, riscaldamento e stretching per giorno, viste 3D del corpo, recap condivisibile (si condividono i numeri, non l'immagine), foto e video sugli esercizi (video max 10 s), invii momentanei, dieta a cinque pasti fissi più extra, esportazione della scheda e dei progressi in PDF o Excel.
- **Il livello si dichiara, non si deduce**, e filtra senza vietare.
- **Quello che non si sa non si mostra**: niente trattini o medie al posto di un dato mancante.
- Niente `confirm()` del browser per azioni distruttive: si usa `TastoConferma`.
- Le regole complete e il loro perché stanno in `context.md` §7 e `docs/decisioni.md`.
- Ancora da fare prima dell'apertura al pubblico: casella `info@progettopalestra.it`, "scarica i miei dati", "segnala", conferma dell'email (pronta ma spenta).

## Brand Commitments

- Nome: **ProgettoPalestra1.0** (anche sotto l'icona); dominio `progettopalestra.it`.
- Titolare del trattamento: Filippo Del Rosso (Pisa); privacy e termini sono pagine statiche (`public/privacy.html`, `public/termini.html`).

## Evidence on Hand

- Icone e immagini dell'app in `public/` (`pwa-*.png`, `apple-touch-icon.png`, `favicon.png`, `icons.svg`).
- **Non esistono** testimonianze, numeri d'uso, recensioni o casi studio: non vanno inventati.

## Product Principles

1. **Il momento in palestra vince**: la sessione guidata deve funzionare con una mano, in pochi secondi, senza rete.
2. **Chiaro per chi arriva da solo**: niente che presupponga di conoscere già l'app o di avere un amico che la spiega.
3. **Privato finché non si sceglie**: chi non sceglie non pubblica, e ciò che non si deve vedere non esce dal server.
4. **Onesti sui dati**: ciò che non si sa non si mostra, ciò che non è partito non si dà per fatto.
5. **Parte dal materiale che l'utente ha già**: il testo del PT e il PDF del nutrizionista, non un modulo da riempire.
