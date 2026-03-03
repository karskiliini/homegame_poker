import SwiftUI

struct LobbyView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @State private var showCreateTable = false
    @State private var showProfile = false
    @State private var selectedTable: TableInfo?
    @State private var buyInAmount: Double = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Connection banner
                if !vm.socket.isConnected {
                    HStack {
                        Image(systemName: "wifi.slash")
                        Text(i18n.t("table_lobby_no_connection"))
                    }
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(8)
                    .frame(maxWidth: .infinity)
                    .background(Color.red)
                }

                // Table list
                if vm.socket.tables.isEmpty {
                    ContentUnavailableView {
                        Label(i18n.t("table_lobby_no_tables"), systemImage: "rectangle.on.rectangle.slash")
                    }
                } else {
                    List(vm.socket.tables) { table in
                        Button {
                            selectedTable = table
                            buyInAmount = table.stakeLevel.maxBuyIn
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(table.name)
                                        .font(.headline)
                                    Text("\(table.stakeLevel.gameType.rawValue) \(table.stakeLevel.label)")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("\(table.playerCount)/\(table.maxPlayers)")
                                        .font(.headline)
                                        .foregroundStyle(.blue)
                                    Text(table.phase)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .refreshable {
                        vm.socket.getTables()
                    }
                }
            }
            .navigationTitle(i18n.t("table_lobby_title"))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showProfile = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "person.circle")
                            Text(String(format: "%.2f", vm.socket.balance))
                                .font(.caption)
                                .monospacedDigit()
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreateTable = true
                    } label: {
                        Label(i18n.t("table_lobby_create"), systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showCreateTable) {
                CreateTableSheet()
            }
            .sheet(isPresented: $showProfile) {
                ProfileView()
            }
            .alert(i18n.t("watching_buy_in"), isPresented: .init(
                get: { selectedTable != nil },
                set: { if !$0 { selectedTable = nil } }
            )) {
                if let table = selectedTable {
                    TextField("Amount", value: $buyInAmount, format: .number)
                        .keyboardType(.decimalPad)
                    Button(i18n.t("watching_confirm")) {
                        if let auth = vm.socket.authState {
                            vm.socket.joinTable(
                                tableId: table.tableId,
                                name: auth.name,
                                buyIn: buyInAmount,
                                avatarId: auth.avatarId
                            )
                        }
                        selectedTable = nil
                    }
                    Button(i18n.t("watching_cancel"), role: .cancel) {
                        selectedTable = nil
                    }
                }
            } message: {
                if let table = selectedTable {
                    Text("\(table.stakeLevel.label) — \(i18n.t("table_lobby_max")) \(String(format: "%.0f", table.stakeLevel.maxBuyIn))")
                }
            }
            .onAppear {
                vm.socket.getTables()
            }
        }
    }
}
