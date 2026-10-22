package it.progettopalestra.app;

import android.content.ComponentName;
import android.content.Context;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Esiste perche' Android da' le sessioni multimediali delle altre app (titolo,
// copertina, play/pausa) solo a un "ascoltatore di notifiche" abilitato
// dall'utente: MusicaPlugin le usa per i comandi. Le notifiche non si leggono.
// Finche' e' abilitato Android lo tiene acceso, anche a telefono bloccato e ad
// app chiusa: qui si segue ogni sessione e si annota cosa suona (Ascolti), per
// la playlist dell'allenamento.
public class AscoltoMusica extends NotificationListenerService {

    private final Handler handler = new Handler(Looper.getMainLooper());
    // Le sessioni seguite, per app.
    private final Map<String, Seguita> seguite = new HashMap<>();
    private MediaSessionManager.OnActiveSessionsChangedListener cambio;

    private final class Seguita extends MediaController.Callback {
        final MediaController c;

        Seguita(MediaController c) {
            this.c = c;
        }

        void annota() {
            PlaybackState s = c.getPlaybackState();
            boolean suona = s != null && s.getState() == PlaybackState.STATE_PLAYING;
            Ascolti.aggiorna(AscoltoMusica.this, c.getPackageName(), c.getMetadata(), suona);
        }

        @Override
        public void onMetadataChanged(MediaMetadata m) {
            annota();
        }

        @Override
        public void onPlaybackStateChanged(PlaybackState s) {
            annota();
        }

        @Override
        public void onSessionDestroyed() {
            Ascolti.aggiorna(AscoltoMusica.this, c.getPackageName(), null, false);
            c.unregisterCallback(this);
            seguite.remove(c.getPackageName());
        }
    }

    @Override
    public void onListenerConnected() {
        MediaSessionManager m = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        ComponentName io = new ComponentName(this, AscoltoMusica.class);
        cambio = this::segui;
        try {
            m.addOnActiveSessionsChangedListener(cambio, io, handler);
            segui(m.getActiveSessions(io));
        } catch (SecurityException ignored) {}
    }

    @Override
    public void onListenerDisconnected() {
        MediaSessionManager m = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        if (cambio != null) m.removeOnActiveSessionsChangedListener(cambio);
        for (Seguita s : seguite.values()) {
            s.c.unregisterCallback(s);
            Ascolti.aggiorna(this, s.c.getPackageName(), null, false);
        }
        seguite.clear();
    }

    // Una sessione per app: quella nuova di un'app prende il posto della vecchia.
    private void segui(List<MediaController> sessioni) {
        if (sessioni == null) return;
        for (MediaController c : sessioni) {
            Seguita vecchia = seguite.get(c.getPackageName());
            if (vecchia != null && vecchia.c.getSessionToken().equals(c.getSessionToken())) continue;
            if (vecchia != null) vecchia.c.unregisterCallback(vecchia);
            Seguita s = new Seguita(c);
            c.registerCallback(s, handler);
            seguite.put(c.getPackageName(), s);
            s.annota();
        }
    }
}
