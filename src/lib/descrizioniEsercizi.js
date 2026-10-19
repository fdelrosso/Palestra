// ---------------------------------------------------------------------------
// La DESCRIZIONE di ogni esercizio della libreria (lib/eserciziLibreria):
// cosa lavora, come si fa, e l'errore da evitare. La si legge sotto
// l'animazione, nella sezione Esercizi (pages/EserciziPage).
//
// Prima c'era solo la riga di tecnica del MOVIMENTO (lib/animazioniEsercizi),
// che è condivisa: "Squat al multipower", "Box squat" e "Pendulum squat"
// dicevano tutti la stessa frase dello squat. Qui ogni esercizio ha la sua.
//
// ⚠️ La chiave è il nome ESATTO della libreria. Un esercizio nuovo senza
// descrizione ripiega sulla tecnica del movimento (`descrizioneDi`), e
// tests/gruppi.test.js controlla che non ne manchi nessuna.
// ---------------------------------------------------------------------------

import { normalizzaNome } from './eserciziLibreria'

export const DESCRIZIONI = {
  // ------------------------------------------------------------------ petto
  'Panca piana bilanciere':
    'Il fondamentale del petto, con spalle e tricipiti. Scapole strette e piedi a terra: il bilanciere scende a metà petto e risale sopra le spalle, senza rimbalzare.',
  'Panca piana manubri':
    'Come la panca piana, ma ogni braccio lavora da solo e si scende più in basso. I manubri scendono ai lati del petto e risalgono avvicinandosi, senza sbattere in alto.',
  'Panca inclinata bilanciere':
    'Sposta il lavoro sul petto alto. Panca a 30-40 gradi: il bilanciere tocca sotto le clavicole, non la gola, e i gomiti restano un po’ chiusi.',
  'Panca inclinata manubri':
    'Petto alto con più escursione della versione al bilanciere. Panca a 30-40 gradi, manubri che scendono ai lati del petto alto e salgono senza toccarsi.',
  'Panca declinata bilanciere':
    'Mette l’accento sul petto basso. Gambe bloccate e testa più in basso del bacino: il bilanciere scende alla parte bassa del petto.',
  'Chest press macchina':
    'Spinta di petto guidata, comoda per chi comincia o per finire a fondo. Schiena appoggiata e maniglie all’altezza del petto: spingi senza bloccare i gomiti.',
  'Croci ai cavi':
    'Isola il petto tenendolo in tensione per tutto il movimento. Gomiti morbidi e fermi: le mani si chiudono davanti al petto come in un abbraccio.',
  'Croci ai cavi alti':
    'Croci dall’alto verso il basso: lavorano soprattutto il petto basso. Le mani scendono e si incrociano davanti alla pancia, il busto resta fermo.',
  'Croci ai cavi bassi':
    'Croci dal basso verso l’alto: lavorano soprattutto il petto alto. Le mani salgono davanti fino all’altezza delle spalle, senza alzare le spalle.',
  'Croci su panca piana manubri':
    'Allunga e isola il petto. Braccia quasi tese che si aprono a semicerchio fino a sentire tirare il petto: se tira la spalla sei sceso troppo.',
  'Croci su panca inclinata manubri':
    'Le croci con manubri, spostate sul petto alto. Panca a 30 gradi, gomiti morbidi, apri fino all’altezza della panca e richiudi sopra il petto.',
  'Pectoral machine (pec deck)':
    'Isolamento del petto alla macchina, molto sicuro. Avambracci o mani sui cuscinetti: chiudi stringendo il petto, le spalle restano basse.',
  'Spinte al multipower (Smith)':
    'La panca piana con la sbarra guidata: niente equilibrio da gestire, si spinge e basta. Utile per carichi alti senza compagno; la barra scende a metà petto.',
  'Dips alle parallele (petto)':
    'Spinta a corpo libero per petto basso e tricipiti. Busto inclinato in avanti e gomiti un po’ aperti: scendi finché le spalle sono sotto i gomiti.',
  'Piegamenti (push-up)':
    'Il classico a corpo libero per petto, spalle e tricipiti. Corpo dritto dalla testa ai talloni, mani poco più larghe delle spalle: scende il petto, non il bacino.',
  'Pullover con manubrio':
    'Allunga petto e dorsali insieme. Sdraiato sulla panca, manubrio tenuto a braccia quasi tese: va dietro la testa e torna sopra il petto.',
  'Panca declinata manubri':
    'Petto basso con i manubri, che permettono più escursione. Panca declinata, manubri che scendono ai lati della parte bassa del petto.',
  'Panca inclinata al multipower':
    'Petto alto con la sbarra guidata. Panca a 30-40 gradi sotto la barra, in modo che scenda appena sotto le clavicole.',
  'Panca piana con fermo (paused)':
    'Panca piana con una pausa di 1-2 secondi col bilanciere sul petto. Toglie il rimbalzo e costruisce forza nel punto più duro della spinta.',
  'Floor press bilanciere':
    'Panca sdraiati a terra: i gomiti si fermano sul pavimento, metà escursione. Lavora molto i tricipiti ed è gentile con le spalle.',
  'Chest press inclinata macchina':
    'La chest press con la spinta verso l’alto: petto alto guidato. Schiena ferma sullo schienale, spingi in alto e in avanti.',
  'Hammer strength chest press':
    'Macchina a leve indipendenti: ogni braccio spinge per conto suo, come i manubri ma guidato. Utile per correggere un lato più debole.',
  'Croci ai cavi su panca inclinata':
    'Croci ai cavi bassi stando sdraiati su panca inclinata: petto alto in tensione costante. Gomiti morbidi, chiudi sopra il petto.',
  'Piegamenti piedi rialzati (decline push-up)':
    'Piegamenti coi piedi su un rialzo: più carico e più petto alto e spalle. Corpo sempre dritto, il petto scende verso le mani.',
  'Piegamenti mani rialzate (incline push-up)':
    'Piegamenti con le mani su una panca: più facili, ideali per imparare il gesto. Più alto è l’appoggio, meno peso spingi.',
  'Piegamenti presa larga':
    'Mani molto più larghe delle spalle: il petto lavora di più e i tricipiti meno. Non aprire troppo i gomiti per non caricare le spalle.',
  'Svend press (con disco)':
    'Disco stretto fra i palmi davanti al petto: spingi in avanti tenendolo schiacciato. Lavora il petto interno con poco carico.',
  'Landmine press':
    'Bilanciere fissato a terra da un capo: spingi l’altro in alto e in avanti. Petto alto e spalle, con un arco di movimento naturale per le articolazioni.',

  // ---------------------------------------------------------------- schiena
  'Trazioni presa prona':
    'Il fondamentale per i dorsali. Presa più larga delle spalle, palmi in avanti: parti a braccia tese e tira finché il mento supera la sbarra.',
  'Trazioni presa supina (chin-up)':
    'Trazioni coi palmi verso di te: dorsali e molto bicipite. Presa larga quanto le spalle, tira il petto verso la sbarra.',
  'Trazioni presa neutra':
    'Trazioni coi palmi che si guardano: la presa più comoda per i gomiti. Tira i gomiti verso i fianchi finché la testa supera le maniglie.',
  'Lat machine avanti':
    'L’alternativa guidata alle trazioni. Petto in fuori: la barra scende davanti fino alle clavicole, i gomiti puntano al pavimento.',
  'Lat machine presa inversa':
    'Lat machine coi palmi verso di te: dorsali bassi e bicipiti. Presa larga quanto le spalle, tira la barra al petto.',
  'Lat machine presa stretta':
    'Lat machine con il triangolo o una presa stretta: lavora lo spessore dei dorsali. Tira verso lo sterno tenendo il petto alto.',
  'Pulley basso (rematore al cavo)':
    'Rematore seduto al cavo per il centro della schiena. Busto fermo: tira le maniglie alla pancia stringendo le scapole, poi torna piano.',
  'Rematore bilanciere':
    'Il rematore classico per lo spessore della schiena. Busto inclinato a schiena piatta: il bilanciere sale all’ombelico, i gomiti vanno indietro.',
  'Rematore manubrio singolo':
    'Un braccio alla volta, appoggiato con mano e ginocchio alla panca. Il manubrio sale lungo il fianco verso l’anca, senza ruotare il busto.',
  'Rematore Pendlay':
    'Rematore col busto parallelo a terra e il bilanciere che riparte da fermo dal pavimento a ogni ripetizione. Esplosivo, niente slancio con la schiena.',
  'Rematore T-bar':
    'Rematore con il bilanciere fissato da un capo e una maniglia stretta. Permette carichi alti per il centro della schiena; petto alto, schiena piatta.',
  'Rematore alla macchina':
    'Rematore guidato col petto appoggiato: la schiena bassa riposa. Tira i gomiti indietro senza staccare il busto dal cuscino.',
  'Pullover ai cavi':
    'Isola i dorsali senza i bicipiti. Braccia tese: spingi il cavo verso le cosce con un arco, il busto non si muove.',
  'Stacco da terra':
    'Il fondamentale per la catena posteriore: schiena, glutei, femorali. Bilanciere vicino alle tibie, schiena neutra: spingi coi piedi e alzati in piedi.',
  'Stacco rumeno':
    'Lavora femorali e glutei. Gambe quasi tese: manda il bacino indietro col bilanciere che scivola lungo le cosce, finché senti tirare dietro.',
  'Hyperextension (lombari)':
    'Rinforza i lombari e i glutei. Bacino fermo sul cuscino: scendi col busto e risali fino alla linea del corpo, senza inarcarti oltre.',
  'Face pull':
    'Per la spalla posteriore e la postura. Corda all’altezza del viso: tira verso la fronte con i gomiti alti, aprendo le mani alla fine.',
  'Trazioni zavorrate':
    'Trazioni con un peso alla cintura o fra le gambe, per chi ne fa già una decina pulite. Stessa tecnica: niente slancio, scendi a braccia tese.',
  'Trazioni assistite (macchina)':
    'La macchina toglie parte del peso del corpo: il modo per arrivare alle trazioni vere. Meno contrappeso usi, più sei vicino alla trazione libera.',
  'Lat machine presa neutra':
    'Lat machine con la maniglia a palmi che si guardano: comoda per polsi e gomiti. Tira al petto portando i gomiti lungo i fianchi.',
  'Lat machine monolaterale':
    'Un braccio alla volta alla lat machine: si allunga di più in alto e si chiude di più in basso. Il busto non deve ruotare per aiutarsi.',
  'Pulley basso presa larga':
    'Pulley con una barra larga: sposta il lavoro sulla parte alta della schiena e sui deltoidi posteriori. Tira al petto basso, gomiti aperti.',
  'Rematore Yates (presa supina)':
    'Rematore col busto più alto e presa supina: più bicipite e dorsali bassi, meno stress per la schiena. Il bilanciere sale verso la pancia.',
  'Rematore al multipower':
    'Il rematore col bilanciere guidato: la traiettoria è fissa, ci si concentra sul tirare. Busto inclinato e fermo.',
  'Rematore manubri su panca inclinata (chest supported)':
    'Petto appoggiato su una panca inclinata: la schiena bassa non lavora e non si può barare col busto. Tira i manubri verso i fianchi.',
  'Rematore Meadows (landmine)':
    'Un braccio alla volta col bilanciere fissato a terra, presa sul capo del bilanciere. Tira il gomito in alto e indietro: dorsali e spalla posteriore.',
  'Seal row':
    'Sdraiato a pancia in giù su una panca alta: tiri il bilanciere fino a toccare la panca. Isolamento puro della schiena, nessuno slancio possibile.',
  'Rematore inverso (inverted row)':
    'Sotto una sbarra bassa, corpo dritto: tira il petto alla sbarra. Più i piedi sono avanti, più è difficile. Ottimo prima delle trazioni.',
  'Good morning':
    'Bilanciere sulle spalle, ginocchia appena flesse: piega il busto in avanti a schiena piatta e risali. Femorali, glutei e lombari; si comincia leggeri.',
  'Rack pull':
    'Lo stacco che parte dai supporti all’altezza delle ginocchia: solo la parte alta. Carica molto la schiena alta e la presa con meno stress per la bassa.',
  'Stacco con trap bar':
    'Stacco dentro una barra esagonale, maniglie ai fianchi. Busto più dritto e ginocchia più piegate: più facile da imparare e gentile con la schiena.',
  'Superman (lombari a terra)':
    'A pancia in giù: solleva insieme braccia, petto e gambe e tieni un istante. Rinforza i lombari a corpo libero.',

  // ------------------------------------------------------------------ gambe
  'Squat bilanciere':
    'Il re degli esercizi per le gambe: quadricipiti, glutei e tutto il tronco. Bilanciere sui trapezi, scendi come per sederti con le ginocchia in linea coi piedi.',
  'Squat frontale':
    'Squat col bilanciere davanti sulle spalle: busto più dritto e più quadricipiti. Gomiti alti per tutto il movimento, se cadono cade il bilanciere.',
  'Hack squat':
    'Squat alla macchina, schiena appoggiata a uno schienale inclinato. Lavora molto i quadricipiti; piedi più bassi sulla pedana = più quadricipite.',
  'Leg press':
    'Spinta di gambe alla pressa, schiena appoggiata. Spingi con tutta la pianta e scendi finché il bacino non si stacca; non bloccare le ginocchia in alto.',
  'Pressa 45°':
    'La leg press inclinata a 45 gradi, la più diffusa. Piedi larghi quanto le spalle: più in alto sulla pedana lavorano glutei e femorali, più in basso i quadricipiti.',
  'Affondi con manubri':
    'Gambe e glutei, una alla volta. Passo lungo: scendi in verticale finché il ginocchio dietro sfiora terra, il busto resta dritto.',
  'Affondi bulgari (split squat)':
    'Piede dietro su una panca: quasi tutto il peso sta sulla gamba davanti. Uno dei migliori per quadricipiti e glutei; scendi dritto, senza spingerti avanti.',
  'Goblet squat':
    'Squat col manubrio tenuto al petto come un calice: il peso davanti tiene il busto dritto. Il modo migliore per imparare lo squat.',
  'Leg extension':
    'Isola i quadricipiti alla macchina. Solo la tibia si muove: stendi fino a bloccare il ginocchio, tieni un istante e scendi piano.',
  'Leg curl sdraiato':
    'Isola i femorali. A pancia in giù, bacino premuto sulla panca: porta i talloni verso il sedere e scendi controllando.',
  'Leg curl seduto':
    'Femorali alla macchina da seduti, con la coscia bloccata. Spingi i talloni sotto la seduta; da seduti il femorale parte più allungato.',
  'Stacco gambe tese':
    'Come lo stacco rumeno, con le gambe ancora più tese: tutto sui femorali. Bacino indietro, schiena piatta, scendi finché la schiena resta dritta.',
  'Adductor machine':
    'Isola gli adduttori, l’interno coscia. Seduto: chiudi le ginocchia contro i cuscinetti e lascia riaprire piano.',
  'Step up':
    'Sali su un rialzo una gamba alla volta. Spingi col tallone della gamba sopra, senza rimbalzare con quella sotto: quadricipiti e glutei.',
  'Stacco sumo':
    'Stacco a piedi larghi e punte in fuori, mani dentro le ginocchia. Busto più dritto: lavora di più adduttori, glutei e quadricipiti.',
  'Squat al multipower':
    'Squat con la sbarra guidata: niente equilibrio, ci si concentra sulle gambe. Piedi un po’ avanti rispetto alla barra per scendere comodi.',
  'Squat con fermo (pause squat)':
    'Squat con una pausa di 1-2 secondi in basso, senza rilassarsi. Toglie il rimbalzo e costruisce forza nella parte più difficile.',
  'Box squat':
    'Squat fino a sedersi su un box o una panca, senza lasciarsi andare, poi si riparte. Insegna a mandare indietro il bacino e a controllare la profondità.',
  'Pendulum squat':
    'Squat alla macchina a pendolo: la schiena segue un arco guidato. Scende molto in profondità con poco carico sulla schiena: quadricipiti.',
  'Belt squat':
    'Squat col peso appeso a una cintura in vita: le gambe lavorano e la schiena non porta carico. Ottimo per chi ha fastidi lombari.',
  'Zercher squat':
    'Squat col bilanciere tenuto nell’incavo dei gomiti. Busto dritto e tanto lavoro per addome e schiena alta oltre alle gambe.',
  'Sissy squat':
    'Sulle punte, le ginocchia vanno avanti mentre il busto va indietro in linea con le cosce. Isola i quadricipiti; tieniti a un appoggio.',
  'Pistol squat':
    'Squat su una gamba sola, l’altra tesa in avanti. Richiede forza, equilibrio e mobilità della caviglia; si impara scendendo su un box.',
  'Leg press monopodalica':
    'Leg press con una gamba alla volta: fa lavorare i due lati in modo uguale. Il bacino resta appoggiato, il ginocchio in linea col piede.',
  'Pressa orizzontale':
    'La leg press da seduti, con la pedana davanti invece che in alto: carichi più leggeri e movimento più semplice. Schiena e bacino restano appoggiati allo schienale.',
  'Affondi in camminata (walking lunge)':
    'Affondi in avanti uno dopo l’altro, camminando. Passo lungo e busto dritto: glutei e quadricipiti, più tanto equilibrio.',
  'Affondi indietro (reverse lunge)':
    'Il passo va indietro invece che avanti: più gentile con le ginocchia e più glutei. Scendi finché il ginocchio dietro sfiora terra.',
  'Affondi con bilanciere':
    'Affondi col bilanciere sulle spalle: si carica di più che coi manubri. Passo lungo, scendi in verticale e tieni il busto fermo.',
  'Affondi laterali':
    'Passo largo di lato: scendi sulla gamba che piega, l’altra resta tesa. Lavora adduttori, glutei e quadricipiti.',
  'Leg extension monopodalica':
    'Leg extension una gamba alla volta: utile se un quadricipite è più debole. Stendi fino in fondo e scendi lento.',
  'Leg curl in piedi':
    'Leg curl alla macchina in piedi, una gamba alla volta: porta il tallone verso il gluteo, il bacino non si sposta.',
  'Nordic curl (femorali)':
    'In ginocchio con le caviglie bloccate: scendi in avanti col corpo dritto, frenando coi femorali più a lungo che puoi. Molto duro e ottimo contro gli infortuni.',
  'Wall sit (sedia al muro)':
    'Schiena al muro e cosce parallele a terra, come seduti su una sedia invisibile. Si tiene la posizione: brucia sui quadricipiti.',
  'Adduzioni ai cavi':
    'Cavo alla caviglia: porta la gamba davanti all’altra, il busto resta fermo. Adduttori, una gamba alla volta.',

  // ----------------------------------------------------------------- glutei
  'Hip thrust bilanciere':
    'Il fondamentale per i glutei. Scapole sulla panca e bilanciere sul bacino: spingi i fianchi in alto fino a corpo dritto, stringi i glutei e scendi.',
  'Hip thrust alla macchina':
    'L’hip thrust con il carico guidato da una macchina: niente bilanciere da sistemare. Spingi i fianchi in alto e tieni un secondo in cima.',
  'Glute bridge (ponte glutei)':
    'Il ponte a terra: la versione più semplice dell’hip thrust. Spalle a terra, piedi vicini al sedere, alza il bacino fino alla linea ginocchia-spalle.',
  'Abductor machine':
    'Isola i glutei laterali (medio e minimo). Seduto: spingi le ginocchia in fuori contro i cuscinetti e torna piano.',
  'Kickback ai cavi (glutei)':
    'Cavo alla caviglia, busto fermo: spingi la gamba indietro col gluteo. Non inarcare la schiena per andare più in alto.',
  'Glute machine (slanci indietro)':
    'Gli slanci indietro alla macchina: il gluteo spinge la pedana indietro e in alto. La schiena resta neutra, si muove solo l’anca.',
  'Abduzioni con elastico':
    'Elastico sopra le ginocchia: apri le gambe contro la resistenza. Glutei laterali, ottimo come riscaldamento.',
  'Frog pump':
    'Un ponte glutei con le piante dei piedi unite e le ginocchia aperte. Tante ripetizioni veloci per i glutei.',
  'Hip thrust monopodalico':
    'Hip thrust su una gamba sola, l’altra sollevata: più carico su un gluteo senza aggiungere pesi. Il bacino resta dritto.',
  'Hip thrust al multipower':
    'Hip thrust con la sbarra guidata: il bilanciere non scivola e si carica tanto. Stessa spinta di fianchi, fino a corpo dritto.',
  'Glute bridge monopodalico':
    'Ponte su una gamba sola, l’altra tesa: il bacino non deve inclinarsi di lato. Glutei e stabilità.',
  'Abduzioni ai cavi':
    'In piedi di fianco al cavo basso, cavo alla caviglia lontana: porta la gamba in fuori. Gluteo medio, una gamba alla volta.',
  'Abduzioni da seduto con elastico':
    'Seduti con un elastico sopra le ginocchia: apri le ginocchia e richiudi controllando. Glutei laterali senza macchina.',
  'Clamshell (conchiglia)':
    'Sdraiato sul fianco, ginocchia piegate e piedi uniti: apri il ginocchio di sopra come una conchiglia. Gluteo medio, con o senza elastico.',
  'Donkey kick (slanci a quattro zampe)':
    'A quattro zampe, ginocchio piegato a 90: spingi la pianta del piede verso il soffitto col gluteo. La schiena non si inarca.',
  'Fire hydrant':
    'A quattro zampe: apri il ginocchio piegato di lato, fino all’altezza dell’anca, senza ruotare il bacino. Gluteo medio.',
  'Reverse hyperextension':
    'Busto sdraiato su una panca alta, gambe libere: alzale tese fino alla linea del corpo. Glutei e lombari senza caricare la colonna.',
  'Cable pull through':
    'Di spalle al cavo basso, corda fra le gambe: piega i fianchi e poi spingili avanti fino a essere dritto. Insegna il movimento dell’anca: glutei e femorali.',
  'Sumo squat con manubrio':
    'Piedi larghi e punte in fuori, manubrio tenuto fra le gambe: scendi con le ginocchia aperte. Glutei e adduttori.',
  'Affondi incrociati (curtsy lunge)':
    'Affondo con la gamba dietro che incrocia dietro l’altra, come un inchino. Lavora molto il gluteo medio della gamba davanti.',

  // --------------------------------------------------------------- polpacci
  'Calf raise in piedi':
    'Il fondamentale per i polpacci. In punta di piedi il più in alto possibile, poi scendi lento: con le gambe tese lavora soprattutto il gastrocnemio.',
  'Calf raise seduto':
    'Polpacci da seduti con un cuscinetto sulle cosce: con le ginocchia piegate lavora soprattutto il soleo. Sali sulle punte e scendi fino in fondo.',
  'Calf raise alla leg press':
    'Gambe tese alla pressa, solo gli avampiedi sulla pedana: spingi di caviglia. Facile da caricare tanto; non piegare le ginocchia.',
  'Calf raise al multipower':
    'Calf raise col bilanciere guidato sulle spalle: si carica molto senza equilibrio da gestire. Avampiedi su un rialzo per scendere di più.',
  'Calf raise monopodalico':
    'Su un piede solo, l’altro sollevato: tutto il peso del corpo su un polpaccio. Una mano al muro solo per l’equilibrio.',
  'Donkey calf raise':
    'Busto piegato in avanti e appoggiato, gambe tese: sali sulle punte. Il polpaccio parte molto allungato.',
  'Calf raise con manubri':
    'Calf raise in piedi con un manubrio per mano: più carico senza macchina. Meglio con gli avampiedi su un gradino.',
  'Calf raise allo step (gradino)':
    'Avampiede sul bordo di un gradino: il tallone scende sotto il livello e poi sali più in alto che puoi. L’escursione completa è tutto.',
  'Calf raise alla hack squat':
    'Calf raise alla macchina dell’hack squat, spalle sotto i cuscinetti: gambe tese, sali sulle punte. Carico alto e schiena appoggiata.',
  'Saltelli sulle punte':
    'Piccoli rimbalzi elastici sugli avampiedi, talloni che non toccano terra. Polpacci reattivi, anche come riscaldamento.',
  'Tibialis raise (tibiali)':
    'Schiena al muro, talloni a terra: alza le punte dei piedi verso gli stinchi. Rinforza i tibiali, davanti alla gamba: aiuta caviglie e ginocchia.',

  // ----------------------------------------------------------------- spalle
  'Lento avanti bilanciere (military)':
    'Il fondamentale per le spalle. In piedi, glutei e addome stretti: il bilanciere sale dalle clavicole sopra la testa, finendo in linea con le orecchie.',
  'Lento avanti manubri':
    'La spinta sopra la testa coi manubri, da seduti o in piedi. Manubri all’altezza delle orecchie: spingi in alto e leggermente verso il centro.',
  'Arnold press':
    'Spinta coi manubri che ruotano: partono coi palmi verso di te davanti al viso e finiscono coi palmi in avanti sopra la testa. Lavora tutto il deltoide.',
  'Shoulder press macchina':
    'Spinta sopra la testa guidata, schiena appoggiata. Comoda per spingere forte senza pensare all’equilibrio; non bloccare i gomiti in alto.',
  'Alzate laterali manubri':
    'Isola il deltoide laterale, quello che allarga le spalle. Braccia quasi tese, sali fino alla linea delle spalle guidando col gomito, senza slancio.',
  'Alzate laterali ai cavi':
    'Le alzate laterali col cavo che parte dal basso dall’altro lato: tensione anche in basso. Un braccio alla volta, fino alla linea della spalla.',
  'Alzate frontali manubri':
    'Isola il deltoide anteriore. Alza davanti fino all’altezza degli occhi, senza dondolare col busto; spesso basta poco peso.',
  'Alzate posteriori (rear delt)':
    'Per il deltoide posteriore. Busto piegato in avanti: apri le braccia di lato stringendo le scapole, gomiti appena flessi.',
  'Reverse pec deck (rear delt machine)':
    'La pectoral machine al contrario: petto al cuscino, apri le braccia indietro. Deltoide posteriore, isolato e sicuro.',
  'Tirate al mento (upright row)':
    'Il bilanciere sale lungo il corpo fino al petto, i gomiti restano sopra le mani. Deltoidi e trapezi; non salire oltre il petto se senti fastidio alla spalla.',
  'Scrollate bilanciere (shrug)':
    'Per i trapezi. Braccia tese: solo le spalle salgono verso le orecchie e scendono, senza ruotarle.',
  'Scrollate manubri':
    'Le scrollate con un manubrio per lato: le mani stanno ai fianchi, movimento più libero. Su e giù, niente rotazioni.',
  'Lento dietro (behind the neck)':
    'Lento col bilanciere che scende dietro la testa. Richiede buona mobilità delle spalle: scendi solo fino alle orecchie e senza carichi eccessivi.',
  'Lento avanti al multipower':
    'Il lento con la sbarra guidata, di solito da seduti. La barra scende davanti al viso fino al mento e risale.',
  'Push press':
    'Lento in piedi con l’aiuto delle gambe: piccolo piegamento e spinta, le braccia finiscono sopra la testa. Permette carichi più alti del lento.',
  'Z press (seduto a terra)':
    'Lento seduto a terra a gambe tese, senza schienale. Niente aiuti da gambe e schiena: spalle e addome lavorano davvero.',
  'Alzate laterali alla macchina':
    'Alzate laterali guidate: braccia sui cuscinetti, sali fino alla linea delle spalle. Ottime per isolare il deltoide laterale.',
  'Alzate laterali inclinate (lean away)':
    'Una mano a un supporto e il corpo inclinato di lato: il manubrio dell’altra mano parte da più in basso. Più escursione per il deltoide laterale.',
  'Alzate frontali bilanciere':
    'Alzate frontali tenendo il bilanciere con due mani: fino all’altezza degli occhi, busto fermo.',
  'Alzate frontali con disco':
    'Alzate frontali tenendo un disco ai lati: presa neutra comoda per i polsi. Sali fino all’altezza degli occhi.',
  'Alzate frontali ai cavi':
    'Alzate frontali col cavo basso che parte da dietro: tensione costante. Un braccio o due, fino all’altezza degli occhi.',
  'Alzate posteriori ai cavi':
    'Cavi incrociati all’altezza delle spalle: apri le braccia indietro. Deltoide posteriore in tensione per tutto il movimento.',
  'Alzate posteriori su panca inclinata':
    'Petto appoggiato a una panca inclinata: apri le braccia di lato. Il busto non può aiutare, lavora solo il deltoide posteriore.',
  'Y-raise':
    'Braccia tese che salgono in diagonale a formare una Y, pollici verso l’alto. Trapezio basso e spalla: pochissimo peso.',
  'Scrollate al multipower':
    'Scrollate con la sbarra guidata: si carica tanto senza che il bilanciere scappi. Solo le spalle su e giù.',
  'Scrollate ai cavi':
    'Scrollate col cavo basso: tensione costante sui trapezi. Spalle verso le orecchie, tieni un istante in alto.',
  'Rotazioni esterne ai cavi (cuffia)':
    'Gomito incollato al fianco e piegato a 90: ruota l’avambraccio verso l’esterno. Rinforza la cuffia dei rotatori, protegge la spalla. Carichi leggeri.',

  // --------------------------------------------------------------- bicipiti
  'Curl bilanciere':
    'Il fondamentale per i bicipiti. Gomiti attaccati ai fianchi: sale solo l’avambraccio, il busto non dondola.',
  'Curl bilanciere EZ':
    'Il curl con la barra sagomata: i polsi stanno più comodi. Stessa regola: gomiti fermi e niente slancio.',
  'Curl manubri alternato':
    'Un braccio alla volta: sali ruotando il palmo verso l’alto e scendi lento. Ogni braccio lavora per conto suo.',
  'Curl manubri simultaneo':
    'Curl con entrambi i manubri insieme: più carico totale, meno concentrazione sul singolo braccio. Gomiti fermi ai fianchi.',
  'Curl a martello (hammer)':
    'Palmi che si guardano per tutta la salita: lavora il brachiale e l’avambraccio oltre al bicipite. Dà spessore al braccio.',
  'Curl concentrato':
    'Seduto, gomito appoggiato all’interno della coscia: sale solo la mano. Isolamento massimo del bicipite.',
  'Curl panca Scott (preacher)':
    'Braccia appoggiate sul leggio: non si può barare col busto. Scendi fino quasi a braccio teso, senza rimbalzare in basso.',
  'Curl ai cavi':
    'Curl al cavo basso: tiene la tensione anche col braccio teso. Gomiti fermi, non lasciar cadere il peso.',
  'Curl panca inclinata':
    'Sdraiato su panca inclinata, braccia che pendono dietro il corpo: il bicipite parte già allungato. Uno dei migliori per il capo lungo.',
  'Curl Spider':
    'Petto sulla panca inclinata, braccia che pendono dritte davanti: sale solo l’avambraccio. Contrazione fortissima in alto.',
  'Curl inverso (reverse)':
    'Curl con presa prona, palmi verso il basso: lavorano soprattutto avambracci e brachiale. Carichi più bassi del curl normale.',
  'Curl bilanciere presa larga':
    'Curl con le mani più larghe delle spalle: più lavoro sul capo corto del bicipite.',
  'Curl bilanciere presa stretta':
    'Curl con le mani strette: più lavoro sul capo lungo del bicipite.',
  'Curl 21':
    '21 ripetizioni di fila col bilanciere: 7 nella metà bassa, 7 nella metà alta, 7 complete. Tanto tempo sotto tensione con poco peso.',
  'Curl Drag':
    'Il bilanciere sale strisciando sul corpo: i gomiti vanno indietro, non avanti. Toglie la spalla dal movimento e isola il bicipite.',
  'Curl Zottman':
    'Sali col palmo in su come un curl, ruota in alto e scendi col palmo in giù. Bicipiti in salita, avambracci in discesa.',
  'Curl a martello alternato':
    'Hammer curl un braccio alla volta, palmi che si guardano. Brachiale e avambraccio, senza ruotare il polso.',
  'Curl a martello ai cavi (corda)':
    'Hammer curl con la corda al cavo basso: tensione continua per brachiale e avambraccio. Gomiti fermi.',
  'Curl Bayesian (cavo dietro)':
    'Di spalle al cavo basso, braccio leggermente dietro il corpo: il bicipite lavora molto allungato. Un braccio alla volta.',
  'Curl concentrato ai cavi':
    'Curl concentrato con la maniglia del cavo: tensione anche in basso. Gomito fermo, sale solo la mano.',
  'Curl alla macchina':
    'Curl guidato con le braccia appoggiate: isolamento facile e sicuro. Scendi fino quasi in fondo e risali senza strappi.',
  'Curl panca Scott manubrio singolo':
    'Il curl alla panca Scott un braccio alla volta col manubrio: ogni braccio fa la sua parte. Scendi controllando.',

  // -------------------------------------------------------------- tricipiti
  'Push down ai cavi (corda)':
    'Il più usato per i tricipiti. Gomiti fermi ai fianchi: spingi la corda in basso e aprila alla fine, poi risali piano.',
  'Push down ai cavi (barra)':
    'Push down con la barra dritta o a V: si carica un po’ di più che con la corda. Gomiti incollati al corpo.',
  'Push down presa inversa':
    'Push down coi palmi verso l’alto: insiste sul capo mediale del tricipite. Carichi più bassi, gomiti fermi.',
  'French press bilanciere EZ':
    'Sdraiato, gomiti stretti e fermi: solo gli avambracci scendono verso la fronte o dietro la testa. Lavora molto il capo lungo.',
  'French press manubri':
    'La french press coi manubri, palmi che si guardano: più comoda per gomiti e polsi. Gomiti puntati al soffitto e fermi.',
  'Estensioni sopra la testa ai cavi':
    'Di spalle al cavo, braccia sopra la testa: stendi in avanti e in alto. Il tricipite lavora allungato, ottimo per il capo lungo.',
  'Estensione manubrio singolo dietro la testa':
    'Manubrio tenuto con due mani dietro la testa: stendi le braccia verso l’alto. Gomiti che puntano in avanti, non aperti.',
  'Dips alle parallele':
    'Dips col busto dritto: lavorano soprattutto i tricipiti. Scendi finché i gomiti sono a 90 gradi e spingi su a braccia tese.',
  'Dips tra due panche':
    'Mani sulla panca dietro di te e piedi avanti: scendi col bacino vicino alla panca. Più facile delle parallele.',
  'Panca piana presa stretta':
    'Panca piana con le mani larghe quanto le spalle e i gomiti stretti al corpo: la spinta passa ai tricipiti.',
  'Kickback manubri':
    'Busto piegato e braccio fermo lungo il fianco: stendi indietro solo l’avambraccio. Poco peso, contrazione forte in fondo.',
  'Kickback ai cavi':
    'Il kickback col cavo basso: la tensione resta anche col braccio piegato. Braccio fermo, stendi indietro.',
  'Push down monolaterale ai cavi':
    'Push down un braccio alla volta con la maniglia: corregge le differenze fra i due lati. Gomito fermo al fianco.',
  'Skull crusher su panca declinata':
    'French press su panca declinata: i tricipiti restano in tensione anche in alto. Gomiti fermi, il bilanciere scende verso la fronte.',
  'Tate press':
    'Sdraiato coi manubri sopra il petto: i gomiti si aprono e i manubri scendono a toccare il petto, poi stendi. Isola il tricipite.',
  'JM press':
    'Un ibrido fra panca stretta e french press: il bilanciere scende verso il collo coi gomiti avanti, poi si spinge. Tanto carico sui tricipiti.',
  'Panca presa stretta al multipower':
    'La panca stretta con la sbarra guidata: si spinge solo, senza equilibrio da gestire. Gomiti stretti.',
  'Estensioni sopra la testa con bilanciere EZ':
    'Estensioni sopra la testa con la barra sagomata, in piedi o seduti. Gomiti stretti e fermi, il bilanciere scende dietro la testa.',
  'Tricipiti alla macchina (dip machine)':
    'I dips alla macchina, seduti: si spinge giù senza sollevare il corpo. Tricipiti guidati e regolabili.',
  'Dips alla macchina assistita':
    'Dips alle parallele con la macchina che toglie parte del peso: il passo prima dei dips liberi.',
  'Piegamenti presa stretta (diamond push-up)':
    'Piegamenti con le mani vicine sotto il petto, a formare un diamante: lavorano soprattutto i tricipiti. Gomiti lungo i fianchi.',

  // ----------------------------------------------------------------- addome
  'Crunch a terra':
    'Il classico per gli addominali. Stacca solo le spalle da terra arrotolando la pancia: la schiena bassa resta giù, le mani non tirano la testa.',
  'Crunch inverso':
    'Spalle a terra: sono le ginocchia a salire verso il petto arrotolando il bacino. Insiste sulla parte bassa dell’addome.',
  'Crunch ai cavi':
    'In ginocchio sotto la carrucola: chiudi le costole verso il bacino. Si carica il peso; non tirare con le braccia.',
  Plank:
    'Gomiti sotto le spalle e corpo in linea dai talloni alla testa: si tiene la posizione. Addome e glutei stretti, il bacino non cede.',
  'Plank laterale':
    'Su un gomito e sul fianco del piede: il bacino resta alto. Lavora gli obliqui e i fianchi.',
  'Russian twist':
    'Seduto in equilibrio coi piedi sollevati: ruota il busto portando le mani da un fianco all’altro. Obliqui.',
  'Sit-up':
    'Sali con tutto il busto fino a sederti e scendi controllando. Lavora l’addome e i flessori dell’anca.',
  'Leg raise a terra':
    'Schiena a terra: le gambe tese salgono fino alla verticale e scendono senza toccare. Addome basso; se la schiena si inarca, piega un po’ le gambe.',
  'Leg raise alla sbarra':
    'Appeso alla sbarra: alza le gambe tese senza dondolare. Uno dei più duri per l’addome.',
  'Bicycle crunch':
    'Mani dietro la testa: porta il gomito verso il ginocchio opposto mentre l’altra gamba si stende, e alterna. Obliqui e addome insieme.',
  'Mountain climber':
    'In posizione di plank: porta un ginocchio al petto e cambia, veloce ma controllato. Addome e fiato.',
  'Ab wheel (ruota)':
    'In ginocchio: rotola in avanti tenendo la pancia tirata, la schiena non si inarca, poi torna indietro. Tra i più efficaci per l’addome.',
  'Hollow hold':
    'Schiena bassa incollata a terra, spalle e gambe sollevate: il corpo è una barchetta e si tiene. Addome profondo.',
  'V-up':
    'Gambe e busto salgono insieme a formare una V, le mani vanno verso i piedi. Addome completo, serve controllo.',
  'Crunch alla macchina':
    'Crunch seduti alla macchina, carico regolabile: arrotola il busto verso il bacino. Non spingere con le braccia.',
  'Crunch su fitball':
    'Crunch con la schiena appoggiata a una fitball: l’addome parte più allungato. Arrotola fino a metà, poi torna.',
  'Crunch obliqui':
    'Crunch portando una spalla verso il ginocchio opposto. Lavora gli obliqui; il gomito accompagna, non tira.',
  'Plank con tocco spalle (shoulder tap)':
    'Plank a braccia tese: tocca la spalla opposta con una mano e alterna. Il bacino non deve oscillare: addome anti-rotazione.',
  'Dead bug':
    'Sdraiato, braccia in alto e gambe a 90: stendi un braccio e la gamba opposta, poi cambia. La schiena resta incollata a terra.',
  'Bird dog':
    'A quattro zampe: allunga un braccio in avanti e la gamba opposta indietro, bacino fermo. Stabilità di addome e schiena.',
  'Pallof press (anti-rotazione)':
    'Di fianco al cavo, maniglia al petto: spingi le mani in avanti e non lasciarti ruotare. L’addome lavora per resistere.',
  'Woodchopper ai cavi':
    'Dal cavo alto, le mani scendono in diagonale davanti al corpo ruotando il busto, come un colpo d’ascia. Obliqui.',
  'Toes to bar':
    'Appeso alla sbarra: porta le punte dei piedi a toccarla, senza slancio. Addome completo, serve presa.',
  'Ginocchia al petto alla sbarra (knee raise)':
    'Appeso alla sbarra: porta le ginocchia al petto arrotolando il bacino. Il passo prima del leg raise a gambe tese.',
  'Leg raise alla captain chair':
    'Avambracci sui cuscinetti e schiena allo schienale: alza le ginocchia o le gambe verso il petto. Addome basso senza problemi di presa.',
  'Dragon flag':
    'Spalle sulla panca e mani dietro la testa: il corpo sale e scende rigido come un asse. Molto avanzato.',
  'Sforbiciate (flutter kick)':
    'Sdraiato, gambe tese poco sopra terra: piccoli calci alternati. La schiena bassa resta giù.',
  'Side bend con manubrio':
    'Manubrio in una mano: il busto si piega di lato e risale, senza ruotare. Obliqui; un lato alla volta.',
  'L-sit':
    'Braccia tese sulle parallele o a terra: gambe tese avanti, parallele al pavimento, e si tiene. Addome, flessori dell’anca e tricipiti.',

  // ----------------------------------------------------------------- cardio
  'Tapis roulant (corsa)':
    'Corsa sul tapis roulant. Passo sotto il bacino e spalle rilassate; un po’ di pendenza (1%) simula la corsa all’aperto.',
  'Camminata in salita':
    'Camminata sul tapis con pendenza alta: tanto lavoro per gambe e glutei con poco impatto. Non tenerti alle maniglie.',
  Cyclette:
    'Pedalata sulla bici da camera. Sella all’altezza dell’anca: la gamba resta appena piegata col pedale in basso.',
  Ellittica:
    'Cardio senza impatto: i piedi non lasciano mai le pedane. Spingi e tira anche con le braccia per coinvolgere tutto il corpo.',
  'Vogatore (rowing)':
    'Cardio per tutto il corpo. Prima spingono le gambe, poi si apre il busto, per ultime tirano le braccia; al ritorno l’ordine si inverte.',
  'Corda per saltare':
    'Piccoli saltelli sull’avampiede: girano i polsi, non le braccia. Coordinazione, polpacci e fiato.',
  'Stair climber (scalatore)':
    'Gradini che scorrono: busto dritto e tutto il piede appoggiato. Non appenderti alle maniglie.',
  'HIIT sprint':
    'Scatti brevi alla massima velocità alternati a recuperi: per esempio 20 secondi a tutta e 40 lenti. Allena il fiato in poco tempo.',
  'Bici da spinning':
    'Pedalata intensa sulla bici da spinning, con la resistenza che si regola. Sella e manubrio a misura; schiena neutra.',
  'Camminata veloce':
    'Passo svelto in piano, braccia che accompagnano: si appoggia sempre prima il tallone. Cardio leggero adatto a tutti.',
  'Air bike (assault bike)':
    'Bici con le braccia: mentre le gambe pedalano, le braccia spingono e tirano le maniglie. Durissima negli intervalli.',
  'Ski erg':
    'Tiri giù le maniglie dall’alto piegando i fianchi, come una spinta con le racchette da sci. Cardio per braccia, addome e gambe.',
  Burpees:
    'Mani a terra, salto indietro in plank, piedi di nuovo sotto e salto in alto con le braccia su. Tutto il corpo e tanto fiato.',
  'Jumping jack':
    'Salta aprendo gambe e braccia insieme, poi richiudi. Riscaldamento classico, ritmo costante.',
  'Box jump':
    'Braccia indietro e piccolo piegamento: salta sul box e atterra morbido con le ginocchia piegate. Si scende camminando, non saltando.',
  'Kettlebell swing':
    'La spinta è dei fianchi, non delle braccia: piega l’anca col kettlebell fra le gambe e poi spingi avanti, fino all’altezza del petto.',
  'Battle rope':
    'Mezzo squat e busto fermo: le braccia alzano e sbattono le corde in onde alternate. Spalle, braccia e fiato.',
  'Spinta della slitta (sled push)':
    'Busto inclinato e braccia tese sui pali della slitta: passi corti e potenti. Gambe e fiato, senza impatto.',
  Nuoto:
    'Cardio completo e senza impatto. Corpo lungo e allineato: una bracciata per lato mentre le gambe battono piccole.',
}

const PER_NOME = new Map(Object.entries(DESCRIZIONI).map(([n, d]) => [normalizzaNome(n), d]))

/**
 * La descrizione di un esercizio della libreria, cercata per nome (senza
 * badare a maiuscole e accenti). null se non c'è: chi la usa ripiega sulla
 * tecnica del movimento.
 */
export function descrizioneDi(nome) {
  return PER_NOME.get(normalizzaNome(nome)) || null
}
