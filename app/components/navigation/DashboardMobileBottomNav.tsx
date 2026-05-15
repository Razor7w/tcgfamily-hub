'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AccountCircleOutlined,
  Home,
  Storefront,
  Style
} from '@mui/icons-material'
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Tooltip,
  useTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'
import { isStoreContextHubPath } from '@/lib/store-context-hub-path'

/** Altura base del nav (sin safe area ni padding del shell); alinear con padding del main en SidebarLayout */
export const DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT_PX = 56

/** Padding inferior del área principal en móvil para no tapar contenido con la barra fija */
export const DASHBOARD_MOBILE_BOTTOM_NAV_CONTENT_PADDING = `calc(${DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT_PX}px + 6px + env(safe-area-inset-bottom, 0px))`

function isUnderDecklistNav(path: string) {
  return (
    path === '/dashboard/decklists' ||
    path.startsWith('/dashboard/decklists/') ||
    path.startsWith('/dashboard/deck-builder')
  )
}

function mobileNavValue(
  pathname: string
): false | 'home' | 'stores' | 'decks' | 'account' {
  if (pathname === '/dashboard') return 'home'
  if (pathname === '/dashboard/tiendas' || isStoreContextHubPath(pathname)) {
    return 'stores'
  }
  if (isUnderDecklistNav(pathname)) return 'decks'
  if (
    pathname === '/dashboard/mi-cuenta' ||
    pathname.startsWith('/dashboard/mi-cuenta/')
  ) {
    return 'account'
  }
  if (
    pathname === '/dashboard/perfil' ||
    pathname.startsWith('/dashboard/perfil/')
  ) {
    return 'account'
  }
  return false
}

export default function DashboardMobileBottomNav() {
  const theme = useTheme()
  const pathname = usePathname() ?? ''
  const storeHubHref = useStoreHubHref()
  const selected = mobileNavValue(pathname)

  const actionSx = {
    minWidth: 0,
    maxWidth: 'none',
    px: 1,
    '& .MuiBottomNavigationAction-label': {
      display: 'none'
    }
  }

  return (
    <Paper
      component="nav"
      aria-label="Accesos rápidos"
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        pt: 0.25,
        borderRadius: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(
          theme.palette.background.paper,
          theme.palette.mode === 'dark' ? 0.94 : 0.98
        ),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        pb: 'env(safe-area-inset-bottom, 0px)',
        // Sombra neutra (sin glow de acento)
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 -8px 28px ${alpha('#000', 0.35)}`
            : `0 -8px 26px ${alpha(theme.palette.grey[900], 0.08)}`
      }}
    >
      <BottomNavigation
        value={selected}
        showLabels={false}
        sx={{
          bgcolor: 'transparent',
          height: DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT_PX,
          minHeight: DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT_PX
        }}
      >
        <Tooltip title="Inicio">
          <BottomNavigationAction
            value="home"
            aria-label="Inicio"
            icon={<Home />}
            component={Link}
            href="/dashboard"
            prefetch
            sx={actionSx}
          />
        </Tooltip>
        <Tooltip title="Tiendas">
          <BottomNavigationAction
            value="stores"
            aria-label="Tiendas"
            icon={<Storefront />}
            component={Link}
            href={storeHubHref}
            prefetch={false}
            sx={actionSx}
          />
        </Tooltip>
        <Tooltip title="Mazos">
          <BottomNavigationAction
            value="decks"
            aria-label="Mazos"
            icon={<Style />}
            component={Link}
            href="/dashboard/decklists"
            prefetch
            sx={actionSx}
          />
        </Tooltip>
        <Tooltip title="Mi cuenta">
          <BottomNavigationAction
            value="account"
            aria-label="Mi cuenta"
            icon={<AccountCircleOutlined />}
            component={Link}
            href="/dashboard/mi-cuenta"
            prefetch
            sx={actionSx}
          />
        </Tooltip>
      </BottomNavigation>
    </Paper>
  )
}
