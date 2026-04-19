'use client'

import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

/** Skeleton de carga para la sección de eventos semanales (p. ej. `dynamic` en el dashboard). */
export default function WeeklyEventsSectionSkeleton() {
  return (
    <Stack spacing={2.5} sx={{ py: 0.5 }}>
      <Skeleton
        variant="rounded"
        height={48}
        sx={{ borderRadius: 2, maxWidth: 360 }}
      />
      <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Skeleton
          variant="rounded"
          height={280}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        />
      </Stack>
    </Stack>
  )
}
