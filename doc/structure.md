# Codebase Structure

## Directory Tree

```
poker_softa/
  client/src/
    audio/          # SoundManager
    components/     # Shared UI (Card, ChipStack, Chat, SoundToggle, LanguageToggle)
    hooks/          # useT (i18n), useTableAnimations
    i18n/           # translations.ts
    styles/         # index.css (design tokens, animations)
    themes/         # Table themes (basic, cccp, midnight, vegas, arctic, lava)
    views/
      player/       # Phone UI (GameScreen, ActionButtons, Lobby, Login)
      table/        # Table UI (PokerTable, PlayerSeat, BetChip, PotDisplay, DeckShuffleAnimation)
      editor/       # UI editor (AnimationSandbox, ControlPanel, TimelineBar, PointsOverlay, MockSocket, AnimationDriver, scenarios)
      xr/           # WebXR/VR view (XRGameScreen, XRScene, scene components)
      history/      # HandHistoryDetail, HandHistoryList
    socket.ts       # Client socket connection
    App.tsx         # Root component
  server/src/
    db/             # Database abstraction (types.ts, index.ts)
      sqlite/       # SQLite implementation (database.ts, player-repo.ts, session-repo.ts, balance-repo.ts, bug-repo.ts)
    evaluation/     # hand-rank.ts, equity.ts, bad-beat.ts
    game/           # GameManager, HandEngine, PotManager, Deck, TableManager
    socket/         # player-namespace.ts, table-namespace.ts
    app.ts          # Express app
    index.ts        # Entry point
  shared/src/
    types/          # game, hand, card, socket-events, lobby, sound, hand-history, chat
    utils/          # card-utils.ts
    betSizing.ts, preAction.ts, chipUtils.ts, constants.ts, avatars.ts
  ios/
    Package.swift                    # SPM dependencies (Socket.IO)
    PokerSofta/
      Sources/
        App/                         # @main entry, Config, route navigation
        Models/                      # Codable structs (Card, Game, Player, Lobby, etc.)
        Network/                     # SocketService (Socket.IO connection)
        ViewModels/                  # AppViewModel with @Observable
        Views/
          Auth/                      # LoginView, RegisterView
          Lobby/                     # LobbyView, CreateTableSheet
          Game/                      # GameView, MiniTableView, HoleCardsView, ActionBar
          Chat/                      # ChatView
          History/                   # HandHistoryList, HandHistoryDetail
          Profile/                   # ProfileView
          Components/                # CardView, PlayerAvatar, ChipStackView, BugReportView
        Utilities/                   # BetSizing, ChipBreakdown, PreAction, Keychain, Haptics, i18n
        Resources/                   # Assets
      Tests/                         # Unit tests
  e2e/              # Playwright E2E tests (helpers.ts, login.spec.ts, table-lobby.spec.ts, game-flow.spec.ts)
  doc/              # Documentation, bugs, roadmap
  playwright.config.ts  # Playwright config (dual webServer: backend + Vite client)
```

## Feature-to-File Mapping

| Feature | Server | Client | Shared | iOS |
|---------|--------|--------|--------|-----|
| Game engine | game/GameManager.ts, HandEngine.ts, PotManager.ts, Deck.ts | - | types/game.ts, types/hand.ts | Models/Game.swift |
| Hand evaluation | evaluation/hand-rank.ts, equity.ts, bad-beat.ts | - | types/card.ts, utils/card-utils.ts | Models/Card.swift |
| Socket comms | socket/player-namespace.ts, table-namespace.ts | socket.ts | types/socket-events.ts | Network/SocketService.swift |
| Table mgmt | game/TableManager.ts | views/table/PokerTable.tsx, PlayerSeat.tsx | types/lobby.ts | Views/Game/MiniTableView.swift |
| Player UI (game + watching) | - | views/player/GameScreen.tsx, ActionButtons.tsx, PreActionButtons.tsx | betSizing.ts, preAction.ts | Views/Game/GameView.swift, ActionBar.swift |
| Lobby/Login | socket/player-namespace.ts | views/player/LobbyScreen.tsx, LoginScreen.tsx | types/lobby.ts | Views/Auth/LoginView.swift, Views/Lobby/LobbyView.swift |
| Player profile | socket/player-namespace.ts, db/players.ts | views/player/ProfileModal.tsx, TableLobbyScreen.tsx | types/lobby.ts, types/socket-events.ts | Views/Profile/ProfileView.swift |
| Themes | - | themes/*.tsx, themes/types.ts, useTheme.ts, styles/index.css | - | - |
| Animations | - | hooks/useTableAnimations.ts, views/table/ChipTrickAnimation.tsx, views/table/DeckShuffleAnimation.tsx, views/table/WinnerBanner.tsx, views/table/RoyalFlushCelebration.tsx, styles/index.css | - | - |
| Sound | - | audio/SoundManager.ts, components/SoundToggle.tsx | types/sound.ts | - |
| i18n | - | i18n/translations.ts, hooks/useT.ts, components/LanguageToggle.tsx | - | Utilities/Strings.swift |
| Rebuy/Sit-out | game/GameManager.ts | views/player/RebuyPrompt.tsx | - | - |
| Hand history | - | views/history/HandHistoryDetail.tsx, HandHistoryList.tsx | types/hand-history.ts | Views/History/HandHistoryList.swift, HandHistoryDetail.swift |
| Database | db/types.ts, db/index.ts, db/sqlite/*.ts | - | - | - |
| Chips visual | - | components/ChipStack.tsx, views/table/BetChip.tsx, PotDisplay.tsx | chipUtils.ts | Views/Components/ChipStackView.swift |
| Chat | - | components/ChatWindow.tsx, ChatInput.tsx | types/chat.ts | Views/Chat/ChatView.swift |
| Run it twice | game/GameManager.ts, HandEngine.ts | views/player/RunItTwicePrompt.tsx | - | - |
| WebXR/VR | - | views/xr/XRGameScreen.tsx, XRScene.tsx, scene/*.tsx, useXRDetection.ts | - | - |
| UI editor | app.ts (REST endpoints) | views/editor/*.tsx, /editor route | animationConfig.ts | - |

## Hotspots (largest files)

| File | Lines | Description |
|------|-------|-------------|
| server/src/game/GameManager.ts | ~1130 | Main game logic, state machine |
| server/src/game/HandEngine.ts | ~960 | Hand play, betting rounds |
| client/src/views/table/PokerTable.tsx | ~930 | Table rendering |
| client/src/styles/index.css | ~750 | Design tokens, keyframe animations |
| client/src/views/player/GameScreen.tsx | ~740 | Player phone view (game + spectator) |
| server/src/socket/player-namespace.ts | ~380 | Player socket event handlers |

## Tests

- **Server**: `server/src/__tests__/` — 33 test files
- **Client**: `client/src/__tests__/` — 4 test files
- **iOS**: `ios/PokerSofta/Tests/` — Swift unit tests (XCTest)
- **E2E**: `e2e/` — Playwright tests (login, table-lobby, game-flow)
- Run unit tests: `bun run test` (vitest)
- Run iOS tests: `xcodebuild test` or via Xcode
- Run E2E tests: `bun run test:e2e` (playwright, requires `bun run build` first)
