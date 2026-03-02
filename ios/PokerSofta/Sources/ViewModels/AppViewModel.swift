import Foundation
import Observation

enum AppRoute: Hashable {
    case login
    case lobby
    case game(tableId: String)
}

@Observable
final class AppViewModel {
    let socket: SocketService
    let i18n = I18n.shared
    var route: AppRoute = .login

    init() {
        socket = SocketService(serverURL: Config.serverURL)
    }

    func start() {
        socket.connect()
    }

    func onAuthSuccess() {
        route = .lobby
    }

    func onJoinedTable(tableId: String) {
        route = .game(tableId: tableId)
    }

    func onLeftTable() {
        route = .lobby
    }

    func logout() {
        KeychainHelper.delete()
        socket.disconnect()
        route = .login
        socket.authState = nil
    }
}
