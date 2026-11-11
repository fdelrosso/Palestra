package it.progettopalestra.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // I plugin scritti qui (non da npm) si registrano a mano, prima di super.
        registerPlugin(MusicaPlugin.class);
        registerPlugin(SistemaPlugin.class);
        registerPlugin(AllenamentoPlugin.class);
        super.onCreate(savedInstanceState);
        // Disegnata sotto le barre di sistema anche prima di Android 15 (da li'
        // lo e' per forza): i bordi li mette SystemBars di Capacitor, che conta
        // su questo. Senza, su Android 13 sopra la tastiera restava una fascia
        // grigia alta quanto la barra di navigazione.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
