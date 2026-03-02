import Foundation

enum PokerConstants {
    static let minPlayers = 2
    static let maxPlayers = 10
    static let defaultActionTimeSeconds = 30
    static let handCompletePauseMs = 5000
    static let ritTimeoutMs = 10000
    static let showCardsTimeoutMs = 10000
    static let rebuyPromptMs = 5000
    static let maxHandHistory = 100
    static let disconnectTimeoutMs = 30_000
    static let chipTrickCooldownMs = 3000
    static let chipTrickMinStack: Double = 100
}
