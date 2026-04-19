import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  endOfWeekSunday,
  startOfWeekMonday,
  weekDayKeysFromMonday
} from '@/components/events/weekUtils'
import type { MyTournamentWeekItem } from '@/lib/my-tournament-week-types'
import type { ParticipantMatchRoundDTO } from '@/lib/participant-match-round'
import type { FullTournamentUploadPayload } from '@/lib/tournament-tdf-payload'
import type { TournamentOrigin, WeeklyEventState } from '@/models/WeeklyEvent'
import type { ManualPlacementDTO } from '@/lib/manual-placement'
import type { MyDeckStatsRowDTO } from '@/lib/pokemon-matchup-stats'
import type {
  OpponentMatchupRowDTO,
  TournamentOriginFilter
} from '@/lib/pokemon-matchup-stats'

export type { MyDeckStatsRowDTO, OpponentMatchupRowDTO, TournamentOriginFilter }

export type { FullTournamentUploadPayload }

export type { WeeklyEventState }

export interface PublicWeeklyEvent {
  _id: string
  startsAt: string
  title: string
  tournamentOrigin?: TournamentOrigin
  kind: 'tournament' | 'trade_day' | 'other'
  game: 'pokemon' | 'magic' | 'other_tcg'
  pokemonSubtype: 'casual' | 'cup' | 'challenge' | null
  priceClp: number
  maxParticipants: number
  formatNotes: string
  prizesNotes: string
  location: string
  state: WeeklyEventState
  /** Ronda actual del torneo (0 = sin iniciar / sin dato). */
  roundNum: number
  participantNames: string[]
  participantCount: number
  canPreRegister: boolean
  myRegistration: string | null
  /** Confirmado por admin en el panel (asistencia). */
  myAttendanceConfirmed: boolean
  /** Mesa si estás inscrito; null si no. */
  myTable: string | null
  /** Nombre del oponente si hay emparejamiento; null si no aplica. */
  myOpponentName: string | null
  /** Récord W-L-T persistido (TDF); null si no estás inscrito. */
  myMatchRecord: { wins: number; losses: number; ties: number } | null
  canUnregister: boolean
  /** Solo si el torneo está cerrado y hay datos importados (todos los puestos publicados, hasta 512/categoría). */
  standingsTopByCategory?: {
    categoryIndex: number
    rows: { place: number; displayName: string }[]
  }[]
  /** Posición del usuario (POP) en su categoría; null si no figura. */
  myTournamentPlacement?: {
    categoryIndex: number
    categoryLabel: string
    place: number | null
    isDnf: boolean
  } | null
  /** Liga local asignada (solo torneos oficiales con liga activa). */
  league?: { name: string; slug: string } | null
}

