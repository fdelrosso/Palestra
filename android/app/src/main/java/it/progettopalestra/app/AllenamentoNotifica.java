package it.progettopalestra.app;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.SystemClock;
import android.os.Vibrator;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// La notifica dell'allenamento e i suoi tocchi: esercizio, recupero e i tre
// tasti dello sforzo, anche a schermo bloccato.
//
// ⚠️ NON passa dal WebView: a schermo bloccato puo' essere fermo o morto. La
// pagina passa in anticipo le serie che restano (lib/comandiAllenamento,
// `codaSerie`); qui si avanza da soli e ci si segna i tocchi su disco, e la
// pagina li applica appena puo' (AllenamentoPlugin.leggiTocchi).
public class AllenamentoNotifica extends BroadcastReceiver {

    static final String EXTRA_APRI = "allenamento_apri";
    static final String EXTRA_ID = "allenamento_esercizio";
    static final String EXTRA_SERIE = "allenamento_serie";

    private static final String AZIONE_TOCCO = "it.progettopalestra.app.ALLENAMENTO_TOCCO";
    private static final String AZIONE_FINE = "it.progettopalestra.app.ALLENAMENTO_FINE_RECUPERO";
    private static final String EXTRA_COLORE = "allenamento_colore";

    private static final String PREFS = "allenamento";
    private static final String STATO = "stato";
    private static final String TOCCHI = "tocchi";
    private static final String CANALE = "allenamento";
    private static final String CANALE_FINE = "allenamento_recupero";
    private static final int ID = 4100;
    private static final int ID_FINE = 4101;
    // Dimenticata (app chiusa e mai riaperta): dopo tanto se ne va da sola.
    private static final long DURATA_MAX_MS = 4 * 60 * 60 * 1000L;
    private static final long[] VIBRAZIONE = { 0, 300, 150, 300 };

    @Override
    public void onReceive(Context ctx, Intent i) {
        if (AZIONE_FINE.equals(i.getAction())) {
            fineRecupero(ctx);
            return;
        }
        if (tocco(ctx, i.getStringExtra(EXTRA_ID), i.getIntExtra(EXTRA_SERIE, -1), i.getStringExtra(EXTRA_COLORE))) {
            AllenamentoPlugin.avvisaTocco();
        }
    }

