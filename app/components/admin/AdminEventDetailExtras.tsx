'use client'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { AdminWeeklyEvent } from '@/hooks/useWeeklyEvents'
import { WEEKLY_EVENT_PARTICIPANTS_MAX } from '@/lib/parse-pasted-event-flyer'

type AdminEventDetailExtrasProps = {
  ev: AdminWeeklyEvent
}

export default function AdminEventDetailExtras({
  ev
}: AdminEventDetailExtrasProps) {
  const hasFormat = Boolean(ev.formatNotes?.trim())
  const hasPrizes = Boolean(ev.prizesNotes?.trim())
  const hasLocation = Boolean(ev.location?.trim())

  if (!hasFormat && !hasPrizes && !hasLocation) return null

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        bgcolor: 'background.paper'
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': { my: 1 }
        }}
      >
        <Typography variant="body2" fontWeight={700}>
          Detalles del evento
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2 }}>
        <Stack spacing={2}>
          {hasLocation ? (
            <BoxBlock title="Ubicación" body={ev.location!.trim()} />
          ) : null}
          {hasFormat ? (
            <BoxBlock title="Formato / rondas" body={ev.formatNotes!.trim()} pre />
          ) : null}
          {hasPrizes ? (
            <BoxBlock title="Premios" body={ev.prizesNotes!.trim()} pre />
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Precio:{' '}
            {ev.kind === 'tournament'
              ? ev.priceClp > 0
                ? `${ev.priceClp.toLocaleString('es-CL')} CLP`
                : 'Gratis'
              : '—'}
            {' · '}
            Cupo:{' '}
            {ev.maxParticipants >= WEEKLY_EVENT_PARTICIPANTS_MAX
              ? 'Ilimitado'
              : ev.maxParticipants}
          </Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

function BoxBlock({
  title,
  body,
  pre
}: {
  title: string
  body: string
  pre?: boolean
}) {
  return (
    <div>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 0.5,
          ...(pre ? { whiteSpace: 'pre-wrap' } : {})
        }}
      >
        {body}
      </Typography>
    </div>
  )
}
