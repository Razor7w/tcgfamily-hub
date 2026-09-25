'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  EmojiEventsOutlined,
  InfoOutlined,
  LocalOfferOutlined
} from '@mui/icons-material'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMe, meProfileQueryKey, type MeProfile } from '@/hooks/useMe'
import { useMeStores } from '@/hooks/useMeStores'
import { useMyTournamentPoints } from '@/hooks/useMyTournamentPoints'
import {
  useMyTournamentPointsCoupons,
  type MyTournamentPointsCoupon
} from '@/hooks/useMyTournamentPointsCoupons'
import {
  formatStorePointsClpEquivalent,
  storePointClpEquivalenceLabel
} from '@/lib/store-points-clp'
import {
  isTournamentPointsRedeemStep,
  normalizeStorePointsAmount
} from '@/lib/store-points-amount'
import { validatePopidOptional } from '@/lib/rut-chile'
import { onlyDigits } from '@/lib/rut-input'
import { TOURNAMENT_POINTS_COUPON_REASON_MAX } from '@/lib/tournament-points-coupon-constants'

type StoreHubTournamentPointsCardProps = {
  enabled?: boolean
  /** `hub`: resumen + enlace a canjear. `page`: flujo completo de canje. */
  variant?: 'hub' | 'page'
}

type CouponResult = MyTournamentPointsCoupon

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

function formatPoints(n: number): string {
  return normalizeStorePointsAmount(n).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })
}

