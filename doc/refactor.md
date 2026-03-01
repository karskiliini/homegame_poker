# Modularisaatiosuunnitelma — Layered Architecture

> Tavoite: Pilkoa koodi selkeisiin kerroksiin ja moduuleihin, jotta:
> 1. Featureiden kehittäminen koskee vain pientä osajoukkoa tiedostoja
> 2. Abstraktiotasot eivät vuoda — domain ei tiedä socketista, infra ei tiedä pelilogiikasta
> 3. Testattavuus paranee — domain-kerros on puhtaita funktioita/luokkia
> 4. Tulevat laajennukset (turnausmoodi, mixed games, multi-table) lisätään domain-kerrokseen ilman infra-muutoksia
>
> Strategia: Vaiheittainen refaktorointi. Jokainen vaihe on itsenäinen, deployattava kokonaisuus.

---

## Nykytilan ongelmat

### Serveri
- **GameManager God Object** (1212 LOC, 26 private kenttää, 75+ metodia)
  - Hoitaa pelaajahallintaa, pelilogiikkaa, socket I/O:ta, ajastuksia ja feature-logiikkaa
- **State-duplikaatio** — GameManager kopioi HandEnginen tilan paikallisiin muuttujiin broadcastia varten
- **Socket handlerit suoraan GameManageriin** — ei validointi- eikä orkestrointikerrosta

### Client
- **Ylikeskittynyt Zustand store** (30+ kenttää, 12+ komponenttia lukee)
- **PlayerView root-komponentti** (300+ LOC) — käsittelee 15+ socket-eventtia
- **PokerTable** (947 LOC) — renderöi kaiken pöydän

### Shared
- Socket-eventit ovat merkkijonoja ilman payload-tyyppejä
- Tyypit ja utilit samassa tasossa ilman jäsentelyä

---

## Uusi arkkitehtuuri

### Riippuvuuksien suunta (pakollinen)

```
infra/ ──→ services/ ──→ domain/
                     ──→ evaluation/
```

**Sääntö:** `domain/` ei saa importata mitään `services/`- tai `infra/`-kansiosta.
Client-puolella: `features/` → `stores/` → `ui/` (alaspäin), ei koskaan ylöspäin.

---

## Serverin uusi rakenne

```
server/src/
  domain/                         ← Puhdas pelilogiikka (EI socket, EI DB, EI timer)
    GameEngine.ts                 ← State machine: wrappaa HandEnginen
    HandEngine.ts                 ← Käden pelaaminen (betting rounds, showdown)
    PotManager.ts                 ← Pottilaskenta (puhtaat funktiot)
    Deck.ts                       ← Pakka
    PlayerRegistry.ts             ← Pelaajien seat map, stack management
    ActionValidator.ts            ← Action validointi (sallitut toiminnot)
    EventTypes.ts                 ← Domain event -tyypit

  evaluation/                     ← Käsien arviointi (ei muutoksia)
    hand-rank.ts
    equity.ts
    bad-beat.ts

  services/                       ← Orkestrointikerros
    TableService.ts               ← Pääorkestraattori (~250 LOC)
    TimingService.ts              ← Event queue, viiveet, ajastimet
    PlayerService.ts              ← Join, leave, disconnect, rebuy
    BroadcastService.ts           ← Socket emit -logiikka (S2C_PLAYER, S2C_TABLE)

  infra/                          ← I/O-kerros
    socket/
      player-handlers.ts          ← Socket event handlerit → thin layer → services
      table-handlers.ts
      setup.ts                    ← Socket.IO konfigurointi
    db/
      players.ts
      bugs.ts
    http/
      app.ts                      ← Express routes

  config.ts
  index.ts
```

### GameManager-pilkonta (tarkka tiedostokohtainen)

