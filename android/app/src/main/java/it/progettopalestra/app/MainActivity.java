package it.progettopalestra.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // I plugin scritti qui (non da npm) si registrano a mano, prima di super.
        registerPlugin(MusicaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
