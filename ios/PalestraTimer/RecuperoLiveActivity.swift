import ActivityKit
import SwiftUI
import WidgetKit

// Come si vede il recupero fuori dall'app: sul notch (Dynamic Island)
// e sulla schermata di blocco. Stesso stile della card del recupero
// dentro l'app: fondo ardesia, etichetta piccola in maiuscolo grigia,
// cifre da cronometro a 7 segmenti, una sola nota di colore (l'accento
// scelto nell'app). Il numero scorre da solo.

private enum Stile {
    static let ardesia = Color(red: 0x12/255, green: 0x13/255, blue: 0x17/255)
    static let ardesiaChiara = Color(red: 0x1c/255, green: 0x1e/255, blue: 0x24/255)
    static let gesso = Color(red: 0xf3/255, green: 0xf5/255, blue: 0xf9/255)
    static let grigioNota = Color(red: 0x98/255, green: 0xa2/255, blue: 0xb3/255)
    static let celeste = Color(red: 0x5c/255, green: 0xc8/255, blue: 0xf5/255)

    static func cifre(_ size: CGFloat) -> Font { .custom("CifreCronometro-Bold", size: size) }

    static func accento(_ hex: String) -> Color {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return celeste }
        return Color(red: Double((v >> 16) & 0xff) / 255,
                     green: Double((v >> 8) & 0xff) / 255,
                     blue: Double(v & 0xff) / 255)
    }
}

struct RecuperoLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RecuperoAttributi.self) { context in
            SchermataBlocco(stato: context.state, finito: context.isStale)
                .activityBackgroundTint(Stile.ardesia)
                .activitySystemActionForegroundColor(Stile.gesso)
        } dynamicIsland: { context in
            let accento = Stile.accento(context.state.accento)
            let finito = context.isStale
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Logo(lato: 24)
                        Etichetta(finito: finito)
                    }
                    .padding(.leading, 8)
                    .padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Fine(stato: context.state)
                        .padding(.trailing, 8)
                        .padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 12) {
                        Conto(stato: context.state, finito: finito, size: 44)
                        Barra(stato: context.state, finito: finito)
                    }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                // Logo dell'app e subito accanto la ghiera, come il timer Apple.
                HStack(spacing: 6) {
                    Logo(lato: 22, tondo: true)
                    Anello(stato: context.state, finito: finito)
                }
            } compactTrailing: {
                Conto(stato: context.state, finito: finito, size: 15)
                    .frame(width: 50, alignment: .trailing)
            } minimal: {
                Anello(stato: context.state, finito: finito)
            }
            .keylineTint(accento)
        }
    }
}

// L'icona dell'app, arrotondata come sulla home.
private struct Logo: View {
    let lato: CGFloat
    var tondo: Bool = false
    var body: some View {
        if let img = UIImage(named: "LogoApp") {
            Image(uiImage: img)
                .resizable()
                .frame(width: lato, height: lato)
                .clipShape(RoundedRectangle(cornerRadius: lato * (tondo ? 0.5 : 0.26), style: .continuous))
        }
    }
}

// "RECUPERO" piccolo e grigio, come il titolo della card nell'app.
private struct Etichetta: View {
    let finito: Bool
    var body: some View {
        Text(finito ? "Recupero finito" : "Recupero")
            .font(.system(size: 12.5, weight: .heavy))
            .tracking(0.5)
            .textCase(.uppercase)
            .foregroundStyle(Stile.grigioNota)
    }
}

// A che ora finisce il recupero.
private struct Fine: View {
    let stato: RecuperoAttributi.ContentState
    var body: some View {
        Text("fino alle \(stato.fine, style: .time)")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(Stile.grigioNota)
    }
}

// Le cifre del cronometro. Finito il recupero si fermano a 0:00
// col colore dell'app, come il numero nella card quando si sfora.
private struct Conto: View {
    let stato: RecuperoAttributi.ContentState
    let finito: Bool
    let size: CGFloat
    var colore: Color? = nil

    var body: some View {
        if finito {
            Text("0:00")
                .font(Stile.cifre(size))
                .foregroundStyle(Stile.accento(stato.accento))
        } else {
            Text(timerInterval: stato.inizio...stato.fine, countsDown: true)
                .font(Stile.cifre(size))
                .monospacedDigit()
                .foregroundStyle(colore ?? Stile.gesso)
        }
    }
}

// La barra che si svuota, nel colore dell'app.
private struct Barra: View {
    let stato: RecuperoAttributi.ContentState
    let finito: Bool

    var body: some View {
        Group {
            if finito {
                Capsule().fill(Stile.ardesiaChiara)
            } else {
                ProgressView(timerInterval: stato.inizio...stato.fine,
                             countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                    .progressViewStyle(.linear)
            }
        }
        .tint(Stile.accento(stato.accento))
        .frame(height: 6)
    }
}

// L'anellino a sinistra del notch: si svuota col passare del recupero.
private struct Anello: View {
    let stato: RecuperoAttributi.ContentState
    let finito: Bool

    var body: some View {
        let accento = Stile.accento(stato.accento)
        Group {
            if finito {
                Circle().fill(accento).frame(width: 10, height: 10)
            } else {
                ProgressView(timerInterval: stato.inizio...stato.fine,
                             countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                    .progressViewStyle(.circular)
            }
        }
        .tint(accento)
        .frame(width: 22, height: 22)
    }
}

private struct SchermataBlocco: View {
    let stato: RecuperoAttributi.ContentState
    let finito: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // In alto: logo, nome dell'allenamento e da quanto dura.
            HStack(alignment: .center, spacing: 10) {
                Logo(lato: 30)
                Text(stato.nomeAllenamento.isEmpty ? "Recupero" : stato.nomeAllenamento)
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(Stile.gesso)
                    .lineLimit(1)
                Spacer(minLength: 8)
                if let inizio = stato.inizioAllenamento {
                    Text(timerInterval: inizio...inizio.addingTimeInterval(86400),
                         pauseTime: nil, countsDown: false, showsHours: true)
                        .font(.system(size: 17, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(Stile.gesso)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 90, alignment: .trailing)
                }
            }
            // Sotto: esercizio e serie a sinistra, recupero a destra.
            HStack(alignment: .center, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    if !stato.esercizio.isEmpty {
                        Text(stato.esercizio)
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(Stile.gesso)
                            .lineLimit(2)
                    }
                    Text(stato.serie.isEmpty ? (finito ? "Recupero finito" : "Recupero") : stato.serie)
                        .font(.system(size: 17, weight: .regular))
                        .foregroundStyle(Stile.gesso)
                }
                Spacer(minLength: 8)
                Conto(stato: stato, finito: finito, size: 56,
                      colore: Stile.accento(stato.accento))
            }
        }
        .padding(18)
    }
}
