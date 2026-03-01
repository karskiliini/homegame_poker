# Vaihe 1.4 — Pöytäanimaatiot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 table animations: all-in spotlight, Royal/Straight Flush celebration, winner banner, and "the nuts" effect.

**Architecture:** Extend existing animation pipeline (server POT_AWARD event → useTableAnimations hook → PokerTable rendering → CSS keyframes). Server adds `handRank`, `handName`, and `isNuts` to POT_AWARD. Client adds new state fields and 2 new components.

**Tech Stack:** TypeScript, React, CSS keyframes, Socket.IO, existing hand evaluator.

---

### Task 1: Server — Add `isNuts()` function to hand-rank.ts

**Files:**
- Modify: `server/src/evaluation/hand-rank.ts`
- Test: `server/src/__tests__/hand-rank-nuts.test.ts`

**Step 1: Write the failing test**

Create `server/src/__tests__/hand-rank-nuts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isNuts } from '../evaluation/hand-rank.js';
import type { CardString } from '@poker/shared';

describe('isNuts', () => {
  it('returns true for royal flush on any board', () => {
    const board: CardString[] = ['Ts', 'Js', 'Qs', 'Ks', '2d'];
    const holeCards: CardString[] = ['As', '3h'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns true for nut straight when no flush possible', () => {
    // Board: 5c 6d 7h 2s Kc — no flush possible, best straight is 89
    const board: CardString[] = ['5c', '6d', '7h', '2s', 'Kc'];
    const holeCards: CardString[] = ['8s', '9d'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns false when a better hand is possible', () => {
    // Board: Ts Js Qs 2d 3h — player has pair of Ts, but royal flush is possible
    const board: CardString[] = ['Ts', 'Js', 'Qs', '2d', '3h'];
    const holeCards: CardString[] = ['Th', 'Tc'];
    expect(isNuts('NLHE', board, holeCards)).toBe(false);
  });

  it('returns true for quads when no straight flush possible', () => {
    // Board: Kh Kd Ks 2c 7d — player has Kc for quad kings
    const board: CardString[] = ['Kh', 'Kd', 'Ks', '2c', '7d'];
    const holeCards: CardString[] = ['Kc', 'Ah'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns true for nut flush', () => {
    // Board: 2s 5s 8s Td 3h — player has As Ks for nut flush
    const board: CardString[] = ['2s', '5s', '8s', 'Td', '3h'];
    const holeCards: CardString[] = ['As', 'Ks'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns false for second nut flush', () => {
    // Board: 2s 5s 8s Td 3h — player has Ks Qs (not nut flush, As would be better)
    const board: CardString[] = ['2s', '5s', '8s', 'Td', '3h'];
    const holeCards: CardString[] = ['Ks', 'Qs'];
    expect(isNuts('NLHE', board, holeCards)).toBe(false);
  });

  it('works with PLO (must use exactly 2 hole cards)', () => {
    // Board: Ts Js Qs 2d 3h — player has As Ks 4c 5c = royal flush using As Ks
    const board: CardString[] = ['Ts', 'Js', 'Qs', '2d', '3h'];
    const holeCards: CardString[] = ['As', 'Ks', '4c', '5c'];
    expect(isNuts('PLO', board, holeCards)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && bun run test -- --run hand-rank-nuts`
Expected: FAIL — `isNuts` is not exported

**Step 3: Implement `isNuts` in hand-rank.ts**

Add to the end of `server/src/evaluation/hand-rank.ts` (before the closing of the file):

