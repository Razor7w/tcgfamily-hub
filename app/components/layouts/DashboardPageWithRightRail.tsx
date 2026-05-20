'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { PRODUCT_TOUR_TARGETS } from '@/lib/product-tour-targets'
import {
  MOBILE_RIGHT_RAIL_DRAWER_CLOSE,
  MOBILE_RIGHT_RAIL_DRAWER_OPEN
} from '@/lib/mobile-right-rail-drawer'

const RAIL_WIDTH_PX = 340

type DashboardPageWithRightRailProps = {
  children: ReactNode
  rail: ReactNode
  /** Ancho fijo del panel derecho en escritorio. */
  railWidth?: number
  /** Etiqueta del botón que abre el drawer en móvil (&lt; lg). */
  mobileDrawerLabel?: string
}

/**
 * Escritorio (lg+): contenido + panel derecho en dos columnas.
 * Móvil/tablet: panel en drawer lateral; botón flotante para abrirlo.
 */
export default function DashboardPageWithRightRail({
  children,
  rail,
  railWidth = RAIL_WIDTH_PX,
  mobileDrawerLabel = 'Panel'
}: DashboardPageWithRightRailProps) {
  const theme = useTheme()
  const isMobileRail = useMediaQuery(theme.breakpoints.down('lg'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    const onOpen = () => openDrawer()
    const onClose = () => closeDrawer()
    window.addEventListener(MOBILE_RIGHT_RAIL_DRAWER_OPEN, onOpen)
    window.addEventListener(MOBILE_RIGHT_RAIL_DRAWER_CLOSE, onClose)
    return () => {
      window.removeEventListener(MOBILE_RIGHT_RAIL_DRAWER_OPEN, onOpen)
      window.removeEventListener(MOBILE_RIGHT_RAIL_DRAWER_CLOSE, onClose)
    }
  }, [openDrawer, closeDrawer])

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'flex-start',
          gap: { lg: 3 },
          width: '100%',
          maxWidth: { lg: 1440 },
          mx: { lg: 'auto' },
          px: { lg: 3 }
        }}
      >
        <Box
          sx={{
            flex: { lg: '1 1 0' },
            minWidth: 0,
            width: '100%'
          }}
        >
          {children}
        </Box>

        {!isMobileRail ? (
          <Box
            component="aside"
            aria-label="Panel lateral"
            sx={{
              flex: `0 0 ${railWidth}px`,
              width: railWidth,
              position: 'sticky',
              top: 24,
              alignSelf: 'flex-start'
            }}
          >
            {rail}
          </Box>
        ) : null}
      </Box>

      {isMobileRail ? (
        <>
          <Button
            variant="contained"
            data-tour={PRODUCT_TOUR_TARGETS.mobileRightRailTrigger}
            onClick={openDrawer}
            sx={{
              position: 'fixed',
              right: 16,
              bottom: 80,
              zIndex: theme.zIndex.speedDial,
              borderRadius: 999,
              px: 2,
              py: 1,
              boxShadow: 4,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {mobileDrawerLabel}
          </Button>

          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={closeDrawer}
            keepMounted
            slotProps={{
              paper: {
                sx: {
                  width: `min(100vw - 24px, ${railWidth}px)`,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column'
                }
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                flexShrink: 0
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {mobileDrawerLabel}
              </Typography>
              <IconButton
                aria-label="Cerrar panel"
                onClick={closeDrawer}
                edge="end"
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                p: 2,
                overflowY: 'auto',
                flex: 1,
                minHeight: 0
              }}
            >
              {rail}
            </Box>
          </Drawer>
        </>
      ) : null}
    </Box>
  )
}

export const DASHBOARD_RIGHT_RAIL_WIDTH = RAIL_WIDTH_PX
