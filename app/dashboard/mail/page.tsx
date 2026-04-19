'use client'

import {
  useState,
  useMemo,
  forwardRef,
  type ReactElement,
  type ForwardedRef
} from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Paper from '@mui/material/Paper'
import Pagination from '@mui/material/Pagination'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MarkunreadMailboxOutlined from '@mui/icons-material/MarkunreadMailboxOutlined'
import { useMyMails } from '@/hooks/useMails'
import { alpha, Divider, Stack, useTheme } from '@mui/material'
import useMediaQuery from '@mui/material/useMediaQuery'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ButtonBarCode from '@/components/molecule/ButtonBarCode'
import RegisterMailDialog from '@/components/mails/RegisterMailDialog'
import MailFlowExplainer from '@/components/mails/MailFlowExplainer'
import { getMailStatusChip } from '@/lib/mail-status'
import { normalizeMailCodeForSearch } from '@/lib/mail-code-search'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import Snackbar from '@mui/material/Snackbar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useDeleteMail, type Mail } from '@/hooks/useMails'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

/** Correos por página en la lista en tarjetas. */
const MAIL_PAGE_SIZE = 8

function getElapsedDays(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.floor((now - created) / (24 * 60 * 60 * 1000))
}

function formatElapsed(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

function getElapsedBadge(days: number): {
  label: string
  color: 'success' | 'warning' | 'error'
} {
  const label = formatElapsed(days)
  if (days <= 7) return { label, color: 'success' }
  if (days <= 14) return { label, color: 'warning' }
  return { label, color: 'error' }
}

function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

type FilterUser = { id: string; name: string; rut: string }

function filterUserLabel(u: FilterUser) {
  return `${u.name || 'Sin nombre'} (${u.rut || '-'})`
}

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: ReactElement },
  ref: ForwardedRef<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

type MailFilterStatus = 'all' | 'notInStore' | 'inStore' | 'retired'

type MailFiltersPanelProps = {
  searchId: string
  setSearchId: (v: string) => void
  filterFromUser: FilterUser | null
  setFilterFromUser: (v: FilterUser | null) => void
  filterToUser: FilterUser | null
  setFilterToUser: (v: FilterUser | null) => void
  filterStatus: MailFilterStatus
  setFilterStatus: (v: MailFilterStatus) => void
  usersFromMails: FilterUser[]
}

function MailFiltersPanel({
  searchId,
  setSearchId,
  filterFromUser,
  setFilterFromUser,
  filterToUser,
  setFilterToUser,
  filterStatus,
  setFilterStatus,
  usersFromMails
}: MailFiltersPanelProps) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          size="small"
          label="Buscar por código"
          placeholder="Ej: 16-04-2026-001"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          sx={{
            minWidth: { xs: '100%', sm: 220 },
            flex: { md: '0 0 auto' }
          }}
        />
        <Autocomplete<FilterUser>
          size="small"
          options={usersFromMails}
          value={filterFromUser}
          onChange={(_, v) => setFilterFromUser(v)}
          getOptionLabel={filterUserLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          sx={{
            minWidth: { xs: '100%', sm: 260 },
            flex: { md: '1 1 200px' }
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Remitente (de)"
              placeholder="Nombre o RUT"
            />
          )}
          filterOptions={(opts, { inputValue }) => {
            const v = inputValue.trim().toLowerCase()
            if (!v) return opts
            return opts.filter(
              u =>
                u.name?.toLowerCase().includes(v) ||
                (u.rut &&
                  u.rut
                    .toLowerCase()
                    .replace(/\D/g, '')
                    .includes(v.replace(/\D/g, '')))
            )
          }}
        />
        <Autocomplete<FilterUser>
          size="small"
          options={usersFromMails}
          value={filterToUser}
          onChange={(_, v) => setFilterToUser(v)}
          getOptionLabel={filterUserLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          sx={{
            minWidth: { xs: '100%', sm: 260 },
            flex: { md: '1 1 200px' }
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Destinatario (para)"
              placeholder="Nombre o RUT"
            />
          )}
          filterOptions={(opts, { inputValue }) => {
            const v = inputValue.trim().toLowerCase()
            if (!v) return opts
            return opts.filter(
              u =>
                u.name?.toLowerCase().includes(v) ||
                (u.rut &&
                  u.rut
                    .toLowerCase()
                    .replace(/\D/g, '')
                    .includes(v.replace(/\D/g, '')))
            )
          }}
        />
      </Stack>

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.75 }}
        >
          Estado del envío
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={filterStatus}
          onChange={(_, v: MailFilterStatus | null) => {
            if (v != null) setFilterStatus(v)
          }}
          size="small"
          sx={{
            flexWrap: 'wrap',
            gap: 0.5,
            '& .MuiToggleButton-root': {
              px: 1.25,
              py: 0.5,
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="notInStore">Sin ingresar</ToggleButton>
          <ToggleButton value="inStore" color="warning">
            En tienda
          </ToggleButton>
          <ToggleButton value="retired" color="success">
            Retirado
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Stack>
  )
}

function MailDashboardDataRow({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={1.25}
      sx={{ py: 0.15 }}
    >
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          minWidth: { xs: 44, sm: 52 },
          flexShrink: 0,
          lineHeight: 1.65,
          pt: 0.1
        }}
      >
        {label}
      </Typography>
      <Typography
        component="span"
        variant="body2"
        sx={{
          fontWeight: 500,
          lineHeight: 1.55,
          wordBreak: 'break-word',
          color: 'text.primary'
        }}
      >
        {value}
      </Typography>
    </Stack>
  )
}