```typescript
const FULL_DECK: CardString[] = [];
for (const r of Object.keys(RANK_VALUES) as Rank[]) {
  for (const s of ['h', 'd', 'c', 's'] as Suit[]) {
    FULL_DECK.push(`${r}${s}` as CardString);
  }
}

export function isNuts(
  gameType: 'NLHE' | 'PLO',
  board: CardString[],
  holeCards: CardString[],
): boolean {
  if (board.length < 5) return false;

  // Evaluate the winner's hand
  const winnerResult = evaluateHand(gameType, holeCards, board);

  // Get remaining cards (full deck minus board)
  const boardSet = new Set(board);
  const remaining = FULL_DECK.filter(c => !boardSet.has(c));

  // Check all possible 2-card combos from remaining cards
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      const combo = [remaining[i], remaining[j]];
      // For NLHE: best of C(7,5). For PLO: best of C(2,2)*C(5,3) = 10 hands
      const result = gameType === 'NLHE'
        ? evaluateNLHE(combo, board)
        : evaluatePLOTwo(combo, board);
      if (result.rank > winnerResult.rank) return false;
    }
  }
  return true;
}

// Evaluate PLO hand using exactly 2 hole cards (for nuts check with 2-card combos)
function evaluatePLOTwo(holeCards: CardString[], board: CardString[]): EvaluationResult {
  const boardCombos = combinations(board, 3);
  let best: EvaluationResult | null = null;
  for (const b3 of boardCombos) {
    const result = evaluate5([...holeCards, ...b3]);
    if (!best || result.rank > best.rank) best = result;
  }
  return best!;
}
```

**Step 4: Run test to verify it passes**

Run: `cd server && bun run test -- --run hand-rank-nuts`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add server/src/__tests__/hand-rank-nuts.test.ts server/src/evaluation/hand-rank.ts
git commit -m "feat: add isNuts() function for detecting the best possible hand"
```

---

### Task 2: Server — Extend POT_AWARD event with handRank, handName, isNuts

**Files:**
- Modify: `server/src/game/GameManager.ts` (around line 591–618)
- Modify: `server/src/evaluation/hand-rank.ts` (export HAND_CATEGORIES)

**Step 1: Export hand category mapping from hand-rank.ts**

Add to `server/src/evaluation/hand-rank.ts`:

```typescript
const HAND_RANK_KEYS: Record<number, string> = {
  [HAND_CATEGORIES.HIGH_CARD]: 'high_card',
  [HAND_CATEGORIES.PAIR]: 'pair',
  [HAND_CATEGORIES.TWO_PAIR]: 'two_pair',
  [HAND_CATEGORIES.THREE_OF_KIND]: 'three_of_a_kind',
  [HAND_CATEGORIES.STRAIGHT]: 'straight',
  [HAND_CATEGORIES.FLUSH]: 'flush',
  [HAND_CATEGORIES.FULL_HOUSE]: 'full_house',
  [HAND_CATEGORIES.FOUR_OF_KIND]: 'four_of_a_kind',
  [HAND_CATEGORIES.STRAIGHT_FLUSH]: 'straight_flush',
  [HAND_CATEGORIES.ROYAL_FLUSH]: 'royal_flush',
};

export function getHandRankKey(rank: number): string {
  const category = Math.floor(rank / 100000000);
  return HAND_RANK_KEYS[category] || 'high_card';
}
```

**Step 2: Modify GameManager.ts potGroups to include new fields**

In `server/src/game/GameManager.ts`, around line 591–600, modify the potGroups building:

```typescript
// Build per-pot award groups for sequential emission
const potGroups: {
  potIndex: number;
  winningCards?: CardString[];
  handRank?: string;
  handName?: string;
  isNuts?: boolean;
  awards: { potIndex: number; amount: number; winnerSeatIndex: number; winnerName: string; winningHand?: string }[];
}[] = [];

