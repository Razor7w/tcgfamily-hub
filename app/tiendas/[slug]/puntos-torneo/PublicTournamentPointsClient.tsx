'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { alpha } from '@mui/material/styles'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import AppVersion from '@/components/AppVersion'

type LeaderboardRow = {
  rank: number
  displayName: string
  points: number
}

type LeaderboardResponse = {
  enabled: boolean
  label: string
  store: { id: string; name: string; slug: string }
  playerCount: number
  rows: LeaderboardRow[]
  error?: string
}

function normalizeSearch(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

export default function PublicTournamentPointsClient({
  slug
}: {
  slug: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [nameQuery, setNameQuery] = useState('')

  useEffect(() => {
    if (!slug.trim()) {
      setLoading(false)
      setError('Tienda no válida')
      setData(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/stores/${encodeURIComponent(slug)}/tournament-points`
        )
        const json = (await res.json().catch(() => ({}))) as LeaderboardResponse
        if (cancelled) return
        if (!res.ok) {
          setError(
            typeof json.error === 'string'
              ? json.error
              : 'No se pudo cargar el ranking'
          )
          setData(null)
          return
        }
        setData(json)
      } catch {
        if (!cancelled) {
          setError('No se pudo cargar el ranking')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? []
    const q = normalizeSearch(nameQuery)
    if (!q) return rows
    return rows.filter(row => normalizeSearch(row.displayName).includes(q))
  }, [data?.rows, nameQuery])

  const label = data?.label?.trim() || 'Puntos por torneo'
  const storeName = data?.store?.name?.trim() || slug
  const hasQuery = nameQuery.trim().length > 0

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        backgroundImage: `radial-gradient(ellipse 80% 50% at 10% 0%, ${alpha(t.palette.primary.main, 0.12)}, transparent 55%)`
      })}
    >
      <Header />
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 3, sm: 4.5 } }}>
        <Stack spacing={2.5}>
          <Box>
            <BrandLogo variant="wordmark" size="md" href="/" />
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ mt: 2.5 }}
            >
              <Box
                sx={t => ({
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(t.palette.primary.main, 0.12),
                  color: 'primary.main'
                })}
              >
                <EmojiEventsOutlinedIcon />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'primary.main',
                    lineHeight: 1.2
                  }}
                >
                  Ranking público
                </Typography>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    fontSize: { xs: '1.65rem', sm: '2rem' }
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520 }}>
              Jugadores con saldo en {storeName}. No necesitas iniciar sesión
              para ver este listado.
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert
              severity="warning"
              action={
                <Button component={Link} href="/" color="inherit" size="small">
                  Ir al inicio
                </Button>
              }
            >
              {error}
            </Alert>
          ) : data ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={t => ({
                  px: { xs: 2, sm: 2.5 },
                  py: 1.75,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: alpha(t.palette.primary.main, 0.04),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5
                })}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {storeName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hasQuery
                      ? `${filteredRows.length} de ${data.playerCount} ${data.playerCount === 1 ? 'jugador' : 'jugadores'}`
                      : data.playerCount === 1
                        ? '1 jugador con puntos'
                        : `${data.playerCount} jugadores con puntos`}
                  </Typography>
                </Box>
                {data.rows.length > 0 ? (
                  <TextField
                    size="small"
                    fullWidth
                    value={nameQuery}
                    onChange={e => setNameQuery(e.target.value)}
                    placeholder="Buscar por nombre"
                    aria-label="Buscar jugador por nombre"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: hasQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Limpiar búsqueda"
                            onClick={() => setNameQuery('')}
                            edge="end"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined
                    }}
                  />
                ) : null}
              </Box>

              {data.rows.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Typography color="text.secondary">
                    Aún no hay jugadores con {label.toLowerCase()} en esta
                    tienda.
                  </Typography>
                </Box>
              ) : filteredRows.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Typography color="text.secondary">
                    No hay jugadores que coincidan con «{nameQuery.trim()}».
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="medium" aria-label={`Ranking de ${label}`}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 72 }}>
                          #
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Jugador</TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          Puntos
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.map(row => (
                        <TableRow
                          key={`${row.rank}-${row.displayName}`}
                          hover
                          sx={{
                            '&:nth-of-type(odd)': {
                              bgcolor: t => alpha(t.palette.primary.main, 0.025)
                            }
                          }}
                        >
                          <TableCell
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: row.rank <= 3 ? 800 : 600,
                              color:
                                row.rank === 1
                                  ? 'primary.main'
                                  : 'text.secondary'
                            }}
                          >
                            {row.rank}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {row.displayName}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 800,
                              fontSize: '1.05rem'
                            }}
                          >
                            {row.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          ) : null}

          <Typography variant="body2" color="text.secondary">
            ¿Eres de la tienda?{' '}
            <Link href="/" style={{ fontWeight: 600 }}>
              Inicia sesión
            </Link>{' '}
            para ver tu historial en el hub.
          </Typography>
        </Stack>
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
