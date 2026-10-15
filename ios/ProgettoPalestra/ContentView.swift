import SwiftUI
import WebKit

let indirizzoApp = URL(string: "https://progettopalestra.it/")!

struct ContentView: View {
    var body: some View {
        WebApp()
            .ignoresSafeArea()
            .background(Color.black)
            .preferredColorScheme(.dark)
    }
}

// Lo script che gira dentro la pagina. Non tocca il codice del sito:
// guarda la card del recupero ogni mezzo secondo e, quando il timer
// sta andando, dice all'app tra quanti secondi finisce. In pausa, al
// reset o a recupero finito dice di cancellare la notifica.
private let scriptRecupero = #"""
(function () {
  var fineInviata = null;
  function manda(msg) {
    try { window.webkit.messageHandlers.recupero.postMessage(msg); } catch (e) {}
  }
  function leggiSecondi(testo) {
    var m = /^\s*(\d+):(\d{2})\s*$/.exec(testo || '');
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }
  // Il colore d'accento che l'utente ha scelto nell'app, come #rrggbb.
  function leggiAccento() {
    try {
      var el = document.createElement('span');
      el.style.color = 'var(--accent)';
      document.body.appendChild(el);
      var c = getComputedStyle(el).color;
      el.remove();
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
      if (!m) return '';
      return '#' + [m[1], m[2], m[3]].map(function (n) {
        return ('0' + parseInt(n, 10).toString(16)).slice(-2);
      }).join('');
    } catch (e) { return ''; }
  }
  function controlla() {
    var strisce = document.querySelectorAll('.recupero-striscia');
    var rimanenti = null;
    for (var i = 0; i < strisce.length; i++) {
      var s = strisce[i];
      if (!s.querySelector('button[aria-label="Pausa"]')) continue;
      var numero = s.querySelector('.recupero-numero');
      if (!numero || numero.classList.contains('oltre')) continue;
      var sec = leggiSecondi(numero.textContent);
      if (sec !== null && sec > 0) { rimanenti = sec; break; }
    }
    if (rimanenti === null) {
      if (fineInviata !== null) { manda({ azione: 'cancella' }); fineInviata = null; }
      return;
    }
    var fine = Date.now() + rimanenti * 1000;
    if (fineInviata === null || Math.abs(fine - fineInviata) > 1500) {
      manda({ azione: 'programma', secondi: rimanenti, accento: leggiAccento() });
      fineInviata = fine;
    }
  }
  setInterval(controlla, 500);
})();
"""#

struct WebApp: UIViewRepresentable {
    func makeCoordinator() -> Coordinatore { Coordinatore() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let controller = WKUserContentController()
        controller.addUserScript(WKUserScript(source: scriptRecupero,
                                              injectionTime: .atDocumentEnd,
                                              forMainFrameOnly: true))
        controller.add(context.coordinator, name: "recupero")
        config.userContentController = controller

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = true
        web.load(URLRequest(url: indirizzoApp))
        context.coordinator.web = web
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinatore: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        weak var web: WKWebView?

        // Messaggi dallo script del recupero.
        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard let dati = message.body as? [String: Any],
                  let azione = dati["azione"] as? String else { return }
            if azione == "programma", let numero = dati["secondi"] as? NSNumber {
                let secondi = numero.doubleValue
                let accento = dati["accento"] as? String ?? ""
                NotificaRecupero.programma(fraSecondi: secondi)
                RecuperoLive.avvia(fraSecondi: secondi, accento: accento)
            } else if azione == "cancella" {
                NotificaRecupero.cancella()
                RecuperoLive.ferma()
            }
        }

        // I link verso altri siti (mail, pagine esterne) si aprono fuori dall'app.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { return decisionHandler(.allow) }
            let interno = url.host == indirizzoApp.host || url.host == "palestra-bice.vercel.app"
                || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data"
            if !interno && navigationAction.navigationType == .linkActivated
                || url.scheme == "mailto" || url.scheme == "tel" {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        // Link con target="_blank".
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url { UIApplication.shared.open(url) }
            return nil
        }

        // Fotocamera e microfono: si chiede come farebbe Safari.
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        // alert(), confirm() e prompt() del sito: senza questi in un'app non comparirebbero.
        private func presenta(_ alert: UIAlertController) {
            let scena = UIApplication.shared.connectedScenes.first as? UIWindowScene
            var top = scena?.keyWindow?.rootViewController
            while let p = top?.presentedViewController { top = p }
            top?.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            presenta(a)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "Annulla", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            presenta(a)
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                     defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping (String?) -> Void) {
            let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            a.addTextField { $0.text = defaultText }
            a.addAction(UIAlertAction(title: "Annulla", style: .cancel) { _ in completionHandler(nil) })
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
            presenta(a)
        }

        // Se la pagina va in crash (succede quando iOS libera memoria), si ricarica.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }
}
