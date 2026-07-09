'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminOnlineTableReportsSummary } from '@/lib/online-table-conflicts-admin'
import type {
  OnlineRound1LaunchStatus,
  OnlineRoundAdvanceStatus
} from '@/lib/online-tournament-advance-round'

export function useAdminOnlineTableReports(args: {
  eventId: string | null
  enabled: boolean
  statusFilter?: 'all' | 'conflict'
}) {
  const { eventId, enabled, statusFilter = 'all' } = args

  return useQuery({
    queryKey: ['admin-online-table-reports', eventId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const qs = params.toString()
      const res = await fetch(
        `/api/admin/events/${eventId}/online-table-reports${qs ? `?${qs}` : ''}`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar reportes'
        )
      }
      return data as AdminOnlineTableReportsSummary
    },
    enabled: Boolean(eventId && enabled),
    refetchInterval: enabled ? 5000 : false,
    staleTime: 0
  })
}

export type AdvanceOnlineRoundResult = {
  ok: boolean
  roundNum: number
  pairingsCount: number
  advanceStatus: OnlineRoundAdvanceStatus
}

export type LaunchOnlineRound1Result = {
  ok: boolean
  roundNum: number
  pairingsCount: number
  launchStatus: OnlineRound1LaunchStatus
  advanceStatus: OnlineRoundAdvanceStatus
}

export function useLaunchOnlineRound1(eventId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/events/${eventId}/launch-online-round-one`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al lanzar la ronda 1'
        )
      }
      return data as LaunchOnlineRound1Result
    },
    onSuccess: () => {
      invalidateOnlineTournamentQueries(queryClient)
    }
  })
}

export function useAdvanceOnlineRound(eventId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/events/${eventId}/advance-online-round`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al lanzar la siguiente ronda'
        )
      }
      return data as AdvanceOnlineRoundResult
    },
    onSuccess: () => {
      invalidateOnlineTournamentQueries(queryClient)
    }
  })
}

export type CloseOnlineTournamentResult = {
  ok: boolean
  state: 'close'
  advanceStatus: OnlineRoundAdvanceStatus
  tournamentStandingsCategories: number
}

function invalidateOnlineTournamentQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({
    queryKey: ['admin-online-table-reports']
  })
  queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
  queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
  queryClient.invalidateQueries({ queryKey: ['event-current-round'] })
  queryClient.invalidateQueries({ queryKey: ['match-chat-context'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
}

export function useCloseOnlineTournament(eventId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/events/${eventId}/close-online-tournament`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al finalizar torneo'
        )
      }
      return data as CloseOnlineTournamentResult
    },
    onSuccess: () => {
      invalidateOnlineTournamentQueries(queryClient)
    }
  })
}
