'use client'

import { useQuery } from '@tanstack/react-query'
import type { PlayPokemonCommunityRankingResponse } from '@/lib/play-pokemon-leaderboard/types'
import type { PlayPokemonLeaderboardDivision } from '@/lib/play-pokemon-leaderboard/constants'

export function playPokemonCommunityRankingQueryKey(
  division: PlayPokemonLeaderboardDivision,
  page: number,
  search: string
) {
  return ['play-pokemon', 'community-ranking', division, page, search] as const
}

export function usePlayPokemonCommunityRanking(
  division: PlayPokemonLeaderboardDivision,
  page: number,
  search: string
) {
  return useQuery<PlayPokemonCommunityRankingResponse>({
    queryKey: playPokemonCommunityRankingQueryKey(division, page, search),
    queryFn: async () => {
      const params = new URLSearchParams({
        division,
        page: String(page)
      })
      if (search.trim().length >= 2) {
        params.set('q', search.trim())
      }
      const res = await fetch(
        `/api/play-pokemon-leaderboard/community?${params.toString()}`
      )
      if (!res.ok) {
        throw new Error('No se pudo cargar el ranking de jugadores')
      }
      return res.json() as Promise<PlayPokemonCommunityRankingResponse>
    },
    staleTime: 60_000
  })
}