type MailDashboardCardProps = {
  mail: Mail
  currentUserId: string
  onRequestDelete: (id: string) => void
  deletePending: boolean
}

function MailDashboardCard({
  mail,
  currentUserId,
  onRequestDelete,
  deletePending
}: MailDashboardCardProps) {
  const theme = useTheme()
  const from = typeof mail.fromUserId === 'object' ? mail.fromUserId : null
  const to = typeof mail.toUserId === 'object' ? mail.toUserId : null
  const isEmisor =
    Boolean(currentUserId) && mailUserId(mail.fromUserId) === currentUserId
  const canDelete = isEmisor && !mail.isRecivedInStore
  const statusChip = getMailStatusChip(mail)
  const days = getElapsedDays(mail.createdAt)
  const elapsed = getElapsedBadge(days)
  const deText = from ? `${from.name ?? '-'} (${from.rut ?? '-'})` : '—'
  const paraText = to
    ? `${to.name ?? '-'} (${to.rut ?? '-'})`
    : mail.toRut
      ? `RUT: ${mail.toRut}`
      : '—'
  const codeDisplay = mail.code?.trim() || null

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition:
          'box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1), border-color 180ms ease, transform 180ms ease',
        borderColor: alpha(theme.palette.divider, 0.9),
        '&:hover': {
          borderColor: t => alpha(t.palette.primary.main, 0.38),
          boxShadow: theme.shadows[2],
          transform: 'translateY(-1px)'
        },
        '&:active': {
          transform: 'translateY(0)',
          transitionDuration: '80ms'
        }
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.25 },
            py: { xs: 1.35, sm: 1.5 },
            bgcolor: t => alpha(t.palette.primary.main, 0.05),
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={1.25}
          >
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={0.75}
              useFlexGap
              sx={{ flex: 1, minWidth: 0 }}
            >
              <Chip
                label={isEmisor ? 'Emisor' : 'Receptor'}
                size="small"
                color={isEmisor ? 'primary' : 'default'}
                variant={isEmisor ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={statusChip.label}
                color={statusChip.color}
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={elapsed.label}
                color={elapsed.color}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
            {canDelete ? (
              <>
                <Tooltip title="Eliminar (solo antes de recibir en tienda)">
                  <IconButton
                    size="medium"
                    color="error"
                    onClick={() => onRequestDelete(mail._id)}
                    disabled={deletePending}
                    aria-label="Eliminar correo"
                    sx={{
                      display: { xs: 'inline-flex', sm: 'none' },
                      flexShrink: 0,
                      border: 1,
                      borderColor: 'error.light',
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.08)
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Box
                  sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
                >
                  <Tooltip title="Eliminar (solo antes de recibir en tienda)">
                    <span>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => onRequestDelete(mail._id)}
                        disabled={deletePending}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2 }
                        }}
                      >
                        Eliminar
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </>
            ) : null}
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 2, sm: 2.25 },
            display: 'grid',
            gap: { xs: 2, md: 2.5 },
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1fr) minmax(220px, 320px)'
            },
            alignItems: 'stretch'
          }}
        >
          <Stack
            spacing={0}
            divider={
              <Divider flexItem sx={{ borderStyle: 'dashed', opacity: 0.85 }} />
            }
          >
            <MailDashboardDataRow label="De" value={deText} />
            <MailDashboardDataRow label="Para" value={paraText} />
          </Stack>

          <Paper
            variant="outlined"
            elevation={0}
            sx={{
              p: { xs: 1.75, sm: 2 },
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              bgcolor: t => alpha(t.palette.primary.main, 0.04),
              borderColor: t => alpha(t.palette.primary.main, 0.18),
              minWidth: 0
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800, letterSpacing: '0.06em' }}
            >
              Código en tienda
            </Typography>
            {codeDisplay ? (
              <Typography
                variant="body2"
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 700,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  lineHeight: 1.45,
                  wordBreak: 'break-all',
                  color: 'text.primary'
                }}
              >
                {codeDisplay}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.5 }}
              >
                Abre el código de barras para identificar el envío en el
                mostrador.
              </Typography>
            )}
            <ButtonBarCode
              id={mail.code ?? mail._id}
              trigger="button"
              fullWidth
            />
          </Paper>
        </Box>
      </CardContent>
    </Card>
  )
}

