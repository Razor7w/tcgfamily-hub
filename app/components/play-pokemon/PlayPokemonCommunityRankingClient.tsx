'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
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
import Chip from '@mui/material/Chip'
import LeaderboardOutlined from '@mui/icons-material/LeaderboardOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { alpha, useTheme } from '@mui/material/styles'
import PlayPokemonPointsLabel from '@/components/play-pokemon/PlayPokemonPointsLabel'
import {
  PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
  PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID
} from '@/lib/play-pokemon-leaderboard/constants'
import type { PlayPokemonCommunityRankingRow } from '@/lib/play-pokemon-leaderboard/types'
import {
  usePlayPokemonCommunityRanking,
  usePlayPokemonCommunityRankingStores
} from '@/hooks/usePlayPokemonCommunityRanking'
import { useMe } from '@/hooks/useMe'
import { useMyChampionshipPoints } from '@/hooks/useMyChampionshipPoints'
import {
  usePlayPokemonRankVisibility,
  useUpdatePlayPokemonRankVisibility
} from '@/hooks/usePlayPokemonRankVisibility'

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

function CommunityRankingStat({
  label,
  value,
  pointsKind
}: {
  label: ReactNode
  value: string
  pointsKind?: 'championship' | 'play'
}) {
  return (
    <Box
      sx={t => ({
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 68,
        px: 1,
        py: 1,
        borderRadius: 1.5,
        bgcolor: alpha(t.palette.text.primary, 0.04),
        border: '1px solid',
        borderColor: alpha(t.palette.divider, 0.9)
      })}
    >
      <Box
        sx={{
          minHeight: 28,
          display: 'flex',
          alignItems: 'flex-end',
          mb: 0.5
        }}
      >
        {typeof label === 'string' && pointsKind ? (
          <PlayPokemonPointsLabel
            kind={pointsKind}
            label={label}
            iconSize={12}
            compact
          />
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.02em',
              fontSize: '0.6875rem',
              lineHeight: 1.2,
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          mt: 'auto'
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function CommunityRankingMobileCards({
  rows,
  page,
  pageSize,
  showStore
}: {
  rows: PlayPokemonCommunityRankingRow[]
  page: number
  pageSize: number
  showStore?: boolean
}) {
  return (
    <Stack
      spacing={1.25}
      role="list"
      aria-label="Ranking de jugadores"
      sx={{ display: { xs: 'flex', sm: 'none' } }}
    >
      {rows.map((row, index) => {
        const listRank = (page - 1) * pageSize + index + 1
        const isTopThree = listRank <= 3

        return (
          <Paper
            key={row.userId}
            component="article"
            role="listitem"
            variant="outlined"
            sx={t => ({
              p: 1.5,
              borderRadius: 2.5,
              borderColor: isTopThree
                ? alpha(t.palette.primary.main, 0.28)
                : alpha(t.palette.divider, 0.95),
              bgcolor: isTopThree
                ? alpha(t.palette.primary.main, 0.04)
                : 'background.paper',
              transition:
                'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              '&:active': {
                transform: 'scale(0.995)'
              }
            })}
          >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                sx={t => ({
                  width: 36,
                  height: 36,
                  mt: 0.15,
                  borderRadius: 1.5,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: isTopThree ? 'primary.main' : 'text.secondary',
                  bgcolor: isTopThree
                    ? alpha(t.palette.primary.main, 0.12)
                    : alpha(t.palette.text.primary, 0.06)
                })}
              >
                {listRank}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, minHeight: 40 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                    textWrap: 'balance'
                  }}
                >
                  {row.displayName}
                </Typography>
                {row.linkedDisplayName &&
                row.linkedDisplayName !== row.displayName ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.25 }}
                  >
                    Como {row.linkedDisplayName}
                  </Typography>
                ) : null}
                {row.divisionLabel ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.25 }}
                  >
                    {row.divisionLabel}
                    {showStore && row.storeName ? ` · ${row.storeName}` : ''}
                  </Typography>
                ) : showStore && row.storeName ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.25 }}
                  >
                    {row.storeName}
                  </Typography>
                ) : null}
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              alignItems="stretch"
              sx={{ mt: 1.25 }}
            >
              <CommunityRankingStat
                pointsKind="championship"
                label="CP"
                value={row.championshipPoints.toLocaleString('es-CL')}
              />
              <CommunityRankingStat
                label="Clasif."
                value={`#${row.championshipRank.toLocaleString('es-CL')}`}
              />
              <CommunityRankingStat
                pointsKind="play"
                label="Play! Pts"
                value={
                  typeof row.playPoints === 'number'
                    ? row.playPoints.toLocaleString('es-CL')
                    : '—'
                }
              />
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}

