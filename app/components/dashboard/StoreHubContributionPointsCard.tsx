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
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { InfoOutlined, WorkspacePremium } from '@mui/icons-material'
import ContributionTierBadge from '@/components/contribution/ContributionTierBadge'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import {
  useContributionPreferences,
  useUpdateContributionPreferences
} from '@/hooks/useContributionPreferences'
import { useMeStores } from '@/hooks/useMeStores'
import { useMyContributionPoints } from '@/hooks/useMyContributionPoints'
import { useStoreContributionLeaderboard } from '@/hooks/useStoreContributionLeaderboard'
import {
  CONTRIBUTION_CATEGORY_LABELS,
  CONTRIBUTION_POINT_CATEGORIES
} from '@/lib/contribution-points/types'
import type {
  ContributionLeaderboardRow,
  ContributionTierProgressPublic
} from '@/lib/contribution-points-public'

type StoreHubContributionPointsCardProps = {
  enabled?: boolean
}

function currentTierLabel(tier: ContributionTierProgressPublic): string {
  if (tier.currentTierIndex < 0) return tier.labels[0]
  return tier.labels[tier.currentTierIndex] ?? tier.labels[0]
}

function nextTierHint(tier: ContributionTierProgressPublic): string | null {
  if (tier.nextThreshold == null) {
    return 'Nivel máximo alcanzado en esta tienda.'
  }
  const nextIndex = Math.min(tier.currentTierIndex + 1, tier.labels.length - 1)
  const remaining = tier.nextThreshold - tier.totalPoints
  if (remaining <= 0) return null
  return `${remaining.toLocaleString('es-CL')} pts para ${tier.labels[nextIndex]}`
}

function ContributionTierProgressBar({
  tier
}: {
  tier: ContributionTierProgressPublic
}) {
  const max = tier.thresholds[2]
  const fill = Math.min(100, (tier.totalPoints / max) * 100)

  return (
    <Box sx={{ position: 'relative', pt: 0.5, pb: 3.5 }}>
      <LinearProgress
        variant="determinate"
        value={fill}
        color="secondary"
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: theme => alpha(theme.palette.text.primary, 0.08),
          '& .MuiLinearProgress-bar': { borderRadius: 999 }
        }}
      />
      {tier.thresholds.map((threshold, index) => {
        const left = Math.min(100, (threshold / max) * 100)
        const reached = tier.totalPoints >= threshold
        return (
          <Box
            key={threshold}
            sx={{
              position: 'absolute',
              left: `${left}%`,
              top: 0,
              transform: 'translate(-50%, -15%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 0
            }}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: reached ? 'secondary.contrastText' : 'text.secondary',
                bgcolor: theme =>
                  reached
                    ? theme.palette.secondary.main
                    : alpha(theme.palette.text.primary, 0.08),
                border: '2px solid',
                borderColor: theme =>
                  reached
                    ? theme.palette.secondary.main
                    : alpha(theme.palette.text.primary, 0.12)
              }}
            >
              {index + 1}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                position: 'absolute',
                top: 26,
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: reached ? 700 : 500
              }}
            >
              {threshold.toLocaleString('es-CL')}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

