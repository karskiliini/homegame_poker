import Foundation

typealias CardString = String

enum Suit: String, Codable {
    case hearts = "h"
    case diamonds = "d"
    case clubs = "c"
    case spades = "s"

    var symbol: String {
        switch self {
        case .hearts: "♥"
        case .diamonds: "♦"
        case .clubs: "♣"
        case .spades: "♠"
        }
    }

    var color: String {
        switch self {
        case .hearts: "#CC0000"
        case .diamonds: "#0066CC"
        case .clubs: "#008800"
        case .spades: "#000000"
        }
    }
}

enum Rank: String, Codable, Comparable {
    case two = "2", three = "3", four = "4", five = "5"
    case six = "6", seven = "7", eight = "8", nine = "9"
    case ten = "T", jack = "J", queen = "Q", king = "K", ace = "A"

    var display: String {
        switch self {
        case .ten: "10"
        case .jack: "J"
        case .queen: "Q"
        case .king: "K"
        case .ace: "A"
        default: rawValue
        }
    }

    private var order: Int {
        switch self {
        case .two: 2; case .three: 3; case .four: 4; case .five: 5
        case .six: 6; case .seven: 7; case .eight: 8; case .nine: 9
        case .ten: 10; case .jack: 11; case .queen: 12; case .king: 13; case .ace: 14
        }
    }

    static func < (lhs: Rank, rhs: Rank) -> Bool { lhs.order < rhs.order }
}

struct ParsedCard {
    let rank: Rank
    let suit: Suit
    var symbol: String { suit.symbol }
    var display: String { "\(rank.display)\(suit.symbol)" }
}

enum CardUtil {
    static func parse(_ card: CardString) -> ParsedCard {
        let rankChar = String(card.prefix(1))
        let suitChar = String(card.suffix(1))
        return ParsedCard(
            rank: Rank(rawValue: rankChar)!,
            suit: Suit(rawValue: suitChar)!
        )
    }
}
