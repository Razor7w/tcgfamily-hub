'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

export const TEAM_LOGO_OVERLAP_MT = '-50px'

export const TEAM_HEADER_COVER_HEIGHT = { xs: 168, sm: 240 } as const

export const TEAM_HEADER_AVATAR_SIZE = { xs: 96, sm: 120 } as const

const coverFallbackGradient = `linear-gradient(135deg, ${alpha('#0f766e', 0.5)} 0%, ${alpha('#0a3d38', 0.78)} 48%, ${alpha('#051816', 0.94)} 100%)`

type CoverProps = {
  coverUrl: string
  rounded?: boolean
  sx?: SxProps<Theme>
}

export function TeamHeaderCover({ coverUrl, rounded = false, sx }: CoverProps) {
  return (
    <Box
      sx={[
        {
          position: 'relative',
          height: TEAM_HEADER_COVER_HEIGHT,
          bgcolor: t => alpha(t.palette.primary.main, 0.08),
          backgroundImage: coverUrl
            ? `url(${coverUrl})`
            : coverFallbackGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: coverUrl
              ? `linear-gradient(180deg, ${alpha('#000', 0.08)} 0%, transparent 38%, ${alpha('#fff', 0.06)} 100%)`
              : `radial-gradient(ellipse 90% 70% at 50% 0%, ${alpha('#fff', 0.14)} 0%, transparent 70%)`,
            pointerEvents: 'none'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '46%',
            background: t =>
              `linear-gradient(to top, ${t.palette.background.paper} 4%, ${alpha(t.palette.background.paper, 0.88)} 38%, transparent 100%)`,
            pointerEvents: 'none'
          }
        },
        rounded && {
          mx: 2.5,
          borderRadius: 2.5
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    />
  )
}

type AvatarProps = {
  name: string
  logoUrl: string
  adornment?: ReactNode
}

export function TeamHeaderAvatar({ name, logoUrl, adornment }: AvatarProps) {
  return (
    <Box sx={{ position: 'relative', width: 'fit-content' }}>
      <Avatar
        src={logoUrl || undefined}
        alt={logoUrl ? `Logo de ${name}` : undefined}
        sx={{
          width: TEAM_HEADER_AVATAR_SIZE,
          height: TEAM_HEADER_AVATAR_SIZE,
          fontSize: { xs: '2rem', sm: '2.5rem' },
          fontWeight: 700,
          border: '5px solid',
          borderColor: 'background.paper',
          bgcolor: t => alpha(t.palette.primary.main, 0.1),
          color: 'primary.dark',
          boxShadow: t =>
            `0 2px 8px ${alpha(t.palette.primary.dark, 0.14)}, 0 14px 36px ${alpha(t.palette.common.black, 0.16)}`
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Avatar>
      {adornment}
    </Box>
  )
}

type IdentityProps = {
  name: string
  memberCount: number
  bio?: string
  footer?: ReactNode
}

export function TeamHeaderIdentityContent({
  name,
  memberCount,
  bio,
  footer
}: IdentityProps) {
  return (
    <>
      <Typography
        variant="h4"
        fontWeight={800}
        letterSpacing="-0.035em"
        sx={{
          lineHeight: 1.1,
          textWrap: 'balance',
          fontSize: { xs: '1.5rem', sm: '1.75rem' }
        }}
      >
        {name}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1 }}
        flexWrap="wrap"
        useFlexGap
      >
        <Chip
          size="small"
          label={`${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}`}
          sx={{
            height: 26,
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
            bgcolor: t => alpha(t.palette.text.primary, 0.04),
            border: '1px solid',
            borderColor: t => alpha(t.palette.text.primary, 0.1),
            '& .MuiChip-label': { px: 1.25 }
          }}
        />
      </Stack>
      {bio ? (
        <Typography
          variant="body2"
          sx={{
            mt: 1.25,
            maxWidth: '38rem',
            color: 'text.secondary',
            lineHeight: 1.7,
            textWrap: 'pretty'
          }}
        >
          {bio}
        </Typography>
      ) : null}
      {footer}
    </>
  )
}
