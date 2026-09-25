'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'
import { useMyTournamentPoints } from '@/hooks/useMyTournamentPoints'
import {
  isTournamentPointsRedeemStep,
  normalizeStorePointsAmount
} from '@/lib/store-points-amount'
import {
  formatStorePointsClpEquivalent,
  storePointClpEquivalenceLabel
} from '@/lib/store-points-clp'
import { TOURNAMENT_POINTS_COUPON_REASON_MAX } from '@/lib/tournament-points-coupon-constants'

type CouponResult = {
  id: string
  code: string
  points: number
  reason: string
  createdAt: string
  expiresAt: string
  validForHours: number
}

function formatPoints(n: number): string {
  return normalizeStorePointsAmount(n).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })
}

function formatCouponDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Card de Inicio: saldo de puntos por torneo + canje (modal) y enlace a la página.
 * Solo se muestra si la tienda activa tiene el módulo habilitado y el jugador tiene saldo.
 */
export default function DashboardHomeTournamentPointsCard() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { data: meStoresData } = useMeStores()
  const { visibility, storeCredit } = useDashboardModulesFromLayout()
  const featureOn =
    visibility.storePoints && storeCredit.tournamentPointsEnabled
  const label = storeCredit.tournamentPointsLabel

  const { data, isPending, isError, refetch } = useMyTournamentPoints({
    enabled: featureOn
  })

  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const [redeemReason, setRedeemReason] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<CouponResult | null>(null)

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

  const balance = normalizeStorePointsAmount(data?.totalPoints ?? 0)
  const redeemAmount = normalizeStorePointsAmount(redeemPoints)
  const reasonOk =
    redeemReason.trim().length >= 3 &&
    redeemReason.trim().length <= TOURNAMENT_POINTS_COUPON_REASON_MAX
  const amountOk =
    isTournamentPointsRedeemStep(redeemAmount) && redeemAmount <= balance
  const canSubmit = amountOk && reasonOk && !redeeming && balance >= 0.5

  const openRedeem = () => {
    setRedeemError(null)
    setRedeemPoints('')
    setRedeemReason('')
    setRedeemOpen(true)
  }

  const handleCreateCoupon = async () => {
    setRedeemError(null)
    if (!canSubmit) return
    setRedeeming(true)
    try {
      const res = await fetch('/api/me/tournament-points/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: redeemAmount,
          reason: redeemReason.trim()
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudo generar el cupón'
        )
      }
      const created = json.coupon as CouponResult
      setCoupon(created)
      setRedeemOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ['me', 'tournament-points']
      })
      void refetch()
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : 'Error al canjear')
    } finally {
      setRedeeming(false)
    }
  }

  if (!featureOn || isPending || isError || !data?.enabled) return null
  if (balance <= 0) return null

  const clp = formatStorePointsClpEquivalent(balance, activeStoreSlug)
  const rateLabel = storePointClpEquivalenceLabel(activeStoreSlug)

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          borderColor: t => alpha(t.palette.primary.main, 0.22)
        }}
        data-tour="dashboard-card-tournament-points"
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 2.5 },
            '&:last-child': { pb: { xs: 2, sm: 2.5 } }
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.75} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: t => alpha(t.palette.primary.main, 0.12),
                  color: 'primary.main'
                }}
              >
                <EmojiEventsOutlined />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5, display: 'block', lineHeight: 1.2 }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h4"
                  component="p"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.15,
                    mt: 0.25
                  }}
                >
                  {formatPoints(balance)}
                  <Typography
                    component="span"
                    variant="h6"
                    color="text.secondary"
                    sx={{ ml: 0.75, fontWeight: 600 }}
                  >
                    pts
                  </Typography>
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Equivale a {clp} ({rateLabel}).
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<LocalOfferOutlined />}
                onClick={openRedeem}
                disabled={balance < 0.5}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Canjear
              </Button>
              <Button
                component={Link}
                href="/dashboard/canjear"
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Ver mis puntos
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={redeemOpen}
        onClose={() => (!redeeming ? setRedeemOpen(false) : undefined)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generar cupón de canje</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Saldo disponible:{' '}
              <strong>
                {formatPoints(balance)} {label.toLowerCase()}
              </strong>
              . Solo múltiplos de 0.5.
            </Typography>
            <TextField
              label="Puntos a canjear"
              type="number"
              value={redeemPoints}
              onChange={e => setRedeemPoints(e.target.value)}
              inputProps={{ min: 0.5, max: balance, step: 0.5 }}
              helperText={
                redeemPoints && !isTournamentPointsRedeemStep(redeemAmount)
                  ? 'Debe ser múltiplo de 0.5 (ej. 0.5, 1, 2.5).'
                  : redeemAmount > balance
                    ? 'Supera tu saldo disponible.'
                    : 'Ejemplos: 0.5, 1, 1.5, 2.5…'
              }
              error={
                Boolean(redeemPoints) &&
                (!isTournamentPointsRedeemStep(redeemAmount) ||
                  redeemAmount > balance)
              }
              size="small"
              fullWidth
              disabled={redeeming}
            />
            <TextField
              label="Razón del canje"
              placeholder="Ej. cartas (singles), bebida u otros"
              value={redeemReason}
              onChange={e =>
                setRedeemReason(
                  e.target.value.slice(0, TOURNAMENT_POINTS_COUPON_REASON_MAX)
                )
              }
              multiline
              minRows={2}
              helperText={`${redeemReason.trim().length}/${TOURNAMENT_POINTS_COUPON_REASON_MAX}`}
              size="small"
              fullWidth
              disabled={redeeming}
              inputProps={{ maxLength: TOURNAMENT_POINTS_COUPON_REASON_MAX }}
            />
            <Alert severity="warning">
              Al generar el cupón se descuenta el saldo de inmediato. Debes
              mostrarlo en la tienda dentro de las 24 horas siguientes.
            </Alert>
            {redeemError ? <Alert severity="error">{redeemError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemOpen(false)} disabled={redeeming}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreateCoupon()}
            disabled={!canSubmit}
          >
            {redeeming ? 'Generando…' : 'Crear cupón'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(coupon)}
        onClose={() => setCoupon(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cupón de canje</DialogTitle>
        <DialogContent>
          {coupon ? (
            <Stack spacing={2.5} alignItems="center" sx={{ pt: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'primary.main'
                }}
              >
                Generado
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textAlign: 'center',
                  fontSize: { xs: '1.45rem', sm: '1.85rem' },
                  lineHeight: 1.2,
                  textTransform: 'capitalize'
                }}
              >
                {formatCouponDate(coupon.createdAt)}
              </Typography>
              <Alert severity="error" sx={{ width: '100%' }}>
                El canje debe hacerse como máximo 24 horas después de esta
                fecha. Pasado ese plazo el cupón no debería aceptarse en tienda.
              </Alert>
              <Box
                sx={t => ({
                  width: '100%',
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px dashed ${alpha(t.palette.primary.main, 0.45)}`,
                  bgcolor: alpha(t.palette.primary.main, 0.06),
                  textAlign: 'center'
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, letterSpacing: '0.08em' }}
                >
                  CÓDIGO
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.04em',
                    mt: 0.5,
                    wordBreak: 'break-all'
                  }}
                >
                  {coupon.code}
                </Typography>
                <Typography
                  sx={{ mt: 1.5, fontWeight: 800, fontSize: '1.25rem' }}
                >
                  {formatStorePointsClpEquivalent(
                    coupon.points,
                    activeStoreSlug
                  )}{' '}
                  de descuento
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  ({formatPoints(coupon.points)} pts)
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {coupon.reason}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                Sácale captura y muéstralo en la tienda a tiempo. El saldo ya
                fue descontado de tus {label.toLowerCase()}.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoupon(null)} variant="contained">
            Listo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