export function useWeekEvents(weekAnchor: Date | null) {
  const from = weekAnchor ? startOfWeekMonday(weekAnchor) : null
  const to = weekAnchor ? endOfWeekSunday(weekAnchor) : null
  const weekYmds = from !== null ? weekDayKeysFromMonday(from).join(',') : ''

  return useQuery<{ events: PublicWeeklyEvent[] }>({
    queryKey: [
      'weekly-events',
      from?.toISOString(),
      to?.toISOString(),
      weekYmds
    ],
    queryFn: async () => {
      if (!from || !to) {
        return { events: [] }
      }
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        weekYmds
      })
      const res = await fetch(`/api/events?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Error al cargar eventos')
      }
      return res.json()
    },
    enabled: !!weekAnchor
  })
}

/** Torneos de la semana en los que participas (resumen informativo). */
export function useMyTournamentsWeekReport(weekAnchor: Date | null) {
  const from = weekAnchor ? startOfWeekMonday(weekAnchor) : null
  const to = weekAnchor ? endOfWeekSunday(weekAnchor) : null

  return useQuery<{ tournaments: MyTournamentWeekItem[] }>({
    queryKey: ['my-tournaments-week', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      if (!from || !to) {
        return { tournaments: [] }
      }
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString()
      })
      const res = await fetch(`/api/events/my-tournaments-week?${params}`)
      if (!res.ok) {
        throw new Error('Error al cargar tu reporte de torneos')
      }
      return res.json()
    },
    enabled: !!weekAnchor
  })
}

/** Últimos N torneos en los que participas (más recientes por fecha de inicio). */
export function useMyRecentTournaments(limit = 2) {
  return useQuery<{ tournaments: MyTournamentWeekItem[] }>({
    queryKey: ['my-recent-tournaments', limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(Math.max(1, Math.min(5, limit)))
      })
      const res = await fetch(`/api/events/my-recent-tournaments?${params}`)
      if (!res.ok) {
        throw new Error('Error al cargar torneos recientes')
      }
      return res.json()
    }
  })
}

/** Detalle de evento para el dashboard (incluye deck reportado). */
export type DashboardEventDetail = PublicWeeklyEvent & {
  myDeckPokemonSlugs: string[]
  canReportDeck: boolean
  myMatchRounds: ParticipantMatchRoundDTO[]
  /** Solo torneos custom creados por el usuario actual. */
  canDeleteCustomTournament?: boolean
  /** Admin viendo un torneo custom: datos del creador, sin acciones de edición. */
  adminReadOnlyView?: boolean
}

export function useDashboardEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: ['dashboard-event-detail', eventId],
    queryFn: async () => {
      if (!eventId?.trim()) throw new Error('ID requerido')
      const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        event?: DashboardEventDetail
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar el evento'
        )
      }
      if (!data.event) throw new Error('Respuesta inválida')
      return data.event
    },
    enabled: Boolean(eventId?.trim())
  })
}

/** Clasificación completa por categoría (`GET /api/events/[id]?standings=full`). */
export function useWeeklyEventFullStandings(
  eventId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['weekly-event-full-standings', eventId],
    queryFn: async () => {
      if (!eventId?.trim()) throw new Error('ID requerido')
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}?standings=full`,
        { cache: 'no-store' }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        event?: {
          standingsFullByCategory?: NonNullable<
            PublicWeeklyEvent['standingsTopByCategory']
          >
        }
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar la clasificación'
        )
      }
      const cats = data.event?.standingsFullByCategory
      if (!Array.isArray(cats)) {
        throw new Error('Respuesta inválida')
      }
      return { standingsFullByCategory: cats }
    },
    enabled: Boolean(eventId?.trim()) && enabled
  })
}

export function useSaveMyDeck(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pokemon: string[]) => {
      const res = await fetch(`/api/events/${eventId}/my-deck`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemon })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      return data as { ok: boolean; deckPokemonSlugs: string[] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-event-detail', eventId]
      })
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['my-recent-tournaments'] })
    }
  })
}

export function useSaveMyManualPlacement(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: { clear: true } | { placement: ManualPlacementDTO }
    ) => {
      const payload =
        'placement' in input
          ? { placement: input.placement }
          : { clear: true as const }
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/my-manual-placement`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo guardar la posición'
        )
      }
      return data as { ok: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-event-detail', eventId]
      })
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['my-recent-tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['my-matchup-stats'] })
    }
  })
}

export function useCreateCustomTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      title: string
      startsAt?: string
      placement?: {
        categoryIndex: number
        place: number | null
        isDnf: boolean
      }
    }) => {
      const res = await fetch('/api/events/custom-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo crear el torneo'
        )
      }
      return data as { ok: boolean; eventId: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
      queryClient.invalidateQueries({ queryKey: ['my-recent-tournaments'] })
    }
  })
}

export function useDeleteCustomTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo eliminar el torneo'
        )
      }
      return data as { ok: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['my-recent-tournaments'] })
    }
  })
}

export function useSaveMyMatchRounds(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rounds: ParticipantMatchRoundDTO[]) => {
      const res = await fetch(`/api/events/${eventId}/my-match-rounds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al guardar rondas'
        )
      }
      return data as { ok: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-event-detail', eventId]
      })
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['my-recent-tournaments'] })
    }
  })
}

