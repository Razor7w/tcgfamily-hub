'use client'

import { useMemo, useState } from 'react'
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
import { alpha } from '@mui/material/styles'
import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'

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
  /** En modal: una sola barra de scroll (tabla); en tarjeta: altura acotada como antes. */
  variant = 'inline'
}: {
  categories: NonNullable<PublicWeeklyEvent['standingsTopByCategory']>
  variant?: 'inline' | 'dialog'
}) {
  const ordered = useMemo(
    () => sortStandingsCategoriesForTabs(categories),
    [categories]
  )
  const [tabIndex, setTabIndex] = useState(0)
  const safeIndex = Math.min(tabIndex, Math.max(0, ordered.length - 1))
  const rows = ordered[safeIndex]?.rows ?? []

  return (
    <Stack
      spacing={2}
      sx={
        variant === 'dialog'
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
          minHeight: 44,
          borderRadius: 2,
          bgcolor: t => alpha(t.palette.text.primary, 0.03),
          px: 0.5,
          '& .MuiTab-root': {
            minHeight: 44,
            py: 1,
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
          borderRadius: 2.5,
          borderColor: t => alpha(t.palette.text.primary, 0.1),
          ...(variant === 'dialog'
            ? {
                flex: 1,
                minHeight: 0,
                maxHeight: { xs: 'min(58vh, 520px)', sm: 'min(62vh, 560px)' },
                overflow: 'auto'
              }
            : {
                maxHeight: { xs: 'min(70vh, 520px)', sm: 520 }
              })
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={72}>Puesto</TableCell>
              <TableCell>Jugador</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.place}-${i}`}>
                <TableCell sx={{ fontWeight: 700 }}>{row.place}º</TableCell>
                <TableCell>{row.displayName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