| Nykyinen vastuu (GameManager) | Uusi sijainti | Arvio LOC |
|---|----|---|
| `players`, `seatMap`, `addPlayer()`, `removePlayer()` | `domain/PlayerRegistry.ts` | ~150 |
| `handleAction()`, `getAvailableActions()`, `isPlayerTurn()` | `domain/ActionValidator.ts` | ~100 |
| HandEngine-luonti, `startNewHand()`, `handleHandComplete()`, phase-tilakone | `domain/GameEngine.ts` | ~200 |
| `eventQueue`, `processEventQueue()`, `getEventDelay()`, `queueTimer` | `services/TimingService.ts` | ~150 |
| `emitToPlayerRoom()`, `emitToTableRoom()`, `getTableState()`, `sendTableHandHistory()` | `services/BroadcastService.ts` | ~200 |
| `handlePlayerDisconnect()`, `disconnectTimers`, `pendingRebuyPrompts`, `handleRebuy()` | `services/PlayerService.ts` | ~150 |
| Orkestrointiloogiikka (kaikki yhteen) | `services/TableService.ts` | ~250 |

### TableService — uusi orkestraattori

```typescript
class TableService {
  constructor(
    private engine: GameEngine,
    private timing: TimingService,
    private broadcast: BroadcastService,
    private players: PlayerService,
    private config: GameConfig,
  ) {}

  handleAction(playerId: string, action: ActionType, amount: number) {
    const result = this.engine.performAction(playerId, action, amount)
    this.timing.enqueueEvents(result.events)
    this.broadcast.notifyAction(result)
  }

  startNewHand() {
    const activePlayers = this.players.getActivePlayers()
    if (activePlayers.length < this.config.minPlayers) return
    const result = this.engine.startHand(activePlayers)
    this.timing.enqueueEvents(result.events)
    this.broadcast.notifyHandStart(result)
  }

  addPlayer(socket: Socket, name: string, buyIn: number, avatar: string) {
    const seat = this.players.addPlayer(socket, name, buyIn, avatar)
    this.broadcast.notifyPlayerJoined(seat)
    return seat
  }
}
```

### Domain Event -malli

GameEngine ja HandEngine palauttavat eventtejä puhtaina datana — eivät emitoi itse:

```typescript
// domain/EventTypes.ts
type DomainEvent =
  | { type: 'hand_started'; handNumber: number; players: HandPlayer[] }
  | { type: 'cards_dealt'; playerId: string; cards: CardString[] }
  | { type: 'player_turn'; playerId: string; availableActions: ActionType[] }
  | { type: 'player_acted'; playerId: string; action: ActionType; amount: number }
  | { type: 'street_dealt'; street: Street; cards: CardString[] }
  | { type: 'showdown'; entries: ShowdownEntry[] }
  | { type: 'hand_complete'; results: HandResult[] }
  // ...

// domain/GameEngine.ts
class GameEngine {
  performAction(playerId: string, action: ActionType, amount: number): {
    events: DomainEvent[]
    state: GameState
  }
}
```

TimingService vastaanottaa eventit ja lisää viiveet ennen broadcastia.

---

## Clientin uusi rakenne

```
client/src/
  stores/                         ← Pilkottu state management
    useAuthStore.ts               ← playerId, name, avatar, authState, balance
    useGameStore.ts               ← gameState, privateState
    useUIStore.ts                 ← screen, chatMessages, reconnecting
    useLobbyStore.ts              ← tables, currentTableId, lobbyState

  features/                       ← Feature-moduulit
    auth/
      LoginScreen.tsx
      useAuthSocket.ts            ← Auth-eventit (irrotettu PlayerView:stä)
    lobby/
      LobbyScreen.tsx
      TableLobbyScreen.tsx
      useLobbySocket.ts
    game/
      GameScreen.tsx              ← Kevennetty pelinäkymä
      ActionButtons.tsx
      PreActionButtons.tsx
      RebuyPrompt.tsx
      RunItTwicePrompt.tsx
      ShowCardsPrompt.tsx
      useGameSocket.ts            ← Peli-eventit (irrotettu PlayerView:stä)
    table/
      PokerTable.tsx              ← Pöytärenderöinti
      PlayerSeat.tsx
      CommunityCards.tsx
      PotDisplay.tsx
      BetChip.tsx
      DeckShuffleAnimation.tsx
      ChipTrickAnimation.tsx
      BadBeatBubble.tsx
      SpeechBubble.tsx
      useTableSocket.ts           ← Table namespace -eventit
    watching/
      WatchingScreen.tsx
    history/
      HandHistoryList.tsx
      HandHistoryDetail.tsx
    xr/
      XRGameScreen.tsx
      XRScene.tsx
      scene/

  ui/                             ← Tilasta riippumattomat komponentit
    Card.tsx
    CardBack.tsx
    ChipStack.tsx
    SoundToggle.tsx
    LanguageToggle.tsx
    ThemeToggle.tsx
    ChatWindow.tsx
    ChatInput.tsx
    BugReportButton.tsx
    BugReportModal.tsx
    VersionInfo.tsx

  hooks/                          ← Yleiset hookit
    useT.ts
    useTableAnimations.ts
    useSpeechBubbleQueue.ts

  themes/                         ← Ei muutoksia
  audio/                          ← Ei muutoksia
  i18n/                           ← Ei muutoksia
  styles/                         ← Ei muutoksia

  socket.ts
  App.tsx
  PlayerView.tsx                  ← Kevennetty ~50 LOC
  main.tsx
```

