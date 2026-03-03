import SwiftUI

struct BugReportView: View {
    @Environment(AppViewModel.self) private var vm
    @Environment(I18n.self) private var i18n
    @Environment(\.dismiss) private var dismiss
    @State private var description = ""
    @State private var showConfirmation = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextEditor(text: $description)
                    .scrollContentBackground(.hidden)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(.systemGray6))
                    )
                    .overlay(alignment: .topLeading) {
                        if description.isEmpty {
                            Text(i18n.t("bug_report_placeholder"))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 16)
                                .allowsHitTesting(false)
                        }
                    }

                Button {
                    vm.socket.reportBug(description: description)
                    showConfirmation = true
                } label: {
                    Text(i18n.t("bug_report_send"))
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(description.isEmpty ? Color.gray : Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(description.isEmpty)
            }
            .padding()
            .navigationTitle(i18n.t("bug_report_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(i18n.t("bug_report_cancel")) { dismiss() }
                }
            }
            .alert(i18n.t("bug_report_thanks"), isPresented: $showConfirmation) {
                Button("OK") { dismiss() }
            } message: {
                Text(i18n.t("bug_report_sent"))
            }
        }
    }
}
