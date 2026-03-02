import XCTest
@testable import PokerSofta

final class SocketServiceTests: XCTestCase {

    func testDecodeAuthSuccess() throws {
        let json = """
        {
            "playerId": "p1",
            "name": "TestPlayer",
            "avatarId": "3",
            "balance": 1000,
            "sessionToken": "tok123"
        }
        """.data(using: .utf8)!

        let auth = try JSONDecoder().decode(AuthSuccess.self, from: json)
        XCTAssertEqual(auth.playerId, "p1")
        XCTAssertEqual(auth.sessionToken, "tok123")
        XCTAssertEqual(auth.balance, 1000)
    }
}
