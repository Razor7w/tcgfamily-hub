'use client'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'

export type LeagueChartRow = {
  name: string
  fullName: string
  puntos: number
}

export default function LeagueTopPlayersBarChart({
  chartData,
  barColor
}: {
  chartData: LeagueChartRow[]
  barColor: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08)
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        Top jugadores (puntos de liga)
      </Typography>
      <Box sx={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 32 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <RechartsTooltip
              formatter={value => [value ?? 0, 'Puntos']}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as
                  | { fullName?: string }
                  | undefined
                return p?.fullName ?? ''
              }}
            />
            <Bar dataKey="puntos" fill={barColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}
