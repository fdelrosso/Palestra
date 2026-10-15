import ActivityKit
import Foundation

// I dati del recupero che l'app passa al riquadro sul notch e sulla
// schermata di blocco. Lo stesso file c'è anche in PalestraTimer:
// i due devono restare identici.
nonisolated struct RecuperoAttributi: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var inizio: Date
        var fine: Date
        // Il colore d'accento scelto nell'app, es. "#5cc8f5".
        var accento: String
        // Cosa sta succedendo nell'allenamento. Vuoti se l'app non li trova.
        var nomeAllenamento: String = ""
        var esercizio: String = ""
        var serie: String = ""
        // Da quando è iniziato l'allenamento, per il timer totale.
        var inizioAllenamento: Date? = nil
    }
}
