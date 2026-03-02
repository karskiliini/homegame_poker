import Foundation

enum PreActionType {
    case checkFold
    case autoCheck
}

func resolvePreAction(_ preAction: PreActionType?, available: [ActionType]) -> ActionType? {
    guard let preAction else { return nil }

    switch preAction {
    case .checkFold:
        return available.contains(.check) ? .check : .fold
    case .autoCheck:
        return available.contains(.check) ? .check : nil
    }
}
