'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import DecklistImagePreviewButton from '@/components/decklist/DecklistImagePreviewButton'
import MatchRoundOpponentCell from '@/components/events/MatchRoundOpponentCell'
import {
  useTournamentMeta,
  type TournamentMetaParticipant,
  type TournamentMetagameRow,
  type TournamentMetagameVariantRow,
  type TournamentStandingsCategory,
  type TournamentStandingsMeta,
  type TournamentStandingsRow
} from '@/hooks/useWeeklyEvents'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'
import {
  roundTableOutcome,
  summarizeRoundResult,
  type ParticipantMatchRoundDTO
} from '@/lib/participant-match-round'
import { formatParticipantStandingLabel } from '@/lib/tournament-standings-meta'
import {
  MATCH_LOSS_COLOR,
  MATCH_TIE_COLOR,
  MATCH_WIN_COLOR,
  matchResultPillSx,
  matchRowAccentParts
} from '@/lib/match-round-ui'
import { formatWhen } from '@/components/events/weeklyEventsSectionUtils'
import { formatPersonDisplayName } from '@/lib/weekly-events'

const OPP_SPRITE = limitlessSpriteDimensions(20)
const META_SPRITE = limitlessSpriteDimensions(28)
const DECK_SPRITE = limitlessSpriteDimensions(40)

/** Misma superficie que las cards de la pestaña Jugadores. */
function metaTabSurfaceCardSx(t: Theme) {
  return {
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: alpha(t.palette.primary.main, 0.14),
    bgcolor: 'background.paper',
    boxShadow: `0 16px 48px -28px ${alpha(t.palette.primary.dark, 0.2)}`
  }
}

/** Fondo del área de contenido bajo las tabs (gris zinc, igual en las 3 pestañas). */
function metaTabPanelSx(t: Theme) {
  return {
    borderRadius: 3,
    bgcolor: t.palette.background.default,
    p: { xs: 2, sm: 2.5 }
  }
}

function sectionLabelSx() {
  return {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'text.secondary',
    display: 'block',
    mb: 1
  }
}

