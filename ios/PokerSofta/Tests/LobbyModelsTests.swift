import XCTest
@testable import PokerSofta

final class LobbyModelsTests: XCTestCase {

    func testStakeLevelDecoding() throws {
        let json = """
        {
            "id": "nlhe-1-2",
            "game_type": "NLHE",
            "small_blind": 1,
            "big_blind": 2,
            "max_buy_in": 200,
            "label": "1/2"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let stake = try decoder.decode(StakeLevel.self, from: json)
        XCTAssertEqual(stake.id, "nlhe-1-2")
        XCTAssertEqual(stake.gameType, .NLHE)
        XCTAssertEqual(stake.bigBlind, 2)
    }

    func testTableInfoDecoding() throws {
        let json = """
        {
            "table_id": "t1",
            "name": "Table 1",
            "stake_level": {
                "id": "nlhe-1-2",
                "game_type": "NLHE",
                "small_blind": 1,
                "big_blind": 2,
                "max_buy_in": 200,
                "label": "1/2"
            },
            "player_count": 3,
            "max_players": 10,
            "players": [],
            "phase": "hand_in_progress"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let table = try decoder.decode(TableInfo.self, from: json)
        XCTAssertEqual(table.tableId, "t1")
        XCTAssertEqual(table.playerCount, 3)
    }

    func testChatMessageDecoding() throws {
        let json = """
        {
            "id": "msg1",
            "sender_name": "Player1",
            "seat_index": 2,
            "message": "nice hand",
            "timestamp": 1700000000
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let msg = try decoder.decode(ChatMessage.self, from: json)
        XCTAssertEqual(msg.senderName, "Player1")
        XCTAssertEqual(msg.message, "nice hand")
    }

    func testHandRecordDecoding() throws {
        let json = """
        {
            "hand_id": "h1",
            "hand_number": 42,
            "game_type": "NLHE",
            "timestamp": 1700000000,
            "blinds": {"small": 1, "big": 2},
            "players": [],
            "streets": [],
            "pots": [],
            "community_cards": ["Ah", "Ks", "7d", "2c", "Th"],
            "summary": {"results": []}
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let record = try decoder.decode(HandRecord.self, from: json)
        XCTAssertEqual(record.handNumber, 42)
        XCTAssertEqual(record.communityCards.count, 5)
    }
}
