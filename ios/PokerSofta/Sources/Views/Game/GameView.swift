import SwiftUI

struct GameView: View {
    let tableId: String
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @State private var showChat = false
    @State private var showHistory = false
    @State private var showBugReport = false

    var body: some View {
        VStack(spacing: 0) {
            // Mini table
            MiniTableView(gameState: vm.socket.gameState, myId: vm.socket.playerId)
                .frame(maxHeight: .infinity)

            // Hole cards
            if let cards = vm.socket.privateState?.holeCards, !cards.isEmpty {
                HoleCardsView(cards: cards)
            }

            // Action area
            if let state = vm.socket.privateState, state.isMyTurn {
                ActionBar(state: state, socket: vm.socket)
            } else {
                PreActionBar()
            }
        }
        .background(Color(hex: "#0d1117"))
        .navigationTitle(vm.socket.gameState.map {
            "\($0.config.gameType.rawValue) \($0.config.smallBlind)/\($0.config.bigBlind)"
        } ?? "Table")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    vm.socket.leaveTable()
                } label: {
                    Label(i18n.t("game_leave_table"), systemImage: "arrow.left")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    // Chat
                    Button {
                        showChat = true
                        vm.socket.unreadChatCount = 0
                    } label: {
                        ZStack {
                            Image(systemName: "bubble.left")
                            if vm.socket.unreadChatCount > 0 {
                                Text("\(vm.socket.unreadChatCount)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                                    .padding(4)
                                    .background(Circle().fill(.red))
                                    .offset(x: 10, y: -10)
                            }
                        }
                    }
                    // History
                    Button {
                        showHistory = true
                        vm.socket.getHandHistory()
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                    }
                    // Bug report
                    Button { showBugReport = true } label: {
                        Image(systemName: "ladybug")
                    }
                }
            }
        }
        .sheet(isPresented: $showChat) {
            ChatView()
        }
        .sheet(isPresented: $showHistory) {
            HandHistoryList()
        }
        .sheet(isPresented: $showBugReport) {
            BugReportView()
        }
        .alert(i18n.t("rebuy_title"), isPresented: .init(
            get: { vm.socket.showRebuyPrompt },
            set: { vm.socket.showRebuyPrompt = $0 }
        )) {
            Button(i18n.t("rebuy_button")) {
                if let config = vm.socket.gameState?.config {
                    vm.socket.rebuy(amount: config.maxBuyIn)
                }
            }
            Button(i18n.t("rebuy_sit_out"), role: .cancel) {}
        }
        .alert(i18n.t("rit_title"), isPresented: .init(
            get: { vm.socket.showRunItTwiceOffer },
            set: { vm.socket.showRunItTwiceOffer = $0 }
        )) {
            Button(i18n.t("rit_yes")) { vm.socket.respondRIT(accept: true) }
            Button(i18n.t("rit_no")) { vm.socket.respondRIT(accept: false) }
            Button(i18n.t("rit_always_yes")) { vm.socket.respondRIT(accept: true, alwaysYes: true) }
            Button(i18n.t("rit_always_no")) { vm.socket.respondRIT(accept: false, alwaysNo: true) }
        }
        .alert(i18n.t("show_cards_question"), isPresented: .init(
            get: { vm.socket.showShowCardsOffer },
            set: { vm.socket.showShowCardsOffer = $0 }
        )) {
            Button(i18n.t("show_cards_show")) { vm.socket.showCards(true) }
            Button(i18n.t("show_cards_muck")) { vm.socket.showCards(false) }
        }
    }
}
