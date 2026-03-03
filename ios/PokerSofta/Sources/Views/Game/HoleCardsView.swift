import SwiftUI

struct HoleCardsView: View {
    let cards: [CardString]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(cards, id: \.self) { card in
                CardView(card: card, size: .large)
            }
        }
        .padding(.vertical, 8)
    }
}
