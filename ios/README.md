# App iPhone

Progetto Xcode che apre ProgettoPalestra come app vera sull'iPhone e aggiunge quello che da Safari non si può fare:

- notifica a fine recupero anche col telefono bloccato, e sull'Apple Watch
- conto alla rovescia del recupero sul notch (Dynamic Island) e sulla schermata di blocco

Dentro gira il sito pubblicato (`https://progettopalestra.it/`), quindi si aggiorna da solo. Lo script in `ProgettoPalestra/ContentView.swift` guarda la card del recupero (`.recupero-striscia`, tasto con `aria-label="Pausa"`, `.recupero-numero`) per sapere quando il timer parte e si ferma.

Per provarla: apri `ProgettoPalestra.xcodeproj`, in Signing & Capabilities metti il tuo account Apple su tutti e due i target (ProgettoPalestra e PalestraTimer), collega l'iPhone e premi Run.
