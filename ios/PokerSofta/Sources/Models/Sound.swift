import Foundation

enum SoundType: String, Codable {
    case cardDeal = "card_deal"
    case cardFlip = "card_flip"
    case chipBet = "chip_bet"
    case chipWin = "chip_win"
    case check, fold
    case allIn = "all_in"
    case timerWarning = "timer_warning"
    case yourTurn = "your_turn"
}
