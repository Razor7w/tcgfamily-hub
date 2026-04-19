'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MarkunreadMailboxOutlined from '@mui/icons-material/MarkunreadMailboxOutlined'
import { useMyMails } from '@/hooks/useMails'
import { alpha, Divider, Stack } from '@mui/material'
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
import Snackbar from '@mui/material/Snackbar'
import { useDeleteMail } from '@/hooks/useMails'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

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

function DashboardMailPageContent() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const [registerMailOpen, setRegisterMailOpen] = useState(false)
  const deleteMail = useDeleteMail()
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

  const handleDelete = async (mailId: string) => {
    if (!confirm('¿Eliminar este correo?')) return
    try {
      await deleteMail.mutateAsync(mailId)
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
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
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
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
          >
            <MarkunreadMailboxOutlined color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                Mis correos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Envíos registrados a tu nombre o que enviaste como emisor.
                Filtra por estado o por persona.
              </Typography>
            </Box>
          </Stack>

          <MailFlowExplainer variant="compact" />
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 2,
            borderRadius: 2
          }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            Filtros
          </Typography>
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
                onChange={(_, v: typeof filterStatus | null) => {
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
        </Paper>

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
              : `${mails.length} ${mails.length === 1 ? 'correo' : 'correos'} · ${statusFilterLabel}`}
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

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2, overflow: 'auto' }}
        >
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 110 }}>Tipo</TableCell>
                <TableCell>De</TableCell>
                <TableCell>Para</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Tiempo</TableCell>
                <TableCell align="center">Código</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
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
                  </TableCell>
                </TableRow>
              ) : (
                mails.map(mail => {
                  const from =
                    typeof mail.fromUserId === 'object' ? mail.fromUserId : null
                  const to =
                    typeof mail.toUserId === 'object' ? mail.toUserId : null
                  const isEmisor =
                    currentUserId &&
                    mailUserId(mail.fromUserId) === currentUserId
                  const canDelete = isEmisor && !mail.isRecivedInStore
                  return (
                    <TableRow key={mail._id}>
                      <TableCell>
                        <Chip
                          label={isEmisor ? 'Emisor' : 'Receptor'}
                          size="small"
                          color={isEmisor ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        {from
                          ? `${from.name ?? '-'} (${from.rut ?? '-'})`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {to
                          ? `${to.name ?? '-'} (${to.rut ?? '-'})`
                          : mail.toRut
                            ? `RUT: ${mail.toRut}`
                            : '-'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const { label, color } = getMailStatusChip(mail)
                          return (
                            <Chip
                              label={label}
                              color={color}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const days = getElapsedDays(mail.createdAt)
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
                      </TableCell>
                      <TableCell align="center">
                        <ButtonBarCode id={mail.code ?? mail._id} />
                      </TableCell>
                      <TableCell align="right">
                        {canDelete ? (
                          <Tooltip title="Eliminar (solo antes de recibir en tienda)">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(mail._id)}
                                disabled={deleteMail.isPending}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <RegisterMailDialog
          open={registerMailOpen}
          onClose={() => setRegisterMailOpen(false)}
        />

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
