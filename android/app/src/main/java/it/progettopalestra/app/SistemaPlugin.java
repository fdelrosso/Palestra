package it.progettopalestra.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

// Quello che il WebView di Android non sa fare e il sito si aspetta
// (lib/nativo.js): il foglio di condivisione (navigator.share), il salvataggio
// di un file (<a download>) e la pagina dei permessi dell'app.
@CapacitorPlugin(name = "Sistema")
public class SistemaPlugin extends Plugin {

    // { testo?, titolo?, file?: { dati (base64), nome, tipo } }
    @PluginMethod
    public void condividi(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_SEND);
        String testo = call.getString("testo");
        if (testo != null) i.putExtra(Intent.EXTRA_TEXT, testo);
        JSObject file = call.getObject("file");
        try {
            if (file != null) {
                // Nella cache: il FileProvider (AndroidManifest, xml/file_paths)
                // la passa all'app scelta senza permessi sulla memoria.
                File cartella = new File(getContext().getCacheDir(), "condivisi");
                cartella.mkdirs();
                File f = new File(cartella, new File(file.getString("nome", "file")).getName());
                try (FileOutputStream out = new FileOutputStream(f)) {
                    out.write(Base64.decode(file.getString("dati", ""), Base64.DEFAULT));
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                i.setType(file.getString("tipo", "application/octet-stream"));
                i.putExtra(Intent.EXTRA_STREAM, uri);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                i.setType("text/plain");
            }
            getActivity().startActivity(Intent.createChooser(i, call.getString("titolo")));
            call.resolve();
        } catch (Exception e) {
            call.reject("Condivisione non riuscita", e);
        }
    }

    // { dati (base64), nome, tipo }: la finestra "Salva con nome" di Android,
    // che non chiede permessi sulla memoria.
    @PluginMethod
    public void salva(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(call.getString("tipo", "application/octet-stream"));
        i.putExtra(Intent.EXTRA_TITLE, call.getString("nome", "file"));
        startActivityForResult(call, i, "salvato");
    }

    @ActivityCallback
    private void salvato(PluginCall call, ActivityResult risultato) {
        JSObject r = new JSObject();
        Uri uri = risultato.getData() != null ? risultato.getData().getData() : null;
        if (risultato.getResultCode() != Activity.RESULT_OK || uri == null) {
            r.put("salvato", false);
            call.resolve(r);
            return;
        }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
            out.write(Base64.decode(call.getString("dati", ""), Base64.DEFAULT));
            r.put("salvato", true);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Salvataggio non riuscito", e);
        }
    }

    // La pagina dell'app nelle impostazioni: un permesso negato due volte
    // Android non lo richiede piu', si riaccende solo da li'.
    @PluginMethod
    public void apriImpostazioni(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
