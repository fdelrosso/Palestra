// ---------------------------------------------------------------------------
// Le MINI-GUIDE: una spiegazione breve la prima volta che si entra in una
// funzione dell'app. Il giro generale (components/Tutorial) dice DOVE stanno
// le cose; queste dicono COME si usa quella che si ha davanti, nel momento in
// cui la si apre e non prima.
//
// Ognuna è due o tre schede corte. Si apre da sola UNA volta per account
// (`avvisi['guida-<id>']` nelle preferenze del profilo, come il giro), mai
// prima che il giro sia stato visto, e si rilegge quando si vuole da
// Altro → Guida all'app (pages/GuidaPage).
//
// Quando si apre:
//   - `rotte`: entrando in una di queste pagine (components/GuidaBreve,
//     useGuidaPrimaVolta);
//   - senza `rotte`: la chiede il componente che la mostra
//     (`usePrimaVolta(id)`), per le cose che non hanno una pagina loro, come il
//     recap di fine allenamento.
//
// Le guide FANNO VEDERE, non solo dicono (components/GuidaBreve):
//   - `apri({ schede, diete })`: la pagina in cui portare chi la apre da Guida
//     all'app (null = non c'è, per esempio nessun allenamento ancora fatto:
//     allora si legge dove si è);
//   - `punta` di un passo: il pezzo della pagina da accendere. Un testo che si
//     legge a schermo ("Aggiungi") o un selettore CSS (se comincia con . # [
//     o col nome di un campo, "textarea"); un elenco = il primo che c'è. Non
//     trovato, il passo resta solo a parole;
//   - `scena` di un passo: una piccola animazione nella scheda
//     (components/ScenaGuida), per quello che non si può aprire per finta.
//
// ⚠️ I testi e i `punta` descrivono l'app com'è: chi cambia una funzione (o
// l'etichetta di un tasto) guarda se la sua guida è ancora vera.
// ---------------------------------------------------------------------------
import { routes } from './router'
import { schedaAttivaOra } from './pianoScheda'
import { dietaDiOggi } from './dieta'
import { chiaveAllenamento } from './fotoAllenamento'

export const GRUPPI_GUIDE = [
  { id: 'allenamento', nome: 'Allenamento' },
  { id: 'dieta', nome: 'Dieta' },
  { id: 'social', nome: 'Social' },
  { id: 'profilo', nome: 'Profilo e PT' },
  { id: 'altro', nome: 'Altro' },
]

// L'ultimo allenamento fatto, per mostrare la correzione su uno vero.
function ultimoFatto(schede) {
  let ultimo = null
  for (const s of schede || []) {
    for (const c of s.completamenti || []) {
      if (c.data && (!ultimo || c.data > ultimo.data)) ultimo = { schedaId: c.schedaId || s.id, data: c.data }
    }
  }
  return ultimo ? routes.svolto(chiaveAllenamento(ultimo)) : null
}

