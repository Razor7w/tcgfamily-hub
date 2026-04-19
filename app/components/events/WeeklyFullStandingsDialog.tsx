'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TournamentFinishedStandingsTabs from '@/components/events/TournamentFinishedStandingsTabs'
import { useWeeklyEventFullStandings } from '@/hooks/useWeeklyEvents'

type FullStandingsQuery = ReturnType<typeof useWeeklyEventFullStandings>

function WeeklyFullStandingsDialogContent({
  query,
  eventId
}: {
  query: FullStandingsQuery
  eventId: string
}) {
  if (query.isPending) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
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
        variant="dialog"
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="full-standings-dialog-title"
      PaperProps={{
        sx: {
          maxHeight: 'min(92vh, 880px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle id="full-standings-dialog-title" sx={{ flexShrink: 0 }}>
        Clasificación completa
      </DialogTitle>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ px: 3, pb: 0, mt: -1, flexShrink: 0 }}
      >
        {eventTitle}
      </Typography>
      <DialogContent
        dividers
        sx={{
          pt: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0
        }}
      >
        <WeeklyFullStandingsDialogContent
          query={fullStandingsQuery}
          eventId={eventId}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, flexShrink: 0 }}>
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
