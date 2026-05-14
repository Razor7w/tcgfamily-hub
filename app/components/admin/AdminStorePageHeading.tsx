'use client'

import { useMemo, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack, { type StackProps } from '@mui/material/Stack'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { useMeStores } from '@/hooks/useMeStores'

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
  const { data: meStoresLogo } = useMeStores()
  const showLogo =
    Boolean(showActiveStoreAvatar) || session?.user?.storeRole === 'store_admin'
  const aid = session?.user?.activeStoreId?.trim() ?? ''

  const resolvedLogoUrl = useMemo(() => {
    if (!showLogo || status !== 'authenticated' || !aid) return ''
    const hit = (meStoresLogo?.stores ?? []).find(r => String(r.id) === aid)
    return typeof hit?.logoUrl === 'string' ? hit.logoUrl.trim() : ''
  }, [showLogo, status, aid, meStoresLogo?.stores])

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
          src={resolvedLogoUrl || undefined}
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
