'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { EmojiEventsOutlined, InfoOutlined } from '@mui/icons-material'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'
import { useMyTournamentPoints } from '@/hooks/useMyTournamentPoints'
import {
  formatStorePointsClpEquivalent,
  storePointClpEquivalenceLabel
} from '@/lib/store-points-clp'

type StoreHubTournamentPointsCardProps = {
  enabled?: boolean
}

function formatEventDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function StoreHubTournamentPointsCard({
  enabled: fetchEnabled = true
}: StoreHubTournamentPointsCardProps) {
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const { storeCredit } = useDashboardModulesFromLayout()
  const tournamentPointsLabel = storeCredit.tournamentPointsLabel
  const { data, isPending, isError, refetch, isFetching } =
    useMyTournamentPoints({ enabled: fetchEnabled })
  const [infoOpen, setInfoOpen] = useState(false)

  const activeStoreSlug = useMemo(() => {
    const activeStoreId = session?.user?.activeStoreId?.trim() ?? ''
    if (!activeStoreId) return null
    const hit = (meStoresData?.stores ?? []).find(
      r => String(r.id) === activeStoreId
    )
    const slug =
      typeof hit?.slug === 'string' ? hit.slug.trim().toLowerCase() : ''
    return slug || null
  }, [session?.user?.activeStoreId, meStoresData?.stores])

  const pointsEquivalenceLabel = storePointClpEquivalenceLabel(activeStoreSlug)

  const pointsCurrency = useMemo(
    () =>
      formatStorePointsClpEquivalent(data?.totalPoints ?? 0, activeStoreSlug),
    [data?.totalPoints, activeStoreSlug]
  )

  if (!fetchEnabled) return null
  if (data && !data.enabled) return null

  const recent = (data?.entries ?? []).slice(0, 5)
  const lastEntry = recent[0]

  return (
    <>
      <Card
        variant="outlined"
        sx={{ borderRadius: 2 }}
        data-tour="store-hub-tournament-points"
      >
        <CardHeader
          avatar={<EmojiEventsOutlined color="primary" />}
          title={tournamentPointsLabel}
          subheader="Puntos ganados en torneos de esta tienda (top mitad del evento)"
          slotProps={{ title: { variant: 'h6' } }}
          action={
            <IconButton
              aria-label="Información sobre puntos por torneo"
              onClick={() => setInfoOpen(true)}
              size="small"
              color="primary"
            >
              <InfoOutlined />
            </IconButton>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : isError ? (
            <Stack spacing={1.5} alignItems="flex-start">
              <Typography color="text.secondary">
                No se pudieron cargar tus puntos por torneo.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? 'Cargando…' : 'Reintentar'}
              </Button>
            </Stack>
          ) : data ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: theme =>
                    alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.12 : 0.08
                    ),
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5, display: 'block', mb: 0.5 }}
                >
                  Total por torneos
                </Typography>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.15,
                    mb: 0.5
                  }}
                >
                  {data.totalPoints.toLocaleString('es-CL')}
                  <Typography
                    component="span"
                    variant="h5"
                    color="text.secondary"
                    sx={{ ml: 1, fontWeight: 600 }}
                  >
                    puntos
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Equivalente aproximado: {pointsCurrency} (
                  {pointsEquivalenceLabel}).
                </Typography>
              </Box>

              {lastEntry ? (
                <>
                  <Divider flexItem />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Último torneo con puntos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lastEntry.eventTitle} ·{' '}
                      {formatEventDate(lastEntry.startsAt)}
                      {lastEntry.place > 0
                        ? ` · ${lastEntry.place}º lugar`
                        : ''}{' '}
                      ·{' '}
                      <strong>
                        {lastEntry.points.toLocaleString('es-CL')} pts
                      </strong>
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no tienes puntos asignados por torneos en esta tienda.
                </Typography>
              )}

              {recent.length > 1 ? (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 0.75, fontWeight: 600 }}
                  >
                    Historial reciente
                  </Typography>
                  <Stack spacing={0.75}>
                    {recent.map(entry => (
                      <Typography
                        key={`${entry.eventId}-${entry.place}-${entry.points}`}
                        variant="body2"
                        color="text.secondary"
                      >
                        {entry.eventTitle} · {formatEventDate(entry.startsAt)} ·{' '}
                        {entry.points.toLocaleString('es-CL')} pts
                        {entry.place > 0 ? ` (${entry.place}º)` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{tournamentPointsLabel}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            La tienda puede repartir puntos tras un torneo cerrado según la
            mitad superior de la clasificación. Esos puntos se suman a tu
            crédito de tienda (mismo valor: {pointsEquivalenceLabel}).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {storeCredit.csvEnabled
              ? 'El detalle por evento aparece aquí; el saldo total canjeable sigue en la tarjeta de Crédito de tienda.'
              : 'El detalle por evento aparece aquí. El total de arriba refleja los puntos ganados en torneos de esta tienda.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
