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
                Text("Login") // Placeholder — Task 9
            case .lobby:
                Text("Lobby") // Placeholder — Task 10
            case .game:
                Text("Game") // Placeholder — Task 11
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
