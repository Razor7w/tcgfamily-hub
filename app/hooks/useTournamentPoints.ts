import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'

export type TournamentPointsFinishedEvent = {
  id: string
  title: string
  startsAt: string
  participantCount: number
  hasAward: boolean
}

export type TournamentPointsProposalRow = {
  place: number
  displayName: string
  popId: string
  userId: string | null
  wins: number
  losses: number
  ties: number
  points: number
}

export type TournamentPointsProposal = {
  playerCount: number
  topCount: number
  defaultTopCount: number
  distributionTotal: number
  rows: TournamentPointsProposalRow[]
}

export function useTournamentPointsEnabled() {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: ['admin', 'tournament-points', 'enabled', storeKey],
    enabled: storeKey !== 'none',
    queryFn: async () => {
      const res = await fetch('/api/admin/tournament-points/enabled')
      if (!res.ok) throw new Error('No se pudo leer la configuración')
      const data = (await res.json()) as { enabled?: boolean }
      return data.enabled === true
    },
    staleTime: 60_000
  })
}

export function useTournamentPointsFinishedEvents(enabled: boolean) {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: ['admin', 'tournament-points', 'events', storeKey],
    enabled: enabled && storeKey !== 'none',
    queryFn: async () => {
      const res = await fetch('/api/admin/tournament-points/finished-events')
      const data = (await res.json()) as {
        events?: TournamentPointsFinishedEvent[]
        error?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al listar torneos'
        )
      }
      return data.events ?? []
    },
    staleTime: 30_000
  })
}

export function useTournamentPointsProposal(
  eventId: string | null,
  topCount: number
) {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: [
      'admin',
      'tournament-points',
      'proposal',
      storeKey,
      eventId,
      topCount
    ],
    enabled: Boolean(eventId) && storeKey !== 'none' && topCount > 0,
    queryFn: async () => {
      const q = new URLSearchParams({ topCount: String(topCount) })
      const res = await fetch(
        `/api/admin/tournament-points/events/${encodeURIComponent(eventId!)}?${q}`
      )
      const data = (await res.json()) as {
        proposal?: TournamentPointsProposal
        rankedAll?: Omit<TournamentPointsProposalRow, 'place' | 'points'>[]
        event?: { id: string; title: string; startsAt: string }
        existingAward?: unknown
        error?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al cargar torneo'
        )
      }
      if (!data.proposal) throw new Error('Respuesta inválida')
      return {
        ...data,
        rankedAll: data.rankedAll ?? []
      }
    },
    staleTime: 0
  })
}

