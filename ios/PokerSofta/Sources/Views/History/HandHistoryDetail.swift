import SwiftUI

struct HandHistoryDetail: View {
    let hand: HandRecord
    @Environment(I18n.self) private var i18n

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Community cards
                if !hand.communityCards.isEmpty {
                    communityCardsSection
                }

                // Second board (Run It Twice)
                if let second = hand.secondBoard, !second.isEmpty {
                    secondBoardSection(second)
                }

                // Players
                playersSection

                // Streets
                ForEach(Array(hand.streets.enumerated()), id: \.offset) { _, street in
                    streetSection(street)
                }

                Divider().overlay(Color.gray.opacity(0.3))

                // Pot results
                potsSection

                // Hole cards at showdown
                showdownCardsSection

                // Net results summary
                resultsSummary
            }
            .padding()
        }
        .background(Color(hex: "#0d1117"))
        .navigationTitle("\(i18n.t("history_hand")) #\(hand.handNumber)")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Sections

    private var communityCardsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(hand.secondBoard != nil ? i18n.t("history_board_1") : i18n.t("history_board"))
                .font(.caption)
                .foregroundStyle(.gray)
            HStack(spacing: 4) {
                ForEach(Array(hand.communityCards.enumerated()), id: \.offset) { _, card in
                    CardView(card: card, size: .small)
                }
            }
        }
    }

    private func secondBoardSection(_ cards: [CardString]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(i18n.t("history_board_2"))
                .font(.caption)
                .foregroundStyle(.gray)
            HStack(spacing: 4) {
                ForEach(Array(cards.enumerated()), id: \.offset) { _, card in
                    CardView(card: card, size: .small)
                }
            }
        }
    }

    private var playersSection: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(hand.players, id: \.playerId) { player in
                HStack(spacing: 4) {
                    Text("\(i18n.t("history_seat")) \(player.seatIndex + 1):")
                        .foregroundStyle(.gray)
                    Text(player.name)
                        .foregroundStyle(.white)
                    Text("(\(formatChips(player.startingStack)))")
                        .foregroundStyle(.gray)
                    positionBadges(for: player)
                }
                .font(.system(.caption, design: .monospaced))
            }
        }
    }

    private func positionBadges(for player: HandRecordPlayer) -> some View {
        HStack(spacing: 2) {
            if player.isDealer { badge("D", color: .yellow) }
            if player.isSmallBlind { badge("SB", color: .blue) }
            if player.isBigBlind { badge("BB", color: .orange) }
        }
    }

    private func badge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .bold, design: .monospaced))
            .foregroundStyle(.white)
            .padding(.horizontal, 4)
            .padding(.vertical, 1)
            .background(Capsule().fill(color.opacity(0.7)))
    }

    private func streetSection(_ street: HandRecordStreet) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(streetName(street.street))
                    .font(.system(.subheadline, weight: .bold))
                    .foregroundStyle(.green)
                if !street.boardCards.isEmpty {
                    HStack(spacing: 3) {
                        ForEach(Array(street.boardCards.enumerated()), id: \.offset) { _, card in
                            CardView(card: card, size: .small)
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(street.actions.enumerated()), id: \.offset) { _, action in
                    Text(formatAction(action))
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
            .padding(.leading, 8)
        }
    }

    private var potsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(i18n.t("history_results"))
                .font(.system(.subheadline, weight: .bold))
                .foregroundStyle(.yellow)
            ForEach(Array(hand.pots.enumerated()), id: \.offset) { _, pot in
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(pot.winners.enumerated()), id: \.offset) { _, winner in
                        HStack(spacing: 4) {
                            Text(winner.playerName)
                                .foregroundStyle(.green)
                            Text("\(i18n.t("history_wins_from")) \(formatChips(winner.amount))")
                                .foregroundStyle(.green.opacity(0.8))
                            Text("\(i18n.t("history_from")) \(pot.name)")
                                .foregroundStyle(.gray)
                        }
                        .font(.system(.caption, design: .monospaced))
                    }
                    if let winHand = pot.winningHand {
                        Text("(\(winHand))")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(.gray)
                            .padding(.leading, 8)
                    }
                }
            }
        }
    }

    private var showdownCardsSection: some View {
        let shown = hand.players.filter { $0.holeCards != nil && $0.shownAtShowdown }
        return Group {
            if !shown.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(shown, id: \.playerId) { player in
                        HStack(spacing: 6) {
                            Text("\(player.name):")
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(.white)
                            if let cards = player.holeCards {
                                ForEach(Array(cards.enumerated()), id: \.offset) { _, card in
                                    CardView(card: card, size: .small)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private var resultsSummary: some View {
        VStack(alignment: .leading, spacing: 2) {
            Divider().overlay(Color.gray.opacity(0.3))
            ForEach(hand.summary.results, id: \.playerId) { result in
                HStack {
                    Text(result.playerName)
                        .foregroundStyle(.white)
                    Spacer()
                    Text(formatNet(result.netChips))
                        .foregroundStyle(result.netChips > 0 ? .green : result.netChips < 0 ? .red : .gray)
                }
                .font(.system(.caption, design: .monospaced))
            }
        }
        .padding(.bottom, 24)
    }

    // MARK: - Formatting

    private func streetName(_ street: Street) -> String {
        let key = "history_\(street.rawValue)"
        let translated = i18n.t(key)
        // If t() returns the key itself, the translation is missing -- use raw value
        return translated == key ? street.rawValue.uppercased() : translated
    }

    private func formatAction(_ action: PlayerAction) -> String {
        switch action.action {
        case .fold:
            "\(action.playerName) \(i18n.t("history_folds"))"
        case .check:
            "\(action.playerName) \(i18n.t("history_checks"))"
        case .call:
            "\(action.playerName) \(i18n.t("history_calls")) \(formatChips(action.amount))\(action.isAllIn ? " (all-in)" : "")"
        case .bet:
            "\(action.playerName) \(i18n.t("history_bets")) \(formatChips(action.amount))\(action.isAllIn ? " (all-in)" : "")"
        case .raise:
            "\(action.playerName) \(i18n.t("history_raises_to")) \(formatChips(action.amount))\(action.isAllIn ? " (all-in)" : "")"
        case .allIn:
            "\(action.playerName) \(i18n.t("history_goes_all_in")) \(formatChips(action.amount))"
        }
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
