'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminTeamDetailDTO } from '@/lib/teams/admin-team-detail-types'

export const adminTeamDetailQueryKey = (teamId: string) =>
  ['admin', 'teams', 'detail', teamId] as const

async function parseError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => ({}))
  throw new Error(typeof j.error === 'string' ? j.error : fallback)
}

export function useAdminTeamDetail(teamId: string | null, enabled = true) {
  const id = teamId?.trim() ?? ''
  return useQuery({
    queryKey: adminTeamDetailQueryKey(id),
    queryFn: async (): Promise<AdminTeamDetailDTO> => {
      const res = await fetch(`/api/admin/teams/${encodeURIComponent(id)}`)
      if (!res.ok) await parseError(res, 'No se pudo cargar el equipo')
      const data = (await res.json()) as { team: AdminTeamDetailDTO }
      return data.team
    },
    enabled: enabled && id.length > 0,
    staleTime: 30_000
  })
}
