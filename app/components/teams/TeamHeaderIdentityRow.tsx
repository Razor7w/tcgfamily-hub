'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import type { ReactNode } from 'react'
import { TEAM_LOGO_OVERLAP_MT } from '@/components/teams/team-header-ui'

type Props = {
  avatar: ReactNode
  children: ReactNode
}

/** Logo mitad en portada + textos en franja blanca (estilo perfil). */
export default function TeamHeaderIdentityRow({ avatar, children }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 2.5 }}
      alignItems="flex-start"
    >
      <Box
        sx={{
          mt: TEAM_LOGO_OVERLAP_MT,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2
        }}
      >
        {avatar}
      </Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          pt: { xs: 0, sm: 0.75 },
          pb: { xs: 0, sm: 0.25 }
        }}
      >
        {children}
      </Box>
    </Stack>
  )
}
