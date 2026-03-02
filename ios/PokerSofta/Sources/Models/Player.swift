import Foundation

enum PlayerStatus: String, Codable {
    case sittingOut = "sitting_out"
    case waiting
    case active
    case folded
    case allIn = "all_in"
    case busted
}

struct PublicPlayerState: Codable {
    let id: String
    let name: String
    let seatIndex: Int
    let stack: Double
    let status: PlayerStatus
    let isConnected: Bool
    let disconnectedAt: Double?
    let currentBet: Double
    let isDealer: Bool
    let isSmallBlind: Bool
    let isBigBlind: Bool
    let isCurrentActor: Bool
    let holeCards: [CardString]?
    let hasCards: Bool
    let avatarId: String
}

struct PrivatePlayerState: Codable {
    let id: String
    let name: String
    let seatIndex: Int
    let stack: Double
    let status: PlayerStatus
    let holeCards: [CardString]
    let currentBet: Double
    let availableActions: [ActionType]
    let minRaise: Double
    let maxRaise: Double
    let callAmount: Double
    let potTotal: Double
    let isMyTurn: Bool
    let showCardsOption: Bool
    let runItTwiceOffer: Bool
    let runItTwiceDeadline: Double
    let sitOutNextHand: Bool
    let autoMuck: Bool
}
