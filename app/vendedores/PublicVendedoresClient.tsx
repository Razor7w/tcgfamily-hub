'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import FolderOpen from '@mui/icons-material/FolderOpen'
import SearchIcon from '@mui/icons-material/Search'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'

export type PublicSellerListItem = {
  id: string
  name: string
  slug: string
  image: string
  phone: string
  whatsappHref: string | null
  publicPath: string
  publishedItems: number
  publishedBinders: number
}

type ListResponse = {
  sellers: PublicSellerListItem[]
  error?: string
}

const EMPTY_SELLERS: PublicSellerListItem[] = []

export default function PublicVendedoresClient() {
  const [q, setQ] = useState('')

  const { data, isPending, error } = useQuery({
    queryKey: ['public', 'vendedores'],
    queryFn: async (): Promise<PublicSellerListItem[]> => {
      const res = await fetch('/api/public/vendedores')
      const json = (await res.json().catch(() => ({}))) as ListResponse
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudieron cargar los vendedores'
        )
      }
      return json.sellers ?? []
    }
  })

  const sellers = data ?? EMPTY_SELLERS
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sellers
    return sellers.filter(
      s =>
        s.name.toLowerCase().includes(needle) ||
        s.slug.toLowerCase().includes(needle)
    )
  }, [sellers, q])

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
      <Container
        maxWidth={false}
        sx={{
          flex: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1100,
          width: '100%',
          mx: 'auto'
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'flex-end' }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <BrandLogo size="sm" />
              <Typography variant="overline" color="text.secondary">
                Marketplace
              </Typography>
              <Typography
                variant="h3"
                component="h1"
                fontWeight={900}
                sx={{
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.75rem', md: '2.25rem' }
                }}
              >
                Vendedores
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Jugadores con carpetas de singles publicadas. Contacto por
                WhatsApp; no hay pago en la plataforma.
              </Typography>
            </Stack>
            <TextField
              size="small"
              placeholder="Buscar por nombre"
              value={q}
              onChange={e => setQ(e.target.value)}
              sx={{ width: { xs: '100%', sm: 280 }, flexShrink: 0 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Stack>

          {isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">
              {error instanceof Error
                ? error.message
                : 'No se pudieron cargar los vendedores'}
            </Alert>
          ) : !sellers.length ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.04)
              }}
            >
              <StorefrontOutlined
                sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
              />
              <Typography color="text.secondary">
                Aún no hay vendedores con publicaciones activas.
              </Typography>
            </Paper>
          ) : !filtered.length ? (
            <Alert severity="info">
              Ningún vendedor coincide con «{q.trim()}».
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {filtered.length} vendedor
                {filtered.length === 1 ? '' : 'es'}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 1.5, sm: 2 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))'
                  }
                }}
              >
                {filtered.map(s => (
                  <Paper
                    key={s.id}
                    elevation={0}
                    sx={t => ({
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25,
                      borderRadius: 2.5,
                      border: `1px solid ${alpha(t.palette.divider, 0.9)}`,
                      transition:
                        'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: t.palette.primary.main,
                        boxShadow: `0 12px 28px -18px ${alpha(t.palette.common.black, 0.45)}`
                      }
                    })}
                  >
                    <Box
                      component={Link}
                      href={s.publicPath}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={s.image || undefined}
                          alt={s.name}
                          sx={{ width: 48, height: 48, fontWeight: 800 }}
                        >
                          {s.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            fontWeight={800}
                            sx={{
                              letterSpacing: '-0.02em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {s.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{s.slug}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <FolderOpen
                            sx={{ fontSize: 16, color: 'text.secondary' }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {s.publishedBinders} carpeta
                            {s.publishedBinders === 1 ? '' : 's'}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          · {s.publishedItems} publicado
                          {s.publishedItems === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                    </Box>

                    {s.whatsappHref ? (
                      <Button
                        component="a"
                        href={s.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        startIcon={<WhatsAppIcon />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          alignSelf: 'flex-start',
                          mt: 'auto'
                        }}
                      >
                        WhatsApp
                      </Button>
                    ) : null}
                  </Paper>
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      </Container>
      <Box sx={{ py: 2 }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
