'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TeamApprovalStatus } from '@/lib/teams/constants'

export type AdminTeamRow = {
  id: string
  name: string
  slug: string
  bio: string
  approvalStatus: TeamApprovalStatus
  isActive: boolean
  rejectionReason: string
  submittedAt: string
  reviewedAt: string | null
  captain: {
    userId: string
    displayName: string
    imageUrl: string | null
    email: string
    popid: string
    rut: string
  }
}

export const adminTeamsQueryKey = (status: string) =>
  ['admin', 'teams', status] as const

async function parseError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => ({}))
  throw new Error(typeof j.error === 'string' ? j.error : fallback)
}

export function useAdminTeams(
  status: TeamApprovalStatus | 'all' = 'pending',
  enabled = true
) {
  return useQuery({
    queryKey: adminTeamsQueryKey(status),
    queryFn: async () => {
      const params = new URLSearchParams({ status })
      const res = await fetch(`/api/admin/teams?${params}`)
      if (!res.ok) await parseError(res, 'No se pudieron cargar los equipos')
      return res.json() as Promise<{
        teams: AdminTeamRow[]
        total: number
        filter: string
      }>
    },
    enabled,
    staleTime: 20_000
  })
}

export function useApproveTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(
        `/api/admin/teams/${encodeURIComponent(teamId)}/approve`,
        {
          method: 'POST'
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo aprobar')
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'teams'] })
    }
  })
}

export function useRejectTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { teamId: string; reason?: string }) => {
      const res = await fetch(
        `/api/admin/teams/${encodeURIComponent(input.teamId)}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: input.reason ?? '' })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo rechazar')
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'teams'] })
    }
  })
}
