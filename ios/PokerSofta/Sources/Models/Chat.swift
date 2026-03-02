import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: String
    let senderName: String
    let seatIndex: Int
    let message: String
    let timestamp: Double
}
