import SwiftUI

enum CardSize {
    case small, medium, large

    var width: CGFloat {
        switch self { case .small: 32; case .medium: 48; case .large: 70 }
    }
    var height: CGFloat {
        switch self { case .small: 46; case .medium: 68; case .large: 100 }
    }
    var fontSize: CGFloat {
        switch self { case .small: 12; case .medium: 16; case .large: 24 }
    }
}

struct CardView: View {
    let card: CardString
    let size: CardSize

    private var parsed: ParsedCard { CardUtil.parse(card) }

    private var suitColor: Color {
        switch parsed.suit {
        case .hearts: Color(hex: "#CC0000")
        case .diamonds: Color(hex: "#0066CC")
        case .clubs: Color(hex: "#008800")
        case .spades: .black
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Text(parsed.rank.display)
                .font(.system(size: size.fontSize, weight: .bold, design: .rounded))
            Text(parsed.suit.symbol)
                .font(.system(size: size.fontSize * 0.8))
        }
        .foregroundStyle(suitColor)
        .frame(width: size.width, height: size.height)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(.white)
                .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.3), lineWidth: 0.5)
        )
    }
}

struct CardBackView: View {
    let size: CardSize

    var body: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(
                LinearGradient(colors: [.red.opacity(0.8), .red.opacity(0.6)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            )
            .frame(width: size.width, height: size.height)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color.white.opacity(0.3), lineWidth: 1)
            )
    }
}

// Hex color extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