### Store-pilkonta

Nykyinen `useGameStore.ts` (30+ kenttää, 158 LOC) → 4 fokusoitua storea:

**useAuthStore.ts:**
```typescript
interface AuthStore {
  playerId: string | null
  playerName: string | null
  playerAvatar: string
  persistentPlayerId: string | null
  authState: 'idle' | 'checking' | 'needs_password' | 'needs_register' | 'authenticated'
  authError: string | null
  accountBalance: number
  // setterit...
}
```

**useGameStore.ts:**
```typescript
interface GameStore {
  gameState: GameState | null
  privateState: PrivatePlayerState | null
  // setterit...
}
```

**useUIStore.ts:**
```typescript
interface UIStore {
  screen: 'login' | 'table_lobby' | 'watching' | 'lobby' | 'game'
  isConnected: boolean
  reconnecting: boolean
  serverVersion: string | null
  chatMessages: ChatMessage[]
  // setterit...
}
```

**useLobbyStore.ts:**
```typescript
interface LobbyStore {
  tables: TableInfo[]
  currentTableId: string | null
  lobbyState: LobbyState | null
  watchingTableId: string | null
  // setterit...
}
```

### Socket handler -irrotus

Nykyinen PlayerView:n ~300 LOC socket-handlerit pilkotaan 3 hookkiin:

```typescript
// features/auth/useAuthSocket.ts
export function useAuthSocket(socket: Socket) {
  const { setAuthState, setPlayerId, setPlayerName, ... } = useAuthStore()
  useEffect(() => {
    socket.on(S2C_LOBBY.AUTH_SUCCESS, (data) => {
      setAuthState('authenticated')
      setPlayerId(data.playerId)
      setPlayerName(data.name)
    })
    socket.on(S2C_LOBBY.AUTH_ERROR, (data) => {
      setAuthError(data.message)
    })
    return () => { socket.off(S2C_LOBBY.AUTH_SUCCESS); socket.off(S2C_LOBBY.AUTH_ERROR) }
  }, [socket])
}

// features/lobby/useLobbySocket.ts
export function useLobbySocket(socket: Socket) {
  const { setTables, setLobbyState, ... } = useLobbyStore()
  useEffect(() => {
    socket.on(S2C_LOBBY.TABLE_LIST, (data) => setTables(data.tables))
    socket.on(S2C_PLAYER.LOBBY_STATE, (data) => setLobbyState(data))
    return () => { ... }
  }, [socket])
}

// features/game/useGameSocket.ts
export function useGameSocket(socket: Socket) {
  const { setGameState, setPrivateState } = useGameStore()
  const { setScreen } = useUIStore()
  useEffect(() => {
    socket.on(S2C_PLAYER.HAND_START, (data) => { ... })
    socket.on(S2C_PLAYER.YOUR_TURN, (data) => { ... })
    socket.on(S2C_PLAYER.HAND_RESULT, (data) => { ... })
    return () => { ... }
  }, [socket])
}
```

### Kevennetty PlayerView (~50 LOC)

```typescript
export function PlayerView() {
  const socket = useRef(createPlayerSocket())

  // Socket hookit — jokainen hoitaa oman osa-alueensa
  useAuthSocket(socket.current)
  useLobbySocket(socket.current)
  useGameSocket(socket.current)

  const { screen } = useUIStore()

  return (
    <AnimatePresence mode="wait">
      {screen === 'login' && <LoginScreen socket={socket.current} />}
      {screen === 'lobby' && <LobbyScreen socket={socket.current} />}
      {screen === 'table_lobby' && <TableLobbyScreen socket={socket.current} />}
      {screen === 'watching' && <WatchingScreen />}
      {screen === 'game' && <GameScreen socket={socket.current} />}
    </AnimatePresence>
  )
}
```

