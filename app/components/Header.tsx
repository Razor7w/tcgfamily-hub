'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import BrandLogo from '@/components/brand/BrandLogo'
import HeaderNotificationsButton from '@/components/notifications/HeaderNotificationsButton'
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
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha, useTheme } from '@mui/material/styles'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import PersonIcon from '@mui/icons-material/Person'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SearchIcon from '@mui/icons-material/Search'
import CheckIcon from '@mui/icons-material/Check'
import { setHubActiveStoreHeaderSync } from '@/lib/active-store-hub-sync-flag'
import { useMeStores } from '@/hooks/useMeStores'
import { isStoreContextHubPath } from '@/lib/store-context-hub-path'
import { useAppStore } from '@/store/useAppStore'

const ACCOUNT_DRAWER_WIDTH = 300

type HeaderStorePick = {
  id: string
  name: string
  slug: string
  logoUrl: string
}

function storeMatchesFilter(store: HeaderStorePick, raw: string) {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  const hay = `${store.name} ${store.slug}`.toLowerCase()
  return hay.includes(q)
}

function StorePickerPanel({
  stores,
  activeStoreId,
  busy,
  onPick,
  sheet
}: {
  stores: HeaderStorePick[]
  activeStoreId: string | null
  busy: boolean
  onPick: (store: HeaderStorePick) => void
  /** True: lista ocupa el alto restante del bottom sheet */
  sheet?: boolean
}) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const [filter, setFilter] = useState('')
  const filtered = useMemo(
    () => stores.filter(s => storeMatchesFilter(s, filter)),
    [stores, filter]
  )

  const listSx = sheet
    ? {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto' as const,
        px: 0,
        pb: 1,
        pt: 0.75,
        scrollbarGutter: 'stable' as const
      }
    : {
        maxHeight: 'min(52vh, 440px)',
        overflowY: 'auto' as const,
        px: 0,
        pb: 1,
        pt: 0.75,
        scrollbarGutter: 'stable' as const
      }

  /** Curva alineada con app/theme/theme.ts (botones) */
  const easeOutExpo = 'cubic-bezier(0.16, 1, 0.3, 1)'
  const txSurface = `background-color 280ms ${easeOutExpo}, border-color 280ms ${easeOutExpo}, box-shadow 280ms ${easeOutExpo}`
  const txTap = `transform 200ms ${easeOutExpo}`

  const primaryMain = theme.palette.primary.main
  const primaryDark = theme.palette.primary.dark
  const rowBorder =
    mode === 'dark'
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.text.primary, 0.12)
  const rowBg =
    mode === 'dark' ? theme.palette.background.paper : theme.palette.grey[50]
  const searchBg =
    mode === 'dark'
      ? alpha(theme.palette.common.white, 0.06)
      : alpha(theme.palette.text.primary, 0.045)

  return (
    <Stack spacing={2} sx={sheet ? { flex: 1, minHeight: 0 } : undefined}>
      {busy ? (
        <LinearProgress
          color="primary"
          sx={{
            height: 3,
            borderRadius: 999,
            flexShrink: 0,
            bgcolor: alpha(primaryMain, 0.12)
          }}
        />
      ) : (
        <Box sx={{ height: 3, flexShrink: 0 }} aria-hidden />
      )}
      <TextField
        size="small"
        fullWidth
        placeholder="Buscar por nombre o slug"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        disabled={busy}
        sx={{
          flexShrink: 0,
          '& .MuiOutlinedInput-root': {
            borderRadius: 999,
            bgcolor: searchBg,
            transition: txSurface,
            '& fieldset': {
              borderWidth: '1px',
              borderColor: rowBorder
            },
            '&:hover fieldset': {
              borderColor:
                mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.18)
                  : alpha(theme.palette.text.primary, 0.18)
            },
            '&.Mui-focused fieldset': {
              borderWidth: '1px',
              borderColor: primaryMain
            },
            '&.Mui-focused': {
              bgcolor:
                mode === 'dark'
                  ? alpha(primaryMain, 0.09)
                  : alpha(primaryMain, 0.06),
              boxShadow: `inset 0 0 0 1px ${alpha(primaryMain, 0.35)}`
            }
          },
          '& .MuiInputBase-input': {
            fontWeight: 500,
            letterSpacing: '-0.012em',
            fontSize: '0.9375rem',
            '&::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 0.65
            }
          },
          '& .MuiInputBase-input.Mui-disabled': {
            WebkitTextFillColor: theme.palette.text.disabled
          }
        }}
        aria-label="Filtrar tiendas por nombre o slug"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={{
                  fontSize: 20,
                  color: 'text.secondary',
                  opacity: 0.55
                }}
              />
            </InputAdornment>
          )
        }}
      />
      <Box sx={listSx}>
        {filtered.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 5, px: 2 }}>
            <StorefrontOutlinedIcon
              sx={{
                fontSize: 42,
                color: 'text.disabled',
                opacity: 0.45
              }}
              aria-hidden
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                textAlign: 'center',
                maxWidth: 280,
                textWrap: 'balance',
                lineHeight: 1.55,
                fontWeight: 500
              }}
            >
              No hay tiendas que coincidan con tu búsqueda.
            </Typography>
          </Stack>
        ) : (
          filtered.map(store => {
            const selected = activeStoreId === store.id
            return (
              <ListItemButton
                key={store.id}
                selected={selected}
                disableRipple
                disabled={busy}
                onClick={() => onPick(store)}
                alignItems="center"
                sx={{
                  borderRadius: '12px',
                  py: 1.375,
                  px: 1.375,
                  mb: 1.125,
                  gap: 1.5,
                  bgcolor: rowBg,
                  border: '1px solid',
                  borderColor: rowBorder,
                  boxShadow: 'none',
                  transition: `${txSurface}, ${txTap}`,
                  transform: 'translateZ(0)',
                  scrollMarginBottom: 10,
                  '&.Mui-selected': {
                    bgcolor:
                      mode === 'dark'
                        ? alpha(primaryMain, 0.14)
                        : alpha(primaryMain, 0.085),
                    borderColor: alpha(
                      primaryMain,
                      mode === 'dark' ? 0.45 : 0.32
                    ),
                    boxShadow: `inset 4px 0 0 ${primaryDark}`
                  },
                  '&.Mui-selected:hover': {
                    bgcolor:
                      mode === 'dark'
                        ? alpha(primaryMain, 0.18)
                        : alpha(primaryMain, 0.1),
                    borderColor: alpha(primaryMain, 0.4)
                  },
                  '&:hover:not(.Mui-selected)': {
                    bgcolor:
                      mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.05)
                        : alpha(theme.palette.text.primary, 0.035),
                    borderColor:
                      mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.16)
                        : alpha(theme.palette.text.primary, 0.16)
                  },
                  '&:active': {
                    transform: 'scale(0.99)'
                  },
                  '&.Mui-focusVisible': {
                    outline: `2px solid ${alpha(primaryMain, 0.65)}`,
                    outlineOffset: 2
                  },
                  '&.Mui-disabled': {
                    opacity: 0.5
                  }
                }}
              >
                <Avatar
                  src={(store.logoUrl ?? '').trim() || undefined}
                  alt={`Logo ${store.name}`}
                  sx={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    bgcolor:
                      mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.08)
                        : alpha(theme.palette.text.primary, 0.06),
                    border: 'none',
                    transition: txSurface,
                    '& .MuiAvatar-img': { objectFit: 'contain', p: 0.35 }
                  }}
                >
                  <StorefrontOutlinedIcon
                    sx={{
                      fontSize: 22,
                      color: 'text.secondary',
                      opacity: 0.45
                    }}
                  />
                </Avatar>
                <ListItemText
                  sx={{ flex: '1 1 auto', minWidth: 0, my: 0 }}
                  primary={store.name}
                  secondary={store.slug}
                  primaryTypographyProps={{
                    variant: 'body1',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3,
                    color: 'text.primary',
                    noWrap: true
                  }}
                  secondaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 400,
                    color: 'text.secondary',
                    noWrap: true,
                    sx: { mt: 0.125, opacity: 0.92 }
                  }}
                />
                {selected ? (
                  <CheckIcon
                    sx={{
                      flexShrink: 0,
                      fontSize: 22,
                      color: primaryMain
                    }}
                  />
                ) : null}
              </ListItemButton>
            )
          })
        )}
      </Box>
    </Stack>
  )
}

