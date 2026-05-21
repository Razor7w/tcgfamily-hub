'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ChevronRight from '@mui/icons-material/ChevronRight'
import MarkunreadMailboxOutlinedIcon from '@mui/icons-material/MarkunreadMailboxOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha, keyframes } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import ButtonBarCode from '@/components/molecule/ButtonBarCode'
import { useMyMails, type Mail } from '@/hooks/useMails'
import {
  isMailPendingStoreReceipt,
  isMailWaitingForPickup
} from '@/lib/mail-inbox'
import {
  getElapsedCalendarDaysSince,
  getMailStoreWaitDays,
  toneForStoreWaitDays,
  type StoreWaitTone
} from '@/lib/mail-store-days'

const MAIL_HOME_LIMIT = 24
const VISIBLE_ROWS = 5

type MailHomeTab = 'pickup' | 'pending'

function storeKeyForMail(mail: Mail): string {
  const s = mail.store
  if (s?.id) return s.id
  if (s?.slug) return s.slug
  return 'unknown'
}

function storeLabelForMail(mail: Mail): string {
  const name = mail.store?.name?.trim()
  if (name) return name
  return 'Tienda'
}

function waitToneColor(tone: StoreWaitTone): string {
  if (tone === 'green') return 'success.main'
  if (tone === 'yellow') return 'warning.main'
  if (tone === 'orange') return 'warning.dark'
  return 'error.main'
}

function compactWaitLabel(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return '1d'
  return `${days}d`
}

function compactRegisteredLabel(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return '1d'
  return `${days}d`
}

type FlatRow = {
  mail: Mail
  storeKey: string
  storeLabel: string
  showStore: boolean
}

