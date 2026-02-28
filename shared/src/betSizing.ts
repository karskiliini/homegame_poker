/**
 * Calculate pot-sized raise/bet amount.
 *
 * For a BET (callAmount=0): pot-sized bet = potTotal
 * For a RAISE: pot-sized raise = call + (pot after call) = callAmount + (potTotal + callAmount)
 *   As a target total bet = myCurrentBet + callAmount + (potTotal + callAmount)
 *
 * @param potTotal   Total pot including all current street bets
 * @param callAmount Amount player needs to call (0 if first to act)
 * @param maxRaise   Player's all-in amount (stack + currentBet)
 * @param stack      Player's remaining stack
 * @param minRaise   Minimum legal raise amount
 * @returns Pot-sized bet/raise amount, clamped between minRaise and maxRaise
 */
export function calcPotSizedBet(
  potTotal: number,
  callAmount: number,
  maxRaise: number,
  stack: number,
  minRaise: number,
): number {
  const myCurrentBet = maxRaise - stack;
  const potAfterCall = potTotal + callAmount;
  const potSized = myCurrentBet + callAmount + potAfterCall;
  return Math.min(Math.max(Math.round(potSized), minRaise), maxRaise);
}

/**
 * Calculate half-pot-sized raise/bet amount.
 */
export function calcHalfPotBet(
  potTotal: number,
  callAmount: number,
  maxRaise: number,
  stack: number,
  minRaise: number,
): number {
  const myCurrentBet = maxRaise - stack;
  const potAfterCall = potTotal + callAmount;
  const halfPotSized = myCurrentBet + callAmount + potAfterCall * 0.5;
  return Math.min(Math.max(Math.round(halfPotSized), minRaise), maxRaise);
}
