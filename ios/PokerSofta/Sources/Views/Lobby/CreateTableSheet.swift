import SwiftUI

struct CreateTableSheet: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @Environment(\.dismiss) private var dismiss
    @State private var selectedStakeId: String = ""
    @State private var tableName = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(i18n.t("table_lobby_choose_blind")) {
                    ForEach(vm.socket.stakeLevels) { stake in
                        Button {
                            selectedStakeId = stake.id
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("\(stake.gameType.rawValue) \(stake.label)")
                                        .foregroundStyle(.primary)
                                    Text("\(i18n.t("table_lobby_max")) \(String(format: "%.0f", stake.maxBuyIn))")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if selectedStakeId == stake.id {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.blue)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Section {
                    TextField("Table name (optional)", text: $tableName)
                }
            }
            .navigationTitle(i18n.t("table_lobby_create_table"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(i18n.t("table_lobby_cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(i18n.t("table_lobby_create_table")) {
                        vm.socket.createTable(
                            stakeLevelId: selectedStakeId,
                            name: tableName.isEmpty ? nil : tableName
                        )
                        dismiss()
                    }
                    .disabled(selectedStakeId.isEmpty)
                }
            }
        }
    }
}
