'use client'

import { Box, Drawer, Grid, useTheme } from '@mui/material'
import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import DashboardMobileBottomNav, {
  DASHBOARD_MOBILE_BOTTOM_NAV_CONTENT_PADDING
} from '@/components/navigation/DashboardMobileBottomNav'

const DRAWER_WIDTH = 280

type SidebarLayoutProps = {
  sidebar: React.ReactNode
  children: React.ReactNode
  sidebarSize?: number
  contentSize?: number
}

export default function SidebarLayout({
  sidebar,
  children,
  sidebarSize = 3,
  contentSize = 9
}: SidebarLayoutProps) {
  const theme = useTheme()
  const [isDesktop, setIsDesktop] = useState(false)
  const desktopQuery = useMemo(() => {
    const q = theme.breakpoints.up('md')
    return q.startsWith('@media ') ? q.slice('@media '.length) : q
  }, [theme])
  useEffect(() => {
    const mq = window.matchMedia(desktopQuery)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [desktopQuery])
  const pathname = usePathname()
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [pathname, isDesktop, setSidebarOpen])

  // Un solo árbol: `children` no cambia de padre al cruzar md (evita re-fetch en /perfil, etc.).
  return (
    <Grid container spacing={0} sx={{ width: '100%' }}>
      <Grid
        size={sidebarSize}
        sx={{
          display: { xs: 'none', md: 'block' },
          flexShrink: 0
        }}
      >
        {sidebar}
      </Grid>

      {!isDesktop && sidebarOpen ? (
        <Drawer
          variant="temporary"
          anchor="left"
          open
          onClose={() => setSidebarOpen(false)}
          disableScrollLock
          ModalProps={{ keepMounted: false }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box'
            }
          }}
        >
          <Box sx={{ overflow: 'auto', py: 2, px: 1 }}>{sidebar}</Box>
        </Drawer>
      ) : null}

      <Grid size={{ xs: 12, md: contentSize }} sx={{ minWidth: 0 }}>
        <Box
          component="main"
          sx={{
            width: '100%',
            pb: { xs: DASHBOARD_MOBILE_BOTTOM_NAV_CONTENT_PADDING, md: 0 }
          }}
        >
          {children}
        </Box>
      </Grid>

      {!isDesktop ? <DashboardMobileBottomNav /> : null}
    </Grid>
  )
}
