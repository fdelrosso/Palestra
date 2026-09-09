# Palestra — Risposte già date all'utente

> Se una di queste domande torna, la risposta deve tornare **uguale**.
> (I numeri di listino vanno riverificati.)

> ← torna a [context.md](../context.md) (mappa dei file, modello dati, rotte).

---

1. **App sul telefono, gratis?** È già una PWA: icone (fatte) + URL HTTPS (Vercel/Netlify/Cloudflare
   Pages) + "Aggiungi alla schermata Home" da **Safari**. Costo 0. Le notifiche push funzionano in
   PWA da iOS 16.4, ma solo dopo l'aggiunta alla Home.
2. **Si aggiorna da sola?** Sì, `registerType:'autoUpdate'`. Si vede all'apertura successiva (a volte
   alla seconda). Attenzione ai cambi di **struttura dati**: il codice arriva, i dati vecchi no.
3. **Apple Watch (battiti + calorie)?** **Non automaticamente**, ed è un muro di Apple: niente Web API
   per HealthKit, niente Web Bluetooth su Safari iOS. Vie: (a) **a mano** ← implementata;
   (b) Comandi/Shortcuts verso il cloud (gratis ma ~30 min di setup per persona); (c) app nativa +
   watchOS (Mac + 99 $/anno). Riassunto: **calorie sì, battiti live no**.
4. **Farla usare agli amici?** Basta il link, ma per sfruttare i loro allenamenti serve il cloud.
5. **Il database è gratuito?** Sì per questo uso. **Supabase free**: ~500MB di database (testo: decine
   di migliaia di allenamenti), **~1GB di storage file** (il vero vincolo), ~5GB/mese di banda, auth
   inclusa. ⚠️ I progetti gratuiti vanno in pausa dopo ~1 settimana senza traffico. Se un giorno
   servissero video senza limiti: **Cloudflare R2** (~1,50 $/mese per 100GB e **banda in uscita
   gratuita**) o link esterni (YouTube non in elenco). Riferimento: una clip di 30" pesa ~15MB in
   720p → 1GB ≈ 60 clip. Da qui il limite di 10 secondi.

---

