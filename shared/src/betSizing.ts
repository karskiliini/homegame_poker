/**
 * Calculate pot-sized raise/bet amount.
 *
 * For a BET (callAmount=0): pot-sized bet = potTotal
 * For a RAISE: pot-sized raise = call + (pot after call) = callAmount + (potTotal + callAmount)
 *   As a target total bet = currentBet + callAmount + (potTotal + callAmount)
 *
 * @param potTotal    Total pot including all current street bets
 * @param callAmount  Amount player needs to call (0 if first to act)
 * @param currentBet  Player's current bet on this street
 * @param minRaise    Minimum legal raise amount
 * @param maxRaise    Maximum legal raise amount (pot-limited in PLO, all-in in NLHE)
 * @returns Pot-sized bet/raise amount, clamped between minRaise and maxRaise
 */
export function calcPotSizedBet(
  potTotal: number,
  callAmount: number,
  currentBet: number,
  minRaise: number,
  maxRaise: number,
): number {
  const potAfterCall = potTotal + callAmount;
  const potSized = currentBet + callAmount + potAfterCall;
  return Math.min(Math.max(Math.round(potSized), minRaise), maxRaise);
}

/**
 * Calculate half-pot-sized raise/bet amount.
 */
export function calcHalfPotBet(
  potTotal: number,
  callAmount: number,
  currentBet: number,
  minRaise: number,
  maxRaise: number,
): number {
  const potAfterCall = potTotal + callAmount;
  const halfPotSized = currentBet + callAmount + potAfterCall * 0.5;
  return Math.min(Math.max(Math.round(halfPotSized), minRaise), maxRaise);
}