export default function Header() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, status, update } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [storePickerOpen, setStorePickerOpen] = useState(false)
  const [storePickerKey, setStorePickerKey] = useState(0)
  const { data: meStoresRes } = useMeStores()
  const storeOptions = useMemo<HeaderStorePick[]>(() => {
    const rows = meStoresRes?.stores ?? []
    return rows.map(r => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
      logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : ''
    }))
  }, [meStoresRes?.stores])
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

  useEffect(() => {
    setStorePickerOpen(false)
    setAccountDrawerOpen(false)
    setAnchorEl(null)
  }, [pathname])

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

  /** Cierra overlays del header antes de navegar (evita removeChild con Menu/Drawer + Link). */
  const goToPerfil = () => {
    handleClose()
    closeAccountDrawer()
    window.setTimeout(() => {
      router.push('/dashboard/perfil')
    }, 0)
  }

  const handleLogout = async () => {
    handleClose()
    closeAccountDrawer()
    queryClient.removeQueries({ queryKey: ['me', 'stores'] })
    await signOut({ callbackUrl: '/' })
  }

  const activeStoreId = session?.user?.activeStoreId?.trim() || null
  const activeStoreRow = storeOptions.find(s => s.id === activeStoreId)
  const activeStoreName = (activeStoreRow?.name ?? '').trim()
  const activeStoreLogo = (() => {
    return (activeStoreRow?.logoUrl ?? '').trim()
  })()

  const closeStorePicker = () => setStorePickerOpen(false)

  const openStorePicker = () => {
    setStorePickerKey(k => k + 1)
    setStorePickerOpen(true)
  }

  const pickStoreContext = async (storeId: string, slugPreferred?: string) => {
    if (!storeId || storeId === activeStoreId) {
      closeStorePicker()
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
      const nextActiveId =
        typeof data.activeStoreId === 'string' ? data.activeStoreId : storeId

      setHubActiveStoreHeaderSync(nextActiveId)

      let slug =
        (typeof slugPreferred === 'string' ? slugPreferred.trim() : '') ||
        storeOptions.find(s => s.id === storeId)?.slug?.trim()
      if (!slug) {
        const row = storeOptions.find(s => s.id === storeId)
        slug = row?.slug?.trim() ?? ''
      }

      await update({ activeStoreId: nextActiveId })

      const pathForStoreUrl =
        typeof window !== 'undefined' ? window.location.pathname : ''
      if (slug && isStoreContextHubPath(pathForStoreUrl)) {
        router.replace(`/${encodeURIComponent(slug)}`)
      }
      // Cambiar tienda ya actualiza TanStack Query (queryKey usa activeStoreId); invalidar
      // también refetchaba y duplicaba /api/events, /api/mail/me, etc.

      // Re-ejecutar layouts servidor (p. ej. DashboardRouteLayout → sidebar según storeRole).
      // Si ya navegamos por slug, la página hub suele tener activeStoreId alineado y no llama
      // router.refresh(); sin esto el menú queda con isAdmin/isOwner de la sesión anterior.
      router.refresh()
    } catch (e) {
      setStoreSwitchError(
        e instanceof Error ? e.message : 'No se pudo cambiar de tienda'
      )
    } finally {
      setStoreSwitchBusy(false)
      closeStorePicker()
    }
  }

  const showStoreSwitcher =
    session?.user &&
    status === 'authenticated' &&
    storeOptions.filter(s => s.id).length >= 1

  const storeOptionsWithId = useMemo(
    () => storeOptions.filter(s => s.id),
    [storeOptions]
  )

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 1, sm: 1.5, md: 2 },
          gap: 0.5,
          overflow: 'hidden'
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.25, sm: 0.5 }}
          sx={{ minWidth: 0, flex: 1 }}
        >
          {!isDesktop ? (
            <Tooltip title="Menú">
              <IconButton
                color="inherit"
                size="small"
                aria-label="abrir menú"
                onClick={toggleSidebar}
                sx={{ flexShrink: 0, ml: -0.25 }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Box
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <BrandLogo variant="wordmark" size="sm" surface="dark" href="/" />
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0, sm: 0.25 }}
          sx={{ flexShrink: 0 }}
        >
          {showStoreSwitcher ? (
            <>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.25}
                sx={{ minWidth: 0 }}
              >
                {activeStoreName ? (
                  <Typography
                    variant="body2"
                    component="span"
                    noWrap
                    sx={{
                      display: { xs: 'none', sm: 'inline-block' },
                      maxWidth: { sm: 220 },
                      fontWeight: 600,
                      color: 'inherit',
                      opacity: 0.95
                    }}
                  >
                    {activeStoreName}
                  </Typography>
                ) : null}
                <Tooltip
                  title={
                    session?.user?.storeRole === 'store_admin'
                      ? 'Tienda del dashboard y permisos: eventos semanales, correos físicos y crédito sólo para la tienda indicada.'
                      : 'Tienda para el dashboard (eventos semanales, correos físicos y crédito).'
                  }
                >
                  <IconButton
                    color="inherit"
                    size="small"
                    aria-haspopup="dialog"
                    aria-expanded={storePickerOpen}
                    aria-label="Cambiar tienda de contexto"
                    data-tour="store-switcher"
                    disabled={storeSwitchBusy}
                    onClick={() => openStorePicker()}
                    sx={{ p: activeStoreLogo ? 0.375 : 0.75, flexShrink: 0 }}
                  >
                    {activeStoreLogo ? (
                      <Avatar
                        variant="rounded"
                        src={activeStoreLogo}
                        alt=""
                        sx={{
                          width: { xs: 26, sm: 28 },
                          height: { xs: 26, sm: 28 },
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
              </Stack>
              {storePickerOpen && isDesktop ? (
                <Dialog
                  open
                  fullWidth
                  maxWidth="sm"
                  disableScrollLock
                  onClose={() => !storeSwitchBusy && closeStorePicker()}
                  aria-labelledby="store-picker-dialog-title"
                  slotProps={{
                    backdrop: {
                      sx: {
                        backgroundColor: alpha(
                          muiTheme.palette.common.black,
                          muiTheme.palette.mode === 'dark' ? 0.52 : 0.28
                        ),
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }
                    },
                    paper: {
                      sx: {
                        borderRadius: '22px',
                        maxHeight: 'min(88vh, 560px)',
                        overflow: 'hidden',
                        border: `1px solid ${alpha(muiTheme.palette.text.primary, muiTheme.palette.mode === 'dark' ? 0.12 : 0.08)}`,
                        boxShadow:
                          muiTheme.palette.mode === 'dark'
                            ? `0 28px 56px ${alpha('#000', 0.45)}, inset 0 1px 0 ${alpha(muiTheme.palette.common.white, 0.06)}`
                            : `0 24px 48px -14px ${alpha('#18181b', 0.12)}, inset 0 1px 0 ${alpha('#fff', 0.65)}`
                      }
                    }
                  }}
                >
                  <DialogTitle
                    id="store-picker-dialog-title"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      py: 1.5,
                      pl: 2,
                      pr: 2,
                      borderBottom: `1px solid ${alpha(muiTheme.palette.text.primary, muiTheme.palette.mode === 'dark' ? 0.1 : 0.08)}`,
                      bgcolor: muiTheme.palette.background.paper
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="span"
                      sx={{
                        fontSize: '1.0625rem',
                        fontWeight: 700,
                        letterSpacing: '-0.025em',
                        lineHeight: 1.25
                      }}
                    >
                      Cambiar tienda
                    </Typography>
                    <IconButton
                      aria-label="cerrar"
                      disabled={storeSwitchBusy}
                      onClick={() => closeStorePicker()}
                      sx={{
                        transition: muiTheme.transitions.create(
                          ['background-color', 'transform'],
                          { duration: 200 }
                        ),
                        '&:hover': {
                          bgcolor: alpha(muiTheme.palette.text.primary, 0.06)
                        },
                        '&:active': { transform: 'scale(0.94)' }
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </DialogTitle>
                  <DialogContent
                    sx={{
                      pt: 2,
                      pb: 2.5,
                      px: { xs: 2, sm: 2.25 },
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      bgcolor: muiTheme.palette.background.paper
                    }}
                  >
                    <StorePickerPanel
                      key={storePickerKey}
                      stores={storeOptionsWithId}
                      activeStoreId={activeStoreId}
                      busy={storeSwitchBusy}
                      onPick={s => void pickStoreContext(s.id, s.slug)}
                    />
                  </DialogContent>
                </Dialog>
              ) : null}
              {storePickerOpen && !isDesktop ? (
                <Drawer
                  anchor="bottom"
                  open
                  onClose={() => !storeSwitchBusy && closeStorePicker()}
                  disableScrollLock
                  ModalProps={{ keepMounted: false }}
                  slotProps={{
                    backdrop: {
                      sx: {
                        backgroundColor: alpha(
                          muiTheme.palette.common.black,
                          muiTheme.palette.mode === 'dark' ? 0.48 : 0.26
                        ),
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }
                    },
                    paper: {
                      sx: {
                        width: '100%',
                        maxWidth: '100%',
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        maxHeight: 'min(88vh, 620px)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        bgcolor: muiTheme.palette.background.paper,
                        borderTop: `1px solid ${alpha(muiTheme.palette.text.primary, muiTheme.palette.mode === 'dark' ? 0.12 : 0.08)}`,
                        boxShadow:
                          muiTheme.palette.mode === 'dark'
                            ? `0 -16px 44px ${alpha('#000', 0.42)}, inset 0 1px 0 ${alpha(muiTheme.palette.common.white, 0.05)}`
                            : `0 -14px 40px ${alpha('#18181b', 0.1)}, inset 0 1px 0 ${alpha('#fff', 0.55)}`
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      pt: 1.25,
                      pb: 0.25,
                      flexShrink: 0
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 5,
                        borderRadius: 999,
                        bgcolor: alpha(
                          muiTheme.palette.text.primary,
                          muiTheme.palette.mode === 'dark' ? 0.18 : 0.14
                        )
                      }}
                      aria-hidden
                    />
                  </Box>
                  <Toolbar
                    variant="dense"
                    disableGutters
                    sx={{
                      minHeight: 48,
                      pl: 2,
                      pr: 2.5,
                      gap: 1,
                      flexShrink: 0,
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${alpha(muiTheme.palette.text.primary, muiTheme.palette.mode === 'dark' ? 0.1 : 0.08)}`,
                      bgcolor: muiTheme.palette.background.paper
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: '-0.025em'
                      }}
                    >
                      Cambiar tienda
                    </Typography>
                    <IconButton
                      aria-label="cerrar"
                      disabled={storeSwitchBusy}
                      onClick={() => closeStorePicker()}
                      sx={{
                        transition: muiTheme.transitions.create(
                          ['background-color', 'transform'],
                          { duration: 200 }
                        ),
                        '&:hover': {
                          bgcolor: alpha(muiTheme.palette.text.primary, 0.06)
                        },
                        '&:active': { transform: 'scale(0.94)' }
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Toolbar>
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      px: 2,
                      pt: 2,
                      pb: 'max(16px, env(safe-area-inset-bottom))',
                      bgcolor: muiTheme.palette.background.paper
                    }}
                  >
                    <StorePickerPanel
                      key={storePickerKey}
                      sheet
                      stores={storeOptionsWithId}
                      activeStoreId={activeStoreId}
                      busy={storeSwitchBusy}
                      onPick={s => void pickStoreContext(s.id, s.slug)}
                    />
                  </Box>
                </Drawer>
              ) : null}
            </>
          ) : null}
          <HeaderNotificationsButton />
          {isDesktop ? (
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
          ) : null}
          {/* User Menu */}
          {session?.user && (
            <>
              <Tooltip title="Configuración de cuenta">
                <IconButton
                  size="small"
                  onClick={handleAccountClick}
                  color="inherit"
                  sx={{ p: 0.25, flexShrink: 0 }}
                >
                  {session.user.image ? (
                    <Avatar
                      src={session.user.image}
                      alt={session.user.name || 'Usuario'}
                      sx={{ width: 28, height: 28 }}
                    />
                  ) : (
                    <AccountCircleIcon sx={{ fontSize: 28 }} />
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
                  <MenuItem onClick={goToPerfil}>
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
                  ModalProps={{ keepMounted: false }}
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
                      onClick={() => {
                        toggleTheme()
                      }}
                    >
                      <ListItemIcon>
                        {appThemeMode === 'dark' ? (
                          <LightModeOutlinedIcon />
                        ) : (
                          <DarkModeOutlinedIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          appThemeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'
                        }
                      />
                    </ListItemButton>
                    <ListItemButton onClick={goToPerfil}>
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
        </Stack>
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