for (let i = 0; i < result.pots.length; i++) {
  const pot = result.pots[i];
  const awards: typeof potGroups[0]['awards'] = [];
  for (const winner of pot.winners) {
    const hp = result.players.find(p => p.playerId === winner.playerId);
    if (hp) awards.push({ potIndex: i, amount: winner.amount, winnerSeatIndex: hp.seatIndex, winnerName: winner.playerName, winningHand: pot.winningHand });
  }
  if (awards.length > 0) {
    // Extract hand rank info from showdown results
    let handRank: string | undefined;
    let handName: string | undefined;
    let nutsResult: boolean | undefined;

    if (result.showdownResults && result.showdownResults.length > 0 && pot.winningCards) {
      const winnerEntry = result.showdownResults.find(e =>
        awards.some(a => a.winnerSeatIndex === e.seatIndex) && e.shown
      );
      if (winnerEntry) {
        handRank = getHandRankKey(winnerEntry.handRank);
        handName = winnerEntry.handName;
        // Calculate nuts for the first winner
        const winnerPlayer = result.players.find(p => p.seatIndex === winnerEntry.seatIndex);
        if (winnerPlayer && result.communityCards.length === 5) {
          nutsResult = isNuts(this.config.gameType as 'NLHE' | 'PLO', result.communityCards, winnerPlayer.holeCards);
        }
      }
    }

    potGroups.push({
      potIndex: i,
      winningCards: pot.winningCards,
      handRank,
      handName,
      isNuts: nutsResult,
      awards,
    });
  }
}
```

**Step 3: Add new fields to emitToTableRoom call**

Around line 612, update the emission:

```typescript
this.emitToTableRoom(S2C_TABLE.POT_AWARD, {
  awards: group.awards,
  potIndex: group.potIndex,
  isLastPot,
  totalPots: potGroups.length,
  winningCards: group.winningCards,
  handRank: group.handRank,
  handName: group.handName,
  isNuts: group.isNuts,
});
```

**Step 4: Add imports at top of GameManager.ts**

Add `isNuts, getHandRankKey` to the import from `'../evaluation/hand-rank.js'`.

**Step 5: Run existing tests**

Run: `cd server && bun run test -- --run`
Expected: All existing tests still pass

**Step 6: Commit**

```bash
git add server/src/game/GameManager.ts server/src/evaluation/hand-rank.ts
git commit -m "feat: extend POT_AWARD with handRank, handName, isNuts"
```

---

### Task 3: Client — Add all-in spotlight state to useTableAnimations

**Files:**
- Modify: `client/src/hooks/useTableAnimations.ts`

**Step 1: Add spotlight state**

Add new state and expose in return:

```typescript
// New state
const [allInSpotlight, setAllInSpotlight] = useState(false);

// In onAllinShowdown handler, add:
setAllInSpotlight(true);

// In onHandResult handler, add:
setAllInSpotlight(false);
```

**Step 2: Add winner banner state**

```typescript
interface WinnerBannerData {
  seatIndex: number;
  handName: string;
  handDescription: string;
  handRank: string;
  isNuts: boolean;
}

const [winnerBanners, setWinnerBanners] = useState<WinnerBannerData[]>([]);
const [celebration, setCelebration] = useState<{ type: 'royal_flush' | 'straight_flush'; seatIndex: number } | null>(null);
```

**Step 3: Update onPotAward handler**

Replace the existing `onPotAward` handler:

```typescript
const onPotAward = (data: {
  awards: PotAward[];
  potIndex: number;
  isLastPot: boolean;
  totalPots: number;
  winningCards?: CardString[];
  handRank?: string;
  handName?: string;
  isNuts?: boolean;
}) => {
  const seats = [...new Set(data.awards.map(a => a.winnerSeatIndex))];
  setWinnerSeats(prev => [...new Set([...prev, ...seats])]);
  setPotAwards(data.awards);
  setAwardingPotIndex(data.potIndex);
  if (data.winningCards) {
    setWinningCards(data.winningCards);
  }

  // Winner banners
  if (data.handName) {
    const banners = seats.map(seatIndex => ({
      seatIndex,
      handName: data.handName!,
      handDescription: data.awards.find(a => a.winnerSeatIndex === seatIndex)?.winningHand || '',
      handRank: data.handRank || '',
      isNuts: data.isNuts || false,
    }));
    setWinnerBanners(banners);
    setTimeout(() => setWinnerBanners([]), 3000);
  }

  // Royal/Straight Flush celebration
  if (data.handRank === 'royal_flush' || data.handRank === 'straight_flush') {
    setCelebration({ type: data.handRank, seatIndex: seats[0] });
    setTimeout(() => setCelebration(null), 4500);
  }

  setTimeout(() => {
    setPotAwards(undefined);
    setAwardingPotIndex(null);
  }, 1500);
};
```

**Step 4: Update return type and value**

Add to `UseTableAnimationsResult` interface:

```typescript
allInSpotlight: boolean;
winnerBanners: WinnerBannerData[];
celebration: { type: 'royal_flush' | 'straight_flush'; seatIndex: number } | null;
```

Add to return object:

```typescript
allInSpotlight,
winnerBanners,
celebration,
```

**Step 5: Update onHandResult to clear banners**

In `onHandResult`, add:

```typescript
setWinnerBanners([]);
setCelebration(null);
```

**Step 6: Commit**

```bash
git add client/src/hooks/useTableAnimations.ts
git commit -m "feat: add spotlight, winner banner, and celebration state to useTableAnimations"
```

---

### Task 4: Client — Add CSS keyframes for new animations

**Files:**
- Modify: `client/src/styles/index.css`

**Step 1: Add all-in spotlight keyframes**

```css
/* All-in spotlight overlay */
.animate-spotlight-in {
  animation: spotlight-in 800ms ease-out forwards;
}
.animate-spotlight-out {
  animation: spotlight-out 600ms ease-in forwards;
}
@keyframes spotlight-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes spotlight-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

