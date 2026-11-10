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
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.SystemClock;
import android.os.Vibrator;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.res.ResourcesCompat;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// La notifica dell'allenamento e i suoi tocchi: esercizio, recupero e i tasti
// dello sforzo, anche a schermo bloccato.
//
// ⚠️ NON passa dal WebView: a schermo bloccato puo' essere fermo o morto. La
// pagina passa in anticipo le serie che restano (lib/comandiAllenamento,
// `codaSerie`); qui si avanza da soli e ci si segna i tocchi su disco, e la
// pagina li applica appena puo' (AllenamentoPlugin.leggiTocchi).
//
// Le ripetizioni e i kg si cambiano coi tasti − e +: una tastiera sul blocco
// schermo Android non la apre senza sbloccare, un tasto si'. `modo` dice cosa si
// sta cambiando, `bozza` il valore finche' non si conferma.
public class AllenamentoNotifica extends BroadcastReceiver {

    static final String EXTRA_APRI = "allenamento_apri";

    private static final String AZIONE_COMANDO = "it.progettopalestra.app.ALLENAMENTO_COMANDO";
    private static final String AZIONE_FINE = "it.progettopalestra.app.ALLENAMENTO_FINE_RECUPERO";
    private static final String EXTRA_COMANDO = "allenamento_comando";
    private static final String EXTRA_ID = "allenamento_esercizio";
    private static final String EXTRA_SERIE = "allenamento_serie";

    private static final String PREFS = "allenamento";
    private static final String STATO = "stato";
    private static final String TOCCHI = "tocchi";
    private static final String CANALE = "allenamento";
    private static final String CANALE_FINE = "allenamento_recupero";
    static final int ID = 4100;
    private static final int ID_FINE = 4101;
    // Dimenticata (app chiusa e mai riaperta): dopo tanto se ne va da sola.
    static final long DURATA_MAX_MS = 4 * 60 * 60 * 1000L;
    private static final long[] VIBRAZIONE = { 0, 300, 150, 300 };

    private static final String REPS = "reps";
    private static final String KG = "kg";

    // I colori dell'app, tema scuro (index.css).
    private static final int ACCENT = 0xFF5CC8F5;
    private static final int SPENTO = 0xFF6B7484;
    private static final int VERDE = 0xFF34D399;
    private static final int GIALLO = 0xFFF5C542;
    private static final int ROSSO = 0xFFF26D6D;

    /** AllenamentoServizio e' acceso e ridisegna le cifre a ogni secondo. */
    static volatile boolean cifreVive;
    private static long fineAvvisata;
    private static Typeface fontCifre;

