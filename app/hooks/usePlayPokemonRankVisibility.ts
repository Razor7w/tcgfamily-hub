'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type PlayPokemonRankVisibilityData = {
  rankPublic: boolean
}

export function usePlayPokemonRankVisibility(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false

  return useQuery<PlayPokemonRankVisibilityData>({
    queryKey: ['me', 'championship-points', 'visibility'],
    queryFn: async () => {
      const res = await fetch('/api/me/championship-points/visibility')
      if (!res.ok) {
        throw new Error('No se pudieron cargar las preferencias')
      }
      return res.json() as Promise<PlayPokemonRankVisibilityData>
    },
    enabled: want,
    staleTime: 60_000
  })
}

export function useUpdatePlayPokemonRankVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rankPublic: boolean) => {
      const res = await fetch('/api/me/championship-points/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankPublic })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string'
            ? err.error
            : 'Error al guardar preferencias'
        )
      }
      return res.json() as Promise<PlayPokemonRankVisibilityData>
    },
    onSuccess: data => {
      queryClient.setQueryData(
        ['me', 'championship-points', 'visibility'],
        data
      )
      queryClient.invalidateQueries({ queryKey: ['me', 'championship-points'] })
    }
  })
}
