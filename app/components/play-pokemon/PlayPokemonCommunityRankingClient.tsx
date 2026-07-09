'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Pagination from '@mui/material/Pagination'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import LeaderboardOutlined from '@mui/icons-material/LeaderboardOutlined'
import { alpha, useTheme } from '@mui/material/styles'
import Header from '@/components/Header'
import {
  PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { usePlayPokemonCommunityRanking } from '@/hooks/usePlayPokemonCommunityRanking'

const DIVISION_LABELS: Record<PlayPokemonLeaderboardDivision, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

function formatUpdated(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function PlayPokemonCommunityRankingClient() {
  const theme = useTheme()
  const [division, setDivision] =
    useState<PlayPokemonLeaderboardDivision>('masters')
  const [page, setPage] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(nameInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [nameInput])

  const { data, isPending, isError, error, isFetching } =
    usePlayPokemonCommunityRanking(division, page, search)

  const searchActive = search.trim().length >= 2
  const tabIndex = PLAY_POKEMON_LEADERBOARD_DIVISIONS.indexOf(division)

  const latestUpdate = useMemo(() => {
    const dates = (data?.rows ?? [])
      .map(row => formatUpdated(row.leaderboardUpdatedAt))
      .filter((value): value is string => Boolean(value))
    return dates[0] ?? null
  }, [data?.rows])

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EmojiEventsOutlined color="primary" />
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}
              >
                Ranking de jugadores
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '72ch' }}
            >
              Jugadores de Nexo que eligieron compartir su clasificación de
              Championship Points. Los datos provienen del vínculo con Ranking
              Chile.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                component={Link}
                href={PLAY_POKEMON_CHILE_LEADERBOARD_PATH}
                size="small"
                variant="outlined"
                startIcon={<LeaderboardOutlined fontSize="small" />}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Ranking Chile oficial
              </Button>
            </Stack>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: alpha(theme.palette.text.primary, 0.08),
              overflow: 'hidden'
            }}
          >
            <Tabs
              value={tabIndex >= 0 ? tabIndex : 0}
              onChange={(_, idx) => {
                const next = PLAY_POKEMON_LEADERBOARD_DIVISIONS[idx]
                if (next) {
                  setDivision(next)
                  setNameInput('')
                  setSearch('')
                  setPage(1)
                }
              }}
              variant="fullWidth"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.04)
              }}
            >
              {PLAY_POKEMON_LEADERBOARD_DIVISIONS.map(d => (
                <Tab
                  key={d}
                  label={DIVISION_LABELS[d]}
                  sx={{ fontWeight: 800, textTransform: 'none' }}
                />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <TextField
                  size="small"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Buscar por nombre"
                  sx={{ width: { xs: '100%', sm: 320 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: nameInput ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Limpiar búsqueda"
                          onClick={() => {
                            setNameInput('')
                            setSearch('')
                            setPage(1)
                          }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Temporada {data?.seasonLabel ?? '—'}
                  {latestUpdate ? ` · actualizado ${latestUpdate}` : ''}
                </Typography>
              </Stack>

              {isPending ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress aria-label="Cargando ranking" />
                </Box>
              ) : isError ? (
                <Alert severity="error">
                  {error instanceof Error
                    ? error.message
                    : 'No se pudo cargar el ranking.'}
                </Alert>
              ) : !data?.enabled ? (
                <Alert severity="warning">
                  El leaderboard de Play! Pokémon no está habilitado en este
                  entorno.
                </Alert>
              ) : data.rows.length === 0 ? (
                <Alert severity="info">
                  {searchActive
                    ? 'No hay jugadores públicos que coincidan con tu búsqueda.'
                    : 'Aún no hay jugadores que compartan su ranking en esta categoría.'}
                </Alert>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small" aria-label="Ranking de jugadores">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            Jugador
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            CP
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            Clasif.
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            Play! Pts
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.rows.map((row, index) => (
                          <TableRow key={row.userId} hover>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                color: 'text.secondary'
                              }}
                            >
                              {(data.page - 1) * data.pageSize + index + 1}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700 }}
                              >
                                {row.displayName}
                              </Typography>
                              {row.linkedDisplayName &&
                              row.linkedDisplayName !== row.displayName ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  Como {row.linkedDisplayName}
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            >
                              {row.championshipPoints.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              #{row.championshipRank.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {typeof row.playPoints === 'number'
                                ? row.playPoints.toLocaleString('es-CL')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {data.totalPages > 1 ? (
                    <Stack alignItems="center" sx={{ mt: 2.5 }}>
                      <Pagination
                        count={data.totalPages}
                        page={data.page}
                        onChange={(_, next) => setPage(next)}
                        color="primary"
                        disabled={isFetching}
                      />
                    </Stack>
                  ) : null}
                </>
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