/** Respuesta de GET /api/events/[id]/current-round (emparejamientos publicados). */
export type EventCurrentRoundResponse = {
  roundNum: number
  syncedAt: string | null
  hasSnapshot: boolean
  pairings: {
    tableNumber: string
    player1Name: string
    player2Name: string
    player1Record: { wins: number; losses: number; ties: number }
    player2Record: { wins: number; losses: number; ties: number }
    isBye: boolean
  }[]
  skipped: { tableNumber: string; reason: string }[]
}

export function useEventCurrentRound(eventId: string | null, enabled: boolean) {
  return useQuery<EventCurrentRoundResponse>({
    queryKey: ['event-current-round', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/current-round`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar la ronda'
        )
      }
      return data as EventCurrentRoundResponse
    },
    enabled: Boolean(eventId && enabled),
    staleTime: 0
  })
}

export function useRegisterWeeklyEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      eventId: string
      displayName: string
      popId: string
      table: string
      opponentId: string
    }) => {
      const res = await fetch(`/api/events/${input.eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: input.displayName,
          popId: input.popId,
          table: input.table,
          opponentId: input.opponentId
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al preinscribirse'
        )
      }
      return data as {
        ok: boolean
        participantNames: string[]
        participantCount: number
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
    }
  })
}

export function useUnregisterWeeklyEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al desinscribirse'
        )
      }
      return data as {
        ok: boolean
        participantNames: string[]
        participantCount: number
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['my-tournaments-week'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
    }
  })
}

export type AdminEventParticipant = {
  displayName: string
  userId: string | null
  popId: string
  table: string
  opponentId: string
  confirmed: boolean
  wins: number
  losses: number
  ties: number
  createdAt?: string
}

export interface AdminWeeklyEvent {
  _id: string
  startsAt: string
  title: string
  kind: 'tournament' | 'trade_day' | 'other'
  game: 'pokemon' | 'magic' | 'other_tcg'
  pokemonSubtype?: string
  state: WeeklyEventState
  priceClp: number
  maxParticipants: number
  formatNotes: string
  prizesNotes: string
  location: string
  /** Ronda actual del torneo; por defecto 0. */
  roundNum?: number
  /**
   * Tope de ronda para el dashboard de jugadores (0 = sin tope). No afecta la ronda operativa en admin.
   */
  dashboardRoundCap?: number
  /** Liga Play Pokémon / liga local (solo torneos oficiales). */
  leagueId?: string | null
  league?: { name: string; slug: string } | null
  /** Snapshots guardados al pulsar «Setear ronda» (persistidos en Mongo). */
  roundSnapshots?: { roundNum: number; syncedAt?: string }[]
  /** Clasificación final por categoría (0 Júnior, 1 Sénior, 2 Máster). */
  tournamentStandings?: {
    categoryIndex: number
    finished: { popId: string; place: number }[]
    dnf: { popId: string }[]
  }[]
  participants: AdminEventParticipant[]
  createdAt?: string
  updatedAt?: string
}

export function useAdminEvents() {
  return useQuery<{ events: AdminWeeklyEvent[] }>({
    queryKey: ['admin-weekly-events'],
    queryFn: async () => {
      const res = await fetch('/api/admin/events')
      if (!res.ok) {
        throw new Error('Error al cargar eventos')
      }
      return res.json()
    }
  })
}

export function useCreateAdminEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al crear'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
    }
  })
}

