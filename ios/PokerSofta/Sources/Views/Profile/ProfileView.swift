import SwiftUI

struct ProfileView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @Environment(\.dismiss) private var dismiss
    @State private var showAvatarPicker = false
    @State private var showDeposit = false
    @State private var depositAmount = ""

    private var avatarId: String {
        vm.socket.authState?.avatarId ?? "1"
    }

    var body: some View {
        NavigationStack {
            Form {
                // Avatar
                Section(i18n.t("profile_change_avatar")) {
                    HStack {
                        Spacer()
                        PlayerAvatar(avatarId: avatarId, size: 72)
                        Spacer()
                    }
                    Button(i18n.t("profile_change_avatar")) {
                        showAvatarPicker = true
                    }
                }

                // Balance
                Section(i18n.t("profile_balance")) {
                    HStack {
                        Text(i18n.t("profile_balance"))
                        Spacer()
                        Text(String(format: "%.2f", vm.socket.balance))
                            .monospacedDigit()
                            .fontWeight(.semibold)
                    }
                    Button(i18n.t("balance_deposit")) {
                        showDeposit = true
                    }
                }

                // Transaction history
                Section(i18n.t("profile_history")) {
                    if vm.socket.profileTransactions.isEmpty {
                        Text(i18n.t("profile_no_history"))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(vm.socket.profileTransactions) { txn in
                            HStack {
                                Text(transactionLabel(txn.type))
                                Spacer()
                                Text(String(format: "%+.2f", txn.amount))
                                    .monospacedDigit()
                                    .foregroundStyle(txn.amount >= 0 ? .green : .red)
                            }
                        }
                    }
                }

                // Settings
                Section(i18n.t("profile_settings")) {
                    Picker(i18n.t("profile_language"), selection: Bindable(i18n).language) {
                        ForEach(Language.allCases, id: \.self) { lang in
                            Text(lang.rawValue.uppercased()).tag(lang)
                        }
                    }

                    if let priv = vm.socket.privateState {
                        Toggle(i18n.t("game_sitting_out"), isOn: .init(
                            get: { priv.sitOutNextHand },
                            set: { _ in vm.socket.sitOutNextHand() }
                        ))
                        Toggle(i18n.t("game_auto_muck"), isOn: .init(
                            get: { priv.autoMuck },
                            set: { _ in vm.socket.toggleAutoMuck() }
                        ))
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        vm.logout()
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text(i18n.t("profile_logout"))
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle(i18n.t("profile_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(i18n.t("profile_close")) { dismiss() }
                }
            }
            .sheet(isPresented: $showAvatarPicker) {
                AvatarPicker()
            }
            .alert(i18n.t("balance_deposit_title"), isPresented: $showDeposit) {
                TextField(i18n.t("balance_deposit_amount"), text: $depositAmount)
                    .keyboardType(.decimalPad)
                Button(i18n.t("balance_deposit_confirm")) {
                    if let amount = Double(depositAmount), amount > 0 {
                        vm.socket.deposit(amount: amount)
                    }
                    depositAmount = ""
                }
                Button(i18n.t("balance_deposit_cancel"), role: .cancel) {
                    depositAmount = ""
                }
            }
            .onAppear {
                vm.socket.getProfile()
            }
        }
    }

    private func transactionLabel(_ type: String) -> String {
        switch type {
        case "deposit": return i18n.t("profile_txn_deposit")
        case "buy_in": return i18n.t("profile_txn_buy_in")
        case "cash_out": return i18n.t("profile_txn_cash_out")
        case "rebuy": return i18n.t("profile_txn_rebuy")
        default: return type
        }
    }
}
