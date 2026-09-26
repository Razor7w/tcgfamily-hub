'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import FolderOpen from '@mui/icons-material/FolderOpen'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import { useOptionalSellerInterest } from './SellerInterestContext'

type SellerResponse = {
  seller: {
    id: string
    name: string
    slug: string
    phone: string
    whatsappHref: string | null
    publicPath: string
  }
  binders: {
    id: string
    name: string
    slug: string
    description: string
    publishedCount: number
    path: string
  }[]
  error?: string
}

export default function PublicVendedorClient({ slug }: { slug: string }) {
  const interest = useOptionalSellerInterest()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SellerResponse | null>(null)

  const load = useCallback(async () => {
    if (!slug.trim()) {
      setLoading(false)
      setError('Vendedor no válido')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/public/vendedores/${encodeURIComponent(slug)}`
      )
      const json = (await res.json().catch(() => ({}))) as SellerResponse
      if (!res.ok) {
        setError(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudo cargar el vendedor'
        )
        setData(null)
        return
      }
      setData(json)
    } catch {
      setError('No se pudo cargar el vendedor')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Header />
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <BrandLogo size="sm" />
            <Typography variant="overline" color="text.secondary">
              Vendedor
            </Typography>
            <Typography
              variant="h3"
              component="h1"
              fontWeight={900}
              sx={{ letterSpacing: '-0.03em', fontSize: { xs: '1.75rem', md: '2.25rem' } }}
            >
              {data?.seller.name ?? slug}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Carpetas con singles publicados. Puedes elegir cartas en varias
              carpetas; la selección se mantiene.
              {interest && interest.items.length > 0
                ? ` · ${interest.items.length} en tu lista`
                : ''}
            </Typography>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : data ? (
            <Paper variant="outlined">
              <List disablePadding>
                {data.binders.map((b, i) => (
                  <ListItem
                    key={b.id}
                    disablePadding
                    divider={i < data.binders.length - 1}
                  >
                    <ListItemButton component={Link} href={b.path}>
                      <ListItemIcon>
                        <FolderOpen />
                      </ListItemIcon>
                      <ListItemText
                        primary={b.name}
                        secondary={
                          b.description
                            ? `${b.publishedCount} publicados · ${b.description}`
                            : `${b.publishedCount} publicados`
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : null}
        </Stack>
      </Container>
      <Box
        sx={{
          py: 2,
          bgcolor: t => alpha(t.palette.primary.main, 0.02)
        }}
      >
        <AppVersion />
      </Box>
    </Box>
  )
}
