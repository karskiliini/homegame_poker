import Foundation

enum ChipDenomination: String, CaseIterable {
    case white, red, green, black, blue
}

struct ChipBreakdown {
    let denomination: ChipDenomination
    var count: Int
}

private let maxTotalChips = 10

private let denominations: [(name: ChipDenomination, multiplier: Double)] = [
    (.blue, 100), (.black, 25), (.green, 5), (.red, 1), (.white, 0.5),
]

func breakdownChips(amount: Double, bigBlind: Double) -> [ChipBreakdown] {
    guard amount > 0 else { return [] }

    var result: [ChipBreakdown] = []
    var remaining = amount
    var totalChips = 0

    for (name, multiplier) in denominations {
        let chipValue = multiplier * bigBlind
        if chipValue > remaining { continue }

        let maxForDenom = maxTotalChips - totalChips
        if maxForDenom <= 0 { break }

        let count = min(Int(remaining / chipValue), maxForDenom)
        if count > 0 {
            result.append(ChipBreakdown(denomination: name, count: count))
            remaining -= Double(count) * chipValue
            totalChips += count
        }
    }

    if remaining > 0 && totalChips < maxTotalChips {
        let smallest = ChipDenomination.white
        if let idx = result.firstIndex(where: { $0.denomination == smallest }) {
            result[idx].count += 1
        } else {
            result.append(ChipBreakdown(denomination: smallest, count: 1))
        }
    }

    return result
}
