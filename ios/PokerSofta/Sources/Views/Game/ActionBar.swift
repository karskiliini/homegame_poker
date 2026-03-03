import SwiftUI

struct ActionBar: View {
    let state: PrivatePlayerState
    let socket: SocketService

    @State private var raiseAmount: Double = 0

    private var canRaise: Bool {
        state.availableActions.contains(.raise) || state.availableActions.contains(.bet)
    }

    private var callLabel: String {
        if state.availableActions.contains(.call) {
            return "Call \(String(format: "%.0f", state.callAmount))"
        }
        return "Check"
    }

    var body: some View {
        VStack(spacing: 8) {
            // Bet sizing shortcuts
            if canRaise {
                HStack(spacing: 8) {
                    BetSizeButton(label: "1/2 Pot") {
                        raiseAmount = Double(calcHalfPotBet(
                            potTotal: state.potTotal, callAmount: state.callAmount,
                            currentBet: state.currentBet, minRaise: state.minRaise, maxRaise: state.maxRaise))
                    }
                    BetSizeButton(label: "Pot") {
                        raiseAmount = Double(calcPotSizedBet(
                            potTotal: state.potTotal, callAmount: state.callAmount,
                            currentBet: state.currentBet, minRaise: state.minRaise, maxRaise: state.maxRaise))
                    }
                    BetSizeButton(label: "All In") {
                        raiseAmount = state.maxRaise
                    }
                }
                .padding(.horizontal, 16)

                // Slider
                HStack {
                    Text(String(format: "%.0f", state.minRaise))
                        .font(.caption2)
                        .monospacedDigit()
                    Slider(value: $raiseAmount, in: state.minRaise...state.maxRaise, step: max(1, state.minRaise))
                    Text(String(format: "%.0f", state.maxRaise))
                        .font(.caption2)
                        .monospacedDigit()
                }
                .padding(.horizontal, 16)

                Text(String(format: "%.0f", raiseAmount))
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundStyle(.yellow)
            }

            // Action buttons
            HStack(spacing: 12) {
                // Fold
                if state.availableActions.contains(.fold) {
                    ActionButton(label: "Fold", color: Color(hex: "#dc2626")) {
                        socket.sendAction(.fold)
                        HapticsManager.action()
                    }
                }

                // Check / Call
                if state.availableActions.contains(.check) {
                    ActionButton(label: "Check", color: Color(hex: "#16a34a")) {
                        socket.sendAction(.check)
                        HapticsManager.action()
                    }
                } else if state.availableActions.contains(.call) {
                    ActionButton(label: callLabel, color: Color(hex: "#2563eb")) {
                        socket.sendAction(.call)
                        HapticsManager.action()
                    }
                }

                // Raise / Bet
                if canRaise {
                    let action: ActionType = state.availableActions.contains(.raise) ? .raise : .bet
                    ActionButton(
                        label: "\(action == .raise ? "Raise" : "Bet") \(String(format: "%.0f", raiseAmount))",
                        color: Color(hex: "#eab308")
                    ) {
                        socket.sendAction(action, amount: raiseAmount)
                        HapticsManager.action()
                    }
                }

                // All-in (when can't raise but all_in is available)
                if state.availableActions.contains(.allIn) && !canRaise {
                    ActionButton(label: "All In", color: Color(hex: "#dc2626")) {
                        socket.sendAction(.allIn)
                        HapticsManager.action()
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .padding(.top, 8)
        .background(Color(.systemBackground).opacity(0.95))
        .onAppear {
            raiseAmount = state.minRaise
        }
        .onChange(of: state.minRaise) { _, newMin in
            raiseAmount = newMin
        }
    }
}

struct ActionButton: View {
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(color)
                )
        }
    }
}

struct BetSizeButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(.systemGray5))
                )
        }
    }
}
