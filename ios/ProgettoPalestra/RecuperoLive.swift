import ActivityKit
import Foundation

// Il conto alla rovescia sul notch (Dynamic Island) e sulla schermata
// di blocco. Parte insieme al recupero, si aggiorna se il tempo cambia
// e sparisce in pausa, al reset o a recupero finito.
// Toccando il notch si torna dentro l'app.

enum RecuperoLive {
    static func avvia(fraSecondi secondi: Double, accento: String,
                      nomeAllenamento: String = "", esercizio: String = "",
                      serie: String = "", inizioAllenamento: Date? = nil) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, secondi >= 1 else { return }
        let adesso = Date()
        var inizio = adesso
        var fine = adesso.addingTimeInterval(secondi)
        // Se è cambiato solo l'esercizio o la serie e il recupero è lo stesso,
        // la ghiera non riparte da capo.
        if let vecchio = Activity<RecuperoAttributi>.activities.first?.content.state,
           abs(vecchio.fine.timeIntervalSince(fine)) < 2 {
            inizio = vecchio.inizio
            fine = vecchio.fine
        }
        let stato = RecuperoAttributi.ContentState(inizio: inizio,
                                                   fine: fine,
                                                   accento: accento,
                                                   nomeAllenamento: nomeAllenamento,
                                                   esercizio: esercizio,
                                                   serie: serie,
                                                   inizioAllenamento: inizioAllenamento)
        let contenuto = ActivityContent(state: stato,
                                        staleDate: stato.fine,
                                        relevanceScore: 100)
        if let activity = Activity<RecuperoAttributi>.activities.first {
            Task { await activity.update(contenuto) }
        } else {
            _ = try? Activity.request(attributes: RecuperoAttributi(),
                                      content: contenuto,
                                      pushType: nil)
        }
    }

    static func ferma() {
        for activity in Activity<RecuperoAttributi>.activities {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }
    }
}
