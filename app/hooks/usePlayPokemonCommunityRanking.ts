'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  PlayPokemonCommunityRankingResponse,
  PlayPokemonCommunityRankingStoresResponse
} from '@/lib/play-pokemon-leaderboard/types'

export function playPokemonCommunityRankingStoresQueryKey() {
  return ['play-pokemon', 'community-ranking', 'stores'] as const
}

export function playPokemonCommunityRankingQueryKey(
  storeId: string,
  page: number,
  search: string
) {
  return ['play-pokemon', 'community-ranking', storeId, page, search] as const
}

export function usePlayPokemonCommunityRankingStores() {
  return useQuery<PlayPokemonCommunityRankingStoresResponse>({
    queryKey: playPokemonCommunityRankingStoresQueryKey(),
    queryFn: async () => {
      const res = await fetch('/api/play-pokemon-leaderboard/community/stores')
      if (!res.ok) {
        throw new Error('No se pudieron cargar las tiendas')
      }
      return res.json() as Promise<PlayPokemonCommunityRankingStoresResponse>
    },
    staleTime: 120_000
  })
}

export function usePlayPokemonCommunityRanking(
  storeId: string | null,
  page: number,
  search: string,
  options?: { enabled?: boolean }
) {
  const enabled = (options?.enabled ?? true) && Boolean(storeId)

  return useQuery<PlayPokemonCommunityRankingResponse>({
    queryKey: playPokemonCommunityRankingQueryKey(storeId ?? '', page, search),
    queryFn: async () => {
      if (!storeId) throw new Error('Tienda requerida')
      const params = new URLSearchParams({
        storeId,
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
    enabled,
    staleTime: 60_000
  })
}
