import XCTest
@testable import PokerSofta

final class UtilitiesTests: XCTestCase {

    func testPotSizedBetFirstToAct() {
        let result = calcPotSizedBet(potTotal: 3, callAmount: 0, currentBet: 0, minRaise: 2, maxRaise: 200)
        XCTAssertEqual(result, 3)
    }

    func testPotSizedRaiseAfterBet() {
        let result = calcPotSizedBet(potTotal: 5, callAmount: 2, currentBet: 0, minRaise: 4, maxRaise: 200)
        XCTAssertEqual(result, 9)
    }

    func testHalfPotBet() {
        let result = calcHalfPotBet(potTotal: 10, callAmount: 0, currentBet: 0, minRaise: 2, maxRaise: 200)
        XCTAssertEqual(result, 5)
    }

    func testPotSizedBetClampedToMax() {
        let result = calcPotSizedBet(potTotal: 100, callAmount: 0, currentBet: 0, minRaise: 2, maxRaise: 50)
        XCTAssertEqual(result, 50)
    }

    func testPotSizedBetClampedToMin() {
        let result = calcPotSizedBet(potTotal: 1, callAmount: 0, currentBet: 0, minRaise: 4, maxRaise: 200)
        XCTAssertEqual(result, 4)
    }

    func testBreakdownChipsSimple() {
        let chips = breakdownChips(amount: 10, bigBlind: 2)
        XCTAssertEqual(chips.count, 1)
        XCTAssertEqual(chips[0].denomination, .green)
        XCTAssertEqual(chips[0].count, 1)
    }

    func testBreakdownChipsZero() {
        let chips = breakdownChips(amount: 0, bigBlind: 2)
        XCTAssertTrue(chips.isEmpty)
    }

    func testBreakdownChipsMixed() {
        let chips = breakdownChips(amount: 27, bigBlind: 2)
        XCTAssertTrue(chips.contains { $0.denomination == .green && $0.count == 2 })
        XCTAssertTrue(chips.contains { $0.denomination == .red && $0.count == 3 })
        XCTAssertTrue(chips.contains { $0.denomination == .white && $0.count == 1 })
    }

    func testCheckFoldWhenCheckAvailable() {
        let result = resolvePreAction(.checkFold, available: [.check, .fold])
        XCTAssertEqual(result, .check)
    }

    func testCheckFoldWhenOnlyFold() {
        let result = resolvePreAction(.checkFold, available: [.fold, .call, .raise])
        XCTAssertEqual(result, .fold)
    }

    func testAutoCheckWhenCheckAvailable() {
        let result = resolvePreAction(.autoCheck, available: [.check, .fold])
        XCTAssertEqual(result, .check)
    }

    func testAutoCheckCancelsWhenBetFaced() {
        let result = resolvePreAction(.autoCheck, available: [.fold, .call, .raise])
        XCTAssertNil(result)
    }

    func testNoPreAction() {
        let result = resolvePreAction(nil, available: [.check, .fold])
        XCTAssertNil(result)
    }
}
