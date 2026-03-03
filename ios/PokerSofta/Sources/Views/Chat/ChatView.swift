import SwiftUI

struct ChatView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @State private var draft = ""
    @FocusState private var inputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(vm.socket.chatMessages) { msg in
                                chatBubble(msg)
                                    .id(msg.id)
                            }
                        }
                        .padding()
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: vm.socket.chatMessages.count) {
                        if let last = vm.socket.chatMessages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                Divider()

                HStack(spacing: 8) {
                    TextField(i18n.t("chat_placeholder"), text: $draft)
                        .textFieldStyle(.roundedBorder)
                        .focused($inputFocused)
                        .onSubmit(sendMessage)

                    Button(action: sendMessage) {
                        Image(systemName: "paperplane.fill")
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .navigationTitle(i18n.t("chat_title"))
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            vm.socket.unreadChatCount = 0
        }
    }

    private func chatBubble(_ msg: ChatMessage) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(msg.senderName)
                    .font(.subheadline.bold())
                    .foregroundStyle(.accent)
                Text(formatTimestamp(msg.timestamp))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Text(msg.message)
                .font(.body)
        }
    }

    private func sendMessage() {
        let text = draft.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        vm.socket.sendChat(message: text)
        draft = ""
    }

    private func formatTimestamp(_ ts: Double) -> String {
        let date = Date(timeIntervalSince1970: ts / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}
