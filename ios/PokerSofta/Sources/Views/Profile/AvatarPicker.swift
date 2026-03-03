import SwiftUI

struct AvatarPicker: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @Environment(\.dismiss) private var dismiss

    private let avatarEmojis = ["😀", "😎", "🤠", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🤖",
                                 "👻", "🎃", "🦄", "🐲", "🦅", "🐳", "🦋", "🌟", "🔥", "💎"]

    private var currentAvatarId: String {
        vm.socket.authState?.avatarId ?? "1"
    }

    var body: some View {
        NavigationStack {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                ForEach(Array(avatarEmojis.enumerated()), id: \.offset) { index, emoji in
                    let id = String(index + 1)
                    Button {
                        vm.socket.updateLobbyAvatar(id)
                        dismiss()
                    } label: {
                        Text(emoji)
                            .font(.system(size: 36))
                            .frame(width: 56, height: 56)
                            .background(
                                Circle()
                                    .fill(currentAvatarId == id ? Color.blue.opacity(0.3) : Color.clear)
                            )
                            .overlay(
                                Circle()
                                    .stroke(currentAvatarId == id ? Color.blue : Color.clear, lineWidth: 2)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
            .navigationTitle(i18n.t("profile_change_avatar"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(i18n.t("watching_cancel")) { dismiss() }
                }
            }
        }
    }
}