    @Override
    public void onReceive(Context ctx, Intent i) {
        if (AZIONE_FINE.equals(i.getAction())) {
            fineRecupero(ctx);
            return;
        }
        if (comando(ctx, i.getStringExtra(EXTRA_COMANDO), i.getStringExtra(EXTRA_ID), i.getIntExtra(EXTRA_SERIE, -1))) {
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

    private static JSONObject prima(JSONObject st) {
        JSONArray coda = st.optJSONArray("serie");
        return coda != null ? coda.optJSONObject(0) : null;
    }

    private static boolean stessaSerie(JSONObject a, JSONObject b) {
        return a != null && b != null && a.optString("esercizioId").equals(b.optString("esercizioId")) && a.optInt("j") == b.optInt("j");
    }

    /**
     * Lo stato nuovo dalla pagina. Se ci sono tocchi che non ha ancora letto si
     * ignora: e' indietro. Li leggera', e allora ne mandera' uno giusto. Sulla
     * stessa serie resta quello che si stava cambiando qui.
     */
    static synchronized void aggiorna(Context ctx, JSONObject nuovo) {
        if (tocchi(ctx).length() > 0) return;
        try {
            JSONObject vecchio = stato(ctx);
            JSONObject a = prima(vecchio);
            JSONObject b = prima(nuovo);
            if (stessaSerie(a, b)) {
                if (vecchio.has("modo")) {
                    nuovo.put("modo", vecchio.get("modo"));
                    nuovo.put("bozza", vecchio.get("bozza"));
                }
                if (b.optBoolean("sforzo")) {
                    b.put("rip", a.opt("rip"));
                    b.put("kg", a.opt("kg"));
                }
            }
        } catch (JSONException e) {
            // Vale quello che ha mandato la pagina.
        }
        prefs(ctx).edit().putString(STATO, nuovo.toString()).commit();
        disegna(ctx, nuovo);
        programmaFine(ctx, nuovo);
        avviaServizio(ctx);
    }

    // ⚠️ Con l'app in sfondo Android puo' rifiutarlo: resta la notifica normale,
    // che fa tutto lo stesso ma col bordo grigio.
    private static void avviaServizio(Context ctx) {
        try {
            ContextCompat.startForegroundService(ctx, new Intent(ctx, AllenamentoServizio.class));
        } catch (RuntimeException e) {
            // Vedi sopra.
        }
    }

    static synchronized void ferma(Context ctx) {
        prefs(ctx).edit().clear().commit();
        programmaFine(ctx, new JSONObject());
        ctx.stopService(new Intent(ctx, AllenamentoServizio.class));
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

    // -- i tasti -------------------------------------------------------------

    /** @return true se una serie si e' chiusa e la pagina ha da leggere. */
    private static synchronized boolean comando(Context ctx, String c, String esercizioId, int serie) {
        try {
            JSONObject st = stato(ctx);
            JSONObject s = prima(st);
            // Vale solo sulla serie che si vede adesso: un doppio tocco arriva con
            // quella di prima e non chiude la successiva.
            if (c == null || s == null || !s.optString("esercizioId").equals(esercizioId) || s.optInt("j") != serie) return false;
            String modo = st.optString("modo", "");
            boolean chiusa = false;
            switch (c) {
                case "verde":
                case "giallo":
                    chiudi(ctx, st, s, c, null, null);
                    chiusa = true;
                    break;
                case "rosso":
                    st.put("modo", REPS);
                    st.put("bozza", s.optDouble("rip", 1));
                    break;
                case REPS:
                    st.put("modo", REPS);
                    st.put("bozza", s.optDouble("rip", 1));
                    break;
                case KG:
                    st.put("modo", KG);
                    st.put("bozza", s.isNull("kg") ? 0 : s.optDouble("kg", 0));
                    break;
                case "piu":
                case "meno":
                    st.put("bozza", sposta(modo, st.optDouble("bozza", 0), "piu".equals(c)));
                    break;
                case "via":
                    st.remove("modo");
                    st.remove("bozza");
                    break;
                case "ok":
                    double v = st.optDouble("bozza", 0);
                    st.remove("modo");
                    st.remove("bozza");
                    if (s.optBoolean("sforzo")) {
                        s.put(REPS.equals(modo) ? "rip" : "kg", v);
                    } else {
                        chiudi(ctx, st, s, "rosso", (int) v, null);
                        chiusa = true;
                    }
                    break;
                case "fatta":
                    double kg = s.isNull("kg") ? 0 : s.optDouble("kg", 0);
                    chiudi(ctx, st, s, null, s.optInt("rip", 1), kg > 0 ? kg : null);
                    chiusa = true;
                    break;
                default:
                    return false;
            }
            prefs(ctx).edit().putString(STATO, st.toString()).commit();
            disegna(ctx, st);
            if (chiusa) programmaFine(ctx, st);
            return chiusa;
        } catch (JSONException e) {
            return false;
        }
    }

    // ⚠️ Come passoCarico in lib/carico.js: i kg salgono a passi diversi.
    private static double passoKg(double n) {
        if (n >= 20) return 2.5;
        return n >= 5 ? 1 : 0.5;
    }

    private static double sposta(String modo, double v, boolean su) {
        if (KG.equals(modo)) {
            double p = passoKg(v);
            return Math.max(0, su ? v + p : v - p);
        }
        return Math.max(1, su ? v + 1 : v - 1);
    }

    // `colore` null: serie a RIR/RPE, il colore lo decide la pagina da quante ne ha fatte.
    private static void chiudi(Context ctx, JSONObject st, JSONObject s, String colore, Integer rip, Double kg) throws JSONException {
        long adesso = System.currentTimeMillis();
        JSONObject t = new JSONObject();
        t.put("sessioneId", st.optString("sessioneId"));
        t.put("esercizioId", s.optString("esercizioId"));
        t.put("j", s.optInt("j"));
        if (colore != null) t.put("colore", colore);
        if (rip != null) t.put("rip", rip);
        if (kg != null) t.put("kg", kg);
        t.put("quando", adesso);
        int recupero = s.optInt("recupero", 0);
        if (recupero > 0) {
            long fine = adesso + recupero * 1000L;
            st.put("fine", fine);
            st.put("durata", recupero);
            t.put("fine", fine);
            t.put("durata", recupero);
        }
        JSONArray coda = st.getJSONArray("serie");
        coda.remove(0);
        // I pallini delle altre serie dello stesso esercizio, che restano in coda.
        for (int n = 0; n < coda.length(); n++) {
            JSONObject x = coda.getJSONObject(n);
            JSONArray p = x.optJSONArray("pallini");
            if (p != null && x.optString("esercizioId").equals(s.optString("esercizioId"))) {
                p.put(s.optInt("j"), colore != null ? colore : "fatto");
            }
            // Come nella pagina: il peso appena scritto vale per le serie dopo.
            if (kg != null && x.optBoolean("sforzo") && x.isNull("kg") && x.optString("esercizioId").equals(s.optString("esercizioId"))) {
                x.put("kg", kg);
            }
        }
        prefs(ctx).edit().putString(TOCCHI, tocchi(ctx).put(t).toString()).commit();
    }

    // -- la fine del recupero ------------------------------------------------
    //
    // ⚠️ La sveglia da sola NON basta: a schermo spento ColorOS (OPPO) rimanda anche
    // quelle esatte, e dopo un minuto di recupero la vibrazione arrivava in ritardo
    // o mai. Il tempo vero lo tiene AllenamentoServizio; la sveglia resta per quando
    // lui non c'e'.

    private static PendingIntent intentFine(Context ctx) {
        Intent i = new Intent(ctx, AllenamentoNotifica.class).setAction(AZIONE_FINE);
        return PendingIntent.getBroadcast(ctx, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void programmaFine(Context ctx, JSONObject st) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = intentFine(ctx);
        am.cancel(pi);
        long fine = st.optLong("fine", 0);
        AllenamentoServizio.armaFine(fine);
        if (fine <= System.currentTimeMillis()) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fine, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fine, pi);
        }
    }

    /** Il recupero di adesso e' finito: la sveglia o il servizio, chi arriva prima. */
    static synchronized void fineRecupero(Context ctx) {
        JSONObject st = stato(ctx);
        long fine = st.optLong("fine", 0);
        // Il secondo che arriva, o una sveglia in ritardo di un recupero gia' cambiato.
        if (fine == 0 || fine == fineAvvisata || fine > System.currentTimeMillis() + 500) return;
        fineAvvisata = fine;
        // Il cronometro di sistema passa al conto in avanti col +.
        disegna(ctx, st);
        // Con l'app davanti suona e vibra lei (useRestTimer).
        if (AllenamentoPlugin.inPrimoPiano) return;
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
            JSONObject s = prima(st);
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANALE_FINE)
                .setSmallIcon(R.drawable.ic_notifica)
                .setColor(ACCENT)
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

    private static PendingIntent apriApp(Context ctx, int codice) {
        Intent i = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra(EXTRA_APRI, true);
        return PendingIntent.getActivity(ctx, codice, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void tasto(Context ctx, RemoteViews v, int id, int codice, String comando, JSONObject s) {
        Intent i = new Intent(ctx, AllenamentoNotifica.class)
            .setAction(AZIONE_COMANDO)
            .putExtra(EXTRA_COMANDO, comando)
            .putExtra(EXTRA_ID, s.optString("esercizioId"))
            .putExtra(EXTRA_SERIE, s.optInt("j"));
        v.setOnClickPendingIntent(id, PendingIntent.getBroadcast(ctx, codice, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
    }

    private static String numero(double n) {
        return n == Math.rint(n) ? String.valueOf((long) n) : String.format(Locale.ITALY, "%.1f", n);
    }

    // I pallini della scheda: pieni col colore dello sforzo, quello di adesso acceso.
    private static CharSequence pallini(JSONObject s) {
        JSONArray p = s.optJSONArray("pallini");
        SpannableStringBuilder b = new SpannableStringBuilder();
        if (p == null) return b;
        int qui = s.optInt("j");
        for (int n = 0; n < p.length(); n++) {
            String c = p.isNull(n) ? "" : p.optString(n);
            int colore;
            switch (c) {
                case "verde":
                    colore = VERDE;
                    break;
                case "giallo":
                    colore = GIALLO;
                    break;
                case "rosso":
                    colore = ROSSO;
                    break;
                case "":
                    colore = n == qui ? ACCENT : SPENTO;
                    break;
                default:
                    colore = ACCENT;
            }
            int da = b.length();
            b.append(c.isEmpty() && n != qui ? "○" : "●");
            b.setSpan(new ForegroundColorSpan(colore), da, b.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            b.append(' ');
        }
        return b;
    }

    private static final int[] TASTI = {
        R.id.notifica_verde, R.id.notifica_giallo, R.id.notifica_rosso,
        R.id.notifica_sforzo_reps, R.id.notifica_sforzo_kg, R.id.notifica_sforzo_fatta,
        R.id.notifica_via, R.id.notifica_meno, R.id.notifica_piu, R.id.notifica_ok, R.id.notifica_apri,
    };

    private static RemoteViews vista(Context ctx, JSONObject st, JSONObject s, boolean grande, Bitmap cifre) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.notifica_allenamento);
        String modo = st.optString("modo", "");
        boolean inModifica = s != null && !modo.isEmpty();

        String titolo = s != null ? s.optString("titolo") : "Allenamento finito";
        String dettaglio = s != null ? s.optString("dettaglio") : "Tocca per chiudere l'allenamento";
        if (inModifica) titolo = (KG.equals(modo) ? "Quanti kg? · " : "Quante reps? · ") + s.optString("nome");
        // Aperta e' come la pagina: il nome sopra, "Serie 2 di 4" coi pallini,
        // cosa fare in grande e i tasti piu' alti. Si richiude a schermo spento
        // (ColorOS): resta la chiusa, che basta da sola.
        boolean comePagina = grande && s != null;
        JSONArray tutte = s != null ? s.optJSONArray("pallini") : null;
        if (comePagina && !inModifica) titolo = s.optString("nome");
        boolean obiettivo = comePagina && !inModifica && !dettaglio.isEmpty();
        if (comePagina && tutte != null) dettaglio = "Serie " + (s.optInt("j") + 1) + " di " + tutte.length();
        v.setTextViewText(R.id.notifica_titolo, titolo);
        v.setTextViewText(R.id.notifica_dettaglio, dettaglio);
        v.setViewVisibility(R.id.notifica_dettaglio, !dettaglio.isEmpty() ? View.VISIBLE : View.GONE);
        if (obiettivo) v.setTextViewText(R.id.notifica_obiettivo, s.optString("dettaglio"));
        v.setViewVisibility(R.id.notifica_obiettivo, obiettivo ? View.VISIBLE : View.GONE);
        if (comePagina) {
            v.setTextViewTextSize(R.id.notifica_titolo, TypedValue.COMPLEX_UNIT_SP, 17);
            v.setTextViewTextSize(R.id.notifica_pallini, TypedValue.COMPLEX_UNIT_SP, 18);
            // ponytail: altezza dei tasti solo da Android 12 (setViewLayoutHeight); prima restano 36dp.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                for (int id : TASTI) v.setViewLayoutHeight(id, 48, TypedValue.COMPLEX_UNIT_DIP);
            }
        }
        if (s != null) v.setTextViewText(R.id.notifica_pallini, pallini(s));
        v.setViewVisibility(R.id.notifica_pallini, s != null ? View.VISIBLE : View.GONE);
        // Aperta c'e' posto anche per l'esercizio dopo (le serie le dicono i pallini).
        JSONArray coda = st.optJSONArray("serie");
        JSONObject poi = null;
        for (int n = 1; s != null && coda != null && poi == null && n < coda.length(); n++) {
            JSONObject x = coda.optJSONObject(n);
            if (x != null && !x.optString("esercizioId").equals(s.optString("esercizioId"))) poi = x;
        }
        if (poi != null) v.setTextViewText(R.id.notifica_dopo, "Poi: " + poi.optString("titolo"));
        v.setViewVisibility(R.id.notifica_dopo, grande && poi != null && !inModifica ? View.VISIBLE : View.GONE);

        long fine = s != null ? st.optLong("fine", 0) : 0;
        boolean conCifre = fine > 0 && cifre != null;
        v.setViewVisibility(R.id.notifica_cifre, conCifre ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.notifica_recupero, fine > 0 && !conCifre ? View.VISIBLE : View.GONE);
        if (conCifre) {
            v.setImageViewBitmap(R.id.notifica_cifre, cifre);
        } else if (fine > 0) {
            // Il cronometro di sistema, che corre anche ad app morta. Finito il
            // recupero conta in avanti col +, come nell'app: di suo scriverebbe un meno.
            long resta = fine - System.currentTimeMillis();
            long base = SystemClock.elapsedRealtime() + resta;
            v.setChronometer(R.id.notifica_recupero, base, resta > 0 ? null : "+%s", true);
            v.setChronometerCountDown(R.id.notifica_recupero, resta > 0);
        }

        boolean app = s != null && s.optBoolean("app");
        boolean sforzo = s != null && !app && !inModifica && s.optBoolean("sforzo");
        boolean colori = s != null && !app && !inModifica && !s.optBoolean("sforzo");
        v.setViewVisibility(R.id.notifica_colori, colori ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.notifica_sforzo, sforzo ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.notifica_contatore, inModifica ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.notifica_apri, app ? View.VISIBLE : View.GONE);
        if (colori) {
            tasto(ctx, v, R.id.notifica_verde, 1, "verde", s);
            tasto(ctx, v, R.id.notifica_giallo, 2, "giallo", s);
            tasto(ctx, v, R.id.notifica_rosso, 3, "rosso", s);
        }
        if (sforzo) {
            double kg = s.isNull("kg") ? 0 : s.optDouble("kg", 0);
            v.setTextViewText(R.id.notifica_sforzo_reps, s.optInt("rip", 1) + " reps");
            v.setTextViewText(R.id.notifica_sforzo_kg, kg > 0 ? numero(kg) + " kg" : "Peso");
            tasto(ctx, v, R.id.notifica_sforzo_reps, 4, REPS, s);
            tasto(ctx, v, R.id.notifica_sforzo_kg, 5, KG, s);
            tasto(ctx, v, R.id.notifica_sforzo_fatta, 6, "fatta", s);
        }
        if (inModifica) {
            v.setTextViewText(R.id.notifica_valore, numero(st.optDouble("bozza", 0)));
            tasto(ctx, v, R.id.notifica_via, 7, "via", s);
            tasto(ctx, v, R.id.notifica_meno, 8, "meno", s);
            tasto(ctx, v, R.id.notifica_piu, 9, "piu", s);
            tasto(ctx, v, R.id.notifica_ok, 10, "ok", s);
        }
        if (app) v.setOnClickPendingIntent(R.id.notifica_apri, apriApp(ctx, 11));
        return v;
    }

    static boolean inCorso(Context ctx) {
        return prefs(ctx).contains(STATO);
    }

    static void ridisegna(Context ctx) {
        disegna(ctx, stato(ctx));
    }

    /** Quando finisce il recupero che si vede, 0 se non ce n'e'. */
    static long fineRecupero(JSONObject st) {
        return prima(st) != null ? st.optLong("fine", 0) : 0;
    }

    static JSONObject statoAttuale(Context ctx) {
        return stato(ctx);
    }

    // Il testo del recupero, come nell'app: "1:05", e finito "+0:05" (TimerRecupero, formatSec).
    static String testoRecupero(long msRestanti) {
        boolean oltre = msRestanti < 0;
        long sec = oltre ? (-msRestanti) / 1000 : (msRestanti + 999) / 1000;
        return (oltre ? "+" : "") + String.format(Locale.ROOT, "%d:%02d", sec / 60, sec % 60);
    }

    // Le cifre a 7 segmenti dell'app. ⚠️ Un'immagine perche' in una notifica il
    // TextView non carica i font dell'app. Vanno ridisegnate a ogni secondo, e lo
    // fa AllenamentoServizio: `cifreVive` dice che c'e' lui a farlo. Senza, un
    // numero fermo sarebbe peggio del font di sistema, e vale il cronometro.
    private static Bitmap disegnaCifre(Context ctx, long fine) {
        try {
            if (fontCifre == null) fontCifre = ResourcesCompat.getFont(ctx, R.font.cifre_cronometro);
            float d = ctx.getResources().getDisplayMetrics().scaledDensity;
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setTypeface(fontCifre);
            p.setTextSize(24 * d);
            p.setColor(ACCENT);
            String testo = testoRecupero(fine - System.currentTimeMillis());
            Paint.FontMetrics m = p.getFontMetrics();
            int w = (int) Math.ceil(p.measureText(testo));
            int h = (int) Math.ceil(m.descent - m.ascent);
            Bitmap b = Bitmap.createBitmap(Math.max(1, w), Math.max(1, h), Bitmap.Config.ARGB_8888);
            new Canvas(b).drawText(testo, 0, -m.ascent, p);
            return b;
        } catch (RuntimeException e) {
            return null; // Vale il cronometro di sistema.
        }
    }

    /** La notifica dello stato di adesso (AllenamentoServizio). */
    static android.app.Notification attuale(Context ctx) {
        return costruisci(ctx, stato(ctx));
    }

    private static android.app.Notification costruisci(Context ctx, JSONObject st) {
        creaCanali(ctx);
        JSONObject s = prima(st);
        long fine = s != null ? st.optLong("fine", 0) : 0;
        Bitmap cifre = cifreVive && fine > 0 ? disegnaCifre(ctx, fine) : null;
        return new NotificationCompat.Builder(ctx, CANALE)
            .setSmallIcon(R.drawable.ic_notifica)
            // Il colore delle card dell'app. Si vede su tutta la notifica solo col
            // servizio acceso: senza, Android lo ignora.
            .setColor(0xFF121317)
            .setColorized(true)
            .setContentTitle(s != null ? s.optString("titolo") : "Allenamento finito")
            .setContentIntent(apriApp(ctx, 0))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setTimeoutAfter(DURATA_MAX_MS)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(vista(ctx, st, s, false, cifre))
            .setCustomBigContentView(vista(ctx, st, s, true, cifre))
            .build();
    }

    private static void disegna(Context ctx, JSONObject st) {
        try {
            ctx.getSystemService(NotificationManager.class).notify(ID, costruisci(ctx, st));
        } catch (RuntimeException e) {
            // Notifiche negate: l'allenamento va avanti nell'app.
        }
    }
}
