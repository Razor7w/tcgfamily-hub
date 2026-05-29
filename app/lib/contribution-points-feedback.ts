import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'
import { CONTRIBUTION_ACTION_LABELS } from '@/lib/contribution-points/types'

export function sumAwardedContributionPoints(
  items?: ContributionPointsAwardedItem[]
): number {
  return (items ?? [])
    .filter(i => i.awarded)
    .reduce((sum, item) => sum + item.points, 0)
}

export function formatPreRegisterContributionToastMessage(
  items?: ContributionPointsAwardedItem[]
): string {
  const total = sumAwardedContributionPoints(items)
  if (total > 0) {
    const unit = total === 1 ? 'punto' : 'puntos'
    return `Te preinscribiste. Sumaste +${total.toLocaleString('es-CL')} ${unit} de contribución.`
  }
  return 'Te preinscribiste correctamente.'
}

export function formatContributionPointsAwardedMessage(
  items?: ContributionPointsAwardedItem[]
): string | null {
  const awarded = (items ?? []).filter(i => i.awarded && i.points > 0)
  if (awarded.length === 0) return null

  const total = awarded.reduce((sum, item) => sum + item.points, 0)
  if (awarded.length === 1) {
    const label =
      CONTRIBUTION_ACTION_LABELS[awarded[0].action] ?? awarded[0].action
    return `+${total.toLocaleString('es-CL')} pts de contribución (${label})`
  }

  return `+${total.toLocaleString('es-CL')} pts de contribución`
}
