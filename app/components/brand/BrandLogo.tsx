'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BrandMarkSvg from '@/components/brand/BrandMarkSvg'
import { BRAND_LOGO_ASPECT, BRAND_LOGO_SRC } from '@/lib/brand-assets'
import { SITE_NAME } from '@/lib/site-metadata'

export type BrandLogoProps = {
  /**
   * `wordmark` — isotipo SVG + tipografía (UI).
   * `lockup` — SVG horizontal completo.
   * `mark` — solo isotipo.
   */
  variant?: 'wordmark' | 'lockup' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  /** En AppBar primary: texto claro sobre teal. */
  surface?: 'light' | 'dark'
}

const SIZE = {
  sm: { mark: 28, title: '1.125rem', gap: 1 },
  md: { mark: 36, title: '1.35rem', gap: 1.25 },
  lg: { mark: 44, title: '1.65rem', gap: 1.5 }
} as const

function BrandWordmark({
  surface,
  size
}: {
  surface: 'light' | 'dark'
  size: keyof typeof SIZE
}) {
  const dim = SIZE[size]
  const onDark = surface === 'dark'

  return (
    <Stack direction="row" alignItems="center" spacing={dim.gap} sx={{ minWidth: 0 }}>
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          lineHeight: 0,
          ...(onDark && {
            filter: 'drop-shadow(0 0 0 1px rgba(255,255,255,0.18))'
          })
        }}
      >
        <BrandMarkSvg size={dim.mark} />
      </Box>
      <Typography
        component="span"
        sx={{
          fontSize: dim.title,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          color: onDark ? 'common.white' : 'text.primary'
        }}
      >
        <Box
          component="span"
          sx={{
            fontWeight: 600,
            color: onDark ? 'rgba(255,255,255,0.78)' : 'text.secondary'
          }}
        >
          TCG{' '}
        </Box>
        <Box
          component="span"
          sx={{
            color: onDark ? 'common.white' : 'primary.main'
          }}
        >
          Nexo
        </Box>
      </Typography>
    </Stack>
  )
}

export default function BrandLogo({
  variant = 'wordmark',
  size = 'md',
  href = '/',
  surface = 'light'
}: BrandLogoProps) {
  const dim = SIZE[size]

  let content: ReactNode

  if (variant === 'wordmark') {
    content = <BrandWordmark surface={surface} size={size} />
  } else if (variant === 'mark') {
    content = <BrandMarkSvg size={dim.mark} title={SITE_NAME} />
  } else {
    const height = dim.mark
    const width = Math.round(height * BRAND_LOGO_ASPECT)
    content = (
      <Box
        component="img"
        src={BRAND_LOGO_SRC}
        alt={SITE_NAME}
        width={width}
        height={height}
        sx={{
          height,
          width: 'auto',
          maxWidth: 'min(100%, 280px)',
          display: 'block'
        }}
      />
    )
  }

  const shell = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      {content}
    </Box>
  )

  if (!href) return shell

  return (
    <Box
      component={Link}
      href={href}
      aria-label={SITE_NAME}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'opacity 0.2s ease',
        '&:hover': { opacity: 0.9 },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: surface === 'dark' ? 'primary.light' : 'primary.main',
          outlineOffset: 4,
          borderRadius: 1
        }
      }}
    >
      {shell}
    </Box>
  )
}
