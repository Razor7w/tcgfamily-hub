'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
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
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { alpha, useTheme } from '@mui/material/styles'
import Snackbar from '@mui/material/Snackbar'
import Header from '@/components/Header'
import PlayPokemonPointsLabel from '@/components/play-pokemon/PlayPokemonPointsLabel'
import { useLinkChampionshipPoints } from '@/hooks/useLinkChampionshipPoints'
import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { usePlayPokemonChileLeaderboard } from '@/hooks/usePlayPokemonChileLeaderboard'

const DIVISION_LABELS: Record<PlayPokemonLeaderboardDivision, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

function formatUpdated(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function PlayPokemonChileRankingPage() {
  const theme = useTheme()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const linkPoints = useLinkChampionshipPoints()
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const [linkErr, setLinkErr] = useState<string | null>(null)
  const [linkingKey, setLinkingKey] = useState<string | null>(null)
  const [division, setDivision] =
    useState<PlayPokemonLeaderboardDivision>('masters')
  const [page, setPage] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(nameInput.trim())
    }, 350)
    return () => window.clearTimeout(handle)
  }, [nameInput])

  useEffect(() => {
    setPage(1)
  }, [search, division])

  const { data, isPending, isError, error, isFetching } =
    usePlayPokemonChileLeaderboard(division, page, search)

  const searchActive = search.trim().length >= 2

  const updatedLabel = useMemo(
    () => formatUpdated(data?.calculationDate),
    [data?.calculationDate]
  )

  const tabIndex = PLAY_POKEMON_LEADERBOARD_DIVISIONS.indexOf(division)
  const isAuthenticated = sessionStatus === 'authenticated'

  async function handleAssignRow(row: { rank: number; displayName: string }) {
    setLinkErr(null)
    setLinkMsg(null)
    const key = `${row.rank}-${row.displayName}`
    setLinkingKey(key)
    try {
      await linkPoints.mutateAsync({
        division,
        rank: row.rank,
        displayName: row.displayName
      })
      setLinkMsg('Puntos vinculados a tu cuenta.')
    } catch (error) {
      setLinkErr(
        error instanceof Error
          ? error.message
          : 'No se pudieron vincular los puntos.'
      )
    } finally {
      setLinkingKey(null)
    }
  }

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
                Ranking Championship Points · Chile
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '72ch' }}
            >
              Clasificación oficial Play! Pokémon por categoría de edad,
              filtrada a jugadores de Chile. Datos en vivo desde el leaderboard
              SPAR.
            </Typography>
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
              ) : (
                <Stack spacing={2}>
                  <TextField
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Buscar por nombre…"
                    size="small"
                    fullWidth
                    inputProps={{
                      'aria-label': 'Filtrar jugadores por nombre'
                    }}
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
                            edge="end"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                    helperText={
                      nameInput.trim().length === 1
                        ? 'Escribe al menos 2 caracteres para filtrar.'
                        : searchActive
                          ? `Mostrando coincidencias para “${data.search}”. Si te encuentras, usa Asignar valores.`
                          : 'Coincidencia parcial, sin distinguir tildes.'
                    }
                  />

                  {searchActive && !isAuthenticated ? (
                    <Alert severity="info">
                      Inicia sesión para vincular una fila del ranking a tu
                      cuenta.
                    </Alert>
                  ) : null}

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {searchActive
                        ? `${data.count.toLocaleString('es-CL')} coincidencias`
                        : `${data.count.toLocaleString('es-CL')} jugadores`}
                      {' · '}
                      {DIVISION_LABELS[data.division]}
                      {updatedLabel ? ` · actualizado ${updatedLabel}` : ''}
                      {isFetching ? ' · actualizando…' : ''}
                    </Typography>
                    {data.officialLeaderboardUrl ? (
                      <Button
                        component="a"
                        href={data.officialLeaderboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Leaderboard oficial
                      </Button>
                    ) : null}
                  </Stack>

                  <TableContainer>
                    <Table size="small" aria-label="Ranking Chile">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: 72 }}>
                            #
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            Jugador
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 800, width: 120 }}
                          >
                            <PlayPokemonPointsLabel
                              kind="championship"
                              label="CP"
                              align="right"
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 800, width: 120 }}
                          >
                            <PlayPokemonPointsLabel
                              kind="play"
                              label="Play! Pts"
                              align="right"
                            />
                          </TableCell>
                          {searchActive && isAuthenticated ? (
                            <TableCell sx={{ fontWeight: 800, width: 148 }} />
                          ) : null}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={searchActive && isAuthenticated ? 5 : 4}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ py: 2, textAlign: 'center' }}
                              >
                                {searchActive
                                  ? `Ningún jugador coincide con “${data.search}”.`
                                  : 'Sin resultados.'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.rows.map(row => {
                            const canAssign = searchActive && isAuthenticated
                            const rowKey = `${row.rank}-${row.displayName}`
                            return (
                              <TableRow key={rowKey} hover>
                                <TableCell
                                  sx={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 700
                                  }}
                                >
                                  {row.rank.toLocaleString('es-CL')}
                                </TableCell>
                                <TableCell>{row.displayName}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 800
                                  }}
                                >
                                  {row.championshipPoints.toLocaleString(
                                    'es-CL'
                                  )}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {row.playPoints.toLocaleString('es-CL')}
                                </TableCell>
                                {searchActive && isAuthenticated ? (
                                  <TableCell align="right">
                                    {canAssign ? (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        disabled={linkingKey === rowKey}
                                        onClick={() => handleAssignRow(row)}
                                        sx={{
                                          textTransform: 'none',
                                          fontWeight: 700,
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {linkingKey === rowKey
                                          ? 'Guardando…'
                                          : 'Asignar valores'}
                                      </Button>
                                    ) : null}
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {data.totalPages > 1 ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}
                    >
                      <Pagination
                        count={data.totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        shape="rounded"
                        showFirstButton
                        showLastButton
                        disabled={isFetching}
                      />
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Box>
          </Paper>

          <Button
            component={Link}
            href="/dashboard/tu-actividad"
            variant="text"
            size="small"
            sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
          >
            Volver a Tu actividad
          </Button>
        </Stack>
      </Container>

      <Snackbar
        open={Boolean(linkMsg)}
        autoHideDuration={5000}
        onClose={() => setLinkMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setLinkMsg(null)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => router.push('/dashboard/tu-actividad')}
            >
              Ver en Tu actividad
            </Button>
          }
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
        >
          {linkMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(linkErr)}
        autoHideDuration={7000}
        onClose={() => setLinkErr(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLinkErr(null)}>
          {linkErr}
        </Alert>
      </Snackbar>
    </Box>
  )
}
