'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack, { type StackProps } from '@mui/material/Stack'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

export type AdminStorePageHeadingProps = {
  children: ReactNode
  /** Si es true, muestra avatar/logo de la tienda activa también para owner (p. ej. configuración por tienda). */
  showActiveStoreAvatar?: boolean
} & Omit<StackProps, 'direction' | 'children'>

/**
 * Para rol `store_admin` o con `showActiveStoreAvatar`: logo de la tienda activa a la izquierda del título.
 */
export function AdminStorePageHeading({
  children,
  showActiveStoreAvatar = false,
  spacing = 2,
  alignItems = 'flex-start',
  sx,
  ...rest
}: AdminStorePageHeadingProps) {
  const { data: session, status } = useSession()
  const [logoUrl, setLogoUrl] = useState('')
  const showLogo =
    Boolean(showActiveStoreAvatar) || session?.user?.storeRole === 'store_admin'

  useEffect(() => {
    if (!showLogo || status !== 'authenticated') {
      setLogoUrl('')
      return
    }
    const aid = session?.user?.activeStoreId?.trim()
    if (!aid) {
      setLogoUrl('')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          stores?: Array<{ id?: string; logoUrl?: string }>
        }
        const rows = Array.isArray(data.stores) ? data.stores : []
        const hit = rows.find(r => String(r.id) === aid)
        const logo = typeof hit?.logoUrl === 'string' ? hit.logoUrl.trim() : ''
        if (!cancelled) setLogoUrl(logo)
      } catch {
        if (!cancelled) setLogoUrl('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showLogo, showActiveStoreAvatar, session?.user?.activeStoreId, status])

  return (
    <Stack
      direction="row"
      spacing={spacing}
      alignItems={alignItems}
      sx={[
        { flex: 1, minWidth: 0 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
      {...rest}
    >
      {showLogo ? (
        <Avatar
          variant="rounded"
          src={logoUrl || undefined}
          alt=""
          sx={{
            width: { xs: 44, sm: 52 },
            height: { xs: 44, sm: 52 },
            flexShrink: 0,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            '& .MuiAvatar-img': {
              objectFit: 'contain',
              p: 0.5
            }
          }}
        >
          <StorefrontOutlinedIcon sx={{ fontSize: 28 }} />
        </Avatar>
      ) : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
    </Stack>
  )
}
