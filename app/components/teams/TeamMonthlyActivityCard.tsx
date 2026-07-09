'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import { alpha } from '@mui/material/styles'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'

function formatShortDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function placementLabel(
  placement: TeamMonthlyActivityDTO['members'][0]['topTournaments'][0]['placement']
): string {
  if (!placement) return 'Sin puesto'
  if (placement.isDnf) return 'DNF'
  if (placement.place != null) {
    return `${placement.place}° ${placement.categoryLabel}`
  }
  return placement.categoryLabel
}

function recordLabel(
  record: { wins: number; losses: number; ties: number } | null
): string {
  if (!record) return '—'
  return `${record.wins}-${record.losses}-${record.ties}`
}

function emptyMonthlyActivity(): TeamMonthlyActivityDTO {
  const raw = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date())
  return {
    monthLabel: raw.charAt(0).toUpperCase() + raw.slice(1),
    monthKey: '',
    members: []
  }
}

type Props = {
  activity?: TeamMonthlyActivityDTO | null
  loading?: boolean
}

export default function TeamMonthlyActivityCard({
  activity,
  loading = false
}: Props) {
  const safe = activity ?? emptyMonthlyActivity()
  const members = safe.members ?? []

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: t => alpha(t.palette.primary.main, 0.14),
          p: 3,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <CircularProgress size={24} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: t => alpha(t.palette.primary.main, 0.14),
        overflow: 'hidden',
        background: t =>
          `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.07)} 0%, ${alpha(t.palette.background.paper, 1)} 42%)`
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08)
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main'
            }}
          >
            <EmojiEventsOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              Actividad del mes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {safe.monthLabel}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack
        spacing={0}
        divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
      >
        {members.length === 0 ? (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Sin miembros en el roster.
            </Typography>
          </Box>
        ) : (
          members.map(member => (
            <Box key={member.userId} sx={{ p: { xs: 2, sm: 2.25 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'flex-start' }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ minWidth: 200 }}
                >
                  <Avatar src={member.imageUrl || undefined}>
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>
                      {member.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.roleLabel}
                    </Typography>
                    <Box sx={{ mt: 0.75 }}>
                      <Chip
                        size="small"
                        label={
                          member.tournamentsPlayed === 0
                            ? 'Sin torneos'
                            : `${member.tournamentsPlayed} ${
                                member.tournamentsPlayed === 1
                                  ? 'torneo'
                                  : 'torneos'
                              }`
                        }
                        color={
                          member.tournamentsPlayed > 0 ? 'primary' : 'default'
                        }
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Stack>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: 0.08, fontWeight: 700 }}
                  >
                    Mejores resultados
                  </Typography>
                  {member.topTournaments.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Sin torneos cerrados este mes.
                    </Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {member.topTournaments.map((t, idx) => (
                        <Box
                          key={t.eventId}
                          sx={{
                            p: 1.25,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: t =>
                              alpha(t.palette.text.primary, 0.08),
                            bgcolor: t => alpha(t.palette.text.primary, 0.02)
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                            justifyContent="space-between"
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  label={`#${idx + 1}`}
                                  sx={{ height: 22, fontWeight: 800 }}
                                />
                                <Typography fontWeight={700} noWrap>
                                  {t.title}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatShortDate(t.startsAt)} · récord{' '}
                                {recordLabel(t.matchRecord)}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              color="secondary"
                              variant="outlined"
                              label={placementLabel(t.placement)}
                              sx={{ flexShrink: 0, fontWeight: 700 }}
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>
          ))
        )}
      </Stack>
    </Paper>
  )
}
