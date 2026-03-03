import SwiftUI

struct PreActionBar: View {
    @State private var preAction: PreActionType?

    var body: some View {
        HStack(spacing: 16) {
            Toggle("Check/Fold", isOn: Binding(
                get: { preAction == .checkFold },
                set: { preAction = $0 ? .checkFold : nil }
            ))
            .toggleStyle(.button)
            .tint(.orange)

            Toggle("Auto-Check", isOn: Binding(
                get: { preAction == .autoCheck },
                set: { preAction = $0 ? .autoCheck : nil }
            ))
            .toggleStyle(.button)
            .tint(.green)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
