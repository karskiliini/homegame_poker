import SwiftUI

struct RegisterView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @Environment(\.dismiss) private var dismiss
    @State var initialName: String
    @State private var password = ""
    @State private var selectedAvatar = "1"

    private let avatarEmojis = ["😀", "😎", "🤠", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🤖",
                                 "👻", "🎃", "🦄", "🐲", "🦅", "🐳", "🦋", "🌟", "🔥", "💎"]

    var body: some View {
        NavigationStack {
            Form {
                Section(i18n.t("auth_name")) {
                    TextField(i18n.t("login_name_placeholder"), text: $initialName)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section(i18n.t("auth_password_label")) {
                    SecureField(i18n.t("auth_password_placeholder"), text: $password)
                }

                Section(i18n.t("login_avatar_label")) {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 12) {
                        ForEach(Array(avatarEmojis.enumerated()), id: \.offset) { index, emoji in
                            let id = String(index + 1)
                            Button {
                                selectedAvatar = id
                            } label: {
                                Text(emoji)
                                    .font(.system(size: 32))
                                    .frame(width: 50, height: 50)
                                    .background(
                                        Circle()
                                            .fill(selectedAvatar == id ? Color.blue.opacity(0.3) : Color.clear)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(selectedAvatar == id ? Color.blue : Color.clear, lineWidth: 2)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if let error = vm.socket.authError {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(i18n.t("auth_register"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(i18n.t("watching_cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(i18n.t("auth_register")) {
                        vm.socket.register(
                            name: initialName.trimmingCharacters(in: .whitespaces),
                            password: password,
                            avatarId: selectedAvatar
                        )
                    }
                    .disabled(initialName.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)
                }
            }
        }
    }
}
