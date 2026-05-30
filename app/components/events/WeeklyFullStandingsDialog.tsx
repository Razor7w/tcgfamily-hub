'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Close from '@mui/icons-material/Close'
import TournamentFinishedStandingsTabs from '@/components/events/TournamentFinishedStandingsTabs'
import { useWeeklyEventFullStandings } from '@/hooks/useWeeklyEvents'

type FullStandingsQuery = ReturnType<typeof useWeeklyEventFullStandings>

function WeeklyFullStandingsContent({
  query,
  eventId
}: {
  query: FullStandingsQuery
  eventId: string
}) {
  if (query.isPending) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6 }}>
        <CircularProgress size={36} aria-label="Cargando clasificación" />
      </Stack>
    )
  }

  if (query.isError) {
    return (
      <Alert severity="error" variant="outlined">
        {query.error instanceof Error
          ? query.error.message
          : 'No se pudo cargar la clasificación'}
      </Alert>
    )
  }

  const cats = query.data?.standingsFullByCategory
  if (cats && cats.length > 0) {
    return (
      <TournamentFinishedStandingsTabs
        key={`${eventId}-full`}
        variant="fullscreen"
        categories={cats}
      />
    )
  }

  return (
    <Alert severity="info" variant="outlined">
      La clasificación detallada aún no está publicada para este evento.
    </Alert>
  )
}

export default function WeeklyFullStandingsDialog({
  open,
  onClose,
  eventTitle,
  eventId,
  fullStandingsQuery
}: {
  open: boolean
  onClose: () => void
  eventTitle: string
  eventId: string
  fullStandingsQuery: FullStandingsQuery
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      aria-labelledby="full-standings-drawer-title"
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: '100%',
          height: '100dvh',
          maxHeight: '100dvh',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: 'env(safe-area-inset-top)',
          pb: 'env(safe-area-inset-bottom)'
        }
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1, sm: 1.5 },
          pb: { xs: 0.75, sm: 1 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            id="full-standings-drawer-title"
            variant={isMobile ? 'subtitle1' : 'h6'}
            component="h2"
            fontWeight={800}
            noWrap
            sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            Clasificación completa
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            component="p"
            noWrap
            title={eventTitle}
            sx={{ mt: 0.25, lineHeight: 1.3 }}
          >
            {eventTitle}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Cerrar clasificación"
          edge="end"
          size={isMobile ? 'medium' : 'large'}
          sx={{ flexShrink: 0, ml: 0.5 }}
        >
          <Close />
        </IconButton>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1, sm: 2 },
          pb: { xs: 1.5, sm: 1 }
        }}
      >
        <WeeklyFullStandingsContent
          query={fullStandingsQuery}
          eventId={eventId}
        />
      </Box>
    </Drawer>
  )
}
