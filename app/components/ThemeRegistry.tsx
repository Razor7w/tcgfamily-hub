'use client'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { useAppStore } from '@/store/useAppStore'
import { darkTheme, lightTheme } from '@/theme/theme'

export default function ThemeRegistry({
  children
}: {
  children: React.ReactNode
}) {
  const mode = useAppStore(s => s.theme)
  const theme = mode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
