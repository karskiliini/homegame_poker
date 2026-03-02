import Foundation
import Observation
import SocketIO

@Observable
final class SocketService {
    // Connection state
    var isConnected = false
    var connectionError: String?

    // Auth state
    var authState: AuthSuccess?
    var authError: String?
    var stakeLevels: [StakeLevel] = []

    // Lobby state
    var tables: [TableInfo] = []

    // Game state (when at a table)
    var gameState: GameState?
    var privateState: PrivatePlayerState?
    var chatMessages: [ChatMessage] = []
    var handHistory: [HandRecord] = []
    var handDetail: HandRecord?
    var unreadChatCount = 0

    // Prompts
    var showRebuyPrompt = false
    var showRunItTwiceOffer = false
    var showShowCardsOffer = false
    var ritDeadline: Double = 0

    // Join info (saved for reconnect)
    var playerId: String?
    var playerToken: String?
    var currentTableId: String?

    // Balance
    var balance: Double = 0

    // Profile
    var profileTransactions: [BalanceTransaction] = []

    private let manager: SocketManager
    private var playerSocket: SocketIOClient
    private let decoder: JSONDecoder

    init(serverURL: String) {
        let url = URL(string: serverURL)!
        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .forceWebsockets(true),
            .reconnects(true),
            .reconnectWait(1),
            .reconnectWaitMax(5),
        ])

        playerSocket = manager.socket(forNamespace: "/player")

        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        setupEventHandlers()
    }

    // MARK: - Connection

    func connect() {
        playerSocket.connect()
    }

    func disconnect() {
        playerSocket.disconnect()
    }

    // MARK: - Auth Actions

    func login(name: String, password: String) {
        playerSocket.emit(C2SLobby.login, ["name": name, "password": password])
    }

    func register(name: String, password: String, avatarId: String) {
        playerSocket.emit(C2SLobby.register, [
            "name": name, "password": password, "avatarId": avatarId,
        ])
    }

    func sessionAuth(token: String) {
        playerSocket.emit(C2SLobby.sessionAuth, ["sessionToken": token])
    }

    func checkName(_ name: String) {
        playerSocket.emit(C2SLobby.checkName, ["name": name])
    }

    // MARK: - Lobby Actions

    func getTables() {
        playerSocket.emit(C2SLobby.getTables)
    }

    func createTable(stakeLevelId: String, name: String?) {
        var data: [String: Any] = ["stakeLevelId": stakeLevelId]
        if let name { data["name"] = name }
        playerSocket.emit(C2SLobby.createTable, data)
    }

    func joinTable(tableId: String, name: String, buyIn: Double, avatarId: String, seatIndex: Int? = nil) {
        var data: [String: Any] = [
            "tableId": tableId, "name": name, "buyIn": buyIn, "avatarId": avatarId,
        ]
        if let seatIndex { data["seatIndex"] = seatIndex }
        playerSocket.emit(C2SLobby.joinTable, data)
    }

    func leaveTable() {
        playerSocket.emit(C2SLobby.leaveTable)
        currentTableId = nil
        gameState = nil
        privateState = nil
        chatMessages = []
        unreadChatCount = 0
    }

    func deposit(amount: Double) {
        playerSocket.emit(C2SLobby.deposit, ["amount": amount])
    }

    func getProfile() {
        playerSocket.emit(C2SLobby.getProfile)
    }

    func updateLobbyAvatar(_ avatarId: String) {
        playerSocket.emit(C2SLobby.updateAvatar, ["avatarId": avatarId])
    }

    // MARK: - Game Actions

    func sendAction(_ action: ActionType, amount: Double? = nil) {
        var data: [String: Any] = ["action": action.rawValue]
        if let amount { data["amount"] = amount }
        playerSocket.emit(C2S.action, data)
    }

    func rebuy(amount: Double) {
        playerSocket.emit(C2S.rebuy, ["amount": amount])
    }

    func sitOut() { playerSocket.emit(C2S.sitOut) }
    func sitIn() { playerSocket.emit(C2S.sitIn) }
    func sitOutNextHand() { playerSocket.emit(C2S.sitOutNextHand) }
    func toggleAutoMuck() { playerSocket.emit(C2S.autoMuck) }

    func respondRIT(accept: Bool, alwaysNo: Bool = false, alwaysYes: Bool = false) {
        playerSocket.emit(C2S.ritResponse, [
            "accept": accept, "alwaysNo": alwaysNo, "alwaysYes": alwaysYes,
        ])
    }

    func showCards(_ show: Bool) {
        playerSocket.emit(C2S.showCards, ["show": show])
    }

    func getHandHistory() { playerSocket.emit(C2S.getHistory) }
    func getHandDetail(handId: String) {
        playerSocket.emit(C2S.getHand, ["handId": handId])
    }

    func sendChat(message: String) {
        playerSocket.emit(C2S.chat, ["message": message])
    }

    func chipTrick() { playerSocket.emit(C2S.chipTrick) }

    func changeSeat(index: Int) {
        playerSocket.emit(C2S.changeSeat, ["seatIndex": index])
    }

    func updateAvatar(_ avatarId: String) {
        playerSocket.emit(C2S.updateAvatar, ["avatarId": avatarId])
    }

    func reportBug(description: String) {
        playerSocket.emit(C2S.reportBug, ["description": description])
    }

    func reconnectToTable() {
        guard let playerId, let currentTableId else { return }
        var data: [String: Any] = ["playerId": playerId, "tableId": currentTableId]
        if let playerToken { data["playerToken"] = playerToken }
        playerSocket.emit(C2S.reconnect, data)
    }

    // MARK: - Event Handlers (private)

    private func setupEventHandlers() {
        playerSocket.on(clientEvent: .connect) { [weak self] _, _ in
            self?.isConnected = true
            self?.connectionError = nil
            // Auto-reconnect with saved token
            if let token = KeychainHelper.load() {
                self?.sessionAuth(token: token)
            }
        }

        playerSocket.on(clientEvent: .disconnect) { [weak self] _, _ in
            self?.isConnected = false
        }

        playerSocket.on(clientEvent: .error) { [weak self] data, _ in
            self?.connectionError = data.first as? String ?? "Connection error"
        }

        // player:connected — initial handshake
        playerSocket.on(S2CPlayer.connected) { [weak self] data, _ in
            guard let self, let dict = data.first as? [String: Any] else { return }
            if let levels = dict["stakeLevels"] as? [[String: Any]] {
                self.stakeLevels = levels.compactMap { self.decodeFromDict($0) }
            }
        }

        // Auth events
        playerSocket.on(S2CLobby.authSuccess) { [weak self] data, _ in
            guard let self, let auth: AuthSuccess = self.decodeFirst(data) else { return }
            self.authState = auth
            self.authError = nil
            self.balance = auth.balance
            KeychainHelper.save(token: auth.sessionToken)
        }

        playerSocket.on(S2CLobby.authError) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            self?.authError = dict["message"] as? String ?? "Auth failed"
            self?.authState = nil
            KeychainHelper.delete()
        }

        // Lobby events
        playerSocket.on(S2CLobby.tableList) { [weak self] data, _ in
            guard let self else { return }
            if let arr = data.first as? [[String: Any]] {
                self.tables = arr.compactMap { self.decodeFromDict($0) }
            }
        }

        playerSocket.on(S2CLobby.balanceUpdate) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            self?.balance = dict["balance"] as? Double ?? self?.balance ?? 0
        }

        playerSocket.on(S2CLobby.profileData) { [weak self] data, _ in
            guard let self, let dict = data.first as? [String: Any] else { return }
            if let txns = dict["transactions"] as? [[String: Any]] {
                self.profileTransactions = txns.compactMap { self.decodeFromDict($0) }
            }
        }

        // Player joined a table
        playerSocket.on(S2CPlayer.joined) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            self?.playerId = dict["playerId"] as? String
            self?.playerToken = dict["playerToken"] as? String
            self?.currentTableId = dict["tableId"] as? String
        }

        // Game state events
        playerSocket.on(S2CPlayer.privateState) { [weak self] data, _ in
            guard let self, let state: PrivatePlayerState = self.decodeFirst(data) else { return }
            self.privateState = state
        }

        playerSocket.on(S2CPlayer.yourTurn) { [weak self] data, _ in
            guard let self, let state: PrivatePlayerState = self.decodeFirst(data) else { return }
            self.privateState = state
            HapticsManager.yourTurn()
        }

        playerSocket.on(S2CPlayer.handResult) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            if let winners = dict["winners"] as? [[String: Any]] {
                let weWon = winners.contains { ($0["playerId"] as? String) == self?.playerId }
                if weWon { HapticsManager.handWon() }
            }
        }

        playerSocket.on(S2CPlayer.busted) { [weak self] _, _ in
            let _ = self
            HapticsManager.busted()
        }

        playerSocket.on(S2CPlayer.rebuyPrompt) { [weak self] _, _ in
            self?.showRebuyPrompt = true
        }

        playerSocket.on(S2CPlayer.ritOffer) { [weak self] data, _ in
            self?.showRunItTwiceOffer = true
            if let dict = data.first as? [String: Any] {
                self?.ritDeadline = dict["deadline"] as? Double ?? 0
            }
        }

        playerSocket.on(S2CPlayer.showCardsOffer) { [weak self] _, _ in
            self?.showShowCardsOffer = true
        }

        playerSocket.on(S2CPlayer.chatMessage) { [weak self] data, _ in
            guard let self, let msg: ChatMessage = self.decodeFirst(data) else { return }
            self.chatMessages.append(msg)
            self.unreadChatCount += 1
        }

        playerSocket.on(S2CPlayer.historyList) { [weak self] data, _ in
            guard let self else { return }
            if let arr = data.first as? [[String: Any]] {
                self.handHistory = arr.compactMap { self.decodeFromDict($0) }
            }
        }

        playerSocket.on(S2CPlayer.handDetail) { [weak self] data, _ in
            guard let self, let record: HandRecord = self.decodeFirst(data) else { return }
            self.handDetail = record
        }

        playerSocket.on(S2CPlayer.reconnected) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            self?.playerId = dict["playerId"] as? String
            self?.currentTableId = dict["tableId"] as? String
        }

        playerSocket.on(S2CPlayer.reconnectFailed) { [weak self] _, _ in
            self?.currentTableId = nil
            self?.playerId = nil
        }

        playerSocket.on(S2CPlayer.error) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any] else { return }
            self?.connectionError = dict["message"] as? String
        }

        playerSocket.on(S2CPlayer.sound) { data, _ in
            guard let dict = data.first as? [String: Any],
                  let typeStr = dict["sound"] as? String,
                  let _ = SoundType(rawValue: typeStr) else { return }
            // TODO: play sound via SoundManager (Task 16)
        }
    }

    // MARK: - Helpers

    private func decodeFirst<T: Decodable>(_ data: [Any]) -> T? {
        guard let dict = data.first else { return nil }
        return decodeFromDict(dict)
    }

    private func decodeFromDict<T: Decodable>(_ value: Any) -> T? {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: value) else { return nil }
        return try? decoder.decode(T.self, from: jsonData)
    }
}
