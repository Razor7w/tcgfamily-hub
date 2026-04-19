'use client'

import { useState, useMemo, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Divider from '@mui/material/Divider'
import Pagination from '@mui/material/Pagination'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'
import StorefrontIcon from '@mui/icons-material/Storefront'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  useMails,
  useCreateMail,
  useUpdateMail,
  useDeleteMail,
  type Mail,
  type CreateMailData,
  type UpdateMailData
} from '@/hooks/useMails'
import {
  useUsers,
  useCreateUser,
  type User,
  type CreateUserData
} from '@/hooks/useUsers'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { formatMailLogDateTime, getMailStatusChip } from '@/lib/mail-status'
import { normalizeMailCodeForSearch } from '@/lib/mail-code-search'

function userLabel(u: User) {
  const name = u.name || 'Sin nombre'
  const email = u.email || '-'
  const rut = u.rut || '-'
  return `${name} (${email}) - ${rut}`
}

export function getElapsedDays(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.floor((now - created) / (24 * 60 * 60 * 1000))
}

function formatElapsed(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

export function getElapsedBadge(days: number): {
  label: string
  color: 'success' | 'warning' | 'error'
} {
  const label = formatElapsed(days)
  if (days <= 7) return { label, color: 'success' }
  if (days <= 14) return { label, color: 'warning' }
  return { label, color: 'error' }
}

function mailUserId(ref: { _id: string } | string | null | undefined): string {
  if (ref == null) return ''
  return typeof ref === 'object' ? ref._id : String(ref)
}

const PAGE_SIZE = 10

export default function MailsPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMail, setEditingMail] = useState<Mail | null>(null)
  const [formData, setFormData] = useState<CreateMailData>({
    fromUserId: '',
    toUserId: '',
    isRecived: false,
    isRecivedInStore: false,
    observations: ''
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })
  const [addUserFor, setAddUserFor] = useState<'from' | 'to' | null>(null)
  const [newUserForm, setNewUserForm] = useState<{
    name: string
    email: string
    phone: string
    rut: string
  }>({ name: '', email: '', phone: '', rut: '' })
  const [searchId, setSearchId] = useState('')
  /** Etapa del envío (alineada con estados del portal). */
  const [filterStage, setFilterStage] = useState<
    'all' | 'pending' | 'inStore' | 'retired'
  >('all')
  const [filterFromUser, setFilterFromUser] = useState<User | null>(null)
  const [filterToUser, setFilterToUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)

  const { data: mailsRes, isLoading, error } = useMails()
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const createMail = useCreateMail()
  const updateMail = useUpdateMail()
  const deleteMail = useDeleteMail()
  const createUser = useCreateUser()

  const allMails = useMemo(() => mailsRes?.mails ?? [], [mailsRes?.mails])

  /** Usuarios registrados que aparecen como emisor en al menos un correo cargado. */
  const filterFromOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const m of allMails) {
      const id = mailUserId(m.fromUserId)
      if (id) ids.add(id)
    }
    return users
      .filter(u => ids.has(u.id))
      .sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '', 'es', {
          sensitivity: 'base'
        })
      )
  }, [allMails, users])

  /** Usuarios registrados que aparecen como receptor (toUserId) en al menos un correo. */
  const filterToOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const m of allMails) {
      const id = mailUserId(m.toUserId)
      if (id) ids.add(id)
    }
    return users
      .filter(u => ids.has(u.id))
      .sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '', 'es', {
          sensitivity: 'base'
        })
      )
  }, [allMails, users])

  /** Quitar filtro si ese usuario ya no figura en ningún correo (p. ej. tras borrar). */
  useEffect(() => {
    const ids = new Set<string>()
    for (const m of allMails) {
      const id = mailUserId(m.fromUserId)
      if (id) ids.add(id)
    }
    setFilterFromUser(prev => (prev && !ids.has(prev.id) ? null : prev))
  }, [allMails])

  useEffect(() => {
    const ids = new Set<string>()
    for (const m of allMails) {
      const id = mailUserId(m.toUserId)
      if (id) ids.add(id)
    }
    setFilterToUser(prev => (prev && !ids.has(prev.id) ? null : prev))
  }, [allMails])

  const mails = useMemo(() => {
    let list = allMails
    const qCode = normalizeMailCodeForSearch(searchId)
    const qId = searchId.trim().toLowerCase()
    if (qCode) {
      list = list.filter(
        m =>
          normalizeMailCodeForSearch(m.code ?? '').includes(qCode) ||
          m._id.toLowerCase().includes(qId)
      )
    }
    if (filterStage === 'retired') {
      list = list.filter(m => m.isRecived)
    } else if (filterStage === 'inStore') {
      list = list.filter(m => !m.isRecived && Boolean(m.isRecivedInStore))
    } else if (filterStage === 'pending') {
      list = list.filter(m => !m.isRecived && !m.isRecivedInStore)
    }
    if (filterFromUser) {
      list = list.filter(m => mailUserId(m.fromUserId) === filterFromUser.id)
    }
    if (filterToUser) {
      list = list.filter(m => mailUserId(m.toUserId) === filterToUser.id)
    }
    return list
  }, [allMails, searchId, filterStage, filterFromUser, filterToUser])

  useEffect(() => {
    setPage(1)
  }, [searchId, filterStage, filterFromUser, filterToUser])

  const pageCount = Math.max(1, Math.ceil(mails.length / PAGE_SIZE))

  useEffect(() => {
    setPage(p => (p > pageCount ? pageCount : p))
  }, [pageCount, mails.length])

  const paginatedMails = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return mails.slice(start, start + PAGE_SIZE)
  }, [mails, page])

  const fromOptions = useMemo(() => {
    if (!formData.toUserId) return users
    return users.filter(u => u.id !== formData.toUserId)
  }, [users, formData.toUserId])

  const toOptions = useMemo(() => {
    if (!formData.fromUserId) return users
    return users.filter(u => u.id !== formData.fromUserId)
  }, [users, formData.fromUserId])

  const fromValue = useMemo(
    () => users.find(u => u.id === formData.fromUserId) ?? null,
    [users, formData.fromUserId]
  )
  const toValue = useMemo(
    () => users.find(u => u.id === formData.toUserId) ?? null,
    [users, formData.toUserId]
  )

  const handleOpenDialog = (mail?: Mail) => {
    if (mail) {
      setEditingMail(mail)
      const fromId = mailUserId(mail.fromUserId)
      const toId = mailUserId(mail.toUserId)
      setFormData({
        fromUserId: fromId,
        toUserId: toId,
        isRecived: mail.isRecived,
        isRecivedInStore: mail.isRecivedInStore ?? false,
        observations: mail.observations ?? ''
      })
    } else {
      setEditingMail(null)
      setFormData({
        fromUserId: '',
        toUserId: '',
        isRecived: false,
        isRecivedInStore: false,
        observations: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingMail(null)
    setFormData({
      fromUserId: '',
      toUserId: '',
      isRecived: false,
      isRecivedInStore: false,
      observations: ''
    })
    setAddUserFor(null)
    setNewUserForm({ name: '', email: '', phone: '', rut: '' })
  }

  const handleCancelAddUser = () => {
    setAddUserFor(null)
    setNewUserForm({ name: '', email: '', phone: '', rut: '' })
  }

  const handleCreateAndLinkUser = async () => {
    const { name, email, phone, rut } = newUserForm
    if (!name?.trim() || !email?.trim()) {
      setSnackbar({
        open: true,
        message: 'Nombre y email son requeridos',
        severity: 'error'
      })
      return
    }
    if (rut.trim()) {
      const rutErr = getRutFieldError(rut, false)
      if (rutErr) {
        setSnackbar({ open: true, message: rutErr, severity: 'error' })
        return
      }
    }
    try {
      const payload: CreateUserData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        rut: rut.trim(),
        role: 'user'
      }
      const created = (await createUser.mutateAsync(payload)) as User
      const id = created?.id
      if (!id) throw new Error('No se obtuvo ID del usuario creado')
      if (addUserFor === 'from') {
        setFormData(prev => ({
          ...prev,
          fromUserId: id,
          toUserId: id === prev.toUserId ? '' : prev.toUserId
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          toUserId: id,
          fromUserId: id === prev.fromUserId ? '' : prev.fromUserId
        }))
      }
      handleCancelAddUser()
      setSnackbar({
        open: true,
        message: 'Usuario creado y vinculado',
        severity: 'success'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear usuario'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleSave = async () => {
    if (!formData.fromUserId || !formData.toUserId) {
      setSnackbar({
        open: true,
        message: 'Debes seleccionar remitente y destinatario',
        severity: 'error'
      })
      return
    }
    if (formData.fromUserId === formData.toUserId) {
      setSnackbar({
        open: true,
        message: 'No puedes enviarte un correo a ti mismo',
        severity: 'error'
      })
      return
    }

    try {
      if (editingMail) {
        const payload: UpdateMailData = {
          fromUserId: formData.fromUserId,
          toUserId: formData.toUserId,
          isRecived: formData.isRecived,
          isRecivedInStore: formData.isRecivedInStore,
          observations: formData.observations
        }
        await updateMail.mutateAsync({
          mailId: editingMail._id,
          data: payload
        })
        setSnackbar({
          open: true,
          message: 'Correo actualizado correctamente',
          severity: 'success'
        })
      } else {
        await createMail.mutateAsync({
          fromUserId: formData.fromUserId,
          toUserId: formData.toUserId,
          isRecived: formData.isRecived,
          isRecivedInStore: formData.isRecivedInStore,
          observations: formData.observations
        })
        setSnackbar({
          open: true,
          message: 'Correo creado correctamente',
          severity: 'success'
        })
      }
      handleCloseDialog()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleDelete = async (mail: Mail) => {
    if (!confirm('¿Eliminar este correo?')) return
    try {
      await deleteMail.mutateAsync(mail._id)
      setSnackbar({
        open: true,
        message: 'Correo eliminado correctamente',
        severity: 'success'
      })
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al eliminar el correo',
        severity: 'error'
      })
    }
  }

  const handleToggleRecived = async (mail: Mail) => {
    try {
      await updateMail.mutateAsync({
        mailId: mail._id,
        data: { isRecived: !mail.isRecived }
      })
      setSnackbar({
        open: true,
        message: mail.isRecived
          ? 'Marcado como no recibido'
          : 'Marcado como recibido',
        severity: 'success'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleToggleRecivedInStore = async (mail: Mail) => {
    try {
      await updateMail.mutateAsync({
        mailId: mail._id,
        data: { isRecivedInStore: !mail.isRecivedInStore }
      })
      setSnackbar({
        open: true,
        message: mail.isRecivedInStore
          ? 'Marcado como no recibido en tienda'
          : 'Marcado como recibido en tienda',
        severity: 'success'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar'
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
          minHeight: '50vh'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Error al cargar correos: {error.message}</Alert>
      </Container>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Gestión de correos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Registro de envíos, ingreso en tienda y retiro. Usa los filtros
              para priorizar pendientes.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ flexShrink: 0 }}
          >
            Nuevo correo
          </Button>
        </Stack>

        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, sm: 2.5 }, mb: 2, borderRadius: 2 }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            Filtros
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center'
              }}
            >
              <TextField
                size="small"
                label="Buscar por código"
                placeholder="Ej: 16-04-2026-001"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <Autocomplete
                size="small"
                options={filterFromOptions}
                value={filterFromUser}
                onChange={(_, v) => setFilterFromUser(v)}
                getOptionLabel={userLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ minWidth: 260 }}
                noOptionsText="Ningún remitente en los correos cargados"
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Filtrar por remitente (De)"
                    placeholder="Solo usuarios con correos como emisor"
                  />
                )}
                filterOptions={(opts, { inputValue }) => {
                  const v = inputValue.trim().toLowerCase()
                  if (!v) return opts
                  return opts.filter(
                    u =>
                      u.name?.toLowerCase().includes(v) ||
                      u.email?.toLowerCase().includes(v) ||
                      (u.rut &&
                        u.rut
                          .toLowerCase()
                          .replace(/\D/g, '')
                          .includes(v.replace(/\D/g, '')))
                  )
                }}
              />
              <Autocomplete
                size="small"
                options={filterToOptions}
                value={filterToUser}
                onChange={(_, v) => setFilterToUser(v)}
                getOptionLabel={userLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ minWidth: 260 }}
                noOptionsText="Ningún destinatario en los correos cargados"
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Filtrar por destinatario (Para)"
                    placeholder="Solo usuarios con correos como receptor"
                  />
                )}
                filterOptions={(opts, { inputValue }) => {
                  const v = inputValue.trim().toLowerCase()
                  if (!v) return opts
                  return opts.filter(
                    u =>
                      u.name?.toLowerCase().includes(v) ||
                      u.email?.toLowerCase().includes(v) ||
                      (u.rut &&
                        u.rut
                          .toLowerCase()
                          .replace(/\D/g, '')
                          .includes(v.replace(/\D/g, '')))
                  )
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75 }}
              >
                Etapa del envío
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={filterStage}
                onChange={(_, v) => v != null && setFilterStage(v)}
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
                <ToggleButton value="pending">Sin ingresar</ToggleButton>
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

        {mails.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ py: 6, px: 2, textAlign: 'center', borderRadius: 2 }}
          >
            <Typography color="text.secondary" variant="body1" gutterBottom>
              No hay correos con estos criterios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Prueba limpiar la búsqueda o cambiar la etapa del envío.
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setSearchId('')
                setFilterStage('all')
                setFilterFromUser(null)
                setFilterToUser(null)
              }}
            >
              Restablecer filtros
            </Button>
          </Paper>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }
              }}
            >
              {paginatedMails.map(mail => {
                const from =
                  typeof mail.fromUserId === 'object' ? mail.fromUserId : null
                const to =
                  typeof mail.toUserId === 'object' ? mail.toUserId : null
                const days = getElapsedDays(mail.createdAt)
                const elapsed = getElapsedBadge(days)
                const status = getMailStatusChip(mail)
                return (
                  <Card
                    key={mail._id}
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 2
                    }}
                  >
                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 1,
                          mb: 1.5
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ wordBreak: 'break-all' }}
                        >
                          Código
                          {mail.code ? ` · ${mail.code}` : ''}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          justifyContent="flex-end"
                          sx={{ maxWidth: '65%' }}
                        >
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                          <Chip
                            label={elapsed.label}
                            color={elapsed.color}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </Stack>
                      </Box>
                      <Stack spacing={0.25} sx={{ mb: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="p"
                          sx={{ m: 0 }}
                        >
                          <strong>Creado:</strong>{' '}
                          {formatMailLogDateTime(mail.createdAt)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="p"
                          sx={{ m: 0 }}
                        >
                          <strong>Actualizado:</strong>{' '}
                          {formatMailLogDateTime(mail.updatedAt)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>De:</strong>{' '}
                        {from
                          ? `${from.name ?? '-'} (${from.rut ?? '-'})`
                          : '-'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <strong>Para:</strong>{' '}
                        {to ? `${to.name ?? '-'} (${to.rut ?? '-'})` : '-'}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                          alignItems: 'center'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            En tienda
                          </Typography>
                          <Typography component="span" variant="body2">
                            {mail.isRecivedInStore ? 'Sí' : 'No'}
                          </Typography>
                          <Tooltip
                            title={
                              mail.isRecivedInStore
                                ? 'Marcar como no recibido en tienda'
                                : 'Marcar como recibido en tienda'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color={
                                  mail.isRecivedInStore ? 'default' : 'primary'
                                }
                                onClick={() => handleToggleRecivedInStore(mail)}
                                disabled={
                                  updateMail.isPending &&
                                  updateMail.variables?.mailId === mail._id
                                }
                              >
                                {mail.isRecivedInStore ? (
                                  <StorefrontOutlinedIcon fontSize="small" />
                                ) : (
                                  <StorefrontIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Retirado
                          </Typography>
                          <Typography component="span" variant="body2">
                            {mail.isRecived ? 'Sí' : 'No'}
                          </Typography>
                          <Tooltip
                            title={
                              mail.isRecived
                                ? 'Marcar como no recibido'
                                : 'Marcar como recibido'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color={mail.isRecived ? 'default' : 'primary'}
                                onClick={() => handleToggleRecived(mail)}
                                disabled={
                                  updateMail.isPending &&
                                  updateMail.variables?.mailId === mail._id
                                }
                              >
                                {mail.isRecived ? (
                                  <MarkEmailUnreadIcon fontSize="small" />
                                ) : (
                                  <MarkEmailReadIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                      {mail.observations ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {mail.observations}
                        </Typography>
                      ) : null}
                    </CardContent>
                    <CardActions
                      sx={{
                        justifyContent: 'flex-end',
                        pt: 0,
                        px: 2,
                        pb: 2
                      }}
                    >
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleOpenDialog(mail)}
                        aria-label="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(mail)}
                        disabled={deleteMail.isPending}
                        aria-label="Eliminar"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                )
              })}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                mt: 3
              }}
            >
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                showFirstButton
                showLastButton
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                {mails.length === 0
                  ? ''
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, mails.length)} de ${mails.length}`}
              </Typography>
            </Box>
          </>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          scroll="paper"
        >
          <DialogTitle>
            {editingMail ? 'Editar correo' : 'Nuevo correo'}
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  options={fromOptions}
                  value={fromValue}
                  getOptionLabel={userLabel}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  loading={usersLoading}
                  filterOptions={(opts, { inputValue }) => {
                    const v = inputValue.trim().toLowerCase()
                    if (!v) return opts
                    return opts.filter(
                      u =>
                        u.name?.toLowerCase().includes(v) ||
                        u.email?.toLowerCase().includes(v) ||
                        (u.rut &&
                          u.rut
                            .toLowerCase()
                            .replace(/\D/g, '')
                            .includes(v.replace(/\D/g, '')))
                    )
                  }}
                  onChange={(_, v) =>
                    setFormData(prev => ({
                      ...prev,
                      fromUserId: v?.id ?? '',
                      toUserId: v?.id === prev.toUserId ? '' : prev.toUserId
                    }))
                  }
                  sx={{ flex: 1 }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Remitente (De)"
                      placeholder="Buscar por nombre, email o RUT..."
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const next = addUserFor === 'from' ? null : 'from'
                    if (next)
                      setNewUserForm({
                        name: '',
                        email: '',
                        phone: '',
                        rut: ''
                      })
                    setAddUserFor(next)
                  }}
                  sx={{ flexShrink: 0, mt: 1 }}
                >
                  Añadir
                </Button>
              </Box>
              {addUserFor === 'from' && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle2">
                    Nuevo usuario — vincular como remitente
                  </Typography>
                  <TextField
                    label="Nombre"
                    size="small"
                    fullWidth
                    value={newUserForm.name}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="Email"
                    type="email"
                    size="small"
                    fullWidth
                    value={newUserForm.email}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="Número"
                    size="small"
                    fullWidth
                    value={newUserForm.phone}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="RUT"
                    size="small"
                    fullWidth
                    value={newUserForm.rut}
                    onChange={e =>
                      setNewUserForm(prev => ({ ...prev, rut: e.target.value }))
                    }
                    onBlur={() =>
                      setNewUserForm(prev => ({
                        ...prev,
                        rut: formatRutOnBlur(prev.rut)
                      }))
                    }
                    placeholder="12.345.678-9"
                    error={
                      Boolean(newUserForm.rut.trim()) &&
                      getRutFieldError(newUserForm.rut, false) !== null
                    }
                    helperText={
                      getRutFieldError(newUserForm.rut, false) ?? undefined
                    }
                    inputProps={{ maxLength: 20 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelAddUser}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleCreateAndLinkUser}
                      disabled={createUser.isPending}
                    >
                      {createUser.isPending
                        ? 'Creando…'
                        : 'Crear y vincular como remitente'}
                    </Button>
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  options={toOptions}
                  value={toValue}
                  getOptionLabel={userLabel}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  loading={usersLoading}
                  filterOptions={(opts, { inputValue }) => {
                    const v = inputValue.trim().toLowerCase()
                    if (!v) return opts
                    return opts.filter(
                      u =>
                        u.name?.toLowerCase().includes(v) ||
                        u.email?.toLowerCase().includes(v) ||
                        (u.rut &&
                          u.rut
                            .toLowerCase()
                            .replace(/\D/g, '')
                            .includes(v.replace(/\D/g, '')))
                    )
                  }}
                  onChange={(_, v) =>
                    setFormData(prev => ({
                      ...prev,
                      toUserId: v?.id ?? '',
                      fromUserId:
                        v?.id === prev.fromUserId ? '' : prev.fromUserId
                    }))
                  }
                  sx={{ flex: 1 }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Destinatario (Para)"
                      placeholder="Buscar por nombre, email o RUT..."
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const next = addUserFor === 'to' ? null : 'to'
                    if (next)
                      setNewUserForm({
                        name: '',
                        email: '',
                        phone: '',
                        rut: ''
                      })
                    setAddUserFor(next)
                  }}
                  sx={{ flexShrink: 0, mt: 1 }}
                >
                  Añadir
                </Button>
              </Box>
              {addUserFor === 'to' && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle2">
                    Nuevo usuario — vincular como destinatario
                  </Typography>
                  <TextField
                    label="Nombre"
                    size="small"
                    fullWidth
                    value={newUserForm.name}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="Email"
                    type="email"
                    size="small"
                    fullWidth
                    value={newUserForm.email}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        email: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="Número"
                    size="small"
                    fullWidth
                    value={newUserForm.phone}
                    onChange={e =>
                      setNewUserForm(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))
                    }
                  />
                  <TextField
                    label="RUT"
                    size="small"
                    fullWidth
                    value={newUserForm.rut}
                    onChange={e =>
                      setNewUserForm(prev => ({ ...prev, rut: e.target.value }))
                    }
                    onBlur={() =>
                      setNewUserForm(prev => ({
                        ...prev,
                        rut: formatRutOnBlur(prev.rut)
                      }))
                    }
                    placeholder="12.345.678-9"
                    error={
                      Boolean(newUserForm.rut.trim()) &&
                      getRutFieldError(newUserForm.rut, false) !== null
                    }
                    helperText={
                      getRutFieldError(newUserForm.rut, false) ?? undefined
                    }
                    inputProps={{ maxLength: 20 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelAddUser}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleCreateAndLinkUser}
                      disabled={createUser.isPending}
                    >
                      {createUser.isPending
                        ? 'Creando…'
                        : 'Crear y vincular como destinatario'}
                    </Button>
                  </Box>
                </Box>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isRecived}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        isRecived: e.target.checked
                      }))
                    }
                  />
                }
                label="Retirado"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isRecivedInStore}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        isRecivedInStore: e.target.checked
                      }))
                    }
                  />
                }
                label="Recibido en tienda (envía un email al receptor con cuenta)"
              />
              <TextField
                label="Observaciones"
                multiline
                rows={3}
                fullWidth
                value={formData.observations}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    observations: e.target.value
                  }))
                }
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={
                createMail.isPending ||
                updateMail.isPending ||
                !formData.fromUserId ||
                !formData.toUserId ||
                formData.fromUserId === formData.toUserId
              }
            >
              {createMail.isPending || updateMail.isPending
                ? 'Guardando…'
                : 'Guardar'}
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