---

## Shared-paketin uusi rakenne

```
shared/src/
  protocol/                       ← Socket-kommunikaation sopimukset
    events.ts                     ← Event-nimet (C2S, S2C_PLAYER, S2C_TABLE, S2C_LOBBY)
    payloads.ts                   ← Typesafe payload-tyypit per event
    index.ts

  domain/                         ← Pelityypit ja -logiikka
    types/
      card.ts
      game.ts
      hand.ts
      player.ts
      lobby.ts
      hand-history.ts
      chat.ts
      sound.ts
    card-utils.ts
    bet-sizing.ts
    pre-action.ts
    chip-utils.ts
    constants.ts
    avatars.ts

  index.ts                        ← Julkinen API
```

### Typesafe Socket Events

```typescript
// shared/src/protocol/payloads.ts

// Client → Server
export interface C2SPayloads {
  [C2S.ACTION]: { action: ActionType; amount: number }
  [C2S.REBUY]: { amount: number }
  [C2S.SIT_OUT]: undefined
  [C2S.SIT_IN]: undefined
  [C2S.SHOW_CARDS]: { cards: CardString[] }
  [C2S.RIT_RESPONSE]: { accept: boolean }
  [C2S.AUTO_MUCK]: { enabled: boolean }
  [C2S.CHAT]: { text: string }
}

// Server → Client (Player namespace)
export interface S2CPlayerPayloads {
  [S2C_PLAYER.CONNECTED]: { version: string }
  [S2C_PLAYER.PRIVATE_STATE]: PrivatePlayerState
  [S2C_PLAYER.YOUR_TURN]: { availableActions: ActionType[]; callAmount: number; minRaise: number; maxRaise: number }
  [S2C_PLAYER.HAND_START]: { handNumber: number; dealerSeat: number }
  [S2C_PLAYER.HAND_RESULT]: { results: HandResult[] }
  [S2C_PLAYER.RIT_OFFER]: { timeout: number }
  [S2C_PLAYER.SHOW_CARDS_OFFER]: { cards: CardString[] }
  [S2C_PLAYER.REBUY_PROMPT]: { minBuyIn: number; maxBuyIn: number }
}

// Server → Client (Table namespace)
export interface S2CTablePayloads {
  [S2C_TABLE.GAME_STATE]: GameState
  [S2C_TABLE.CARDS_DEALT]: { seatIndex: number; cardCount: number }
  [S2C_TABLE.STREET_DEALT]: { street: Street; cards: CardString[] }
  [S2C_TABLE.POT_AWARDED]: { seatIndex: number; amount: number; potIndex: number }
  [S2C_TABLE.SHOWDOWN]: { entries: ShowdownEntry[] }
}
```

---

## Toteutusvaiheet

### Vaihe 1: Domain-kerroksen eristäminen (Serveri)

**Laajuus:** `server/src/game/` → `server/src/domain/`
**Riski:** Matala — siirretään ja pilkotaan, ei muuteta logiikkaa
**Testaus:** Olemassaolevat 33 server-testiä ajetaan joka siirrolla

Tehtävät:
1. Luodaan `server/src/domain/`-kansio
2. Siirretään HandEngine.ts, PotManager.ts, Deck.ts → `domain/`
3. Irrotetaan `PlayerRegistry.ts` GameManagerista:
   - `players: Map`, `seatMap: Map`, `addPlayer()`, `removePlayer()`, `getActivePlayers()`
   - Puhdas luokka — ei socket, ei timer
4. Irrotetaan `ActionValidator.ts`:
   - `isPlayerTurn()`, `getAvailableActions()`, action-validointi
5. Luodaan `GameEngine.ts` joka wrappaa HandEnginen:
   - `startHand()` → palauttaa `DomainEvent[]`
   - `performAction()` → palauttaa `{ events: DomainEvent[], state }`
   - Ei callback-patterneja — palauttaa dataa
