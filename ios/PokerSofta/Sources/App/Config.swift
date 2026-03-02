import Foundation

enum Config {
    static var serverURL: String {
        #if DEBUG
        ProcessInfo.processInfo.environment["SERVER_URL"] ?? "http://localhost:3000"
        #else
        "https://homegame-poker-production.up.railway.app"
        #endif
    }
}
