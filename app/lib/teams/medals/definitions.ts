import type { TeamMedalCategory } from '@/lib/teams/medals/types'

export const TEAM_FULL_ROSTER_MIN_MEMBERS = 3
export const TEAM_ACTIVE_MONTH_MIN_PLAYERS = 2
export const TEAM_VETERAN_MIN_DAYS = 365

export type TeamMedalDefinition = {
  slug: string
  label: string
  description: string
  category: TeamMedalCategory
  tier: number
}

export const TEAM_MEDAL_DEFINITIONS = {
  league_champion: {
    slug: 'league_champion',
    label: 'Campeón de liga',
    description: 'Primer lugar en el ranking de equipos de una liga.',
    category: 'competitive',
    tier: 1
  },
  league_runner_up: {
    slug: 'league_runner_up',
    label: 'Subcampeón de liga',
    description: 'Segundo lugar en el ranking de equipos de una liga.',
    category: 'competitive',
    tier: 2
  },
  league_third_place: {
    slug: 'league_third_place',
    label: 'Tercer lugar de liga',
    description: 'Tercer lugar en el ranking de equipos de una liga.',
    category: 'competitive',
    tier: 3
  },
  active_month: {
    slug: 'active_month',
    label: 'Mes activo',
    description:
      'Al menos dos miembros jugaron torneos oficiales en el mes calendario actual.',
    category: 'community',
    tier: 2
  },
  full_roster: {
    slug: 'full_roster',
    label: 'Roster completo',
    description: 'Tres o más miembros activos en el equipo.',
    category: 'community',
    tier: 2
  },
  showcase: {
    slug: 'showcase',
    label: 'Escaparate',
    description:
      'Todos los miembros tienen un mazo público destacado en el perfil del equipo.',
    category: 'community',
    tier: 2
  },
  veteran: {
    slug: 'veteran',
    label: 'Veterano',
    description: 'Equipo activo y aprobado desde hace más de un año.',
    category: 'longevity',
    tier: 1
  }
} as const satisfies Record<string, TeamMedalDefinition>

export type TeamMedalSlug = keyof typeof TEAM_MEDAL_DEFINITIONS

const LEAGUE_RANK_MEDAL: Record<1 | 2 | 3, TeamMedalSlug> = {
  1: 'league_champion',
  2: 'league_runner_up',
  3: 'league_third_place'
}

export function teamMedalSlugForLeagueRank(rank: number): TeamMedalSlug | null {
  if (rank === 1 || rank === 2 || rank === 3) {
    return LEAGUE_RANK_MEDAL[rank]
  }
  return null
}

export function getTeamMedalDefinition(
  slug: string
): TeamMedalDefinition | null {
  return (
    (TEAM_MEDAL_DEFINITIONS as Record<string, TeamMedalDefinition>)[slug] ??
    null
  )
}

const CATEGORY_ORDER: Record<TeamMedalCategory, number> = {
  competitive: 0,
  community: 1,
  longevity: 2
}

export const TEAM_MEDAL_CATEGORY_LABELS: Record<TeamMedalCategory, string> = {
  competitive: 'Competitivas',
  community: 'Comunidad',
  longevity: 'Trayectoria'
}

/** Catálogo completo para UI (client-safe). */
export function listTeamMedalCatalog(): TeamMedalDefinition[] {
  return Object.values(TEAM_MEDAL_DEFINITIONS).sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
    if (categoryDiff !== 0) return categoryDiff
    return a.tier - b.tier || a.label.localeCompare(b.label, 'es')
  })
}

export function teamHasMedalSlug(
  medals: { slug: string }[],
  slug: string
): boolean {
  return medals.some(m => m.slug === slug)
}
