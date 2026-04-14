'use client'

import Link from 'next/link'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { Box, Button, CardHeader, Chip, CircularProgress, Grid, Stack } from '@mui/material'
import { CalendarMonth } from '@mui/icons-material'
import { getElapsedBadge, getElapsedDays } from '@/admin/mails/page'
import ButtonBarCode from '../molecule/ButtonBarCode'
import { useMyMails } from '@/hooks/useMails'

const PENDING_MAILS_LIMIT = 12

export default function CardMails() {
  const { data, isLoading, error } = useMyMails({
    pendingOnly: true,
    limit: PENDING_MAILS_LIMIT
  })

  const mails = data?.mails ?? []

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error) {
    return (
      <Typography color="text.secondary">
        No se pudieron cargar los correos: {error.message}
      </Typography>
    )
  }

  if (mails.length === 0) {
    return (
      <Box
        sx={{
          py: 5,
          px: 2,
          textAlign: 'center',
          borderRadius: 1,
          bgcolor: theme => theme.palette.action.hover
        }}
      >
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No tienes correos pendientes de retiro.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cuando registren un envío a tu nombre, aparecerá aquí hasta que lo retires en tienda.
        </Typography>
        <Button component={Link} href="/dashboard/mail" size="small" variant="outlined">
          Ver historial de correos
        </Button>
      </Box>
    )
  }

  return (
    <Grid container spacing={2}>
      {mails.map(mail => {
        const from =
          typeof mail.fromUserId === 'object' && mail.fromUserId
            ? mail.fromUserId
            : null
        const title = from?.name?.trim() || 'Remitente sin nombre'
        const days = getElapsedDays(mail.createdAt)
        const { label, color } = getElapsedBadge(days)
        const dateLabel = new Date(mail.createdAt).toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })

        return (
          <Grid key={mail._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <CalendarMonth fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {dateLabel}
                  </Typography>
                  <Chip label={label} color={color} size="small" sx={{ fontWeight: 500 }} />
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Código de retiro
                </Typography>
                <ButtonBarCode id={mail._id} />
              </CardActions>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}
