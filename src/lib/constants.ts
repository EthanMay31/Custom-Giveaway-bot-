export const COLORS = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  DANGER: 0xed4245,
  ENDED: 0x2f3136
} as const;

export const CUSTOM_IDS = {
  GIVEAWAY_ENTER: 'giveaway-enter',
  GIVEAWAY_LEAVE: 'giveaway-leave'
} as const;

export const LIMITS = {
  MAX_WINNERS: 9,
  MIN_WINNERS: 1,
  PURGE_AFTER_DAYS: 7
} as const;

export const EMOJIS = {
  GIVEAWAY: '\uD83C\uDF89' // party popper
} as const;