export function useConfirmParticipantParticipation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      eventId: string
      userId: string
      confirmed: boolean
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/participants`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: input.userId,
            confirmed: input.confirmed
          })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al confirmar participación'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
    }
  })
}

export type AdminPreinscribeBatchResult = {
  ok: boolean
  added: number
  skippedDuplicateInFile: number
  skippedInvalidPop: number
  skippedAlreadyRegistered: number
  skippedCapacity: number
  participantCount: number
}

export type AdminSyncRoundResult = {
  ok: boolean
  roundNum: number
  state: WeeklyEventState
  appliedMatches: number
  recordsApplied: number
  skipped: { tableNumber: string; reason: string }[]
  participantCount: number
  roundSnapshotsCount: number
}

/** Aplica mesa + oponente según TDF y fija `roundNum` en el WeeklyEvent. */
/** Importa torneo completo desde TDF (.tdf final): participantes, rondas, standings, estado close. */
export function useAdminUploadFullTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      eventId: string
      payload: FullTournamentUploadPayload
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/full-tournament`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.payload)
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al subir el torneo'
        )
      }
      return data as {
        ok: boolean
        roundNum: number
        state: string
        participantCount: number
        roundSnapshotsCount: number
        tournamentStandingsCategories: number
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-current-round'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

/** Guarda una sola tabla (finished o DNF) de una categoría de standings. */
export function useAdminUploadStandingsPod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      eventId: string
      categoryIndex: 0 | 1 | 2
      podType: 'finished' | 'dnf'
      rows: { popId: string; place?: number }[]
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/standings-pod`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryIndex: input.categoryIndex,
            podType: input.podType,
            rows: input.rows
          })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al guardar la tabla'
        )
      }
      return data as { ok: boolean; categoryIndex: number; podType: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

export function useAdminSyncEventRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      eventId: string
      roundNum: number
      matches: {
        tableNumber: string
        player1PopId: string
        player2PopId: string
      }[]
      participantRecords: {
        popId: string
        wins: number
        losses: number
        ties: number
      }[]
      roundSnapshot: {
        pairings: {
          tableNumber: string
          player1PopId: string
          player2PopId: string
          player1Name: string
          player2Name: string
          player1Record: { wins: number; losses: number; ties: number }
          player2Record: { wins: number; losses: number; ties: number }
          isBye: boolean
        }[]
      }
    }) => {
      const res = await fetch(`/api/admin/events/${input.eventId}/sync-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNum: input.roundNum,
          matches: input.matches,
          participantRecords: input.participantRecords,
          roundSnapshot: input.roundSnapshot
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al setear la ronda'
        )
      }
      return data as AdminSyncRoundResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-current-round'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