function ContributionLeaderboardPanel({
  rows,
  isPending,
  isError,
  emptyMessage
}: {
  rows: ContributionLeaderboardRow[]
  isPending: boolean
  isError: boolean
  emptyMessage: string
}) {
  if (isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={22} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography variant="body2" color="text.secondary">
        No se pudo cargar el ranking.
      </Typography>
    )
  }

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <Stack spacing={0.75}>
      {rows.map(row => (
        <Stack
          key={row.userId}
          direction="row"
          alignItems="center"
          spacing={1}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0, flex: 1 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                width: 22,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {row.rank}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, minWidth: 0 }}
            >
              {row.displayName}
            </Typography>
            {!row.hideBadge ? (
              <ContributionTierBadge label={row.tierLabel} />
            ) : null}
          </Stack>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {row.totalPoints.toLocaleString('es-CL')}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

type LeaderboardTab = 'month' | 'all'

export default function StoreHubContributionPointsCard({
  enabled: fetchEnabled = true
}: StoreHubContributionPointsCardProps) {
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const { contributionPoints: contributionSettings } =
    useDashboardModulesFromLayout()
  const { data, isPending, isError, refetch, isFetching } =
    useMyContributionPoints({ enabled: fetchEnabled })
  const [infoOpen, setInfoOpen] = useState(false)
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('month')

  const activeStoreSlug = useMemo(() => {
    const activeStoreId = session?.user?.activeStoreId?.trim() ?? ''
    if (!activeStoreId) return null
    const hit = (meStoresData?.stores ?? []).find(
      r => String(r.id) === activeStoreId
    )
    const slug = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
    return slug || null
  }, [session?.user?.activeStoreId, meStoresData?.stores])

  const {
    data: leaderboardMonth,
    isPending: leaderboardMonthPending,
    isError: leaderboardMonthError
  } = useStoreContributionLeaderboard({
    storeSlug: activeStoreSlug ?? undefined,
    limit: 10,
    period: 'month',
    enabled: fetchEnabled && contributionSettings.enabled
  })

  const {
    data: leaderboardAll,
    isPending: leaderboardAllPending,
    isError: leaderboardAllError
  } = useStoreContributionLeaderboard({
    storeSlug: activeStoreSlug ?? undefined,
    limit: 10,
    period: 'all',
    enabled: fetchEnabled && contributionSettings.enabled
  })

  const { data: preferences } = useContributionPreferences({
    enabled: fetchEnabled && contributionSettings.enabled
  })
  const updatePreferences = useUpdateContributionPreferences()

  const activeStoreName = useMemo(() => {
    const activeStoreId = session?.user?.activeStoreId?.trim() ?? ''
    if (!activeStoreId) return null
    const hit = (meStoresData?.stores ?? []).find(
      r => String(r.id) === activeStoreId
    )
    const name = typeof hit?.name === 'string' ? hit.name.trim() : ''
    return name || null
  }, [session?.user?.activeStoreId, meStoresData?.stores])

  if (!fetchEnabled) return null
  if (!contributionSettings.enabled) return null
  if (data && !data.enabled) return null

  const categoryRows = CONTRIBUTION_POINT_CATEGORIES.map(category => ({
    category,
    label: CONTRIBUTION_CATEGORY_LABELS[category],
    points: data?.byCategory[category] ?? 0
  })).filter(row => row.points > 0)

  return (
    <>
      <Card
        variant="outlined"
        sx={{ borderRadius: 2 }}
        data-tour="store-hub-contribution-points"
      >
        <CardHeader
          avatar={<WorkspacePremium color="secondary" />}
          title="Puntos de contribución"
          subheader={
            activeStoreName
              ? `Tu reputación en ${activeStoreName}`
              : 'Reputación por participar en esta tienda'
          }
          slotProps={{ title: { variant: 'h6' } }}
          action={
            <IconButton
              aria-label="Información sobre puntos de contribución"
              onClick={() => setInfoOpen(true)}
              size="small"
              color="secondary"
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
                No se pudieron cargar tus puntos de contribución.
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
                      theme.palette.secondary.main,
                      theme.palette.mode === 'dark' ? 0.14 : 0.08
                    ),
                  border: '1px solid',
                  borderColor: theme => alpha(theme.palette.secondary.main, 0.2)
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5, display: 'block', mb: 0.5 }}
                >
                  Este mes · {data.monthLabel}
                </Typography>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.15,
                    mb: 0.25
                  }}
                >
                  {data.monthPoints.toLocaleString('es-CL')}
                  <Typography
                    component="span"
                    variant="h5"
                    color="text.secondary"
                    sx={{ ml: 1, fontWeight: 600 }}
                  >
                    puntos
                  </Typography>
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.75 }}
                >
                  Total acumulado:{' '}
                  <Box
                    component="strong"
                    sx={{
                      color: 'text.primary',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {data.totalPoints.toLocaleString('es-CL')} pts
                  </Box>
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  Nivel actual: <strong>{currentTierLabel(data.tier)}</strong>
                  {nextTierHint(data.tier)
                    ? ` · ${nextTierHint(data.tier)}`
                    : ''}
                </Typography>
                <ContributionTierProgressBar tier={data.tier} />
              </Box>

              {categoryRows.length > 0 ? (
                <>
                  <Divider flexItem />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Cómo ganaste puntos
                    </Typography>
                    <Stack spacing={0.75}>
                      {categoryRows.map(row => (
                        <Stack
                          key={row.category}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="baseline"
                        >
                          <Typography variant="body2" color="text.secondary">
                            {row.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          >
                            {row.points.toLocaleString('es-CL')} pts
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Preinscríbete en torneos oficiales (+1 pt), suma más al cerrar
                  el evento (+10 pts), reporta mazo y bitácora, o completa el
                  ciclo de un correo en tienda para empezar a sumar puntos.
                </Typography>
              )}
              {leaderboardMonth?.enabled ||
              leaderboardAll?.enabled ||
              leaderboardMonthPending ||
              leaderboardAllPending ? (
                <>
                  <Divider flexItem />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Top contribuidores
                    </Typography>
                    <Tabs
                      value={leaderboardTab}
                      onChange={(_, value: LeaderboardTab) =>
                        setLeaderboardTab(value)
                      }
                      variant="fullWidth"
                      sx={{
                        minHeight: 40,
                        mb: 1.5,
                        borderBottom: 1,
                        borderColor: theme =>
                          alpha(theme.palette.text.primary, 0.08),
                        '& .MuiTab-root': {
                          minHeight: 40,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }
                      }}
                    >
                      <Tab
                        value="month"
                        label={
                          leaderboardMonth?.periodLabel
                            ? leaderboardMonth.periodLabel
                            : data.monthLabel
                        }
                      />
                      <Tab value="all" label="Histórico" />
                    </Tabs>
                    {leaderboardTab === 'month' ? (
                      <ContributionLeaderboardPanel
                        rows={leaderboardMonth?.rows ?? []}
                        isPending={leaderboardMonthPending}
                        isError={leaderboardMonthError}
                        emptyMessage="Aún no hay contribuidores este mes."
                      />
                    ) : (
                      <ContributionLeaderboardPanel
                        rows={leaderboardAll?.rows ?? []}
                        isPending={leaderboardAllPending}
                        isError={leaderboardAllError}
                        emptyMessage="Aún no hay contribuidores en el histórico."
                      />
                    )}
                  </Box>
                </>
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
        <DialogTitle>Puntos de contribución</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Arriba ves tus puntos del <strong>mes en curso</strong> (calendario
            Chile). El <strong>total acumulado</strong> y tu nivel no se
            reinician. El ranking del mes se renueva cada mes; el tab{' '}
            <strong>Histórico</strong> ordena por puntos de siempre.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Reconocen tu participación en la comunidad de la tienda:
            preinscripción web y cierre de torneos oficiales, reportes de mazo y
            bitácora, correos recibidos o retirados en tienda y otras acciones
            configuradas. No se canjean como crédito de tienda.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Los reportes de torneo solo suman en{' '}
            <strong>torneos oficiales</strong> de la tienda, no en torneos
            custom personales.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Niveles: {contributionSettings.tierLabels.join(' → ')} (
            {contributionSettings.tierThresholds
              .map(n => n.toLocaleString('es-CL'))
              .join(' / ')}{' '}
            pts).
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences?.hideBadge === true}
                disabled={updatePreferences.isPending}
                onChange={(_, checked) => {
                  updatePreferences.mutate(checked)
                }}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Ocultar mi insignia de contribución en meta de torneo y ranking
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
