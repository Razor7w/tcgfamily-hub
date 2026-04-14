'use client'

import { Box, Grid, SwipeableDrawer, useMediaQuery, useTheme } from '@mui/material'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
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
  // Mobile-first: evita mismatch SSR/cliente y menús rotos hasta redimensionar (Next + MUI).
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), {
    defaultMatches: false,
    noSsr: true
  })
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