function DashboardMailPageContent() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const [registerMailOpen, setRegisterMailOpen] = useState(false)
  const deleteMail = useDeleteMail()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const [searchId, setSearchId] = useState('')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'notInStore' | 'inStore' | 'retired'
  >('all')
  const [filterFromUser, setFilterFromUser] = useState<FilterUser | null>(null)
  const [filterToUser, setFilterToUser] = useState<FilterUser | null>(null)
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)

  const theme = useTheme()
  const filtersDialogFullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const { data: mailsRes, isLoading, error } = useMyMails()
  const allMails = useMemo(() => mailsRes?.mails ?? [], [mailsRes?.mails])

  const usersFromMails = useMemo(() => {
    const map = new Map<string, FilterUser>()
    for (const m of allMails) {
      const from = m.fromUserId
      const to = m.toUserId
      const fId = mailUserId(from)
      const tId = to ? mailUserId(to) : null
      if (!map.has(fId))
        map.set(fId, {
          id: fId,
          name:
            (typeof from === 'object' ? from.name : undefined) ?? 'Sin nombre',
          rut: (typeof from === 'object' ? from.rut : undefined) ?? ''
        })
      if (to && tId && !map.has(tId))
        map.set(tId, {
          id: tId,
          name: (typeof to === 'object' ? to.name : undefined) ?? 'Sin nombre',
          rut: (typeof to === 'object' ? to.rut : undefined) ?? ''
        })
    }
    return Array.from(map.values())
  }, [allMails])

  const mails = useMemo(() => {
    let list = allMails
    const qCode = normalizeMailCodeForSearch(searchId)
    const qId = searchId.trim().toLowerCase()
    if (qCode)
      list = list.filter(
        m =>
          normalizeMailCodeForSearch(m.code ?? '').includes(qCode) ||
          m._id.toLowerCase().includes(qId)
      )
    if (filterStatus === 'retired') list = list.filter(m => m.isRecived)
    else if (filterStatus === 'inStore')
      list = list.filter(m => Boolean(m.isRecivedInStore) && !m.isRecived)
    else if (filterStatus === 'notInStore')
      list = list.filter(m => !m.isRecivedInStore && !m.isRecived)
    if (filterFromUser)
      list = list.filter(m => mailUserId(m.fromUserId) === filterFromUser.id)
    if (filterToUser)
      list = list.filter(m =>
        m.toUserId ? mailUserId(m.toUserId) === filterToUser.id : false
      )
    return list
  }, [allMails, searchId, filterStatus, filterFromUser, filterToUser])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (searchId.trim()) n += 1
    if (filterFromUser) n += 1
    if (filterToUser) n += 1
    if (filterStatus !== 'all') n += 1
    return n
  }, [searchId, filterFromUser, filterToUser, filterStatus])

  const mailListFilterKey = useMemo(
    () =>
      [
        searchId,
        filterStatus,
        filterFromUser?.id ?? '',
        filterToUser?.id ?? ''
      ].join('\0'),
    [searchId, filterStatus, filterFromUser, filterToUser]
  )

  const [listPage, setListPage] = useState(1)
  const [storedMailListFilterKey, setStoredMailListFilterKey] =
    useState(mailListFilterKey)

  const mailPageCount = Math.max(1, Math.ceil(mails.length / MAIL_PAGE_SIZE))

  if (mailListFilterKey !== storedMailListFilterKey) {
    setStoredMailListFilterKey(mailListFilterKey)
    setListPage(1)
  } else if (listPage > mailPageCount) {
    setListPage(mailPageCount)
  }

  const paginatedMails = useMemo(() => {
    const start = (listPage - 1) * MAIL_PAGE_SIZE
    return mails.slice(start, start + MAIL_PAGE_SIZE)
  }, [mails, listPage])

  const listRangeLabel = useMemo(() => {
    if (mails.length === 0) return null
    const start = (listPage - 1) * MAIL_PAGE_SIZE + 1
    const end = Math.min(listPage * MAIL_PAGE_SIZE, mails.length)
    return `${start}–${end} de ${mails.length}`
  }, [mails.length, listPage])

  const deleteTargetMail = useMemo(
    () =>
      deleteTargetId ? allMails.find(m => m._id === deleteTargetId) : undefined,
    [allMails, deleteTargetId]
  )

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return
    const id = deleteTargetId
    try {
      await deleteMail.mutateAsync(id)
      setDeleteTargetId(null)
      setSnackbar({
        open: true,
        message: 'Correo eliminado',
        severity: 'success'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error">
            Error al cargar correos: {error.message}
          </Alert>
        </Container>
      </Box>
    )
  }

  const statusFilterLabel =
    filterStatus === 'all'
      ? 'Todos los estados'
      : filterStatus === 'notInStore'
        ? 'Sin ingresar a tienda'
        : filterStatus === 'inStore'
          ? 'En tienda'
          : 'Retirado'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: t =>
          `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.25} sx={{ mb: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            useFlexGap
            sx={{ width: 1 }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: { xs: 'flex', md: 'none' },
                width: 1,
                '& > *': { flex: 1, minWidth: 0 }
              }}
            >
              <Button
                component={Link}
                href="/dashboard"
                variant="outlined"
                size="medium"
                startIcon={<ArrowBackIcon />}
              >
                Inicio
              </Button>
              <Button
                variant="contained"
                size="medium"
                onClick={() => setRegisterMailOpen(true)}
              >
                Registrar
              </Button>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              <Button
                component={Link}
                href="/dashboard"
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
              >
                Volver al inicio
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setRegisterMailOpen(true)}
              >
                Registrar correo
              </Button>
              <Button
                component={Link}
                href="/dashboard/mail/registrar-multiples"
                variant="outlined"
                size="small"
              >
                Varios a la vez
              </Button>
            </Stack>
            <Button
              component={Link}
              href="/dashboard/mail/registrar-multiples"
              variant="outlined"
              size="medium"
              fullWidth
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              Varios a la vez
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            sx={{ pt: { xs: 0, md: 0.5 } }}
          >
            <MarkunreadMailboxOutlined
              color="primary"
              sx={{ fontSize: { xs: 32, sm: 36 }, mt: 0.25 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  letterSpacing: '-0.02em'
                }}
              >
                Mis correos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: { xs: 'none', sm: 'block' },
                  lineHeight: 1.5
                }}
              >
                Envíos donde participas como emisor o receptor. Usa filtros para
                acotar la lista.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, display: { xs: 'block', sm: 'none' } }}
              >
                Lista de envíos · filtros en el botón inferior.
              </Typography>
            </Box>
          </Stack>

          <MailFlowExplainer variant="compact" denseMobileToolbar />
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2
            }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, fontWeight: 700 }}
            >
              Filtros
            </Typography>
            <MailFiltersPanel
              searchId={searchId}
              setSearchId={setSearchId}
              filterFromUser={filterFromUser}
              setFilterFromUser={setFilterFromUser}
              filterToUser={filterToUser}
              setFilterToUser={setFilterToUser}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              usersFromMails={usersFromMails}
            />
          </Paper>
        </Box>

        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<TuneIcon />}
            onClick={() => setFiltersModalOpen(true)}
            endIcon={
              activeFilterCount > 0 ? (
                <Chip
                  label={activeFilterCount}
                  size="small"
                  color="primary"
                  variant="filled"
                  sx={{ height: 22, minWidth: 22, fontWeight: 800 }}
                />
              ) : undefined
            }
            sx={{
              py: 1.25,
              borderRadius: 2,
              justifyContent: 'center',
              fontWeight: 700,
              textTransform: 'none',
              borderWidth: 2,
              '&:hover': { borderWidth: 2 }
            }}
          >
            Filtros y búsqueda
          </Button>
        </Box>

        <Dialog
          open={filtersModalOpen}
          onClose={() => setFiltersModalOpen(false)}
          fullScreen={filtersDialogFullScreen}
          maxWidth="sm"
          fullWidth
          TransitionComponent={SlideUpTransition}
          aria-labelledby="mail-filters-dialog-title"
          scroll="paper"
        >
          <DialogTitle
            id="mail-filters-dialog-title"
            sx={{
              fontWeight: 800,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            Filtros
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <MailFiltersPanel
              searchId={searchId}
              setSearchId={setSearchId}
              filterFromUser={filterFromUser}
              setFilterFromUser={setFilterFromUser}
              filterToUser={filterToUser}
              setFilterToUser={setFilterToUser}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              usersFromMails={usersFromMails}
            />
          </DialogContent>
          <DialogActions
            sx={{
              px: 2,
              pt: 2,
              pb: {
                xs: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                sm: 2
              },
              flexDirection: 'column',
              gap: 1,
              alignItems: 'stretch',
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: t => t.palette.background.default
            }}
          >
            {(searchId ||
              filterFromUser ||
              filterToUser ||
              filterStatus !== 'all') && (
              <Button
                variant="text"
                color="inherit"
                onClick={() => {
                  setSearchId('')
                  setFilterFromUser(null)
                  setFilterToUser(null)
                  setFilterStatus('all')
                }}
              >
                Limpiar todo
              </Button>
            )}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => setFiltersModalOpen(false)}
            >
              Listo
            </Button>
          </DialogActions>
        </Dialog>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {mails.length === 0
              ? 'Sin resultados con los filtros actuales'
              : `${mails.length} ${mails.length === 1 ? 'correo' : 'correos'} · ${statusFilterLabel}${
                  listRangeLabel ? ` · ${listRangeLabel}` : ''
                }`}
          </Typography>
          {(searchId ||
            filterFromUser ||
            filterToUser ||
            filterStatus !== 'all') && (
            <Button
              size="small"
              onClick={() => {
                setSearchId('')
                setFilterFromUser(null)
                setFilterToUser(null)
                setFilterStatus('all')
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </Stack>

        {mails.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: { xs: 3, sm: 4 },
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No hay correos que coincidan.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 2 }}
            >
              Prueba otra búsqueda o restablece los filtros.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRegisterMailOpen(true)}
            >
              Registrar un correo
            </Button>
          </Paper>
        ) : (
          <>
            <Stack spacing={2}>
              {paginatedMails.map(mail => (
                <MailDashboardCard
                  key={mail._id}
                  mail={mail}
                  currentUserId={currentUserId}
                  onRequestDelete={setDeleteTargetId}
                  deletePending={deleteMail.isPending}
                />
              ))}
            </Stack>
            {mailPageCount > 1 ? (
              <Stack
                direction="column"
                alignItems="center"
                spacing={1.5}
                sx={{ mt: 2 }}
              >
                <Pagination
                  count={mailPageCount}
                  page={listPage}
                  onChange={(_, p) => setListPage(p)}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPagination-ul': {
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }
                  }}
                />
              </Stack>
            ) : null}
          </>
        )}

        <RegisterMailDialog
          open={registerMailOpen}
          onClose={() => setRegisterMailOpen(false)}
        />

        <Dialog
          open={deleteTargetId !== null}
          onClose={() => !deleteMail.isPending && setDeleteTargetId(null)}
          aria-labelledby="delete-mail-dialog-title"
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle id="delete-mail-dialog-title">
            ¿Eliminar este correo?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Esta acción no se puede deshacer. Solo puedes eliminar envíos que
              aún no han sido recepcionados en tienda.
            </Typography>
            {deleteTargetMail?.code ? (
              <Typography variant="body2" sx={{ mt: 1.5 }} fontWeight={600}>
                Código: {deleteTargetMail.code}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteTargetId(null)}
              disabled={deleteMail.isPending}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteMail.isPending}
            >
              {deleteMail.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}

export default function DashboardMailPage() {
  return (
    <DashboardModuleRouteGate moduleId="mail">
      <DashboardMailPageContent />
    </DashboardModuleRouteGate>
  )
}