    // -- lo stato ------------------------------------------------------------

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONObject stato(Context ctx) {
        try {
            return new JSONObject(prefs(ctx).getString(STATO, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    private static JSONArray tocchi(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(TOCCHI, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    /**
     * Lo stato nuovo dalla pagina. Se ci sono tocchi che non ha ancora letto si
     * ignora: e' indietro. Li leggera', e allora ne mandera' uno giusto.
     */
    static synchronized void aggiorna(Context ctx, JSONObject nuovo) {
        if (tocchi(ctx).length() > 0) return;
        prefs(ctx).edit().putString(STATO, nuovo.toString()).commit();
        disegna(ctx, nuovo);
        programmaFine(ctx, nuovo);
    }

    static synchronized void ferma(Context ctx) {
        prefs(ctx).edit().clear().commit();
        programmaFine(ctx, new JSONObject());
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        nm.cancel(ID);
        nm.cancel(ID_FINE);
    }

    /** I tocchi da applicare: letti, si scordano. */
    static synchronized JSONArray prendiTocchi(Context ctx) {
        JSONArray t = tocchi(ctx);
        prefs(ctx).edit().remove(TOCCHI).commit();
        return t;
    }

    /** "Duro" dalla notifica: nessun avanzamento, la pagina chiede le ripetizioni. */
    static synchronized void chiediRipetizioni(Context ctx, String esercizioId, int serie) {
        try {
            JSONObject t = new JSONObject();
            t.put("sessioneId", stato(ctx).optString("sessioneId"));
            t.put("esercizioId", esercizioId);
            t.put("j", serie);
            t.put("colore", "rosso");
            t.put("chiedi", true);
            salvaTocco(ctx, t);
        } catch (JSONException e) {
            // Si apre l'app e basta: la serie si chiude da li'.
        }
    }

    private static void salvaTocco(Context ctx, JSONObject t) {
        prefs(ctx).edit().putString(TOCCHI, tocchi(ctx).put(t).toString()).commit();
    }

    // Vale solo sulla serie che la notifica mostra adesso: un doppio tocco
    // arriva con quella di prima e non chiude la successiva.
    private static synchronized boolean tocco(Context ctx, String esercizioId, int serie, String colore) {
        try {
            JSONObject st = stato(ctx);
            JSONArray coda = st.optJSONArray("serie");
            JSONObject s = coda != null ? coda.optJSONObject(0) : null;
            if (s == null || !s.optString("esercizioId").equals(esercizioId) || s.optInt("j") != serie) return false;

            long adesso = System.currentTimeMillis();
            JSONObject t = new JSONObject();
            t.put("sessioneId", st.optString("sessioneId"));
            t.put("esercizioId", esercizioId);
            t.put("j", serie);
            t.put("colore", colore);
            t.put("quando", adesso);
            int recupero = s.optInt("recupero", 0);
            if (recupero > 0) {
                long fine = adesso + recupero * 1000L;
                st.put("fine", fine);
                st.put("durata", recupero);
                t.put("fine", fine);
                t.put("durata", recupero);
            }
            coda.remove(0);
            salvaTocco(ctx, t);
            prefs(ctx).edit().putString(STATO, st.toString()).commit();
            disegna(ctx, st);
            programmaFine(ctx, st);
            return true;
        } catch (JSONException e) {
            return false;
        }
    }

    // -- la fine del recupero ------------------------------------------------

    private static PendingIntent intentFine(Context ctx) {
        Intent i = new Intent(ctx, AllenamentoNotifica.class).setAction(AZIONE_FINE);
        return PendingIntent.getBroadcast(ctx, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void programmaFine(Context ctx, JSONObject st) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = intentFine(ctx);
        am.cancel(pi);
        long fine = st.optLong("fine", 0);
        if (fine <= System.currentTimeMillis()) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fine, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fine, pi);
        }
    }

    private static void fineRecupero(Context ctx) {
        // Con l'app davanti suona e vibra lei (useRestTimer).
        if (AllenamentoPlugin.inPrimoPiano) return;
        JSONObject st = stato(ctx);
        try {
            // USAGE_ALARM: con un altro uso Android ignora la vibrazione di un'app in background.
            AudioAttributes allarme = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();
            ctx.getSystemService(Vibrator.class).vibrate(VIBRAZIONE, -1, allarme);
            // Il bip si accende dalla card del recupero: spento, solo la vibrazione.
            if (st.optBoolean("bip")) {
                RingtoneManager.getRingtone(ctx, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)).play();
            }
            // ⚠️ Sul blocco schermo niente avviso: una card in piu' sposta i tasti
            // proprio mentre li si cerca, e il tempo in negativo si vede gia'.
            if (ctx.getSystemService(KeyguardManager.class).isKeyguardLocked()) return;
            creaCanali(ctx);
            JSONArray coda = st.optJSONArray("serie");
            JSONObject s = coda != null ? coda.optJSONObject(0) : null;
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANALE_FINE)
                .setSmallIcon(R.drawable.ic_notifica)
                .setContentTitle("Recupero finito")
                .setContentText(s != null ? s.optString("titolo") : "")
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setTimeoutAfter(10000);
            ctx.getSystemService(NotificationManager.class).notify(ID_FINE, b.build());
        } catch (RuntimeException e) {
            // Notifiche negate o suoneria mancante: niente avviso, niente danni.
        }
    }

    // -- il disegno ----------------------------------------------------------

    private static void creaCanali(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        // DEFAULT e non LOW: da "silenziosa" molti telefoni la nascondono sul blocco schermo.
        NotificationChannel c = new NotificationChannel(CANALE, "Allenamento in corso", NotificationManager.IMPORTANCE_DEFAULT);
        c.setSound(null, null);
        c.enableVibration(false);
        c.setShowBadge(false);
        c.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(c);
        NotificationChannel f = new NotificationChannel(CANALE_FINE, "Fine del recupero", NotificationManager.IMPORTANCE_HIGH);
        f.setSound(null, null);
        f.enableVibration(false);
        nm.createNotificationChannel(f);
    }

    private static PendingIntent apriApp(Context ctx, int codice, String esercizioId, int serie) {
        Intent i = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra(EXTRA_APRI, true);
        if (esercizioId != null) i.putExtra(EXTRA_ID, esercizioId).putExtra(EXTRA_SERIE, serie);
        return PendingIntent.getActivity(ctx, codice, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent intentTocco(Context ctx, int codice, String colore, String esercizioId, int serie) {
        Intent i = new Intent(ctx, AllenamentoNotifica.class)
            .setAction(AZIONE_TOCCO)
            .putExtra(EXTRA_COLORE, colore)
            .putExtra(EXTRA_ID, esercizioId)
            .putExtra(EXTRA_SERIE, serie);
        return PendingIntent.getBroadcast(ctx, codice, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static RemoteViews vista(Context ctx, JSONObject st, JSONObject s, boolean grande) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.notifica_allenamento);
        v.setTextViewText(R.id.notifica_titolo, s != null ? s.optString("titolo") : "Allenamento finito");
        String dettaglio = s != null ? s.optString("dettaglio") : "Tocca per chiudere l'allenamento";
        v.setTextViewText(R.id.notifica_dettaglio, dettaglio);
        v.setViewVisibility(R.id.notifica_dettaglio, grande && !dettaglio.isEmpty() ? View.VISIBLE : View.GONE);

        long fine = s != null ? st.optLong("fine", 0) : 0;
        if (fine > 0) {
            long base = SystemClock.elapsedRealtime() + (fine - System.currentTimeMillis());
            v.setChronometer(R.id.notifica_recupero, base, null, true);
            v.setChronometerCountDown(R.id.notifica_recupero, true);
            v.setViewVisibility(R.id.notifica_recupero, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.notifica_recupero, View.GONE);
        }

        boolean tasti = s != null && !s.optBoolean("app");
        v.setViewVisibility(R.id.notifica_tasti, tasti ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.notifica_apri, s != null && !tasti ? View.VISIBLE : View.GONE);
        if (tasti) {
            String id = s.optString("esercizioId");
            int j = s.optInt("j");
            v.setOnClickPendingIntent(R.id.notifica_verde, intentTocco(ctx, 1, "verde", id, j));
            v.setOnClickPendingIntent(R.id.notifica_giallo, intentTocco(ctx, 2, "giallo", id, j));
            // "Duro" vuole le ripetizioni fatte: si scrivono nell'app.
            v.setOnClickPendingIntent(R.id.notifica_rosso, apriApp(ctx, 3, id, j));
        } else {
            v.setOnClickPendingIntent(R.id.notifica_apri, apriApp(ctx, 4, null, 0));
        }
        return v;
    }

    private static void disegna(Context ctx, JSONObject st) {
        creaCanali(ctx);
        JSONArray coda = st.optJSONArray("serie");
        JSONObject s = coda != null ? coda.optJSONObject(0) : null;
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANALE)
            .setSmallIcon(R.drawable.ic_notifica)
            .setContentTitle(s != null ? s.optString("titolo") : "Allenamento finito")
            .setContentIntent(apriApp(ctx, 0, null, 0))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setTimeoutAfter(DURATA_MAX_MS)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(vista(ctx, st, s, false))
            .setCustomBigContentView(vista(ctx, st, s, true));
        try {
            ctx.getSystemService(NotificationManager.class).notify(ID, b.build());
        } catch (RuntimeException e) {
            // Notifiche negate: l'allenamento va avanti nell'app.
        }
    }
}