export const GUIDE = [
  // ------------------------------------------------------------ Allenamento
  {
    id: 'nuova-scheda',
    gruppo: 'allenamento',
    titolo: 'Creare una scheda',
    descrizione: 'Le due strade: importarla o scriverla',
    rotte: ['nuova'],
    apri: () => routes.nuova(),
    passi: [
      {
        titolo: 'Importarla',
        punta: 'Importa una scheda',
        testo:
          'Una scheda è un programma che dura settimane. Se ce l’hai già (la foto del foglio, il PDF, l’Excel o il messaggio del tuo PT, una scheda fatta con un’AI) la importi e l’app la legge.',
      },
      {
        titolo: 'Oppure scriverla',
        punta: 'Crea manualmente',
        testo: 'Da zero, esercizio per esercizio: li cerchi nella libreria e scegli serie, ripetizioni e recupero.',
      },
      {
        titolo: 'Solo per oggi?',
        testo:
          'Se vuoi solo allenarti oggi senza un programma non serve una scheda: dal + della sezione Allenamento scegli il nuovo allenamento a mano libera.',
      },
    ],
  },
  {
    id: 'importa',
    gruppo: 'allenamento',
    titolo: 'Importare la scheda del PT',
    descrizione: 'Da foto, PDF, Excel o testo, e controllare cosa ha letto l’app',
    rotte: ['importa'],
    apri: () => routes.importa(),
    passi: [
      {
        titolo: 'Una foto, un PDF o un Excel',
        punta: '.import-file',
        testo:
          'La foto del foglio del PT, uno screenshot, il suo PDF o il suo Excel: un’AI la legge e ne ricava giorni, esercizi, serie, ripetizioni e carichi. Un file alla volta; il PDF fino a 3MB. L’Excel finisce come testo nella casella qui sotto, così vedi cosa è stato letto.',
      },
      {
        titolo: 'Oppure il testo',
        punta: 'textarea',
        testo:
          'Il messaggio del PT o una scheda scritta da te: incollalo qui com’è, disordinato va bene, l’AI lo rimette in ordine.',
      },
      {
        titolo: 'Controlla prima di salvare',
        punta: 'Avanti',
        testo:
          'Con Avanti vedi cosa ha letto. Le righe non capite stanno in cima, e gli esercizi di cui ha indovinato i muscoli sono segnati da controllare: senza muscoli la scheda non si salva, perché servono al recap.',
      },
    ],
  },
  {
    id: 'editor',
    gruppo: 'allenamento',
    titolo: 'Scrivere una scheda',
    descrizione: 'Nome, durata, giorni ed esercizi',
    rotte: ['editor'],
    apri: () => routes.editor(null),
    passi: [
      {
        titolo: 'Nome e durata',
        punta: 'Nome scheda',
        testo: 'Dai un nome alla scheda e scegli quante settimane dura, oppure “Senza fine”.',
      },
      {
        titolo: 'I giorni',
        punta: 'Giorni di allenamento',
        testo: 'I giorni in cui ti alleni (toccalo di nuovo per due allenamenti lo stesso giorno, ×2) e quanti allenamenti diversi ha la scheda: Petto, Gambe, Schiena…',
      },
      {
        titolo: 'Poi gli esercizi',
        punta: 'Avanti',
        testo:
          'Con Avanti riempi un giorno alla volta: “Aggiungi esercizio”, lo cerchi nella libreria o lo scrivi, poi serie, ripetizioni, carico, recupero e muscoli. Il primo muscolo è il principale.',
      },
    ],
  },
  {
    id: 'nuovo-allenamento',
    gruppo: 'allenamento',
    titolo: 'Allenamento a mano libera',
    descrizione: 'Un allenamento solo per oggi, senza scheda',
    rotte: ['nuovo-allenamento'],
    apri: () => routes.nuovoAllenamento(),
    // ⚠️ La pagina si apre col foglio della ricerca già aperto (cercaSubito):
    // il primo passo è lì, e quello che c'è sotto non si punta.
    passi: [
      {
        titolo: 'Scegli gli esercizi',
        punta: 'input[placeholder^="Cerca: panca"]',
        testo:
          'Si apre subito la ricerca: scrivi il nome o scegli un gruppo muscolare, e tocca gli esercizi che vuoi fare oggi. Quelli già fatti stanno in cima.',
      },
      {
        titolo: 'Serie e carichi, poi via',
        testo:
          'Per ogni esercizio imposti serie, ripetizioni, carico e recupero, poi “Avvia allenamento” in fondo. Non è una scheda: non ha settimane.',
      },
      {
        titolo: 'Se ti è piaciuto',
        testo:
          'Alla fine il riepilogo ti chiede se tenerlo: se dici di sì lo ritrovi in Allenamento, pronto da rifare. In ogni caso finisce nello storico e nel calendario.',
      },
    ],
  },
  {
    id: 'scheda',
    gruppo: 'allenamento',
    titolo: 'La tua scheda',
    descrizione: 'Il giorno di oggi, cambiarlo, cominciare',
    rotte: ['scheda'],
    apri: ({ schede }) => {
      const s = schedaAttivaOra(schede)
      return s ? routes.scheda(s.id) : null
    },
    passi: [
      {
        titolo: 'Cosa c’è oggi',
        punta: 'Allenamento di oggi',
        testo: 'In cima il giorno che tocca oggi, con gli esercizi e i carichi della settimana in cui sei.',
      },
      {
        titolo: 'Cambiarla',
        punta: '[aria-label="Modifica la scheda"]',
        testo:
          'Con la penna modifichi la scheda: aggiungi o togli esercizi, cambi serie e carichi, e resta salvato.',
      },
      {
        titolo: 'Cominciare',
        punta: ['Inizia allenamento', 'Riprendi allenamento', 'Apri allenamento'],
        testo: 'Quando sei in palestra apri l’allenamento di oggi e comincia: l’app ti segue serie dopo serie.',
      },
    ],
  },
  {
    id: 'allenamento',
    gruppo: 'allenamento',
    titolo: 'Durante l’allenamento',
    descrizione: 'Serie, sforzo, carico e fine',
    rotte: ['allenamento'],
    passi: [
      {
        titolo: 'Un esercizio per schermata',
        scena: 'pista',
        testo:
          'Passi da un esercizio all’altro scorrendo di lato o con le frecce. Sotto il nome lo schema di oggi e il consiglio sul peso, da com’è andata l’ultima volta.',
      },
      {
        titolo: 'Segna ogni serie',
        scena: 'sforzo',
        testo:
          'Finita una serie tocca com’è andata: verde se avevi margine, giallo se era giusta, rosso se eri al limite. Il pallino si colora e parte il recupero. Il peso si cambia toccandolo.',
      },
      {
        titolo: 'Alla fine',
        scena: 'termina',
        testo: '“Termina” chiude l’allenamento e apre il riepilogo. Premuto per sbaglio? Dal riepilogo riprendi da dove eri.',
      },
    ],
  },
  {
    id: 'recap',
    gruppo: 'allenamento',
    titolo: 'Il recap di fine allenamento',
    descrizione: 'Modificare la card, condividerla, scegliere chi la vede',
    passi: [
      {
        titolo: 'La tua card',
        scena: 'recap-card',
        testo:
          'Il recap è la card del tuo allenamento: muscoli, esercizi, durata. Puoi cambiarne il titolo e aggiungere commento, calorie, battito e una foto o un video di sfondo.',
      },
      {
        titolo: 'Modifica',
        scena: 'recap-modifica',
        testo:
          'Il tasto Modifica sopra l’anteprima sceglie quali pezzi tenere: spunti o togli, e l’anteprima cambia subito. Poi la condividi, la scarichi o la mandi a un amico.',
      },
      {
        titolo: 'Salva e chi lo vede',
        scena: 'chi-vede',
        testo: 'Dopo “Salva” scegli chi può vedere l’allenamento: Pubblico, Solo al mio PT o Privato. Le foto seguono la stessa scelta.',
      },
    ],
  },
  {
    id: 'svolto',
    gruppo: 'allenamento',
    titolo: 'Correggere un allenamento passato',
    descrizione: 'Giorno, durata, carichi e pallini',
    rotte: ['svolto'],
    apri: ({ schede }) => ultimoFatto(schede),
    passi: [
      {
        titolo: 'Riaperto dallo storico',
        testo:
          'È lo stesso riepilogo di fine allenamento: puoi rifare la card, aggiungere foto e cambiare chi lo vede.',
      },
      {
        titolo: 'Correggi',
        scena: 'correggi',
        testo:
          'Dimenticato di premere Termina, o sbagliato un carico? Nel menu Altro del riepilogo c’è “Correggi”: giorno, ora, durata, carichi e colori delle serie. Poi “Salva le modifiche”.',
      },
    ],
  },
  {
    id: 'storico',
    gruppo: 'allenamento',
    titolo: 'Storico e calendario',
    descrizione: 'I tuoi allenamenti e quelli degli altri',
    rotte: ['storico', 'calendario'],
    apri: () => routes.storico(),
    passi: [
      {
        titolo: 'I tuoi',
        punta: 'I miei',
        testo: 'Tutti i tuoi allenamenti, anche quelli privati. Toccane uno per rivederne il recap o correggerlo.',
      },
      {
        titolo: 'Quelli degli altri',
        punta: 'Degli altri',
        testo: 'Gli allenamenti che gli iscritti hanno reso pubblici, per prendere spunto.',
      },
    ],
  },

  // ------------------------------------------------------------------ Dieta
  {
    id: 'dieta-oggi',
    gruppo: 'dieta',
    titolo: 'Segnare quello che mangi',
    descrizione: 'Scrivere, cercare o inquadrare gli alimenti',
    rotte: ['dieta-oggi'],
    apri: () => routes.dietaOggi(),
    passi: [
      {
        titolo: 'L’obiettivo di oggi',
        punta: 'Mancano',
        testo: 'Calorie e macro da raggiungere oggi: le barre si riempiono man mano che segni i pasti, e accanto vedi quanto manca.',
      },
      {
        titolo: 'Aggiungi quello che hai mangiato',
        punta: 'Aggiungi',
        testo:
          'Scrivilo come lo diresti, “150 g di pollo e una banana”, e i valori li calcola l’app. Vale anche in pezzi (“2 biscotti”). Non lo trova? “Cerca online” o il codice a barre, e la volta dopo lo riconosce da solo.',
      },
      {
        titolo: 'I consigli della dieta',
        punta: 'Consigli',
        testo: 'Qui vedi cosa dice la dieta per quel pasto, coi grammi rifatti su quello che manca, e “L’ho mangiato” lo segna in un tocco.',
      },
    ],
  },
  {
    id: 'dieta-crea',
    gruppo: 'dieta',
    titolo: 'Creare una dieta',
    descrizione: 'Dal PDF, da calorie e macro, o dai tuoi dati',
    rotte: ['dieta-crea'],
    apri: () => routes.dietaCrea(),
    passi: [
      {
        titolo: 'Da dove parti',
        punta: '.stack:has(> .menu-voce)',
        testo:
          'Dal PDF del nutrizionista, con tutti i pasti e le alternative; da calorie e macro, se i numeri li hai già; oppure dai dati del tuo profilo, e li stima l’app.',
      },
      {
        titolo: 'Non è obbligatoria',
        testo: 'Anche senza dieta puoi usare la Dieta come semplice diario: segni quello che mangi e vedi calorie e macro della giornata.',
      },
    ],
  },
  {
    id: 'dieta-importa',
    gruppo: 'dieta',
    titolo: 'Importare la dieta del nutrizionista',
    descrizione: 'Dal PDF o da un testo incollato',
    rotte: ['dieta-importa'],
    apri: () => routes.dietaImporta(),
    passi: [
      {
        titolo: 'Il PDF',
        punta: 'Da PDF o da testo incollato',
        testo: 'Carica il PDF: l’app legge i pasti e le alternative e te li mostra subito.',
      },
      {
        titolo: 'Oppure il testo',
        punta: 'Oppure incolla qui il testo',
        testo:
          'Se il PDF non si legge bene, copia il testo e incollalo qui: funziona sempre. Quello che non è stato letto bene lo sistemi a mano prima di salvare.',
      },
    ],
  },
  {
    id: 'dieta-schema',
    gruppo: 'dieta',
    titolo: 'Lo schema settimanale',
    descrizione: 'Quale piatto fare quale giorno',
    rotte: ['dieta-schema'],
    apri: ({ diete }) => {
      const d = dietaDiOggi(diete)
      return d?.id ? routes.dietaSchema(d.id) : null
    },
    passi: [
      {
        titolo: 'Ogni giorno il suo piatto',
        punta: '[aria-label="Schema della settimana"]',
        testo:
          'Per ogni giorno e pasto scrivi che tipo di piatto fare (legumi, pesce…), dal PDF o casella per casella. In Dieta il pasto proposto per primo sarà quello dello schema.',
      },
      {
        titolo: 'Salva',
        punta: 'Salva',
        testo: 'Quando la settimana è giusta, salva.',
      },
    ],
  },

  // ----------------------------------------------------------------- Social
  {
    id: 'feed',
    gruppo: 'social',
    titolo: 'Il feed',
    descrizione: 'Gli allenamenti degli altri, mi piace e commenti',
    rotte: ['feed'],
    apri: () => routes.feed(),
    passi: [
      {
        titolo: 'Per te e Amici',
        punta: '[aria-label="Quali allenamenti"]',
        testo: 'In “Per te” gli allenamenti pubblici di tutti, in “Amici” solo quelli dei tuoi amici. Si scorre in verticale, uno per schermata.',
      },
      {
        titolo: 'Mi piace',
        punta: '[aria-label="Mi piace"], [aria-label="Togli il mi piace"]',
        testo: 'Lascia un mi piace. Tocca il nome per aprire il profilo di chi l’ha fatto.',
      },
      {
        titolo: 'Commenti',
        punta: '[aria-label^="Commenti"]',
        testo:
          'Commenta, anche con una foto. I tuoi allenamenti arrivano qui solo se scegli “Pubblico” dopo averli salvati.',
      },
    ],
  },
  {
    id: 'cerca',
    gruppo: 'social',
    titolo: 'Trovare persone',
    descrizione: 'Cercare, guardare un profilo, chiedere l’amicizia',
    rotte: ['cerca'],
    apri: () => routes.cerca(),
    passi: [
      {
        titolo: 'Cerca',
        punta: 'input[placeholder^="@username"]',
        testo: 'Scrivi un pezzo dell’username (o il codice di un amico): i risultati arrivano mentre scrivi.',
      },
      {
        titolo: 'Forse li conosci',
        punta: 'Forse li conosci',
        testo:
          'Persone che potresti conoscere. Apri un profilo per vedere allenamenti e schede pubbliche e chiedi l’amicizia: da amici potete scrivervi e scambiarvi schede.',
      },
    ],
  },
  {
    id: 'amici',
    gruppo: 'social',
    titolo: 'Il tuo profilo social',
    descrizione: 'Come ti vedono gli altri, codice amico, richieste',
    rotte: ['amici'],
    apri: () => routes.amici(),
    passi: [
      {
        titolo: 'Il tuo codice',
        punta: 'Il tuo codice',
        testo: 'Dallo a chi vuoi aggiungere, o manda il tuo profilo su WhatsApp. Le richieste di amicizia da accettare arrivano qui.',
      },
      {
        titolo: 'Come ti vedono',
        testo: 'Sotto c’è il tuo profilo come lo vedono gli altri. Tocca il numero degli amici per l’elenco.',
      },
    ],
  },
  {
    id: 'messaggi',
    gruppo: 'social',
    titolo: 'Messaggi',
    descrizione: 'Chat, schede e recap mandati agli amici',
    rotte: ['messaggi', 'chat'],
    apri: () => routes.messaggi(),
    passi: [
      {
        titolo: 'Scrivi a un amico',
        punta: ['[aria-label="Nuovo messaggio"]', 'Qui compaiono le chat'],
        testo: 'Puoi scrivere a chiunque sia tuo amico, anche se non vi siete mai scritti.',
      },
      {
        titolo: 'Non solo testo',
        testo:
          'Nella chat arrivano anche le schede, gli allenamenti e i recap che vi mandate. Foto e video invece spariscono dopo 24 ore.',
      },
    ],
  },

  // --------------------------------------------------------- Profilo e PT
  {
    id: 'profilo',
    gruppo: 'profilo',
    titolo: 'Il profilo',
    descrizione: 'Dati, foto, PT, colori e account',
    rotte: ['profilo'],
    apri: () => routes.profilo(),
    passi: [
      {
        titolo: 'Tutto quello che riguarda te',
        punta: 'I miei dati',
        testo: 'I tuoi dati fisici, le foto dei progressi, i colori dell’app e l’account.',
      },
      {
        titolo: 'Il tuo PT',
        punta: 'Personal trainer',
        testo:
          'Qui inserisci il codice del tuo PT: vedrà i tuoi allenamenti, solo quelli che decidi tu. Sei un PT? Da qui attivi l’account PT.',
      },
    ],
  },
  {
    id: 'dati',
    gruppo: 'profilo',
    titolo: 'I tuoi dati',
    descrizione: 'Peso, altezza, obiettivo: a cosa servono',
    rotte: ['dati'],
    apri: () => routes.datiFisici(),
    passi: [
      {
        titolo: 'Le tue calorie',
        punta: ['Le tue calorie', 'Il tuo corpo'],
        testo: 'Da qui l’app calcola le calorie degli allenamenti e quelle consigliate per la dieta. Cambiano mentre scrivi.',
      },
      {
        titolo: 'Il tuo corpo',
        punta: 'Il tuo corpo',
        testo: 'Sesso, età, peso, altezza, quanto ti muovi e il tuo obiettivo. Li cambi qui e valgono dappertutto.',
      },
    ],
  },
  {
    id: 'foto',
    gruppo: 'profilo',
    titolo: 'Le foto dei progressi',
    descrizione: 'Il check fisico, privato finché non decidi',
    rotte: ['foto'],
    apri: () => routes.foto(),
    passi: [
      {
        titolo: 'Il tuo check fisico',
        punta: 'Giorno del check',
        testo:
          'Scegli il giorno del check, se vuoi scrivi una nota (il peso, la fase) e carica foto o video. Rifallo ogni tanto per vedere come cambi.',
      },
      {
        titolo: 'Private, una per una',
        punta: ['Ogni scatto parte privato', 'Le vedi solo tu'],
        testo:
          'Ogni foto nasce privata. Col lucchetto sulla miniatura la fai vedere al tuo PT, una alla volta: puoi mostrargli una foto e non un’altra.',
      },
    ],
  },
  {
    id: 'lavoro',
    gruppo: 'profilo',
    titolo: 'Lavorare come PT',
    descrizione: 'Atleti, schede di lavoro e vetrina',
    rotte: ['lavoro'],
    soloPt: true,
    apri: () => routes.lavoro(),
    passi: [
      {
        titolo: 'I tuoi atleti',
        punta: 'Atleti',
        testo: 'Le richieste da accettare e i tuoi atleti, con a che punto è ognuno.',
      },
      {
        titolo: 'Le schede di lavoro',
        punta: 'Schede di lavoro',
        testo: 'Le schede che prepari per mandarle agli atleti.',
      },
      {
        titolo: 'Personale e Lavoro',
        testo:
          'Con l’interruttore in cima alla Home passi da PT ad atleta: anche tu ti alleni come tutti. Gli allenamenti dei tuoi atleti li vedi in Social, nella linguetta Atleti.',
      },
    ],
  },

  // ------------------------------------------------------------------ Altro
  {
    id: 'esercizi',
    gruppo: 'altro',
    titolo: 'La libreria degli esercizi',
    descrizione: 'Tutte le varianti, per muscolo, in 3D',
    rotte: ['esercizi', 'esercizi-gruppo'],
    apri: () => routes.esercizi(),
    passi: [
      {
        titolo: 'Cerca',
        punta: 'input[placeholder="Cerca un esercizio"]',
        testo: 'Cerca un esercizio per nome, o scegli un gruppo muscolare qui sotto.',
      },
      {
        titolo: 'In 3D',
        testo:
          'Ogni variante ha la figura in 3D che mostra il movimento e i muscoli che lavorano. Sono gli stessi esercizi che cerchi quando scrivi una scheda.',
      },
    ],
  },
  {
    // L'id è cambiato con le due sezioni: così chi aveva visto la vecchia la rivede una volta.
    id: 'schede-community',
    gruppo: 'altro',
    titolo: 'Le schede della community',
    descrizione: 'Amici o tutti, cercare per esercizio e copiare una scheda',
    rotte: ['schede-generali'],
    apri: () => routes.schedeGenerali(),
    passi: [
      {
        titolo: 'Amici o tutti',
        punta: '.segmented[aria-label="Di chi"]',
        testo: 'In “Amici” le schede pubbliche dei tuoi amici, in “Tutti” quelle di chiunque usi l’app.',
      },
      {
        titolo: 'Per prendere spunto',
        punta: 'input[placeholder^="Cerca un esercizio"]',
        testo: 'Cerca per esercizio e filtra per giorni e durata.',
      },
      {
        titolo: 'Giorno per giorno',
        testo: 'Aprendo una scheda la vedi un allenamento alla volta, come quando la scrivi: tocca un giorno in alto per passare all’altro.',
      },
      {
        titolo: 'Copiala',
        testo: '“Copia nelle mie schede”: parte dalla prima settimana, e decidi tu se seguirla.',
      },
    ],
  },
]

const PER_ID = new Map(GUIDE.map((g) => [g.id, g]))

export function guida(id) {
  return PER_ID.get(id) || null
}

// La guida della pagina in cui si è entrati. In modalità PT la Home è Lavoro.
export function guidaDellaRotta(nome, modoPt = false) {
  if (modoPt && nome === 'inizio') return guida('lavoro')
  return GUIDE.find((g) => g.rotte?.includes(nome)) || null
}

// La chiave nelle preferenze (`avvisi`) che dice che una guida è stata vista.
export const chiaveGuida = (id) => `guida-${id}`
