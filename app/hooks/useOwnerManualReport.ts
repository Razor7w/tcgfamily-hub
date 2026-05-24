import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SavedDecklistSummary } from '@/hooks/useSavedDecklists'
import type { MyTournamentDecklistRefDTO } from '@/hooks/useWeeklyEvents'

export type OwnerManualReportEventRow = {
  _id: string
  title: string
  startsAt: string
  state: 'schedule' | 'running' | 'close'
  storeId: string
  storeName: string
  storeSlug: string
  participantCount: number
  maxParticipants: number
  pokemonSubtype: string | null
}

export type OwnerManualReportParticipant = {
  participantId: string
  displayName: string
  userId: string | null
  userEmail: string
  userName: string
  popId: string
  confirmed: boolean
  deckPokemonSlugs: string[]
  tournamentDecklistRef: MyTournamentDecklistRefDTO | null
  tournamentDecklistDisplay: {
    decklistName: string
    listLabel: string
  } | null
}

export type OwnerManualReportEventDetail = {
  _id: string
  title: string
  startsAt: string
  state: 'schedule' | 'running' | 'close'
  kind: string
  game: string
  storeId: string
  storeName: string
  storeSlug: string
  participants: OwnerManualReportParticipant[]
}

export function useOwnerManualReportStores() {
  return useQuery({
    queryKey: ['owner-manual-report-stores'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stores', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        stores?: { id: string; name: string; slug: string }[]
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar tiendas'
        )
      }
      return data.stores ?? []
    }
  })
}

export function useOwnerManualReportEvents(storeId: string | null) {
  return useQuery({
    queryKey: ['owner-manual-report-events', storeId ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (storeId?.trim()) params.set('storeId', storeId.trim())
      const qs = params.toString()
      const res = await fetch(
        `/api/admin/owner/manual-report/events${qs ? `?${qs}` : ''}`,
        { cache: 'no-store' }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        events?: OwnerManualReportEventRow[]
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar eventos'
        )
      }
      return data.events ?? []
    }
  })
}

export function useOwnerManualReportEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: ['owner-manual-report-event', eventId],
    queryFn: async () => {
      if (!eventId?.trim()) throw new Error('Evento requerido')
      const res = await fetch(
        `/api/admin/owner/manual-report/events/${encodeURIComponent(eventId)}`,
        { cache: 'no-store' }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        event?: OwnerManualReportEventDetail
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al cargar evento'
        )
      }
      if (!data.event) throw new Error('Respuesta inválida')
      return data.event
    },
    enabled: Boolean(eventId?.trim())
  })
}

export function useOwnerParticipantDecklists(userId: string | null) {
  return useQuery({
    queryKey: ['owner-participant-decklists', userId],
    queryFn: async (): Promise<SavedDecklistSummary[]> => {
      if (!userId?.trim()) return []
      const res = await fetch(
        `/api/admin/owner/manual-report/users/${encodeURIComponent(userId)}/decklists`,
        { cache: 'no-store' }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        decklists?: SavedDecklistSummary[]
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Error al cargar listas del jugador'
        )
      }
      return data.decklists ?? []
    },
    enabled: Boolean(userId?.trim())
  })
}

export function useOwnerSaveParticipantDeck(eventId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string | null
      participantId: string | null
      pokemon: string[]
      tournamentDecklistRef: MyTournamentDecklistRefDTO | null
    }) => {
      if (!eventId?.trim()) throw new Error('Evento requerido')
      const body: Record<string, unknown> = {
        pokemon: input.pokemon,
        tournamentDecklistRef: input.tournamentDecklistRef
      }
      if (input.userId?.trim()) {
        body.userId = input.userId.trim()
      } else if (input.participantId?.trim()) {
        body.participantId = input.participantId.trim()
      } else {
        throw new Error('Falta userId o participantId')
      }
      const res = await fetch(
        `/api/admin/owner/manual-report/events/${encodeURIComponent(eventId)}/participant-deck`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      return data as { ok: boolean; deckPokemonSlugs: string[] }
    },
    onSuccess: () => {
      if (eventId?.trim()) {
        queryClient.invalidateQueries({
          queryKey: ['owner-manual-report-event', eventId]
        })
      }
      queryClient.invalidateQueries({
        queryKey: ['owner-manual-report-events']
      })
      queryClient.invalidateQueries({ queryKey: ['weekly-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-event-detail'] })
      queryClient.invalidateQueries({ queryKey: ['tournament-meta'] })
    }
  })
}
