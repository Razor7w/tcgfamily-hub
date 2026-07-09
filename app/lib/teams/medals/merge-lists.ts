import type { TeamMedalDTO } from '@/lib/teams/medals/types'

/** Une listas de medallas sin duplicar instanceKey (cliente + servidor). */
export function mergeTeamMedalLists(
  ...lists: TeamMedalDTO[][]
): TeamMedalDTO[] {
  const byKey = new Map<string, TeamMedalDTO>()
  for (const list of lists) {
    for (const medal of list) {
      if (!byKey.has(medal.instanceKey)) {
        byKey.set(medal.instanceKey, medal)
      }
    }
  }
  return [...byKey.values()]
}
