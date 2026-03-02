import XCTest
@testable import PokerSofta

final class ModelsTests: XCTestCase {

    func testCardStringParsing() {
        let card = CardUtil.parse("Ah")
        XCTAssertEqual(card.rank, .ace)
        XCTAssertEqual(card.suit, .hearts)
        XCTAssertEqual(card.symbol, "♥")
        XCTAssertEqual(card.display, "A♥")
    }

    func testGameStateDecoding() throws {
        let json = """
        {
            "phase": "hand_in_progress",
            "config": {
                "game_type": "NLHE",
                "small_blind": 1,
                "big_blind": 2,
                "max_buy_in": 200,
                "action_time_seconds": 30,
                "min_players": 2,
                "max_players": 10
            },
            "hand_number": 5,
            "players": [],
            "community_cards": ["Ah", "Ks", "7d"],
            "pots": [{"amount": 42.5, "eligible": ["p1", "p2"]}],
            "current_street": "flop",
            "dealer_seat_index": 0,
            "current_actor_seat_index": 1,
            "action_time_remaining": 25
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let state = try decoder.decode(GameState.self, from: json)

        XCTAssertEqual(state.phase, .handInProgress)
        XCTAssertEqual(state.config.gameType, .NLHE)
        XCTAssertEqual(state.config.bigBlind, 2)
        XCTAssertEqual(state.communityCards, ["Ah", "Ks", "7d"])
        XCTAssertEqual(state.pots.count, 1)
        XCTAssertEqual(state.currentStreet, .flop)
    }

    func testPrivatePlayerStateDecoding() throws {
        let json = """
        {
            "id": "p1",
            "name": "TestPlayer",
            "seat_index": 3,
            "stack": 198,
            "status": "active",
            "hole_cards": ["Ah", "Kd"],
            "current_bet": 2,
            "available_actions": ["fold", "call", "raise"],
            "min_raise": 4,
            "max_raise": 198,
            "call_amount": 2,
            "pot_total": 3,
            "is_my_turn": true,
            "show_cards_option": false,
            "run_it_twice_offer": false,
            "run_it_twice_deadline": 0,
            "sit_out_next_hand": false,
            "auto_muck": true
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let state = try decoder.decode(PrivatePlayerState.self, from: json)

        XCTAssertEqual(state.holeCards, ["Ah", "Kd"])
        XCTAssertEqual(state.availableActions, [.fold, .call, .raise])
        XCTAssertTrue(state.isMyTurn)
        XCTAssertEqual(state.minRaise, 4)
    }

    func testPlayerStatusDecoding() throws {
        let json = "\"all_in\"".data(using: .utf8)!
        let status = try JSONDecoder().decode(PlayerStatus.self, from: json)
        XCTAssertEqual(status, .allIn)
    }
}
