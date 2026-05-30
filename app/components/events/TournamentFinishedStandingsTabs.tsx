'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
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
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'
import { formatTiebreakerPercent } from '@/lib/tournament-tiebreakers'
import { TournamentStandingsPercentHeader } from '@/components/events/TournamentStandingsPercentHeader'

type StandingsRow = NonNullable<
  PublicWeeklyEvent['standingsTopByCategory']
>[number]['rows'][number]

function standingsTabLabel(categoryIndex: number): string {
  if (categoryIndex === 0) return 'Júnior'
  if (categoryIndex === 1) return 'Sénior'
  return 'Máster'
}

/** Orden visual: Máster (2) → Sénior (1) → Júnior (0), de izquierda a derecha. */
function categoryTabSortKey(categoryIndex: number): number {
  if (categoryIndex === 2) return 0
  if (categoryIndex === 1) return 1
  if (categoryIndex === 0) return 2
  return 9
}

function sortStandingsCategoriesForTabs(
  categories: NonNullable<PublicWeeklyEvent['standingsTopByCategory']>
): NonNullable<PublicWeeklyEvent['standingsTopByCategory']> {
  return [...categories].sort(
    (a, b) =>
      categoryTabSortKey(a.categoryIndex) - categoryTabSortKey(b.categoryIndex)
  )
}

export default function TournamentFinishedStandingsTabs({
  categories,
  /** En drawer pantalla completa: scroll solo en tabla; inline: altura acotada en tarjeta. */
  variant = 'inline'
}: {
  categories: NonNullable<PublicWeeklyEvent['standingsTopByCategory']>
  variant?: 'inline' | 'fullscreen'
}) {
  const ordered = useMemo(
    () => sortStandingsCategoriesForTabs(categories),
    [categories]
  )
  const [tabIndex, setTabIndex] = useState(0)
  const safeIndex = Math.min(tabIndex, Math.max(0, ordered.length - 1))
  const rows: StandingsRow[] = ordered[safeIndex]?.rows ?? []
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isFullscreen = variant === 'fullscreen'
  const compactTable = isFullscreen && isMobile
  const showPercentages =
    isFullscreen &&
    rows.some(r => typeof r.owp === 'number' && Number.isFinite(r.owp))

  const cellSx = compactTable
    ? { py: 0.625, px: 1, fontSize: 13, lineHeight: 1.35 }
    : undefined

  return (
    <Stack
      spacing={compactTable ? 1 : 2}
      sx={
        isFullscreen
          ? {
              flex: 1,
              minHeight: 0,
              maxHeight: '100%',
              overflow: 'hidden'
            }
          : undefined
      }
    >
      <Tabs
        value={safeIndex}
        onChange={(_, v) => setTabIndex(v)}
        variant={ordered.length <= 4 ? 'fullWidth' : 'scrollable'}
        scrollButtons={ordered.length <= 4 ? false : 'auto'}
        sx={{
          minHeight: compactTable ? 40 : 44,
          borderRadius: 2,
          bgcolor: t => alpha(t.palette.text.primary, 0.03),
          px: 0.5,
          '& .MuiTab-root': {
            minHeight: compactTable ? 40 : 44,
            py: compactTable ? 0.75 : 1,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 1.5
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: 1
          }
        }}
      >
        {ordered.map(c => (
          <Tab
            key={c.categoryIndex}
            label={standingsTabLabel(c.categoryIndex)}
          />
        ))}
      </Tabs>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: compactTable ? 2 : 2.5,
          borderColor: t => alpha(t.palette.text.primary, 0.1),
          ...(isFullscreen
            ? {
                flex: 1,
                minHeight: 0,
                overflow: 'auto'
              }
            : {
                maxHeight: { xs: 'min(70vh, 520px)', sm: 520 }
              })
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            tableLayout: compactTable ? 'fixed' : undefined,
            width: '100%'
          }}
        >
          <TableHead>
            <TableRow>
              {!compactTable ? (
                <TableCell width={72} sx={cellSx}>
                  Puesto
                </TableCell>
              ) : null}
              <TableCell sx={cellSx}>Jugador</TableCell>
              {showPercentages ? (
                <>
                  <TableCell
                    align="right"
                    width={compactTable ? 64 : isMobile ? 56 : 100}
                    sx={cellSx}
                  >
                    <TournamentStandingsPercentHeader
                      label="OWP"
                      tipKey="owp"
                      density={compactTable ? 'compact' : 'default'}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    width={compactTable ? 64 : isMobile ? 56 : 100}
                    sx={cellSx}
                  >
                    <TournamentStandingsPercentHeader
                      label="OOWP"
                      tipKey="oowp"
                      density={compactTable ? 'compact' : 'default'}
                    />
                  </TableCell>
                </>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.place}-${i}`} hover={compactTable}>
                {!compactTable ? (
                  <TableCell sx={{ ...cellSx, fontWeight: 700 }}>
                    {row.place}º
                  </TableCell>
                ) : null}
                <TableCell sx={cellSx}>
                  {compactTable ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        minWidth: 0
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          flexShrink: 0,
                          width: 26,
                          fontWeight: 800,
                          fontSize: 12,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary'
                        }}
                      >
                        {row.place}º
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }}
                        title={row.displayName}
                      >
                        {row.displayName}
                      </Box>
                    </Box>
                  ) : (
                    row.displayName
                  )}
                </TableCell>
                {showPercentages ? (
                  <>
                    <TableCell
                      align="right"
                      sx={{
                        ...cellSx,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      {typeof row.owp === 'number' && Number.isFinite(row.owp)
                        ? formatTiebreakerPercent(row.owp)
                        : '—'}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...cellSx,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      {typeof row.oowp === 'number' &&
                      Number.isFinite(row.oowp)
                        ? formatTiebreakerPercent(row.oowp)
                        : '—'}
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
