// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PokerSofta",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(url: "https://github.com/socketio/socket.io-client-swift", from: "16.1.1"),
    ],
    targets: [
        .executableTarget(
            name: "PokerSofta",
            dependencies: [
                .product(name: "SocketIO", package: "socket.io-client-swift"),
            ],
            path: "PokerSofta/Sources"
        ),
        .testTarget(
            name: "PokerSoftaTests",
            dependencies: ["PokerSofta"],
            path: "PokerSofta/Tests"
        ),
    ]
)
