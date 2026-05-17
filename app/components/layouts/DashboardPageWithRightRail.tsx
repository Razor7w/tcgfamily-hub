'use client'

import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

const RAIL_WIDTH_PX = 340

type DashboardPageWithRightRailProps = {
  children: ReactNode
  rail: ReactNode
  /** Ancho fijo del panel derecho en escritorio. */
  railWidth?: number
}

/**
 * Escritorio (lg+): contenido + panel derecho en dos columnas.
 * Tablet/móvil: una fila con scroll horizontal; el panel se revela deslizando hacia la izquierda.
 */
export default function DashboardPageWithRightRail({
  children,
  rail,
  railWidth = RAIL_WIDTH_PX
}: DashboardPageWithRightRailProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: { lg: 3 },
          width: '100%',
          maxWidth: { lg: 1440 },
          mx: { lg: 'auto' },
          px: { lg: 3 },
          overflowX: { xs: 'auto', lg: 'visible' },
          overflowY: 'visible',
          scrollSnapType: { xs: 'x mandatory', lg: 'none' },
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: { xs: 'contain', lg: 'auto' },
          scrollbarWidth: { xs: 'thin', lg: 'auto' },
          '&::-webkit-scrollbar': { height: { xs: 6, lg: 0 } }
        }}
      >
        <Box
          sx={{
            flex: { lg: '1 1 0' },
            minWidth: { xs: '100%', lg: 0 },
            width: { xs: '100%', lg: 'auto' },
            flexShrink: 0,
            scrollSnapAlign: { xs: 'start', lg: 'none' },
            scrollSnapStop: { xs: 'always', lg: 'normal' }
          }}
        >
          {children}
        </Box>

        <Box
          component="aside"
          aria-label="Panel lateral"
          sx={{
            flex: { lg: `0 0 ${railWidth}px` },
            width: { xs: `min(100vw - 32px, ${railWidth}px)`, lg: railWidth },
            minWidth: {
              xs: `min(100vw - 32px, ${railWidth}px)`,
              lg: railWidth
            },
            flexShrink: 0,
            scrollSnapAlign: { xs: 'start', lg: 'none' },
            scrollSnapStop: { xs: 'always', lg: 'normal' },
            position: { lg: 'sticky' },
            top: { lg: 24 },
            alignSelf: { lg: 'flex-start' },
            py: { xs: 0, lg: 0 },
            pr: { xs: 2, lg: 0 },
            pl: { xs: 1, lg: 0 },
            boxSizing: 'border-box'
          }}
        >
          {rail}
        </Box>
      </Box>

      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          mt: 1.5,
          px: 2,
          color: 'text.secondary'
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 18, opacity: 0.7 }} aria-hidden />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Desliza hacia la izquierda para ver el panel
        </Typography>
      </Box>
    </Box>
  )
}

export const DASHBOARD_RIGHT_RAIL_WIDTH = RAIL_WIDTH_PX
