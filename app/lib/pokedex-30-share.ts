import { POKEDEX_30_CARDS, type Pokedex30Card } from '@/lib/pokedex-30-cards'

export type Pokedex30ShareOwned = 'owned' | 'missing'

export type Pokedex30ShareScope =
  | 'all'
  | 'pikachu'
  | 'secret'
  | 'classic'
  | 'mew-rgb'
  | { type: string }

const TYPE_LABEL: Record<string, string> = {
  Psiquico: 'Psíquico',
  Dragon: 'Dragón'
}

function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type
}

function printedLabel(card: Pokedex30Card) {
  if (card.section === 'classic' || card.rarity === 'Mew RGB') {
    return card.printed
  }
  return `${String(card.number).padStart(3, '0')}/128`
}

function matchesScope(card: Pokedex30Card, scope: Pokedex30ShareScope) {
  if (scope === 'all') return true
  if (scope === 'pikachu') return card.section === 'pikachu'
  if (scope === 'secret') {
    return card.section === 'secret' && card.rarity !== 'Mew RGB'
  }
  if (scope === 'classic') return card.section === 'classic'
  if (scope === 'mew-rgb') return card.rarity === 'Mew RGB'
  return card.type === scope.type
}

function scopeTitle(scope: Pokedex30ShareScope) {
  if (scope === 'all') return 'set completo'
  if (scope === 'pikachu') return '30 Pikachu'
  if (scope === 'secret') return 'secretas'
  if (scope === 'classic') return 'Classic Collection'
  if (scope === 'mew-rgb') return 'Mew RGB'
  return `tipo ${typeLabel(scope.type)}`
}

function ownedTitle(owned: Pokedex30ShareOwned) {
  return owned === 'owned' ? 'Lo que tengo' : 'Lo que me falta'
}

export function buildPokedex30ShareMessage(
  ownedIds: Set<string>,
  owned: Pokedex30ShareOwned,
  scope: Pokedex30ShareScope
): string {
  const cards = POKEDEX_30_CARDS.filter(card => {
    if (!matchesScope(card, scope)) return false
    const has = ownedIds.has(card.id)
    return owned === 'owned' ? has : !has
  })

  const header = [
    'Pokédex 30th Celebration (30C)',
    `${ownedTitle(owned)} · ${scopeTitle(scope)}`,
    `${cards.length} carta${cards.length === 1 ? '' : 's'}`
  ].join('\n')

  if (cards.length === 0) {
    return `${header}\n\n(ninguna)`
  }

  const lines = cards.map(card => `• ${printedLabel(card)} ${card.name}`)
  return `${header}\n\n${lines.join('\n')}`
}