export function useSaveTournamentPointsAward(eventId: string) {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (
      rows: {
        place: number
        popId: string
        displayName: string
        userId: string | null
        points: number
      }[]
    ) => {
      const res = await fetch(
        `/api/admin/tournament-points/events/${encodeURIComponent(eventId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows })
        }
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        credited?: number
        skippedNoUser?: number
        pointsTotal?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'events', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'proposal', storeKey, eventId]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export type TournamentPointsAwardListItem = {
  id: string
  eventId: string | null
  eventTitle: string
  startsAt: string | null
  playerCount: number
  topCount: number
  pointsTotal: number
  rowCount: number
  awardedAt: string | null
  updatedAt: string | null
  rows: {
    place: number
    displayName: string
    popId: string
    userId: string | null
    points: number
  }[]
}

export type TournamentPointsPlayerSource = {
  awardId: string
  eventTitle: string
  points: number
  popId: string
  displayName: string
  awardedAt: string | null
}

export type TournamentPointsAggregatedPlayer = {
  identityKey: string
  userId: string | null
  primaryPopId: string
  displayName: string
  pointsTotal: number
  sources: TournamentPointsPlayerSource[]
}

export type TournamentPointsAuditEntry = {
  id: string
  awardId: string
  eventId: string | null
  eventTitle: string
  action: 'created' | 'updated' | 'deducted'
  summary: string
  changedByName: string
  createdAt: string | null
  changes: {
    popId: string
    displayName: string
    kind: 'added' | 'removed' | 'modified'
    placeBefore?: number
    placeAfter?: number
    pointsBefore?: number
    pointsAfter?: number
    reason?: string
  }[]
}

export type TournamentPointsDeduction = {
  popId: string
  subtract: number
  reason: string
}

export function useTournamentPointsAwards(enabled: boolean) {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: ['admin', 'tournament-points', 'awards', storeKey],
    enabled: enabled && storeKey !== 'none',
    queryFn: async () => {
      const res = await fetch('/api/admin/tournament-points/awards')
      const data = (await res.json()) as {
        awards?: TournamentPointsAwardListItem[]
        players?: TournamentPointsAggregatedPlayer[]
        error?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al listar asignaciones'
        )
      }
      return {
        awards: data.awards ?? [],
        players: data.players ?? []
      }
    },
    staleTime: 15_000
  })
}

export function useTournamentPointsAuditLog(
  enabled: boolean,
  options?: {
    awardId?: string | null
    popIds?: string[]
    userId?: string | null
    playerOnly?: boolean
    limit?: number
  }
) {
  const storeKey = useDashboardStoreQueryKey()
  const awardId = options?.awardId ?? null
  const popIds = options?.popIds ?? []
  const userId = options?.userId ?? null
  const playerOnly = options?.playerOnly === true
  const limit = options?.limit
  const popIdsKey = popIds.length > 0 ? popIds.join(',') : 'none'

  return useQuery({
    queryKey: [
      'admin',
      'tournament-points',
      'audit',
      storeKey,
      awardId ?? 'all',
      popIdsKey,
      userId ?? 'none',
      playerOnly ? 'player' : 'full',
      limit ?? 'default'
    ],
    enabled: enabled && storeKey !== 'none',
    queryFn: async () => {
      const q = new URLSearchParams()
      if (awardId) q.set('awardId', awardId)
      if (popIds.length > 0) q.set('popIds', popIds.join(','))
      if (userId) q.set('userId', userId)
      if (playerOnly) q.set('playerOnly', '1')
      if (limit != null) q.set('limit', String(limit))
      const res = await fetch(
        `/api/admin/tournament-points/audit-log?${q.toString()}`
      )
      const data = (await res.json()) as {
        entries?: TournamentPointsAuditEntry[]
        error?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar auditoría'
        )
      }
      return data.entries ?? []
    },
    staleTime: 10_000
  })
}

export type TournamentPointsImportResult = {
  ok: boolean
  eventsCreated: number
  eventsSkipped: number
  rowsImported: number
  applyBalance: boolean
  usesEventId?: boolean
  credited: number
  skippedNoUser: number
  errors: string[]
}

export function useImportTournamentPointsCsv() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/admin/tournament-points/import', {
        method: 'POST',
        body: formData
      })
      const data = (await res.json()) as TournamentPointsImportResult & {
        error?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al importar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'events', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export function useDeductTournamentPointsAward() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (input: {
      awardId: string
      deductions: TournamentPointsDeduction[]
    }) => {
      const res = await fetch(
        `/api/admin/tournament-points/awards/${encodeURIComponent(input.awardId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deductions: input.deductions })
        }
      )
      const data = (await res.json()) as {
        ok?: boolean
        changed?: boolean
        error?: string
        adjustments?: number
        skippedNoUser?: number
        pointsTotal?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al actualizar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export function useDeductTournamentPointsPlayer() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (input: {
      userId: string | null
      primaryPopId: string
      subtract: number
      reason: string
    }) => {
      const res = await fetch('/api/admin/tournament-points/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const data = (await res.json()) as {
        ok?: boolean
        changed?: boolean
        error?: string
        adjustments?: number
        skippedNoUser?: number
        awardsTouched?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al descontar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export function useRemoveTournamentPointsPlayerFromList() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (input: {
      userId: string | null
      primaryPopId: string
      displayName: string
      reason: string
    }) => {
      const res = await fetch('/api/admin/tournament-points/remove-from-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const data = (await res.json()) as {
        ok?: boolean
        changed?: boolean
        error?: string
        rowsRemoved?: number
        pointsRemoved?: number
        adjustments?: number
        skippedNoUser?: number
        awardsTouched?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al quitar jugador'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export type TournamentPointsManualRegisterResult = {
  ok: boolean
  popId: string
  displayName: string
  points: number
  userLinked: boolean
  credited: boolean
  adjustments: number
  skippedNoUser: number
}

export function useRegisterTournamentPointsPlayer() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (input: {
      popId: string
      displayName: string
      points: number
      applyBalance: boolean
    }) => {
      const res = await fetch('/api/admin/tournament-points/register-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const data =
        (await res.json()) as TournamentPointsManualRegisterResult & {
          error?: string
        }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al registrar jugador'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}

export function useAddTournamentPointsPlayer() {
  const queryClient = useQueryClient()
  const storeKey = useDashboardStoreQueryKey()

  return useMutation({
    mutationFn: async (input: {
      userId: string | null
      primaryPopId: string
      displayName: string
      add: number
      reason: string
    }) => {
      const res = await fetch('/api/admin/tournament-points/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const data = (await res.json()) as {
        ok?: boolean
        changed?: boolean
        error?: string
        adjustments?: number
        skippedNoUser?: number
        awardsTouched?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al sumar puntos'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'awards', storeKey]
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points', 'audit', storeKey]
      })
    }
  })
}
