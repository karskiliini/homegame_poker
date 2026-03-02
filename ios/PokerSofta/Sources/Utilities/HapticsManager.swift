import UIKit

enum HapticsManager {
    static func yourTurn() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    static func action() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func handWon() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func busted() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
