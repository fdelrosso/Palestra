package it.progettopalestra.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

// Il registro delle canzoni ascoltate (la playlist dell'allenamento,
// components/PlaylistAllenamento): lo scrive AscoltoMusica a ogni cambio di
// brano o di play/pausa, anche a telefono bloccato; lo legge MusicaPlugin
// (`ascolti`). Un file JSON nella cartella dell'app, un ascolto per riga:
// { app, titolo, artista, inizio (epoch ms), ms (quanto ha suonato), dal
// (epoch ms da cui sta suonando, 0 = fermo) }. Le copertine a parte, una per
// brano. Si tengono 7 giorni: il riepilogo si riapre anche dal calendario.
final class Ascolti {
    private static final long TIENI_MS = 7L * 24 * 60 * 60 * 1000;
    private static JSONArray righe;
    // L'ascolto in corso per ogni app (indice in `righe`).
    private static final Map<String, JSONObject> correnti = new HashMap<>();

    private Ascolti() {}

    private static File file(Context c) {
        return new File(c.getFilesDir(), "ascolti.json");
    }

    private static File cartellaCopertine(Context c) {
        File d = new File(c.getFilesDir(), "copertine");
        d.mkdirs();
        return d;
    }

    static String chiave(String titolo, String artista) {
        return (titolo == null ? "" : titolo) + "|" + (artista == null ? "" : artista);
    }

    // Caricato una volta per processo; gli ascolti rimasti aperti (il processo
    // e' stato chiuso mentre suonava) tornano "in corso", cosi' lo stesso brano
    // non diventa un secondo ascolto.
    private static synchronized JSONArray righe(Context c) {
        if (righe != null) return righe;
        righe = new JSONArray();
        try {
            righe = new JSONArray(new String(leggi(file(c)), StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
        for (int i = 0; i < righe.length(); i++) {
            JSONObject r = righe.optJSONObject(i);
            if (r != null && r.optBoolean("aperto")) correnti.put(r.optString("app"), r);
        }
        return righe;
    }

    private static void scrivi(Context c) {
        long limite = System.currentTimeMillis() - TIENI_MS;
        JSONArray tenute = new JSONArray();
        for (int i = 0; i < righe.length(); i++) {
            JSONObject r = righe.optJSONObject(i);
            if (r != null && r.optLong("inizio") >= limite) tenute.put(r);
        }
        righe = tenute;
        try (FileOutputStream out = new FileOutputStream(file(c))) {
            out.write(righe.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
    }

    // Quanto ha suonato finora, compreso il tratto in corso.
    private static long ms(JSONObject r, long ora) {
        long dal = r.optLong("dal");
        return r.optLong("ms") + (dal > 0 ? Math.max(0, ora - dal) : 0);
    }

    /** Lo stato di `app` adesso: che brano (null = nessuno) e se suona. */
    static synchronized void aggiorna(Context c, String app, MediaMetadata m, boolean suona) {
        righe(c);
        long ora = System.currentTimeMillis();
        String titolo = m == null ? null : m.getString(MediaMetadata.METADATA_KEY_TITLE);
        String artista = m == null ? null : m.getString(MediaMetadata.METADATA_KEY_ARTIST);
        JSONObject r = correnti.get(app);
        try {
            boolean stesso = r != null && titolo != null && chiave(titolo, artista).equals(chiave(r.optString("titolo"), r.optString("artista")));
            if (r != null && !stesso) {
                r.put("ms", ms(r, ora));
                r.put("dal", 0);
                r.remove("aperto");
                correnti.remove(app);
                r = null;
            }
            if (r == null && titolo != null && !titolo.isEmpty()) {
                r = new JSONObject();
                r.put("app", app);
                r.put("titolo", titolo);
                r.put("artista", artista == null ? "" : artista);
                r.put("inizio", ora);
                r.put("ms", 0);
                r.put("dal", 0);
                r.put("aperto", true);
                righe.put(r);
                correnti.put(app, r);
            }
            if (r != null) {
                // Spotify manda prima titolo e artista, la copertina in un
                // aggiornamento dopo, dello stesso brano: si riprova a ogni
                // giro finche' non c'e' (salvata una volta, poi non fa niente).
                salvaCopertina(c, chiave(titolo, artista), m);
                long dal = r.optLong("dal");
                if (suona && dal == 0) r.put("dal", ora);
                if (!suona && dal > 0) {
                    r.put("ms", ms(r, ora));
                    r.put("dal", 0);
                }
            }
        } catch (Exception ignored) {}
        scrivi(c);
    }

    /** Gli ascolti iniziati fra `da` e `a` (epoch ms), con la copertina. */
    static synchronized JSONArray fra(Context c, long da, long a) {
        righe(c);
        long ora = System.currentTimeMillis();
        JSONArray fuori = new JSONArray();
        for (int i = 0; i < righe.length(); i++) {
            JSONObject r = righe.optJSONObject(i);
            if (r == null || r.optLong("inizio") < da || r.optLong("inizio") > a) continue;
            try {
                JSONObject o = new JSONObject();
                o.put("app", r.optString("app"));
                o.put("titolo", r.optString("titolo"));
                o.put("artista", r.optString("artista"));
                o.put("inizio", r.optLong("inizio"));
                o.put("ms", ms(r, ora));
                String cop = copertina(c, chiave(r.optString("titolo"), r.optString("artista")));
                if (cop != null) o.put("copertina", cop);
                fuori.put(o);
            } catch (Exception ignored) {}
        }
        return fuori;
    }

    private static File fileCopertina(Context c, String chiave) {
        return new File(cartellaCopertine(c), Integer.toHexString(chiave.hashCode()) + ".jpg");
    }

    private static void salvaCopertina(Context c, String chiave, MediaMetadata m) {
        File f = fileCopertina(c, chiave);
        if (f.exists() || m == null) return;
        Bitmap b = m.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
        if (b == null) b = m.getBitmap(MediaMetadata.METADATA_KEY_ART);
        if (b == null) b = m.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON);
        if (b == null) return;
        // 320px: sull'immagine della playlist le copertine arrivano a ~300px.
        Bitmap piccola = Bitmap.createScaledBitmap(b, 320, 320 * b.getHeight() / Math.max(1, b.getWidth()), true);
        try (FileOutputStream out = new FileOutputStream(f)) {
            piccola.compress(Bitmap.CompressFormat.JPEG, 85, out);
        } catch (Exception ignored) {}
    }

    private static String copertina(Context c, String chiave) {
        File f = fileCopertina(c, chiave);
        if (!f.exists()) return null;
        try {
            return "data:image/jpeg;base64," + Base64.encodeToString(leggi(f), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    // InputStream.readAllBytes c'e' solo da Android 13: l'app parte dal 7.
    private static byte[] leggi(File f) throws Exception {
        try (FileInputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }
}
