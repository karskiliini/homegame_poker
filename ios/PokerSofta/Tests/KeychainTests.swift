import XCTest
@testable import PokerSofta

final class KeychainTests: XCTestCase {
    override func setUp() { KeychainHelper.delete() }
    override func tearDown() { KeychainHelper.delete() }

    func testSaveAndLoad() {
        KeychainHelper.save(token: "test-token-123")
        XCTAssertEqual(KeychainHelper.load(), "test-token-123")
    }

    func testLoadEmpty() {
        XCTAssertNil(KeychainHelper.load())
    }

    func testOverwrite() {
        KeychainHelper.save(token: "old")
        KeychainHelper.save(token: "new")
        XCTAssertEqual(KeychainHelper.load(), "new")
    }

    func testDelete() {
        KeychainHelper.save(token: "abc")
        KeychainHelper.delete()
        XCTAssertNil(KeychainHelper.load())
    }
}
