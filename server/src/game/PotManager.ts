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
      if (eligible.length > 0) {
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

  return pots;
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
