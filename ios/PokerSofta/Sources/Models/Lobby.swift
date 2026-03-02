import Foundation

struct StakeLevel: Codable, Identifiable {
    let id: String
    let gameType: GameType
    let smallBlind: Double
    let bigBlind: Double
    let maxBuyIn: Double
    let label: String
}

struct TablePlayerInfo: Codable {
    let name: String
    let stack: Double
    let seatIndex: Int
    let avatarId: String
}

struct TableInfo: Codable, Identifiable {
    let tableId: String
    let name: String
    let stakeLevel: StakeLevel
    let playerCount: Int
    let maxPlayers: Int
    let players: [TablePlayerInfo]
    let phase: String

    var id: String { tableId }
}

struct BalanceTransaction: Codable, Identifiable {
    let id: Int
    let type: String
    let amount: Double
    let tableId: String?
    let createdAt: String
}

struct AuthSuccess: Codable {
    let playerId: String
    let name: String
    let avatarId: String
    let balance: Double
    let sessionToken: String
}
