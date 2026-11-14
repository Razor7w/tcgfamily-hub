'use client'

import { useMediaQuery, useTheme } from '@mui/material'
import { useAppStore } from '@/store/useAppStore'

/** Menú lateral en modo iconos, solo en el ancho donde la columna está fija. */
export function useSidebarRail() {
  const compact = useAppStore(s => s.sidebarCompact)
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  return compact && desktop
}
