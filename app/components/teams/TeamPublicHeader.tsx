'use client'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'
import TeamHeaderIdentityRow from '@/components/teams/TeamHeaderIdentityRow'
import {
  TeamHeaderAvatar,
  TeamHeaderCover,
  TeamHeaderIdentityContent
} from '@/components/teams/team-header-ui'

type Props = {
  name: string
  bio: string
  logoUrl: string
  coverUrl: string
  memberCount: number
}

export default function TeamPublicHeader({
  name,
  bio,
  logoUrl,
  coverUrl,
  memberCount
}: Props) {
  return (
    <Paper
      component="header"
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        overflow: 'hidden',
        boxShadow: t =>
          `0 1px 0 ${alpha(t.palette.common.white, 0.8)} inset, 0 18px 48px ${alpha(t.palette.primary.dark, 0.06)}`
      }}
    >
      <TeamHeaderCover coverUrl={coverUrl} />

      <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2.25, sm: 3 }, pt: 0 }}>
        <TeamHeaderIdentityRow
          avatar={<TeamHeaderAvatar name={name} logoUrl={logoUrl} />}
        >
          <TeamHeaderIdentityContent
            name={name}
            memberCount={memberCount}
            bio={bio}
          />
        </TeamHeaderIdentityRow>
      </Box>
    </Paper>
  )
}
