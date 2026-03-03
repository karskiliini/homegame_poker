import SwiftUI

struct ChipStackView: View {
    let amount: Double
    let bigBlind: Double

    private var chips: [ChipBreakdown] {
        breakdownChips(amount: amount, bigBlind: bigBlind)
    }

    private func chipColor(_ denom: ChipDenomination) -> Color {
        switch denom {
        case .white: .white
        case .red: Color(hex: "#CC0000")
        case .green: Color(hex: "#008800")
        case .black: Color(hex: "#333333")
        case .blue: Color(hex: "#0066CC")
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .bottom) {
                let allChips = chips.flatMap { chip in
                    Array(repeating: chip.denomination, count: chip.count)
                }
                ForEach(Array(allChips.enumerated()), id: \.offset) { index, denom in
                    Circle()
                        .fill(chipColor(denom))
                        .frame(width: 16, height: 16)
                        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 0.5))
                        .offset(y: CGFloat(-index) * 3)
                }
            }
            Text(String(format: "%.0f", amount))
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
        }
    }
}
