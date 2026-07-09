'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlayPokemonLeaderboardDivision } from '@/lib/play-pokemon-leaderboard/constants'
import type { PlayPokemonChampionshipPointsLookup } from '@/lib/play-pokemon-leaderboard/public'

export function useLinkChampionshipPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      division: PlayPokemonLeaderboardDivision
      rank: number
      displayName: string
    }) => {
      const res = await fetch('/api/me/championship-points/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
      } & PlayPokemonChampionshipPointsLookup
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron vincular los puntos')
      }
      return data
    },
    onSuccess: data => {
      queryClient.setQueryData(['me', 'championship-points'], data)
    }
  })
}
