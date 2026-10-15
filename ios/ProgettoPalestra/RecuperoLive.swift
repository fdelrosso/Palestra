import ActivityKit
import Foundation

// Il conto alla rovescia sul notch (Dynamic Island) e sulla schermata
// di blocco. Parte insieme al recupero, si aggiorna se il tempo cambia
// e sparisce in pausa, al reset o a recupero finito.
// Toccando il notch si torna dentro l'app.

enum RecuperoLive {
    static func avvia(fraSecondi secondi: Double, accento: String) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, secondi >= 1 else { return }
        let adesso = Date()
        let stato = RecuperoAttributi.ContentState(inizio: adesso,
                                                   fine: adesso.addingTimeInterval(secondi),
                                                   accento: accento)
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
