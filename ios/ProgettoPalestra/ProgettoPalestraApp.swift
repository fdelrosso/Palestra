import SwiftUI
import UserNotifications

// L'app è un contenitore: dentro gira il sito vero di ProgettoPalestra,
// sempre aggiornato all'ultima versione pubblicata. Quello che aggiunge
// l'app è la parte che una pagina web non può fare: la notifica a fine
// recupero che arriva anche col telefono bloccato e sull'Apple Watch.

@main
struct ProgettoPalestraApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let centro = UNUserNotificationCenter.current()
        centro.delegate = self
        centro.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        return true
    }

    // Con l'app aperta la notifica si vede lo stesso, in alto, col suono.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification,
                                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
}
