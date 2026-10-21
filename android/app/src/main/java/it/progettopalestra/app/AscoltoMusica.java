package it.progettopalestra.app;

import android.service.notification.NotificationListenerService;

// Vuoto apposta: esiste perche' Android da' le sessioni multimediali delle
// altre app (titolo, copertina, play/pausa) solo a un "ascoltatore di
// notifiche" abilitato dall'utente. Vedi MusicaPlugin.
public class AscoltoMusica extends NotificationListenerService {}
