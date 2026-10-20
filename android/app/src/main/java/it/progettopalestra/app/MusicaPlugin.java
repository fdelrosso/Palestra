package it.progettopalestra.app;

import android.content.Context;
import android.media.AudioManager;
import android.view.KeyEvent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// I comandi della musica dall'allenamento (components/ComandiMusica): manda i
// tasti multimediali al sistema, come i tasti delle cuffie, e risponde l'app
// che sta suonando (Spotify, YouTube Music, ...). Niente permessi, niente login.
@CapacitorPlugin(name = "Musica")
public class MusicaPlugin extends Plugin {

    private AudioManager audio() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void comando(PluginCall call) {
        String azione = call.getString("azione", "");
        int tasto;
        switch (azione) {
            case "playPausa": tasto = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE; break;
            case "succ": tasto = KeyEvent.KEYCODE_MEDIA_NEXT; break;
            case "prec": tasto = KeyEvent.KEYCODE_MEDIA_PREVIOUS; break;
            default:
                call.reject("Azione sconosciuta: " + azione);
                return;
        }
        AudioManager a = audio();
        a.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, tasto));
        a.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, tasto));
        call.resolve();
    }

    // Se qualcosa sta suonando adesso: decide se il tasto mostra play o pausa.
    @PluginMethod
    public void stato(PluginCall call) {
        JSObject r = new JSObject();
        r.put("suona", audio().isMusicActive());
        call.resolve(r);
    }
}
