export const CARD_SINGLE_CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const

export type CardSingleCondition = (typeof CARD_SINGLE_CONDITIONS)[number]

export const CARD_SINGLE_CONDITION_LABELS: Record<CardSingleCondition, string> =
  {
    NM: 'Casi nuevo (NM)',
    LP: 'Ligeramente jugada (LP)',
    MP: 'Moderadamente jugada (MP)',
    HP: 'Muy jugada (HP)',
    DMG: 'Dañada'
  }

export function isCardSingleCondition(
  value: unknown
): value is CardSingleCondition {
  return (
    typeof value === 'string' &&
    (CARD_SINGLE_CONDITIONS as readonly string[]).includes(value)
  )
}