function RecordMetric({
  label,
  value,
  accent
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <Box
      sx={{
        minWidth: 52,
        px: 1.25,
        py: 0.75,
        borderRadius: 1.5,
        textAlign: 'center',
        bgcolor: alpha(accent, 0.1),
        border: '1px solid',
        borderColor: alpha(accent, 0.22)
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 600,
          color: 'text.secondary',
          lineHeight: 1.2,
          fontSize: '0.65rem'
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: accent,
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function StandingPlaceBadge({
  place,
  isDnf
}: {
  place: number | null
  isDnf: boolean
}) {
  const label = formatParticipantStandingLabel({ place, isDnf })
  const isNumeric = /^\d+$/.test(label)

  return (
    <Box
      aria-label={`Puesto ${label}`}
      sx={t => ({
        flexShrink: 0,
        minWidth: isNumeric ? 40 : 44,
        px: isNumeric ? 0.5 : 1,
        py: 0.5,
        borderRadius: 1.5,
        textAlign: 'center',
        bgcolor: alpha(t.palette.text.primary, 0.05),
        border: '1px solid',
        borderColor: alpha(t.palette.text.primary, 0.1)
      })}
    >
      <Typography
        component="span"
        sx={{
          fontWeight: 800,
          fontSize: isNumeric ? '1.25rem' : '0.75rem',
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: isNumeric ? '-0.03em' : '0.02em',
          color: isNumeric ? 'text.primary' : 'text.secondary'
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

function DeckSpritesRow({ slugs }: { slugs: string[] }) {
  if (slugs.length === 0) return null
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {slugs.slice(0, 2).map(slug => (
        <Box
          key={slug}
          sx={{
            width: { xs: 40, md: DECK_SPRITE.width + 8 },
            height: { xs: 40, md: DECK_SPRITE.height + 8 },
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Box
            component="img"
            src={getLimitlessPokemonSpriteUrl(slug)}
            alt=""
            sx={{
              width: { xs: 32, md: DECK_SPRITE.width },
              height: { xs: 32, md: DECK_SPRITE.height },
              objectFit: 'contain',
              imageRendering: 'pixelated'
            }}
          />
        </Box>
      ))}
    </Stack>
  )
}

function MetaRoundRow({ row }: { row: ParticipantMatchRoundDTO }) {
  const outcome = roundTableOutcome(row)
  const accent = matchRowAccentParts(outcome)
  const resultLabel = summarizeRoundResult(row)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '40px 1fr auto', sm: '44px 1fr auto' },
        gap: { xs: 1, sm: 1.25 },
        alignItems: 'center',
        px: { xs: 1.25, sm: 1.5 },
        py: { xs: 1.25, sm: 1.35 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: accent.borderLeftColor,
        bgcolor: accent.bgcolor,
        transition: 'background-color 0.2s ease'
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{
          fontVariantNumeric: 'tabular-nums',
          color:
            outcome === 'win'
              ? MATCH_WIN_COLOR
              : outcome === 'loss'
                ? MATCH_LOSS_COLOR
                : outcome === 'tie'
                  ? MATCH_TIE_COLOR
                  : 'text.secondary'
        }}
      >
        {row.roundNum}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <MatchRoundOpponentCell
          row={row}
          spriteSize={OPP_SPRITE.width}
          inline
        />
      </Box>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 40,
          px: 1.1,
          py: 0.45,
          borderRadius: 1.5,
          fontWeight: 800,
          fontSize: '0.75rem',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.03em',
          lineHeight: 1.2,
          ...matchResultPillSx(outcome)
        }}
      >
        {resultLabel}
      </Box>
    </Box>
  )
}

type MetaTab = 'standings' | 'metagame' | 'players'

function standingsCategoryTabSortKey(categoryIndex: number): number {
  if (categoryIndex === 2) return 0
  if (categoryIndex === 1) return 1
  if (categoryIndex === 0) return 2
  return 9
}

function formatRecord(
  record: { wins: number; losses: number; ties: number } | null
): string {
  if (!record) return '—'
  return `${record.wins} - ${record.losses} - ${record.ties}`
}

function formatPlace(row: TournamentStandingsRow): string {
  if (row.isDnf)
    return row.place != null && row.place > 0 ? String(row.place) : '—'
  if (row.place != null && row.place > 0) return String(row.place)
  return '—'
}

function formatShare(sharePercent: number): string {
  return `${sharePercent.toFixed(2)}%`
}

function formatScore(wins: number, losses: number, ties: number): string {
  return `${wins} - ${losses} - ${ties}`
}

function formatWinPercent(winPercent: number | null): string {
  if (winPercent == null) return '—'
  if (winPercent >= 100 || winPercent === 0) return `${winPercent.toFixed(0)}%`
  return `${winPercent.toFixed(2)}%`
}

function MobileStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          fontWeight: 600,
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          mb: 0.25
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function MetagameDeckSprites({ slugs }: { slugs: string[] }) {
  const shown = slugs.slice(0, 2)
  if (shown.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    )
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {shown.map(slug => (
        <Box
          key={slug}
          component="img"
          src={getLimitlessPokemonSpriteUrl(slug)}
          alt=""
          sx={{
            width: META_SPRITE.width,
            height: META_SPRITE.height,
            objectFit: 'contain',
            imageRendering: 'pixelated'
          }}
        />
      ))}
    </Stack>
  )
}

function StandingsRowDeckSprites({ slugs }: { slugs: string[] }) {
  return <MetagameDeckSprites slugs={slugs} />
}

function StandingsMobileCard({
  eventId,
  row
}: {
  eventId: string
  row: TournamentStandingsRow
}) {
  const reportedDeckOnPlatform =
    row.deckPokemonSlugs.length > 0 || row.hasDecklist
  const hasDeckRow =
    row.deckPokemonSlugs.length > 0 ||
    Boolean(row.decklistDisplay) ||
    (row.hasDecklist && row.participantKey)

  return (
    <Box
      sx={t => ({
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(t.palette.text.primary, 0.03),
        transition: 'background-color 0.2s ease',
        '&:active': { bgcolor: alpha(t.palette.primary.main, 0.04) }
      })}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <StandingPlaceBadge place={row.place} isDnf={row.isDnf} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              variant="subtitle2"
              fontWeight={reportedDeckOnPlatform ? 800 : 600}
              sx={{ lineHeight: 1.25 }}
            >
              {formatPersonDisplayName(row.displayName)}
            </Typography>
            {row.isDnf ? (
              <Chip
                label="drop"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: t => alpha(t.palette.text.primary, 0.08)
                }}
              />
            ) : null}
            {reportedDeckOnPlatform ? (
              <Chip
                label="reportó"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            ) : null}
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1.25,
              mt: 1.25
            }}
          >
            <MobileStat
              label="Puntos"
              value={row.points != null ? row.points : '—'}
            />
            <MobileStat label="Récord" value={formatRecord(row.record)} />
            <MobileStat
              label="Listado"
              value={
                row.hasDecklist && row.participantKey ? (
                  <DecklistImagePreviewButton
                    compact
                    source={{
                      kind: 'eventParticipant',
                      eventId,
                      participantKey: row.participantKey,
                      title: `${row.displayName} — ${row.decklistDisplay?.decklistName ?? 'Listado'}`
                    }}
                  />
                ) : (
                  '—'
                )
              }
            />
          </Box>
          {hasDeckRow ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1.25, minWidth: 0 }}
            >
              {row.deckPokemonSlugs.length > 0 ? (
                <StandingsRowDeckSprites slugs={row.deckPokemonSlugs} />
              ) : null}
              {row.decklistDisplay ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 0, lineHeight: 1.3 }}
                  noWrap
                >
                  {row.decklistDisplay.decklistName}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </Box>
  )
}

