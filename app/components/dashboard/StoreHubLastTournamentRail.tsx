'use client'

import Link from 'next/link'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TournamentFinishedStandingsTabs from '@/components/events/TournamentFinishedStandingsTabs'
import { useStoreLastFinishedTournament } from '@/hooks/useStoreLastFinishedTournament'

type StoreHubLastTournamentRailProps = {
  storeSlug: string
}

export default function StoreHubLastTournamentRail({
  storeSlug
}: StoreHubLastTournamentRailProps) {
  const slug = storeSlug.trim().toLowerCase()
  const { data, isPending, isError, error, refetch } =
    useStoreLastFinishedTournament(slug)

  const tournament = data?.tournament ?? null

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: t => alpha(t.palette.text.primary, 0.1),
        minHeight: { xs: 280, lg: 360 },
        height: { lg: 'auto' }
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          >
            <EmojiEventsOutlinedIcon fontSize="small" aria-hidden />
          </Box>
        }
        title="Último torneo"
        subheader={
          tournament
            ? 'Top 4 por categoría'
            : 'Resultados del torneo cerrado más reciente'
        }
        slotProps={{
          title: { variant: 'subtitle1', sx: { fontWeight: 800 } },
          subheader: { sx: { lineHeight: 1.45 } }
        }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {error instanceof Error ? error.message : 'No se pudo cargar'}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => refetch()}>
              Reintentar
            </Button>
          </Stack>
        ) : !tournament ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6 }}
          >
            Aún no hay un torneo cerrado con clasificación publicada en esta
            tienda.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, lineHeight: 1.35 }}
              >
                {tournament.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, display: 'block', mt: 0.35 }}
              >
                {new Date(tournament.startsAt).toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>
            </Box>

            <Box
              sx={{
                '& .MuiTableContainer-root': {
                  maxHeight: { xs: 200, lg: 240 }
                }
              }}
            >
              <TournamentFinishedStandingsTabs
                variant="inline"
                categories={tournament.standingsTopByCategory}
              />
            </Box>

            <Button
              component={Link}
              href={`/dashboard/torneos-semana/${tournament._id}`}
              size="small"
              variant="outlined"
              fullWidth
              sx={{ fontWeight: 700 }}
            >
              Ver torneo
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
