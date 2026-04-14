'use client'

import { Box, Grid, SwipeableDrawer, useTheme } from '@mui/material'
import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

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
  // Importante: evita mismatch de hidratación. En SSR + primer render del cliente
  // asumimos "mobile-first" y solo calculamos desktop tras montar.
  const [isDesktop, setIsDesktop] = useState(false)
  const desktopQuery = useMemo(() => {
    // theme.breakpoints.up('md') => '@media (min-width:900px)'
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
    // Safari viejo
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [desktopQuery])
  const pathname = usePathname()
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [pathname, isDesktop, setSidebarOpen])

  if (isDesktop) {
    return (
      <Grid container spacing={2}>
        <Grid size={sidebarSize}>{sidebar}</Grid>
        <Grid size={contentSize}>{children}</Grid>
      </Grid>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <SwipeableDrawer
        variant="temporary"
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        disableScrollLock
        ModalProps={{
          keepMounted: true
        }}
        swipeAreaWidth={24}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box sx={{ overflow: 'auto', py: 2, px: 1 }}>{sidebar}</Box>
      </SwipeableDrawer>
      <Box component="main" sx={{ width: '100%' }}>
        {children}
      </Box>
    </Box>
  )
}
