'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TeamTournamentPointsRankingSection from '@/components/teams/TeamTournamentPointsRankingSection'
import { usePublicTeamsDirectory } from '@/hooks/useTeams'

type TeamsBrowseSectionProps = {
  canApplyForTeam: boolean
  onFormTeam: () => void
}

function bioPreview(bio: string, max = 120) {
  const t = bio.trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export default function TeamsBrowseSection({
  canApplyForTeam,
  onFormTeam
}: TeamsBrowseSectionProps) {
  const [showRanking, setShowRanking] = useState(false)
  const { data, isPending, isError, error, refetch } = usePublicTeamsDirectory()
  const teams = data?.teams ?? []

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
            Equipos publicados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Explora equipos activos de la comunidad antes de formar el tuyo.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant={showRanking ? 'contained' : 'outlined'}
            startIcon={<EmojiEventsOutlinedIcon />}
            onClick={() => setShowRanking(current => !current)}
          >
            {showRanking ? 'Ocultar ranking' : 'Ver ranking'}
          </Button>
          {canApplyForTeam ? (
            <Button variant="contained" onClick={onFormTeam}>
              Formar un equipo
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {showRanking ? (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}
        >
          <TeamTournamentPointsRankingSection />
        </Paper>
      ) : null}

      {isPending ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Skeleton
                variant="rounded"
                height={140}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : isError ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
            {error instanceof Error ? error.message : 'Error al cargar equipos'}
          </Typography>
          <Button size="small" onClick={() => refetch()}>
            Reintentar
          </Button>
        </Paper>
      ) : teams.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            textAlign: 'center',
            borderStyle: 'dashed',
            bgcolor: t => alpha(t.palette.primary.main, 0.03)
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              mx: 'auto',
              mb: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          >
            <GroupsOutlinedIcon />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Aún no hay equipos publicados
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 420, mx: 'auto', mb: 2.5 }}
          >
            Sé el primero en formar un equipo. Un administrador revisará tu
            solicitud antes de publicarla.
          </Typography>
          {canApplyForTeam ? (
            <Button variant="contained" onClick={onFormTeam}>
              Formar un equipo
            </Button>
          ) : null}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {teams.map(team => (
            <Grid key={team.id} size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    borderColor: t => alpha(t.palette.primary.main, 0.35),
                    boxShadow: t =>
                      `0 12px 32px -20px ${alpha(t.palette.primary.main, 0.35)}`
                  }
                }}
              >
                <CardActionArea
                  component={Link}
                  href={`/equipos/${team.slug}`}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Avatar
                        src={team.logoUrl || undefined}
                        sx={{ width: 48, height: 48 }}
                      >
                        {team.name.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography fontWeight={800} noWrap>
                            {team.name}
                          </Typography>
                          <OpenInNewIcon
                            sx={{
                              fontSize: 16,
                              color: 'text.disabled',
                              flexShrink: 0
                            }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {team.memberCount}{' '}
                          {team.memberCount === 1 ? 'miembro' : 'miembros'}
                        </Typography>
                        {team.bio ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1, lineHeight: 1.5 }}
                          >
                            {bioPreview(team.bio)}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  )
}