export default function StoreHubTournamentPointsCard({
  enabled: fetchEnabled = true,
  variant = 'hub'
}: StoreHubTournamentPointsCardProps) {
  const isPage = variant === 'page'
  const queryClient = useQueryClient()
  const { data: session, update: updateSession } = useSession()
  const { data: meProfile } = useMe()
  const { data: meStoresData } = useMeStores()
  const { storeCredit } = useDashboardModulesFromLayout()
  const tournamentPointsLabel = storeCredit.tournamentPointsLabel
  const { data, isPending, isError, refetch, isFetching } =
    useMyTournamentPoints({ enabled: fetchEnabled })
  const { data: couponsData, refetch: refetchCoupons } =
    useMyTournamentPointsCoupons({ enabled: fetchEnabled && isPage })
  const [infoOpen, setInfoOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const [redeemReason, setRedeemReason] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<CouponResult | null>(null)
  const [popidDraft, setPopidDraft] = useState('')
  const [savingPopid, setSavingPopid] = useState(false)
  const [popidError, setPopidError] = useState<string | null>(null)
  const [popidSavedMsg, setPopidSavedMsg] = useState<string | null>(null)

  const hasPopid = Boolean(
    meProfile?.popid?.trim() || session?.user?.popid?.trim()
  )
  const needsPopid = !hasPopid

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

  const redeemedCoupons = couponsData?.coupons ?? []

  const balance = normalizeStorePointsAmount(data?.totalPoints ?? 0)
  const redeemAmount = normalizeStorePointsAmount(redeemPoints)
  const reasonOk =
    redeemReason.trim().length >= 3 &&
    redeemReason.trim().length <= TOURNAMENT_POINTS_COUPON_REASON_MAX
  const amountOk =
    isTournamentPointsRedeemStep(redeemAmount) && redeemAmount <= balance
  const canSubmit = amountOk && reasonOk && !redeeming && balance >= 0.5

  const popidLiveError = useMemo(() => {
    const t = popidDraft.trim()
    if (!t) return null
    return validatePopidOptional(popidDraft)
  }, [popidDraft])

  const canSavePopid =
    !savingPopid &&
    popidDraft.trim().length > 0 &&
    validatePopidOptional(popidDraft) === null

  const openRedeem = () => {
    setRedeemError(null)
    setRedeemPoints('')
    setRedeemReason('')
    setRedeemOpen(true)
  }

  const handleSavePopid = async () => {
    setPopidError(null)
    setPopidSavedMsg(null)
    const trimmed = popidDraft.trim()
    if (!trimmed) {
      setPopidError('El Pop ID es obligatorio para ver tus puntos.')
      return
    }
    const err = validatePopidOptional(trimmed)
    if (err) {
      setPopidError(err)
      return
    }
    setSavingPopid(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popid: trimmed })
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        popid?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudo guardar el Pop ID'
        )
      }
      const saved = (json.popid ?? trimmed).trim()
      const uid = session?.user?.id ? String(session.user.id) : ''
      if (uid) {
        queryClient.setQueryData<MeProfile>(meProfileQueryKey(uid), prev =>
          prev ? { ...prev, popid: saved } : prev
        )
      }
      await updateSession({ popid: saved })
      await queryClient.invalidateQueries({
        queryKey: ['me', 'tournament-points']
      })
      void refetch()
      setPopidDraft('')
      setPopidSavedMsg('Pop ID guardado. Ya puedes ver tus puntos vinculados.')
    } catch (e) {
      setPopidError(
        e instanceof Error ? e.message : 'No se pudo guardar el Pop ID'
      )
    } finally {
      setSavingPopid(false)
    }
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
      void refetchCoupons()
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : 'Error al canjear')
    } finally {
      setRedeeming(false)
    }
  }

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
              aria-label={`Información sobre ${tournamentPointsLabel}`}
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
              {needsPopid ? (
                <Box>
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    Sin Pop ID en tu cuenta no podrás ver tus{' '}
                    {tournamentPointsLabel}. Los puntos de torneo se vinculan
                    por Pop ID: si no lo asignas, nunca aparecerán aquí aunque
                    hayas jugado.
                  </Alert>
                  {popidSavedMsg ? (
                    <Alert
                      severity="success"
                      sx={{ mb: 1.5 }}
                      onClose={() => setPopidSavedMsg(null)}
                    >
                      {popidSavedMsg}
                    </Alert>
                  ) : null}
                  <Stack
                    component="form"
                    spacing={1.25}
                    onSubmit={e => {
                      e.preventDefault()
                      void handleSavePopid()
                    }}
                  >
                    <TextField
                      label="Tu Pop ID"
                      name="popid"
                      value={popidDraft}
                      onChange={e => {
                        setPopidDraft(onlyDigits(e.target.value, 64))
                        setPopidError(null)
                      }}
                      size="small"
                      fullWidth
                      required
                      disabled={savingPopid}
                      error={Boolean(popidError) || Boolean(popidLiveError)}
                      helperText={
                        popidError ??
                        popidLiveError ??
                        'Solo números. Es el ID de jugador de Play! Pokémon.'
                      }
                      inputProps={{
                        maxLength: 64,
                        inputMode: 'numeric',
                        pattern: '[0-9]*'
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      disabled={!canSavePopid}
                      sx={{
                        alignSelf: 'flex-start',
                        textTransform: 'none',
                        fontWeight: 700
                      }}
                    >
                      {savingPopid ? 'Guardando…' : 'Guardar Pop ID'}
                    </Button>
                  </Stack>
                </Box>
              ) : null}

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
                  {formatPoints(data.totalPoints)}
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
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mt: 1.75 }}
                >
                  {isPage ? (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<LocalOfferOutlined />}
                      onClick={openRedeem}
                      disabled={balance < 0.5}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Generar cupón de canje
                    </Button>
                  ) : (
                    <Button
                      component={Link}
                      href="/dashboard/canjear"
                      variant="contained"
                      size="small"
                      startIcon={<LocalOfferOutlined />}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Ver mis puntos
                    </Button>
                  )}
                  {activeStoreSlug ? (
                    <Button
                      component={Link}
                      href={`/tiendas/${encodeURIComponent(activeStoreSlug)}/puntos-torneo`}
                      size="small"
                      sx={{ textTransform: 'none' }}
                    >
                      Ver ranking público
                    </Button>
                  ) : null}
                </Stack>
                {isPage ? (
                  balance < 0.5 ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      Necesitas al menos 0.5 puntos para generar un cupón.
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      Canje en múltiplos de 0.5. Al crear el cupón se descuenta
                      el saldo de inmediato.
                    </Typography>
                  )
                ) : (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Genera un cupón y muéstralo en tienda dentro de 24 horas.
                  </Typography>
                )}
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
                      · <strong>{formatPoints(lastEntry.points)} pts</strong>
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no tienes puntos asignados por torneos en esta tienda.
                </Typography>
              )}

              {isPage && recent.length > 1 ? (
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
                        {formatPoints(entry.points)} pts
                        {entry.place > 0 ? ` (${entry.place}º)` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {isPage && redeemedCoupons.length > 0 ? (
                <>
                  <Divider flexItem />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Cupones canjeados
                    </Typography>
                    <Stack spacing={0.75}>
                      {redeemedCoupons.map(c => (
                        <Box
                          key={c.id}
                          component="button"
                          type="button"
                          onClick={() => setCoupon(c)}
                          sx={{
                            all: 'unset',
                            cursor: 'pointer',
                            display: 'block',
                            width: '100%',
                            borderRadius: 1,
                            px: 0.5,
                            py: 0.25,
                            '&:hover': {
                              bgcolor: theme =>
                                alpha(theme.palette.primary.main, 0.06)
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: 2
                            }
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                                color: 'text.primary'
                              }}
                            >
                              {c.code}
                            </Box>
                            {' · '}
                            {formatEventDate(c.createdAt)}
                            {' · '}
                            <strong>
                              {formatStorePointsClpEquivalent(
                                c.points,
                                activeStoreSlug
                              )}
                            </strong>
                            {c.reason.trim() ? ` · ${c.reason.trim()}` : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.75 }}
                    >
                      Toca un cupón para ver el detalle y mostrarlo en tienda.
                    </Typography>
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
        <DialogTitle>{tournamentPointsLabel}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            La tienda puede repartir puntos tras un torneo cerrado según la
            mitad superior de la clasificación. Para verlos en tu cuenta debes
            tener tu Pop ID asignado (es el identificador de Play! Pokémon).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Puedes generar un cupón de canje (múltiplos de 0.5). El saldo se
            descuenta al crear el cupón y tienes 24 horas para mostrarlo en
            tienda.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {isPage ? (
        <>
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
                    {formatPoints(balance)}{' '}
                    {tournamentPointsLabel.toLowerCase()}
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
                      e.target.value.slice(
                        0,
                        TOURNAMENT_POINTS_COUPON_REASON_MAX
                      )
                    )
                  }
                  multiline
                  minRows={2}
                  helperText={`${redeemReason.trim().length}/${TOURNAMENT_POINTS_COUPON_REASON_MAX}`}
                  size="small"
                  fullWidth
                  disabled={redeeming}
                  inputProps={{
                    maxLength: TOURNAMENT_POINTS_COUPON_REASON_MAX
                  }}
                />
                <Alert severity="warning">
                  Al generar el cupón se descuenta el saldo de inmediato. Debes
                  mostrarlo en la tienda dentro de las 24 horas siguientes.
                </Alert>
                {redeemError ? (
                  <Alert severity="error">{redeemError}</Alert>
                ) : null}
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
                    fecha. Pasado ese plazo el cupón no debería aceptarse en
                    tienda.
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
                    Sácale captura y muéstralo en la tienda a tiempo. El saldo
                    ya fue descontado de tus{' '}
                    {tournamentPointsLabel.toLowerCase()}.
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
      ) : null}
    </>
  )
}