6. Luodaan `EventTypes.ts` domain event -tyypeille
7. GameManager kutsuu uusia moduuleja — ulkoinen käyttäytyminen ei muutu
8. Ajetaan kaikki testit

### Vaihe 2: Service-kerroksen luominen (Serveri)

**Laajuus:** GameManager → `server/src/services/`
**Riski:** Keskitaso — GameManager pilkotaan, mutta rajapinnat säilyvät
**Testaus:** Olemassaolevat testit + uudet yksikkötestit serviceille

Tehtävät:
1. Irrotetaan `BroadcastService.ts`:
   - `emitToPlayerRoom()`, `emitToTableRoom()`, `getTableState()`, `sendTableHandHistory()`
   - Vastaanottaa Socket.IO namespace-referenssin
2. Irrotetaan `TimingService.ts`:
   - `enqueueEvents()`, `processQueue()`, `getEventDelay()`
   - Vastaanottaa callback-funktion käsitellyille eventeille
3. Irrotetaan `PlayerService.ts`:
   - `handlePlayerDisconnect()`, `handleRebuy()`, disconnect-timerit
   - Vastaanottaa PlayerRegistry + BroadcastService
4. Luodaan `TableService.ts` (~250 LOC):
   - Orkestroi GameEngine + TimingService + BroadcastService + PlayerService
   - Julkinen API: `handleAction()`, `startNewHand()`, `addPlayer()`, `removePlayer()`
5. Päivitetään socket handlerit kutsumaan TableServiceä
6. Poistetaan vanha GameManager.ts
7. Ajetaan kaikki testit

### Vaihe 3: Infra-kerroksen siistiminen (Serveri)

**Laajuus:** `server/src/socket/`, `server/src/db/`, `server/src/app.ts`
**Riski:** Matala — tiedostosiirtoja ja importti-päivityksiä

Tehtävät:
1. Siirretään `socket/` → `infra/socket/`
2. Siirretään `db/` → `infra/db/`
3. Siirretään `app.ts` → `infra/http/app.ts`
4. Socket handlerit ohennetaan:
   ```typescript
   // Ennen: socket handler kutsuu suoraan gameManager.handleAction()
   // Jälkeen: socket handler → tableService.handleAction()
   ```
5. Lisätään request-validointikerros socket handlerien alkuun
6. Ajetaan kaikki testit

### Vaihe 4: Client store -pilkonta

**Laajuus:** `client/src/hooks/useGameStore.ts` → `client/src/stores/`
**Riski:** Keskitaso — 12+ komponenttia päivitettävä
**Testaus:** Client-testit + manuaalinen käyttöliittymätestaus

Tehtävät:
1. Luodaan `stores/`-kansio
2. Luodaan `useAuthStore.ts` (playerId, name, avatar, authState, balance)
3. Luodaan `useGameStore.ts` (gameState, privateState)
4. Luodaan `useUIStore.ts` (screen, isConnected, chatMessages)
5. Luodaan `useLobbyStore.ts` (tables, currentTableId, lobbyState)
6. Päivitetään kaikki kuluttajakomponentit uusiin importteihin:
   - LoginScreen → useAuthStore
   - LobbyScreen → useLobbyStore + useAuthStore
   - GameScreen → useGameStore
   - ActionButtons → useGameStore
   - PlayerView → useUIStore
   - ... (12+ tiedostoa)
7. Poistetaan vanha useGameStore.ts
8. Ajetaan testit + manuaalinen testaus

### Vaihe 5: Client socket handler -irrotus

**Laajuus:** `client/src/views/player/PlayerView.tsx` → `features/*/use*Socket.ts`
**Riski:** Keskitaso — socket-eventien käsittelylogiikka siirretään
**Testaus:** Manuaalinen end-to-end -testaus

Tehtävät:
1. Luodaan `features/auth/useAuthSocket.ts` (auth-eventit)
2. Luodaan `features/lobby/useLobbySocket.ts` (lobby-eventit)
3. Luodaan `features/game/useGameSocket.ts` (peli-eventit)
4. Kevennetään PlayerView.tsx:
   - Poistetaan kaikki `socket.on()`-kutsut
   - Lisätään 3 socket-hookkia
   - Jäljelle jää ~50 LOC screen routing
5. Ajetaan manuaalinen testaus koko flow:lle

