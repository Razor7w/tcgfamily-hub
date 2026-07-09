'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsQueryKey } from '@/hooks/useNotifications'
import { teamManageQueryKey } from '@/hooks/useTeams'
import type {
  TeamFriendlyMatchDetailDTO,
  TeamFriendlyMatchListItemDTO
} from '@/lib/teams/friendly-match/types'

export const teamFriendlyMatchesQueryKey = (slug: string) =>
  ['teams', slug, 'friendly-matches'] as const

export const teamFriendlyMatchDetailQueryKey = (matchId: string) =>
  ['teams', 'friendly-matches', matchId] as const

async function parseError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => ({}))
  throw new Error(typeof j.error === 'string' ? j.error : fallback)
}

function invalidateFriendly(
  qc: ReturnType<typeof useQueryClient>,
  slug: string
) {
  void qc.invalidateQueries({ queryKey: teamFriendlyMatchesQueryKey(slug) })
  void qc.invalidateQueries({ queryKey: teamManageQueryKey(slug) })
  void qc.invalidateQueries({ queryKey: notificationsQueryKey })
}

export function useTeamFriendlyMatches(slug: string, enabled = true) {
  return useQuery({
    queryKey: teamFriendlyMatchesQueryKey(slug),
    queryFn: async (): Promise<{ matches: TeamFriendlyMatchListItemDTO[] }> => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/friendly-matches`,
        { cache: 'no-store' }
      )
      if (!res.ok) await parseError(res, 'No se pudieron cargar los versus')
      return res.json()
    },
    enabled: Boolean(slug) && enabled,
    staleTime: 15_000
  })
}

export function useTeamFriendlyMatchDetail(
  matchId: string | null,
  enabled = true
) {
  const id = matchId?.trim() ?? ''
  return useQuery({
    queryKey: teamFriendlyMatchDetailQueryKey(id),
    queryFn: async (): Promise<{ match: TeamFriendlyMatchDetailDTO }> => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(id)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) await parseError(res, 'No se pudo cargar el versus')
      return res.json()
    },
    enabled: Boolean(id) && enabled,
    staleTime: 10_000
  })
}

export type FriendlyLineupInput = { userId: string; slot: number }

export function useRequestTeamFriendlyMatch(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      opponentTeamSlug: string
      lineup: FriendlyLineupInput[]
    }) => {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/friendly-matches`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo enviar el desafío')
      return res.json() as Promise<{ match: { id: string; status: string } }>
    },
    onSuccess: () => invalidateFriendly(qc, slug)
  })
}

export function useAcceptTeamFriendlyMatch(teamSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      matchId: string
      lineup: FriendlyLineupInput[]
    }) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(input.matchId)}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineup: input.lineup })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo aceptar el versus')
      return res.json() as Promise<{ match: TeamFriendlyMatchDetailDTO }>
    },
    onSuccess: data => {
      invalidateFriendly(qc, teamSlug)
      void qc.invalidateQueries({
        queryKey: teamFriendlyMatchDetailQueryKey(data.match.id)
      })
    }
  })
}

export function useDeclineTeamFriendlyMatch(teamSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/decline`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo rechazar el versus')
      return res.json()
    },
    onSuccess: () => invalidateFriendly(qc, teamSlug)
  })
}

export function useCancelTeamFriendlyMatch(teamSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/cancel`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo cancelar el versus')
      return res.json()
    },
    onSuccess: () => invalidateFriendly(qc, teamSlug)
  })
}

export function useResetTeamFriendlyMatch(teamSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/reset`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo reiniciar el versus')
      return res.json() as Promise<{ match: TeamFriendlyMatchDetailDTO }>
    },
    onSuccess: data => {
      invalidateFriendly(qc, teamSlug)
      void qc.setQueryData(teamFriendlyMatchDetailQueryKey(data.match.id), data)
    }
  })
}

export function useDeleteTeamFriendlyMatch(teamSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/delete`,
        { method: 'POST' }
      )
      if (!res.ok) await parseError(res, 'No se pudo eliminar el versus')
      return res.json()
    },
    onSuccess: () => invalidateFriendly(qc, teamSlug)
  })
}

export function useReportTeamFriendlyDuel(teamSlug: string, matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      duelId: string
      report: 'win' | 'loss' | 'tie'
    }) => {
      const res = await fetch(
        `/api/teams/friendly-matches/${encodeURIComponent(matchId)}/duels/${encodeURIComponent(input.duelId)}/report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: input.report })
        }
      )
      if (!res.ok) await parseError(res, 'No se pudo reportar el duelo')
      return res.json() as Promise<{ match: TeamFriendlyMatchDetailDTO }>
    },
    onSuccess: data => {
      invalidateFriendly(qc, teamSlug)
      void qc.setQueryData(teamFriendlyMatchDetailQueryKey(matchId), data)
    }
  })
}
