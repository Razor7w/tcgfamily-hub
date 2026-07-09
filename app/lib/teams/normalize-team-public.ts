import type { TeamPublicDTO } from '@/lib/teams/public-payload'

function emptyMonthlyActivity(): TeamPublicDTO['monthlyActivity'] {
  const raw = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date())
  return {
    monthLabel: raw.charAt(0).toUpperCase() + raw.slice(1),
    monthKey: '',
    members: []
  }
}

/** Respuestas cacheadas o legacy sin campos nuevos (client-safe). */
export function normalizeTeamPublicDTO(
  team: Partial<TeamPublicDTO> & Pick<TeamPublicDTO, 'id' | 'name' | 'slug'>
): TeamPublicDTO {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    bio: team.bio ?? '',
    logoUrl: team.logoUrl ?? '',
    coverUrl: team.coverUrl ?? '',
    memberCount: team.memberCount ?? team.roster?.length ?? 0,
    roster: team.roster ?? [],
    decklists: team.decklists ?? [],
    monthlyActivity: team.monthlyActivity ?? emptyMonthlyActivity()
  }
}