export function useAdminPreinscribeBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      eventId: string
      players: { displayName: string; popId: string }[]
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/participants/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ players: input.players })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al preinscribir en lote'
        )
      }
      return data as AdminPreinscribeBatchResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
    }
  })
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      body: Record<string, unknown>
    }) => {
      const res = await fetch(`/api/admin/events/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
      queryClient.invalidateQueries({ queryKey: ['event-current-round'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

export function useDeleteAdminEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al eliminar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

export type AdminLeague = {
  _id: string
  name: string
  slug: string
  description: string
  game: 'pokemon'
  isActive: boolean
  pointsByPlace: number[]
  countBestEvents: number | null
  createdAt?: string
  updatedAt?: string
}

export type LeagueStandingEventDetail = {
  eventId: string
  title: string
  startsAt: string
  wins: number
  losses: number
  ties: number
  points: number
  /** Ronda hasta la que cuenta el récord si hay tope de dashboard. */
  leagueRoundBasis?: number
}

export type LeagueStandingRow = {
  popId: string
  displayName: string
  totalPoints: number
  eventsPlayed: number
  events: LeagueStandingEventDetail[]
}

export type PublicLeagueResponse = {
  league: {
    _id: string
    name: string
    slug: string
    description: string
    countBestEvents: number | null
    scoring: {
      winPoints: number
      lossPoints: number
      tiePoints: number
    }
  }
  tournaments: {
    _id: string
    title: string
    startsAt: string
    hasRecord: boolean
  }[]
  standings: LeagueStandingRow[]
  chartTop: { rank: number; name: string; points: number; popId: string }[]
}

export type AdminCustomTournament = {
  _id: string
  title: string
  startsAt: string
  createdAt: string
  updatedAt: string
  creator: {
    _id: string
    name: string | null
    email: string | null
  } | null
  participantCount: number
  creatorParticipant: {
    displayName: string
    matchRoundsReported: number
    deckPokemonSlugs: string[]
    wins: number
    losses: number
    ties: number
    manualPlacement: {
      categoryIndex: number
      place: number | null
      isDnf: boolean
    } | null
  } | null
}

export function useAdminCustomTournaments() {
  return useQuery<{ tournaments: AdminCustomTournament[] }>({
    queryKey: ['admin-custom-tournaments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/custom-tournaments')
      if (!res.ok) {
        throw new Error('Error al cargar torneos custom')
      }
      return res.json()
    }
  })
}

export function useAdminLeagues() {
  return useQuery<{ leagues: AdminLeague[] }>({
    queryKey: ['admin-leagues'],
    queryFn: async () => {
      const res = await fetch('/api/admin/leagues')
      if (!res.ok) {
        throw new Error('Error al cargar ligas')
      }
      return res.json()
    }
  })
}

export function useCreateAdminLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al crear liga'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] })
    }
  })
}

export function useUpdateAdminLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      body: Record<string, unknown>
    }) => {
      const res = await fetch(`/api/admin/leagues/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] })
      queryClient.invalidateQueries({ queryKey: ['league-public'] })
    }
  })
}

export function useDeleteAdminLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/leagues/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al eliminar'
        )
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] })
    }
  })
}

export function usePublicLeague(slug: string | null) {
  return useQuery<PublicLeagueResponse>({
    queryKey: ['league-public', slug],
    queryFn: async () => {
      if (!slug?.trim()) throw new Error('Slug requerido')
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(slug.trim())}`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al cargar liga'
        )
      }
      return data as PublicLeagueResponse
    },
    enabled: Boolean(slug?.trim())
  })
}

export type MyMatchupStatsPayload = {
  origin: TournamentOriginFilter
  eventsScanned: number
  eventsWithReportedRounds?: number
  myDecks?: MyDeckStatsRowDTO[]
  opponents?: OpponentMatchupRowDTO[]
  myDeckKey?: string
  myDeckSlugs?: string[]
  view?: 'deck-detail'
}

export function useMyMatchupStats(
  origin: TournamentOriginFilter,
  myDeckKey: string | null = null
) {
  return useQuery<MyMatchupStatsPayload>({
    queryKey: ['my-matchup-stats', origin, myDeckKey ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({ origin })
      if (myDeckKey) {
        params.set('myDeckKey', myDeckKey)
      }
      const res = await fetch(
        `/api/events/my-matchup-stats?${params.toString()}`,
        { cache: 'no-store' }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        myDecks?: MyDeckStatsRowDTO[]
        opponents?: OpponentMatchupRowDTO[]
        eventsScanned?: number
        eventsWithReportedRounds?: number
        origin?: TournamentOriginFilter
        myDeckKey?: string
        myDeckSlugs?: string[]
        view?: 'deck-detail'
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar estadísticas'
        )
      }
      if (myDeckKey) {
        if (!Array.isArray(data.opponents)) {
          throw new Error('Respuesta inválida')
        }
      } else if (!Array.isArray(data.myDecks)) {
        throw new Error('Respuesta inválida')
      }
      return {
        origin: data.origin ?? origin,
        eventsScanned: data.eventsScanned ?? 0,
        eventsWithReportedRounds: data.eventsWithReportedRounds,
        myDecks: data.myDecks,
        opponents: data.opponents,
        myDeckKey: data.myDeckKey,
        myDeckSlugs: data.myDeckSlugs,
        view: data.view
      }
    }
  })
}