**Step 2: Add winner banner keyframes**

```css
/* Winner banner */
.animate-winner-banner-in {
  animation: winner-banner-in 500ms var(--ftp-ease-overshoot) forwards;
}
.animate-winner-banner-out {
  animation: winner-banner-out 400ms ease-in forwards;
}
@keyframes winner-banner-in {
  0% { opacity: 0; transform: scale(0) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes winner-banner-out {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8) translateY(-10px); }
}

/* The Nuts special glow */
.animate-nuts-glow {
  animation: nuts-glow 1200ms ease-in-out infinite;
}
@keyframes nuts-glow {
  0%, 100% { text-shadow: 0 0 10px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.3); }
  50% { text-shadow: 0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.5), 0 0 60px rgba(255,165,0,0.3); }
}
```

**Step 3: Add Royal Flush celebration keyframes**

```css
/* Royal Flush radial glow */
.animate-royal-glow {
  animation: royal-glow 1500ms ease-out forwards;
}
@keyframes royal-glow {
  0% { opacity: 0; transform: scale(0.2); }
  30% { opacity: 0.8; }
  100% { opacity: 0; transform: scale(3); }
}

/* Confetti fall */
.animate-confetti {
  animation: confetti-fall var(--confetti-duration, 3.5s) var(--confetti-delay, 0s) ease-in forwards;
}
@keyframes confetti-fall {
  0% { opacity: 1; transform: translateY(-100%) rotate(0deg); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(100vh) rotate(var(--confetti-rotation, 720deg)); }
}

/* Starburst */
.animate-starburst {
  animation: starburst 800ms ease-out forwards;
}
@keyframes starburst {
  0% { opacity: 1; transform: scale(0); }
  50% { opacity: 0.8; transform: scale(1.5); }
  100% { opacity: 0; transform: scale(2); }
}
```

**Step 4: Commit**

```bash
git add client/src/styles/index.css
git commit -m "feat: add CSS keyframes for spotlight, winner banner, and celebration"
```

---

### Task 5: Client — Create WinnerBanner component

**Files:**
- Create: `client/src/views/table/WinnerBanner.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';

interface WinnerBannerProps {
  handName: string;
  handDescription: string;
  isNuts: boolean;
  position: { x: number; y: number };
}

export function WinnerBanner({ handName, handDescription, isNuts, position }: WinnerBannerProps) {
  const [phase, setPhase] = useState<'in' | 'visible' | 'out'>('in');

  useEffect(() => {
    const visibleTimer = setTimeout(() => setPhase('visible'), 500);
    const outTimer = setTimeout(() => setPhase('out'), 2500);
    return () => { clearTimeout(visibleTimer); clearTimeout(outTimer); };
  }, []);

  // Parse description to get subtitle (everything after first comma+space)
  const subtitle = handDescription.includes(', ')
    ? handDescription.split(', ').slice(1).join(', ')
    : '';

  const displayName = isNuts ? 'THE NUTS!' : handName.toUpperCase();

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y - 14}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 60,
        pointerEvents: 'none',
        textAlign: 'center',
      }}
      className={phase === 'out' ? 'animate-winner-banner-out' : 'animate-winner-banner-in'}
    >
      <div
        style={{
          background: isNuts
            ? 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)'
            : 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: isNuts ? '22px' : '18px',
          fontWeight: 900,
          letterSpacing: '1px',
          lineHeight: 1.1,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        }}
        className={isNuts ? 'animate-nuts-glow' : ''}
      >
        {displayName}
      </div>
      {subtitle && !isNuts && (
        <div
          style={{
            color: '#FFD700',
            fontSize: '12px',
            fontWeight: 600,
            opacity: 0.9,
            marginTop: '2px',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {subtitle}
        </div>
      )}
      {isNuts && (
        <div
          style={{
            color: '#FFD700',
            fontSize: '12px',
            fontWeight: 600,
            opacity: 0.85,
            marginTop: '2px',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {handDescription}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/views/table/WinnerBanner.tsx
git commit -m "feat: add WinnerBanner component"
```