function buildFlatRows(mails: Mail[], sortByReceived: boolean): FlatRow[] {
  const sorted = [...mails].sort((a, b) => {
    const storeCmp = storeLabelForMail(a).localeCompare(
      storeLabelForMail(b),
      'es'
    )
    if (storeCmp !== 0) return storeCmp
    const ta = sortByReceived
      ? (a.receivedInStoreAt ?? a.updatedAt)
      : a.createdAt
    const tb = sortByReceived
      ? (b.receivedInStoreAt ?? b.updatedAt)
      : b.createdAt
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  let prevStore = ''
  const rows: FlatRow[] = []
  for (const mail of sorted) {
    const storeKey = storeKeyForMail(mail)
    const storeLabel = storeLabelForMail(mail)
    const showStore = storeKey !== prevStore
    prevStore = storeKey
    rows.push({ mail, storeKey, storeLabel, showStore })
  }
  return rows
}

function TabCount({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null
  return (
    <Box
      component="span"
      sx={{
        ml: 0.5,
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 9,
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: '0.6875rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        bgcolor: t =>
          active
            ? alpha(t.palette.warning.main, 0.2)
            : alpha(t.palette.text.primary, 0.08),
        color: active ? 'warning.dark' : 'text.secondary'
      }}
    >
      {count}
    </Box>
  )
}

const statusPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.55; }
`

export default function DashboardInStoreMailsCard() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const { data, isPending, isError, error, refetch } = useMyMails({
    pendingOnly: true,
    allStores: true,
    limit: MAIL_HOME_LIMIT
  })

  const pickup = useMemo(
    () =>
      (data?.mails ?? []).filter(m => isMailWaitingForPickup(m, currentUserId)),
    [data?.mails, currentUserId]
  )

  const pendingStore = useMemo(
    () =>
      (data?.mails ?? []).filter(m =>
        isMailPendingStoreReceipt(m, currentUserId)
      ),
    [data?.mails, currentUserId]
  )

  const autoTab = useMemo((): MailHomeTab => {
    if (pickup.length === 0 && pendingStore.length > 0) return 'pending'
    return 'pickup'
  }, [pickup.length, pendingStore.length])

  const [userTab, setUserTab] = useState<MailHomeTab | null>(null)
  const tab = userTab ?? autoTab

  const showTabs = pickup.length > 0 && pendingStore.length > 0
  const effectiveTab: MailHomeTab = showTabs
    ? tab
    : pickup.length > 0
      ? 'pickup'
      : 'pending'

  const activeMails = effectiveTab === 'pickup' ? pickup : pendingStore
  const flatRows = useMemo(
    () => buildFlatRows(activeMails, effectiveTab === 'pickup'),
    [activeMails, effectiveTab]
  )

  const storeCount = useMemo(
    () => new Set(flatRows.map(r => r.storeKey)).size,
    [flatRows]
  )

  const hasAny = pickup.length > 0 || pendingStore.length > 0

  if (isPending) {
    return (
      <Box
        component="section"
        aria-label="Cargando correos"
        sx={{
          borderRadius: 2.5,
          py: 2.5,
          px: 2,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Box
        component="section"
        sx={{
          borderRadius: 2.5,
          p: 2,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: 'background.paper'
        }}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {error instanceof Error
              ? error.message
              : 'No se pudieron cargar los correos'}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Reintentar
          </Button>
        </Stack>
      </Box>
    )
  }

  if (!hasAny) {
    return null
  }

  const mailCount = activeMails.length
  const visible = flatRows.slice(0, VISIBLE_ROWS)
  const hiddenCount = flatRows.length - visible.length
  const accent =
    effectiveTab === 'pickup' ? 'warning' : ('primary' as 'warning' | 'primary')

  return (
    <Box
      component="section"
      aria-labelledby="dashboard-in-store-mails-heading"
      data-tour="dashboard-in-store-mails"
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: t =>
          alpha(
            effectiveTab === 'pickup'
              ? t.palette.warning.main
              : t.palette.primary.main,
            0.22
          ),
        bgcolor: 'background.paper',
        boxShadow: t =>
          t.palette.mode === 'dark'
            ? 'none'
            : `0 12px 28px -16px ${alpha(
                effectiveTab === 'pickup'
                  ? t.palette.warning.main
                  : t.palette.primary.main,
                0.16
              )}`
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.25, sm: 1.5 },
          pb: 0.75,
          background: t =>
            `linear-gradient(90deg, ${alpha(
              effectiveTab === 'pickup'
                ? t.palette.warning.main
                : t.palette.primary.main,
              t.palette.mode === 'dark' ? 0.1 : 0.07
            )} 0%, transparent 72%)`
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: t =>
              alpha(
                effectiveTab === 'pickup'
                  ? t.palette.warning.main
                  : t.palette.primary.main,
                0.14
              ),
            color: effectiveTab === 'pickup' ? 'warning.dark' : 'primary.main'
          }}
        >
          <MarkunreadMailboxOutlinedIcon sx={{ fontSize: 20 }} aria-hidden />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {effectiveTab === 'pickup' ? (
              <Box
                aria-hidden
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                  flexShrink: 0,
                  animation: `${statusPulse} 2.4s ease-in-out infinite`
                }}
              />
            ) : null}
            <Typography
              id="dashboard-in-store-mails-heading"
              variant="subtitle2"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              {!showTabs
                ? effectiveTab === 'pickup'
                  ? 'Listos para retirar'
                  : 'Sin ingreso en tienda'
                : 'Correos'}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.15, fontWeight: 500 }}
          >
            {effectiveTab === 'pickup'
              ? mailCount === 1
                ? '1 listo para retirar'
                : `${mailCount} listos para retirar`
              : mailCount === 1
                ? '1 sin ingreso en tienda'
                : `${mailCount} sin ingreso en tienda`}
            {storeCount > 1
              ? ` · ${storeCount} tiendas`
              : flatRows[0]
                ? ` · ${flatRows[0].storeLabel}`
                : ''}
          </Typography>
        </Box>
      </Stack>

      {showTabs ? (
        <Tabs
          value={tab}
          onChange={(_e, v) => setUserTab(v as MailHomeTab)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            px: { xs: 1, sm: 1.5 },
            borderBottom: '1px solid',
            borderColor: t => alpha(t.palette.divider, 0.9),
            '& .MuiTabs-indicator': {
              height: 2.5,
              borderRadius: '2px 2px 0 0'
            },
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.75,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '-0.01em',
              '&.Mui-selected': { fontWeight: 800 }
            }
          }}
        >
          <Tab
            value="pickup"
            label={
              <Stack direction="row" alignItems="center" component="span">
                En tienda
                <TabCount count={pickup.length} active={tab === 'pickup'} />
              </Stack>
            }
          />
          <Tab
            value="pending"
            label={
              <Stack direction="row" alignItems="center" component="span">
                Sin ingreso
                <TabCount
                  count={pendingStore.length}
                  active={tab === 'pending'}
                />
              </Stack>
            }
          />
        </Tabs>
      ) : (
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: t => alpha(t.palette.divider, 0.9)
          }}
        />
      )}

      {mailCount === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 2.5, lineHeight: 1.55 }}
        >
          {effectiveTab === 'pickup'
            ? 'No tienes correos listos para retirar.'
            : 'No tienes correos pendientes de ingreso en tienda.'}
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            '& > li:not(:last-child)': {
              borderBottom: '1px solid',
              borderColor: t => alpha(t.palette.divider, 0.85)
            }
          }}
        >
          {visible.map(({ mail, storeLabel, showStore }) => {
            const code = mail.code ?? mail._id
            let metaLabel: string | null = null
            let metaColor = 'text.secondary'

            if (effectiveTab === 'pickup') {
              const waitDays = getMailStoreWaitDays(mail)
              const waitTone =
                waitDays != null ? toneForStoreWaitDays(waitDays) : null
              if (waitDays != null && waitTone) {
                metaLabel = compactWaitLabel(waitDays)
                metaColor = waitToneColor(waitTone)
              }
            } else {
              const regDays = getElapsedCalendarDaysSince(mail.createdAt)
              metaLabel = compactRegisteredLabel(regDays)
              metaColor = 'text.secondary'
            }

            return (
              <Box
                component="li"
                key={mail._id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(4.5rem, 28%) minmax(0, 1fr) auto auto',
                  columnGap: { xs: 0.75, sm: 1 },
                  alignItems: 'center',
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.85, sm: 0.95 },
                  minHeight: 44,
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    bgcolor: t => alpha(t.palette.primary.main, 0.04)
                  },
                  '&:active': {
                    bgcolor: t => alpha(t.palette.primary.main, 0.07)
                  }
                }}
              >
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: showStore ? 'text.primary' : 'text.disabled',
                    opacity: showStore ? 1 : 0
                  }}
                  aria-hidden={!showStore}
                >
                  {storeLabel}
                </Typography>

                <Typography
                  variant="body2"
                  component="span"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    minWidth: 0
                  }}
                >
                  {code}
                </Typography>

                {metaLabel ? (
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: metaColor,
                      px: 0.5,
                      flexShrink: 0
                    }}
                    title={
                      effectiveTab === 'pickup'
                        ? metaLabel === 'hoy'
                          ? 'Ingresó hoy a tienda'
                          : metaLabel === '1d'
                            ? '1 día en tienda'
                            : `${metaLabel.slice(0, -1)} días en tienda`
                        : 'Días desde el registro'
                    }
                  >
                    {metaLabel}
                  </Typography>
                ) : (
                  <Box component="span" aria-hidden />
                )}

                <ButtonBarCode id={code} />
              </Box>
            )
          })}
        </Box>
      )}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderTop: '1px solid',
          borderColor: t => alpha(t.palette.divider, 0.85),
          bgcolor: t =>
            alpha(
              effectiveTab === 'pickup'
                ? t.palette.warning.main
                : t.palette.primary.main,
              0.04
            )
        }}
      >
        {hiddenCount > 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            +{hiddenCount} más
          </Typography>
        ) : (
          <Box />
        )}
        <Button
          component={Link}
          href="/dashboard/mail"
          size="small"
          color={accent}
          endIcon={<ChevronRight sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            minWidth: 0,
            py: 0.5,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:active': { transform: 'scale(0.98)' }
          }}
        >
          Ver correos
        </Button>
      </Stack>
    </Box>
  )
}