function MetagameStatsGrid({
  sharePercent,
  wins,
  losses,
  ties,
  winPercent
}: {
  sharePercent: number
  wins: number
  losses: number
  ties: number
  winPercent: number | null
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 1.25
      }}
    >
      <MobileStat label="Share" value={formatShare(sharePercent)} />
      <MobileStat
        label="Score"
        value={formatScore(wins, losses, ties)}
      />
      <MobileStat label="Win %" value={formatWinPercent(winPercent)} />
    </Box>
  )
}

function MetagameVariantMobileCard({
  variant
}: {
  variant: TournamentMetagameVariantRow
}) {
  return (
    <Box
      sx={t => ({
        pl: 1.5,
        py: 1,
        borderLeft: '2px solid',
        borderColor: alpha(t.palette.primary.main, 0.35),
        bgcolor: alpha(t.palette.text.primary, 0.02)
      })}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <MetagameDeckSprites slugs={variant.deckSlugs} />
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}
        >
          {variant.deckName}
        </Typography>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: 'text.secondary',
            flexShrink: 0
          }}
        >
          ×{variant.count}
        </Typography>
      </Stack>
      <MetagameStatsGrid
        sharePercent={variant.sharePercent}
        wins={variant.wins}
        losses={variant.losses}
        ties={variant.ties}
        winPercent={variant.winPercent}
      />
    </Box>
  )
}