---

### Task 6: Client — Create RoyalFlushCelebration component

**Files:**
- Create: `client/src/views/table/RoyalFlushCelebration.tsx`

**Step 1: Create the component**

```tsx
import { useMemo } from 'react';

interface RoyalFlushCelebrationProps {
  type: 'royal_flush' | 'straight_flush';
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#FF9FF3', '#FECA57', '#FF6348'];

export function RoyalFlushCelebration({ type }: RoyalFlushCelebrationProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 1.5,
      rotation: 360 + Math.random() * 720,
      size: 4 + Math.random() * 6,
      sway: -30 + Math.random() * 60,
    }));
  }, []);

  const starbursts = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: 30 + Math.random() * 40,
      top: 35 + Math.random() * 30,
      delay: 0.5 + Math.random() * 1,
      color: type === 'royal_flush' ? '#FFD700' : '#C0C0C0',
    }));
  }, [type]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 55, overflow: 'hidden' }}>
      {/* Radial glow from center */}
      <div
        className="animate-royal-glow"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '200px',
          height: '200px',
          marginLeft: '-100px',
          marginTop: '-100px',
          borderRadius: '50%',
          background: type === 'royal_flush'
            ? 'radial-gradient(circle, rgba(255,215,0,0.6), rgba(255,165,0,0.2), transparent 70%)'
            : 'radial-gradient(circle, rgba(192,192,192,0.6), rgba(150,150,200,0.2), transparent 70%)',
        }}
      />

      {/* Confetti particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="animate-confetti"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: '1px',
            '--confetti-delay': `${p.delay}s`,
            '--confetti-duration': `${p.duration}s`,
            '--confetti-rotation': `${p.rotation}deg`,
            transform: `translateX(${p.sway}px)`,
          } as React.CSSProperties}
        />
      ))}

      {/* Starbursts near center */}
      {starbursts.map(s => (
        <div
          key={s.id}
          className="animate-starburst"
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${s.color}, transparent 70%)`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/views/table/RoyalFlushCelebration.tsx
git commit -m "feat: add RoyalFlushCelebration component"
```

---

### Task 7: Client — Integrate animations into PokerTable.tsx

**Files:**
- Modify: `client/src/views/table/PokerTable.tsx`

**Step 1: Import new components and destructure new hook values**

Add imports:

```typescript
import { WinnerBanner } from './WinnerBanner.js';
import { RoyalFlushCelebration } from './RoyalFlushCelebration.js';
```

Where useTableAnimations result is destructured, add:

```typescript
const { ..., allInSpotlight, winnerBanners, celebration } = useTableAnimations({ ... });
```

**Step 2: Add all-in spotlight overlay**

Inside the main table container (after the felt/table background, before player seats), add:

```tsx
{/* All-in spotlight overlay */}
{allInSpotlight && (
  <div
    className="animate-spotlight-in"
    style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      zIndex: 25,
      borderRadius: 'inherit',
      pointerEvents: 'none',
    }}
  />
)}
```

Then ensure all-in player seats and community cards area have `zIndex: allInSpotlight ? 30 : undefined` when spotlight is active. This means modifying the PlayerSeat wrapper divs and the community cards area to conditionally raise z-index above 25.

**Step 3: Add winner banners**

After the PlayerSeat components, render winner banners:

```tsx
{/* Winner banners */}
{winnerBanners.map(banner => {
  const pos = SEAT_POSITIONS[seatRotation != null
    ? (banner.seatIndex - seatRotation + 10) % 10
    : banner.seatIndex];
  return (
    <WinnerBanner
      key={banner.seatIndex}
      handName={banner.handName}
      handDescription={banner.handDescription}
      isNuts={banner.isNuts}
      position={pos}
    />
  );
})}
```

**Step 4: Add celebration**

After winner banners:

```tsx
{/* Royal/Straight Flush celebration */}
{celebration && <RoyalFlushCelebration type={celebration.type} />}
```

**Step 5: Spotlight z-index for player seats**

In the PlayerSeat wrapper div, add conditional z-index. Find where each `PlayerSeat` is rendered inside a positioned div and add:

```tsx
style={{
  ...existingStyles,
  zIndex: allInSpotlight && (player.status === 'all_in' || player.status === 'active') ? 30 : existingZIndex,
}}
```

For community cards area, similarly add z-index 30 when `allInSpotlight` is true.

**Step 6: Commit**

```bash
git add client/src/views/table/PokerTable.tsx
git commit -m "feat: integrate spotlight, winner banners, and celebration into PokerTable"
```

---

### Task 8: Tests — Integration test for animation data flow

**Files:**
- Modify: `server/src/__tests__/` (existing showdown/pot-award test or new file)

**Step 1: Write test for POT_AWARD including new fields**

Find existing integration test that tests showdown/pot_award flow and add assertions that `handRank`, `handName`, and `isNuts` are included in the emitted event data.

If no suitable test exists, create `server/src/__tests__/pot-award-animations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isNuts, getHandRankKey, evaluateNLHE } from '../evaluation/hand-rank.js';
import type { CardString } from '@poker/shared';

