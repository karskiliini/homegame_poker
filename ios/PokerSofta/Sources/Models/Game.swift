import Foundation

enum GameType: String, Codable {
    case NLHE, PLO
}

enum GamePhase: String, Codable {
    case waitingForPlayers = "waiting_for_players"
    case handInProgress = "hand_in_progress"
    case handComplete = "hand_complete"
    case paused
}

struct GameConfig: Codable {
    let gameType: GameType
    let smallBlind: Double
    let bigBlind: Double
    let maxBuyIn: Double
    let actionTimeSeconds: Int
    let minPlayers: Int
    let maxPlayers: Int
}

struct PotDisplay: Codable {
    let amount: Double
    let eligible: [String]
}

struct GameState: Codable {
    let phase: GamePhase
    let config: GameConfig
    let handNumber: Int
    let players: [PublicPlayerState]
    let communityCards: [CardString]
    let secondBoard: [CardString]?
    let pots: [PotDisplay]
    let currentStreet: Street?
    let dealerSeatIndex: Int
    let currentActorSeatIndex: Int?
    let actionTimeRemaining: Int
}
