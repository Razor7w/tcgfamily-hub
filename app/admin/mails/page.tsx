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
  useBulkWithdrawMails,
  useBulkReceiveInStoreMails,
  useDeleteMail,
  type Mail,
  type CreateMailData,
  type UpdateMailData
} from '@/hooks/useMails'
import { useCreateUser, type CreateUserData } from '@/hooks/useUsers'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { formatMailLogDateTime, getMailStatusChip } from '@/lib/mail-status'
import { normalizeMailCodeForSearch } from '@/lib/mail-code-search'
import {
  type ElapsedBucketFilter,
  getMailStoreWaitDays,
  matchesStoreWaitBucket,
  storeWaitChipProps
} from '@/lib/mail-store-days'
import { alpha } from '@mui/material/styles'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import {
  buildDistinctMailUsersForFilters,
  buildToRecipientOptions,
  filterFromUserLabel,
  filterToRecipientLabel,
  mailMatchesFromUserQuery,
  mailMatchesToRecipientFilter,
  mailMatchesToRecipientQuery,
  participantSearchMatches,
  toRecipientSearchMatches,
  type FilterFromUser,
  type FilterToRecipient
} from '@/lib/mail-recipient-filter'

/** ObjectId de Mongo como string (sin depender del endpoint `/api/users`). */
function isLikelyMongoObjectId(v: string) {
  return /^[a-f\d]{24}$/i.test(v.trim())
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
  /** Pendiente retiro en tienda: rangos por días desde ingreso a tienda. */
  const [filterElapsed, setFilterElapsed] = useState<ElapsedBucketFilter>('all')
  const [filterFromUser, setFilterFromUser] = useState<FilterFromUser | null>(
    null
  )
  const [filterFromInput, setFilterFromInput] = useState('')
  const [filterToRecipient, setFilterToRecipient] =
    useState<FilterToRecipient | null>(null)
  const [filterToInput, setFilterToInput] = useState('')
  const [page, setPage] = useState(1)
  const [mailToDelete, setMailToDelete] = useState<Mail | null>(null)
  const [bulkWithdrawOpen, setBulkWithdrawOpen] = useState(false)
  const [bulkReceiveInStoreOpen, setBulkReceiveInStoreOpen] = useState(false)

  const { data: mailsRes, isLoading, error } = useMails()
  const createMail = useCreateMail()
  const updateMail = useUpdateMail()
  const bulkWithdraw = useBulkWithdrawMails()
  const bulkReceiveInStore = useBulkReceiveInStoreMails()
  const deleteMail = useDeleteMail()
  const createUser = useCreateUser()

  const allMails = useMemo(() => mailsRes?.mails ?? [], [mailsRes?.mails])

  const usersFromMails = useMemo(
    () => buildDistinctMailUsersForFilters(allMails),
    [allMails]
  )

  const toRecipientOptions = useMemo(
    () => buildToRecipientOptions(allMails),
    [allMails]
  )

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
    if (filterElapsed !== 'all') {
      list = list.filter(m => {
        const d = getMailStoreWaitDays(m)
        if (d == null) return false
        return matchesStoreWaitBucket(d, filterElapsed)
      })
    }
    if (filterFromUser) {
      list = list.filter(m => mailUserId(m.fromUserId) === filterFromUser.id)
    } else if (filterFromInput.trim()) {
      list = list.filter(m => mailMatchesFromUserQuery(m, filterFromInput))
    }
    if (filterToRecipient) {
      list = list.filter(m =>
        mailMatchesToRecipientFilter(m, filterToRecipient)
      )
    } else if (filterToInput.trim()) {
      list = list.filter(m => mailMatchesToRecipientQuery(m, filterToInput))
    }
    return list
  }, [
    allMails,
    searchId,
    filterStage,
    filterElapsed,
    filterFromUser,
    filterFromInput,
    filterToRecipient,
    filterToInput
  ])

  useEffect(() => {
    setPage(1)
  }, [
    searchId,
    filterStage,
    filterElapsed,
    filterFromUser,
    filterFromInput,
    filterToRecipient,
    filterToInput
  ])

  const pageCount = Math.max(1, Math.ceil(mails.length / PAGE_SIZE))

  useEffect(() => {
    setPage(p => (p > pageCount ? pageCount : p))
  }, [pageCount, mails.length])

  const paginatedMails = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return mails.slice(start, start + PAGE_SIZE)
  }, [mails, page])

  /** En tienda y pendientes de retiro (excluye «No recibido en tienda»). */
  const bulkWithdrawTargets = useMemo(() => {
    if (!filterToRecipient) return []
    return mails.filter(m => !m.isRecived && Boolean(m.isRecivedInStore))
  }, [mails, filterToRecipient])

  /** Sin ingresar en tienda, filtrados por remitente. */
  const bulkReceiveInStoreTargets = useMemo(() => {
    if (!filterFromUser) return []
    return mails.filter(m => !m.isRecived && !m.isRecivedInStore)
  }, [mails, filterFromUser])

  const mailActionsDisabled =
    updateMail.isPending ||
    bulkWithdraw.isPending ||
    bulkReceiveInStore.isPending

  const fromIdTrim = formData.fromUserId.trim()
  const toIdTrim = formData.toUserId.trim()
  const fromIdInvalid =
    Boolean(fromIdTrim) && !isLikelyMongoObjectId(fromIdTrim)
  const toIdInvalid = Boolean(toIdTrim) && !isLikelyMongoObjectId(toIdTrim)

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
      const created = (await createUser.mutateAsync(payload)) as {
        id?: string
      }
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
    if (!fromIdTrim || !toIdTrim) {
      setSnackbar({
        open: true,
        message:
          'Indica los IDs de remitente y destinatario (ObjectId de 24 caracteres)',
        severity: 'error'
      })
      return
    }
    if (
      !isLikelyMongoObjectId(formData.fromUserId) ||
      !isLikelyMongoObjectId(formData.toUserId)
    ) {
      setSnackbar({
        open: true,
        message:
          'Los IDs deben ser ObjectId válidos (24 caracteres hexadecimales)',
        severity: 'error'
      })
      return
    }
    if (formData.fromUserId.trim() === formData.toUserId.trim()) {
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
          fromUserId: formData.fromUserId.trim(),
          toUserId: formData.toUserId.trim(),
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
          fromUserId: formData.fromUserId.trim(),
          toUserId: formData.toUserId.trim(),
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

  const handleConfirmDeleteMail = async () => {
    if (!mailToDelete) return
    const id = mailToDelete._id
    try {
      await deleteMail.mutateAsync(id)
      setMailToDelete(null)
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

  const handleConfirmBulkWithdraw = async () => {
    const ids = bulkWithdrawTargets.map(m => m._id)
    if (ids.length === 0) return
    try {
      const result = await bulkWithdraw.mutateAsync(ids)
      setBulkWithdrawOpen(false)
      setSnackbar({
        open: true,
        message:
          result.updatedCount === 1
            ? '1 correo marcado como retirado'
            : `${result.updatedCount} correos marcados como retirados`,
        severity: 'success'
      })
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Error al marcar como retirados'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleConfirmBulkReceiveInStore = async () => {
    const ids = bulkReceiveInStoreTargets.map(m => m._id)
    if (ids.length === 0) return
    try {
      const result = await bulkReceiveInStore.mutateAsync(ids)
      setBulkReceiveInStoreOpen(false)
      setSnackbar({
        open: true,
        message:
          result.updatedCount === 1
            ? '1 correo marcado como recibido en tienda'
            : `${result.updatedCount} correos marcados como recibidos en tienda`,
        severity: 'success'
      })
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Error al marcar como recibidos en tienda'
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
      sx={t => ({
        minHeight: '100vh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <AdminStorePageHeading alignItems="center">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Gestión de correos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Registro de envíos, ingreso en tienda y retiro; filtra por
                código, remitente/receptor (usuario o solo RUT), etapa o
                antigüedad en tienda.
              </Typography>
            </Box>
          </AdminStorePageHeading>
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
                sx={{ minWidth: { xs: '100%', sm: 220 } }}
              />
              <Autocomplete<FilterFromUser>
                size="small"
                options={usersFromMails}
                value={filterFromUser}
                inputValue={filterFromInput}
                onChange={(_, v) => setFilterFromUser(v)}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') {
                    setFilterFromInput(value)
                    if (
                      filterFromUser &&
                      value !== filterFromUserLabel(filterFromUser)
                    ) {
                      setFilterFromUser(null)
                    }
                    return
                  }
                  if (reason === 'clear') {
                    setFilterFromInput('')
                    setFilterFromUser(null)
                    return
                  }
                  if (reason === 'reset') {
                    setFilterFromInput(value)
                  }
                }}
                getOptionLabel={filterFromUserLabel}
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
                filterOptions={(opts, { inputValue }) =>
                  opts.filter(u => participantSearchMatches(inputValue, u))
                }
              />
              <Autocomplete<FilterToRecipient>
                size="small"
                options={toRecipientOptions}
                value={filterToRecipient}
                inputValue={filterToInput}
                onChange={(_, v) => setFilterToRecipient(v)}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') {
                    setFilterToInput(value)
                    if (
                      filterToRecipient &&
                      value !== filterToRecipientLabel(filterToRecipient)
                    ) {
                      setFilterToRecipient(null)
                    }
                    return
                  }
                  if (reason === 'clear') {
                    setFilterToInput('')
                    setFilterToRecipient(null)
                    return
                  }
                  if (reason === 'reset') {
                    setFilterToInput(value)
                  }
                }}
                getOptionLabel={filterToRecipientLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{
                  minWidth: { xs: '100%', sm: 260 },
                  flex: { md: '1 1 200px' }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Destinatario (para)"
                    placeholder="Nombre, RUT o sin cuenta"
                  />
                )}
                filterOptions={(opts, { inputValue }) =>
                  opts.filter(o => toRecipientSearchMatches(inputValue, o))
                }
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
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75 }}
              >
                Antigüedad en tienda (pendiente de retiro · desde marcado{' '}
                <strong>Recibido en tienda</strong>)
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={filterElapsed}
                onChange={(_, v) => v != null && setFilterElapsed(v)}
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  '& .MuiToggleButton-root': {
                    px: 1,
                    py: 0.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }
                }}
              >
                <ToggleButton value="all">Todos</ToggleButton>
                <ToggleButton
                  value="green"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: theme => alpha(theme.palette.success.main, 0.28),
                      color: 'success.dark',
                      '&:hover': {
                        bgcolor: theme =>
                          alpha(theme.palette.success.main, 0.38)
                      }
                    }
                  }}
                >
                  Verde · 0–7 días
                </ToggleButton>
                <ToggleButton
                  value="yellow"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: theme => alpha(theme.palette.warning.main, 0.38),
                      color: 'warning.dark',
                      '&:hover': {
                        bgcolor: theme =>
                          alpha(theme.palette.warning.main, 0.46)
                      }
                    }
                  }}
                >
                  Amarillo · 8–14 días
                </ToggleButton>
                <ToggleButton
                  value="orange"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: alpha('#e65100', 0.32),
                      color: '#bf360c',
                      '&:hover': { bgcolor: alpha('#e65100', 0.42) }
                    }
                  }}
                >
                  Naranjo · 15–30 días
                </ToggleButton>
                <ToggleButton
                  value="red"
                  color="error"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: theme => alpha(theme.palette.error.main, 0.26),
                      color: 'error.dark',
                      '&:hover': {
                        bgcolor: theme => alpha(theme.palette.error.main, 0.38)
                      }
                    }
                  }}
                >
                  Rojo · 31+ días
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Paper>

        {filterFromUser && bulkReceiveInStoreTargets.length > 1 ? (
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<StorefrontIcon />}
                onClick={() => setBulkReceiveInStoreOpen(true)}
                disabled={mailActionsDisabled}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Marcar {bulkReceiveInStoreTargets.length} como recibidos
              </Button>
            }
          >
            Hay {bulkReceiveInStoreTargets.length} correos sin ingresar en
            tienda de <strong>{filterFromUserLabel(filterFromUser)}</strong>.
          </Alert>
        ) : null}

        {filterToRecipient && bulkWithdrawTargets.length > 1 ? (
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<MarkEmailReadIcon />}
                onClick={() => setBulkWithdrawOpen(true)}
                disabled={mailActionsDisabled}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Marcar {bulkWithdrawTargets.length} como retirados
              </Button>
            }
          >
            Hay {bulkWithdrawTargets.length} correos en tienda pendientes de
            retiro para{' '}
            <strong>{filterToRecipientLabel(filterToRecipient)}</strong>.
          </Alert>
        ) : null}

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
                setFilterElapsed('all')
                setFilterFromUser(null)
                setFilterFromInput('')
                setFilterToRecipient(null)
                setFilterToInput('')
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
                const waitDays = getMailStoreWaitDays(mail)
                const waitChip =
                  waitDays !== null ? storeWaitChipProps(waitDays) : null
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
                          {waitChip ? (
                            <Tooltip title="Esperando retiro: días desde el ingreso confirmado en tienda">
                              <Chip
                                label={waitChip.label}
                                {...(waitChip.color !== undefined
                                  ? { color: waitChip.color }
                                  : {})}
                                size="small"
                                sx={
                                  waitChip.sx != null &&
                                  typeof waitChip.sx === 'object' &&
                                  !Array.isArray(waitChip.sx)
                                    ? { fontWeight: 600, ...waitChip.sx }
                                    : { fontWeight: 600 }
                                }
                              />
                            </Tooltip>
                          ) : null}
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
                        {to
                          ? `${to.name ?? '-'} (${to.rut ?? '-'})`
                          : `${mail.toRut} (No registrado en sistema)`}
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
                                disabled={mailActionsDisabled}
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
                                disabled={mailActionsDisabled}
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
                        onClick={() => setMailToDelete(mail)}
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
          open={bulkReceiveInStoreOpen}
          onClose={() =>
            !bulkReceiveInStore.isPending && setBulkReceiveInStoreOpen(false)
          }
          maxWidth="xs"
          fullWidth
          aria-labelledby="admin-bulk-receive-in-store-title"
        >
          <DialogTitle id="admin-bulk-receive-in-store-title">
            ¿Marcar todos como recibidos en tienda?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Se marcarán{' '}
              <strong>{bulkReceiveInStoreTargets.length} correos</strong> como
              recibidos en tienda de{' '}
              <strong>
                {filterFromUser ? filterFromUserLabel(filterFromUser) : ''}
              </strong>
              . Solo se incluyen correos en estado{' '}
              <strong>No recibido en tienda</strong>.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setBulkReceiveInStoreOpen(false)}
              disabled={bulkReceiveInStore.isPending}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={() => void handleConfirmBulkReceiveInStore()}
              disabled={bulkReceiveInStore.isPending}
            >
              {bulkReceiveInStore.isPending ? 'Marcando…' : 'Confirmar ingreso'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={bulkWithdrawOpen}
          onClose={() => !bulkWithdraw.isPending && setBulkWithdrawOpen(false)}
          maxWidth="xs"
          fullWidth
          aria-labelledby="admin-bulk-withdraw-title"
        >
          <DialogTitle id="admin-bulk-withdraw-title">
            ¿Marcar todos como retirados?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Se marcarán <strong>{bulkWithdrawTargets.length} correos</strong>{' '}
              como retirados para{' '}
              <strong>
                {filterToRecipient
                  ? filterToRecipientLabel(filterToRecipient)
                  : ''}
              </strong>
              . Solo se incluyen correos marcados como{' '}
              <strong>En tienda</strong>.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setBulkWithdrawOpen(false)}
              disabled={bulkWithdraw.isPending}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={() => void handleConfirmBulkWithdraw()}
              disabled={bulkWithdraw.isPending}
            >
              {bulkWithdraw.isPending ? 'Marcando…' : 'Confirmar retiro'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={mailToDelete !== null}
          onClose={() => !deleteMail.isPending && setMailToDelete(null)}
          maxWidth="xs"
          fullWidth
          aria-labelledby="admin-delete-mail-title"
        >
          <DialogTitle id="admin-delete-mail-title">
            ¿Eliminar este correo?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Se eliminará de forma permanente del sistema.
            </Typography>
            {mailToDelete?.code ? (
              <Typography variant="body2" sx={{ mt: 1.5 }} fontWeight={600}>
                Código: {mailToDelete.code}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setMailToDelete(null)}
              disabled={deleteMail.isPending}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void handleConfirmDeleteMail()}
              disabled={deleteMail.isPending}
            >
              {deleteMail.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>

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
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="ID remitente (De)"
                    placeholder="ObjectId usuario emisor · 24 hex"
                    value={formData.fromUserId}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        fromUserId: e.target.value
                      }))
                    }
                    error={fromIdInvalid}
                    helperText={
                      fromIdInvalid
                        ? 'Debe ser un ObjectId válido de 24 caracteres'
                        : undefined
                    }
                  />
                  {editingMail &&
                  typeof editingMail.fromUserId === 'object' &&
                  editingMail.fromUserId ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      En este correo: {editingMail.fromUserId.name ?? '—'} · RUT{' '}
                      {editingMail.fromUserId.rut ?? '—'}
                    </Typography>
                  ) : null}
                </Box>
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
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="ID destinatario (Para)"
                    placeholder="ObjectId usuario receptor · 24 hex"
                    value={formData.toUserId}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        toUserId: e.target.value
                      }))
                    }
                    error={toIdInvalid}
                    helperText={
                      toIdInvalid
                        ? 'Debe ser un ObjectId válido de 24 caracteres'
                        : undefined
                    }
                  />
                  {editingMail &&
                  editingMail.toUserId &&
                  typeof editingMail.toUserId === 'object' &&
                  editingMail.toUserId ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      En este correo: {editingMail.toUserId.name ?? '—'} · RUT{' '}
                      {editingMail.toUserId.rut ?? '—'}
                    </Typography>
                  ) : editingMail?.toRut ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      RUT destinatario en correo: {editingMail.toRut}
                    </Typography>
                  ) : null}
                </Box>
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
                !fromIdTrim ||
                !toIdTrim ||
                fromIdTrim === toIdTrim ||
                !isLikelyMongoObjectId(fromIdTrim) ||
                !isLikelyMongoObjectId(toIdTrim)
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
