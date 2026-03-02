import Foundation

// Client -> Server (player namespace)
enum C2S {
    static let join = "player:join"
    static let rebuy = "player:rebuy"
    static let sitOut = "player:sit_out"
    static let sitIn = "player:sit_in"
    static let action = "player:action"
    static let ritResponse = "player:rit_response"
    static let showCards = "player:show_cards"
    static let getHistory = "player:get_history"
    static let getHand = "player:get_hand"
    static let reconnect = "player:reconnect"
    static let reportBug = "player:report_bug"
    static let sitOutNextHand = "player:sit_out_next_hand"
    static let autoMuck = "player:auto_muck"
    static let chat = "player:chat"
    static let updateAvatar = "player:update_avatar"
    static let chipTrick = "player:chip_trick"
    static let changeSeat = "player:change_seat"
}

// Server -> Client (player namespace)
enum S2CPlayer {
    static let connected = "player:connected"
    static let error = "player:error"
    static let lobbyState = "player:lobby_state"
    static let privateState = "player:private_state"
    static let handStart = "player:hand_start"
    static let yourTurn = "player:your_turn"
    static let ritOffer = "player:rit_offer"
    static let ritResolved = "player:rit_resolved"
    static let showCardsOffer = "player:show_cards_offer"
    static let handResult = "player:hand_result"
    static let busted = "player:busted"
    static let rebuyPrompt = "player:rebuy_prompt"
    static let historyList = "player:history_list"
    static let handDetail = "player:hand_detail"
    static let sound = "player:sound"
    static let joined = "player:joined"
    static let bugReported = "player:bug_reported"
    static let reconnected = "player:reconnected"
    static let reconnectFailed = "player:reconnect_failed"
    static let chatMessage = "player:chat_message"
}

// Client -> Server (lobby)
enum C2SLobby {
    static let getTables = "lobby:get_tables"
    static let createTable = "lobby:create_table"
    static let joinTable = "lobby:join_table"
    static let leaveTable = "lobby:leave_table"
    static let checkName = "lobby:check_name"
    static let register = "lobby:register"
    static let login = "lobby:login"
    static let deposit = "lobby:deposit"
    static let sessionAuth = "lobby:session_auth"
    static let getProfile = "lobby:get_profile"
    static let updateAvatar = "lobby:update_avatar"
}

// Server -> Client (lobby)
enum S2CLobby {
    static let tableList = "lobby:table_list"
    static let tableCreated = "lobby:table_created"
    static let tableUpdated = "lobby:table_updated"
    static let tableRemoved = "lobby:table_removed"
    static let error = "lobby:error"
    static let nameStatus = "lobby:name_status"
    static let authSuccess = "lobby:auth_success"
    static let authError = "lobby:auth_error"
    static let balanceUpdate = "lobby:balance_update"
    static let profileData = "lobby:profile_data"
    static let avatarUpdated = "lobby:avatar_updated"
}

// Client -> Server (table namespace)
enum C2STable {
    static let getHistory = "table:get_history"
    static let getHand = "table:get_hand"
    static let watch = "table:watch"
    static let unwatch = "table:unwatch"
}

// Server -> Client (table namespace)
enum S2CTable {
    static let gameState = "table:game_state"
    static let playerJoined = "table:player_joined"
    static let playerLeft = "table:player_left"
    static let handStart = "table:hand_start"
    static let cardsDealt = "table:cards_dealt"
    static let playerAction = "table:player_action"
    static let streetDeal = "table:street_deal"
    static let potUpdate = "table:pot_update"
    static let showdown = "table:showdown"
    static let handResult = "table:hand_result"
    static let potAward = "table:pot_award"
    static let playerTimer = "table:player_timer"
    static let ritActive = "table:rit_active"
    static let secondBoardDealt = "table:second_board_dealt"
    static let historyList = "table:history_list"
    static let handDetail = "table:hand_detail"
    static let sound = "table:sound"
    static let allinShowdown = "table:allin_showdown"
    static let equityUpdate = "table:equity_update"
    static let chatMessage = "table:chat_message"
    static let badBeat = "table:bad_beat"
    static let chipTrick = "table:chip_trick"
}
