# iOS App Design — Native SwiftUI Poker Client

## Summary

Native iOS application (SwiftUI) that connects to the existing poker_softa Socket.IO backend, providing full feature parity with the web client. Player view only (login, lobby, gameplay). Distributed via TestFlight, potentially App Store later.

## Decisions

- **Technology:** SwiftUI + Socket.IO-Client-Swift (SPM)
- **Repo:** Monorepo — `ios/` directory in poker_softa
- **Min iOS:** 17 (Observable macro, modern NavigationStack)
- **UI style:** Native iOS design (NavigationStack, sheets, SF Symbols, haptics)
- **Orientation:** Portrait only
- **Scope:** Full parity with web client

## Project Structure

```
ios/
  PokerSofta/
    PokerSofta.xcodeproj
    Sources/
      App/                  # @main entry point
      Models/               # Swift Codable structs (from shared/ types)
      Network/              # SocketService, event handlers
      ViewModels/           # @Observable classes per view
      Views/
        Auth/               # LoginView, RegisterView
        Lobby/              # LobbyView, TableListView, CreateTableView
        Game/               # GameView, ActionBar, MiniTableView, HoleCardsView
        Profile/            # ProfileView, AvatarPicker
        History/            # HandHistoryList, HandHistoryDetail
        Chat/               # ChatView
        Components/         # CardView, ChipStack, PlayerAvatar
      Utilities/            # BetSizing, ChipBreakdown, Haptics, KeychainHelper
      Resources/            # Assets.xcassets, sounds
    Tests/
  Package.swift             # SPM dependencies
```

## Network Layer

Single `@Observable` SocketService managing two Socket.IO connections:

- `/player` namespace — authentication, gameplay, personal state
- `/table` namespace — watching table state (community cards, player actions)

Events map 1:1 to `shared/src/types/socket-events.ts`. JSON payloads decoded via `Codable` with `keyDecodingStrategy = .convertFromSnakeCase`.

Reconnect: Socket.IO-Client-Swift auto-reconnect + `player:reconnect` event with Keychain-stored session token.

Offline: No offline mode. Connection loss shows banner + auto-retry.

## Navigation

```
NavigationStack
  ├─ LoginView → RegisterView (sheet)
  ├─ LobbyView
  │    ├─ TableListView (pull-to-refresh)
  │    ├─ ProfileView (sheet)
  │    └─ CreateTableView (sheet)
  └─ GameView
       ├─ MiniTableView (~60% screen)
       ├─ HoleCardsView
       ├─ ActionBar / PreActionBar
       ├─ ChatView (sheet)
       ├─ HandHistoryList (sheet)
       ├─ RebuyPrompt (alert)
       ├─ RunItTwicePrompt (alert)
       └─ ShowCardsPrompt (alert)
```

## Data Models

Direct translation of `shared/src/types/` → Swift Codable structs:

- GameState, GameConfig, GamePhase, GameType
- PublicPlayerState, PrivatePlayerState, PlayerStatus
- Street, ActionType, PlayerAction
- StakeLevel, TableInfo, TablePlayerInfo
- CardString (typealias String), ChipBreakdown
- Constants (timeouts, limits — same values as TS)

Utility functions ported to Swift:
- `calcPotSizedBet`, `calcHalfPotBet` (from betSizing.ts)
- `breakdownChips` (from chipUtils.ts)
- `resolvePreAction` (from preAction.ts)

## Authentication

1. First launch: LoginView → `lobby:register` / `lobby:login`
2. Server responds: `lobby:auth_success` with session token
3. Token saved to Keychain (KeychainHelper — no external dependency)
4. Next launch: auto-login via `lobby:session_auth`
5. Failure: clear Keychain → back to LoginView

Compatible with web client sessions — same player can be logged in on both.

## Game View Layout (Portrait)

```
┌─────────────────────────┐
│  Table Info + Leave      │  NavigationBar
├─────────────────────────┤
│     MiniTableView        │  ~60% screen
│  ┌───────────────────┐   │
│  │ Community Cards    │   │
│  │  [Ah] [Ks] [7d]   │   │
│  │    Pot: 42.50      │   │
│  │ P1    P2    P3     │   │  Circular seat layout
│  │  P6   YOU   P4     │   │
│  │       P5           │   │
│  └───────────────────┘   │
├─────────────────────────┤
│   [Ah]  [Kd]            │  HoleCardsView (large)
├─────────────────────────┤
│  ½ Pot | Pot | All-in    │  Bet sizing shortcuts
│  ──── slider ────        │  Raise slider (min → max)
│  [FOLD] [CHECK] [RAISE]  │  ActionBar
└─────────────────────────┘
```

4-color deck: spade=#000, heart=#CC0000, diamond=#0066CC, club=#008800

## Haptics

- `your_turn` → `.notification(.warning)`
- Fold/Check/Call/Raise → `.impact(.medium)`
- Hand won → `.notification(.success)`
- Busted → `.notification(.error)`

## Additional Features

- **Chat:** Sheet with message list + input, badge on new messages
- **Hand History:** Sheet with list → detail (street-by-street actions, showdown)
- **Profile:** Avatar picker (emoji grid), balance, RIT preference, auto-muck, language
- **Bug Report:** Text field + send via `player:report_bug`
- **Chip Tricks:** Button in GameView (cooldown 3s, min stack threshold)
- **Sound:** AVAudioPlayer for `player:sound` events, mute toggle
- **i18n:** EN/FI dictionary-based (same structure as web client)

## Testing & CI/CD

**Tests:**
- Unit: Models (Codable), utilities (betSizing, chipBreakdown), KeychainHelper
- ViewModel: Mock SocketService → verify state updates from events
- UI (XCUITest): Login → join table → action → leave

**CI/CD:**
- GitHub Actions: build + test (xcodebuild)
- TestFlight: Fastlane for signing + upload
- Version check: server sends version in auth_success → app warns if outdated
