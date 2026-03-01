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
      player/       # Phone UI (GameScreen, ActionButtons, Lobby, Login, Watching)
      table/        # Table UI (PokerTable, PlayerSeat, BetChip, PotDisplay, DeckShuffleAnimation)
      history/      # HandHistoryDetail, HandHistoryList
    socket.ts       # Client socket connection
    App.tsx         # Root component
  server/src/
    db/             # SQLite (players.ts, bugs.ts)
    evaluation/     # hand-rank.ts, equity.ts, bad-beat.ts
    game/           # GameManager, HandEngine, PotManager, Deck, TableManager
    socket/         # player-namespace.ts, table-namespace.ts
    app.ts          # Express app
    index.ts        # Entry point
  shared/src/
    types/          # game, hand, card, socket-events, lobby, sound, hand-history, chat
    utils/          # card-utils.ts
    betSizing.ts, preAction.ts, chipUtils.ts, constants.ts, avatars.ts
  doc/              # Documentation, bugs, roadmap
```

## Feature-to-File Mapping

| Feature | Server | Client | Shared |
|---------|--------|--------|--------|
| Game engine | game/GameManager.ts, HandEngine.ts, PotManager.ts, Deck.ts | - | types/game.ts, types/hand.ts |
| Hand evaluation | evaluation/hand-rank.ts, equity.ts, bad-beat.ts | - | types/card.ts, utils/card-utils.ts |
| Socket comms | socket/player-namespace.ts, table-namespace.ts | socket.ts | types/socket-events.ts |
| Table mgmt | game/TableManager.ts | views/table/PokerTable.tsx, PlayerSeat.tsx | types/lobby.ts |
| Player UI | - | views/player/GameScreen.tsx, ActionButtons.tsx, PreActionButtons.tsx | betSizing.ts, preAction.ts |
| Lobby/Login | socket/player-namespace.ts | views/player/LobbyScreen.tsx, LoginScreen.tsx | types/lobby.ts |
| Themes | - | themes/*.tsx, themes/types.ts, useTheme.ts, styles/index.css | - |
| Animations | - | hooks/useTableAnimations.ts, views/table/ChipTrickAnimation.tsx, views/table/DeckShuffleAnimation.tsx, styles/index.css | - |
| Sound | - | audio/SoundManager.ts, components/SoundToggle.tsx | types/sound.ts |
| i18n | - | i18n/translations.ts, hooks/useT.ts, components/LanguageToggle.tsx | - |
| Rebuy/Sit-out | game/GameManager.ts | views/player/RebuyPrompt.tsx | - |
| Hand history | - | views/history/HandHistoryDetail.tsx, HandHistoryList.tsx | types/hand-history.ts |
| Database | db/players.ts, db/bugs.ts | - | - |
| Chips visual | - | components/ChipStack.tsx, views/table/BetChip.tsx, PotDisplay.tsx | chipUtils.ts |
| Chat | - | components/ChatWindow.tsx, ChatInput.tsx | types/chat.ts |
| Run it twice | game/GameManager.ts, HandEngine.ts | views/player/RunItTwicePrompt.tsx | - |
| Watching view | - | views/player/WatchingScreen.tsx | - |

## Hotspots (largest files)

| File | Lines | Description |
|------|-------|-------------|
| server/src/game/GameManager.ts | ~1130 | Main game logic, state machine |
| server/src/game/HandEngine.ts | ~960 | Hand play, betting rounds |
| client/src/views/table/PokerTable.tsx | ~930 | Table rendering |
| client/src/styles/index.css | ~750 | Design tokens, keyframe animations |
| client/src/views/player/GameScreen.tsx | ~510 | Player phone main view |
| server/src/socket/player-namespace.ts | ~380 | Player socket event handlers |

## Tests

- **Server**: `server/src/__tests__/` — 33 test files
- **Client**: `client/src/__tests__/` — 5 test files
- Run: `bun run test` (vitest)
