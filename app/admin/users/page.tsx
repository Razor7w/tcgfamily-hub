'use client'

import { useState, useRef } from 'react'
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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

/** Evita que varios Select/Menu bloqueen el scroll del body a la vez en móvil (iOS/Safari). */
const SELECT_MENU_PROPS = {
  disableScrollLock: true,
  slotProps: {
    paper: {
      sx: { maxHeight: 280 }
    }
  }
} as const
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useBulkUploadUsers,
  type User,
  type CreateUserData
} from '@/hooks/useUsers'
import { useAppStore } from '@/store/useAppStore'
import {
  formatRutOnBlur,
  getRutFieldError,
  onlyDigits
} from '@/lib/rut-input'
import { validatePopidOptional } from '@/lib/rut-chile'

export default function UsersPageRefactored() {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'), {
    defaultMatches: true,
    noSsr: true
  })

  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'user',
    phone: '',
    rut: '',
    popid: ''
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })
  const [pointsModalUser, setPointsModalUser] = useState<User | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks de TanStack Query - ¡Mucho más simple!
  const { data: users = [], isLoading, error } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const bulkUpload = useBulkUploadUsers()

  // Zustand store para filtros (ejemplo)
  const userFilter = useAppStore(state => state.userFilter)
  const setUserFilter = useAppStore(state => state.setUserFilter)
  const addNotification = useAppStore(state => state.addNotification)

  // Abrir diálogo para crear/editar
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role,
        phone: user.phone || '',
        rut: user.rut || '',
        popid: user.popid || ''
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        role: 'user',
        phone: '',
        rut: '',
        popid: ''
      })
    }
    setOpenDialog(true)
  }

  // Cerrar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      role: 'user',
      phone: '',
      rut: '',
      popid: ''
    })
  }

  // Guardar usuario (crear o actualizar)
  const handleSave = async () => {
    const rutRaw = formData.rut ?? ''
    const popidRaw = formData.popid ?? ''
    const rutErr = getRutFieldError(rutRaw, false)
    if (rutErr) {
      setSnackbar({ open: true, message: rutErr, severity: 'error' })
      return
    }
    const popErr = validatePopidOptional(popidRaw)
    if (popErr) {
      setSnackbar({ open: true, message: popErr, severity: 'error' })
      return
    }
    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          userId: editingUser.id,
          data: formData
        })
        setSnackbar({
          open: true,
          message: 'Usuario actualizado correctamente',
          severity: 'success'
        })
        addNotification({
          message: 'Usuario actualizado correctamente',
          type: 'success'
        })
      } else {
        await createUser.mutateAsync(formData)
        setSnackbar({
          open: true,
          message: 'Usuario creado correctamente',
          severity: 'success'
        })
        addNotification({
          message: 'Usuario creado correctamente',
          type: 'success'
        })
      }
      handleCloseDialog()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al guardar usuario'
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      })
      addNotification({
        message: errorMessage,
        type: 'error'
      })
    }
  }

  // Eliminar usuario
  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return
    }

    try {
      await deleteUser.mutateAsync(userId)
      setSnackbar({
        open: true,
        message: 'Usuario eliminado correctamente',
        severity: 'success'
      })
      addNotification({
        message: 'Usuario eliminado correctamente',
        type: 'success'
      })
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al eliminar usuario',
        severity: 'error'
      })
    }
  }

  // Manejar carga masiva desde CSV
  const handleBulkUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setSnackbar({
        open: true,
        message: 'El archivo debe ser un CSV',
        severity: 'error'
      })
      return
    }

    try {
      const result = await bulkUpload.mutateAsync(file)
      const message = `Procesados: ${result.success} exitosos, ${result.errors} errores`

      setSnackbar({
        open: true,
        message,
        severity: result.errors > 0 ? 'error' : 'success'
      })

      addNotification({
        message,
        type: result.errors > 0 ? 'error' : 'success'
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cargar el archivo'
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      })
    } finally {
      // Limpiar el input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  // Actualizar solo el rol
  const handleRoleChange = async (
    userId: string,
    newRole: 'user' | 'admin'
  ) => {
    try {
      await updateUser.mutateAsync({
        userId,
        data: { role: newRole }
      })
      setSnackbar({
        open: true,
        message: 'Rol actualizado correctamente',
        severity: 'success'
      })
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al actualizar rol',
        severity: 'error'
      })
    }
  }

  // Filtrar usuarios (ejemplo usando Zustand)
  const filteredUsers = users.filter(user => {
    if (userFilter.role && user.role !== userFilter.role) return false
    if (userFilter.search) {
      const search = userFilter.search.toLowerCase()
      return (
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.rut?.toLowerCase().includes(search)
      )
    }
    return true
  })

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
        <Alert severity="error">
          Error al cargar usuarios: {error.message}
        </Alert>
      </Container>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Container
        maxWidth="lg"
        disableGutters={isNarrow}
        sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}
      >
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' },
              lineHeight: 1.25,
              pr: { xs: 0, md: 2 }
            }}
          >
            Gestión de usuarios
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              flexWrap: { sm: 'wrap' }
            }}
          >
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: '100%', sm: 160 },
                maxWidth: { xs: '100%', sm: 220 },
                flex: { sm: '1 1 160px' }
              }}
            >
              <InputLabel id="filter-role-label">Filtrar por rol</InputLabel>
              <Select
                labelId="filter-role-label"
                value={userFilter.role || ''}
                label="Filtrar por rol"
                onChange={e =>
                  setUserFilter({
                    role: e.target.value as 'user' | 'admin' | undefined
                  })
                }
                MenuProps={SELECT_MENU_PROPS}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="user">Usuario</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleBulkUpload}
              disabled={bulkUpload.isPending}
              ref={fileInputRef}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => {
                fileInputRef.current?.click()
              }}
              disabled={bulkUpload.isPending}
              sx={{
                textTransform: 'none',
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              {bulkUpload.isPending ? 'Cargando…' : 'Cargar CSV'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                textTransform: 'none',
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Nuevo usuario
            </Button>
          </Stack>
        </Stack>

        <TableContainer
          component={Paper}
          sx={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%'
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  Teléfono
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  RUT
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  PopID
                </TableCell>
                <TableCell>Rol</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id}>
                <TableCell sx={{ minWidth: { xs: 120, sm: 180 } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 2 },
                      minWidth: 0
                    }}
                  >
                    {user.image ? (
                      <Avatar
                        src={user.image}
                        alt={user.name}
                        sx={{ width: 36, height: 36, flexShrink: 0 }}
                      />
                    ) : (
                      <Avatar sx={{ width: 36, height: 36, flexShrink: 0 }}>
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                    )}
                    <Typography variant="body2" noWrap title={user.name || ''}>
                      {user.name || 'Sin nombre'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: { xs: 140, sm: 220 } }}>
                  <Typography variant="body2" noWrap title={user.email || ''}>
                    {user.email || 'Sin email'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {user.phone || '-'}
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {user.rut || '-'}
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {user.popid || '-'}
                </TableCell>
                <TableCell>
                  <FormControl
                    size="small"
                    sx={{ minWidth: { xs: 100, sm: 120 }, maxWidth: '100%' }}
                  >
                    <Select
                      value={user.role}
                      aria-label={`Rol de ${user.name || user.email}`}
                      onChange={e =>
                        handleRoleChange(
                          user.id,
                          e.target.value as 'user' | 'admin'
                        )
                      }
                      disabled={updateUser.isPending}
                      MenuProps={SELECT_MENU_PROPS}
                    >
                      <MenuItem value="user">Usuario</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton
                    color="info"
                    onClick={() => setPointsModalUser(user)}
                    size="small"
                    aria-label="Ver puntos / crédito de tienda"
                    sx={{ touchAction: 'manipulation' }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(user)}
                    size="small"
                    aria-label="Editar usuario"
                    sx={{ touchAction: 'manipulation' }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(user.id)}
                    size="small"
                    disabled={deleteUser.isPending}
                    aria-label="Eliminar usuario"
                    sx={{ touchAction: 'manipulation' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para crear/editar */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nombre"
              fullWidth
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={!!editingUser}
            />
            <TextField
              label="Teléfono"
              fullWidth
              value={formData.phone}
              onChange={e =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <TextField
              label="RUT"
              fullWidth
              value={formData.rut ?? ''}
              onChange={e => setFormData({ ...formData, rut: e.target.value })}
              onBlur={() =>
                setFormData(prev => ({
                  ...prev,
                  rut: formatRutOnBlur(prev.rut ?? '')
                }))
              }
              placeholder="12.345.678-9"
              error={
                Boolean((formData.rut ?? '').trim()) &&
                getRutFieldError(formData.rut ?? '', false) !== null
              }
              helperText={
                getRutFieldError(formData.rut ?? '', false) ??
                (!(formData.rut ?? '').trim() ? 'Opcional.' : undefined)
              }
              inputProps={{ maxLength: 20 }}
            />
            <TextField
              label="PopID"
              fullWidth
              value={formData.popid ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  popid: onlyDigits(e.target.value, 64)
                })
              }
              helperText="Opcional. Solo números."
              error={
                Boolean((formData.popid ?? '').trim()) &&
                validatePopidOptional(formData.popid ?? '') !== null
              }
              inputProps={{ maxLength: 64, inputMode: 'numeric', pattern: '[0-9]*' }}
            />
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role}
                label="Rol"
                onChange={e =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'user' | 'admin'
                  })
                }
                MenuProps={SELECT_MENU_PROPS}
              >
                <MenuItem value="user">Usuario</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={createUser.isPending || updateUser.isPending}
          >
            {createUser.isPending || updateUser.isPending
              ? 'Guardando...'
              : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!pointsModalUser}
        onClose={() => setPointsModalUser(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Puntos / crédito de tienda
          {pointsModalUser
            ? ` — ${pointsModalUser.name || pointsModalUser.email || pointsModalUser.id}`
            : ''}
        </DialogTitle>
        <DialogContent>
          {pointsModalUser && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Saldo (puntos)
                </Typography>
                <Typography variant="h6">
                  {(pointsModalUser.storePoints ?? 0).toLocaleString('es-CL')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Próximos puntos a vencer
                </Typography>
                <Typography variant="body1">
                  {(pointsModalUser.storePointsExpiringNext ?? 0).toLocaleString(
                    'es-CL'
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Fecha de vencimiento
                </Typography>
                <Typography variant="body1">
                  {pointsModalUser.storePointsExpiryDate
                    ? new Date(
                        pointsModalUser.storePointsExpiryDate
                      ).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    : '—'}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointsModalUser(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
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
