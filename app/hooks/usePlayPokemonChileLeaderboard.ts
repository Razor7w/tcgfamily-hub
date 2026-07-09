'use client'

import { useQuery } from '@tanstack/react-query'
import type { PlayPokemonLeaderboardDivision } from '@/lib/play-pokemon-leaderboard/constants'
import type { PlayPokemonChileLeaderboardResponse } from '@/lib/play-pokemon-leaderboard/public'

export function playPokemonChileLeaderboardQueryKey(
  division: PlayPokemonLeaderboardDivision,
  page: number,
  search: string
) {
  return [
    'play-pokemon',
    'leaderboard',
    'chile',
    division,
    page,
    search
  ] as const
}

export function usePlayPokemonChileLeaderboard(
  division: PlayPokemonLeaderboardDivision,
  page: number,
  search: string
) {
  const trimmedSearch = search.trim()

  return useQuery<PlayPokemonChileLeaderboardResponse>({
    queryKey: playPokemonChileLeaderboardQueryKey(
      division,
      page,
      trimmedSearch
    ),
    queryFn: async () => {
      const params = new URLSearchParams({
        division,
        page: String(page),
        pageSize: '50'
      })
      if (trimmedSearch.length >= 2) {
        params.set('q', trimmedSearch)
      }
      const res = await fetch(
        `/api/play-pokemon-leaderboard/chile?${params.toString()}`
      )
      if (!res.ok) {
        throw new Error('No se pudo cargar el ranking')
      }
      return res.json()
    },
    staleTime: 30 * 60 * 1000,
    placeholderData: prev => prev
  })
}
