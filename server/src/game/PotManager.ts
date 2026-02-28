import type { HandPlayer, Pot } from '@poker/shared';

export function calculatePots(players: HandPlayer[]): Pot[] {
  // Include all players who have invested chips (even folded ones contribute to pots)
  const investedPlayers = players.filter(p => p.totalInvested > 0);
  if (investedPlayers.length === 0) return [];

  // Sort by total invested ascending
  const sorted = [...investedPlayers].sort((a, b) => a.totalInvested - b.totalInvested);

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (let i = 0; i < sorted.length; i++) {
    const currentLevel = sorted[i].totalInvested;
    if (currentLevel <= previousLevel) continue;

    const contribution = currentLevel - previousLevel;
    // Every player who invested >= currentLevel contributes to this pot
    const contributors = investedPlayers.filter(p => p.totalInvested >= currentLevel);
    const potAmount = contribution * contributors.length;

    // Only non-folded contributors can WIN the pot
    const eligible = contributors
      .filter(p => !p.isFolded)
      .map(p => p.playerId);

    if (potAmount > 0) {
      if (contributors.length === 1 && eligible.length === 1) {
        // Only one contributor who is also the sole eligible player —
        // this is their own excess chips that no one else can match. Refund.
        const player = players.find(p => p.playerId === eligible[0]);
        if (player) {
          player.currentStack += potAmount;
          player.totalInvested -= contribution;
        }
      } else if (eligible.length > 0) {
        pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
      } else {
        // All eligible folded - merge into previous pot
        if (pots.length > 0) {
          pots[pots.length - 1].amount += potAmount;
        }
      }
    }

    previousLevel = currentLevel;
  }

  // Merge adjacent pots with the same eligible player set
  // (prevents spurious side pots when folded players create investment-level gaps)
  const merged: Pot[] = [];
  for (const pot of pots) {
    if (merged.length > 0) {
      const prev = merged[merged.length - 1];
      if (prev.eligiblePlayerIds.length === pot.eligiblePlayerIds.length
        && prev.eligiblePlayerIds.every(id => pot.eligiblePlayerIds.includes(id))) {
        prev.amount += pot.amount;
        continue;
      }
    }
    merged.push(pot);
  }

  return merged;
}

export function collectBetsIntoPots(players: HandPlayer[], existingPots: Pot[]): Pot[] {
  // Move currentBet into totalInvested for all players
  for (const p of players) {
    p.totalInvested += p.currentBet;
    p.currentBet = 0;
  }

  // Recalculate all pots from scratch based on totalInvested
  return calculatePots(players);
}
