'use client'

import Stack from '@mui/material/Stack'
import StoreHubLastTournamentRail from '@/components/dashboard/StoreHubLastTournamentRail'
import StoreHubMailsWaitingRail from '@/components/dashboard/StoreHubMailsWaitingRail'

type StoreHubRightRailProps = {
  storeSlug: string
  hubReady?: boolean
}

export default function StoreHubRightRail({
  storeSlug,
  hubReady = true
}: StoreHubRightRailProps) {
  return (
    <Stack
      spacing={2}
      sx={{ width: '100%' }}
      data-tour="store-hub-right-rail"
    >
      <StoreHubLastTournamentRail storeSlug={storeSlug} />
      <StoreHubMailsWaitingRail hubReady={hubReady} />
    </Stack>
  )
}