describe('getHandRankKey', () => {
  it('returns correct key for royal flush', () => {
    const result = evaluateNLHE(['As', 'Ks'] as CardString[], ['Ts', 'Js', 'Qs', '2d', '3h'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('royal_flush');
  });

  it('returns correct key for full house', () => {
    const result = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['As', 'Kh', 'Kd', '2c', '3c'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('full_house');
  });

  it('returns correct key for pair', () => {
    const result = evaluateNLHE(['Ah', '2d'] as CardString[], ['As', '5c', '8d', 'Tc', 'Jh'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('pair');
  });
});
```

**Step 2: Run tests**

Run: `cd server && bun run test -- --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add server/src/__tests__/pot-award-animations.test.ts
git commit -m "test: add tests for getHandRankKey and isNuts"
```

---

### Task 9: Build & verify

**Step 1: Build shared, server, client**

```bash
cd /path/to/poker_softa && bun run build
```

Expected: No TypeScript errors, clean build.

**Step 2: Run all tests**

```bash
bun run test -- --run
```

Expected: All tests pass.

**Step 3: Version bump**

Bump minor version in all 4 package.json files (root, shared, server, client).

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add table animations — spotlight, winner banner, celebration, the nuts

- All-in spotlight: dims table, highlights all-in players
- Winner banner: shows hand name at winner's seat
- Royal/Straight Flush celebration: golden glow + confetti
- The Nuts effect: special banner when hand is best possible
- Server: isNuts() calculation, POT_AWARD extended with handRank/handName/isNuts"
```

---

### Task 10: Update documentation

**Files:**
- Modify: `doc/roadmap.md` — mark completed items `[x]`
- Modify: `doc/structure.md` — add new component files

Mark these as done in roadmap.md under 1.4:
- [x] Dealer-napin siirtoanimaatio käsien välillä
- [x] All-in -tilanne: dramaattinen efekti
- [x] Royal Flush / Straight Flush: erikoisanimaatio
- [x] Winner-ilmoitus: bannerianimaatio voittajan kohdalla
- [x] Fold-animaatio: kortit liukuvat pois pöydältä
- [x] "The Nuts" -ilmoitus: erikoisefekti showdownissa

Update structure.md Animations row to include WinnerBanner.tsx, RoyalFlushCelebration.tsx.

**Commit:**

```bash
git add doc/roadmap.md doc/structure.md
git commit -m "docs: mark 1.4 table animations complete, update structure"
```