### Vaihe 6: Client feature-moduulit

**Laajuus:** `client/src/views/` + `client/src/components/` → `features/` + `ui/`
**Riski:** Matala — tiedostosiirtoja
**Testaus:** Vite build + manuaalinen testaus

Tehtävät:
1. Luodaan `features/`-kansio
2. Siirretään screen-komponentit:
   - `views/player/LoginScreen.tsx` → `features/auth/LoginScreen.tsx`
   - `views/player/LobbyScreen.tsx` → `features/lobby/LobbyScreen.tsx`
   - `views/player/GameScreen.tsx` → `features/game/GameScreen.tsx`
   - `views/table/PokerTable.tsx` → `features/table/PokerTable.tsx`
   - `views/player/WatchingScreen.tsx` → `features/watching/WatchingScreen.tsx`
   - `views/history/` → `features/history/`
   - `views/xr/` → `features/xr/`
3. Luodaan `ui/`-kansio
4. Siirretään yleiset komponentit `components/` → `ui/`
5. Päivitetään kaikki importit
6. Poistetaan tyhjät `views/`-kansiot
7. Ajetaan build + testit

### Vaihe 7: Shared protocol (Typesafe events)

**Laajuus:** `shared/src/` → `shared/src/protocol/` + `shared/src/domain/`
**Riski:** Matala-keskitaso — uusia tyyppejä, olemassaolevat toimivat edelleen
**Testaus:** TypeScript-kääntäjä tarkistaa tyypit; olemassaolevat testit

Tehtävät:
1. Luodaan `shared/src/protocol/`-kansio
2. Siirretään `types/socket-events.ts` → `protocol/events.ts`
3. Luodaan `protocol/payloads.ts` typesafe payloadeilla
4. Luodaan `shared/src/domain/`-kansio
5. Siirretään muut tyypit ja utilit → `domain/`
6. Päivitetään `shared/src/index.ts` re-exportit
7. Päivitetään server + client importit
8. Ajetaan kaikki testit + build

### Vaihe 8: Dokumentaation päivitys

**Laajuus:** `doc/`, `CLAUDE.md`
**Riski:** Ei ole

Tehtävät:
1. Päivitetään `doc/structure.md` uuden rakenteen mukaiseksi
2. Lisätään arkkitehtuurikuvaus `doc/architecture.md`:
   - Kerroskuvaus (domain/services/infra)
   - Riippuvuussäännöt
   - Feature-moduulien rajapinnat
3. Päivitetään `CLAUDE.md`:
   - Uudet konventiot (mihin uusi koodi kuuluu)
   - Import-säännöt (domain ei importtaa serviceja)
   - Testaus-ohje per kerros

---

## Lopputulos: Kansiorakenne

