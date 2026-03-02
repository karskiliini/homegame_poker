import Foundation

struct HandRecord: Codable, Identifiable {
    let handId: String
    let handNumber: Int
    let gameType: GameType
    let timestamp: Double
    let blinds: Blinds
    let players: [HandRecordPlayer]
    let streets: [HandRecordStreet]
    let pots: [HandRecordPot]
    let communityCards: [CardString]
    let secondBoard: [CardString]?
    let summary: HandRecordSummary

    var id: String { handId }

    struct Blinds: Codable {
        let small: Double
        let big: Double
    }
}

struct HandRecordPlayer: Codable {
    let playerId: String
    let name: String
    let seatIndex: Int
    let startingStack: Double
    let holeCards: [CardString]?
    let isDealer: Bool
    let isSmallBlind: Bool
    let isBigBlind: Bool
    let shownAtShowdown: Bool
}

struct HandRecordStreet: Codable {
    let street: Street
    let boardCards: [CardString]
    let actions: [PlayerAction]
}

struct HandRecordPot: Codable {
    let name: String
    let amount: Double
    let winners: [PotWinner]
    let winningHand: String?

    struct PotWinner: Codable {
        let playerId: String
        let playerName: String
        let amount: Double
    }
}

struct HandRecordSummary: Codable {
    let results: [PlayerResult]

    struct PlayerResult: Codable {
        let playerId: String
        let playerName: String
        let netChips: Double
    }
}
