'use client'

import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { CardHeader, Chip, Grid, Stack } from '@mui/material'
import { CalendarMonth } from '@mui/icons-material'
import { getElapsedBadge, getElapsedDays } from '@/Admin/Mails/page'
import ButtonBarCode from '../molecule/ButtonBarCode'

export default function CardMail() {
  return (
    <Grid container spacing={2}>
      <Grid size={4}>
        <Card>
          <CardHeader title="Juan Pérez" />
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarMonth />
              <Typography sx={{ fontSize: 14 }}>30 Enero 2026</Typography>
              {(() => {
                const days = getElapsedDays('2026-01-26T18:14:46.470+00:00')
                const { label, color } = getElapsedBadge(days)
                return (
                  <Chip
                    label={label}
                    color={color}
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                )
              })()}
            </Stack>
          </CardContent>
          <CardActions>
            <Typography sx={{ fontsize: 14 }} component="div">
              Generar código
            </Typography>
            <ButtonBarCode id="mail-id-12345" />
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  )
}
