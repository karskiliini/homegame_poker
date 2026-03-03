import SwiftUI

struct LoginView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @State private var name = ""
    @State private var password = ""
    @State private var nameExists: Bool?
    @State private var showRegister = false
    @State private var checkTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Title
                Text(i18n.t("login_title"))
                    .font(.system(size: 36, weight: .bold))
                Text(i18n.t("login_subtitle"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                // Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(i18n.t("login_name_label"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField(i18n.t("login_name_placeholder"), text: $name)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: name) { _, newValue in
                                checkTask?.cancel()
                                guard !newValue.trimmingCharacters(in: .whitespaces).isEmpty else {
                                    nameExists = nil
                                    return
                                }
                                checkTask = Task {
                                    try? await Task.sleep(for: .milliseconds(500))
                                    guard !Task.isCancelled else { return }
                                    vm.socket.checkName(newValue.trimmingCharacters(in: .whitespaces))
                                }
                            }
                        if let exists = nameExists {
                            Text(exists ? i18n.t("auth_welcome_back") : i18n.t("auth_new_player"))
                                .font(.caption)
                                .foregroundStyle(exists ? .green : .blue)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(i18n.t("auth_password_label"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        SecureField(i18n.t("auth_password_placeholder"), text: $password)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                .padding(.horizontal, 32)

                // Error
                if let error = vm.socket.authError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                // Buttons
                VStack(spacing: 12) {
                    Button {
                        vm.socket.login(name: name.trimmingCharacters(in: .whitespaces), password: password)
                    } label: {
                        Text(i18n.t("auth_login"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)

                    Button {
                        showRegister = true
                    } label: {
                        Text(i18n.t("auth_create_account"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .sheet(isPresented: $showRegister) {
                RegisterView(initialName: name)
            }
        }
    }
}
