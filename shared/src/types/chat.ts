export interface ChatMessage {
  id: string;
  senderName: string;
  seatIndex: number;
  message: string;
  timestamp: number;
}
