'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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

const TITLE_ID = 'full-standings-title'

function WeeklyFullStandingsContent({
  query,
  eventId
}: {
  query: FullStandingsQuery
  eventId: string
}) {
  if (query.isPending) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ flex: 1, py: 6 }}
      >
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
  const standingsUnified = query.data?.standingsUnified === true
  if (cats && cats.length > 0) {
    return (
      <TournamentFinishedStandingsTabs
        key={`${eventId}-full`}
        variant="fullscreen"
        categories={cats}
        hideCategoryTabs={standingsUnified}
      />
    )
  }

  return (
    <Alert severity="info" variant="outlined">
      La clasificación detallada aún no está publicada para este evento.
    </Alert>
  )
}

function FullStandingsBody({
  query,
  eventId
}: {
  query: FullStandingsQuery
  eventId: string
}) {
  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <WeeklyFullStandingsContent query={query} eventId={eventId} />
    </Box>
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

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        aria-labelledby={TITLE_ID}
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
            px: 1.5,
            pt: 1,
            pb: 0.75,
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
              id={TITLE_ID}
              variant="subtitle1"
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
            sx={{ flexShrink: 0, ml: 0.5 }}
          >
            <Close />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            px: 1.5,
            pt: 1,
            pb: 1.5
          }}
        >
          <FullStandingsBody query={fullStandingsQuery} eventId={eventId} />
        </Box>
      </Drawer>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby={TITLE_ID}
      slotProps={{
        paper: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(90dvh, 880px)',
            overflow: 'hidden'
          }
        }
      }}
    >
      <DialogTitle
        id={TITLE_ID}
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" fontWeight={800}>
            Clasificación completa
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            title={eventTitle}
            sx={{ mt: 0.5 }}
          >
            {eventTitle}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Cerrar clasificación"
          size="small"
          sx={{ mt: -0.5, flexShrink: 0 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          py: 2
        }}
      >
        <FullStandingsBody query={fullStandingsQuery} eventId={eventId} />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
