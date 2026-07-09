'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Grid from '@mui/material/Grid'
import { alpha } from '@mui/material/styles'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import TeamMonthlyActivityCard from '@/components/teams/TeamMonthlyActivityCard'
import TeamPostsSection from '@/components/teams/TeamPostsSection'
import TeamPublicHeader from '@/components/teams/TeamPublicHeader'
import {
  usePublicTeam,
  usePublicTeamActivity,
  usePublicTeamLeagueMedals,
  usePublicTeamMedals
} from '@/hooks/useTeams'
import { useIdleEnable } from '@/hooks/useIdleEnable'
import { useLazyInView } from '@/hooks/useLazyInView'
import { mergeTeamMedalLists } from '@/lib/teams/medals/merge-lists'

export default function EquipoPublicPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const { data, isPending, isError, error, refetch } = usePublicTeam(slug)
  const coreReady = Boolean(data?.team)
  const { data: medalsData, isPending: medalsPending } = usePublicTeamMedals(
    slug,
    coreReady
  )
  const leagueMedalsIdle = useIdleEnable(
    coreReady && !medalsPending && Boolean(medalsData)
  )
  const { data: leagueMedalsData, isPending: leagueMedalsPending } =
    usePublicTeamLeagueMedals(slug, leagueMedalsIdle)
  const medals = useMemo(
    () =>
      mergeTeamMedalLists(
        medalsData?.medals ?? [],
        leagueMedalsData?.medals ?? []
      ),
    [medalsData?.medals, leagueMedalsData?.medals]
  )
  const medalsLoading = medalsPending || leagueMedalsPending

  const { ref: activityRef, inView: activityInView } = useLazyInView('200px')
  const { data: activityData, isPending: activityPending } =
    usePublicTeamActivity(slug, activityInView)

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Stack spacing={2.5}>
          <Button
            component={Link}
            href="/dashboard/equipo"
            variant="text"
            size="small"
            sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
          >
            Gestionar mi equipo
          </Button>

          {isPending ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={120} />
              <Skeleton variant="rounded" height={240} />
            </Stack>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error ? error.message : 'Error'}
            </Alert>
          ) : data ? (
            <>
              <TeamPublicHeader
                name={data.team.name}
                bio={data.team.bio}
                logoUrl={data.team.logoUrl}
                coverUrl={data.team.coverUrl ?? ''}
                memberCount={data.team.memberCount}
                medals={medals}
                medalsLoading={medalsLoading}
              />

              <TeamPostsSection teamSlug={slug} lazyLoad />

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: t => alpha(t.palette.text.primary, 0.08)
                }}
              >
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Roster
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {data.team.roster.map(member => (
                    <Chip
                      key={member.userId}
                      avatar={
                        <Avatar src={member.imageUrl || undefined}>
                          {member.displayName.slice(0, 1).toUpperCase()}
                        </Avatar>
                      }
                      label={`${member.displayName} · ${member.roleLabel}`}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Paper>

              <Box ref={activityRef}>
                <TeamMonthlyActivityCard
                  activity={activityData?.activity}
                  loading={activityPending}
                />
              </Box>

              {(data.team.decklists?.length ?? 0) > 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: t => alpha(t.palette.text.primary, 0.08)
                  }}
                >
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Mazos del equipo
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, maxWidth: '60ch' }}
                  >
                    Cada jugador elige un mazo público desde la gestión del
                    equipo.
                  </Typography>
                  <Grid container spacing={2}>
                    {data.team.decklists?.map(deck => (
                      <Grid key={deck.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box
                          sx={{
                            p: 1.75,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: t =>
                              alpha(t.palette.text.primary, 0.08),
                            height: '100%'
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Avatar
                              src={deck.ownerImage || undefined}
                              sx={{ width: 36, height: 36 }}
                            >
                              {deck.ownerName.slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {deck.ownerName}
                              </Typography>
                              <Typography fontWeight={700} noWrap>
                                {deck.name}
                              </Typography>
                            </Box>
                          </Stack>
                          <Box sx={{ mt: 1.5 }}>
                            <DecklistSpritePair
                              slugs={deck.pokemonSlugs}
                              size={40}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Container>
    </Box>
  )
}
