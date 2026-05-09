'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import PersonIcon from '@mui/icons-material/Person'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { invalidateStoreScopedDashboardQueries } from '@/lib/invalidate-store-scoped-queries'
import { useAppStore } from '@/store/useAppStore'

const ACCOUNT_DRAWER_WIDTH = 300

type HeaderStorePick = {
  id: string
  name: string
  slug: string
  logoUrl: string
}

export default function Header() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, status, update } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [storeMenuEl, setStoreMenuEl] = useState<null | HTMLElement>(null)
  const [storeOptions, setStoreOptions] = useState<HeaderStorePick[]>([])
  const [storeSwitchBusy, setStoreSwitchBusy] = useState(false)
  const [storeSwitchError, setStoreSwitchError] = useState<string | null>(null)
  const muiTheme = useTheme()
  const appThemeMode = useAppStore(s => s.theme)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  // Importante: evita mismatch de hidratación. En SSR + primer render del cliente
  // asumimos "mobile-first" y solo calculamos desktop tras montar.
  const [isDesktop, setIsDesktop] = useState(false)
  const desktopQuery = useMemo(() => {
    // theme.breakpoints.up('md') => '@media (min-width:900px)'
    const q = muiTheme.breakpoints.up('md')
    return q.startsWith('@media ') ? q.slice('@media '.length) : q
  }, [muiTheme])
  useEffect(() => {
    const mq = window.matchMedia(desktopQuery)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    // Safari viejo
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [desktopQuery])
  const toggleSidebar = useAppStore(s => s.toggleSidebar)

  const loadMeStores = useCallback(async () => {
    if (status !== 'authenticated') {
      setStoreOptions([])
      return
    }
    try {
      const res = await fetch('/api/me/stores')
      if (!res.ok) return
      const data = await res.json()
      const rows = Array.isArray(data.stores) ? data.stores : []
      setStoreOptions(
        rows.map(
          (r: {
            id?: string
            name?: string
            slug?: string
            logoUrl?: string
          }) => ({
            id: String(r.id ?? ''),
            name: String(r.name ?? ''),
            slug: String(r.slug ?? ''),
            logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : ''
          })
        )
      )
    } catch {
      setStoreOptions([])
    }
  }, [status])

  useEffect(() => {
    void loadMeStores()
  }, [loadMeStores])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleAccountClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isDesktop) handleMenu(event)
    else setAccountDrawerOpen(true)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const closeAccountDrawer = () => setAccountDrawerOpen(false)

  const handleLogout = async () => {
    handleClose()
    closeAccountDrawer()
    await signOut({ callbackUrl: '/' })
  }

  const activeStoreId = session?.user?.activeStoreId?.trim() || null
  const activeStoreLogo = (() => {
    const hit = storeOptions.find(s => s.id === activeStoreId)
    return (hit?.logoUrl ?? '').trim()
  })()

  const pickStoreContext = async (storeId: string) => {
    if (!storeId || storeId === activeStoreId) {
      setStoreMenuEl(null)
      return
    }
    setStoreSwitchError(null)
    setStoreSwitchBusy(true)
    try {
      const res = await fetch('/api/me/active-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(
          typeof j?.error === 'string'
            ? j.error
            : 'No se pudo cambiar de tienda'
        )
      }
      const data = (await res.json()) as { activeStoreId?: string }
      await update({
        activeStoreId:
          typeof data.activeStoreId === 'string' ? data.activeStoreId : storeId
      })
      await invalidateStoreScopedDashboardQueries(queryClient)
      await loadMeStores()
      router.refresh()
    } catch (e) {
      setStoreSwitchError(
        e instanceof Error ? e.message : 'No se pudo cambiar de tienda'
      )
    } finally {
      setStoreSwitchBusy(false)
      setStoreMenuEl(null)
    }
  }

  const showStoreSwitcher =
    session?.user &&
    status === 'authenticated' &&
    storeOptions.filter(s => s.id).length > 1

  return (
    <AppBar position="static">
      <Toolbar>
        {!isDesktop && (
          <Tooltip title="Menú">
            <IconButton
              color="inherit"
              aria-label="abrir menú"
              onClick={toggleSidebar}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { opacity: 0.9 }
          }}
        >
          TCGFamily HUB
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showStoreSwitcher ? (
            <>
              <Tooltip
                title={
                  session?.user?.storeRole === 'store_admin'
                    ? 'Tienda del dashboard y permisos: eventos semanales, correos físicos y crédito sólo para la tienda indicada.'
                    : 'Tienda para el dashboard (eventos semanales, correos físicos y crédito); en cada módulo admin operas contra la ubicación seleccionada.'
                }
              >
                <IconButton
                  color="inherit"
                  aria-haspopup="true"
                  aria-expanded={Boolean(storeMenuEl)}
                  aria-label="Cambiar tienda de contexto"
                  disabled={storeSwitchBusy}
                  onClick={e => setStoreMenuEl(e.currentTarget)}
                  sx={{ p: activeStoreLogo ? 0.5 : 1 }}
                >
                  {activeStoreLogo ? (
                    <Avatar
                      variant="rounded"
                      src={activeStoreLogo}
                      alt=""
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: 'rgba(255,255,255,0.22)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        '& .MuiAvatar-img': {
                          objectFit: 'contain',
                          p: 0.25
                        }
                      }}
                    >
                      <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                  ) : (
                    <StorefrontOutlinedIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={storeMenuEl}
                open={Boolean(storeMenuEl)}
                onClose={() => !storeSwitchBusy && setStoreMenuEl(null)}
                disableScrollLock
                slotProps={{
                  paper: { sx: { maxHeight: 'min(70vh, 420px)' } }
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem disabled dense sx={{ opacity: '1!important' }}>
                  <Box sx={{ maxWidth: 300, py: 0.25, whiteSpace: 'normal' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 0.5 }}
                    >
                      <strong>Vista dashboard:</strong> la tienda marcada
                      muestra sólo sus eventos, correos y tu crédito en esa
                      ubicación (se solicitan datos al cambiarla).
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {session?.user?.storeRole === 'store_admin'
                        ? 'Como admin de tienda gestionás únicamente lo permitido sobre las ubicaciones donde te asignaron acceso.'
                        : 'Como owner (HQ) cambiás acá para ver y operar contra la ubicación que necesitas en cada visita.'}
                    </Typography>
                  </Box>
                </MenuItem>
                {storeOptions
                  .filter(s => s.id)
                  .map(s => (
                    <MenuItem
                      key={s.id}
                      selected={activeStoreId === s.id}
                      disabled={storeSwitchBusy}
                      onClick={() => void pickStoreContext(s.id)}
                    >
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{ width: '100%', py: 0.25 }}
                      >
                        <Avatar
                          variant="rounded"
                          src={(s.logoUrl ?? '').trim() || undefined}
                          alt=""
                          sx={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            '& .MuiAvatar-img': {
                              objectFit: 'contain',
                              p: 0.25
                            }
                          }}
                        >
                          <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <ListItemText
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: activeStoreId === s.id ? 700 : undefined
                          }}
                          primary={s.name}
                          secondary={s.slug}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
              </Menu>
            </>
          ) : null}
          <Tooltip
            title={appThemeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            <IconButton
              color="inherit"
              onClick={() => toggleTheme()}
              aria-label={
                appThemeMode === 'dark'
                  ? 'Activar modo claro'
                  : 'Activar modo oscuro'
              }
            >
              {appThemeMode === 'dark' ? (
                <LightModeOutlinedIcon />
              ) : (
                <DarkModeOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>
          {/* User Menu */}
          {session?.user && (
            <>
              <Tooltip title="Configuración de cuenta">
                <IconButton
                  size="large"
                  onClick={handleAccountClick}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  {session.user.image ? (
                    <Avatar
                      src={session.user.image}
                      alt={session.user.name || 'Usuario'}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <AccountCircleIcon />
                  )}
                </IconButton>
              </Tooltip>
              {isDesktop ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  disableScrollLock
                  slotProps={{
                    paper: {
                      sx: { maxHeight: 'min(70vh, 480px)' }
                    }
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                  }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {session.user.name}
                    </Typography>
                  </MenuItem>
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {session.user.email}
                    </Typography>
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    href="/dashboard/perfil"
                    onClick={handleClose}
                  >
                    <PersonIcon sx={{ mr: 1 }} />
                    Perfil
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Cerrar sesión
                  </MenuItem>
                </Menu>
              ) : (
                <Drawer
                  anchor="right"
                  open={accountDrawerOpen}
                  onClose={closeAccountDrawer}
                  disableScrollLock
                  ModalProps={{ keepMounted: true }}
                  slotProps={{
                    paper: {
                      sx: {
                        width: `min(100vw, ${ACCOUNT_DRAWER_WIDTH}px)`,
                        boxSizing: 'border-box'
                      }
                    }
                  }}
                >
                  <Toolbar
                    sx={{
                      justifyContent: 'space-between',
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      Cuenta
                    </Typography>
                    <IconButton
                      edge="end"
                      aria-label="cerrar"
                      onClick={closeAccountDrawer}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Toolbar>
                  <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {session.user.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {session.user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ py: 1 }}>
                    <ListItemButton
                      component={Link}
                      href="/dashboard/perfil"
                      onClick={closeAccountDrawer}
                    >
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText primary="Perfil" />
                    </ListItemButton>
                    <ListItemButton onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon />
                      </ListItemIcon>
                      <ListItemText primary="Cerrar sesión" />
                    </ListItemButton>
                  </Box>
                </Drawer>
              )}
            </>
          )}
        </Box>
      </Toolbar>
      <Snackbar
        open={Boolean(storeSwitchError)}
        autoHideDuration={6000}
        onClose={() => setStoreSwitchError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setStoreSwitchError(null)}>
          {storeSwitchError}
        </Alert>
      </Snackbar>
    </AppBar>
  )
}
