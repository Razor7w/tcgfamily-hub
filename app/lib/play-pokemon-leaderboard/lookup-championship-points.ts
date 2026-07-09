import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  playPokemonLeaderboardPeriod,
  playPokemonLeaderboardPublicUrl,
  playPokemonLeaderboardRegion,
  playPokemonLeaderboardRegionType
} from '@/lib/play-pokemon-leaderboard/constants'
import { findPlayPokemonLeaderboardRow } from '@/lib/play-pokemon-leaderboard/fetch-leaderboard-snapshot'
import { normalizePlayPokemonDisplayName } from '@/lib/play-pokemon-leaderboard/normalize-display-name'
import type { PlayPokemonChampionshipPointsLookup } from '@/lib/play-pokemon-leaderboard/types'

export async function lookupChampionshipPointsByDisplayName(
  displayName: string
): Promise<PlayPokemonChampionshipPointsLookup> {
  const searchedAs = displayName.trim()
  const normalized = normalizePlayPokemonDisplayName(searchedAs)
  const period = playPokemonLeaderboardPeriod()
  const region = playPokemonLeaderboardRegion()
  const regionType = playPokemonLeaderboardRegionType()
  const leaderboardUrl = playPokemonLeaderboardPublicUrl()

  if (!normalized) {
    return {
      enabled: true,
      found: false,
      searchedAs: '',
      notFoundReason: 'not_linked',
      leaderboardUrl
    }
  }

  for (const division of PLAY_POKEMON_LEADERBOARD_DIVISIONS) {
    const hit = await findPlayPokemonLeaderboardRow({
      period,
      region,
      regionType,
      division,
      matches: row =>
        normalizePlayPokemonDisplayName(row.display_name) === normalized
    })
    if (!hit) continue

    return {
      enabled: true,
      found: true,
      searchedAs,
      displayName: hit.display_name,
      division,
      rank: hit.rank,
      primaryPointTotal: hit.primary_point_total,
      secondaryPointTotal: hit.secondary_point_total,
      secondaryPointType: hit.secondary_point_type,
      playerCountryCode: hit.player_country_code,
      calculationDate: hit.calculation_date,
      period,
      region,
      regionType,
      leaderboardUrl
    }
  }

  return {
    enabled: true,
    found: false,
    searchedAs,
    notFoundReason: 'not_linked',
    period,
    region,
    regionType,
    leaderboardUrl
  }
}