export default function PlayPokemonCommunityRankingClient() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { status: sessionStatus } = useSession()
  const isAuthenticated = sessionStatus === 'authenticated'
  const [storeId, setStoreId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [search, setSearch] = useState('')

  const { data: storesMeta, isPending: storesPending } =
    usePlayPokemonCommunityRankingStores()
  const { data: me } = useMe()
  const stores = useMemo(() => storesMeta?.stores ?? [], [storesMeta?.stores])
  const storeTabs = useMemo(
    () => [
      {
        id: PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID,
        name: 'Todos',
        playerCount:
          storesMeta?.totalPlayerCount ??
          stores.reduce((sum, store) => sum + store.playerCount, 0)
      },
      ...stores
    ],
    [stores, storesMeta?.totalPlayerCount]
  )
  const defaultStoreId =
    me?.defaultStoreId && stores.some(s => s.id === me.defaultStoreId)
      ? me.defaultStoreId
      : (storesMeta?.defaultStoreId ?? null)
  const resolvedStoreId =
    storeId ??
    (defaultStoreId && stores.some(s => s.id === defaultStoreId)
      ? defaultStoreId
      : (stores[0]?.id ?? null))

  const { data: myCp, isPending: myCpPending } = useMyChampionshipPoints({
    enabled: isAuthenticated
  })
  const isLinked = myCp?.found === true && myCp?.source === 'linked'
  const { data: visibility } = usePlayPokemonRankVisibility({
    enabled: isAuthenticated && isLinked
  })
  const updateVisibility = useUpdatePlayPokemonRankVisibility()
  const rankPublic =
    visibility?.rankPublic === true || myCp?.rankPublic === true

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(nameInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [nameInput])

  const { data, isPending, isError, error, isFetching } =
    usePlayPokemonCommunityRanking(resolvedStoreId, page, search)

  const searchActive = search.trim().length >= 2
  const isAllStoresTab =
    resolvedStoreId === PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID
  const tabIndex = storeTabs.findIndex(tab => tab.id === resolvedStoreId)
  const selectedTab = storeTabs.find(tab => tab.id === resolvedStoreId) ?? null
  const isDefaultStoreTab = Boolean(
    !isAllStoresTab &&
    defaultStoreId &&
    resolvedStoreId &&
    defaultStoreId === resolvedStoreId
  )

  const latestUpdate = useMemo(() => {
    const dates = (data?.rows ?? [])
      .map(row => formatUpdated(row.leaderboardUpdatedAt))
      .filter((value): value is string => Boolean(value))
    return dates[0] ?? null
  }, [data?.rows])

  const showSignInPrompt = sessionStatus === 'unauthenticated'
  const showLinkPrompt =
    isAuthenticated && !myCpPending && myCp?.enabled !== false && !isLinked
  const showVisibilityToggle =
    isAuthenticated && !myCpPending && isLinked && !rankPublic
  const signInHref = `/?callbackUrl=${encodeURIComponent(PLAY_POKEMON_CHILE_LEADERBOARD_PATH)}`

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
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
              Championship Points, agrupados por tienda de preferencia.
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

          {showSignInPrompt ? (
            <Alert
              severity="info"
              action={
                <Button
                  component={Link}
                  href={signInHref}
                  size="small"
                  color="inherit"
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Inicia sesión ahora y vincula tus puntos
                </Button>
              }
            >
              Inicia sesión para vincular tus Championship Points y aparecer en
              este ranking.
            </Alert>
          ) : null}

          {showLinkPrompt ? (
            <Alert
              severity="info"
              action={
                <Button
                  component={Link}
                  href={PLAY_POKEMON_CHILE_LEADERBOARD_PATH}
                  size="small"
                  color="inherit"
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Vincula tus puntos ahora
                </Button>
              }
            >
              Para aparecer en este ranking, búscate en Ranking Chile y vincula
              tus Championship Points a tu cuenta.
            </Alert>
          ) : null}

          {showVisibilityToggle ? (
            <Paper
              variant="outlined"
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2.5,
                borderColor: alpha(theme.palette.primary.main, 0.2),
                bgcolor: alpha(theme.palette.primary.main, 0.04)
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={false}
                    disabled={updateVisibility.isPending}
                    onChange={(_, checked) => {
                      void updateVisibility.mutateAsync(checked, {
                        onSuccess: () => {
                          void queryClient.invalidateQueries({
                            queryKey: ['play-pokemon', 'community-ranking']
                          })
                        }
                      })
                    }}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Mostrar mi ranking (#) junto a mi nombre en este listado.
                  </Typography>
                }
              />
            </Paper>
          ) : null}

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
              value={tabIndex >= 0 ? tabIndex : false}
              onChange={(_, idx) => {
                const next = storeTabs[idx]
                if (next) {
                  setStoreId(next.id)
                  setNameInput('')
                  setSearch('')
                  setPage(1)
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                px: { xs: 0.5, sm: 1 }
              }}
            >
              {storeTabs.map(tab => (
                <Tab
                  key={tab.id}
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>{tab.name}</span>
                      {defaultStoreId === tab.id ? (
                        <Chip
                          label="Tu tienda"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            '& .MuiChip-label': { px: 0.6 }
                          }}
                        />
                      ) : null}
                    </Stack>
                  }
                  sx={{ fontWeight: 800, textTransform: 'none', minHeight: 48 }}
                />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              {storesPending ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress aria-label="Cargando tiendas" />
                </Box>
              ) : stores.length === 0 ? (
                <Alert severity="info">
                  Aún no hay jugadores públicos con tienda de preferencia en el
                  ranking.
                </Alert>
              ) : (
                <>
                  {selectedTab ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <StorefrontOutlined
                        fontSize="small"
                        color={
                          isAllStoresTab || isDefaultStoreTab
                            ? 'primary'
                            : 'action'
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        {isAllStoresTab ? (
                          <>
                            Mostrando todos los jugadores públicos de la
                            comunidad
                          </>
                        ) : isDefaultStoreTab ? (
                          <>
                            Tu tienda predeterminada:{' '}
                            <Box
                              component="span"
                              sx={{ fontWeight: 800, color: 'text.primary' }}
                            >
                              {selectedTab.name}
                            </Box>
                          </>
                        ) : (
                          <>
                            Mostrando jugadores de{' '}
                            <Box
                              component="span"
                              sx={{ fontWeight: 800, color: 'text.primary' }}
                            >
                              {selectedTab.name}
                            </Box>
                          </>
                        )}
                        {' · '}
                        {selectedTab.playerCount} jugador
                        {selectedTab.playerCount === 1 ? '' : 'es'}
                      </Typography>
                    </Stack>
                  ) : null}
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
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
                    >
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
                        : isAllStoresTab
                          ? 'Aún no hay jugadores que compartan su ranking en la comunidad.'
                          : 'Aún no hay jugadores que compartan su ranking en esta tienda.'}
                    </Alert>
                  ) : (
                    <>
                      <CommunityRankingMobileCards
                        rows={data.rows}
                        page={data.page}
                        pageSize={data.pageSize}
                        showStore={isAllStoresTab}
                      />

                      <TableContainer
                        sx={{ display: { xs: 'none', sm: 'block' } }}
                      >
                        <Table size="small" aria-label="Ranking de jugadores">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>
                                Jugador
                              </TableCell>
                              {isAllStoresTab ? (
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Tienda
                                </TableCell>
                              ) : null}
                              <TableCell sx={{ fontWeight: 800 }}>
                                Cat.
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
                                <PlayPokemonPointsLabel
                                  kind="championship"
                                  label="CP"
                                  align="right"
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
                                Clasif.
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
                                <PlayPokemonPointsLabel
                                  kind="play"
                                  label="Play! Pts"
                                  align="right"
                                />
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
                                {isAllStoresTab ? (
                                  <TableCell>
                                    {row.storeSlug ? (
                                      <Typography
                                        component={Link}
                                        href={`/${encodeURIComponent(row.storeSlug)}`}
                                        variant="body2"
                                        sx={{
                                          fontWeight: 600,
                                          color: 'text.secondary',
                                          textDecoration: 'none',
                                          '&:hover': {
                                            color: 'primary.main',
                                            textDecoration: 'underline'
                                          }
                                        }}
                                      >
                                        {row.storeName ?? '—'}
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {row.storeName ?? '—'}
                                      </Typography>
                                    )}
                                  </TableCell>
                                ) : null}
                                <TableCell
                                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {row.divisionLabel ?? '—'}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    fontWeight: 800,
                                    fontVariantNumeric: 'tabular-nums'
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
                                  #
                                  {row.championshipRank.toLocaleString('es-CL')}
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
                </>
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