```
poker_softa/
  shared/src/
    protocol/
      events.ts               ← Socket event -nimet
      payloads.ts             ← Typesafe payloads
      index.ts
    domain/
      types/
        card.ts, game.ts, hand.ts, player.ts, lobby.ts,
        hand-history.ts, chat.ts, sound.ts
      card-utils.ts
      bet-sizing.ts
      pre-action.ts
      chip-utils.ts
      constants.ts
      avatars.ts
    index.ts

  server/src/
    domain/
      GameEngine.ts           ← Peli-tilakone
      HandEngine.ts           ← Käden pelaaminen
      PotManager.ts           ← Pottilaskenta
      Deck.ts                 ← Pakka
      PlayerRegistry.ts       ← Pelaajahallinta
      ActionValidator.ts      ← Toiminnon validointi
      EventTypes.ts           ← Domain event -tyypit
    evaluation/
      hand-rank.ts
      equity.ts
      bad-beat.ts
    services/
      TableService.ts         ← Orkestraattori (~250 LOC)
      TimingService.ts        ← Event queue + viiveet
      PlayerService.ts        ← Liittyminen, disconnect, rebuy
      BroadcastService.ts     ← Socket emit -logiikka
    infra/
      socket/
        player-handlers.ts
        table-handlers.ts
        setup.ts
      db/
        players.ts
        bugs.ts
      http/
        app.ts
    config.ts
    index.ts

  client/src/
    stores/
      useAuthStore.ts
      useGameStore.ts
      useUIStore.ts
      useLobbyStore.ts
    features/
      auth/
        LoginScreen.tsx
        useAuthSocket.ts
      lobby/
        LobbyScreen.tsx
        TableLobbyScreen.tsx
        useLobbySocket.ts
      game/
        GameScreen.tsx
        ActionButtons.tsx
        PreActionButtons.tsx
        RebuyPrompt.tsx
        RunItTwicePrompt.tsx
        ShowCardsPrompt.tsx
        useGameSocket.ts
      table/
        PokerTable.tsx
        PlayerSeat.tsx
        CommunityCards.tsx
        PotDisplay.tsx
        BetChip.tsx
        DeckShuffleAnimation.tsx
        ChipTrickAnimation.tsx
        BadBeatBubble.tsx
        SpeechBubble.tsx
        useTableSocket.ts
      watching/
        WatchingScreen.tsx
      history/
        HandHistoryList.tsx
        HandHistoryDetail.tsx
      xr/
        XRGameScreen.tsx
        XRScene.tsx
        scene/
    ui/
      Card.tsx
      CardBack.tsx
      ChipStack.tsx
      SoundToggle.tsx
      LanguageToggle.tsx
      ThemeToggle.tsx
      ChatWindow.tsx
      ChatInput.tsx
      BugReportButton.tsx
      BugReportModal.tsx
      VersionInfo.tsx
    hooks/
      useT.ts
      useTableAnimations.ts
      useSpeechBubbleQueue.ts
    themes/
    audio/
    i18n/
    styles/
    socket.ts
    App.tsx
    PlayerView.tsx
    main.tsx

  doc/
    structure.md              ← Päivitetty
    architecture.md           ← Uusi: arkkitehtuurikuvaus
    refactor.md               ← Tämä dokumentti
```

---

## Tulevaisuuden laajennettavuus

Uuden rakenteen ansiosta roadmapin featuret lisätään selkeästi:

| Tuleva feature | Missä koodi elää |
|---|---|
| **Turnausmoodi** | `server/domain/TournamentEngine.ts` + `client/features/tournament/` |
| **Mixed Games** | `server/domain/GameEngine.ts` laajennetaan GameType-enumilla |
| **Multi-table** | `services/TableService.ts` on jo per-table — TableManager hallitsee monta |
| **Admin-paneeli** | `client/features/admin/` + `server/infra/socket/admin-handlers.ts` |
| **Tilastot** | `server/domain/StatsCalculator.ts` + `client/features/stats/` |
| **Chat-laajennus** | `client/features/chat/` + `server/services/ChatService.ts` |
| **Straddle/Bomb Pot** | `server/domain/HandEngine.ts` laajennetaan — ei vaadi muita kerroksia |
| **Leaderboard** | `server/infra/db/leaderboard.ts` + `client/features/leaderboard/` |
| **Streaming-moodi** | `client/features/streaming/` — erillinen näkymä |
| **Typesafe socket** | `shared/protocol/` on jo paikallaan vaiheesta 7 lähtien |

### Arkkitehtuurisäännöt uusille featureille

1. **Pelilogiikka** → `server/domain/` (puhdas, testattava, ei I/O:ta)
2. **Socket-eventit** → `shared/protocol/` (typesafe payloads)
3. **Orkestraatio** → `server/services/` (yhdistää domain + infra)
4. **Socket handlerit** → `server/infra/socket/` (thin → services)
5. **Client näkymä** → `client/features/<feature>/` (screen + socket hook)
6. **Client state** → `client/stores/` (Zustand, fokusoitu per osa-alue)
7. **Yleiset komponentit** → `client/ui/` (tilasta riippumattomat)

---

## Mittarit onnistumiselle

| Mittari | Nyt | Tavoite |
|---|---|---|
| GameManager LOC | 1212 | 0 (poistettu, korvattu TableService ~250) |
| Suurin tiedosto | 1212 LOC | <300 LOC |
| Client store -kentät per store | 30+ | <10 |
| PlayerView LOC | 300+ | ~50 |
| Tiedostot joita feature koskee | 5-10 | 2-4 |
| Domain-testit ilman I/O:ta | 0 | 15+ |
| Typesafe socket events | 0% | 100% |

---

*Dokumentti luotu 2026-03-01. Päivitetään refaktoroinnin edetessä.*
