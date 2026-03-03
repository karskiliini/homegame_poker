import AudioToolbox
import Foundation
import Observation

@Observable
final class SoundManager {
    static let shared = SoundManager()

    var isMuted: Bool {
        didSet { UserDefaults.standard.set(isMuted, forKey: "soundMuted") }
    }

    private init() {
        isMuted = UserDefaults.standard.bool(forKey: "soundMuted")
    }

    func play(_ sound: SoundType) {
        guard !isMuted else { return }
        AudioServicesPlaySystemSound(sound.systemSoundID)
    }
}

private extension SoundType {
    var systemSoundID: SystemSoundID {
        switch self {
        case .yourTurn: 1007      // Tink
        case .fold: 1104          // click
        case .check: 1104         // click
        case .chipBet: 1105       // tap
        case .allIn: 1304         // alert
        case .chipWin: 1025       // positive
        case .cardDeal: 1306      // shuffle
        case .cardFlip: 1105      // tap
        case .timerWarning: 1073  // warning
        }
    }
}
