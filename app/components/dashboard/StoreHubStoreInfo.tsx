'use client'

import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import StoreHubPublicLinks from '@/components/dashboard/StoreHubPublicLinks'

type StoreHubStoreInfoProps = {
  storeName?: string
  address?: string
  websiteUrl?: string
  instagramUrl?: string
}

function hasPublicInfo(
  address?: string,
  websiteUrl?: string,
  instagramUrl?: string
) {
  return Boolean(address?.trim() || websiteUrl?.trim() || instagramUrl?.trim())
}

export default function StoreHubStoreInfo({
  storeName = '',
  address,
  websiteUrl,
  instagramUrl
}: StoreHubStoreInfoProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const show = hasPublicInfo(address, websiteUrl, instagramUrl)

  if (!show) return null

  const title = storeName.trim() || 'Tienda'

  return (
    <>
      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          flexShrink: 0
        }}
      >
        <StoreHubPublicLinks
          align="right"
          address={address}
          websiteUrl={websiteUrl}
          instagramUrl={instagramUrl}
        />
      </Box>

      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flexShrink: 0,
          alignSelf: 'center'
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
          onClick={() => setDrawerOpen(true)}
          sx={{
            whiteSpace: 'nowrap',
            borderRadius: 2,
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          Más info
        </Button>
      </Box>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: 'min(85dvh, 420px)',
              pb: 'max(20px, env(safe-area-inset-bottom, 0px))'
            }
          }
        }}
      >
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: t => alpha(t.palette.text.primary, 0.2),
              mx: 'auto',
              mb: 2
            }}
            aria-hidden
          />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <IconButton
              aria-label="Cerrar"
              onClick={() => setDrawerOpen(false)}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <StoreHubPublicLinks
            align="left"
            address={address}
            websiteUrl={websiteUrl}
            instagramUrl={instagramUrl}
          />
        </Box>
      </Drawer>
    </>
  )
}
