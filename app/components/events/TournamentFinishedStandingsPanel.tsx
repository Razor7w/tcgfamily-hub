'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'
import TournamentFinishedStandingsTabs from '@/components/events/TournamentFinishedStandingsTabs'

type Props = {
  eventId: string
  categories: PublicWeeklyEvent['standingsTopByCategory']
  standingsUnified?: boolean
  /** Separador antes del top público; false si no hay bloque personal arriba. */
  showLeadingDivider?: boolean
  onOpenFullStandings: () => void
}

/**
 * Top por categoría + acceso al standing completo (torneo cerrado).
 * Vive en la columna de clasificación final (derecha) en torneos cerrados.
 */
export default function TournamentFinishedStandingsPanel({
  eventId,
  categories,
  standingsUnified = false,
  showLeadingDivider = true,
  onOpenFullStandings
}: Props) {
  const hasCategories = (categories?.length ?? 0) > 0

  return (
    <>
      {showLeadingDivider ? <Divider sx={{ mt: 2.5 }} /> : null}
      <Stack spacing={1.5} sx={{ pt: showLeadingDivider ? 2.5 : 0 }}>
        <Typography
          variant="overline"
          color="primary"
          sx={{ fontWeight: 800, letterSpacing: '0.08em' }}
        >
          {standingsUnified ? 'Top del torneo' : 'Top por categoría'}
        </Typography>
        {hasCategories ? (
          <TournamentFinishedStandingsTabs
            key={eventId}
            categories={categories!}
            hideCategoryTabs={standingsUnified}
          />
        ) : (
          <Alert severity="info" variant="outlined">
            La clasificación detallada aún no está publicada para este evento.
          </Alert>
        )}
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          fullWidth
          size="medium"
          startIcon={<EmojiEvents />}
          onClick={onOpenFullStandings}
        >
          Ver standing completo
        </Button>
      </Stack>
    </>
  )
}
