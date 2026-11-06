package it.progettopalestra.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Il ponte fra la pagina dell'allenamento (lib/allenamentoNativo) e la sua
// notifica (AllenamentoNotifica).
@CapacitorPlugin(name = "Allenamento")
public class AllenamentoPlugin extends Plugin {

    private static AllenamentoPlugin attivo;
    /** L'app e' davanti: la fine del recupero la segnala lei. */
    static volatile boolean inPrimoPiano;

    @Override
    public void load() {
        attivo = this;
        daNotifica(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        daNotifica(intent);
    }

    @Override
    protected void handleOnResume() {
        inPrimoPiano = true;
    }

    @Override
    protected void handleOnPause() {
        inPrimoPiano = false;
    }

    @Override
    protected void handleOnDestroy() {
        if (attivo == this) attivo = null;
    }

    // La notifica ha aperto l'app. Gli extra si tolgono: ruotando il telefono
    // l'intent e' lo stesso, e non deve valere una seconda volta.
    private void daNotifica(Intent i) {
        if (i == null || !i.getBooleanExtra(AllenamentoNotifica.EXTRA_APRI, false)) return;
        i.removeExtra(AllenamentoNotifica.EXTRA_APRI);
        // `true`: resta in attesa finche' non c'e' chi ascolta (app appena aperta).
        notifyListeners("apri", new JSObject(), true);
    }

    static void avvisaTocco() {
        if (attivo != null) attivo.notifyListeners("tocco", new JSObject());
    }

    // { sessioneId, titolo, serie: [...], fine, durata, bip }
    @PluginMethod
    public void aggiorna(PluginCall call) {
        AllenamentoNotifica.aggiorna(getContext(), call.getData());
        call.resolve();
    }

    @PluginMethod
    public void ferma(PluginCall call) {
        AllenamentoNotifica.ferma(getContext());
        call.resolve();
    }

    @PluginMethod
    public void leggiTocchi(PluginCall call) {
        JSObject r = new JSObject();
        r.put("tocchi", AllenamentoNotifica.prendiTocchi(getContext()));
        call.resolve(r);
    }
}
