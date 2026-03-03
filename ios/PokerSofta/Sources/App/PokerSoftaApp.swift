import SwiftUI

@main
struct PokerSoftaApp: App {
    @State private var viewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(viewModel)
                .environment(viewModel.i18n)
                .onAppear { viewModel.start() }
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @Environment(AppViewModel.self) private var vm

    var body: some View {
        Group {
            switch vm.route {
            case .login:
                LoginView()
            case .lobby:
                LobbyView()
            case .game(let tableId):
                NavigationStack {
                    GameView(tableId: tableId)
                }
            }
        }
        .onChange(of: vm.socket.authState != nil) { _, isAuthed in
            if isAuthed {
                vm.onAuthSuccess()
            }
        }
        .onChange(of: vm.socket.currentTableId) { _, tableId in
            if let tableId {
                vm.onJoinedTable(tableId: tableId)
            } else if vm.route != .login {
                vm.onLeftTable()
            }
        }
    }
}
