'use client'

import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
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

function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

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
  const [filterRecived, setFilterRecived] = useState<
    'all' | 'recived' | 'notRecived'
  >('all')
  const [filterFromUser, setFilterFromUser] = useState<User | null>(null)
  const [filterToUser, setFilterToUser] = useState<User | null>(null)

  const { data: mailsRes, isLoading, error } = useMails()
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const createMail = useCreateMail()
  const updateMail = useUpdateMail()
  const deleteMail = useDeleteMail()
  const createUser = useCreateUser()

  const allMails = useMemo(() => mailsRes?.mails ?? [], [mailsRes?.mails])

  const mails = useMemo(() => {
    let list = allMails
    const q = searchId.trim().toLowerCase()
    if (q) {
      list = list.filter(
        m =>
          (m.code ?? '').toLowerCase().includes(q) ||
          m._id.toLowerCase().includes(q)
      )
    }
    if (filterRecived === 'recived') {
      list = list.filter(m => m.isRecived)
    } else if (filterRecived === 'notRecived') {
      list = list.filter(m => !m.isRecived)
    }
    if (filterFromUser) {
      list = list.filter(m => mailUserId(m.fromUserId) === filterFromUser.id)
    }
    if (filterToUser) {
      list = list.filter(m => mailUserId(m.toUserId) === filterToUser.id)
    }
    return list
  }, [allMails, searchId, filterRecived, filterFromUser, filterToUser])

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
      const fromId =
        typeof mail.fromUserId === 'object'
          ? mail.fromUserId._id
          : String(mail.fromUserId)
      const toId =
        typeof mail.toUserId === 'object'
          ? mail.toUserId._id
          : String(mail.toUserId)
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
          message: 'Mail actualizado correctamente',
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
          message: 'Mail creado correctamente',
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
    if (!confirm('¿Eliminar este mail?')) return
    try {
      await deleteMail.mutateAsync(mail._id)
      setSnackbar({
        open: true,
        message: 'Mail eliminado correctamente',
        severity: 'success'
      })
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al eliminar mail',
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
        <Alert severity="error">Error al cargar mails: {error.message}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h4" component="h1">
          Gestión de Mails
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Mail
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mb: 2
        }}
      >
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
            label="Buscar por ID"
            placeholder="Ej: 16-04-2026-001"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Autocomplete
            size="small"
            options={users}
            value={filterFromUser}
            onChange={(_, v) => setFilterFromUser(v)}
            getOptionLabel={userLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 260 }}
            renderInput={params => (
              <TextField
                {...params}
                label="Filtrar por remitente (De)"
                placeholder="Buscar usuario..."
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
            options={users}
            value={filterToUser}
            onChange={(_, v) => setFilterToUser(v)}
            getOptionLabel={userLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 260 }}
            renderInput={params => (
              <TextField
                {...params}
                label="Filtrar por destinatario (Para)"
                placeholder="Buscar usuario..."
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant={filterRecived === 'all' ? 'contained' : 'outlined'}
              onClick={() => setFilterRecived('all')}
            >
              Todos
            </Button>
            <Button
              size="small"
              variant={filterRecived === 'recived' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setFilterRecived('recived')}
            >
              Recibidos
            </Button>
            <Button
              size="small"
              variant={
                filterRecived === 'notRecived' ? 'contained' : 'outlined'
              }
              color="warning"
              onClick={() => setFilterRecived('notRecived')}
            >
              No recibidos
            </Button>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 64 }}>
                Nº
              </TableCell>
              <TableCell>De</TableCell>
              <TableCell>Para</TableCell>
              <TableCell>Recibido en tienda</TableCell>
              <TableCell>Retirado</TableCell>
              <TableCell>Tiempo transcurrido</TableCell>
              <TableCell>Observaciones</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay mails
                </TableCell>
              </TableRow>
            ) : (
              mails.map((mail, index) => {
                const from =
                  typeof mail.fromUserId === 'object' ? mail.fromUserId : null
                const to =
                  typeof mail.toUserId === 'object' ? mail.toUserId : null
                return (
                  <TableRow key={mail._id}>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {from ? `${from.name ?? '-'} (${from.rut ?? '-'})` : '-'}
                    </TableCell>
                    <TableCell>
                      {to ? `${to.name ?? '-'} (${to.rut ?? '-'})` : '-'}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ minWidth: 28 }}
                        >
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
                              color={mail.isRecivedInStore ? 'default' : 'primary'}
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
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ minWidth: 28 }}
                        >
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
                    <TableCell>
                      {mail.observations ? (
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {mail.observations}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleOpenDialog(mail)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(mail)}
                        disabled={deleteMail.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingMail ? 'Editar Mail' : 'Nuevo Mail'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
                    setNewUserForm({ name: '', email: '', phone: '', rut: '' })
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
                    setNewUserForm(prev => ({ ...prev, name: e.target.value }))
                  }
                />
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  fullWidth
                  value={newUserForm.email}
                  onChange={e =>
                    setNewUserForm(prev => ({ ...prev, email: e.target.value }))
                  }
                />
                <TextField
                  label="Número"
                  size="small"
                  fullWidth
                  value={newUserForm.phone}
                  onChange={e =>
                    setNewUserForm(prev => ({ ...prev, phone: e.target.value }))
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
                    fromUserId: v?.id === prev.fromUserId ? '' : prev.fromUserId
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
                    setNewUserForm({ name: '', email: '', phone: '', rut: '' })
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
                    setNewUserForm(prev => ({ ...prev, name: e.target.value }))
                  }
                />
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  fullWidth
                  value={newUserForm.email}
                  onChange={e =>
                    setNewUserForm(prev => ({ ...prev, email: e.target.value }))
                  }
                />
                <TextField
                  label="Número"
                  size="small"
                  fullWidth
                  value={newUserForm.phone}
                  onChange={e =>
                    setNewUserForm(prev => ({ ...prev, phone: e.target.value }))
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
              label="Recibido en tienda"
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
        <DialogActions>
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
  )
}
