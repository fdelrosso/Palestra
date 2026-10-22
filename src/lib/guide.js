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
// ⚠️ I testi descrivono l'app com'è: chi cambia una funzione guarda se la sua
// guida è ancora vera.
// ---------------------------------------------------------------------------

export const GRUPPI_GUIDE = [
  { id: 'allenamento', nome: 'Allenamento' },
  { id: 'dieta', nome: 'Dieta' },
  { id: 'social', nome: 'Social' },
  { id: 'profilo', nome: 'Profilo e PT' },
  { id: 'altro', nome: 'Altro' },
]

export const GUIDE = [
  // ------------------------------------------------------------ Allenamento
  {
    id: 'nuova-scheda',
    gruppo: 'allenamento',
    titolo: 'Creare una scheda',
    descrizione: 'Le due strade: incollarla o scriverla',
    rotte: ['nuova'],
    passi: [
      {
        titolo: 'Due strade',
        testo:
          'Una scheda è un programma che dura settimane. Puoi IMPORTARLA incollando il testo (il messaggio del tuo PT, una scheda scritta da un’AI o da te) oppure CREARLA a mano, esercizio per esercizio.',
      },
      {
        titolo: 'Solo per oggi?',
        testo:
          'Se vuoi solo allenarti oggi senza un programma, non serve una scheda: dalla sezione Allenamento scegli l’allenamento a mano libera.',
      },
    ],
  },
  {
    id: 'importa',
    gruppo: 'allenamento',
    titolo: 'Importare la scheda del PT',
    descrizione: 'Incollare il testo e controllare cosa ha letto l’app',
    rotte: ['importa'],
    passi: [
      {
        titolo: 'Incolla il testo',
        testo:
          'Copia la scheda da dove ce l’hai e incollala: l’app riconosce giorni, esercizi, serie, ripetizioni e carichi. Accanto trovi il formato che legge meglio, con un esempio.',
      },
      {
        titolo: 'Un messaggio disordinato?',
        testo:
          'C’è un testo già pronto da dare a un’AI (ChatGPT o simili) insieme al messaggio del PT: te lo riscrive nel formato giusto, e tu lo incolli qui.',
      },
      {
        titolo: 'Controlla prima di salvare',
        testo:
          'Le righe che l’app non ha capito stanno in cima, e gli esercizi di cui ha indovinato i muscoli sono segnati da controllare. Finché ogni esercizio non ha i suoi muscoli la scheda non si salva: servono al recap.',
      },
    ],
  },
  {
    id: 'editor',
    gruppo: 'allenamento',
    titolo: 'Scrivere una scheda',
    descrizione: 'Giorni, esercizi, serie e muscoli',
    rotte: ['editor'],
    passi: [
      {
        titolo: 'Giorni ed esercizi',
        testo:
          'Dai un nome alla scheda e scegli quante settimane dura. Poi aggiungi i giorni (Petto, Gambe…) e in ogni giorno gli esercizi: cercali nella libreria o scrivi il nome tu.',
      },
      {
        titolo: 'Per ogni esercizio',
        testo:
          'Serie, ripetizioni, carico e recupero, e i muscoli che lavora. Il primo muscolo è quello principale: i dip, per esempio, sono petto e tricipiti.',
      },
      {
        titolo: 'Salva',
        testo:
          'Senza muscoli un esercizio non si salva: sono quelli che si accendono nel recap. Dopo, la scheda la ritrovi in Allenamento e la cambi quando vuoi.',
      },
    ],
  },
  {
    id: 'nuovo-allenamento',
    gruppo: 'allenamento',
    titolo: 'Allenamento a mano libera',
    descrizione: 'Un allenamento solo per oggi, senza scheda',
    rotte: ['nuovo-allenamento'],
    passi: [
      {
        titolo: 'Solo per oggi',
        testo:
          'Scrivi gli esercizi che vuoi fare adesso, con serie, ripetizioni, carico e recupero, e avvialo. Non è una scheda: non ha settimane.',
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
    titolo: 'Il giorno della scheda',
    descrizione: 'Guardare il giorno, cambiarlo, cominciare',
    rotte: ['scheda'],
    passi: [
      {
        titolo: 'Cosa c’è oggi',
        testo:
          'Qui vedi gli esercizi del giorno con serie, ripetizioni e carichi della settimana in cui sei.',
      },
      {
        titolo: 'Cambiare e cominciare',
        testo:
          'Con la penna in alto modifichi gli esercizi del giorno: aggiungi, togli, cambi serie e carichi, e resta salvato nella scheda. Quando sei pronto, “Inizia allenamento”.',
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
        testo:
          'Passi da un esercizio all’altro scorrendo di lato o con le frecce. Sotto il nome trovi lo schema di oggi e il consiglio sul peso, ricavato da com’è andata l’ultima volta.',
      },
      {
        titolo: 'Segna ogni serie',
        testo:
          'Finita una serie, tocca come è andata: verde se avevi margine, giallo se era giusta, rosso se eri al limite. Il pallino si colora e parte il recupero. Il peso si cambia toccandolo, solo per oggi o anche nella scheda.',
      },
      {
        titolo: 'Alla fine',
        testo:
          '“Termina” chiude l’allenamento e apre il riepilogo. Premuto per sbaglio? Dal riepilogo puoi riprendere da dove eri.',
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
        testo:
          'Il recap è la card del tuo allenamento: muscoli allenati, esercizi, durata. Puoi cambiarne il titolo e aggiungere commento, calorie, battito e una foto o un video di sfondo.',
      },
      {
        titolo: 'Modifica',
        testo:
          'Il tasto Modifica sopra l’anteprima sceglie quali pezzi tenere sulla card: spunti o togli, e l’anteprima si aggiorna subito. Poi la condividi, la scarichi o la mandi a un amico.',
      },
      {
        titolo: 'Salva e chi lo vede',
        testo:
          'Dopo “Salva” scegli chi può vedere l’allenamento: Pubblico, Solo al mio PT o Privato. Le foto seguono la stessa scelta.',
      },
    ],
  },
  {
    id: 'svolto',
    gruppo: 'allenamento',
    titolo: 'Correggere un allenamento passato',
    descrizione: 'Giorno, durata, carichi e pallini',
    rotte: ['svolto'],
    passi: [
      {
        titolo: 'Riaperto dallo storico',
        testo:
          'È lo stesso riepilogo di fine allenamento: puoi rifare la card, aggiungere foto e cambiare chi lo vede.',
      },
      {
        titolo: 'Correggi',
        testo:
          'Ti sei dimenticato di premere Termina, o hai sbagliato un carico? Nel menu Altro c’è “Correggi”: giorno, ora, durata, carichi e colori delle serie. Poi “Salva le modifiche”.',
      },
    ],
  },
  {
    id: 'storico',
    gruppo: 'allenamento',
    titolo: 'Storico e calendario',
    descrizione: 'I tuoi allenamenti e quelli degli altri',
    rotte: ['storico', 'calendario'],
    passi: [
      {
        titolo: 'I tuoi e quelli degli altri',
        testo:
          'In “I miei” ci sono tutti i tuoi allenamenti, anche quelli privati. In “Degli altri” quelli che gli iscritti hanno reso pubblici, per prendere spunto.',
      },
      {
        titolo: 'Riaprirli',
        testo: 'Tocca un allenamento per rivederne il recap, correggerlo o cambiare chi lo vede.',
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
    passi: [
      {
        titolo: 'L’obiettivo di oggi',
        testo:
          'In cima calorie e macro da raggiungere oggi: le barre si riempiono man mano che segni i pasti. Accanto a ogni macro, quanto manca.',
      },
      {
        titolo: 'Scrivilo come lo diresti',
        testo:
          'In ogni pasto tocca “+ Aggiungi” e scrivi cosa hai mangiato, per esempio “150 g di pollo e una banana”: i valori li calcola l’app. Vale anche in pezzi (“2 biscotti”): il peso di un pezzo te lo chiede una volta e se lo ricorda.',
      },
      {
        titolo: 'Non lo trova?',
        testo:
          'Tocca “Cerca online” per i prodotti veri, marca compresa, o inquadra il codice a barre. Quello che trovi resta fra i tuoi cibi, e la volta dopo lo riconosce da solo. Con “Consigli” vedi cosa dice la dieta per quel pasto, e “L’ho mangiato” lo segna in un tocco.',
      },
    ],
  },
  {
    id: 'dieta-crea',
    gruppo: 'dieta',
    titolo: 'Creare una dieta',
    descrizione: 'Dal PDF, da calorie e macro, o dai tuoi dati',
    rotte: ['dieta-crea'],
    passi: [
      {
        titolo: 'Da dove parti',
        testo:
          'Dal PDF del nutrizionista, con tutti i pasti e le alternative; da calorie e macro, se i numeri li hai già; oppure dai dati del tuo profilo, e li stima l’app.',
      },
      {
        titolo: 'Non è obbligatoria',
        testo:
          'Anche senza dieta puoi usare la Dieta come semplice diario: segni quello che mangi e vedi calorie e macro della giornata.',
      },
    ],
  },
  {
    id: 'dieta-importa',
    gruppo: 'dieta',
    titolo: 'Importare la dieta del nutrizionista',
    descrizione: 'Dal PDF o da un testo incollato',
    rotte: ['dieta-importa'],
    passi: [
      {
        titolo: 'PDF o testo',
        testo:
          'Carica il PDF: l’app legge i pasti e le alternative e te li mostra subito. Se il PDF non si legge bene, copia il testo e incollalo nel campo: funziona sempre.',
      },
      {
        titolo: 'Correggi e salva',
        testo:
          'Quello che non è stato letto bene lo sistemi a mano prima di salvare. Se carichi la tabella dei giorni della settimana, va nello schema settimanale della dieta.',
      },
    ],
  },
  {
    id: 'dieta-schema',
    gruppo: 'dieta',
    titolo: 'Lo schema settimanale',
    descrizione: 'Quale piatto fare quale giorno',
    rotte: ['dieta-schema'],
    passi: [
      {
        titolo: 'Ogni giorno il suo piatto',
        testo:
          'Per ogni giorno e pasto scrivi che tipo di piatto fare (legumi, pesce…), dal PDF o casella per casella. In Dieta il pasto proposto per primo sarà quello dello schema.',
      },
      {
        titolo: 'Si salva in alto',
        testo: 'Guarda la settimana nella griglia e salva col tasto in alto quando è giusta.',
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
    passi: [
      {
        titolo: 'Un allenamento per schermata',
        testo:
          'Scorri in verticale. In “Per te” ci sono gli allenamenti pubblici di tutti, in “Amici” solo quelli dei tuoi amici.',
      },
      {
        titolo: 'Interagisci',
        testo:
          'Metti mi piace, commenta (anche con una foto), condividi un post o segnalalo se non va bene. Tocca il nome per aprire il profilo di chi l’ha fatto.',
      },
      {
        titolo: 'I tuoi',
        testo:
          'I tuoi allenamenti finiscono qui solo se scegli “Pubblico” dopo averli salvati. Le foto le aggiungi dal riepilogo, non da qui.',
      },
    ],
  },
  {
    id: 'cerca',
    gruppo: 'social',
    titolo: 'Trovare persone',
    descrizione: 'Cercare, guardare un profilo, chiedere l’amicizia',
    rotte: ['cerca'],
    passi: [
      {
        titolo: 'Cerca per username',
        testo:
          'Scrivi un pezzo dell’username e i risultati arrivano mentre scrivi. Sotto ci sono persone che potresti conoscere.',
      },
      {
        titolo: 'Il profilo',
        testo:
          'Apri un profilo per vedere i suoi allenamenti e le schede pubbliche, e chiedi l’amicizia: diventati amici, potete scrivervi e scambiarvi schede.',
      },
    ],
  },
  {
    id: 'amici',
    gruppo: 'social',
    titolo: 'Il tuo profilo social',
    descrizione: 'Come ti vedono gli altri, codice amico, richieste',
    rotte: ['amici'],
    passi: [
      {
        titolo: 'Come ti vedono',
        testo:
          'Questo è il tuo profilo come lo vedono gli altri. Tocca il numero degli amici per l’elenco.',
      },
      {
        titolo: 'Codice e richieste',
        testo:
          'Il tuo codice amico lo dai a chi vuoi aggiungere, o lo condividi su WhatsApp. Le richieste di amicizia da accettare arrivano qui.',
      },
    ],
  },
  {
    id: 'messaggi',
    gruppo: 'social',
    titolo: 'Messaggi',
    descrizione: 'Chat, schede e recap mandati agli amici',
    rotte: ['messaggi', 'chat'],
    passi: [
      {
        titolo: 'Scrivi a un amico',
        testo: 'Puoi scrivere a chiunque sia tuo amico, anche se non vi siete mai scritti: toccalo e si apre la chat.',
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
    passi: [
      {
        titolo: 'Tutto quello che riguarda te',
        testo:
          'I tuoi dati fisici, le foto dei progressi, il tuo personal trainer, i colori dell’app e l’account.',
      },
      {
        titolo: 'Il tuo PT',
        testo:
          'Da “Personal trainer” inserisci il codice del tuo PT: vedrà i tuoi allenamenti, solo quelli che decidi tu. Sei un PT? Qui attivi l’account PT.',
      },
    ],
  },
  {
    id: 'dati',
    gruppo: 'profilo',
    titolo: 'I tuoi dati',
    descrizione: 'Peso, altezza, obiettivo: a cosa servono',
    rotte: ['dati'],
    passi: [
      {
        titolo: 'A cosa servono',
        testo:
          'Sesso, età, peso, altezza, quanto ti muovi e il tuo obiettivo: da qui l’app calcola le calorie degli allenamenti e quelle consigliate per la dieta.',
      },
      {
        titolo: 'Una volta sola',
        testo: 'Cambiali qui e valgono dappertutto. In cima vedi subito come cambiano le calorie consigliate.',
      },
    ],
  },
  {
    id: 'foto',
    gruppo: 'profilo',
    titolo: 'Le foto dei progressi',
    descrizione: 'Il check fisico, privato finché non decidi',
    rotte: ['foto'],
    passi: [
      {
        titolo: 'Il tuo check fisico',
        testo: 'Scatta o carica le foto ogni tanto per vedere come cambi nel tempo.',
      },
      {
        titolo: 'Private, una per una',
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
    passi: [
      {
        titolo: 'Il tuo lavoro',
        testo:
          'Qui accetti le richieste degli atleti e trovi i tuoi atleti (con a che punto è ognuno), le schede di lavoro da mandare e le loro foto.',
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
    passi: [
      {
        titolo: 'Per muscolo',
        testo:
          'Scegli un gruppo muscolare e trovi tutte le varianti degli esercizi, con la figura in 3D che mostra il movimento e i muscoli che lavorano.',
      },
      {
        titolo: 'Per la scheda',
        testo: 'Sono gli stessi esercizi che cerchi quando scrivi una scheda o un allenamento.',
      },
    ],
  },
  {
    id: 'schede-generali',
    gruppo: 'altro',
    titolo: 'Le schede degli altri',
    descrizione: 'Cercare per esercizio e copiare una scheda',
    rotte: ['schede-generali'],
    passi: [
      {
        titolo: 'Per prendere spunto',
        testo: 'Le schede che gli iscritti hanno reso pubbliche: cerca per esercizio e filtra.',
      },
      {
        titolo: 'Copiala',
        testo:
          'Se una ti piace la copi fra le tue: parte dalla prima settimana, e decidi tu se seguirla.',
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
