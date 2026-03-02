import Foundation

func calcPotSizedBet(
    potTotal: Double, callAmount: Double, currentBet: Double,
    minRaise: Double, maxRaise: Double
) -> Int {
    let potAfterCall = potTotal + callAmount
    let potSized = currentBet + callAmount + potAfterCall
    return min(max(Int(potSized.rounded()), Int(minRaise)), Int(maxRaise))
}

func calcHalfPotBet(
    potTotal: Double, callAmount: Double, currentBet: Double,
    minRaise: Double, maxRaise: Double
) -> Int {
    let potAfterCall = potTotal + callAmount
    let halfPotSized = currentBet + callAmount + potAfterCall * 0.5
    return min(max(Int(halfPotSized.rounded()), Int(minRaise)), Int(maxRaise))
}
