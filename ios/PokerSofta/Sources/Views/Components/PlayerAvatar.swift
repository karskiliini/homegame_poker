import SwiftUI

struct PlayerAvatar: View {
    let avatarId: String
    let size: CGFloat
    var isActive: Bool = false
    var isDealer: Bool = false
    var status: PlayerStatus = .active

    private let avatarEmojis = ["😀", "😎", "🤠", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🤖",
                                 "👻", "🎃", "🦄", "🐲", "🦅", "🐳", "🦋", "🌟", "🔥", "💎"]

    private var emoji: String {
        guard let idx = Int(avatarId), idx >= 1, idx <= avatarEmojis.count else { return "😀" }
        return avatarEmojis[idx - 1]
    }

    private var borderColor: Color {
        if isActive { return .yellow }
        switch status {
        case .folded, .sittingOut, .busted: return .gray
        case .allIn: return .red
        default: return .blue
        }
    }

    private var opacity: Double {
        switch status {
        case .folded, .sittingOut, .busted: return 0.5
        default: return 1.0
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(.systemGray5))
                .frame(width: size, height: size)

            Text(emoji)
                .font(.system(size: size * 0.5))

            Circle()
                .stroke(borderColor, lineWidth: isActive ? 3 : 2)
                .frame(width: size, height: size)

            if isDealer {
                Text("D")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 18, height: 18)
                    .background(Circle().fill(.blue))
                    .offset(x: size / 2 - 4, y: -size / 2 + 4)
            }
        }
        .opacity(opacity)
    }
}
