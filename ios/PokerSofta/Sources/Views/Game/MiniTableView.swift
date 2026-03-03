import SwiftUI

struct MiniTableView: View {
    let gameState: GameState?
    let myId: String?

    private func seatPosition(index: Int, total: Int, in size: CGSize) -> CGPoint {
        let centerX = size.width / 2
        let centerY = size.height / 2
        let radiusX = size.width * 0.38
        let radiusY = size.height * 0.38
        // Start from bottom (player's seat) and go clockwise
        let angle = (2 * .pi * Double(index) / Double(total)) - .pi / 2
        return CGPoint(
            x: centerX + radiusX * cos(angle),
            y: centerY + radiusY * sin(angle)
        )
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Table felt background
                Ellipse()
                    .fill(
                        RadialGradient(colors: [Color(hex: "#1a6b3c"), Color(hex: "#0d4d2b")],
                                       center: .center, startRadius: 0, endRadius: geo.size.width * 0.5)
                    )
                    .padding(30)

                Ellipse()
                    .stroke(Color(hex: "#8B7355"), lineWidth: 4)
                    .padding(28)

                // Center: community cards + pot
                VStack(spacing: 8) {
                    if let state = gameState {
                        // Community cards
                        if !state.communityCards.isEmpty {
                            HStack(spacing: 4) {
                                ForEach(state.communityCards, id: \.self) { card in
                                    CardView(card: card, size: .small)
                                }
                            }
                        }

                        // Pot
                        let totalPot = state.pots.reduce(0.0) { $0 + $1.amount }
                        if totalPot > 0 {
                            Text("Pot: \(String(format: "%.2f", totalPot))")
                                .font(.system(size: 14, weight: .bold, design: .monospaced))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Capsule().fill(.black.opacity(0.5)))
                        }
                    }
                }

                // Player seats
                if let state = gameState {
                    let players = state.players.sorted { $0.seatIndex < $1.seatIndex }
                    ForEach(players, id: \.id) { player in
                        let pos = seatPosition(
                            index: reindexSeat(player.seatIndex, myId: myId, players: state.players),
                            total: max(state.players.count, 2),
                            in: geo.size
                        )
                        PlayerSeatView(player: player, isMe: player.id == myId)
                            .position(pos)
                    }
                }
            }
        }
    }

    private func reindexSeat(_ seatIndex: Int, myId: String?, players: [PublicPlayerState]) -> Int {
        // Put my seat at bottom (index 0)
        guard let myId, let _ = players.first(where: { $0.id == myId }) else { return seatIndex }
        let sorted = players.sorted { $0.seatIndex < $1.seatIndex }
        let total = players.count
        let myIdx = sorted.firstIndex { $0.seatIndex == seatIndex } ?? 0
        let myOffset = sorted.firstIndex { $0.id == myId } ?? 0
        return (myIdx - myOffset + total) % total
    }
}

struct PlayerSeatView: View {
    let player: PublicPlayerState
    let isMe: Bool

    var body: some View {
        VStack(spacing: 2) {
            PlayerAvatar(
                avatarId: player.avatarId,
                size: 36,
                isActive: player.isCurrentActor,
                isDealer: player.isDealer,
                status: player.status
            )

            Text(player.name)
                .font(.system(size: 10, weight: isMe ? .bold : .regular))
                .foregroundStyle(.white)
                .lineLimit(1)

            Text(String(format: "%.0f", player.stack))
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)

            if player.currentBet > 0 {
                Text(String(format: "%.0f", player.currentBet))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(.yellow)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(.black.opacity(0.6)))
            }
        }
        .frame(width: 60)
    }
}
