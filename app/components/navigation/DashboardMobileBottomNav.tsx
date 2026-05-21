'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  AccountCircleOutlined,
  Home,
  MarkunreadMailboxOutlined,
  Storefront,
  Style
} from '@mui/icons-material'
import {
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMyMails } from '@/hooks/useMails'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'
import { cleanupOverlayBlockers } from '@/lib/overlay-blocker-cleanup'
import { isMailWaitingForPickup } from '@/lib/mail-inbox'
import { isStoreContextHubPath } from '@/lib/store-context-hub-path'

const MAIL_PICKUP_BADGE_LIMIT = 48

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
): false | 'home' | 'stores' | 'mail' | 'decks' | 'account' {
  if (pathname === '/dashboard') return 'home'
  if (pathname === '/dashboard/tiendas' || isStoreContextHubPath(pathname)) {
    return 'stores'
  }
  if (
    pathname === '/dashboard/mail' ||
    pathname.startsWith('/dashboard/mail/')
  ) {
    return 'mail'
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
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { data: session, status } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const storeHubHref = useStoreHubHref()
  const selected = mobileNavValue(pathname)

  const { data: pickupMailsData } = useMyMails({
    pendingOnly: true,
    inStoreOnly: true,
    allStores: true,
    limit: MAIL_PICKUP_BADGE_LIMIT,
    enabled: status === 'authenticated' && currentUserId.length > 0
  })

  const hasMailToPickup = useMemo(
    () =>
      (pickupMailsData?.mails ?? []).some(m =>
        isMailWaitingForPickup(m, currentUserId)
      ),
    [pickupMailsData?.mails, currentUserId]
  )

  const mailNavIcon = (
    <Badge
      color="error"
      variant="dot"
      invisible={!hasMailToPickup}
      overlap="circular"
    >
      <MarkunreadMailboxOutlined />
    </Badge>
  )

  const actionSx = {
    minWidth: 0,
    maxWidth: 'none',
    px: 1,
    '& .MuiBottomNavigationAction-label': {
      display: 'none'
    }
  }

  const go = (href: string) => {
    if (!href || href === pathname) return
    cleanupOverlayBlockers()
    router.push(href)
  }

  return (
    <Paper
      component="nav"
      aria-label="Accesos rápidos"
      data-tour="dashboard-mobile-nav"
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
        <BottomNavigationAction
          value="home"
          aria-label="Inicio"
          icon={<Home />}
          onClick={() => go('/dashboard')}
          sx={actionSx}
        />
        <BottomNavigationAction
          value="stores"
          aria-label="Tiendas"
          icon={<Storefront />}
          onClick={() => go(storeHubHref)}
          sx={actionSx}
        />
        <BottomNavigationAction
          value="mail"
          aria-label={
            hasMailToPickup
              ? 'Tus correos, tienes correos listos para retirar'
              : 'Tus correos'
          }
          icon={mailNavIcon}
          onClick={() => go('/dashboard/mail')}
          sx={actionSx}
        />
        <BottomNavigationAction
          value="decks"
          aria-label="Mazos"
          icon={<Style />}
          onClick={() => go('/dashboard/decklists')}
          sx={actionSx}
        />
        <BottomNavigationAction
          value="account"
          aria-label="Mi cuenta"
          icon={<AccountCircleOutlined />}
          onClick={() => go('/dashboard/mi-cuenta')}
          sx={actionSx}
        />
      </BottomNavigation>
    </Paper>
  )
}
