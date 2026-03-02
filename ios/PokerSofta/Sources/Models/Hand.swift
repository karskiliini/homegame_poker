import Foundation

enum Street: String, Codable {
    case preflop, flop, turn, river
}

enum ActionType: String, Codable {
    case fold, check, call, bet, raise
    case allIn = "all_in"
}

struct PlayerAction: Codable {
    let playerId: String
    let playerName: String
    let action: ActionType
    let amount: Double
    let isAllIn: Bool
    let timestamp: Double
}
