package it.progettopalestra.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;
import android.view.KeyEvent;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.util.List;

// I comandi della musica dall'allenamento (components/ComandiMusica).
// Con l'accesso alle notifiche (AscoltoMusica) si parla con la sessione
// multimediale dell'app che suona: stato esatto, titolo, copertina. Senza, si
// mandano i tasti multimediali come le cuffie e si sa solo SE qualcosa suona.
@CapacitorPlugin(name = "Musica")
public class MusicaPlugin extends Plugin {

    // La copertina dell'ultimo brano, gia' in base64: ComandiMusica chiede lo
    // stato ogni secondo, e la si ricodifica solo quando il brano cambia.
    private String chiaveCopertina = null;
    private String copertina = null;

    private AudioManager audio() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    private boolean permesso() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
    }

    // La sessione che conta: quella che sta suonando, se no la prima (Android
    // le da' in ordine di importanza). Null senza permesso o senza musica.
    private MediaController sessione() {
        if (!permesso()) return null;
        try {
            MediaSessionManager m = (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
            List<MediaController> tutte = m.getActiveSessions(new ComponentName(getContext(), AscoltoMusica.class));
            for (MediaController c : tutte) if (suona(c)) return c;
            return tutte.isEmpty() ? null : tutte.get(0);
        } catch (SecurityException e) {
            return null;
        }
    }

    private static boolean suona(MediaController c) {
        PlaybackState s = c.getPlaybackState();
        return s != null && s.getState() == PlaybackState.STATE_PLAYING;
    }

    @PluginMethod
    public void comando(PluginCall call) {
        String azione = call.getString("azione", "");
        MediaController c = sessione();
        if (c != null) {
            MediaController.TransportControls t = c.getTransportControls();
            switch (azione) {
                case "playPausa": if (suona(c)) t.pause(); else t.play(); break;
                case "succ": t.skipToNext(); break;
                case "prec": t.skipToPrevious(); break;
                default: call.reject("Azione sconosciuta: " + azione); return;
            }
            call.resolve();
            return;
        }
        int tasto;
        switch (azione) {
            case "playPausa": tasto = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE; break;
            case "succ": tasto = KeyEvent.KEYCODE_MEDIA_NEXT; break;
            case "prec": tasto = KeyEvent.KEYCODE_MEDIA_PREVIOUS; break;
            default: call.reject("Azione sconosciuta: " + azione); return;
        }
        AudioManager a = audio();
        a.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, tasto));
        a.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, tasto));
        call.resolve();
    }

    // { permesso, suona, titolo?, artista?, copertina? (data URL), durata?, posizione? (ms) }
    @PluginMethod
    public void stato(PluginCall call) {
        JSObject r = new JSObject();
        r.put("permesso", permesso());
        MediaController c = sessione();
        if (c == null) {
            r.put("suona", audio().isMusicActive());
            call.resolve(r);
            return;
        }
        r.put("suona", suona(c));
        MediaMetadata m = c.getMetadata();
        if (m != null) {
            String titolo = m.getString(MediaMetadata.METADATA_KEY_TITLE);
            String artista = m.getString(MediaMetadata.METADATA_KEY_ARTIST);
            r.put("titolo", titolo);
            r.put("artista", artista);
            String chiave = c.getPackageName() + "|" + titolo + "|" + artista;
            if (!chiave.equals(chiaveCopertina)) {
                chiaveCopertina = chiave;
                copertina = codifica(m);
            }
            if (copertina != null) r.put("copertina", copertina);
            long durata = m.getLong(MediaMetadata.METADATA_KEY_DURATION);
            PlaybackState s = c.getPlaybackState();
            if (durata > 0 && s != null && s.getPosition() >= 0) {
                // La posizione e' quella dell'ultimo aggiornamento dell'app:
                // se sta suonando, si aggiunge il tempo passato da allora.
                long pos = s.getPosition();
                if (s.getState() == PlaybackState.STATE_PLAYING) {
                    pos += (long) ((SystemClock.elapsedRealtime() - s.getLastPositionUpdateTime()) * s.getPlaybackSpeed());
                }
                r.put("durata", durata);
                r.put("posizione", Math.max(0, Math.min(pos, durata)));
            }
        }
        call.resolve(r);
    }

    private static String codifica(MediaMetadata m) {
        Bitmap b = m.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
        if (b == null) b = m.getBitmap(MediaMetadata.METADATA_KEY_ART);
        if (b == null) b = m.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON);
        if (b == null) return null;
        Bitmap piccola = Bitmap.createScaledBitmap(b, 160, 160 * b.getHeight() / Math.max(1, b.getWidth()), true);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        piccola.compress(Bitmap.CompressFormat.JPEG, 80, out);
        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    // Apre la pagina di Android dove si da' l'accesso alle notifiche.
    @PluginMethod
    public void apriPermesso(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
