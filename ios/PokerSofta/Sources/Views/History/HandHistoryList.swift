import SwiftUI

struct HandHistoryList: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n

    private var showDetail: Binding<Bool> {
        Binding(
            get: { vm.socket.handDetail != nil },
            set: { if !$0 { vm.socket.handDetail = nil } }
        )
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.socket.handHistory.isEmpty {
                    ContentUnavailableView(
                        i18n.t("history_no_hands"),
                        systemImage: "clock.arrow.circlepath"
                    )
                } else {
                    List(vm.socket.handHistory.reversed()) { hand in
                        Button {
                            vm.socket.getHandDetail(handId: hand.handId)
                        } label: {
                            HandHistoryRow(hand: hand, myId: vm.socket.playerId)
                        }
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(i18n.t("history_title"))
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(isPresented: showDetail) {
                if let detail = vm.socket.handDetail {
                    HandHistoryDetail(hand: detail)
                }
            }
        }
    }
}

// MARK: - Row

private struct HandHistoryRow: View {
    let hand: HandRecord
    let myId: String?
    @Environment(I18n.self) private var i18n

    private var myResult: HandRecordSummary.PlayerResult? {
        hand.summary.results.first { r in
            hand.players.contains { $0.playerId == r.playerId && $0.holeCards != nil }
        }
    }

    private var winnersText: String {
        hand.pots.flatMap(\.winners).map { "\($0.playerName) +\(formatChips($0.amount))" }
            .joined(separator: ", ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("\(i18n.t("history_hand")) #\(hand.handNumber)")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
                if let result = myResult {
                    Text(formatNet(result.netChips))
                        .font(.system(.body, design: .monospaced, weight: .semibold))
                        .foregroundStyle(result.netChips > 0 ? .green : result.netChips < 0 ? .red : .gray)
                }
            }
            if !winnersText.isEmpty {
                Text(winnersText)
                    .font(.caption)
                    .foregroundStyle(.gray)
                    .lineLimit(1)
            }
            Text("\(hand.gameType.rawValue) \(formatChips(hand.blinds.small))/\(formatChips(hand.blinds.big)) - \(hand.players.count) \(i18n.t("history_players"))")
                .font(.caption2)
                .foregroundStyle(.gray.opacity(0.7))
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Helpers

private func formatChips(_ value: Double) -> String {
    value.truncatingRemainder(dividingBy: 1) == 0
        ? String(format: "%.0f", value)
        : String(format: "%.1f", value)
}

private func formatNet(_ value: Double) -> String {
    let prefix = value > 0 ? "+" : ""
    return prefix + formatChips(value)
}
