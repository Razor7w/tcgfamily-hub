'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Pagination from '@mui/material/Pagination'
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
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'

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
import { formatRutOnBlur, getRutFieldError, onlyDigits } from '@/lib/rut-input'
import { validatePopidOptional } from '@/lib/rut-chile'
import { format } from 'rut.js'

const PAGE_SIZE = 10

function matchesRutQuery(
  userRut: string | undefined,
  queryRaw: string
): boolean {
  const q = queryRaw.trim().toLowerCase()
  if (!q) return true
  const rut = (userRut ?? '').toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  if (qDigits.length > 0) {
    return rut.replace(/\D/g, '').includes(qDigits)
  }
  return rut.includes(q)
}

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
  const [page, setPage] = useState(1)
  const [searchName, setSearchName] = useState('')
  const [searchRut, setSearchRut] = useState('')
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
  const clearUserFilterStore = useAppStore(state => state.clearUserFilter)
  const addNotification = useAppStore(state => state.addNotification)

  const roleToggleValue =
    userFilter.role === 'user' || userFilter.role === 'admin'
      ? userFilter.role
      : 'all'

  const hasActiveFilters =
    Boolean(userFilter.role) ||
    Boolean(searchName.trim()) ||
    Boolean(searchRut.trim())

  const handleClearFilters = () => {
    clearUserFilterStore()
    setSearchName('')
    setSearchRut('')
  }

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

  // Filtrar usuarios (rol en Zustand; nombre y RUT en estado local)
  const filteredUsers = useMemo(() => {
    const nameQ = searchName.trim().toLowerCase()
    return users.filter(user => {
      if (userFilter.role && user.role !== userFilter.role) return false
      if (nameQ) {
        const n = user.name?.toLowerCase() ?? ''
        if (!n.includes(nameQ)) return false
      }
      if (!matchesRutQuery(user.rut, searchRut)) return false
      return true
    })
  }, [users, userFilter.role, searchName, searchRut])

  useEffect(() => {
    setPage(1)
  }, [userFilter.role, searchName, searchRut])

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))

  useEffect(() => {
    setPage(p => (p > pageCount ? pageCount : p))
  }, [pageCount, filteredUsers.length])

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

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
            Error al cargar usuarios: {error.message}
          </Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={t => ({
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        minHeight: '100vh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`
      })}
    >
      <Container
        maxWidth="lg"
        disableGutters={isNarrow}
        sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}
      >
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
          >
            <PeopleOutlined color="primary" sx={{ fontSize: 40 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                Gestión de usuarios
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Alta, edición, importación CSV y consulta de puntos de tienda
                por usuario.
              </Typography>
            </Box>
          </Stack>

          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5 }}
            >
              Filtros y acciones
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.75 }}
                >
                  Rol
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={roleToggleValue}
                  onChange={(_, v: 'all' | 'user' | 'admin' | null) => {
                    if (v == null) return
                    if (v === 'all') setUserFilter({ role: undefined })
                    else setUserFilter({ role: v })
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
                  <ToggleButton value="user">Usuario</ToggleButton>
                  <ToggleButton value="admin" color="secondary">
                    Admin
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                useFlexGap
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  flexWrap: { sm: 'wrap' }
                }}
              >
                <TextField
                  size="small"
                  label="Buscar por nombre"
                  placeholder="Nombre del usuario"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  sx={{
                    minWidth: { xs: '100%', sm: 200 },
                    flex: { sm: '1 1 200px' }
                  }}
                  inputProps={{ 'aria-label': 'Buscar por nombre' }}
                />
                <TextField
                  size="small"
                  label="Buscar por RUT"
                  placeholder="Ej: 12345678 o 12.345.678-9"
                  value={searchRut}
                  onChange={e => setSearchRut(e.target.value)}
                  onBlur={() => setSearchRut(prev => formatRutOnBlur(prev))}
                  sx={{
                    minWidth: { xs: '100%', sm: 200 },
                    flex: { sm: '1 1 200px' }
                  }}
                  inputProps={{ maxLength: 20, 'aria-label': 'Buscar por RUT' }}
                />

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
          </Paper>
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {filteredUsers.length === 0
              ? 'Sin resultados con los filtros actuales'
              : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuario' : 'usuarios'}`}
          </Typography>
          {hasActiveFilters && (
            <Button size="small" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </Stack>

        {filteredUsers.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ py: 6, px: 2, textAlign: 'center', borderRadius: 2 }}
          >
            <Typography color="text.secondary" variant="body1" gutterBottom>
              No hay usuarios que coincidan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ajusta el rol, el nombre o el RUT, o restablece los filtros.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearFilters}
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
              {paginatedUsers.map(user => {
                return (
                  <Card
                    key={user.id}
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
                          alignItems: 'flex-start',
                          gap: 1.5,
                          mb: 1.5
                        }}
                      >
                        {user.image ? (
                          <Avatar
                            src={user.image}
                            alt={user.name}
                            sx={{ width: 44, height: 44, flexShrink: 0 }}
                          />
                        ) : (
                          <Avatar sx={{ width: 44, height: 44, flexShrink: 0 }}>
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                            sx={{ mb: 0.5 }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              noWrap
                              title={user.name || ''}
                            >
                              {user.name || 'Sin nombre'}
                            </Typography>
                            <Chip
                              label={
                                user.role === 'admin' ? 'Admin' : 'Usuario'
                              }
                              size="small"
                              color={
                                user.role === 'admin' ? 'secondary' : 'default'
                              }
                              variant="outlined"
                              sx={{ fontWeight: 600, flexShrink: 0 }}
                            />
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ wordBreak: 'break-word' }}
                          >
                            {user.email || 'Sin email'}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                        <Typography variant="body2">
                          <strong>RUT:</strong> {format(user.rut ?? '') || '—'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>PopID:</strong> {user.popid || '—'}
                        </Typography>
                      </Stack>
                    </CardContent>
                    <CardActions
                      sx={{
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        pt: 0,
                        px: 2,
                        pb: 2,
                        gap: 0.5
                      }}
                    >
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
                {filteredUsers.length === 0
                  ? ''
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredUsers.length)} de ${filteredUsers.length}`}
              </Typography>
            </Box>
          </>
        )}

        {/* Diálogo para crear/editar */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          aria-labelledby="admin-user-dialog-title"
        >
          <DialogTitle id="admin-user-dialog-title">
            {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
            >
              <TextField
                label="Nombre"
                fullWidth
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                onChange={e =>
                  setFormData({ ...formData, rut: e.target.value })
                }
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
                inputProps={{
                  maxLength: 64,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
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
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={createUser.isPending || updateUser.isPending}
            >
              {createUser.isPending || updateUser.isPending
                ? 'Guardando…'
                : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!pointsModalUser}
          onClose={() => setPointsModalUser(null)}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          aria-labelledby="admin-points-dialog-title"
        >
          <DialogTitle id="admin-points-dialog-title">
            Crédito de tienda
            {pointsModalUser
              ? ` — ${pointsModalUser.name || pointsModalUser.email || pointsModalUser.id}`
              : ''}
          </DialogTitle>
          <DialogContent dividers>
            {pointsModalUser && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: theme =>
                      alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === 'dark' ? 0.14 : 0.08
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
                    Saldo actual (puntos)
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {(pointsModalUser.storePoints ?? 0).toLocaleString('es-CL')}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Equivalente aprox.:{' '}
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      maximumFractionDigits: 0
                    }).format(pointsModalUser.storePoints ?? 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Próximos puntos a vencer
                  </Typography>
                  <Typography variant="body1">
                    {(
                      pointsModalUser.storePointsExpiringNext ?? 0
                    ).toLocaleString('es-CL')}
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
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              variant="contained"
              onClick={() => setPointsModalUser(null)}
            >
              Cerrar
            </Button>
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