function MetagameMobileCard({ row }: { row: TournamentMetagameRow }) {
  return (
    <Box
      sx={t => ({
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(t.palette.text.primary, 0.03),
        transition: 'background-color 0.2s ease',
        '&:active': { bgcolor: alpha(t.palette.primary.main, 0.04) }
      })}
    >
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ mb: 1.25 }}
      >
        <MetagameDeckSprites slugs={row.deckSlugs} />
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}
        >
          {row.deckName}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={800}
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: 'primary.main',
            flexShrink: 0
          }}
        >
          ×{row.count}
        </Typography>
      </Stack>
      <MetagameStatsGrid
        sharePercent={row.sharePercent}
        wins={row.wins}
        losses={row.losses}
        ties={row.ties}
        winPercent={row.winPercent}
      />
      {row.variants.length > 0 ? (
        <Stack spacing={1} sx={{ mt: 1.25, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          {row.variants.map(variant => (
            <MetagameVariantMobileCard key={variant.deckKey} variant={variant} />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

function MetagameVariantTableRow({
  variant
}: {
  variant: TournamentMetagameVariantRow
}) {
  return (
    <TableRow
      sx={t => ({
        bgcolor: alpha(t.palette.text.primary, 0.02),
        '& td': { borderBottomColor: alpha(t.palette.divider, 0.6) }
      })}
    >
      <TableCell sx={{ py: 0.75, pl: 2.5 }}>
        <MetagameDeckSprites slugs={variant.deckSlugs} />
      </TableCell>
      <TableCell
        align="right"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          color: 'text.secondary',
          py: 0.75
        }}
      >
        {variant.count}
      </TableCell>
      <TableCell
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          py: 0.75,
          pl: 3
        }}
      >
        {variant.deckName}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', py: 0.75 }}
      >
        {formatShare(variant.sharePercent)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', py: 0.75 }}
      >
        {formatScore(variant.wins, variant.losses, variant.ties)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', py: 0.75 }}
      >
        {formatWinPercent(variant.winPercent)}
      </TableCell>
    </TableRow>
  )
}

function TournamentStandingsTable({
  eventId,
  rows
}: {
  eventId: string
  rows: TournamentStandingsRow[]
}) {
  if (rows.length === 0) return null

  return (
    <>
      <Stack
        spacing={1}
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 1.5
        }}
      >
        {rows.map(row => {
          const rowKey = `${row.popId ?? row.displayName}-${row.place ?? 'x'}-${row.reportOnly ? 'r' : 's'}`
          return (
            <StandingsMobileCard key={rowKey} eventId={eventId} row={row} />
          )
        })}
      </Stack>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ width: 56, fontWeight: 800, borderBottomWidth: 2 }}
              >
                Place
              </TableCell>
              <TableCell sx={{ fontWeight: 800, borderBottomWidth: 2 }}>
                Name
              </TableCell>
              <TableCell
                align="right"
                sx={{ width: 56, fontWeight: 800, borderBottomWidth: 2 }}
              >
                Points
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 800, borderBottomWidth: 2 }}
              >
                Record
              </TableCell>
              <TableCell
                sx={{ width: 72, fontWeight: 800, borderBottomWidth: 2 }}
              >
                Deck
              </TableCell>
              <TableCell
                align="center"
                sx={{ width: 48, fontWeight: 800, borderBottomWidth: 2 }}
              >
                List
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const rowKey = `${row.popId ?? row.displayName}-${row.place ?? 'x'}-${row.reportOnly ? 'r' : 's'}`
              const reportedDeckOnPlatform =
                row.deckPokemonSlugs.length > 0 || row.hasDecklist
              return (
                <TableRow key={rowKey} hover>
                  <TableCell
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography variant="body2" fontWeight={700}>
                        {formatPlace(row)}
                      </Typography>
                      {row.isDnf ? (
                        <Chip
                          label="drop"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: t => alpha(t.palette.text.primary, 0.08)
                          }}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="body2"
                        fontWeight={reportedDeckOnPlatform ? 700 : 500}
                      >
                        {formatPersonDisplayName(row.displayName)}
                      </Typography>
                      {reportedDeckOnPlatform ? (
                        <Chip
                          label="reportó"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700
                          }}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    {row.points != null ? row.points : '—'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    {formatRecord(row.record)}
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <StandingsRowDeckSprites slugs={row.deckPokemonSlugs} />
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    {row.hasDecklist && row.participantKey ? (
                      <DecklistImagePreviewButton
                        compact
                        source={{
                          kind: 'eventParticipant',
                          eventId,
                          participantKey: row.participantKey,
                          title: `${row.displayName} — ${row.decklistDisplay?.decklistName ?? 'Listado'}`
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

function TournamentStandingsPanel({
  eventId,
  standings
}: {
  eventId: string
  standings: TournamentStandingsMeta
}) {
  const orderedCategories = useMemo(
    () =>
      [...standings.categories].sort(
        (a, b) =>
          standingsCategoryTabSortKey(a.categoryIndex) -
          standingsCategoryTabSortKey(b.categoryIndex)
      ),
    [standings.categories]
  )
  const [catTab, setCatTab] = useState(0)
  const safeCatTab = Math.min(catTab, Math.max(0, orderedCategories.length - 1))
  const activeCategory: TournamentStandingsCategory | undefined =
    orderedCategories[safeCatTab]
  const hasImported = orderedCategories.length > 0
  const hasReportedExtra = standings.reportedWithoutPlacement.length > 0

  if (!hasImported && !hasReportedExtra) {
    return (
      <Alert severity="info">
        La clasificación del torneo aún no está publicada en la plataforma.
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      {hasImported ? (
        <>
          {orderedCategories.length > 1 ? (
            <Tabs
              value={safeCatTab}
              onChange={(_, v) => setCatTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  minHeight: 40
                }
              }}
            >
              {orderedCategories.map(c => (
                <Tab key={c.categoryIndex} label={c.categoryLabel} />
              ))}
            </Tabs>
          ) : null}
          <Card elevation={0} sx={metaTabSurfaceCardSx}>
            <TournamentStandingsTable
              eventId={eventId}
              rows={activeCategory?.rows ?? []}
            />
          </Card>
        </>
      ) : null}

      {hasReportedExtra ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={800}>
            {hasImported
              ? 'Reportaron en Nexo (sin puesto en clasificación)'
              : 'Jugadores que reportaron en Nexo'}
          </Typography>
          <Card elevation={0} sx={metaTabSurfaceCardSx}>
            <TournamentStandingsTable
              eventId={eventId}
              rows={standings.reportedWithoutPlacement}
            />
          </Card>
        </Stack>
      ) : null}
    </Stack>
  )
}

function TournamentMetagameTable({ rows }: { rows: TournamentMetagameRow[] }) {
  if (rows.length === 0) {
    return (
      <Alert severity="info">
        No hay mazos con Pokémon reportados para calcular el metagame.
      </Alert>
    )
  }

  return (
    <Card elevation={0} sx={metaTabSurfaceCardSx}>
      <Stack
        spacing={1}
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 1.5
        }}
      >
        {rows.map(row => (
          <MetagameMobileCard key={row.deckKey} row={row} />
        ))}
      </Stack>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 72, borderBottomWidth: 2 }} />
              <TableCell
                align="right"
                sx={{ width: 48, fontWeight: 800, borderBottomWidth: 2 }}
              />
              <TableCell sx={{ fontWeight: 800, borderBottomWidth: 2 }}>
                Deck
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 800, borderBottomWidth: 2 }}
              >
                Share
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 800, borderBottomWidth: 2 }}
              >
                Score
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 800, borderBottomWidth: 2 }}
              >
                Win %
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <Fragment key={row.deckKey}>
                <TableRow hover>
                  <TableCell sx={{ py: 1.25 }}>
                    <MetagameDeckSprites slugs={row.deckSlugs} />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                      py: 1.25
                    }}
                  >
                    {row.count}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.25 }}>
                    {row.deckName}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    {formatShare(row.sharePercent)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    {formatScore(row.wins, row.losses, row.ties)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', py: 1.25 }}
                  >
                    {formatWinPercent(row.winPercent)}
                  </TableCell>
                </TableRow>
                {row.variants.map(variant => (
                  <MetagameVariantTableRow
                    key={`${row.deckKey}-${variant.deckKey}`}
                    variant={variant}
                  />
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

function ParticipantMetaCard({
  eventId,
  participant: p
}: {
  eventId: string
  participant: TournamentMetaParticipant
}) {
  const theme = useTheme()
  const sortedRounds = useMemo(
    () => [...p.matchRounds].sort((a, b) => a.roundNum - b.roundNum),
    [p.matchRounds]
  )
  const hasDeck = p.deckPokemonSlugs.length > 0 || Boolean(p.decklistDisplay)
  const showRounds = sortedRounds.length > 0

  return (
    <Card
      elevation={0}
      sx={t => ({
        ...metaTabSurfaceCardSx(t),
        transition:
          'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 22px 56px -24px ${alpha(t.palette.primary.dark, 0.26)}`
        }
      })}
    >
      <Box
        sx={t => ({
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.75, sm: 2 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          background: `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${alpha(t.palette.background.paper, 1)} 72%)`,
          borderBottom: '1px solid',
          borderColor: 'divider'
        })}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ minWidth: 0, flex: 1 }}
        >
          <StandingPlaceBadge place={p.standingPlace} isDnf={p.standingIsDnf} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              minWidth: 0
            }}
          >
            {formatPersonDisplayName(p.displayName)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <RecordMetric
            label="Victorias"
            value={p.matchRecord?.wins ?? 0}
            accent={MATCH_WIN_COLOR}
          />
          <RecordMetric
            label="Derrotas"
            value={p.matchRecord?.losses ?? 0}
            accent={MATCH_LOSS_COLOR}
          />
          <RecordMetric
            label="Empates"
            value={p.matchRecord?.ties ?? 0}
            accent={MATCH_TIE_COLOR}
          />
        </Stack>
      </Box>

      <Stack spacing={0} sx={{ p: { xs: 2, sm: 2.5 } }}>
        {hasDeck ? (
          <Box>
            <Typography component="span" sx={sectionLabelSx()}>
              Mazo
            </Typography>
            <Box
              sx={{
                p: { xs: 1.25, sm: 1.75 },
                borderRadius: 2,
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                border: '1px solid',
                borderColor: 'divider',
                display: 'grid',
                gridTemplateColumns: {
                  xs: p.deckPokemonSlugs.length > 0 ? 'auto 1fr' : '1fr',
                  md:
                    p.deckPokemonSlugs.length > 0 ? 'auto 1fr auto' : '1fr auto'
                },
                columnGap: { xs: 1.25, md: 2 },
                rowGap: { xs: 0.35, md: 0 },
                alignItems: { xs: 'start', md: 'center' }
              }}
            >
              {p.deckPokemonSlugs.length > 0 ? (
                <Box
                  sx={{
                    gridRow: { xs: '1 / span 2', md: 'auto' },
                    alignSelf: { xs: 'start', md: 'center' },
                    pt: { xs: 0.15, md: 0 }
                  }}
                >
                  <DeckSpritesRow slugs={p.deckPokemonSlugs} />
                </Box>
              ) : null}
              <Box sx={{ minWidth: 0, alignSelf: 'center' }}>
                {p.decklistDisplay ? (
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    sx={{ lineHeight: 1.25 }}
                  >
                    {p.decklistDisplay.decklistName}
                  </Typography>
                ) : p.deckPokemonSlugs.length > 0 ? (
                  <Typography variant="subtitle2" fontWeight={700}>
                    {p.deckPokemonSlugs.join(' · ')}
                  </Typography>
                ) : null}
              </Box>
              {p.decklistDisplay ? (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      xs: p.deckPokemonSlugs.length > 0 ? 2 : 1,
                      md: 'auto'
                    }
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.3 }}
                  >
                    {p.decklistDisplay.listLabel}
                  </Typography>
                  {p.hasDecklist ? (
                    <DecklistImagePreviewButton
                      compact
                      source={{
                        kind: 'eventParticipant',
                        eventId,
                        participantKey: p.participantKey,
                        title: `${p.displayName} — ${p.decklistDisplay.decklistName}`
                      }}
                    />
                  ) : null}
                </Stack>
              ) : null}
            </Box>
          </Box>
        ) : null}

        {hasDeck && showRounds ? <Divider sx={{ my: 2 }} /> : null}

        {showRounds ? (
          <Box>
            <Typography component="span" sx={sectionLabelSx()}>
              Rondas reportadas
            </Typography>
            <Stack spacing={1}>
              {sortedRounds.map(r => (
                <MetaRoundRow key={r.id ?? `r-${r.roundNum}`} row={r} />
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Card>
  )
}

export default function TournamentMetaPageContent() {
  const params = useParams()
  const eventId = typeof params.eventId === 'string' ? params.eventId : ''
  const { data, isPending, isError, error } = useTournamentMeta(eventId || null)
  const [tab, setTab] = useState<MetaTab>('standings')

  const participants = data?.participants ?? []
  const metagame = data?.metagame ?? []
  const standingsMeta = data?.standings
  const hasStandingsContent =
    (standingsMeta?.categories.length ?? 0) > 0 ||
    (standingsMeta?.reportedWithoutPlacement.length ?? 0) > 0
  const hasPageContent =
    hasStandingsContent || participants.length > 0 || metagame.length > 0

  return (
    <DashboardModuleRouteGate moduleId="myTournaments">
      <Box
        sx={t => ({
          minHeight: '100dvh',
          py: { xs: 2, sm: 4 },
          background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`
        })}
      >
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
          <Button
            component={Link}
            href="/dashboard/eventos"
            startIcon={<ArrowBackIcon />}
            size="medium"
            sx={t => ({
              mb: { xs: 2, sm: 2.5 },
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                bgcolor: alpha(t.palette.primary.main, 0.08),
                color: 'primary.main'
              }
            })}
          >
            Volver a eventos
          </Button>

          {isPending ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : isError ? (
            <Alert severity="error">
              {error instanceof Error ? error.message : 'No se pudo cargar'}
            </Alert>
          ) : !data ? null : (
            <Stack spacing={3}>
              <Stack spacing={0.75}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ fontWeight: 800, letterSpacing: '0.1em' }}
                >
                  Meta del torneo
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ minWidth: 0 }}
                >
                  {data.store ? (
                    <Avatar
                      variant="rounded"
                      src={data.store.logoUrl.trim() || undefined}
                      alt={data.store.name}
                      sx={t => ({
                        width: { xs: 44, sm: 52 },
                        height: { xs: 44, sm: 52 },
                        flexShrink: 0,
                        bgcolor: alpha(t.palette.text.primary, 0.06),
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiAvatar-img': {
                          objectFit: 'contain',
                          p: 0.5
                        }
                      })}
                    >
                      <StorefrontOutlinedIcon
                        sx={{ fontSize: 28 }}
                        aria-hidden
                      />
                    </Avatar>
                  ) : null}
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{ fontWeight: 800, minWidth: 0 }}
                  >
                    {data.event.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {formatWhen(data.event.startsAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Decklists y rondas que los jugadores reportaron en la
                  plataforma.
                </Typography>
              </Stack>

              {!hasPageContent ? (
                <Alert severity="info">
                  Aún no hay clasificación publicada ni reportes de jugadores.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  <Tabs
                    value={tab}
                    onChange={(_, v: MetaTab) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 40,
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 700,
                        minHeight: 40
                      }
                    }}
                  >
                    <Tab label="Standings" value="standings" />
                    <Tab label="Metagame" value="metagame" />
                    <Tab
                      label={`Jugadores (${participants.length})`}
                      value="players"
                    />
                  </Tabs>

                  <Box sx={metaTabPanelSx}>
                    {tab === 'standings' && standingsMeta ? (
                      <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                          Clasificación del torneo con deck y listado reportados
                          en Nexo cuando el jugador los subió.
                        </Typography>
                        <TournamentStandingsPanel
                          eventId={data.event._id}
                          standings={standingsMeta}
                        />
                      </Stack>
                    ) : null}

                    {tab === 'metagame' ? (
                      <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                          Agrupado por el primer Pokémon del mazo; debajo, el
                          desglose de variantes. Solo jugadores que jugaron el
                          torneo y reportaron sprites.
                        </Typography>
                        <TournamentMetagameTable rows={metagame} />
                      </Stack>
                    ) : null}

                    {tab === 'players' ? (
                      participants.length === 0 ? (
                        <Alert severity="info">
                          Nadie ha reportado decklist ni rondas todavía.
                        </Alert>
                      ) : (
                        <Stack spacing={2}>
                          {participants.map(p => (
                            <ParticipantMetaCard
                              key={p.participantKey}
                              eventId={data.event._id}
                              participant={p}
                            />
                          ))}
                        </Stack>
                      )
                    ) : null}
                  </Box>
                </Stack>
              )}
            </Stack>
          )}
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  )
}
