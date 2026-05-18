'use client'

import InstagramIcon from '@mui/icons-material/Instagram'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MuiLink from '@mui/material/Link'
import {
  instagramDisplayLabel,
  websiteDisplayHost
} from '@/lib/store-public-profile'

type StoreHubPublicLinksProps = {
  address?: string
  websiteUrl?: string
  instagramUrl?: string
  /** Alineación del bloque (p. ej. derecha en el header del hub). */
  align?: 'left' | 'right'
}

export default function StoreHubPublicLinks({
  address = '',
  websiteUrl = '',
  instagramUrl = '',
  align = 'left'
}: StoreHubPublicLinksProps) {
  const addr = address.trim()
  const web = websiteUrl.trim()
  const ig = instagramUrl.trim()

  if (!addr && !web && !ig) return null

  const isRight = align === 'right'
  const rowSx = {
    width: '100%',
    justifyContent: isRight ? 'flex-end' : 'flex-start'
  } as const
  const textSx = isRight ? { textAlign: 'right' as const } : undefined

  return (
    <Stack
      spacing={0.75}
      alignItems={isRight ? 'flex-end' : 'flex-start'}
      sx={{
        flexShrink: 0,
        width: { xs: '100%', sm: isRight ? 'auto' : '100%' },
        maxWidth: { xs: '100%', sm: 380 },
        minWidth: 0
      }}
    >
      {web ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={rowSx}>
          <LanguageOutlinedIcon
            sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }}
            aria-hidden
          />
          <MuiLink
            href={web}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            underline="hover"
            sx={{ fontWeight: 600, ...textSx }}
          >
            {websiteDisplayHost(web)}
          </MuiLink>
        </Stack>
      ) : null}
      {ig ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={rowSx}>
          <InstagramIcon
            sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }}
            aria-hidden
          />
          <MuiLink
            href={ig}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            underline="hover"
            sx={{ fontWeight: 600, ...textSx }}
          >
            {instagramDisplayLabel(ig)}
          </MuiLink>
        </Stack>
      ) : null}
      {addr ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          sx={rowSx}
        >
          <PlaceOutlinedIcon
            sx={{
              fontSize: 18,
              mt: 0.15,
              color: 'text.secondary',
              flexShrink: 0
            }}
            aria-hidden
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              ...textSx
            }}
          >
            {addr}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  )
}
