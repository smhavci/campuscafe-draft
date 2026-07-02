/**
 * Business constants. Centralized so loyalty/reward rules are not scattered as
 * magic numbers or hardcoded cafe IDs across the codebase (a legacy bug: stamps
 * only worked for cafe_id === 2).
 */

/** Coffee purchases earn loyalty stamps toward a free coffee — for ANY cafe. */
export const LOYALTY = {
  /** Product category that earns stamps. */
  STAMP_CATEGORY: 'coffee',
  /** Stamps required to redeem one free coffee. */
  STAMPS_REQUIRED: 9,
} as const;

/** Star rewards: every REWARD_CURRENCY_PER_STAR spent earns 1 star (× campaign multiplier). */
export const REWARDS = {
  CURRENCY_PER_STAR: 10,
} as const;
