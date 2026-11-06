package it.progettopalestra.app;

import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

// Tiene la notifica dell'allenamento come "in primo piano". Serve a due cose:
// solo cosi' Android la lascia colorare tutta (setColorized), e il telefono non
// chiude l'app a meta' recupero. Non fa nient'altro: i tasti e il conto alla
// rovescia stanno in AllenamentoNotifica, e funzionano anche senza di lui.
public class AllenamentoServizio extends Service {

    private final Handler orologio = new Handler(Looper.getMainLooper());
    private boolean acceso;
    private static AllenamentoServizio attivo;
    private PowerManager.WakeLock sveglio;
    private final Runnable fineRecupero = new Runnable() {
        @Override
        public void run() {
            AllenamentoNotifica.fineRecupero(AllenamentoServizio.this);
            rilascia();
        }
    };

    /** Da chiamare a ogni recupero nuovo o cambiato; `fine` 0 = nessuno. */
    static void armaFine(long fine) {
        AllenamentoServizio s = attivo;
        if (s != null) s.orologio.post(() -> s.arma(fine));
    }

    // Il telefono resta sveglio solo mentre il recupero corre, e mai oltre.
    private void arma(long fine) {
        orologio.removeCallbacks(fineRecupero);
        rilascia();
        long resta = fine - System.currentTimeMillis();
        if (fine == 0 || resta <= 0) return;
        sveglio = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "palestra:recupero");
        sveglio.setReferenceCounted(false);
        sveglio.acquire(resta + 5000);
        orologio.postDelayed(fineRecupero, resta);
    }

    private void rilascia() {
        if (sveglio != null && sveglio.isHeld()) sveglio.release();
        sveglio = null;
    }

    // Le cifre del recupero (AllenamentoNotifica.disegnaCifre), un secondo alla
    // volta e solo a schermo acceso: a schermo spento non le guarda nessuno, e il
    // telefono deve poter dormire.
    private final Runnable battito = new Runnable() {
        @Override
        public void run() {
            long fine = AllenamentoNotifica.fineRecupero(AllenamentoNotifica.statoAttuale(AllenamentoServizio.this));
            long ritardo = 1000;
            if (fine > 0) {
                AllenamentoNotifica.ridisegna(AllenamentoServizio.this);
                // Il prossimo scatto del numero, non un secondo a caso.
                long resta = fine - System.currentTimeMillis();
                ritardo = Math.floorMod(resta, 1000L) + 20;
            }
            orologio.postDelayed(this, ritardo);
        }
    };

    private final BroadcastReceiver schermo = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            orologio.removeCallbacks(battito);
            if (Intent.ACTION_SCREEN_ON.equals(i.getAction())) battito.run();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        // Allenamento dimenticato: il servizio non resta acceso per sempre.
        orologio.postDelayed(this::stopSelf, AllenamentoNotifica.DURATA_MAX_MS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Riavviato da Android dopo che l'app e' morta, ad allenamento finito.
        if (!AllenamentoNotifica.inCorso(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        int tipo = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        try {
            ServiceCompat.startForeground(this, AllenamentoNotifica.ID, AllenamentoNotifica.attuale(this), tipo);
        } catch (RuntimeException e) {
            // Da sfondo Android puo' rifiutarlo: resta la notifica normale.
            AllenamentoNotifica.ridisegna(this);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!acceso) {
            acceso = true;
            attivo = this;
            AllenamentoNotifica.cifreVive = true;
            arma(AllenamentoNotifica.fineRecupero(AllenamentoNotifica.statoAttuale(this)));
            IntentFilter f = new IntentFilter(Intent.ACTION_SCREEN_ON);
            f.addAction(Intent.ACTION_SCREEN_OFF);
            ContextCompat.registerReceiver(this, schermo, f, ContextCompat.RECEIVER_NOT_EXPORTED);
            orologio.removeCallbacks(battito);
            if (getSystemService(PowerManager.class).isInteractive()) battito.run();
        }
        // ⚠️ Morto il servizio, Android toglie anche la sua notifica: STICKY lo fa
        // ripartire e la rimette, coi tasti e il recupero di prima (stanno su disco).
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        orologio.removeCallbacksAndMessages(null);
        attivo = null;
        rilascia();
        AllenamentoNotifica.cifreVive = false;
        if (acceso) unregisterReceiver(schermo);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
